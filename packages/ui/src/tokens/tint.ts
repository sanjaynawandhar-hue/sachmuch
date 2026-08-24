import { palette, type Scheme } from './color';
import { contrastRatio } from './contrast';

/** Hex <-> HSL, small and exact enough for token generation. */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const seg = Math.floor(hue / 60) % 6;
  const rgb: [number, number, number] =
    seg === 0 ? [c, x, 0] : seg === 1 ? [x, c, 0] : seg === 2 ? [0, c, x]
    : seg === 3 ? [0, x, c] : seg === 4 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(rgb[0])}${to(rgb[1])}${to(rgb[2])}`;
}

/**
 * Yellows and greens read lighter than blues and violets at identical HSL
 * lightness. Without this correction the 29 category grounds look like an
 * uneven ladder rather than one family. Grounds only — the accent is solved
 * numerically below, because a hand-tuned curve cannot promise a contrast ratio.
 */
function perceptualLift(hue: number): number {
  const h = ((hue % 360) + 360) % 360;
  return (
    -0.022 * Math.cos(((h - 75) * Math.PI) / 180) - 0.012 * Math.cos(((h - 150) * Math.PI) / 90)
  );
}

/**
 * Find the lightness closest to `start` that still clears `target` contrast
 * against `against`, walking in `direction`. Contrast is monotone in lightness
 * on either side of the background, so a bisection is exact.
 *
 * This is why the tints are guaranteed accessible rather than hopefully
 * accessible: the ratio itself is the input, not an afterthought.
 */
function solveLightness(
  hue: number,
  sat: number,
  against: string,
  target: number,
  direction: 'darker' | 'lighter',
  start: number,
): number {
  const ok = (l: number) => contrastRatio(hslToHex(hue, sat, l), against) >= target;
  if (ok(start)) return start;

  let lo = direction === 'darker' ? 0.04 : start;
  let hi = direction === 'darker' ? start : 0.97;
  // The extreme end must satisfy the target; if it cannot, return it anyway and
  // let the token test fail loudly rather than shipping a silent near-miss.
  const extreme = direction === 'darker' ? lo : hi;
  if (!ok(extreme)) return extreme;

  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (direction === 'darker') {
      if (ok(mid)) lo = mid;
      else hi = mid;
    } else {
      if (ok(mid)) hi = mid;
      else lo = mid;
    }
  }
  return direction === 'darker' ? lo : hi;
}

export interface CategoryTint {
  /** Card ground for this category — a rotation of the app ground. */
  bg: string;
  /** Raised surface within that ground. */
  surface: string;
  /** Saturated chip / accent for this category, contrast-solved against `bg`. */
  accent: string;
  /** The accent's neighbour on the wheel, for two-stop gradients. */
  accentTo: string;
  /** Ready-made gradient for chips, the brand bar and category glows. */
  gradient: string;
}

/** A little headroom over the AA large-text threshold of 3.0. */
const ACCENT_TARGET = 3.25;

/** Degrees between the two stops of a category gradient. */
const GRADIENT_SWEEP = 38;

/**
 * Deterministic tint for a category. `index` is the category's position in the
 * taxonomy and `total` the number of categories, so the hues spread evenly
 * around the wheel starting from the app's own ground hue.
 *
 * Written to the category row at seed time so the server and both clients agree
 * without recomputing.
 */
export function categoryTint(index: number, total: number, scheme: Scheme = 'light'): CategoryTint {
  const base = hexToHsl(palette[scheme].bg);
  const hue = base.h + (360 / total) * index;
  const lift = perceptualLift(hue);

  // The second gradient stop sits a fixed step further round the wheel, so every
  // category reads as the same family of gradient rather than 29 unrelated ones.
  const hueTo = hue + GRADIENT_SWEEP;

  if (scheme === 'dark') {
    // Barely-tinted near-black. The colour lives in the accent and the gradient,
    // not in the ground — a saturated ground behind body text is unreadable and
    // is the usual way a "vibrant" feed ends up illegible.
    const bg = hslToHex(hue, 0.20, 0.052 - lift * 0.25);
    const accent = hslToHex(hue, 0.86, solveLightness(hue, 0.86, bg, ACCENT_TARGET, 'lighter', 0.66));
    const accentTo = hslToHex(hueTo, 0.86, solveLightness(hueTo, 0.86, bg, ACCENT_TARGET, 'lighter', 0.66));
    return {
      bg,
      surface: hslToHex(hue, 0.17, 0.098 - lift * 0.25),
      accent,
      accentTo,
      gradient: `linear-gradient(135deg, ${accent} 0%, ${accentTo} 100%)`,
    };
  }

  const bg = hslToHex(hue, 0.30, 0.955 - lift * 0.5);
  const accent = hslToHex(hue, 0.80, solveLightness(hue, 0.80, bg, ACCENT_TARGET, 'darker', 0.44));
  const accentTo = hslToHex(hueTo, 0.80, solveLightness(hueTo, 0.80, bg, ACCENT_TARGET, 'darker', 0.44));
  return {
    bg,
    surface: hslToHex(hue, 0.34, 0.988 - lift * 0.3),
    accent,
    accentTo,
    gradient: `linear-gradient(135deg, ${accent} 0%, ${accentTo} 100%)`,
  };
}

/**
 * The brand gradient: flame -> rose -> violet -> indigo, the same ramp the
 * category tints rotate through. Used by the wordmark and the top bar.
 */
export function brandGradient(scheme: Scheme = 'dark'): string {
  const p = palette[scheme];
  return `linear-gradient(115deg, ${p.flame} 0%, ${p.rose} 38%, ${p.violet} 70%, ${p.indigo} 100%)`;
}
