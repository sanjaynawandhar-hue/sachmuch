import type { TemplateDef } from '../types';
import { article, labels } from './_sparql';

/**
 * Comparison facts.
 *
 * "Rajasthan has 68.5 million people" is a number. "Rajasthan has about as many
 * people as France" is a fact — it lands because the reader already has a sense
 * of how big France is, and almost certainly did not have one for Rajasthan.
 * The comparison is doing all the work; the raw figure is only what makes it
 * checkable.
 *
 * These score 100% Hindi coverage, because Indian states and world countries are
 * exactly the entities Hindi Wikipedia editors have labelled thoroughly. That
 * makes this family disproportionately valuable to the Hindi feed.
 */

/**
 * Each state is matched to its SINGLE closest country. Without the MIN subquery
 * Punjab matches Australia, North Korea, Yemen, Nepal, Cameroon and Mozambique
 * all at once, and the feed fills with six near-identical cards about Punjab.
 */
function closestMatch(quantityProp: string): string {
  return `
  {
    SELECT ?state (MIN(ABS(?cp2 - ?sp2)) AS ?minDiff) WHERE {
      ?state wdt:P31 wd:Q12443800 ; wdt:${quantityProp} ?sp2 .
      ?c2 wdt:P31 wd:Q3624078 ; wdt:${quantityProp} ?cp2 .
      FILTER(?c2 != wd:Q668)
      FILTER NOT EXISTS { ?c2 wdt:P576 ?gone2 }
    } GROUP BY ?state
  }
  FILTER(ABS(?cp - ?sp) = ?minDiff)`;
}

export const stateVersusCountryPopulation: TemplateDef = {
  id: 'state-vs-country-population',
  significance: 'comparison',
  sourceId: 'wikidata-sparql',
  categoryId: 17,
  subtopics: ['indian-states-and-borders'],
  query: `
SELECT ?state ?stateLabelEn ?stateLabelHi ?sp
       ?country ?countryLabelEn ?countryLabelHi ?cp ?article WHERE {
  ?state wdt:P31 wd:Q12443800 ; wdt:P1082 ?sp .
  ?country wdt:P31 wd:Q3624078 ; wdt:P1082 ?cp .
  FILTER(?country != wd:Q668)
  # Exclude countries that no longer exist, or we compare Bihar to Yugoslavia.
  FILTER NOT EXISTS { ?country wdt:P576 ?dissolved }
  # Within 8% reads as "about the same" without overclaiming.
  FILTER(?cp > ?sp * 0.92 && ?cp < ?sp * 1.08)
  ${closestMatch('P1082')}
  ${labels('state')}
  ${labels('country')}
  ${article('state')}
}`,
  hook: {
    en: [
      '{state} has about as many people as {country}.',
      'There are roughly as many people in {state} as in the whole of {country}.',
      '{state}, with {sp|big} people, is about the size of {country}.',
      'Put {state} on a world map by population and it sits next to {country}.',
    ],
    hi: [
      '{state} की आबादी क़रीब उतनी ही है जितनी पूरे {country} की।',
      '{state} में लगभग उतने लोग रहते हैं जितने पूरे {country} में।',
      '{sp|big} की आबादी वाला {state} आबादी में {country} के बराबर है।',
      'आबादी के हिसाब से {state} को दुनिया के नक़्शे पर रखें तो वह {country} के बराबर बैठता है।',
    ],
  },
  body: {
    en: [
      '{state} has around {sp|big} residents, which puts it level with {country} — a country with its own seat at the UN, its own currency and its own foreign policy. Indian states are routinely described as states, and the word does a lot of quiet work: most of them would rank as substantial countries if they were independent, and a few would rank among the largest on earth.',
      'With roughly {sp|big} people, {state} is populated on the same scale as {country}. It is one of the more useful things to know about India, because the numbers involved stop being meaningful once they pass a certain size. Anchoring a state to a country the reader already has a feel for is the only way the figure lands at all.',
      'The population of {state} — about {sp|big} — matches that of {country} closely enough that the two would sit side by side on any ranked list. Administrative language flattens this: a "state" and a "country" sound like different kinds of thing, while in population terms these two are the same kind of thing.',
      'Around {sp|big} people live in {state}, putting it on a par with {country}. Comparisons like this are worth more than the raw figure, because almost nobody carries an intuition for what sixty or seventy million looks like, while most people have some sense of how large a familiar country is.',
    ],
    hi: [
      '{state} में क़रीब {sp|big} लोग रहते हैं, यानी उतने ही जितने {country} में — एक ऐसा देश जिसकी अपनी मुद्रा है, अपनी विदेश नीति है और संयुक्त राष्ट्र में अपनी सीट है। भारत के राज्यों को हम बस "राज्य" कह देते हैं, मगर इनमें से कई अलग देश होते तो बड़े देशों में गिने जाते।',
      'लगभग {sp|big} की आबादी के साथ {state} उसी पैमाने पर है जिस पर {country} है। भारत को समझने के लिए यह जानना काम का है, क्योंकि एक हद के बाद आँकड़े अपने आप में कुछ नहीं कहते। किसी जाने-पहचाने देश से जोड़कर ही वे समझ में आते हैं।',
      '{state} की आबादी — क़रीब {sp|big} — {country} की आबादी के इतने पास है कि किसी भी सूची में दोनों साथ-साथ आएँगे। सरकारी भाषा इस बात को दबा देती है: "राज्य" और "देश" अलग चीज़ें लगती हैं, जबकि आबादी के लिहाज़ से ये दोनों एक ही तरह की चीज़ हैं।',
      '{state} में क़रीब {sp|big} लोग रहते हैं, यानी {country} के बराबर। ऐसी तुलना अकेले आँकड़े से ज़्यादा काम की है, क्योंकि सात करोड़ कितना होता है इसका अंदाज़ा किसी को नहीं होता, मगर किसी जाने-पहचाने देश का अंदाज़ा सबको होता है।',
    ],
  },
  // Populations move, so the pairing goes stale. A year is generous but honest.
  decays: true,
  validForDays: 365,
  sourceFrom: 'article',
  minRows: 10,
  difficulty: 2,
  requires: ['state', 'country', 'sp', 'article'],
  entityVars: ['state', 'country'],
};

export const stateVersusCountryArea: TemplateDef = {
  id: 'state-vs-country-area',
  significance: 'comparison',
  sourceId: 'wikidata-sparql',
  categoryId: 17,
  subtopics: ['indian-states-and-borders'],
  query: `
SELECT ?state ?stateLabelEn ?stateLabelHi ?sp
       ?country ?countryLabelEn ?countryLabelHi ?cp ?article WHERE {
  ?state wdt:P31 wd:Q12443800 ; wdt:P2046 ?sp .
  ?country wdt:P31 wd:Q3624078 ; wdt:P2046 ?cp .
  FILTER(?country != wd:Q668)
  FILTER NOT EXISTS { ?country wdt:P576 ?dissolved }
  FILTER(?cp > ?sp * 0.92 && ?cp < ?sp * 1.08)
  ${closestMatch('P2046')}
  ${labels('state')}
  ${labels('country')}
  ${article('state')}
}`,
  hook: {
    en: [
      '{state} covers about the same area as {country}.',
      '{state} is roughly the size of {country} on a map.',
      'Lay {state} over {country} and the two nearly match.',
      'In land area, {state} and {country} are close to identical.',
    ],
    hi: [
      '{state} का क्षेत्रफल क़रीब {country} जितना है।',
      'नक़्शे पर {state} लगभग {country} के बराबर है।',
      '{state} को {country} के ऊपर रखें तो दोनों लगभग बराबर बैठते हैं।',
      'ज़मीन के हिसाब से {state} और {country} लगभग बराबर हैं।',
    ],
  },
  body: {
    en: [
      '{state} covers an area close to that of {country}. Maps mislead badly here — India is drawn as a single shape, and the internal divisions read as administrative lines rather than as territories the size of European countries. Several Indian states would rank comfortably among the mid-sized nations of the world if you removed the border around them.',
      'By land area, {state} and {country} are near enough the same. This is one of the harder things to hold in your head about India, because the country is usually shown at a scale where its internal divisions look small, and the eye takes relative size on a map as a guide to absolute size.',
      'Set side by side, {state} and {country} occupy almost the same amount of ground. The comparison is more informative than the figure in square kilometres, since very few people can convert an area in the hundreds of thousands into anything they can picture.',
      'The land area of {state} is close to that of {country}. Comparisons of this kind tend to surprise in one direction only: the Indian state always turns out to be larger than expected, because a subdivision is unconsciously read as a small thing.',
    ],
    hi: [
      '{state} का क्षेत्रफल {country} के क़रीब है। नक़्शे यहाँ धोखा देते हैं — भारत एक ही आकृति की तरह दिखता है और उसके भीतर की लकीरें बस प्रशासनिक बँटवारा लगती हैं, जबकि कई राज्य यूरोप के देशों जितने बड़े हैं।',
      'ज़मीन के हिसाब से {state} और {country} लगभग बराबर हैं। भारत के बारे में यह बात याद रखना मुश्किल है, क्योंकि देश आम तौर पर ऐसे पैमाने पर दिखाया जाता है जहाँ भीतर के हिस्से छोटे लगते हैं और आँख नक़्शे के अनुपात को ही असली आकार मान लेती है।',
      'आमने-सामने रखें तो {state} और {country} लगभग उतनी ही ज़मीन घेरते हैं। वर्ग किलोमीटर के आँकड़े से यह तुलना ज़्यादा बताती है, क्योंकि लाखों वर्ग किलोमीटर को कोई अपने मन में चित्र की तरह नहीं देख पाता।',
      '{state} का क्षेत्रफल {country} के आसपास है। ऐसी तुलनाएँ हमेशा एक ही तरफ़ चौंकाती हैं: भारतीय राज्य उम्मीद से बड़ा निकलता है, क्योंकि "राज्य" शब्द सुनते ही दिमाग़ उसे कुछ छोटा मान लेता है।',
    ],
  },
  decays: false,
  sourceFrom: 'article',
  minRows: 10,
  difficulty: 2,
  requires: ['state', 'country', 'sp', 'article'],
  entityVars: ['state', 'country'],
};
