# Corpus B — acquisition and quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce measured, resumable batches of distinct interesting facts across the requested topics.

**Architecture:** Reuse the queue and connector framework with canonical claim keys, explicit evidence, short original rendering and publication review. Start with measured source pilots and scale only accepted families.

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

- Same claim from different sources/languages must count once (B1).
- Retries after timeouts or worker termination must not duplicate publication (B2).
- Live source URLs can support a different claim; reachability is not verification (B3).
- A translation or generic country ranking must not inflate useful content counts (B1/B3).
- An expired political/technical assertion or unlabelled folklore must not publish (B3).

## Dependencies and records

Requires A1–A3. Create `packages/templates/src/claim.ts`: `CanonicalClaim = {subject:string;predicate:string;object:{kind:'entity'|'text'|'quantity'|'date';value:string;unit?:string};qualifiers:Record<string,string>;timeScope?:string}`; `Evidence = {url:string;publisher:string;sourceRecordKey:string;checkedAt:string;licence:MobileFact['licence'];reference?:string}`; `CandidateV2 = {claim:CanonicalClaim;fact:FactV2;evidence:Evidence[];sourceVersion:string;batchId:string}`. `sourceVersion` is an upstream version/checksum, never an invented date of truth. Export these from templates; connectors consume them without importing db.

### Task B1: Canonical claims and cross-source identity

**Files:** Create `packages/templates/src/claim.ts`, `pipeline/src/gate/claim-key.ts`, `pipeline/test/claim-key.test.ts`; modify `pipeline/src/persist.ts`, `packages/db/src/schema.ts` and a new migration.

**Interfaces:** Produce `canonicalClaimKey(claim:CanonicalClaim):string` using stable JSON and SHA-256; store a unique canonical_claim_key; source evidence is many-to-one.

- [ ] **1. Write the failing test.** Assert key equality for qualifier reordering, a translated rendering, a second source and normalised 1000 m versus 1 km. Assert inequality for different objects and distinct intentional historical dates. Reimport one claim through two templates: one live row and two evidence records.
- [ ] **2. Verify failure.** Run `pnpm --filter @sachmuch/pipeline test`; the new behavioural assertion must fail before implementation. A broken test fixture/import is not the intended failure.
- [ ] **3. Implement.** Use deterministic unit/date/entity normalisation with an explicit supported-unit table; unsupported conversion goes to review rather than guessed equivalence. Backfill existing rows only when the underlying claim can be reconstructed; keep uncertain legacy rows outside the new edition until reviewed. Preserve near-text dedupe as a secondary screen.
- [ ] **4. Verify.** Run `pnpm --filter @sachmuch/pipeline test && pnpm --filter @sachmuch/db test:integration`; require all tests/checks to pass. Inspect the changed behaviour, not only the process exit code.
- [ ] **5. Commit.** Stage only this task's files and commit with message `feat: deduplicate canonical claims across sources`. Record verification and unresolved limits in the rollout report; review before dependent work.

### Task B2: Resumable acquisition batches

**Files:** Modify `connectors/src/types.ts`, `pipeline/src/orchestrator.ts`, `pipeline/src/run.ts`, `.github/workflows/ingest.yml`; create `pipeline/src/batches.ts`, `pipeline/test/batches.test.ts`, schema migration for batch/checkpoint metadata.

**Interfaces:** Produce `runImportBatch({batchId,sourceId,maxRecords,maxDurationMs,dryRun}:BatchOptions):Promise<BatchReport>`; define/export BatchOptions and BatchReport in `pipeline/src/batches.ts` with candidates, accepted, duplicates, rejected, deferred, reviewPending, lastCursor, durationMs, requests and bytes.

- [ ] **1. Write the failing test.** Fake connector yields two pages then rate limits: checkpoint last completed page; resume imports each claim once. Kill/retry between persistence and checkpoint: unique key prevents double count. maxRecords and maxDurationMs stop cleanly; one throttled source does not cancel another.
- [ ] **2. Verify failure.** Run `pnpm --filter @sachmuch/pipeline test`; the new behavioural assertion must fail before implementation. A broken test fixture/import is not the intended failure.
- [ ] **3. Implement.** Persist acquisition and processing checkpoints separately, using queue transaction boundaries. Cap pilot runs at 1000 candidate records and 10 minutes; respect the earlier limit. Existing schedule stays unchanged; manual budget inputs validated positive and capped below runner timeout. Dry run cannot mutate live publication status.
- [ ] **4. Verify.** Run `pnpm --filter @sachmuch/pipeline test && pnpm --filter @sachmuch/pipeline typecheck`; require all tests/checks to pass. Inspect the changed behaviour, not only the process exit code.
- [ ] **5. Commit.** Stage only this task's files and commit with message `feat: checkpoint bounded fact import batches`. Record verification and unresolved limits in the rollout report; review before dependent work.

### Task B3: Short-text, evidence and editorial publication gates

**Files:** Modify `pipeline/src/gate/structural.ts`, `source-check.ts`, `index.ts`, `persist.ts`; create `pipeline/src/gate/editorial.ts`, `pipeline/test/editorial.test.ts`, `pipeline/src/review-batch.ts`; update template types/rendering and existing gate tests.

**Interfaces:** Produce `assessCandidate(candidate:CandidateV2,now:Date):{decision:'publish'|'review'|'reject';reasons:string[]}`. Produce `reviewBatch(batchId:string,decisions:{claimKey:string;approved:boolean;reason:string}[]):Promise<void>`; store reviewer and timestamp.

- [ ] **1. Write the failing test.** English-only and Hindi-only can pass. Reject incomplete originals and leaked identifiers. Long explanatory filler goes to review; never pad short content. Political record with missing as-of/expiry goes to review; expired item is not live. Unlabelled supernatural claim goes to review. Reachable URL with absent claim evidence is not auto-approved.
- [ ] **2. Verify failure.** Run `pnpm --filter @sachmuch/pipeline test`; the new behavioural assertion must fail before implementation. A broken test fixture/import is not the intended failure.
- [ ] **3. Implement.** Separate deterministic validity from editorial approval. Enforce short-card targets from spec; outliers require a reviewed shorter rewrite, not truncation. Require up to 100 stratified reviewed examples per new family and block the family on any material evidence/accuracy error. Maintain independent-source identity rather than counting mirrored pages twice. Use review records, not a fabricated automatic truth score.
- [ ] **4. Verify.** Run `pnpm --filter @sachmuch/pipeline test && pnpm --filter @sachmuch/templates test`; require all tests/checks to pass. Inspect the changed behaviour, not only the process exit code.
- [ ] **5. Commit.** Stage only this task's files and commit with message `feat: gate short facts on evidence and editorial review`. Record verification and unresolved limits in the rollout report; review before dependent work.

### Task B4: Broaden source coverage with measured pilots

**Files:** Modify `connectors/src/sources/wikidata/index.ts`, `packages/templates/src/library/`, `pipeline/src/registry.ts`, `packages/db/src/sources.ts`, taxonomy; create `connectors/src/sources/editorial-manifest/index.ts`, `connectors/test/editorial-manifest.test.ts`, `content/editorial/manifests/`, `docs/corpus-source-audit.md`.

**Interfaces:** Manifest connector consumes versioned arrays of CandidateV2 plus checksum. Existing Wikidata connector gains approved claim families for species adaptations/classification, inventions/discoveries, astronomical properties, institutions/history and people achievements; each family gets its own template file/test.

- [ ] **1. Write the failing test.** Use checked-in source fixtures: en-only and hi-only labels, missing reference, redirect, unit mismatch, known film entity and repeated statement. Assert only referenced, complete, eligible candidates emerge. Manifest hash mismatch fails before map; re-running same manifest yields zero new claims.
- [ ] **2. Verify failure.** Run `pnpm --filter @sachmuch/connectors test`; the new behavioural assertion must fail before implementation. A broken test fixture/import is not the intended failure.
- [ ] **3. Implement.** First record current source terms/endpoints/rate limits and observed candidate yield. Add cited original editorial entries from official educational/institutional sources through reviewed manifests. No blind HTML crawl or LLM bulk fabrication. Retire country-ranking/film families from new discovery eligibility. Every newly enabled family needs the B3 sample gate. Cover every requested tag in taxonomy; do not fake coverage if a source yields none.
- [ ] **4. Verify.** Run `pnpm --filter @sachmuch/connectors test && pnpm --filter @sachmuch/templates test && pnpm --filter @sachmuch/pipeline test`; require all tests/checks to pass. Inspect the changed behaviour, not only the process exit code.
- [ ] **5. Commit.** Stage only this task's files and commit with message `feat: add reviewed multi-topic content acquisition`. Record verification and unresolved limits in the rollout report; review before dependent work.

### Task B5: Pilot report and capacity-aware bulk import

**Files:** Create `pipeline/src/corpus-report.ts`, `pipeline/test/corpus-report.test.ts`, `scripts/corpus-pilot.ts`, `scripts/corpus-scale.ts`; update `docs/corpus-rollout-report.md` and `docs/SOURCES.md`.

**Interfaces:** Produce `getCorpusReport(sql,now:Date):Promise<{eligibleDistinct:number;drafts:number;duplicates:number;expired:number;byTopic:Record<string,number>;byLanguage:Record<string,number>;bySource:Record<string,number>}>`. Scale command consumes B2 BatchOptions and B3 review gates.

- [ ] **1. Write the failing test.** Fixture includes translated duplicates, expired facts and drafts: assert only distinct live eligible claim keys increase published count; multi-tagged fact counts once in total. Negative remaining storage/time budget prevents starting a new bulk batch.
- [ ] **2. Verify failure.** Run `pnpm --filter @sachmuch/pipeline test`; the new behavioural assertion must fail before implementation. A broken test fixture/import is not the intended failure.
- [ ] **3. Implement.** Run representative pilot toward ~1000 accepted claims, reporting actual shortfall and source distribution. Measure acceptance rate, requests, runtime and storage. If API throughput is inadequate, add one official-dump adapter using the same checkpoint contract only after verifying terms/manifest/checksum and a bounded fixture pilot. Bulk jobs must stop at measured capacity or review backlog, not lower quality gates.
- [ ] **4. Verify.** Run `pnpm --filter @sachmuch/pipeline test && pnpm --filter @sachmuch/pipeline typecheck`; require all tests/checks to pass. Inspect the changed behaviour, not only the process exit code.
- [ ] **5. Commit.** Stage only this task's files and commit with message `feat: report real corpus growth and bound bulk acquisition`. Record verification and unresolved limits in the rollout report; review before dependent work.

## B exit gate

- [ ] Publish the actual pilot report, including gaps for horror/religion and other sparse topics; labels and factual review remain required.
- [ ] Establish measured throughput/capacity before projecting a completion date. Source listings, downloaded rows and synthetic fixtures never count as published facts.
- [ ] Re-run whole repository tests after interface changes. Resume accepted batches during C rollout; a pilot is not completion of the 100,000+ objective.
