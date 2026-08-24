/** Radius scale from the design spec: 16 / 24 / 32 / 44. */
export const radius = { sm: 16, md: 24, lg: 32, xl: 44, pill: 999 } as const;
export type RadiusKey = keyof typeof radius;

/** 4px grid. Clay needs generous padding or the inset highlight eats the text. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export type SpaceKey = keyof typeof space;

export const motion = {
  /** The tile press. Spring, not ease — clay has mass. */
  press: { duration: 180, stiffness: 260, damping: 22, mass: 0.9 },
  /** Horizontal card advance. Must feel weightless. */
  swipe: { duration: 220, stiffness: 220, damping: 24, mass: 0.8 },
  /** Rail change, vertical. */
  rail: { duration: 300, stiffness: 180, damping: 26, mass: 1 },
  /** Anything decorative. First thing dropped under prefers-reduced-motion. */
  decorative: { duration: 400, stiffness: 140, damping: 20, mass: 1 },
} as const;
export type MotionKey = keyof typeof motion;

/** CSS easing that approximates the press spring, for non-spring web animation. */
export const easing = {
  press: 'cubic-bezier(0.22, 1.2, 0.36, 1)',
  swipe: 'cubic-bezier(0.16, 1, 0.3, 1)',
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;
