import type { TemplateDef } from '../types';
import { article, gender, inGroup, labels, SCOPE } from './_sparql';

/**
 * Awards, as a CAREER TOTAL rather than a single win.
 *
 * The row-level version of this template ("won the Filmfare Award in 1955") was
 * cut because somebody wins every award every year — the statement was true,
 * sourced, and told a reader nothing. What is worth knowing is the count and the
 * span: ten wins across thirty years is a distinguished fact about a career,
 * and the reader can tell at a glance that it is unusual.
 *
 * The HAVING threshold is what does the work. Below it, a win is just a row.
 */
export const mostAwardedPerson: TemplateDef = {
  id: 'most-awarded-person',
  significance: 'record',
  sourceId: 'wikidata-sparql',
  categoryId: 4,
  // Indian awards only. Scoped to the Academy Awards and the Emmys this same
  // template produced 145 facts at near-zero Hindi coverage, and swamped the
  // feed with foreign film trivia. High yield is worthless if it is all one thing.
  subtopics: ['filmfare-awards', 'national-film-awards'],
  scopeVar: 'awardGroup',
  query: `
SELECT ?person ?personLabelEn ?personLabelHi ?personGender
       ?awardGroup ?awardGroupLabelEn ?awardGroupLabelHi
       (COUNT(DISTINCT ?st) AS ?wins)
       (MIN(?year) AS ?firstWin)
       (MAX(?year) AS ?lastWin)
       ?article WHERE {
  ${SCOPE}
  # Reach through the ceremony to its individual categories.
  ${inGroup('award', 'awardGroup')}
  ?person p:P166 ?st .
  ?st ps:P166 ?award .
  ?st pq:P585 ?year .
  ?person wdt:P31 wd:Q5 .
  ${labels('person')}
  ${gender('person')}
  ${labels('awardGroup')}
  ${article('person')}
}
GROUP BY ?person ?personLabelEn ?personLabelHi ?personGender
         ?awardGroup ?awardGroupLabelEn ?awardGroupLabelHi ?article
# Four or more wins is where a career stops being a list of years and starts
# being a record. Below this the fact is not worth a card.
HAVING (COUNT(DISTINCT ?st) >= 4)
ORDER BY DESC(?wins)`,
  hook: {
    en: [
      '{person} won {wins|num} {awardGroup}, from {firstWin|year} to {lastWin|year}.',
      '{wins|num} {awardGroup} in {firstWin|year}–{lastWin|year}: that is {person}’s haul.',
      'Between {firstWin|year} and {lastWin|year}, {person} won {wins|num} {awardGroup}.',
      '{person} holds {wins|num} {awardGroup}, won across {firstWin|year} to {lastWin|year}.',
    ],
    hi: [
      '{person} ने {firstWin|year} से {lastWin|year} तक {wins|num} {awardGroup} जीते।',
      '{firstWin|year} से {lastWin|year} के बीच {person} के नाम {wins|num} {awardGroup} हैं।',
      '{person} ने कुल {wins|num} {awardGroup} जीते, {firstWin|year} से {lastWin|year} के बीच।',
      '{wins|num} {awardGroup}, {firstWin|year} से {lastWin|year} तक — यह {person} का रिकॉर्ड है।',
    ],
  },
  body: {
    en: [
      'Winning a {awardGroup} once is a good year. Winning {wins|num}, as {person} did between {firstWin|year} and {lastWin|year}, is a different kind of claim: it means staying at the top of a jury’s list across a span in which the industry, the audience and the people voting all changed. Awards data is one of the few places where a career leaves a dated, checkable trail rather than a reputation.',
      '{person} took {wins|num} {awardGroup} between {firstWin|year} and {lastWin|year}. The gap between a single award and a repeated one is the whole point: any given year produces a winner, so one win tells you a name and a date. A run of {wins|num} tells you something about the career instead, and the {lastWin|year} date says how long it lasted.',
      'Across {firstWin|year} to {lastWin|year}, {person} won {wins|num} {awardGroup}. Counts like this are worth more than any individual result, because they survive the arguments about whether a particular year got it right. The span matters as much as the total — a run concentrated in four years reads very differently from one stretched across two decades.',
      'That total — {wins|num} {awardGroup}, from {firstWin|year} through {lastWin|year} — puts {person} among the most decorated names attached to it. It is an aggregate no single ceremony reveals, which is exactly why it is worth stating: you would have to read every year’s results in order to notice it yourself.',
    ],
    hi: [
      'एक बार {awardGroup} जीतना अच्छा साल है। {wins|num} जीतना अलग बात है, और {person} ने यही किया — {firstWin|year} से {lastWin|year} के बीच। इसका मतलब है इतने बरसों तक जूरी की सूची में सबसे ऊपर बने रहना, जबकि इंडस्ट्री, दर्शक और वोट देने वाले सब बदलते रहे।',
      '{person} ने {firstWin|year} से {lastWin|year} तक {wins|num} {awardGroup} हासिल किए। एक जीत और बार-बार की जीत में यही फ़र्क़ है: हर साल कोई न कोई जीतता ही है, इसलिए एक जीत सिर्फ़ एक नाम और एक तारीख़ बताती है। {wins|num} जीतें पूरे करियर के बारे में बताती हैं।',
      '{firstWin|year} से {lastWin|year} के बीच {person} ने {wins|num} {awardGroup} जीते। ऐसे आँकड़े किसी एक नतीजे से ज़्यादा मायने रखते हैं, क्योंकि ये उन बहसों से बच जाते हैं कि फ़लाँ साल फ़ैसला सही था या नहीं। कितने बरसों में जीता, यह भी उतना ही अहम है।',
      'यह कुल जोड़ — {wins|num} {awardGroup}, {firstWin|year} से {lastWin|year} तक — {person} को इस पुरस्कार के सबसे सम्मानित नामों में रखता है। यह वह बात है जो किसी एक समारोह से पता नहीं चलती; इसे जानने के लिए हर साल के नतीजे पढ़ने पड़ते।',
    ],
  },
  decays: false,
  sourceFrom: 'article',
  minRows: 5,
  difficulty: 3,
  requires: ['person', 'awardGroup', 'wins', 'firstWin', 'lastWin', 'article'],
  entityVars: ['person', 'awardGroup'],
};
