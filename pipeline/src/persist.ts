import { eq, sql } from 'drizzle-orm';
import type { Connector } from '@sachmuch/connectors';
import { entities, factEntities, facts, reviewQueue, subtopics, templates } from '@sachmuch/db/schema';
import type { FactDraft } from '@sachmuch/templates';
import { runGate, type GateResult } from './gate/index';
import { dedupeBatch, DUPLICATE_THRESHOLD } from './gate/dedupe';

type Db = Awaited<ReturnType<typeof import('@sachmuch/db').createDb>>['db'];

/** §7.6 — 1% of newly-live facts go to the human sampling queue. */
export const REVIEW_SAMPLE_RATE = 0.01;
/** Above this rejection rate on sampled output, a template is auto-disabled. */
export const TEMPLATE_KILL_RATE = 0.05;
export const TEMPLATE_KILL_MIN_SAMPLE = 20;

export interface PersistStats {
  drafts: number;
  live: number;
  rejected: number;
  duplicates: number;
  /** Failed only on transient rules; not written, so a later run retries. */
  deferred: number;
  hiMissing: number;
  queuedForReview: number;
  /** Gate rule -> count, so a failing template is visible in the run log. */
  rejectReasons: Record<string, number>;
}

const emptyStats = (): PersistStats => ({
  drafts: 0, live: 0, rejected: 0, duplicates: 0, deferred: 0, hiMissing: 0,
  queuedForReview: 0, rejectReasons: {},
});

/**
 * Trigram check against what is already live in the same category, narrowed to
 * facts that share an entity.
 *
 * Without the entity join this swallowed whole templates: everything from one
 * template factory shares a sentence skeleton, so a new "highest mountains"
 * fact scored above 0.85 against an existing "largest deserts" one and was
 * discarded as a duplicate of it.
 */
async function hasNearDuplicate(db: Db, draft: FactDraft): Promise<boolean> {
  if (draft.entityQids.length === 0) {
    const rows = await db.execute<{ id: string }>(sql`
      SELECT f.id FROM facts f
       WHERE f.category_id = ${draft.categoryId}
         AND f.status = 'live'
         AND NOT EXISTS (SELECT 1 FROM fact_entities fe WHERE fe.fact_id = f.id)
         AND similarity(f.hook_en, ${draft.hookEn}) >= ${DUPLICATE_THRESHOLD}
       LIMIT 1
    `);
    return rows.length > 0;
  }

  const rows = await db.execute<{ id: string }>(sql`
    SELECT f.id FROM facts f
     WHERE f.category_id = ${draft.categoryId}
       AND f.status = 'live'
       AND EXISTS (
         SELECT 1 FROM fact_entities fe
          WHERE fe.fact_id = f.id
            -- An IN list, not ANY(array): a JS array inlines as a row
            -- constructor, which ANY rejects with a syntax error.
            AND fe.qid IN (${sql.join(draft.entityQids.map((q) => sql`${q}`), sql`, `)})
       )
       AND similarity(f.hook_en, ${draft.hookEn}) >= ${DUPLICATE_THRESHOLD}
     LIMIT 1
  `);
  return rows.length > 0;
}

/**
 * Runs the gate over a batch and writes what survives.
 *
 * Order matters: in-batch dedupe first (free), then the gate's cheap rules, then
 * the network source check, then the database duplicate check. Each stage is
 * more expensive than the last, so a draft that was never going to publish costs
 * as little as possible.
 */
export async function persistDrafts(
  db: Db,
  drafts: FactDraft[],
  connector: Connector,
  opts: { offline?: boolean; random?: () => number } = {},
): Promise<PersistStats> {
  const stats = emptyStats();
  stats.drafts = drafts.length;
  if (drafts.length === 0) return stats;

  const random = opts.random ?? Math.random;
  const { kept, dropped } = dedupeBatch(drafts);
  stats.duplicates += dropped.length;

  const subtopicIds = new Map<string, number>();
  for (const slug of new Set(kept.map((d) => d.subtopicSlug).filter(Boolean) as string[])) {
    const row = await db.select({ id: subtopics.id }).from(subtopics).where(eq(subtopics.slug, slug)).limit(1);
    if (row[0]) subtopicIds.set(slug, row[0].id);
  }

  const gateOpts = {
    sourceId: connector.id,
    rateLimitRpm: connector.rateLimitRpm,
    ...(opts.offline ? { offline: true } : {}),
  };

  const perTemplate = new Map<string, { drafts: number; live: number; hiMissing: number }>();
  const bump = (id: string, k: 'drafts' | 'live' | 'hiMissing') => {
    const e = perTemplate.get(id) ?? { drafts: 0, live: 0, hiMissing: 0 };
    e[k]++;
    perTemplate.set(id, e);
  };

  for (const draft of kept) {
    bump(draft.templateId, 'drafts');
    if (draft.hiMissing) { stats.hiMissing++; bump(draft.templateId, 'hiMissing'); }

    const gate: GateResult = await runGate(draft, gateOpts);

    if (!gate.pass) {
      for (const f of gate.findings) {
        stats.rejectReasons[f.rule] = (stats.rejectReasons[f.rule] ?? 0) + 1;
      }
      // A transient failure is left unwritten on purpose. Writing a rejected row
      // would claim the draft's unique hash and bar it from ever being retried.
      if (gate.retryable) {
        stats.deferred++;
        continue;
      }
      stats.rejected++;
      await db.insert(facts).values({
        ...baseRow(draft, connector, gate, subtopicIds),
        status: 'rejected',
        rejectReason: gate.findings.map((f) => f.rule).join(','),
      }).onConflictDoNothing();
      continue;
    }

    if (await hasNearDuplicate(db, draft)) {
      stats.duplicates++;
      continue;
    }

    const inserted = await db.insert(facts).values({
      ...baseRow(draft, connector, gate, subtopicIds),
      status: 'live',
      liveAt: new Date(),
      sourceCheckedAt: new Date(),
    }).onConflictDoNothing().returning({ id: facts.id });

    const factId = inserted[0]?.id;
    if (!factId) { stats.duplicates++; continue; }

    stats.live++;
    bump(draft.templateId, 'live');

    for (const qid of draft.entityQids) {
      await db.insert(entities).values({ qid, labelEn: qid }).onConflictDoNothing();
      await db.insert(factEntities).values({ factId, qid }).onConflictDoNothing();
    }

    if (random() < REVIEW_SAMPLE_RATE) {
      await db.insert(reviewQueue)
        .values({ factId, templateId: draft.templateId })
        .onConflictDoNothing();
      stats.queuedForReview++;
    }
  }

  for (const [templateId, e] of perTemplate) {
    await db.update(templates).set({
      draftsProduced: sql`${templates.draftsProduced} + ${e.drafts}`,
      liveProduced: sql`${templates.liveProduced} + ${e.live}`,
      hiMissingCount: sql`${templates.hiMissingCount} + ${e.hiMissing}`,
      lastRunAt: new Date(),
    }).where(eq(templates.id, templateId));
  }

  return stats;
}

function baseRow(
  d: FactDraft, c: Connector, gate: GateResult, subtopicIds: Map<string, number>,
) {
  return {
    categoryId: d.categoryId,
    subtopicId: d.subtopicSlug ? (subtopicIds.get(d.subtopicSlug) ?? null) : null,
    templateId: d.templateId,
    sourceId: d.sourceId,
    hookEn: d.hookEn,
    bodyEn: d.bodyEn,
    hookHi: d.hookHi ?? null,
    bodyHi: d.bodyHi ?? null,
    hiMissing: d.hiMissing,
    sourceUrl: d.sourceUrl,
    publisher: c.publisher,
    licence: c.licence,
    attributionText: c.attributionRequired ? (c.attributionText ?? null) : null,
    difficulty: d.difficulty,
    quality: gate.quality,
    validUntil: d.validUntil ?? null,
    normalizedHash: gate.normalizedHash,
  };
}

/**
 * §7.6 — one bad template can poison thousands of facts, so the kill switch is
 * automatic rather than something I have to notice.
 */
export async function disableFailingTemplates(db: Db): Promise<string[]> {
  const rows = await db.execute<{ id: string; rate: number }>(sql`
    UPDATE templates
       SET enabled = false,
           disabled_reason = 'sample rejection rate above '
             || ${TEMPLATE_KILL_RATE * 100}::text || '%'
     WHERE enabled
       AND sampled_count >= ${TEMPLATE_KILL_MIN_SAMPLE}
       AND sample_rejected_count::float / NULLIF(sampled_count, 0) > ${TEMPLATE_KILL_RATE}
    RETURNING id, sample_rejected_count::float / NULLIF(sampled_count, 0) AS rate
  `);
  return rows.map((r) => r.id);
}

/** §6 — nightly staleness sweep for decaying facts. */
export async function sweepStaleFacts(db: Db): Promise<number> {
  const rows = await db.execute<{ sweep_stale_facts: number }>(sql`SELECT sweep_stale_facts()`);
  return rows[0]?.sweep_stale_facts ?? 0;
}
