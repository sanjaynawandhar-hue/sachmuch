# Corpus pilot — 26 October 2026

## Verified counts

The public `/api/v2/feed` returned 100 facts, totalEligible 100 and no next cursor on 26 October. The 100,000+ production target is not achieved.

The isolated local `sachmuch_test_corpus_pilot` database contains 581 distinct canonical draft claims from the Nobel Prize API pilot, zero live facts. A completed rerun processed zero candidates. These drafts are not available in the phone app and do not increase its count.

## Acquisition and review

Source: https://api.nobelprize.org/2.1/nobelPrizes
Terms: https://www.nobelprize.org/about/terms-of-use-for-api-nobelprize-org-and-data-nobelprize-org/
The cached source was acquired on 21 October: 688 prize records, 1,036 laureate award rows, grouped into 710 shared-motivation records. Of these, 581 were rendered as draft cards and 129 held before import. The terms identify the API data as CC0. Acquisition used seven paced requests, 799,088 network bytes and approximately 14.8 seconds; subsequent imports read the local cache.

Manifest: `content/pilots/nobel-candidates.json`
SHA-256: `8602ee156c1cc9e1143273e6b3e5a269019ea3e6def6bb96705c724054185053`
Batch: `nobel-pilot-20261021`

Publication is held. Initial sample review found raw HTML and wording that could imply acceptance of declined awards. The current rendering removes HTML and says “was awarded”; plural recipient groups still need grammatical correction. Four cards exceed fit constraints after that wording change. Fifty-four economics cards require an explicit historical-claim policy rather than bypassing the changing-claim gate. All 581 require editorial approval. Citation wording must not become a second canonical claim when upstream text changes. This source does not provide the broad fun-fact coverage requested by the user.

## Import verification

The first real import revealed Drizzle's JSON/date serializer overrides were incompatible with raw postgres helpers. Integration tests now use the actual createDb client. Four tests reproduced the JSON failure; explicit JSON serialization and timestamp strings fixed the failures. Checkpoints decode either native JSON or the Drizzle-returned string.

- 15 local PostgreSQL integration tests passed, including partial-page resume, rate limiting, rollback and dry-run safety.
- 57 pipeline tests passed.
- 9 connector tests passed.
- Pipeline and connector type checks passed.
- Import: 581 review-pending drafts, 0 accepted, 423 ms using cached input.
- Completed rerun: 0 candidates, 9 ms.
- Independent SQL query: 581 rows, 581 distinct canonical keys, 0 live; checkpoint complete and cleared.

These are ingestion timings, not editorial acceptance throughput. No production migration, publication, GitHub push or new deployment was performed in this session.

## Remaining work

Complete auditable editorial decisions and source-family review, correct and re-review the held rendering, broaden reviewed source families across requested topics, and build the production paginated corpus feed. Measure accepted throughput and storage before scaling beyond the pilot. The scheduled legacy importer does not run this new local manifest pipeline yet. No 100,000-fact background job is running.

## Feed work on 27 October

Implemented a corpus feed feature flag, strict cursors, 50-record pages, atomic database snapshots with category interleaving, and filtering of withdrawn facts while advancing scanned positions. Existing curated mode remains the default. Mobile retains downloaded facts when the server requests a refresh and stops retrying the expired cursor.

The isolated PostgreSQL test constructed a snapshot of 100,000 synthetic claims: 100,000 unique entries and contiguous positions; first/last pages and a fully withdrawn intermediate page passed. Bounded fixture insertion plus checks took about 51 seconds. An initial unbounded insert exceeded the test harness timeout and was cancelled locally before retrying in batches. These are **test fixtures, not acquired content or published app facts**. Full production traversal and template/entity diversity checks remain outstanding. No production switch or deployment has been performed.
