# Corpus rollout progress

Target: 100,000+ distinct, eligible published claims. This target has **not** been reached.

## 2026-10-21 foundation

- Current installed discovery edition remains the 20 reviewed facts. No production switch or migration has been performed.
- V2 wire validation accepts either English or Hindi with complete original text and explicit fallback. Core tests: 79 passed.
- Additive multilingual storage and bounded, conflict-safe backfill pass three integration tests on isolated PostgreSQL 17. Legacy English constraints remain intact.
- Integration tests refuse remote URLs and database names outside `sachmuch_test_*`.
- Existing migration history had unrecorded boost/image columns. The generated migration reconciles those with `IF NOT EXISTS`; production migration history must be inspected before applying anything. The hand-written trigger migration is now represented in the journal for fresh installs.
- Latest three scheduled importer runs failed. Latest observed cause: connection timeout. User updated GitHub DATABASE_URL; one-minute verification run 39478859530 started.

## Remaining gates

Production backup/restore rehearsal; schema-history inspection; v2 repository/mobile adoption; canonical dedupe and evidence gates; source pilot and sample review; snapshots and full traversal; device checks; actual published growth and category coverage.

No candidates, translations, fixture rows or generated scaffolding count toward the target.
