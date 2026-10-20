# Corpus C — large feed and rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every accepted fact reachable through a balanced, bounded-memory feed and verify the real 100,000+ target.

**Architecture:** Materialise immutable balanced snapshots in Postgres, serve 50 facts per page with validated cursors and retain rollback snapshots. Switch the v2 mobile feed only after staging and physical-device checks.

**Tech Stack:** TypeScript, Expo/React Native, Next.js, Postgres/Drizzle, GitHub Actions, Jest and Vitest. Retain installed dependency versions unless a demonstrated compatibility fix requires a change.

**Spec:** [../specs/2026-10-18-sachmuch-large-corpus-design.md](../specs/2026-10-18-sachmuch-large-corpus-design.md)

## Global Constraints

- English OR Hindi is sufficient. A translation is optional and must not delay publication.
- Success means 100,000 or more distinct eligible, published claims actually reachable through the production feed—not raw source rows, draft candidates, translations, rewritten sentences or an inflated UI counter.
- Preserve the approved smooth vertical swipe, complete short cards, personal filled-heart/sprinkle interaction, quiet music and downloaded reading. Movie/Bollywood facts remain excluded.
- No new paid service, paid model or subscription is part of this design.
- Hook target 4–12 words; body target 15–40 words, normally no more than 220 characters per language. Never truncate a caveat or manufacture filler to meet a minimum.
- Sources named in the design are candidates, not assumed implementations. Verify endpoint, terms, reuse, coverage and throttling before onboarding.
- No fixed ETA until the pilot measures accepted throughput. The target remains 100,000+ even if an early batch is smaller.
- Read the approved spec and applicable repository instructions before execution; use an isolated worktree at execution time. Never print credentials.

## Review Focus

- New imports during paging must not cause repeats or omissions (C1/C2).
- Revoked facts can empty an intermediate page but must not end traversal early (C2/C3).
- Expired cursors must offer refresh while keeping downloaded facts (C2/C3).
- Category concentration and one-template filler must not dominate discovery (C1).
- Test fixtures and bilingual variants must never inflate the visible live count (C4).

## Dependencies

Requires A and B. Reuse FactV2/FeedV2 and getCorpusReport. Snapshot tables are derived, rebuildable data; canonical facts and personal IDs are not changed by rebuilding a snapshot.

### Task C1: Immutable balanced snapshots

**Files:** Create `pipeline/src/feed-snapshot.ts`, `pipeline/test/feed-snapshot.test.ts`; add `feed_snapshots(id,status,created_at,total_eligible)` and `feed_entries(snapshot_id,position,fact_id)` migration with snapshot/position PK and unique snapshot/fact.

**Interfaces:** Produce `buildFeedSnapshot(sql,{seed,batchSize}: {seed:string;batchSize:number}):Promise<{snapshotId:string;totalEligible:number}>`. Return only after atomically marking a complete snapshot active.

- [ ] **1. Write the failing test.** 100000 explicitly synthetic records: traversal contains all unique IDs exactly once. Category rounds take one per available category; no consecutive template/entity where alternatives exist. Killing build leaves prior snapshot active. A single remaining category still completes traversal.
- [ ] **2. Verify failure.** Run `pnpm --filter @sachmuch/pipeline test`; the new behavioural assertion must fail before implementation. A broken test fixture/import is not the intended failure.
- [ ] **3. Implement.** Use seeded stable ordering within category and indexed bounded reads/writes. Keep editorial interest and template/entity diversity as selection priorities with deterministic fallback when alternatives exhaust. Atomically publish after cardinality/uniqueness checks. Keep active and previous snapshot; never expose a partially built one.
- [ ] **4. Verify.** Run `pnpm --filter @sachmuch/pipeline test && pnpm --filter @sachmuch/db test:integration`; require all tests/checks to pass. Inspect the changed behaviour, not only the process exit code.
- [ ] **5. Commit.** Stage only this task's files and commit with message `feat: build balanced immutable fact snapshots`. Record verification and unresolved limits in the rollout report; review before dependent work.

### Task C2: Cursor API and accurate totals

**Files:** Create `apps/web/lib/feed-cursor.ts`, `apps/web/test/feed-v2-pagination.test.ts`; modify `apps/web/lib/feed-v2.ts`, `apps/web/app/api/v2/feed/route.ts`.

**Interfaces:** Produce `encodeFeedCursor({snapshotId,position}):string`, `decodeFeedCursor(raw:string):{snapshotId:string;position:number}`, `readSnapshotPage(sql,cursor?:string):Promise<FeedV2>`. Malformed cursor ->400; deleted snapshot ->409 with `REFRESH_REQUIRED`; storage unavailable ->503 redacted.

- [ ] **1. Write the failing test.** Assert max 50 records/page, bound cursor length to 512 characters, reject negative/non-integer positions and invalid snapshot IDs. Remove all records in an intermediate page: cursor advances and later facts remain reachable. New active snapshot does not alter an existing cursor stream.
- [ ] **2. Verify failure.** Run `pnpm --filter @sachmuch/web test`; the new behavioural assertion must fail before implementation. A broken test fixture/import is not the intended failure.
- [ ] **3. Implement.** Use URL-safe base64 JSON with strict validation; cursor is not an authorization grant. Query by indexed snapshot/position, filter revoked/expired facts and advance by scanned position. totalEligible comes from live eligible distinct count, not language row count. Feature flag `SACHMUCH_FEED_EDITION=curated|corpus` defaults curated.
- [ ] **4. Verify.** Run `pnpm --filter @sachmuch/web test && pnpm --filter @sachmuch/web typecheck`; require all tests/checks to pass. Inspect the changed behaviour, not only the process exit code.
- [ ] **5. Commit.** Stage only this task's files and commit with message `feat: serve bounded snapshot pages with safe cursors`. Record verification and unresolved limits in the rollout report; review before dependent work.

### Task C3: Mobile long-session and recovery behaviour

**Files:** Modify `apps/mobile/src/feed/useFeed.ts`, `cache.ts`, `screens/DiscoverScreen.tsx`, `i18n.ts`; extend useFeed/cache/screens tests.

**Interfaces:** Consume v2 cursor/error codes from C2. Retain existing maximum 600-record in-memory window; display downloaded/page count separately from totalEligible.

- [ ] **1. Write the failing test.** Page through >600 records while keeping selected ID stable; assert memory window<=600, no repeated fetch after final cursor, continuation after empty intermediate page, and refresh-required retains downloaded card until user refresh. Language fallback does not create empty-page loops.
- [ ] **2. Verify failure.** Run `pnpm --filter @sachmuch/mobile test`; the new behavioural assertion must fail before implementation. A broken test fixture/import is not the intended failure.
- [ ] **3. Implement.** Preserve current pager physics and love effects. Reorder only newly fetched content according to snapshot order, not client random ranking; preserve existing visible IDs on append/eviction. No inner scroller. Keep downloaded cache bounded and restore it before network.
- [ ] **4. Verify.** Run `pnpm --filter @sachmuch/mobile test && pnpm --filter @sachmuch/mobile typecheck`; require all tests/checks to pass. Inspect the changed behaviour, not only the process exit code.
- [ ] **5. Commit.** Stage only this task's files and commit with message `feat: support large fact sessions and recoverable refresh`. Record verification and unresolved limits in the rollout report; review before dependent work.

### Task C4: Measured rollout to the actual target

**Files:** Create `scripts/verify-corpus-feed.ts`, `docs/corpus-rollout-report.md`; update `docs/MOBILE-VERIFICATION.md`, `docs/DEPLOY.md`; add verification script fixtures under `pipeline/test/`.

**Interfaces:** Produce `verifyCorpusFeed({origin,expectedMinimum}: {origin:string;expectedMinimum:number}):Promise<{unique:number;pages:number;duplicates:number;missing:number}>`; use a fixed snapshot and compare with its eligible manifest, excluding documented revocations.

- [ ] **1. Write the failing test.** Synthetic local server returns duplicate/missing cursor-page records: verifier exits nonzero with named discrepancy. Fixture sources never contribute to production total. Count changing mid-run is assessed against the fixed snapshot, not an unrelated new snapshot.
- [ ] **2. Verify failure.** Run `pnpm --filter @sachmuch/pipeline test`; the new behavioural assertion must fail before implementation. A broken test fixture/import is not the intended failure.
- [ ] **3. Implement.** Stage migrations/API, verify backup and source kill switches, compare query plans/capacity/latency against pilot baseline, then install v2 Release on iPhone. Publish accepted batches through 1000/10000/25000/50000/100000+ checkpoints, recording each actual count and topic coverage. Before switching corpus flag, audit a representative mix and verify complete text in English/Hindi/fallback, offline notice, large fonts, smooth paging and private loves. Roll back flag/snapshot on failure; do not remove personal records.
- [ ] **4. Verify.** Run `pnpm test && pnpm typecheck`; require all tests/checks to pass. Inspect the changed behaviour, not only the process exit code.
- [ ] **5. Commit.** Stage only this task's files and commit with message `docs: verify staged corpus rollout and production counts`. Record verification and unresolved limits in the rollout report; review before dependent work.

## Completion criteria

- [ ] Production getCorpusReport reports >=100000 eligible distinct claims and snapshot verification confirms reachability without unexpected duplicates/omissions.
- [ ] All requested topic groups have documented coverage; any sparse group is explicitly reported, never silently relabelled.
- [ ] Scheduled existing ingestion operates with current credentials, resumable checkpoints and source backoff; no paid services enabled without separate authorization.
- [ ] User has the updated Release app; native swipe/heart behaviour remains intact. Current fact counts, not a forecast, are reported.
- [ ] If target cannot yet be reached because of a measured external constraint, state remaining count, precise blocker and required remedy. Do not mark the whole objective complete after scaffolding or the pilot.
