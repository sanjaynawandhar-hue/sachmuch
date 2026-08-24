import type { CSSProperties } from 'react';

export interface WordmarkProps {
  /** Cap height in px. The extrusion depth scales with it. */
  size?: number;
  style?: CSSProperties;
}

/**
 * The Sachmuch wordmark, extruded.
 *
 * The 3D is built from stacked text-shadow layers rather than a font trick or an
 * image: one shadow per pixel of depth, darkening as it recedes, then a warm rim
 * light on the top-left face to match the clay's light direction. That keeps it
 * a live text node — it scales, it stays selectable, it needs no asset, and it
 * costs nothing to load.
 *
 * Latin only, by request.
 */
export function Wordmark({ size = 34, style }: WordmarkProps) {
  const depth = Math.max(3, Math.round(size * 0.11));

  // Extrusion: successive offsets down-right, each a little darker, so the side
  // face reads as a solid slab rather than a blur.
  const slab = Array.from({ length: depth }, (_, i) => {
    const t = i / depth;
    const shade = Math.round(28 - t * 20);
    return `${i + 1}px ${i + 1}px 0 rgba(${shade},${Math.round(shade * 0.8)},${Math.round(shade * 1.4)},1)`;
  });

  const shadows = [
    // rim light on the lit edge
    `-1px -1px 0 rgba(255,255,255,0.55)`,
    ...slab,
    // contact shadow under the whole slab
    `${depth + 2}px ${depth + 3}px ${depth * 2}px rgba(0,0,0,0.55)`,
  ].join(', ');

  return (
    <span
      style={{
        fontFamily: 'var(--font-baloo), var(--font-display)',
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: '-0.02em',
        display: 'inline-block',
        // The face itself carries the brand ramp; the extrusion below is flat
        // dark so the gradient stays legible instead of muddying into it.
        background: 'var(--brand-gradient)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        WebkitTextFillColor: 'transparent',
        filter: `drop-shadow(0 ${Math.round(depth * 0.6)}px ${depth * 2}px rgba(0,0,0,0.5))`,
        ...style,
      }}
    >
      {/* The extruded slab sits behind, painted in solid colour so the gradient
          face on top reads cleanly against it. */}
      <span aria-hidden style={{ position: 'absolute', color: 'transparent', textShadow: shadows, WebkitTextFillColor: 'transparent' }} />
      Sachmuch
    </span>
  );
}

/**
 * The extruded slab needs a painted (non-transparent) text fill to cast from, so
 * it is rendered as its own layer underneath the gradient face.
 */
export function WordmarkStack({ size = 34, style }: WordmarkProps) {
  const depth = Math.max(3, Math.round(size * 0.11));
  const slab = Array.from({ length: depth }, (_, i) => {
    const t = i / depth;
    const c = Math.round(34 - t * 26);
    return `${i + 1}px ${i + 1}px 0 rgb(${c},${Math.round(c * 0.85)},${Math.round(c * 1.5)})`;
  }).join(', ');

  const base: CSSProperties = {
    fontFamily: 'var(--font-baloo), var(--font-display)',
    fontWeight: 800,
    fontSize: size,
    lineHeight: 1,
    letterSpacing: '-0.02em',
    margin: 0,
    whiteSpace: 'nowrap',
  };

  return (
    <span style={{ position: 'relative', display: 'inline-block', ...base, ...style }}>
      {/* back: the solid extruded slab */}
      <span
        aria-hidden
        style={{
          ...base,
          position: 'absolute',
          inset: 0,
          color: '#151022',
          textShadow: `${slab}, ${depth + 2}px ${depth + 3}px ${depth * 2.2}px rgba(0,0,0,0.6)`,
        }}
      >
        Sachmuch
      </span>
      {/* front: the gradient face with a rim light along the lit edge */}
      <span
        style={{
          ...base,
          position: 'relative',
          background: 'var(--brand-gradient)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(-1px -1px 0 rgba(255,255,255,0.45))',
        }}
      >
        Sachmuch
      </span>
    </span>
  );
}
