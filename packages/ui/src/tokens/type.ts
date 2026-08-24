/**
 * Typography.
 *
 * Baloo 2 covers Latin AND Devanagari in one family, which is why display and
 * hooks use it in both languages — the English and Hindi cards have to read as
 * one product, not two apps stapled together.
 */

export type Script = 'latin' | 'devanagari';

export const fontFamily = {
  display: { latin: 'Baloo 2', devanagari: 'Baloo 2' },
  body: { latin: 'Mulish', devanagari: 'Noto Sans Devanagari' },
} as const;

/** Base size scale, in px. */
export const fontSize = {
  display: 34,
  title: 26,
  hook: 20,
  body: 16,
  caption: 13,
} as const;

export type SizeKey = keyof typeof fontSize;

/** User-selectable multiplier, persisted per user. */
export const typeScales = { small: 0.9, default: 1.0, large: 1.15, xlarge: 1.3 } as const;
export type TypeScaleKey = keyof typeof typeScales;

/**
 * Devanagari needs roughly 1.25x the leading of Latin at the same size —
 * matras sit above and below the baseline and collide otherwise.
 */
const LINE_HEIGHT_RATIO: Record<Script, Record<SizeKey, number>> = {
  latin: { display: 1.16, title: 1.22, hook: 1.35, body: 1.5, caption: 1.45 },
  devanagari: { display: 1.45, title: 1.53, hook: 1.68, body: 1.85, caption: 1.8 },
};

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

export const letterSpacing = { display: -0.5, title: -0.3, hook: 0, body: 0, caption: 0.2 } as const;

/**
 * Narrow, not `string`. React Native types fontWeight as a literal union and
 * rejects a widened string, so the shared token has to be precise enough for
 * both platforms rather than convenient for one.
 */
export type FontWeightValue = (typeof fontWeight)[keyof typeof fontWeight];

export interface TypeStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontWeight: FontWeightValue;
}

export function typeStyle(
  key: SizeKey,
  script: Script = 'latin',
  scale: TypeScaleKey = 'default',
): TypeStyle {
  const size = Math.round(fontSize[key] * typeScales[scale]);
  const family =
    key === 'display' || key === 'title' || key === 'hook'
      ? fontFamily.display[script]
      : fontFamily.body[script];
  return {
    fontFamily: family,
    fontSize: size,
    lineHeight: Math.round(size * LINE_HEIGHT_RATIO[script][key]),
    letterSpacing: letterSpacing[key],
    fontWeight:
      key === 'display' ? fontWeight.extrabold : key === 'title' || key === 'hook' ? fontWeight.bold : fontWeight.regular,
  };
}

/** Devanagari when the string contains any character in the Devanagari block. */
export function scriptOf(text: string): Script {
  return /[ऀ-ॿ]/.test(text) ? 'devanagari' : 'latin';
}

/**
 * Web-safe form of a TypeStyle.
 *
 * React treats a unitless `lineHeight` as a RATIO, not pixels, so returning the
 * platform-neutral number straight into a style prop multiplies it by the font
 * size — a 13px caption came out with 247px of leading. React Native, by
 * contrast, wants the number. So the number stays canonical and the web
 * converts here, in one place.
 */
export interface CssTypeStyle {
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
  fontWeight: FontWeightValue;
}

export function cssTypeStyle(
  key: SizeKey,
  script: Script = 'latin',
  scale: TypeScaleKey = 'default',
): CssTypeStyle {
  const s = typeStyle(key, script, scale);
  return {
    fontFamily: s.fontFamily,
    fontSize: `${s.fontSize}px`,
    lineHeight: `${s.lineHeight}px`,
    letterSpacing: `${s.letterSpacing}px`,
    fontWeight: s.fontWeight,
  };
}
