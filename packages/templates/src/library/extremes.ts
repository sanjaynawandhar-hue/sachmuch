import type { Significance, TemplateDef } from '../types';
import { article, labels } from './_sparql';

/**
 * Ranked extremes.
 *
 * "Kangchenjunga is 8,586 m high" is a measurement; "Kangchenjunga is the
 * third-highest mountain on earth" is a fact. The connector computes the
 * position over the full result set and emits only the top N, because page two
 * of a ranked list is by definition not notable.
 *
 * TWO CORRECTNESS RULES, both learned by shipping their violation into a dry run:
 *
 * 1. CONSTRAIN THE UNIT. Wikidata quantities carry units and `wdt:` discards
 *    them. Building heights come in metres, feet, centimetres, millimetres,
 *    inches and shaku; ranking the raw numbers put a small chapel measured in
 *    centimetres at the top of the world's tallest buildings at "15,260 m".
 *    Every spec names the unit it will accept and the query filters on it.
 *
 * 2. CONSTRAIN THE PLACE. Wikidata classes span the solar system. An unfiltered
 *    query for the highest mountains returns Ascraeus Mons on Mars at 18,225 m,
 *    ahead of Everest. `earthOnly` requires a P17 country, which is the cheapest
 *    reliable test for "is this on this planet".
 *
 * Hindi phrases are written pre-inflected in the spec rather than composed at
 * render time. Composing "सबसे बड़े" with a noun and an ordinal produced
 * "दुनिया का पहले सबसे बड़े चंद्रमा है", which is three agreement errors in one
 * clause. A phrase an author wrote once cannot drift.
 */

interface ExtremeSpec {
  slug: string;
  categoryId: number;
  subtopics: string[];
  classQid: string;
  property: string;
  /**
   * Accepted units, with the multiplier that converts each to the display unit.
   *
   * Accepting exactly one unit is too strict: Ganymede's diameter is recorded in
   * metres, so a kilometres-only filter silently dropped the largest moon in the
   * solar system and crowned Callisto. Converting is right; ignoring the unit is
   * what produced a chapel at 15,260 m.
   */
  units: { qid: string; multiplier: number }[];
  /** Require a P17 country, which excludes everything off Earth. */
  earthOnly?: boolean;
  /** Require an opening date, which excludes proposals and unbuilt designs. */
  stillStanding?: boolean;
  /** Drop items with an end date. Costly, so only where things actually cease. */
  excludeCeased?: boolean;
  /**
   * Match the class directly instead of walking subclasses. The subclass walk on
   * a broad class like "mountain" is expensive enough to hit the 60-second
   * endpoint timeout, and for a class that is already specific it adds nothing.
   */
  directClass?: boolean;
  extraFilter?: string;
  /** "highest mountains" / "सबसे ऊँचे पहाड़ों" — already plural and inflected. */
  plural: { en: string; hi: string };
  /** How the value reads after the number. */
  unit: { en: string; hi: string };
  /** "in the world" / "in the solar system", so moons are not "on earth". */
  domain: { en: string; hi: string };
  ascending?: boolean;
  top?: number;
  difficulty?: number;
  significance?: Significance;
}

function extreme(spec: ExtremeSpec): TemplateDef {
  return {
    id: `top-${spec.slug}`,
    significance: spec.significance ?? 'superlative',
    sourceId: 'wikidata-sparql',
    categoryId: spec.categoryId,
    subtopics: spec.subtopics,
    params: { rankBy: 'v', top: spec.top ?? 12, ...(spec.ascending ? { ascending: true } : {}) },
    query: `
# DISTINCT and ORDER BY are both load-bearing.
#
# The unit VALUES clause multiplies rows, and an item with several recorded
# measurements multiplies them again — one desert came back 500 times. Without
# ORDER BY, the connector's LIMIT then takes an arbitrary slice of that, so the
# Sahara simply was not in the window when the "largest deserts" were ranked.
SELECT DISTINCT ?item ?itemLabelEn ?itemLabelHi ?v ?article WHERE {
  ?item ${spec.directClass ? 'wdt:P31' : 'wdt:P31/wdt:P279*'} wd:${spec.classQid} .
  # The unit-qualified form: wdt: hands back a bare number and loses the unit.
  VALUES (?unit ?unitMultiplier) { ${spec.units.map((u) => `(wd:${u.qid} ${u.multiplier})`).join(' ')} }
  ?item p:${spec.property}/psv:${spec.property} ?valueNode .
  ?valueNode wikibase:quantityAmount ?rawValue ; wikibase:quantityUnit ?unit .
  BIND(?rawValue * ?unitMultiplier AS ?v)
  ${spec.earthOnly ? '?item wdt:P17 ?country .' : ''}
  ${spec.excludeCeased ? `# Exclude what no longer exists — without this a drained prehistoric lake
  # outranks the Caspian Sea. Opt-in because NOT EXISTS over a large set is
  # expensive enough to hit the endpoint timeout, and mountains do not cease.
  FILTER NOT EXISTS { ?item wdt:P576 ?ceased }` : ''}
  ${spec.stillStanding ? `# And what was never built: X-Seed 4000 is a 4,000 m proposal from 1995 that
  # topped the tallest-buildings list on the strength of a drawing.
  ?item wdt:P1619 ?opened .` : ''}
  ${spec.extraFilter ?? ''}
  ${labels('item')}
  ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> .
}
ORDER BY ${spec.ascending ? 'ASC' : 'DESC'}(?v)`,
    hook: {
      en: [
        `{item} ranks {rank|ord} among the ${spec.plural.en} ${spec.domain.en}, at {v|num}${spec.unit.en}.`,
        `At {v|num}${spec.unit.en}, {item} ranks {rank|ord} among the ${spec.plural.en} ${spec.domain.en}.`,
        `{item} comes {rank|ord} on the list of the ${spec.plural.en} ${spec.domain.en}.`,
        `Of all the ${spec.plural.en} ${spec.domain.en}, {item} is {rank|ord} — {v|num}${spec.unit.en}.`,
      ],
      hi: [
        `${spec.domain.hi} ${spec.plural.hi} में {item} {rank|ord} है — {v|num}${spec.unit.hi}।`,
        `{v|num}${spec.unit.hi} के साथ {item} ${spec.domain.hi} ${spec.plural.hi} में {rank|ord} आता है।`,
        `${spec.domain.hi} ${spec.plural.hi} की सूची में {item} {rank|ordobl} नंबर पर है।`,
        `{item} ${spec.domain.hi} ${spec.plural.hi} में {rank|ordobl} स्थान पर है, {v|num}${spec.unit.hi} के साथ।`,
      ],
    },
    body: {
      en: [
        `{item} measures {v|num}${spec.unit.en}, placing it {rank|ord} among the ${spec.plural.en} ${spec.domain.en} — out of {total|num} with a published figure in the same unit. A ranking says more than the measurement alone, because very few people carry a sense of what a large value looks like for this kind of thing until they can see where it falls against everything else of its type.`,
        `Ranked {rank|ord} at {v|num}${spec.unit.en}, {item} sits near the top of a list of {total|num}. What a position really tells you is how crowded the top of that list is: the gap between first and tenth is sometimes enormous and sometimes almost nothing, and a rank on its own will never say which of those you are looking at.`,
        `With {v|num}${spec.unit.en} to its name, {item} is {rank|ord} of the ${spec.plural.en} ${spec.domain.en}. Lists like this move as measurement improves rather than as the world changes, which is worth holding onto — a name can slip several places without anything physical having happened to it at all.`,
        `{item} records {v|num}${spec.unit.en} and holds {rank|ord} place out of {total|num} measured. Superlatives are the most repeated and least examined kind of fact, so the interesting part is rarely the top of the list; it is the names a few places down that nobody expects to find there.`,
      ],
      hi: [
        `{item} का माप {v|num}${spec.unit.hi} है, जो इसे ${spec.domain.hi} ${spec.plural.hi} में {rank|ordobl} नंबर पर रखता है — कुल {total|num} में से, जिनका आँकड़ा एक ही इकाई में दर्ज है। अकेला माप कुछ नहीं बताता; बाक़ी के मुक़ाबले रखने पर ही पता चलता है कि यह बड़ा है या मामूली।`,
        `{v|num}${spec.unit.hi} के साथ {item} {total|num} की सूची में {rank|ord} है। ऐसी जगह से यह भी पता चलता है कि सूची का ऊपरी हिस्सा कितना भीड़भाड़ वाला है — कभी पहले और दसवें में ज़मीन-आसमान का फ़र्क़ होता है, कभी बाल बराबर।`,
        `{v|num}${spec.unit.hi} के आँकड़े के साथ {item} ${spec.domain.hi} ${spec.plural.hi} में {rank|ordobl} है। ऐसी सूचियाँ दुनिया बदलने से नहीं, माप बेहतर होने से बदलती हैं — कोई नाम बिना कुछ हुए ही कई पायदान नीचे खिसक सकता है।`,
        `{item} का आँकड़ा {v|num}${spec.unit.hi} है और यह {total|num} मापे गए में से {rank|ordobl} स्थान पर है। "सबसे बड़ा" वाली बातें सबसे ज़्यादा दोहराई जाती हैं और सबसे कम जाँची जाती हैं; असल दिलचस्पी पहले नंबर में नहीं, उसके नीचे की क़तार में होती है।`,
      ],
    },
    decays: true,
    validForDays: 540,
    sourceFrom: 'article',
    minRows: 5,
    difficulty: spec.difficulty ?? 3,
    requires: ['item', 'v', 'rank', 'total', 'article'],
    entityVars: ['item'],
  };
}

/* Accepted units per dimension, normalised to the display unit. */
const METRES = [{ qid: 'Q11573', multiplier: 1 }, { qid: 'Q828224', multiplier: 1000 }];
const KILOMETRES = [{ qid: 'Q828224', multiplier: 1 }, { qid: 'Q11573', multiplier: 0.001 }];
const SQ_KILOMETRES = [
  { qid: 'Q712226', multiplier: 1 },        // square kilometre
  { qid: 'Q25343', multiplier: 0.000001 },  // square metre
  { qid: 'Q35852', multiplier: 0.01 },      // hectare
];

  /*
   * WITHDRAWN — moons-by-size and lakes-by-area.
   *
   * moons: Ganymede, the largest moon in the solar system, does not carry a
   *   P2386 diameter in metres or kilometres, so the query crowns Callisto.
   *   A "largest moons" list without Ganymede at the top is simply wrong.
   * lakes: Lake Agassiz drained roughly 8,000 years ago and has no P576 end
   *   date, so the existence filter does not catch it and it outranks the
   *   Caspian Sea. Needs a "currently exists" test that actually works.
   *
   * Both are left here rather than deleted: the queries are right in shape and
   * the problem is a data gap, which may close.
   */
const WITHDRAWN: ExtremeSpec[] = [
  { slug: 'moons-by-size', categoryId: 13,
    subtopics: ['jupiter-and-galilean-moons', 'saturn-and-its-rings'],
    classQid: 'Q2537', property: 'P2386', units: KILOMETRES,
    plural: { en: 'largest moons', hi: 'सबसे बड़े चंद्रमाओं' },
    domain: { en: 'in the solar system', hi: 'सौरमंडल के' },
    unit: { en: ' km across', hi: ' किमी चौड़ा' }, difficulty: 3 },

];

const VERIFIED: ExtremeSpec[] = [
  { slug: 'mountains-by-height', categoryId: 17,
    subtopics: ['mount-everest', 'the-himalayas'],
    classQid: 'Q8502', property: 'P2044', units: METRES, earthOnly: true, directClass: true,
    extraFilter: 'FILTER(?v > 7200)',
    plural: { en: 'highest mountains', hi: 'सबसे ऊँचे पहाड़ों' },
    domain: { en: 'on earth', hi: 'धरती के' },
    unit: { en: ' m', hi: ' मीटर' }, difficulty: 2 },

  { slug: 'deserts-by-area', categoryId: 17, subtopics: ['the-thar-desert'],
    classQid: 'Q8514', property: 'P2046', units: SQ_KILOMETRES, earthOnly: true, excludeCeased: true,
    plural: { en: 'largest deserts', hi: 'सबसे बड़े रेगिस्तानों' },
    domain: { en: 'on earth', hi: 'धरती के' },
    unit: { en: ' sq km', hi: ' वर्ग किमी' }, difficulty: 2 },

  { slug: 'buildings-by-height', categoryId: 25,
    subtopics: ['indian-railways-engineering'],
    classQid: 'Q41176', property: 'P2048', units: METRES, earthOnly: true, stillStanding: true,
    extraFilter: 'FILTER(?v > 300)',
    plural: { en: 'tallest buildings', hi: 'सबसे ऊँची इमारतों' },
    domain: { en: 'in the world', hi: 'दुनिया की' },
    unit: { en: ' m', hi: ' मीटर' }, difficulty: 2 },
];

/** Only what has been checked against reality is registered. */
export const EXTREME_TEMPLATES: TemplateDef[] = VERIFIED.map(extreme);

/** Kept visible so the gap is a known issue rather than a silent omission. */
export const WITHDRAWN_EXTREMES = WITHDRAWN.map((s) => s.slug);
