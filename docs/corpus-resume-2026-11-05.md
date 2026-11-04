# Resume report — 5 November 2026

Production was checked at the start of this session: 100 eligible facts, curated-2026-10-21-100, no continuation cursor. No content growth occurred while the chat was inactive.

Saved importer, snapshot and mobile changes survived the interruption. The repository test suite and type checks passed on resume. A fresh review identified two issues:

1. Appended feed pages were not persisted offline. Added an offline-reopen regression test (failed first), then persisted the merged window, bounded to 300 downloaded cards. Mobile suite now passes 62 tests.
2. Corpus requests recount the full snapshot for each page. This performance issue remains open; corpus mode remains disabled. The prior 100k synthetic test established cardinality and selected windows, not full-traversal latency.

Backward compatibility: installed clients without `paged=1` continue receiving all 100 curated cards. Updated clients explicitly request bounded pages. Web tests pass 13 cases, including compatibility and two-page traversal.

Build verification: the sandboxed local build could not fetch Google Fonts. A network-enabled build fetched fonts but failed because the web homepage requires a database connection during prerendering and this checkout has no DATABASE_URL. The existing Vercel CLI login can inspect the correct project; a staged production build was started with --skip-domain, using Vercel's own environment. No production database migration or new fact publication has occurred.

Automatic approval review rejected exporting all production environment variables. A narrower request to retrieve only DATABASE_URL is pending user approval. Do not export unrelated secrets or bypass that decision.

The 100,000+ fact goal is still unfinished. Existing 581 Nobel drafts remain review-only; they are not app facts. No bulk acquisition job is running in the background.

## Release verification

Staged deployment `dpl_5QWuJGjmhgkVDEpQeu1KQg284LC6` compiled successfully using Vercel's existing configuration. Verified two pages contain 100 unique facts, final cursor null, and the installed-client request still receives all 100. Promoted the tested deployment to sachmuch-web-black.vercel.app; public checks returned 50/100 with a cursor for paged requests and 100/100 with no cursor for existing clients. Corpus mode remains disabled. The native offline-cache fix is saved in source but has not been installed on the iPhone.

The user approved retrieval of only DATABASE_URL. Vercel reports it as sensitive and returns no value. No credential was exported. Instead, the existing GitHub importer was confirmed to work: run41751111265 completed47 jobs, published4 records and detected126 duplicates. Added and pushed a read-only diagnostic job (commit401b2d2), using the existing Actions DATABASE_URL internally. It reports only aggregate counts and schema metadata. This does not bypass Vercel's sensitive-value restriction.

## Production inventory result

Read-only Actions run41892678805 succeeded: 187 legacy live records and145 hidden. Live topics: geography107, inventions24, Bollywood23, environment11, human body8, technology4, government4, finance4, language2. None of the corpus columns or tables queried exists in production. These legacy records are not automatically eligible for the user's new discovery feed. The100 curated app facts are a separate collection; counts must not be added together as if disjoint. Additive migrations, backup/history checks, reviewed publication, corpus-count performance correction, content sourcing and native installation remain unfinished.
