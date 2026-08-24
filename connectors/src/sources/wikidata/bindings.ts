import type { Binding, Gender, Row } from '@sachmuch/templates';
import type { SparqlBinding } from './sparql-client';

/**
 * Naming convention every Wikidata template query must follow.
 *
 * For an entity variable `person`, the query binds:
 *   ?person          the entity URI          -> Binding.qid
 *   ?personLabelEn   English label           -> Binding.en
 *   ?personLabelHi   Hindi label, OPTIONAL   -> Binding.hi
 *   ?personGender    P21 value, OPTIONAL     -> Binding.gender
 *
 * We bind labels explicitly with a language filter rather than using
 * `wikibase:label` with a "en,hi" fallback list, because the fallback silently
 * hands back the English label under a Hindi variable name — which is exactly
 * the machine-mangling §2.5 forbids. Binding them separately is what lets us
 * KNOW that Hindi is missing rather than guess.
 */
const ENTITY_URI = /^https?:\/\/www\.wikidata\.org\/entity\/(Q\d+)$/;

export function qidFromUri(uri: string): string | undefined {
  return ENTITY_URI.exec(uri)?.[1];
}

const GENDER_QIDS: Record<string, Gender> = {
  Q6581097: 'male',
  Q6581072: 'female',
  Q2449503: 'male',   // trans man
  Q1052281: 'female', // trans woman
  Q48270: 'other',    // non-binary
  Q1097630: 'other',  // intersex
  Q179294: 'other',   // eunuch
};

export function genderFrom(value: string): Gender | undefined {
  const qid = qidFromUri(value) ?? value;
  return GENDER_QIDS[qid];
}

const NUMERIC_TYPES = new Set([
  'http://www.w3.org/2001/XMLSchema#integer',
  'http://www.w3.org/2001/XMLSchema#decimal',
  'http://www.w3.org/2001/XMLSchema#double',
  'http://www.w3.org/2001/XMLSchema#float',
  'http://www.w3.org/2001/XMLSchema#int',
  'http://www.w3.org/2001/XMLSchema#long',
]);
const DATE_TYPE = 'http://www.w3.org/2001/XMLSchema#dateTime';

const SUFFIX = /^(.*?)(LabelEn|LabelHi|Gender)$/;

/**
 * Wikidata labels carry parenthetical disambiguators — "Darna Zaroori Hai
 * (2006 film)", "Mercury (element)" — which are editorial scaffolding for
 * Wikidata's own namespace and have no business on a card. They surfaced in a
 * dry run as "डरना जरूरी है (2006 फ़िल्म) बनाई", which reads as a bug to any reader.
 *
 * Only strip a trailing parenthetical that LOOKS like a disambiguator: a year,
 * or a type word in either script. Titles that genuinely contain brackets keep
 * them.
 */
const DISAMBIGUATOR =
  /\s*[(（]\s*(?:\d{4}|[^)）]*\b(?:film|movie|album|song|band|novel|book|TV series|series|singer|actor|actress|politician|disambiguation|company|city|town|village|river|genus|footballer|cricketer)\b[^)）]*|[^)）]*(?:फ़िल्म|फिल्म|धारावाहिक|उपन्यास|गीत|एल्बम|अभिनेता|अभिनेत्री)[^)）]*)\s*[)）]\s*$/i;

export function stripDisambiguator(label: string): string {
  return label.replace(DISAMBIGUATOR, '').trim();
}

/**
 * Collapse a flat SPARQL binding row into the variable shape templates expect.
 * `?personLabelEn` and `?personLabelHi` fold into one `person` binding.
 */
export function bindingsToRow(raw: Record<string, SparqlBinding>): Row {
  const row: Row = {};
  const get = (name: string): Binding => (row[name] ??= {});

  for (const [key, val] of Object.entries(raw)) {
    if (val.value === '') continue;

    // Positions computed by the connector, not returned by SPARQL.
    if (key === '__rank' || key === '__total') {
      row[key.replace('__', '')] = { number: Number(val.value) };
      continue;
    }
    const m = SUFFIX.exec(key);

    if (m) {
      const [, base, suffix] = m as unknown as [string, string, string];
      const b = get(base);
      if (suffix === 'LabelEn') b.en = stripDisambiguator(val.value);
      else if (suffix === 'LabelHi') b.hi = stripDisambiguator(val.value);
      else {
        const g = genderFrom(val.value);
        if (g) b.gender = g;
      }
      continue;
    }

    const b = get(key);
    if (val.type === 'uri') {
      const qid = qidFromUri(val.value);
      if (qid) b.qid = qid;
      // A non-entity URI is a real value — a Wikipedia article link, typically.
      else b.en ??= val.value;
      continue;
    }

    if (val.datatype === DATE_TYPE) b.date = val.value;
    else if (val.datatype && NUMERIC_TYPES.has(val.datatype)) b.number = Number(val.value);
    else if (val['xml:lang'] === 'hi') b.hi ??= val.value;
    else if (val['xml:lang'] === 'en' || !val['xml:lang']) {
      b.en ??= val.value;
      // Language-neutral literals (URLs, codes, bare numerals) read the same in
      // both languages, so they must not be treated as a missing Hindi label.
      if (!val['xml:lang']) b.hi ??= val.value;
    }
  }

  // Drop bindings that ended up carrying nothing usable.
  for (const [k, b] of Object.entries(row)) {
    if (!b.en && !b.hi && b.number === undefined && !b.date && !b.qid) delete row[k];
  }
  return row;
}
