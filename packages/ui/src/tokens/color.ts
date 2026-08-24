/**
 * Sachmuch colour tokens.
 *
 * Dark-first. The feed is a full-bleed, edge-to-edge card surface that people
 * scroll at night on a phone, so the dark scheme is the design and the light
 * scheme is the accommodation — not the other way round.
 *
 * The accents are a warm-to-cool ramp (flame, rose, violet, indigo) used as
 * gradients across the 29 categories, plus two functional colours that never
 * appear decoratively: jade means corroborated, haldi means coins.
 */

export type Scheme = 'light' | 'dark';

export interface Palette {
  bg: string;
  surface: string;
  sunken: string;
  ink: string;
  inkSoft: string;
  /** Brand ramp. Used as gradient stops, not as flat fills. */
  flame: string;
  rose: string;
  violet: string;
  indigo: string;
  /** Functional only. */
  jade: string;
  haldi: string;
  /** Ink that sits on top of an accent fill. */
  onAccent: string;
}

export const palette: Record<Scheme, Palette> = {
  dark: {
    bg: '#08070C',
    surface: '#15121D',
    sunken: '#0B0910',
    ink: '#F6F3FF',
    inkSoft: '#A79FBE',
    flame: '#FF8A3D',
    rose: '#FF4D8D',
    violet: '#B14BF4',
    indigo: '#6C7BFF',
    jade: '#2FD8B0',
    haldi: '#FFC94A',
    onAccent: '#08070C',
  },
  light: {
    bg: '#F2EFF7',
    surface: '#FCFAFF',
    sunken: '#E5E0EE',
    ink: '#171227',
    inkSoft: '#5D5478',
    flame: '#C1440E',
    rose: '#C21A5B',
    violet: '#7A1FC0',
    indigo: '#3A47C4',
    jade: '#0F7A63',
    haldi: '#8A6100',
    onAccent: '#FFFFFF',
  },
};

/**
 * The four ingredients of the clay recipe, per scheme.
 * Everything in clay.ts is built from exactly these.
 */
export interface ClayInk {
  /** inset light, top-left */
  innerLight: string;
  /** inset shade, bottom-right */
  innerShade: string;
  /** outer drop, bottom-right */
  outerShade: string;
  /** outer bounce light, top-left */
  outerLight: string;
  /** inset shade used by the pressed state (stronger than innerShade) */
  pressedShade: string;
  /** inset light used by the pressed state */
  pressedLight: string;
}

export const clayInk: Record<Scheme, ClayInk> = {
  dark: {
    innerLight: 'rgba(255,255,255,0.070)',
    innerShade: 'rgba(0,0,0,0.62)',
    outerShade: 'rgba(0,0,0,0.62)',
    outerLight: 'rgba(255,255,255,0.045)',
    pressedShade: 'rgba(0,0,0,0.72)',
    pressedLight: 'rgba(255,255,255,0.055)',
  },
  light: {
    innerLight: 'rgba(255,255,255,0.92)',
    innerShade: 'rgba(103,90,140,0.18)',
    outerShade: 'rgba(84,70,120,0.16)',
    outerLight: 'rgba(255,255,255,0.80)',
    pressedShade: 'rgba(103,90,140,0.26)',
    pressedLight: 'rgba(255,255,255,0.72)',
  },
};
