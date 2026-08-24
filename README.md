# Sachmuch — सचमुच

A bilingual (English + Hindi) facts app for an Indian audience. Swipeable clay cards, a real
microlearning layer underneath, and a content engine that grows without manual writing.

**सचमुच** is the sound a person makes at the moment they learn something surprising. That is the
emotional beat the whole app is built around, and it is the brand voice — surprised, warm, never
smug. Never written "Such Much"; that reads as English and loses the word.

## The three things that decide whether this lives

1. **The facts are worth knowing.** A row is not a fact. "X won an award in 1955" is true and
   worthless — somebody wins every year. Every template must declare a `significance`
   (`superlative | record | first | only | extreme | comparison | aggregate`) and validation
   rejects one that cannot. In practice that means SPARQL with `GROUP BY` / `HAVING`, not
   row-level `SELECT`: "A. R. Rahman won 29 Filmfare Awards, 1993 to 2014", never "won one in
   1993".
2. **The feed never runs out.** A connector registry pulls from open data on a schedule,
   normalises it, renders it into natural English *and* Hindi through templates, and stores it.
   Adding a source is one file and one database row.
3. **The facts are true.** Every live fact carries a resolvable source URL and a named publisher,
   enforced by a Postgres `CHECK` constraint rather than by application code.

## The feed

One stream. No category tabs — every card is drawn from the whole corpus by
`buildFeed` in `packages/core/src/engagement.ts`, weighted by what the reader has actually
engaged with. Dwell time and likes update a per-category affinity that persists locally; a fixed
28% of cards are still chosen at random so the feed cannot narrow to two topics, and no more than
two cards in a row come from one category however strong the preference.

Swipe either axis to advance. Every gesture has a visible button equivalent.

## Running cost

The free tiers of Supabase and Vercel, plus a domain. That is the whole bill.

No LLM calls at build time, run time, or in the pipeline. No Anthropic, OpenAI or translation SDK
in `package.json` — if one appears, that is a bug. No billing SDK and no ad SDK.

## Layout

```
apps/web/         Next.js 16 App Router — PWA, Vercel
apps/mobile/      Expo (React Native) — Android first
packages/core/    feed ranking, coin rules, streak math, SRS, i18n strings
packages/ui/      clay design tokens and primitives, web and native
packages/db/      Drizzle schema, migrations, taxonomy, seeds
packages/templates/  the bilingual fact template library
connectors/       one file per source, one shared interface
pipeline/         orchestrator, scheduler, quality gate, dedupe
docs/             DECISIONS.md, SOURCES.md, LESSONS.md
```

Dependencies run one way: `templates` ← `connectors` ← `pipeline`. Connectors never import `db`;
the taxonomy reaches them as an injected function.

## Getting started

```bash
pnpm install
pnpm -r test          # 100 tests across five packages
pnpm -r typecheck
pnpm web              # the clay card at http://localhost:3000
```

### With a database

Everything above runs without one. These need `DATABASE_URL` pointed at Supabase Postgres
(Project settings → Database → Connection string → URI):

```bash
pnpm --filter @sachmuch/db push      # apply migrations/0000 and 0001
pnpm --filter @sachmuch/db seed      # 29 categories, 1,038 subtopics, 14 sources
pnpm --filter @sachmuch/pipeline start
```

`migrations/0001_search_and_triggers.sql` is hand-written and must be applied after the generated
one — it carries `pg_trgm`, the full-text triggers, report auto-hide, and the staleness sweep.

### Without a database

```bash
pnpm --filter @sachmuch/pipeline exec tsx src/dry-run.ts --pages 1
```

Runs discover → fetch → map → quality gate → dedupe against live sources and writes a JSON
report: rows, drafts, gate pass rate, and Hindi coverage **per subtopic**, which is the number
that decides whether a query needs changing.

## Taxonomy

29 categories × 25–40 subtopics = 1,038 subtopics. The subtopic is the ingestion unit: "Cricket"
produces slop, "Bodyline series 1932-33" produces facts.

994 subtopics carry a Wikidata QID that was **resolved by lookup and verified**, never written
from memory — see `docs/LESSONS.md` for why that distinction cost a rewrite. Three scripts
maintain it:

```bash
pnpm --filter @sachmuch/db exec tsx scripts/validate-qids.ts   # does it exist, does it match
pnpm --filter @sachmuch/db exec tsx scripts/fix-qids.ts --write   # resolve by search
pnpm --filter @sachmuch/db exec tsx scripts/audit-qids.ts --write # drop the indefensible
```

## Ingestion

GitHub Actions cron, not Vercel — these are long jobs and Actions is free for a public repo.
`.github/workflows/ingest.yml` runs nightly at 02:30 IST and writes straight to Supabase.

Jobs are claimed from a Postgres table with `FOR UPDATE SKIP LOCKED`, so several runners can
share the queue with no Redis and no queue service. A 429 or a 5xx pauses that source for the
rest of the run and nothing else. Three consecutive failures mark a source degraded.

## Premium

Not built. `hasEntitlement()` in `packages/core/src/entitlements.ts` returns `true` for
everything while `PREMIUM_ENABLED` is `false`, so audio, offline packs and themes are free and
there are no ads. Shipping premium is a change to that one function plus a billing integration.
