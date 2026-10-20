# Language migration compatibility

The additive migration can be rehearsed independently. `rollout/enable-hindi-only.sql` is deliberately outside the automatic migration directory. Apply it in a transaction only after backup and compatible readers deploy.

| Consumer | Compatibility |
| --- | --- |
| `/api/feed`, web feed via `apps/web/lib/facts.ts` | Explicit non-null English filter; v1 contract unchanged |
| `/api/feed?edition=fun&paged=1` | Static bilingual reviewed edition remains available |
| `/api/v2/feed` | V2 curated route; 20 actual facts, no database dependency |
| `readFactV2` | Approved original text required; hidden/expired/disabled sources excluded |
| `writeFactV2` | Updates an existing canonical fact transactionally; ingestion must create source/claim identity first |
| Existing ingestion `persist.ts` | Still renders English; rollout sync trigger mirrors writes into texts |
| Search trigger | Existing coalesce-to-empty handles null English |
| Dedupe SQL `similarity(hook_en, ...)` | Null yields no match; semantic v2 claim dedupe still required before new acquisition |
| Report, entity/subtopic count triggers, boost endpoint | Identity/status operations; no English assumption |
| Native client | V1 until A4 migration and device verification complete |

Do not run old `drizzle push` after enabling nullable English: the checked-in legacy schema remains non-null until rollout completes. Do not apply the complete migration journal blindly to an existing database provisioned through push; reconcile its history first. Production has not been migrated.
