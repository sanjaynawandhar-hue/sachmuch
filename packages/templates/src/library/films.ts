import type { TemplateDef } from '../types';
import { article, labels } from './_sparql';

/**
 * NOT IN THE LIBRARY. See WITHDRAWN_TEMPLATES in ./index.
 *
 * These produce "X directed Y, released in 1965" — a row, not a fact. Thousands
 * of films come out every year, so the statement carries no information a reader
 * would repeat to anyone. Kept as the starting point for an aggregate rewrite
 * (career spans, output counts, the longest gap between two films), not as
 * something to re-register as-is.
 *
 * Unscoped and filtered by country because the taxonomy's film subtopics anchor
 * on eras and genres rather than on individual titles.
 */
function filmTemplate(id: string, categoryId: number, countryQid: string, subtopics: string[]): TemplateDef {
  return {
    id,
    significance: 'aggregate',
    sourceId: 'wikidata-sparql',
    categoryId,
    subtopics,
    query: `
SELECT DISTINCT ?film ?filmLabelEn ?filmLabelHi
                ?director ?directorLabelEn ?directorLabelHi ?directorGender
                ?released ?article WHERE {
  ?film wdt:P31 wd:Q11424 ;
        wdt:P495 wd:${countryQid} ;
        wdt:P57 ?director ;
        wdt:P577 ?released .
  ${labels('film')}
  ${labels('director')}
  OPTIONAL { ?director wdt:P21 ?directorGender . }
  ?article schema:about ?film ; schema:isPartOf <https://en.wikipedia.org/> .
}`,
    hook: {
      en: [
        '{director} directed {film}, released in {released|year}.',
        '{film} came out in {released|year}, directed by {director}.',
        'In {released|year}, {director} released {film}.',
        '{film} was {director}’s film of {released|year}.',
      ],
      hi: [
        '{film} का निर्देशन {director} ने किया, जो {released|year} में आई।',
        '{released|year} में आई {film} के निर्देशक {director} थे।',
        '{director} ने {released|year} में {film} बनाई।',
        '{released|year} की फ़िल्म {film} {director} की थी।',
      ],
    },
    body: {
      en: [
        '{film} was directed by {director} and released in {released|year}. A release year is a duller-looking piece of information than it deserves to be: it fixes a film against everything else that arrived the same season, against what audiences had just been watching, and against whatever the industry happened to be arguing about at the time. Much of what a film is later said to have started or ended only makes sense once that year is in view.',
        'Released in {released|year}, {film} was directed by {director}. Directing credit in Wikidata is a structured statement rather than a line scraped from prose, which means it can be checked, and which is why this fact carries a year alongside the name. Films are remembered by their titles and argued about by their decades, and the two get separated more often than they should.',
        '{director} made {film}, which reached audiences in {released|year}. Filmographies read very differently forwards and backwards: seen in order of release, a director’s choices look like a sequence of responses to their own last film and to the market around it, rather than the tidy progression a retrospective tends to describe afterwards.',
        'In {released|year}, {film} was released, with {director} directing. Placing a film precisely in time is what makes any claim about influence checkable at all, and it is the single most useful thing to know about a title beyond its name, because almost every other interesting question about it depends on when it arrived.',
      ],
      hi: [
        '{film} का निर्देशन {director} ने किया और यह {released|year} में रिलीज़ हुई। रिलीज़ का साल देखने में मामूली लगता है, मगर वही फ़िल्म को उस दौर के बाक़ी सिनेमा के आमने-सामने रख देता है — दर्शक उस वक़्त क्या देख रहे थे, इंडस्ट्री किस बहस में उलझी थी, यह सब उसी साल से खुलता है।',
        '{released|year} में रिलीज़ हुई {film} के निर्देशक {director} थे। विकिडेटा में निर्देशक का नाम एक ढाँचागत बयान के रूप में दर्ज है, किसी लेख से उठाया गया वाक्य नहीं, इसलिए इसे जाँचा जा सकता है। फ़िल्में नाम से याद रहती हैं और दशक से पहचानी जाती हैं, पर दोनों अक्सर अलग हो जाते हैं।',
        '{director} ने {film} बनाई, जो {released|year} में दर्शकों तक पहुँची। किसी निर्देशक की फ़िल्मों को रिलीज़ के क्रम में देखें तो वे अपने ही पिछले काम और बाज़ार के जवाब जैसी लगती हैं, न कि वह साफ़-सुथरा सफ़र जो बाद में लिखा जाता है।',
        '{released|year} में {film} रिलीज़ हुई और इसका निर्देशन {director} ने किया। किसी फ़िल्म को वक़्त में ठीक-ठीक रखना ही उसके असर के बारे में किए गए हर दावे को जाँचने लायक़ बनाता है, और नाम के बाद यही सबसे काम की जानकारी है।',
      ],
    },
    decays: false,
    sourceFrom: 'article',
    minRows: 50,
    difficulty: 2,
    requires: ['film', 'director', 'released', 'article'],
    entityVars: ['film', 'director'],
  };
}

/** Q668 is India. */
export const indianFilmDirector = filmTemplate(
  'indian-film-director', 2, 'Q668',
  [
    'rk-films-raj-kapoor', 'guru-dutt-films', 'bimal-roy-social-realism',
    'angry-young-man-1970s', 'parallel-cinema-nfdc', 'shyam-benegal-films',
    'yash-chopra-foreign-locations', 'production-houses', 'golden-age-heroines',
  ],
);

/** Q30 is the United States. */
export const hollywoodFilmDirector = filmTemplate(
  'hollywood-film-director', 3, 'Q30',
  [
    'studio-system', 'film-noir', 'westerns-and-john-ford',
    'new-hollywood-1970s', 'spielberg-films', 'jaws-and-the-blockbuster',
  ],
);
