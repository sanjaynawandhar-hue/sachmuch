# Corpus A — language and data foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish and display a complete fact in either English or Hindi without breaking existing apps or personal data.

**Architecture:** Add an optional-language v2 contract and additive text/provenance tables before changing legacy constraints. Keep the v1 and 20-fact endpoints operational during migration.

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

- Hindi-only records must remain visible to an English-preferring reader (A1/A4).
- Incomplete text must never replace a complete original variant (A1/A3).
- Interrupted migration/backfill must be rerunnable without losing IDs or texts (A2).
- Old installed clients must not receive a v2 object disguised as v1 (A3).
- A failed upgrade/cache write must retain saved facts and love IDs (A4).

## Shared contract and file ownership

`packages/core/src/fact-v2.ts` owns `Language = 'en' | 'hi'`, `FactText = {hook:string; body:string}`, and `FactV2 = {id:string; originalLanguage:Language; texts:Partial<Record<Language,FactText>>; categoryId:number; categorySlug:string; categoryLabel:string; categoryEmoji:string; sourceUrl:string; publisher:string; licence:MobileFact['licence']; attributionText?:string; knowledgeKind:'fact'|'belief'|'folklore'; asOf?:string; validUntil?:string; templateId?:string; quality?:number}`. Require at least one complete text and a complete originalLanguage variant. `FeedV2 = {version:2; fetchedAt:string; facts:FactV2[]; nextCursor:string|null; snapshotId:string; totalEligible:number}`. IDs identify claims, not translations. Do not fabricate an English variant for Hindi-only content.

### Task A1: V2 parsing and language fallback

**Files:** Create `packages/core/src/fact-v2.ts`, `packages/core/test/fact-v2.test.ts`; modify `packages/core/src/index.ts`.

**Interfaces:** Produce `parseFactV2(input:unknown):FactV2`, `parseFeedV2(input:unknown):FeedV2`, `selectFactText(fact:FactV2, preferred:Language):{language:Language;text:FactText}`.

- [ ] **1. Write the failing test.** Test named `Hindi-only survives English preference`: assert selected language is `hi` and the Hindi text is unchanged. Test bilingual preference and rejected empty/partial variants, inconsistent originalLanguage, invalid source URLs, duplicate IDs in an envelope and unsupported version.
- [ ] **2. Verify failure.** Run `pnpm --filter @sachmuch/core test`; the new behavioural assertion must fail before implementation. A broken test fixture/import is not the intended failure.
- [ ] **3. Implement.** Implement strict shape validation. Fallback order is preferred, original, other complete supported variant. Explicitly reject malformed variants rather than interpreting an empty string as a translation.
- [ ] **4. Verify.** Run `pnpm --filter @sachmuch/core test && pnpm --filter @sachmuch/core typecheck`; require all tests/checks to pass. Inspect the changed behaviour, not only the process exit code.
- [ ] **5. Commit.** Stage only this task's files and commit with message `feat: add language-flexible fact contract`. Record verification and unresolved limits in the rollout report; review before dependent work.

### Task A2: Additive migration and backfill

**Files:** Modify `packages/db/src/schema.ts`; create migration via existing Drizzle tooling under `packages/db/migrations/`, `packages/db/scripts/backfill-fact-texts.ts`, `packages/db/test/fact-texts.integration.test.ts`; update migration metadata and `packages/db/package.json`.

**Interfaces:** Create `fact_texts(fact_id,language,hook,body,review_state)` unique on fact/language; `fact_evidence(id,fact_id,source_url,publisher,licence,checked_at,source_record_key)`; add original_language, knowledge_kind, as_of, batch_id to canonical facts. Produce `backfillFactTexts(sql):Promise<{inserted:number;invalid:number}>` in `packages/db/src/fact-texts.ts`.

- [ ] **1. Write the failing test.** Against an isolated test Postgres database, backfill English-only/bilingual fixtures twice: assert stable fact IDs and unchanged text count on second run. A half-Hindi pair is reported invalid and never approved. Existing live English facts remain queryable by old SQL.
- [ ] **2. Verify failure.** Run `pnpm --filter @sachmuch/db test`; the new behavioural assertion must fail before implementation. A broken test fixture/import is not the intended failure.
- [ ] **3. Implement.** Make additive changes only. Backfill in bounded transactions with conflict-safe writes. Add a test:integration script requiring explicit TEST_DATABASE_URL and refusing known production URL; run the integration file separately from unit tests. Do not relax legacy English constraints yet.
- [ ] **4. Verify.** Run `pnpm --filter @sachmuch/db test && pnpm --filter @sachmuch/db test:integration`; require all tests/checks to pass. Inspect the changed behaviour, not only the process exit code.
- [ ] **5. Commit.** Stage only this task's files and commit with message `feat: add multilingual text storage with resumable backfill`. Record verification and unresolved limits in the rollout report; review before dependent work.

### Task A3: V2 read/write path and compatibility switch

**Files:** Create `packages/db/src/fact-v2-repository.ts`, `apps/web/lib/feed-v2.ts`, `apps/web/app/api/v2/feed/route.ts`, `apps/web/test/feed-v2.test.ts`; modify `packages/db/src/index.ts`; add a second migration only after compatibility deploy.

**Interfaces:** Consume A1 types. Produce `readFactV2(sql,id:string):Promise<FactV2|null>` and `writeFactV2(sql,fact:FactV2):Promise<void>`. Initial v2 endpoint serves the 20 curated facts converted explicitly to v2 using snapshotId `curated-v2`, no cursor and accurate total; C2 replaces it behind a rollout flag.

- [ ] **1. Write the failing test.** Test v2 route response version 2, Hindi-only fixture, redacted failures, and existing v1 route still version 1. Repository integration: dual-write an English-bearing fact; Hindi-only write fails before relaxed migration and succeeds afterwards; live text completeness enforced at publication.
- [ ] **2. Verify failure.** Run `pnpm --filter @sachmuch/web test`; the new behavioural assertion must fail before implementation. A broken test fixture/import is not the intended failure.
- [ ] **3. Implement.** Implement repository validation before transactions; dual-write legacy fields only when English exists. Audit all facts readers/triggers/search indexes and add `hook_en IS NOT NULL AND body_en IS NOT NULL` to legacy paths where needed. Deploy safe readers before the second migration drops mandatory English and replaces language constraints with validated complete-text publication. Record each consumer in docs/corpus-compatibility.md.
- [ ] **4. Verify.** Run `pnpm --filter @sachmuch/web test && pnpm --filter @sachmuch/db test:integration && pnpm --filter @sachmuch/web typecheck`; require all tests/checks to pass. Inspect the changed behaviour, not only the process exit code.
- [ ] **5. Commit.** Stage only this task's files and commit with message `feat: expose v2 facts with legacy-safe language migration`. Record verification and unresolved limits in the rollout report; review before dependent work.

### Task A4: Mobile v2 adoption without losing personal data

**Files:** Modify `apps/mobile/src/feed/client.ts`, `useFeed.ts`, `cache.ts`, `selection.ts`, `apps/mobile/src/state/storage.ts`, `AppStateProvider.tsx`, `screens/DiscoverScreen.tsx`, `screens/SavedScreen.tsx`, `components/FactPager.tsx`, `components/FactReader.tsx`; update their existing tests.

**Interfaces:** Consume FeedV2/selectFactText. Produce a display adapter `toDisplayFact(fact:FactV2,preferred:Language):MobileFact & {displayLanguage:Language;knowledgeKind:FactV2["knowledgeKind"]}` in `apps/mobile/src/feed/selection.ts`; use displayLanguage for script typography, preference for UI controls.

- [ ] **1. Write the failing test.** Assert Hindi-only appears under English preference, same ID stays selected on toggle, legacy saved record migrates once, existing lovedIds survive, failed cache write does not delete saved data, and offline reopening restores the selected edition. Preserve current swipe and love tests.
- [ ] **2. Verify failure.** Run `pnpm --filter @sachmuch/mobile test`; the new behavioural assertion must fail before implementation. A broken test fixture/import is not the intended failure.
- [ ] **3. Implement.** Fetch /api/v2/feed and version cache independently from personal storage. Convert v1 saved entries explicitly; retain original blobs until successful migration persistence. Show a subtle EN/हिन्दी fallback label and explicit belief/folklore labels. Preserve complete short text; verify both scripts with offline notice and large fonts on device.
- [ ] **4. Verify.** Run `pnpm --filter @sachmuch/mobile test && pnpm --filter @sachmuch/mobile typecheck`; require all tests/checks to pass. Inspect the changed behaviour, not only the process exit code.
- [ ] **5. Commit.** Stage only this task's files and commit with message `feat: show facts in either available language`. Record verification and unresolved limits in the rollout report; review before dependent work.

## A exit gate

- [ ] Baseline importer credentials and database capacity through read-only probes; report booleans/errors without URI/password values in `docs/corpus-rollout-report.md`.
- [ ] Backup production before migrations; rehearse restore against an isolated database. Preserve existing curated route until device validation passes.
- [ ] All repository tests pass; install a Release build and verify language fallback, offline state, layout and saved/liked IDs. Do not claim corpus growth from completing A.
