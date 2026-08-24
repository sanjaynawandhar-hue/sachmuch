/** WCAG 2.1 relative luminance and contrast ratio. Used by the token test. */

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const m = hex.replace('#', '');
  const r = srgbToLinear(parseInt(m.slice(0, 2), 16));
  const g = srgbToLinear(parseInt(m.slice(2, 4), 16));
  const b = srgbToLinear(parseInt(m.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(fg: string, bg: string): number {
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

export const WCAG_AA_NORMAL = 4.5;
export const WCAG_AA_LARGE = 3.0;
