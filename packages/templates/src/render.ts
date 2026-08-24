import {
  bigNumber, formatDateLong, formatMonthYear, formatYear, ordinal, ordinalOblique, plainNumber,
} from './format';
import type { Binding, Gender, Lang, Patterns, Row, TemplateDef } from './types';

/** FNV-1a. Deterministic variant selection: the same row always reads the same. */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function pickVariant(patterns: string[], rowKey: string, salt: string): string {
  if (patterns.length === 0) throw new Error('template has no patterns');
  return patterns[fnv1a(`${salt}|${rowKey}`) % patterns.length]!;
}

/**
 * A Wikidata label service falls back to the bare QID when no label exists in
 * the requested language. That must never reach a card.
 */
export function isQidLeak(s: string): boolean {
  return /^[QPL]\d+$/.test(s.trim());
}

const TOKEN = /\{([a-zA-Z0-9_]+)(?:\|([a-zA-Z0-9_:.]+))?\}/g;

/**
 * A Hindi label with no Devanagari in it is not a Hindi label.
 *
 * Wikidata carries plenty of these — "manaslu" is filed as the @hi label for
 * Manaslu — usually because an editor copied the Latin name into the Hindi
 * field. Rendering it produces a Hindi sentence with a Latin word sitting in the
 * middle, which reads worse than no Hindi at all and is exactly the
 * machine-mangling §2.5 forbids.
 *
 * Digits, punctuation and Latin-script proper nouns that appear INSIDE an
 * otherwise Devanagari string are fine; this only rejects a value with no
 * Devanagari anywhere.
 */
const DEVANAGARI = /[ऀ-ॿ]/;

export function isUnrenderedHindi(value: string): boolean {
  const letters = value.replace(/[\d\s\p{P}\p{S}]/gu, '');
  return letters.length > 0 && !DEVANAGARI.test(letters);
}
const GENDERED = /\[([^\]|]*)\|([^\]|]*)(?:\|([^\]|]*))?\]@([a-zA-Z0-9_]+)/g;

export class RenderError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = 'RenderError';
  }
}

function applyFormatter(b: Binding, formatter: string | undefined, lang: Lang, varName: string): string {
  if (!formatter) {
    const v = lang === 'hi' ? b.hi : b.en;
    if (!v || !v.trim()) throw new RenderError(`missing_${lang}_label:${varName}`);
    if (isQidLeak(v)) throw new RenderError(`qid_leak:${varName}`);
    if (lang === 'hi' && isUnrenderedHindi(v)) {
      throw new RenderError(`latin_in_hindi_label:${varName}`);
    }
    return v.trim();
  }

  const [name, arg] = formatter.split(':');
  switch (name) {
    case 'year': {
      const src = b.date ?? (b.number !== undefined ? b.number : undefined);
      if (src === undefined) throw new RenderError(`missing_date:${varName}`);
      const y = formatYear(src);
      if (!y) throw new RenderError(`bad_date:${varName}`);
      return y;
    }
    case 'long': {
      if (!b.date) throw new RenderError(`missing_date:${varName}`);
      const v = formatDateLong(b.date, lang);
      if (!v) throw new RenderError(`bad_date:${varName}`);
      return v;
    }
    case 'monthyear': {
      if (!b.date) throw new RenderError(`missing_date:${varName}`);
      const v = formatMonthYear(b.date, lang);
      if (!v) throw new RenderError(`bad_date:${varName}`);
      return v;
    }
    case 'big': {
      if (b.number === undefined) throw new RenderError(`missing_number:${varName}`);
      return bigNumber(b.number, lang);
    }
    case 'num': {
      if (b.number === undefined) throw new RenderError(`missing_number:${varName}`);
      return plainNumber(b.number, lang);
    }
    case 'ord': {
      if (b.number === undefined) throw new RenderError(`missing_number:${varName}`);
      return ordinal(b.number, lang);
    }
    // Use before a Hindi postposition: "{rank|ordobl} नंबर पर", not "{rank|ord} नंबर पर".
    case 'ordobl': {
      if (b.number === undefined) throw new RenderError(`missing_number:${varName}`);
      return ordinalOblique(b.number, lang);
    }
    case 'qty': {
      if (b.number === undefined) throw new RenderError(`missing_number:${varName}`);
      return `${plainNumber(b.number, lang)} ${arg ?? ''}`.trim();
    }
    default:
      throw new RenderError(`unknown_formatter:${name}`);
  }
}

/**
 * Hindi verb and adjective agreement.
 *
 * Pattern syntax: `[मिले|मिलीं]@person` — masculine form, feminine form, and an
 * optional third form, keyed to the gender of a named entity binding.
 *
 * When the gender is unknown or non-binary, we do NOT guess. Hindi has no
 * common neutral verb form, and defaulting to masculine misgenders a real
 * person on a card that will be shared. The Hindi render is withheld instead
 * and the fact serves English-only.
 */
function resolveGendered(pattern: string, row: Row): string {
  return pattern.replace(GENDERED, (_m, masc: string, fem: string, third: string | undefined, varName: string) => {
    const g: Gender | undefined = row[varName]?.gender;
    if (g === 'male') return masc;
    if (g === 'female') return fem;
    if (g === 'other' && third) return third;
    throw new RenderError(`unknown_gender:${varName}`);
  });
}

export function renderPattern(pattern: string, row: Row, lang: Lang): string {
  const withGender = lang === 'hi' ? resolveGendered(pattern, row) : pattern.replace(GENDERED, '$1');
  const out = withGender.replace(TOKEN, (_m, varName: string, formatter: string | undefined) => {
    const b = row[varName];
    if (!b) throw new RenderError(`unbound:${varName}`);
    return applyFormatter(b, formatter, lang, varName);
  });
  if (/[{}]/.test(out)) throw new RenderError('unresolved_placeholder');
  return out;
}

export interface RenderResult {
  hookEn: string;
  bodyEn: string;
  hookHi?: string;
  bodyHi?: string;
  hiSkipReason?: string;
}

/**
 * Render one row into both languages.
 *
 * English failing is fatal for the row. Hindi failing is not: the draft goes out
 * English-only and flagged, and the reason is counted per template so a template
 * running at 60% Hindi coverage shows up as needing a different query rather
 * than quietly serving half a feed.
 */
export function renderRow(tpl: TemplateDef, row: Row, rowKey: string): RenderResult {
  const hookEn = renderPattern(pickVariant(tpl.hook.en, rowKey, 'hook:en'), row, 'en');
  const bodyEn = renderPattern(pickVariant(tpl.body.en, rowKey, 'body:en'), row, 'en');

  try {
    const hookHi = renderPattern(pickVariant(tpl.hook.hi, rowKey, 'hook:hi'), row, 'hi');
    const bodyHi = renderPattern(pickVariant(tpl.body.hi, rowKey, 'body:hi'), row, 'hi');
    return { hookEn, bodyEn, hookHi, bodyHi };
  } catch (e) {
    if (e instanceof RenderError) return { hookEn, bodyEn, hiSkipReason: e.reason };
    throw e;
  }
}
