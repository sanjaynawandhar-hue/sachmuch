# Sachmuch: 100,000+ distinct facts without a language barrier

Status: proposed design for user review. No corpus expansion is implemented by this document.

## Intent and acceptance

The user wants at least 100,000 interesting facts covering fun, space, politics, animals, wonders, inventions, food and nature, money, horror, India, world, water, colours, mobile, technology, study, men, women, God, creatures and AI. English OR Hindi is sufficient. A translation is optional and must not delay publication. Preserve the approved smooth vertical swipe, complete short cards, personal filled-heart/sprinkle interaction, quiet music and downloaded reading. Movie/Bollywood facts remain excluded.

Success means 100,000 or more distinct eligible, published claims actually reachable through the production feed—not raw source rows, draft candidates, translations, rewritten sentences or an inflated UI counter. Content remains useful before that target is reached. No completion date or source yield is promised before a measured pilot.

## Current state and gaps

- Mobile currently requests a finite 20-item curated `edition=fun` endpoint. That endpoint is independent of the database. Keep it as the rollback edition until the new feed is verified.
- The importer registers only Wikidata and World Bank connectors. Other sources listed in docs/SOURCES.md are candidates, not working integrations.
- `facts.hook_en` and `body_en` are mandatory; Hindi is optional. Mobile wire records also require `en`. Hindi selection drops English-only facts.
- Structural gates require 40–120 English words, which encouraged long explanations and filler. The native pager no longer has an inner scroller.
- Existing dedupe is template/row-based plus textual similarity; the same claim can arrive through different sources or templates.
- Existing source URL checks and deterministic quality scores are not proof that a claim is true or interesting.
- Prior imports had database credential failures. Vercel feed recovery did not establish that GitHub Actions has a working current credential. Verify connectivity without logging credentials before importing.

## Approach and tradeoffs

Extend the existing connectors, queue, Postgres storage and Vercel API. Avoid a separate platform. Use structured evidence for scale and a curated editorial lane for surprising explanatory facts. A structured-only approach is cheaper but repeats the boring statistics problem; a wholly manually authored corpus cannot credibly promise 100,000 entries quickly. The mixed approach preserves an interesting feed while making the growth measurable.

No new paid service, paid model or subscription is part of this design. Use existing resources within their actual measured limits. If source access or hosting capacity needs spending, present the concrete cost and required change before purchasing or enabling it. Existing comments claiming free service at any volume are not capacity evidence.

## Topics and source acquisition

Primary categories plus secondary tags cover the requested subjects; one claim may be tagged India, women and inventions but counts once. Fun is an editorial tag as well as a discovery preference, not a reason to count a claim again.

| Content pool | Candidate evidence and editorial approach |
| --- | --- |
| Space, water, colours, nature, animals, creatures | Referenced Wikidata statements; NASA/NOAA educational material; museums, botanical institutions and research institutions |
| Wonders, inventions, mobile, technology, AI | Referenced historical/technical records; institution and inventor archives; official documentation for dated product claims |
| India, world, politics, money | Official institutional records and referenced historical claims; World Bank only for selected meaningful comparisons, not repeated country rankings |
| Food, study, men and women | Educational/research sources; discoveries, biographies and achievements; specific evidence rather than unsupported gender generalisations |
| Religion/God, mythology, horror | Documented religious history, traditions, literature and folklore. Attribute beliefs to their tradition. Label mythology/folklore clearly; do not present supernatural stories as empirical events |

Source onboarding must verify current endpoint, terms, allowed reuse, data coverage and rate limits. Sources named here are candidates, not assumed implementations. Wikipedia/DYK may locate a claim and its references; do not copy their prose or assume rewriting removes licence obligations. Prefer original wording based on reusable structured/public-domain evidence. Retain any required attribution.

Use bounded API pages for pilot discovery. For bulk growth, evaluate official reusable dumps and manifests instead of hammering public query endpoints. Persist download version/checksum, page cursor and task identity. Honour publisher throttling and Retry-After. Do not fetch arbitrary user-supplied URLs.

A source-yield report must show candidates, unique accepted claims, rejections, topic distribution, runtime, network requests and storage. Expand sources based on observed useful yield, not invented quotas. Preserve existing useful facts; keep low-quality statistics out of the new discovery edition without destructive deletion.

## Language model and safe migration

Add a `fact_texts` table keyed by `(fact_id, language)` with complete hook/body, provenance for translation if present, and review state. Supported publication languages initially `en` and `hi`. Canonical facts carry a preferred/original language. At least one complete approved text is required for live status.

Migration sequence:

1. Create the additive table and backfill complete existing English/Hindi pairs without changing IDs.
2. Add a version-2 feed contract with `id`, `originalLanguage` and `texts` containing one or both languages. Add explicit parsing, persisted cache version and saved-item migration.
3. Keep version-1 clients working by serving only facts with English to their old route. Do not place Hindi in a field labelled English.
4. Deploy v2 readers and writers. Then relax mandatory legacy English fields and update database constraints/triggers so Hindi-only publication is possible. Audit every old SQL consumer and search/index job before this step.
5. Continue legacy column dual-writes for English-bearing facts during transition. The old curated endpoint stays available for installed old clients and rollback.

Selection rule: complete preferred language, otherwise complete original language, otherwise the other supported language. Never hide a complete fact solely because its translation is missing. Preserve selected fact ID on language switching, saved facts, and personal likes. A small language label may indicate the fallback. UI labels follow the preference; fact text follows available evidence. No automatic paid translation is needed.

## Claim identity and quality

Store a canonical claim key built from stable subject, predicate, object, relevant qualifiers and time scope. Normalise units, dates and entity aliases. Separate text variants, supporting evidence and publication status from claim identity. A date update to the same time-sensitive assertion updates/retires its record unless it is intentionally a distinct dated historical claim.

Exact canonical-key dedupe is required across sources and languages. Text similarity is an additional screen, not the definition of uniqueness. Editorial free-text claims need a reviewed semantic key and near-duplicate check before publication. A second source improves evidence; it does not make another fact.

Publication gates:

- Complete supported-language text, short enough for the card, with no unresolved placeholders.
- Specific evidence for the actual claim, provenance URL, publisher, reuse status, checked date and supporting statement/reference. A successful HTTP request alone is insufficient.
- No duplicate claim, movie content, filler paragraphs, generic trivia manufactured by changing a place name, or unqualified superlative.
- Hook target 4–12 words; body target 15–40 words, normally no more than 220 characters per language. These are editorial limits, backed by actual device text-fit checks; never truncate a caveat or manufacture filler to meet a minimum.
- Knowledge type: documented fact, attributed religious belief, or folklore/mythology. Labels accompany the latter two in the card.
- Time-sensitive politics, money, AI, technology and records carry an as-of date and a review/expiry policy. Expired claims leave discovery until reviewed. No current office-holder or price without a dated source.
- Ambiguous/disputed/unsupported claims remain drafts or in review. No unverifiable assertion that AI or a numerical score has established truth.

For each new source/template family, inspect up to 100 stratified examples (all if fewer): factual accuracy, evidence, usefulness, language and fit. Any material factual/provenance error blocks that family pending correction and a fresh sample. For established families, sample each publishing batch and retain a kill switch and reversible batch IDs. Sampling is quality control, not proof of perfection.

## Import execution and operations

Reuse the current job queue, locks, retryable failures and concurrency model. Add source version, batch ID, checkpoint and idempotency metadata as needed. Run bounded batches with explicit record/time limits; checkpoint cleanly before the CI timeout. Rate limiting pauses one source, not all progress. Importing the same batch twice must not change counts.

Separate acquisition, normalisation, evidence checks, dedupe, text rendering and publish decision. Persist resumable work between stages rather than rerunning successful acquisition after a text validation failure. Retain aggregate failure reasons without secrets or unnecessary raw payloads in CI logs.

Publish only after a pilot acceptance report. A rollout flag chooses the new edition; removing a bad batch or disabling a source must remove its entries from new discovery snapshots. Backup and reversible migrations precede production data changes.

## Feed at scale

Do not download 100,000 facts to the phone or run random sorting across the full database for every swipe.

Build a versioned feed snapshot with `(snapshot_id, position, fact_id)` entries, one entry per eligible fact per snapshot. Index snapshot/position and enforce unique snapshot/fact. Generate balanced category rounds, with limits on repeated templates/entities and deliberate placement of interesting editorial entries. Caps soften only when eligible alternatives are exhausted, so facts remain reachable. Source and category imbalance must be visible in a report.

Serve 50 facts per page through an opaque validated cursor containing snapshot and position. The cursor advances through that immutable order, avoiding skips and repeats while ingestion continues. Retain the active and previous snapshot during rollout; an expired cursor returns an explicit refresh-required response. Remove revoked/expired facts at read time and advance over their positions safely, returning a usable next cursor even when a page becomes empty.

Keep a bounded mobile window and downloaded cache. Love/save states stay keyed by canonical fact ID. Refresh starts a new snapshot; a swipe does not reorder the already visible window. Display the actual number of published eligible distinct claims separately from current page size. Report drafts, rejected, duplicates, expired and translated records separately in operations.

The new edition becomes primary only after it has a representative accepted mix, v2 client compatibility and stable production checks. The 20-fact edition remains a rollback option; never silently label it as 100,000 facts.

## Phases and decision gates

1. **Foundation:** verify importer credentials, snapshot capacity/current database use, define claim identity, short-text rules and language-compatible migration. Produce dry-run results without changing the current feed.
2. **Representative pilot:** target approximately 1,000 accepted distinct claims across the requested topic groups; report any uncovered categories. Establish measured acceptance rate, throughput and cost. Do not publish weak claims to meet a numeric target.
3. **Production expansion:** publish reviewed batches toward 10,000, then 25,000 and 50,000. Test category distribution, evidence quality, duplicate detection, pagination, offline reading and expiration at each checkpoint.
4. **100,000+:** continue accepted batches until the live eligible distinct count actually crosses the target. Validate reachability across snapshot pages, not merely a database count. Report final coverage and missing-topic exceptions honestly.

No fixed ETA until the pilot measures accepted throughput. The target remains 100,000+ even if an early batch is smaller. If source yield, capacity or quality blocks growth, report the measured limit and specific remedy; do not silently substitute duplicates or abandon the target.

## Validation and rollback

- Migration fixtures: English-only, Hindi-only, bilingual, partial/invalid text, existing saved and liked IDs, legacy clients and reversible deploy order.
- Dedupe fixtures: same claim via another source/template/language, unit conversions, changed wording, distinct historical dates and time-sensitive updates.
- Content checks: retained caveats, category/movie exclusion, attribution, religion/folklore labels and stale-politics removal.
- Feed checks with 100,000 synthetic records explicitly labelled test fixtures: full traversal with no duplicates/omissions, removed entries, expired cursors, refresh, bounded memory and query plans. Test records never enter the published count.
- Device checks: English/Hindi/fallback text, smaller viewport, larger fonts, offline notice, complete text without inner scrollbar, stable vertical swipes and love animation.
- Capacity report: representative 100,000-row dataset/index size, snapshot overhead, database allowance and measured warm/cold API latency. Set an operational performance budget using the baseline; do not claim a service guarantee from a local test.
- Production staging: verify data and API before switching the edition. Keep old route and previous snapshot available. Disable a source or batch and switch back to curated feed without losing personal data.

## Out of scope

Movie facts; public/global like counts; social accounts; paid model generation; fabricated fact volume; treating folklore as established science; loading the whole corpus on the phone. Automatic translation is optional future work and never a publication prerequisite.

## Implementation handoff

After review of this design, create a written implementation plan with separately testable migration, language contract, source pilot, quality/dedupe, feed snapshot and rollout tasks. Preserve current installed behaviour until replacement checks pass. Review that plan and select execution method before implementation, per the requested Superpowers workflow.
