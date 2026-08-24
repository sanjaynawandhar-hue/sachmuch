# Decisions

Choices that were not obvious, and what they cost.

---

## The connector interface is the framework

`Connector` in `connectors/src/types.ts` is eight fields and three methods. There is deliberately
no plugin registry, no lifecycle hooks, no middleware chain. Adding a source is one file plus one
row in `sources`. Anything more would be scaffolding for an extension story that is already one
file long.

Connectors never import `@sachmuch/db`. The Wikidata connector receives `subtopicQids` as an
injected function, so the taxonomy can move without the connectors knowing.

## Templates are the lower layer, connectors sit above them

`connectors` depends on `@sachmuch/templates`, not the other way round, because `map()` returns
template-rendered drafts. `pipeline` depends on both plus `db`. No cycles.

## Row identity, not sentence text, is what identifies a fact

See LESSONS. `rowKey` is template + every binding; `factHash` is category + rowKey. This is also
why `rowKey` drives deterministic phrasing selection: one row always reads the same way, so
"two variants of the same fact" cannot exist to be deduplicated in the first place.

## Quality is a formula, not a model

`scoreQuality` starts at 0.5 and moves on observable properties: bilingual, entity-linked, https,
readable hook length, decaying. Every input is inspectable and the output is explainable on a
card. No model is trained, run, or paid for anywhere in the pipeline.

## Corroboration replaces AI verification, and is framed honestly

Two independent sources asserting the same claim raises confidence and shows a "2 sources" badge.
The copy says "Sourced from", never "verified by our team". The FactJano-parity "cross-verify by
AI" feature ships as **Find sources** — full-text search across the corpus and the linked pages,
framed as finding sources rather than issuing a verdict. The route and UI are shaped so an AI
version can drop in later without the framing changing.

## Enforcement lives in Postgres where it can

The pipeline runs unattended on a cron. Application code is exactly what gets bypassed at 2am, so
the two non-negotiables are `CHECK` constraints on `facts`:

- `facts_live_needs_source` — a live fact must have an `https?://` source URL and a non-blank publisher.
- `facts_hindi_complete_or_flagged` — a fact is either flagged `hi_missing` or carries a complete
  Hindi hook *and* body. Half-Hindi cannot be represented.

The Hindi feed additionally reads through a partial index that excludes `hi_missing` rows, so it
cannot see them even by accident.

Report auto-hide at three reports, subtopic live counts, entity fact counts and the staleness
sweep are triggers and functions in `migrations/0001_search_and_triggers.sql` for the same reason.

## `pg_trgm`, not `pgvector`

Embeddings would mean running a model. Template output is formulaic, which is precisely the case
where trigram similarity works well. `trigramSimilarity` in the pipeline mirrors `pg_trgm`'s
`similarity()` so in-batch dedupe and in-database dedupe agree on the same 0.85 threshold.

## Dark mode is a separate recipe

Not an inversion. The light-mode inset highlight is `rgba(255,255,255,0.90)`; at that alpha on a
dark ground it reads as a blown-out plastic rim. Dark uses `0.055` white, a `0.55` black shade,
and a 1.15x longer outer cast because the dark ground absorbs more.

## Baloo 2 for display in both scripts

It covers Latin *and* Devanagari in one family, so the English and Hindi cards are the same
product rather than two apps stapled together. Body text splits — Mulish for Latin, Noto Sans
Devanagari for Hindi — and Devanagari gets ~1.25x the leading at the same size, because matras
sit above and below the baseline and collide otherwise.

## Hindi caps at करोड़

`bigNumber` climbs हज़ार → लाख → करोड़ and stops. अरब exists but Indian readers say "800 करोड़",
not "8 अरब". English climbs thousand → million → billion → trillion. Same token, different output,
by language.

## The premium boundary is one function

`hasEntitlement()` in `packages/core/src/entitlements.ts` returns `true` for everything while
`PREMIUM_ENABLED` is `false`. There is no Play Billing, no RevenueCat, no Stripe, no ad SDK in
`package.json`. Audio, offline packs and themes are free today. Shipping premium is a change to
that one function plus a billing integration.

## Listening is free

Device TTS — Web Speech API on web, `expo-speech` on native — costs nothing to run, so gating it
would be a choice rather than a constraint. Where a device has no `hi-IN` voice, the speaker is
disabled on Hindi cards with an explanation, rather than reading Devanagari with an English voice.

## Android ships as a wrapped web app first, native second

The web app is the complete one. `apps/mobile` is still the Phase 0 clay-card demo — no feed, no
swipe, no data — so building it would produce an APK of two hardcoded cards.

So: **Trusted Web Activity now, React Native later.** The deployed PWA is wrapped as a signed APK,
which means the thing on the phone is the thing that already works, and none of it is thrown away
— a native app still wants the same deployed API.

What the wrapper genuinely cannot do, and what therefore waits for the native build:

- **Offline packs.** A service worker can cache a shell; it cannot manage a user-chosen 500-fact
  download with its own storage budget.
- **The home-screen widget.** Android widgets need a native `AppWidgetProvider`.
- **Notifications carrying fact text.** Web push on Android works, but scheduling a local
  notification without a server round trip does not.
- **Device TTS quality.** `expo-speech` exposes voice selection that the Web Speech API does not.

The service worker deliberately does **not** cache API responses. A stale boost count or a cached
feed page is a wrong answer presented as a current one; offline reading is what offline packs are
for, and that is a feature the user opts into rather than a cache they never asked for.

`/.well-known/assetlinks.json` is served from a route rather than a static file so the signing
fingerprint can come from an environment variable. It returns an empty array until
`ANDROID_CERT_FINGERPRINT` is set — an honest "no linked app yet" rather than a placeholder
fingerprint that would fail verification silently and be miserable to diagnose.
