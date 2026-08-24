/**
 * Locale-aware value formatting.
 *
 * The same token renders differently per language on purpose: an Indian reader
 * reading Hindi wants "140 करोड़", not "1.4 billion". Getting this wrong is the
 * fastest way to make a bilingual app feel like a translation of an English app.
 */

export type Lang = 'en' | 'hi';

const HI_MONTHS = [
  'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
  'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर',
];
const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Indian digit grouping: last three digits, then pairs. 12345678 -> 1,23,45,678 */
export function indianGrouping(n: number): string {
  const neg = n < 0;
  const [int = '0', frac] = Math.abs(n).toString().split('.');
  let out: string;
  if (int.length <= 3) {
    out = int;
  } else {
    const last3 = int.slice(-3);
    const rest = int.slice(0, -3);
    out = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  }
  return (neg ? '-' : '') + out + (frac ? '.' + frac : '');
}

function trimNum(v: number): string {
  // One decimal, but never a trailing ".0" — "5 करोड़" reads better than "5.0 करोड़".
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/**
 * Large numbers in words. Hindi tops out at करोड़ deliberately: Indian readers
 * say "800 करोड़", not "8 अरब", even though अरब exists.
 */
export function bigNumber(n: number, lang: Lang): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (lang === 'hi') {
    if (abs >= 1e7) return `${sign}${trimNum(abs / 1e7)} करोड़`;
    if (abs >= 1e5) return `${sign}${trimNum(abs / 1e5)} लाख`;
    if (abs >= 1e3) return `${sign}${trimNum(abs / 1e3)} हज़ार`;
    return sign + indianGrouping(abs);
  }
  if (abs >= 1e12) return `${sign}${trimNum(abs / 1e12)} trillion`;
  if (abs >= 1e9) return `${sign}${trimNum(abs / 1e9)} billion`;
  if (abs >= 1e6) return `${sign}${trimNum(abs / 1e6)} million`;
  if (abs >= 1e3) return `${sign}${trimNum(abs / 1e3)} thousand`;
  return sign + String(abs);
}

/**
 * Plain number with the locale's own grouping.
 *
 * Decimals are rounded to one place. Source data carries whatever precision the
 * statistical agency happened to publish — a literacy rate arrives as 78.163 —
 * and printing it verbatim makes a card look like a spreadsheet export rather
 * than a sentence. Whole numbers are left exactly as they are, because a land
 * area of 17,125,190 sq km is not improved by rounding.
 */
export function plainNumber(n: number, lang: Lang): string {
  const v = Number.isInteger(n) ? n : Math.round(n * 10) / 10;
  return lang === 'hi' ? indianGrouping(v) : v.toLocaleString('en-US');
}

/** Wikidata dates arrive as ISO 8601, often with a +0000000 year prefix. */
export function parseWikidataDate(raw: string): Date | null {
  const cleaned = raw.replace(/^\+/, '');
  const d = new Date(cleaned);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatYear(raw: string | number): string | null {
  if (typeof raw === 'number') return String(raw);
  const d = parseWikidataDate(raw);
  if (d) return String(d.getUTCFullYear());
  const m = /^[+-]?(\d{1,4})/.exec(raw.trim());
  return m?.[1] ? String(Number(m[1])) : null;
}

/** "12 March 1930" / "12 मार्च 1930" */
export function formatDateLong(raw: string, lang: Lang): string | null {
  const d = parseWikidataDate(raw);
  if (!d) return null;
  const day = d.getUTCDate();
  const month = (lang === 'hi' ? HI_MONTHS : EN_MONTHS)[d.getUTCMonth()];
  return `${day} ${month} ${d.getUTCFullYear()}`;
}

/** "March 1930" / "मार्च 1930" */
export function formatMonthYear(raw: string, lang: Lang): string | null {
  const d = parseWikidataDate(raw);
  if (!d) return null;
  const month = (lang === 'hi' ? HI_MONTHS : EN_MONTHS)[d.getUTCMonth()];
  return `${month} ${d.getUTCFullYear()}`;
}

/** Ordinals. Hindi uses a different set below 7, then falls back to वाँ. */
export function ordinal(n: number, lang: Lang): string {
  if (lang === 'hi') {
    const small: Record<number, string> = {
      1: 'पहला', 2: 'दूसरा', 3: 'तीसरा', 4: 'चौथा', 5: 'पाँचवाँ', 6: 'छठा',
    };
    return small[n] ?? `${n}वाँ`;
  }
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
}

/**
 * Hindi ordinals in the OBLIQUE case, for use before a postposition.
 *
 * "137वाँ नंबर पर" is wrong; it has to be "137वें नंबर पर". Hindi inflects an
 * adjective before a postposition (पर, में, से, को, तक), and an ordinal is an
 * adjective. The direct form is correct in predicate position — "भारत 137वाँ है"
 * — so both are needed, and which one a pattern wants depends on what follows it.
 *
 * English has no such distinction, so this returns the plain ordinal there.
 */
export function ordinalOblique(n: number, lang: Lang): string {
  if (lang !== 'hi') return ordinal(n, lang);
  const small: Record<number, string> = {
    1: 'पहले', 2: 'दूसरे', 3: 'तीसरे', 4: 'चौथे', 5: 'पाँचवें', 6: 'छठे',
  };
  return small[n] ?? `${n}वें`;
}

/** Metric quantities keep their unit; only the number is localised. */
export function quantity(n: number, unit: string, lang: Lang): string {
  return `${plainNumber(n, lang)} ${unit}`;
}
