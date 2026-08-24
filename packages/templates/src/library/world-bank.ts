import type { TemplateDef } from '../types';

/**
 * World Bank indicator facts.
 *
 * The shape statistics accounts run on — "India ranks 137th of 217" — from a
 * source that needs no key, costs nothing, and is CC BY. The `query` field is
 * just the indicator code; the connector does the ranking.
 *
 * These are 100% bilingual, because country names come from Wikidata by ISO
 * code and all 196 current countries carry Hindi labels. The only Hindi anyone
 * has to write is the sentence around them, once per indicator.
 *
 * Adding an indicator is one call to `indicator()`. That is the whole extension
 * story for this source.
 */

interface IndicatorSpec {
  /** World Bank indicator code, e.g. SP.DYN.LE00.IN */
  code: string;
  /** Short slug for the template id. */
  slug: string;
  categoryId: number;
  subtopics: string[];
  /** The measure, as it appears mid-sentence. */
  noun: { en: string; hi: string };
  /** How a value reads: "72 years", "60.3%". */
  unit: { en: string; hi: string };
  /** True when the LOW end is the notable one (e.g. infant mortality). */
  ascending?: boolean;
  difficulty?: number;
}

/**
 * India's position, with the leader for scale.
 *
 * A rank on its own is thin — 137th of what, out of how many, and is that
 * close to the top? Carrying the total and the leader's value in the same
 * sentence is what turns a number into something a reader can place.
 */
function indiaRank(spec: IndicatorSpec): TemplateDef {
  return {
    id: `wb-india-${spec.slug}`,
    significance: 'comparison',
    sourceId: 'world-bank',
    categoryId: spec.categoryId,
    subtopics: spec.subtopics,
    query: spec.code,
    params: { angle: 'india', ...(spec.ascending ? { ascending: true } : {}) },
    hook: {
      en: [
        `India ranks {rank|ord} of {total|num} countries for ${spec.noun.en}.`,
        `Out of {total|num} countries, India comes {rank|ord} on ${spec.noun.en}.`,
        `On ${spec.noun.en}, India sits at {rank|ord} in the world.`,
        `India is {rank|ord} of {total|num} for ${spec.noun.en}, at {value|num}${spec.unit.en}.`,
      ],
      hi: [
        `${spec.noun.hi} के मामले में भारत {total|num} देशों में {rank|ord} है।`,
        `{total|num} देशों में भारत ${spec.noun.hi} पर {rank|ordobl} स्थान पर है।`,
        `${spec.noun.hi} में भारत दुनिया में {rank|ordobl} नंबर पर है।`,
        `${spec.noun.hi} में भारत {total|num} में से {rank|ord} है — {value|num}${spec.unit.hi}।`,
      ],
    },
    body: {
      en: [
        `India's figure for ${spec.noun.en} is {value|num}${spec.unit.en}, placing it {rank|ord} among the {total|num} countries the World Bank reports on, in {year|num}. {leader} leads at {leaderValue|num}${spec.unit.en}. A rank is worth more than the raw number here: almost nobody carries a sense of what a good value looks like, and the distance to the top tells you whether the gap is a rounding error or a different world.`,
        `At {value|num}${spec.unit.en} in {year|num}, India stands {rank|ord} of {total|num} on ${spec.noun.en}, with {leader} at the top on {leaderValue|num}${spec.unit.en}. Cross-country comparisons of this kind are the most honest way to read a national statistic, because the same figure can look like progress or failure depending entirely on what it is set against.`,
        `${spec.noun.en.charAt(0).toUpperCase() + spec.noun.en.slice(1)} puts India {rank|ord} of {total|num} countries as of {year|num}, at {value|num}${spec.unit.en} against {leader}'s {leaderValue|num}${spec.unit.en}. The World Bank publishes this openly and updates it annually, so the position is checkable rather than asserted — and it moves, which is the interesting part.`,
        `India records {value|num}${spec.unit.en} for ${spec.noun.en}, {rank|ord} out of {total|num} in {year|num}. {leader} holds first place at {leaderValue|num}${spec.unit.en}. Ranks compress a great deal: a country can improve steadily on the underlying measure and still slide down the table, because everyone else is moving too.`,
      ],
      hi: [
        `${spec.noun.hi} में भारत का आँकड़ा {value|num}${spec.unit.hi} है, जो {year|num} में विश्व बैंक के {total|num} देशों में {rank|ordobl} स्थान है। सबसे आगे {leader} है, {leaderValue|num}${spec.unit.hi} के साथ। यहाँ रैंक अकेले आँकड़े से ज़्यादा बताती है, क्योंकि अच्छा आँकड़ा कितना होता है इसका अंदाज़ा किसी को नहीं होता।`,
        `{year|num} में {value|num}${spec.unit.hi} के साथ भारत ${spec.noun.hi} पर {total|num} देशों में {rank|ord} है, और {leader} {leaderValue|num}${spec.unit.hi} के साथ सबसे ऊपर। देशों की आपसी तुलना ही किसी राष्ट्रीय आँकड़े को पढ़ने का सबसे ईमानदार तरीक़ा है — वही आँकड़ा तरक़्क़ी भी लग सकता है और नाकामी भी।`,
        `${spec.noun.hi} में भारत {year|num} तक {total|num} देशों में {rank|ord} है — {value|num}${spec.unit.hi}, जबकि {leader} का {leaderValue|num}${spec.unit.hi}। विश्व बैंक यह आँकड़ा खुले तौर पर हर साल छापता है, इसलिए यह दावा नहीं, जाँची जा सकने वाली बात है।`,
        `भारत में ${spec.noun.hi} {value|num}${spec.unit.hi} है, यानी {year|num} में {total|num} में से {rank|ord}। पहले नंबर पर {leader} है, {leaderValue|num}${spec.unit.hi} के साथ। रैंक बहुत कुछ छिपा लेती है: कोई देश लगातार सुधरता रहे और फिर भी सूची में नीचे खिसक सकता है, क्योंकि बाक़ी सब भी आगे बढ़ रहे होते हैं।`,
      ],
    },
    // A rank is a current standing and goes out of date every time the data updates.
    decays: true,
    validForDays: 400,
    sourceFrom: 'source',
    minRows: 1,
    difficulty: spec.difficulty ?? 3,
    requires: ['country', 'value', 'rank', 'total', 'year', 'leader', 'leaderValue', 'source'],
    entityVars: ['country', 'leader'],
  };
}

/** The country at the top, which is usually the surprising half. */
function worldLeader(spec: IndicatorSpec): TemplateDef {
  return {
    id: `wb-leader-${spec.slug}`,
    significance: 'superlative',
    sourceId: 'world-bank',
    categoryId: spec.categoryId,
    subtopics: spec.subtopics,
    query: spec.code,
    params: { angle: 'leader', ...(spec.ascending ? { ascending: true } : {}) },
    hook: {
      en: [
        `{country} leads the world on ${spec.noun.en}, at {value|num}${spec.unit.en}.`,
        `No country beats {country} on ${spec.noun.en} — {value|num}${spec.unit.en}.`,
        `{country} tops all {total|num} countries for ${spec.noun.en}.`,
        `First of {total|num} countries on ${spec.noun.en}: {country}, at {value|num}${spec.unit.en}.`,
      ],
      hi: [
        `${spec.noun.hi} में {country} दुनिया में सबसे आगे है — {value|num}${spec.unit.hi}।`,
        `${spec.noun.hi} में {country} को कोई देश नहीं हरा पाया — {value|num}${spec.unit.hi}।`,
        `${spec.noun.hi} में {country} सभी {total|num} देशों से ऊपर है।`,
        `${spec.noun.hi} में {total|num} देशों में पहला: {country}, {value|num}${spec.unit.hi}।`,
      ],
    },
    body: {
      en: [
        `{country} records {value|num}${spec.unit.en} for ${spec.noun.en}, ahead of every one of the {total|num} countries the World Bank tracks, as of {year|num}. The country at the top of a table is rarely the one people guess, and the reason it is there usually says more about that country than the number does.`,
        `As of {year|num}, no country reports a higher figure than {country}'s {value|num}${spec.unit.en} for ${spec.noun.en}, across {total|num} countries. Top positions in World Bank data are often held by very small states, where a national figure behaves more like a city's than a country's.`,
        `{country} sits first of {total|num} on ${spec.noun.en}, at {value|num}${spec.unit.en} in {year|num}. The World Bank publishes and revises this annually, so the leader changes hands more often than a headline suggests, and a table more than a couple of years old is quietly out of date. What stays steadier is the shape of the ranking rather than the name sitting at the top of it, which is the part worth reading.`,
        `On ${spec.noun.en}, {country} leads all {total|num} countries with {value|num}${spec.unit.en}, measured in {year|num}. Reading down from the top of such a table is usually more informative than reading a single country's value, because it shows how tightly the field is bunched together. A leader sitting far clear of second place means something quite different from one separated by a decimal point, and the raw figure alone will never tell you which of those you are looking at.`,
      ],
      hi: [
        `${spec.noun.hi} में {country} का आँकड़ा {value|num}${spec.unit.hi} है, जो {year|num} तक विश्व बैंक के सभी {total|num} देशों में सबसे ऊपर है। सूची में सबसे ऊपर वाला देश आम तौर पर वह नहीं होता जिसका लोग अंदाज़ा लगाते हैं।`,
        `{year|num} तक ${spec.noun.hi} में {country} के {value|num}${spec.unit.hi} से ऊपर कोई देश नहीं है, {total|num} देशों में। ऐसी सूचियों में अक्सर बहुत छोटे देश सबसे ऊपर होते हैं, जहाँ राष्ट्रीय आँकड़ा किसी शहर के आँकड़े जैसा बर्ताव करता है।`,
        `${spec.noun.hi} में {country} {total|num} देशों में पहले स्थान पर है — {year|num} में {value|num}${spec.unit.hi}। विश्व बैंक हर साल इसे छापता और सुधारता है, इसलिए पहला स्थान उतनी बार नहीं टिकता जितना लगता है।`,
        `${spec.noun.hi} में {country} सभी {total|num} देशों से आगे है, {year|num} में {value|num}${spec.unit.hi} के साथ। ऐसी सूची को ऊपर से नीचे पढ़ना किसी एक देश का आँकड़ा देखने से ज़्यादा बताता है।`,
      ],
    },
    decays: true,
    validForDays: 400,
    sourceFrom: 'source',
    minRows: 1,
    difficulty: spec.difficulty ?? 3,
    requires: ['country', 'value', 'total', 'year', 'source'],
    entityVars: ['country'],
  };
}

const INDICATORS: IndicatorSpec[] = [
  /* ── people ── */
  { code: 'SP.DYN.LE00.IN', slug: 'life-expectancy', categoryId: 8,
    subtopics: ['immunisation-programmes', 'nutrition-and-malnutrition'],
    noun: { en: 'life expectancy', hi: 'औसत आयु' }, unit: { en: ' years', hi: ' साल' } },
  { code: 'SP.DYN.TFRT.IN', slug: 'fertility-rate', categoryId: 8,
    subtopics: ['nutrition-and-malnutrition'],
    noun: { en: 'births per woman', hi: 'प्रति महिला बच्चों की संख्या' }, unit: { en: '', hi: '' } },
  { code: 'SP.DYN.IMRT.IN', slug: 'infant-mortality', categoryId: 8,
    subtopics: ['immunisation-programmes'],
    noun: { en: 'infant mortality', hi: 'शिशु मृत्यु दर' },
    unit: { en: ' per 1,000 births', hi: ' प्रति 1,000 जन्म' } },
  { code: 'SH.XPD.CHEX.PC.CD', slug: 'health-spending', categoryId: 8,
    subtopics: ['immunisation-programmes'],
    noun: { en: 'health spending per person', hi: 'प्रति व्यक्ति स्वास्थ्य ख़र्च' },
    unit: { en: ' US dollars', hi: ' डॉलर' } },
  { code: 'SE.ADT.LITR.ZS', slug: 'literacy', categoryId: 22,
    subtopics: ['eighth-schedule-languages'],
    noun: { en: 'adult literacy', hi: 'वयस्क साक्षरता' }, unit: { en: '%', hi: '%' } },

  /* ── places ── */
  { code: 'EN.POP.DNST', slug: 'population-density', categoryId: 17,
    subtopics: ['indian-states-and-borders'],
    noun: { en: 'population density', hi: 'जनसंख्या घनत्व' },
    unit: { en: ' people per sq km', hi: ' लोग प्रति वर्ग किमी' } },
  { code: 'SP.URB.TOTL.IN.ZS', slug: 'urban-share', categoryId: 17,
    subtopics: ['indian-states-and-borders'],
    noun: { en: 'the share of people living in cities', hi: 'शहरों में रहने वालों के हिस्से' },
    unit: { en: '%', hi: '%' } },
  { code: 'AG.SRF.TOTL.K2', slug: 'land-area', categoryId: 17,
    subtopics: ['indian-states-and-borders'],
    noun: { en: 'land area', hi: 'ज़मीन के क्षेत्रफल' },
    unit: { en: ' sq km', hi: ' वर्ग किमी' } },
  { code: 'ST.INT.ARVL', slug: 'tourist-arrivals', categoryId: 17,
    subtopics: ['the-himalayas'],
    noun: { en: 'international tourist arrivals', hi: 'विदेशी सैलानियों की संख्या' },
    unit: { en: ' visitors', hi: ' सैलानी' } },

  /* ── environment ── */
  { code: 'AG.LND.FRST.ZS', slug: 'forest-area', categoryId: 24,
    subtopics: ['western-ghats-biodiversity', 'amazon-rainforest'],
    noun: { en: 'forest cover', hi: 'जंगल के हिस्से' }, unit: { en: '% of land', hi: '% ज़मीन' } },
  { code: 'EG.ELC.ACCS.ZS', slug: 'electricity-access', categoryId: 24,
    subtopics: ['renewable-energy-india'],
    noun: { en: 'access to electricity', hi: 'बिजली की पहुँच' }, unit: { en: '% of people', hi: '% आबादी' } },
  { code: 'EG.FEC.RNEW.ZS', slug: 'renewable-share', categoryId: 24,
    subtopics: ['renewable-energy-india'],
    noun: { en: 'the renewable share of energy use', hi: 'ऊर्जा में नवीकरणीय हिस्से' },
    unit: { en: '%', hi: '%' } },
  { code: 'AG.LND.AGRI.ZS', slug: 'agricultural-land', categoryId: 24,
    subtopics: ['groundwater-and-water-crisis'],
    noun: { en: 'land given over to agriculture', hi: 'खेती की ज़मीन' },
    unit: { en: '% of land', hi: '% ज़मीन' } },
  { code: 'SH.H2O.BASW.ZS', slug: 'water-access', categoryId: 24,
    subtopics: ['groundwater-and-water-crisis'],
    noun: { en: 'access to basic drinking water', hi: 'पीने के पानी की पहुँच' },
    unit: { en: '% of people', hi: '% आबादी' } },

  /* ── economy and technology ── */
  { code: 'NY.GDP.PCAP.CD', slug: 'gdp-per-capita', categoryId: 1,
    subtopics: ['gdp-and-growth'],
    noun: { en: 'income per person', hi: 'प्रति व्यक्ति आय' },
    unit: { en: ' US dollars', hi: ' डॉलर' } },
  { code: 'SL.UEM.TOTL.ZS', slug: 'unemployment', categoryId: 1,
    subtopics: ['gdp-and-growth'],
    noun: { en: 'unemployment', hi: 'बेरोज़गारी' }, unit: { en: '%', hi: '%' } },
  { code: 'MS.MIL.XPND.GD.ZS', slug: 'military-spending', categoryId: 26,
    subtopics: ['fundamental-rights'],
    noun: { en: 'military spending as a share of the economy', hi: 'अर्थव्यवस्था में सैन्य ख़र्च के हिस्से' },
    unit: { en: '% of GDP', hi: '% जीडीपी' } },
  { code: 'IT.CEL.SETS.P2', slug: 'mobile-subscriptions', categoryId: 16,
    subtopics: ['jio-and-cheap-mobile-data'],
    noun: { en: 'mobile subscriptions per 100 people', hi: 'प्रति 100 लोगों पर मोबाइल कनेक्शन' },
    unit: { en: '', hi: '' } },
  { code: 'IT.NET.USER.ZS', slug: 'internet-users', categoryId: 16,
    subtopics: ['jio-and-cheap-mobile-data', 'undersea-internet-cables'],
    noun: { en: 'the share of people online', hi: 'इंटरनेट इस्तेमाल करने वालों के हिस्से' },
    unit: { en: '%', hi: '%' } },
  { code: 'IS.AIR.PSGR', slug: 'air-passengers', categoryId: 25,
    subtopics: ['indian-railways-engineering'],
    noun: { en: 'air passengers carried', hi: 'हवाई यात्रियों की संख्या' },
    unit: { en: ' passengers', hi: ' यात्री' } },
];

export const WORLD_BANK_TEMPLATES: TemplateDef[] = INDICATORS.flatMap((spec) => [
  indiaRank(spec),
  worldLeader(spec),
]);
