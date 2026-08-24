# Lessons

One entry per lesson, newest first. Corrections, confirmed approaches, and why each mattered.
Not a changelog — git already has that.

---

## TMDB is intermittently blocked by Indian ISPs — retry, do not re-key

Roughly two out of three HTTPS requests to `api.themoviedb.org` from a Jio connection die with a
TLS reset (`ECONNRESET`, curl exit 35) partway through the handshake. The third succeeds normally.
Wikidata and Wikipedia on the same connection are unaffected, so it is domain-specific filtering
rather than a general network fault.

Why this matters more than it sounds: the failure looks exactly like a bad credential. The
temptation is to regenerate the token, which changes nothing and costs an afternoon. Retrying with
the SAME token got a 200 on the first attempt of the next run.

Notes for whoever hits this next:
- `politeFetch` already retries network failures with backoff, so the connector copes. It is just
  slower locally than the request count suggests.
- Happy Eyeballs does not save us: the TCP connect succeeds and the reset happens during TLS, by
  which point the address family is already chosen. Forcing `ipv6first` did not help either.
- **GitHub Actions is unaffected.** Runners sit in US/EU datacentres with no such filtering, so
  production ingestion is fine. This is a local-development annoyance, not a deployment risk.
- Verify a TMDB credential with a short retry loop, never a single request, or you will conclude a
  working token is broken.

---

## A superlative query over an unconstrained class produces confident lies

Ranked "top N" facts are the most repeated shape in popular facts content and the
easiest to get catastrophically wrong. A first cut of the extremes template family shipped, in one
dry run:

- "Ascraeus Mons ranks 1st among the world's highest mountains" — Ascraeus Mons is on **Mars**
- "Ribbon Chapel is the tallest building in the world at 15,260 m" — a small chapel, measured in **centimetres**
- "Lake Agassiz is the largest lake on earth" — it **drained about 8,000 years ago**
- "X-Seed 4000 is the tallest building" — a 1995 **proposal that was never built**
- "Callisto is the largest moon" — Ganymede is, but its diameter is filed in metres and a
  kilometres-only filter dropped it
- "Lake Malawi is the largest lake" — the query returned 500 duplicate rows of one item, so the
  real leaders were never in the window

Every one is fluent, sourced, and wrong. Five distinct causes, all of which any ranked query over
Wikidata has to handle:

1. **Units are not optional.** `wdt:P2048` returns a bare number. Building heights are filed in
   metres, feet, centimetres, millimetres, inches, storeys and *shaku*. Use the unit-qualified
   form — `p:P/psv:P` with `wikibase:quantityUnit` — and CONVERT rather than filtering to a single
   unit, or you silently drop correct entries filed in the other one.
2. **Classes span the solar system.** "Mountain" includes Martian mountains. Requiring a P17
   country is the cheapest reliable "is this on Earth" test.
3. **Things that stopped existing stay in the data.** Prehistoric lakes have no end date.
4. **Things that were never built are in there too.** Requiring an opening date (P1619) excludes
   proposals.
5. **DISTINCT and ORDER BY are load-bearing, not tidiness.** A unit VALUES clause multiplies rows
   and multiple recorded measurements multiply them again; without ORDER BY, the connector's LIMIT
   takes an arbitrary slice of the duplicates and ranks *that*.

Also: `wdt:P31/wdt:P279*` on a broad class times out at the 60-second endpoint limit. A direct
`wdt:P31` match is both faster and, for an already-specific class, equivalent.

**What this cost, and the rule that comes out of it:** every ranked template must be checked
against reality before it is registered — does the list actually start with Everest, the Sahara,
the Burj Khalifa? Three specs passed and are live; two (moons, lakes) are withdrawn in the source
with the reason written down, because a "largest moons" list without Ganymede at the top is worse
than no list at all.

---

## Hindi ordinals inflect for case AND gender

Beyond the oblique/direct distinction already recorded, the ordinal agrees with the noun's gender:
चौथा (masculine), चौथी (feminine), चौथे (masculine oblique or plural). "चौथे जगह" is wrong twice —
जगह is feminine, and it is not a postposition slot. Rephrasing onto a masculine noun (नंबर) avoided
it; a full feminine ordinal set is still missing from `format.ts` and will be needed.

The general trap: a Hindi ordinal is correct only relative to what follows it, so the same
`{rank|ord}` token cannot be dropped into arbitrary sentence positions. Before a postposition
(में, पर, से) use `ordobl`; before the verb है use `ord`.

---

## A row is not a fact

The first template library produced statements like "Meena Kumari won the Filmfare Award for Best
Actress in 1955." True, sourced, bilingual — and worthless. Somebody wins that award every single
year, so the sentence carries no information beyond a name and a date. It cannot earn the reaction
the app is named for.

What is worth knowing is the DISTINGUISHED thing: the count, the extreme, the first, the only, the
margin. Rewritten as a career aggregate, the same source data gives "A. R. Rahman won 29 Filmfare
Awards, from 1993 to 2014" — an aggregate no single ceremony reveals, and one you would have to
read every year's results to notice yourself.

This is now enforced, not just recommended. `TemplateDef.significance` is required and must be one
of `superlative | record | first | only | extreme | comparison | aggregate`, `validateTemplate`
rejects a template without one, and a significance describing a current standing must also declare
`decays`. Mechanically it means SPARQL with `GROUP BY` / `HAVING` / `ORDER BY` rather than
row-level `SELECT` — the `HAVING` threshold is what does the work, because below it a win is just
a row again.

Yield drops sharply and that is the point: the Filmfare aggregate returns 17 rows where the
row-level version returned 1,056. Seventeen facts people will remember beat a thousand they will
swipe past.

---

## Anything a later event in the same interaction reads must live in a ref

This bit twice in one session, in two different components, and both times the symptom was
"the feature silently does nothing" rather than an error.

1. The swipe read `drag.axis` in pointerup — the value from the last RENDER. React batches, so a
   quick gesture dispatches every move and the release before a re-render lands. The axis was
   still null at release, so vertical swipes fell through to the horizontal branch.
2. The feed read `queue[pos]` in its advance handler. Two taps of "next" inside one frame both ran
   against the same stale `pos`, so both dwell signals were attributed to the same card and the
   one in between was never recorded at all.

State drives rendering; refs drive bookkeeping. Position, queue, gesture axis, and the liked/saved
maps are all mirrored into refs and written synchronously.

Related: `setPointerCapture` goes on the container, not `e.target` — the card under the finger is
swapped out as the feed advances — and is wrapped in try/catch, because it throws `NotFoundError`
if the pointer is already gone and React surfaces that as an uncaught error.

Testing note: driving any of this with synthetic events needs a real tick between the action and
reading the DOM. Without one you measure the pre-render state and conclude a working feature is
broken. It also matters WHICH node you target — the feed renders previous/current/next, so
`querySelector('article')` grabs the previous card, not the visible one.

---

## A gesture's axis lock has to live in a ref, not in React state

The 2D swipe read `drag.axis` inside the pointerup handler to decide whether the gesture was
horizontal or vertical. That value comes from the last RENDER, and React batches — a quick swipe
can dispatch every pointermove and the pointerup before a single re-render lands. The axis was
still `null` at release, so vertical swipes fell through to the horizontal branch and rail
changes silently did nothing. Horizontal appeared to work, but only by accident.

The gesture now lives in the ref (which updates synchronously) and state only drives the visual
offset. Rule of thumb: anything a later event in the SAME gesture needs to read must be in a ref.

Two related fixes in the same component:
- `setPointerCapture` is called on the container, not on `e.target` — the card under the finger
  is swapped out as the feed advances, and a capture held by an unmounted node is lost mid-swipe.
- It is wrapped in try/catch, because it throws `NotFoundError` if the pointer is already gone
  and React surfaces that as an uncaught error rather than swallowing it.

Testing note: driving this from synthetic `PointerEvent`s needs a real tick between dispatching
the gesture and reading the DOM, or you measure the pre-render state and conclude the feature is
broken when it is not.

---

## Hindi coverage is a property of the SUBTOPIC, not of the template

The first template, `award-received`, was measured at 100% Hindi coverage on a Filmfare-only run
and 3% once it was scoped across four award ceremonies. Nothing about the template changed.

Per-subtopic, on a single page each:

| subtopic | drafts | Hindi |
|---|---|---|
| filmfare-awards | 10 | 90% |
| national-film-awards | 32 | 34% |
| emmy-awards | 439 | 2% |
| academy-awards | 475 | 0% |

Wikidata simply has Hindi labels for Indian cinema and not for American television categories.
No query change fixes that, and no translation service is going to be bought to paper over it.

Two consequences worth holding onto:

1. **A template-level Hindi average is a useless number.** `dry-run.ts` reports coverage per
   subtopic, because that is the level at which the decision — narrow the query, or accept an
   English-only subtopic — actually gets made.
2. **The route to a large Hindi feed is Indian subtopics, not more templates.** The English feed
   scales with template count; the Hindi feed scales with how much of the taxonomy is anchored in
   entities that Indian editors have labelled. That is a content-strategy finding, not an
   engineering one, and it points the same way the product does.

---

## Reach through a ceremony to its categories, or the sentence names the wrong thing

Scoping the award template to the Filmfare Awards QID produced "won the Filmfare Awards" — the
umbrella ceremony, not the award. Walking down the hierarchy fixed the sentence and multiplied the
yield.

But walking only P361 (part of) and P279 (subclass of) returned ZERO rows against a QID that was
perfectly correct. Wikidata attaches a Filmfare category to the ceremony with P31 (instance of),
not either of those. Other hierarchies use the other two. There is no consistent relation.

`inGroup()` in `library/_sparql.ts` walks all three — `(wdt:P31|wdt:P361|wdt:P279)*` — and the `*`
covers the zero-length case so scoping directly to a specific award still matches it. Any template
scoping to a container (a ceremony, a franchise, a taxon, a dynasty) must use it. A single-relation
path fails silently, which is the worst way for a query to be wrong.

---

## Open issue: Wikidata's English label for an Indian film is sometimes a translation

A dry run produced "In 2006, Ram Gopal Varma released Fear is necessary." The film is
*Darna Zaroori Hai*; "Fear is necessary" is Wikidata's English label, which some editor entered
as a translation of the title rather than the title itself. The Hindi side is correct.

Not yet fixed. The likely fix is to prefer P1476 (title) over `rdfs:label` for creative works,
falling back to the label only when P1476 is absent, and possibly to prefer a label that matches
a transliteration of the native title. Worth doing before the film templates scale up, because
every Indian film template inherits the defect.

Related and already fixed: Wikidata labels also carry parenthetical disambiguators
("Darna Zaroori Hai (2006 film)"), which reached a card as "डरना जरूरी है (2006 फ़िल्म) बनाई".
`stripDisambiguator` in the binding mapper removes them and a gate rule
(`structural.disambiguator_leak`) stops a future connector reintroducing them.

---

## Never write a Wikidata QID from memory. Resolve it.

A first pass wrote QIDs by hand across the taxonomy. Validating all 449 of them against the
live API found 5 that did not exist and roughly 100 pointing at the wrong entity: Pavlov at a
German village, Magna Carta at a star, UPI at a railway station, mutual funds at a snowboarding
event. The hand-written finance category — written most carefully, by hand — was the worst of
the lot at 24 wrong out of 30.

This failure is silent. A scoped SPARQL template with a wrong anchor returns zero rows, or rows
about something else, and neither shows up as an error. It surfaces months later as "that
subtopic is thin".

The fix is three scripts in `packages/db/scripts/`, run in order:
`validate-qids` (does it exist and roughly match), `fix-qids` (resolve by search, keep only
strong matches), `audit-qids` (drop anchors not defensible on their face). Final state: 994
verified anchors across 1,038 subtopics, zero dead.

**Corollary that matters more than the fix:** having no QID is a fine outcome. A subtopic without
one simply skips scoped templates and still drives the keyword connectors. Fewer correct anchors
beat more wrong ones, every time.

---

## Contrast on claymorphism has to be solved numerically, not tuned by eye.

A hand-tuned perceptual-lightness curve produced 28 category tints that passed WCAG and one that
did not — a yellow at 2.55:1. The curve can be adjusted until that hue passes, at which point a
different hue fails.

`categoryTint` now binary-searches the HSL lightness until the actual WCAG contrast ratio clears
the target. The ratio is the input, not the thing you hope falls out. All 29 tints pass in both
schemes, asserted in `packages/ui/test/tokens.test.ts`, and adding a 30th category cannot
silently break one.

---

## React Native reproduces the clay exactly — this is not an approximation.

The design brief flagged this as a day-one risk: RN historically had no `inset` box-shadow, and
if the clay could not be reproduced natively the whole design direction had to change.

It can. React Native 0.76+ on the New Architecture implements the `boxShadow` style prop
including `inset`, with the same four-layer model as CSS. Expo SDK 57 ships RN 0.87, so both
platforms render from one function, `clayNative()` and `clayShadow()` in
`packages/ui/src/tokens/clay.ts`, over the same numbers.

`ClayView.native.tsx` keeps a legacy fallback (outer `elevation` only, no puff) for the old
architecture. It is a degradation, not a design.

---

## JavaScript's `\b` never matches at a Devanagari boundary.

The Hindi patterns in the editorial blocklist were written with `\b` anchors copied from the
English ones, and matched nothing at all — including a deliberately communal test string. `\b`
is defined on ASCII `\w`, so at a Devanagari character there is no word boundary to find.

Hindi patterns in `pipeline/src/gate/blocklist.ts` carry no word anchors. Any future rule written
for Devanagari must be tested against a string that should match, not just one that should not.

---

## Dedupe on row identity, not on the sentence.

The first duplicate hash normalised the English hook. That is wrong in both directions. Sorting
the words so phrasing variants collide would also merge "India beat Australia" with "Australia
beat India". Not sorting them means the same row re-ingested after a template edit reads as a
brand new fact.

`factHash` keys on `categoryId` plus `rowKey`, and `rowKey` identifies the row exactly — template
plus every binding, not just the entity QIDs. Two award years for the same person were collapsing
into one key until the bindings were included. Claims that two different templates reached
independently are caught by the trigram layer, which is what that layer is for.

---

## Bind Wikidata labels per language. Do not use the label service's fallback.

`SERVICE wikibase:label` with `"en,hi"` hands back the English label under the Hindi variable
name when no Hindi label exists. That is machine-mangled Hindi by another route, and it is
invisible — the query succeeds and the row looks complete.

Every template query binds `?xLabelEn` and `?xLabelHi` separately with an explicit `FILTER(LANG(...))`,
Hindi in an `OPTIONAL`. That is what lets the pipeline *know* Hindi is missing instead of guessing.
Confirmed working against live data: a Filmfare probe returned Hindi labels for both the person
and the film, plus P21 for gender agreement.

---

## Refuse to guess Hindi gender. Serve English instead.

Hindi verb and adjective agreement needs the subject's gender, taken from Wikidata P21. When P21
is absent or non-binary, Hindi has no common neutral verb form, and defaulting to masculine
misgenders a real person on a card built to be shared.

The renderer throws on `unknown_gender`, the Hindi side is withheld, and the fact serves
English-only flagged `hi_missing`. A smaller, correct Hindi feed beats a larger, broken one.
