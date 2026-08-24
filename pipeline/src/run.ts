/**
 * Ingestion entry point, invoked by the GitHub Actions cron.
 *
 * Actions is free for a public repo and these are long jobs, so ingestion lives
 * here rather than on Vercel. The run writes straight to Supabase.
 *
 * Run: DATABASE_URL=... pnpm --filter @sachmuch/pipeline start
 */
import { createDb } from '@sachmuch/db';
import { TEMPLATES } from '@sachmuch/templates/library';
import { warmCountryIndex } from '@sachmuch/connectors';
import { buildConnectors } from './registry';
import { enqueueDiscovered, purgeOrphanedJobs, releaseStaleLocks, runJobs } from './orchestrator';
import { disableFailingTemplates, persistDrafts, sweepStaleFacts, type PersistStats } from './persist';

// Kept in minutes because that is how the workflow input reads, and how a
// 60-minute Actions timeout is reasoned about.
const BUDGET_MS = Number(process.env.INGEST_BUDGET_MINUTES ?? 45) * 60_000;
const RUNNER_ID = process.env.GITHUB_RUN_ID ?? `local-${process.pid}`;

const { db, sql } = createDb();

const totals: PersistStats = {
  drafts: 0, live: 0, rejected: 0, duplicates: 0, deferred: 0, hiMissing: 0,
  queuedForReview: 0, rejectReasons: {},
};

const released = await releaseStaleLocks(db);
if (released > 0) console.log(`released ${released} stale locks from a previous run`);

// map() is synchronous by contract, so the ISO3 -> country index has to be
// warm before any World Bank row is mapped.
console.log(`country index: ${await warmCountryIndex()} countries`);

const connectors = buildConnectors();

// Templates get renamed and withdrawn; their queued jobs do not clean themselves up.
const orphaned = await purgeOrphanedJobs(db, TEMPLATES.map((t) => t.id));
if (orphaned > 0) console.log(`purged ${orphaned} jobs for templates that no longer exist`);

const queued = await enqueueDiscovered(db, connectors);
console.log(`discovered ${queued} new tasks across ${connectors.length} connectors`);

const summary = await runJobs({
  db,
  connectors,
  runnerId: RUNNER_ID,
  budgetMs: BUDGET_MS,
  async onDrafts(drafts, _task, connector) {
    const s = await persistDrafts(db, drafts, connector);
    totals.drafts += s.drafts;
    totals.live += s.live;
    totals.rejected += s.rejected;
    totals.duplicates += s.duplicates;
    totals.deferred += s.deferred;
    totals.hiMissing += s.hiMissing;
    totals.queuedForReview += s.queuedForReview;
    for (const [rule, n] of Object.entries(s.rejectReasons)) {
      totals.rejectReasons[rule] = (totals.rejectReasons[rule] ?? 0) + n;
    }
  },
});

const stale = await sweepStaleFacts(db);
const killed = await disableFailingTemplates(db);

console.log('\n--- run summary ---');
console.log(`jobs claimed:   ${summary.claimed}`);
console.log(`jobs completed: ${summary.completed}`);
console.log(`jobs failed:    ${summary.failed}`);
if (summary.paused.length > 0) console.log(`sources paused: ${[...new Set(summary.paused)].join(', ')}`);
console.log(`drafts:         ${totals.drafts}`);
console.log(`published live: ${totals.live}`);
console.log(`rejected:       ${totals.rejected}`);
console.log(`duplicates:     ${totals.duplicates}`);
console.log(`deferred:       ${totals.deferred} (transient failure, will retry next run)`);
console.log(`English-only:   ${totals.hiMissing}` +
  (totals.drafts > 0 ? ` (${((100 * totals.hiMissing) / totals.drafts).toFixed(0)}% of drafts)` : ''));
console.log(`sampled for review: ${totals.queuedForReview}`);
console.log(`marked stale:   ${stale}`);
if (killed.length > 0) console.log(`templates auto-disabled: ${killed.join(', ')}`);
if (Object.keys(totals.rejectReasons).length > 0) {
  console.log('reject reasons:');
  for (const [rule, n] of Object.entries(totals.rejectReasons).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n.toString().padStart(6)}  ${rule}`);
  }
}

await sql.end();
