import { and, eq, inArray, lte, sql } from 'drizzle-orm';
import { RateLimited, SourceError, type Connector, type Task } from '@sachmuch/connectors';
import { jobs, sources } from '@sachmuch/db/schema';
import type { FactDraft } from '@sachmuch/templates';

type Db = Awaited<ReturnType<typeof import('@sachmuch/db').createDb>>['db'];

/**
 * The orchestrator.
 *
 * A `jobs` table in Postgres plus a GitHub Actions cron that claims and runs
 * jobs. No Redis, no queue service — the free tier of Postgres already gives us
 * atomic claiming via `FOR UPDATE SKIP LOCKED`, which is the only hard part.
 *
 * The governing rule: sources die, and the app must not notice. A 429 or a 5xx
 * pauses that source, never the run.
 */

export const MAX_ATTEMPTS = 5;
/** Three consecutive failed runs marks a source degraded. */
export const DEGRADED_AFTER = 3;

export interface RunnerOptions {
  db: Db;
  connectors: Connector[];
  /** Identifies this runner in `jobs.locked_by`, so a crashed run is visible. */
  runnerId: string;
  /** Stop claiming new work after this long, so an Actions run cannot overrun. */
  budgetMs: number;
  /** Called with every draft that survived a fetch. */
  onDrafts(drafts: FactDraft[], task: Task, connector: Connector): Promise<void>;
  now?(): Date;
}

export interface RunSummary {
  claimed: number;
  completed: number;
  failed: number;
  paused: string[];
  draftsProduced: number;
}

/** Seeds the queue from every enabled connector's discover(). */
export async function enqueueDiscovered(db: Db, connectors: Connector[]): Promise<number> {
  let queued = 0;
  for (const c of connectors) {
    const tasks = await c.discover();
    for (const task of tasks) {
      // The partial unique index on (source_id, task) for queued/running rows is
      // what makes re-running discover() idempotent.
      const res = await db
        .insert(jobs)
        .values({ sourceId: c.id, task: task as unknown as Record<string, unknown> })
        .onConflictDoNothing()
        .returning({ id: jobs.id });
      queued += res.length;
    }
  }
  return queued;
}

/**
 * Claim one job atomically. `FOR UPDATE SKIP LOCKED` lets several runners share
 * the queue without any coordination beyond the database.
 */
async function claimJob(db: Db, runnerId: string, pausedSources: Set<string>) {
  const excluded = [...pausedSources];
  const rows = await db.execute<{
    id: string; source_id: string; task: Record<string, unknown>; cursor: string | null; attempts: number;
  }>(sql`
    UPDATE jobs SET status = 'running', locked_at = now(), locked_by = ${runnerId}
    WHERE id = (
      SELECT j.id FROM jobs j
      JOIN sources s ON s.id = j.source_id
      WHERE j.status = 'queued'
        AND j.run_after <= now()
        AND s.enabled
        AND s.health <> 'disabled'
        ${excluded.length > 0 ? sql`AND j.source_id <> ALL(${excluded})` : sql``}
      ORDER BY j.priority DESC, j.run_after ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING id, source_id, task, cursor, attempts
  `);
  return rows[0] ?? null;
}

async function markSourceOutcome(db: Db, sourceId: string, ok: boolean): Promise<void> {
  if (ok) {
    await db.update(sources)
      .set({ consecutiveFailures: 0, health: 'healthy', lastRunAt: new Date(), lastOkAt: new Date() })
      .where(eq(sources.id, sourceId));
    return;
  }
  await db.execute(sql`
    UPDATE sources
       SET consecutive_failures = consecutive_failures + 1,
           last_run_at = now(),
           health = CASE WHEN consecutive_failures + 1 >= ${DEGRADED_AFTER} THEN 'degraded'::source_health
                         ELSE health END
     WHERE id = ${sourceId}
  `);
}

/** 1m, 4m, 9m, 16m — quadratic, so a flapping source backs off fast. */
const retryDelayMs = (attempts: number) => attempts * attempts * 60_000;

export async function runJobs(opts: RunnerOptions): Promise<RunSummary> {
  const now = opts.now ?? (() => new Date());
  const deadline = now().getTime() + opts.budgetMs;
  const byId = new Map(opts.connectors.map((c) => [c.id, c]));
  const paused = new Set<string>();
  const summary: RunSummary = { claimed: 0, completed: 0, failed: 0, paused: [], draftsProduced: 0 };

  while (now().getTime() < deadline) {
    const job = await claimJob(opts.db, opts.runnerId, paused);
    if (!job) break;
    summary.claimed++;

    const connector = byId.get(job.source_id);
    if (!connector) {
      await opts.db.update(jobs)
        .set({ status: 'failed', lastError: `no connector registered for ${job.source_id}`, finishedAt: now() })
        .where(eq(jobs.id, job.id));
      summary.failed++;
      continue;
    }

    const task = job.task as unknown as Task;
    try {
      const { rows, nextCursor } = await connector.fetch(task, job.cursor ?? undefined);
      const drafts = rows.flatMap((row) => connector.map(row, task));
      await opts.onDrafts(drafts, task, connector);
      summary.draftsProduced += drafts.length;

      if (nextCursor) {
        // Cursors are persisted per task, so a run that ends mid-page resumes
        // rather than restarting from zero.
        await opts.db.update(jobs)
          .set({ status: 'queued', cursor: nextCursor, lockedAt: null, lockedBy: null,
                 rowsWritten: sql`${jobs.rowsWritten} + ${rows.length}` })
          .where(eq(jobs.id, job.id));
      } else {
        await opts.db.update(jobs)
          .set({ status: 'done', finishedAt: now(), lockedAt: null, lockedBy: null,
                 rowsWritten: sql`${jobs.rowsWritten} + ${rows.length}` })
          .where(eq(jobs.id, job.id));
        summary.completed++;
      }
      await markSourceOutcome(opts.db, connector.id, true);
    } catch (err) {
      const attempts = job.attempts + 1;

      if (err instanceof RateLimited) {
        // Pause THIS source for the rest of the run and requeue its job. Every
        // other source keeps going.
        paused.add(connector.id);
        summary.paused.push(connector.id);
        await opts.db.update(jobs)
          .set({ status: 'queued', attempts, lockedAt: null, lockedBy: null,
                 lastError: err.message,
                 runAfter: new Date(now().getTime() + err.retryAfterMs) })
          .where(eq(jobs.id, job.id));
        continue;
      }

      const message = err instanceof SourceError ? err.message : String(err);
      const giveUp = attempts >= MAX_ATTEMPTS;
      await opts.db.update(jobs)
        .set({
          status: giveUp ? 'failed' : 'queued',
          attempts,
          lastError: message,
          lockedAt: null,
          lockedBy: null,
          runAfter: new Date(now().getTime() + retryDelayMs(attempts)),
          ...(giveUp ? { finishedAt: now() } : {}),
        })
        .where(eq(jobs.id, job.id));
      if (giveUp) summary.failed++;
      await markSourceOutcome(opts.db, connector.id, false);
    }
  }

  return summary;
}

/**
 * Drops queued work for templates that no longer exist.
 *
 * Renaming or withdrawing a template leaves its jobs behind: `discover()` never
 * removes anything, and the partial unique index only prevents duplicates among
 * queued rows. Those orphans fail with "unknown template", requeue, and are
 * claimed again on the next run — 43 of them consumed an entire run's budget
 * while four real jobs got through, and the symptom looked like a connector
 * producing nothing rather than a queue full of ghosts.
 */
export async function purgeOrphanedJobs(db: Db, knownTemplateIds: string[]): Promise<number> {
  // Read the candidates and filter in TypeScript rather than pushing the id list
  // into SQL: an array parameter inside ANY() is inlined as a row constructor,
  // which ANY does not accept, and the failure is a syntax error rather than a
  // wrong result.
  const known = new Set(knownTemplateIds);
  const candidates = await db.execute<{ id: string; template_id: string | null }>(sql`
    SELECT id, task->>'templateId' AS template_id
      FROM jobs
     WHERE status IN ('queued', 'failed')
  `);

  const orphaned = candidates
    .filter((r) => r.template_id !== null && !known.has(r.template_id))
    .map((r) => r.id);
  if (orphaned.length === 0) return 0;

  await db.delete(jobs).where(inArray(jobs.id, orphaned));
  return orphaned.length;
}

/** Requeues jobs a crashed runner left locked. Run at the start of every run. */
export async function releaseStaleLocks(db: Db, olderThanMinutes = 30): Promise<number> {
  const rows = await db.execute<{ id: string }>(sql`
    UPDATE jobs SET status = 'queued', locked_at = NULL, locked_by = NULL
     WHERE status = 'running'
       AND locked_at < now() - (${olderThanMinutes} || ' minutes')::interval
    RETURNING id
  `);
  return rows.length;
}

/** §9 — targeted ingestion for the thinnest subtopics in a category. */
export async function enqueueTopUp(
  db: Db, sourceId: string, subtopicSlugs: string[], templateIds: string[],
): Promise<number> {
  let queued = 0;
  for (const slug of subtopicSlugs) {
    for (const templateId of templateIds) {
      const res = await db.insert(jobs).values({
        sourceId,
        task: { key: `${sourceId}:${templateId}:${slug}`, templateId, subtopicSlug: slug },
        priority: 10, // ahead of the scheduled crawl — a user is waiting on this
      }).onConflictDoNothing().returning({ id: jobs.id });
      queued += res.length;
    }
  }
  return queued;
}

export { inArray, and, lte };
