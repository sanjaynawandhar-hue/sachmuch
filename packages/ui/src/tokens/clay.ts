import { clayInk, palette, type Scheme } from './color';

/**
 * The clay recipe. This file is the only place in the codebase allowed to
 * assemble a clay shadow. Everything else calls into it.
 *
 * Light comes from the top-left, consistently, on every element in the app.
 * Four ingredients, always in this order:
 *   1. inset light  (top-left)     — the puff
 *   2. inset shade  (bottom-right) — the roll-off at the far edge
 *   3. outer shade  (bottom-right) — the object sitting on the ground
 *   4. outer light  (top-left)     — bounce light, what stops it looking like a drop shadow
 */

export type ClayLevel = 1 | 2 | 3;
export type ClayState = 'raised' | 'pressed' | 'flat';

/** Level 2 is the reference recipe from the design spec; 1 and 3 are scaled from it. */
const LEVEL_SCALE: Record<ClayLevel, number> = { 1: 0.55, 2: 1, 3: 1.45 };

/** Dark mode wants a longer, softer cast because the ground absorbs more. */
const OUTER_SCALE: Record<Scheme, number> = { light: 1, dark: 1.15 };

interface Layer {
  x: number;
  y: number;
  blur: number;
  color: string;
  inset: boolean;
}

const round = (n: number) => Math.round(n * 10) / 10;

function layers(scheme: Scheme, level: ClayLevel, state: ClayState): Layer[] {
  const ink = clayInk[scheme];
  const s = LEVEL_SCALE[level];
  const o = OUTER_SCALE[scheme];

  if (state === 'flat') return [];

  if (state === 'pressed') {
    return [
      { x: round(8 * s), y: round(8 * s), blur: round(16 * s), color: ink.pressedShade, inset: true },
      { x: round(-6 * s), y: round(-6 * s), blur: round(14 * s), color: ink.pressedLight, inset: true },
    ];
  }

  return [
    { x: round(6 * s), y: round(6 * s), blur: round(12 * s), color: ink.innerLight, inset: true },
    { x: round(-6 * s), y: round(-6 * s), blur: round(14 * s), color: ink.innerShade, inset: true },
    { x: round(14 * s * o), y: round(14 * s * o), blur: round(28 * s * o), color: ink.outerShade, inset: false },
    { x: round(-8 * s), y: round(-8 * s), blur: round(22 * s), color: ink.outerLight, inset: false },
  ];
}

export interface ClayOptions {
  scheme?: Scheme;
  level?: ClayLevel;
  state?: ClayState;
  /** Override the fill; defaults to surface when raised, sunken when pressed. */
  background?: string;
}

function resolve(opts: ClayOptions) {
  const scheme = opts.scheme ?? 'light';
  const level = opts.level ?? 2;
  const state = opts.state ?? 'raised';
  const background =
    opts.background ?? (state === 'pressed' ? palette[scheme].sunken : palette[scheme].surface);
  return { scheme, level, state, background };
}

/** `box-shadow` value for the web. */
export function clayShadow(opts: ClayOptions = {}): string {
  const { scheme, level, state } = resolve(opts);
  const l = layers(scheme, level, state);
  if (l.length === 0) return 'none';
  return l
    .map((v) => `${v.inset ? 'inset ' : ''}${v.x}px ${v.y}px ${v.blur}px ${v.color}`)
    .join(', ');
}

/** Full CSS declaration block for the web, as a style object. */
export function clayCss(opts: ClayOptions = {}): { background: string; boxShadow: string } {
  const { background } = resolve(opts);
  return { background, boxShadow: clayShadow(opts) };
}

export interface NativeShadowLayer {
  offsetX: number;
  offsetY: number;
  blurRadius: number;
  color: string;
  inset: boolean;
}

/**
 * React Native style object.
 *
 * RN >= 0.76 on the New Architecture implements the `boxShadow` style prop
 * including `inset`, using the same four-layer model as the web. That is what
 * makes the clay reproducible natively rather than approximated — see
 * docs/LESSONS.md. `ClayView.native.tsx` falls back to a gradient-overlay
 * approximation when the prop is unsupported.
 */
export function clayNative(opts: ClayOptions = {}): {
  backgroundColor: string;
  boxShadow: NativeShadowLayer[];
} {
  const { scheme, level, state, background } = resolve(opts);
  return {
    backgroundColor: background,
    boxShadow: layers(scheme, level, state).map((v) => ({
      offsetX: v.x,
      offsetY: v.y,
      blurRadius: v.blur,
      color: v.color,
      inset: v.inset,
    })),
  };
}

/** Exposed so the fallback renderer can rebuild the same geometry. */
export const clayLayers = layers;
