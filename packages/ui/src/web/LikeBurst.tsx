'use client';

import { useEffect, useRef, useState } from 'react';

/** The brand ramp, so the burst belongs to the app rather than to Instagram. */
const COLOURS = ['#FF8A3D', '#FF4D8D', '#B14BF4', '#6C7BFF', '#2FD8B0', '#FFC94A'];
const GLYPHS = ['❤️', '💛', '💚', '💙', '💜', '🧡', '✨'];

interface Particle {
  id: number;
  dx: number;
  dy: number;
  rotate: number;
  scale: number;
  colour: string;
  glyph: string;
  delay: number;
}

let seq = 0;

/**
 * The burst that fires when a card is liked.
 *
 * Particles are absolutely positioned and animated with a CSS keyframe, so the
 * whole thing runs on the compositor — no layout, no per-frame JavaScript. They
 * unmount themselves when the animation ends rather than lingering as detached
 * nodes in a feed the user will scroll for a long time.
 *
 * Under prefers-reduced-motion nothing is emitted at all: a spray of moving
 * objects is exactly what that setting exists to prevent.
 */
export function LikeBurst({ fireKey }: { fireKey: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (fireKey === 0 || reduced.current) return;
    const batch: Particle[] = Array.from({ length: 12 }, (_, n) => {
      // A cone upward rather than a full circle: particles falling downward
      // read as debris, not celebration.
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.1;
      const distance = 46 + Math.random() * 62;
      return {
        id: seq++,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        rotate: (Math.random() - 0.5) * 140,
        scale: 0.55 + Math.random() * 0.75,
        colour: COLOURS[n % COLOURS.length]!,
        glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!,
        delay: Math.random() * 90,
      };
    });
    setParticles((p) => [...p, ...batch]);
    const ids = new Set(batch.map((b) => b.id));
    const t = setTimeout(() => setParticles((p) => p.filter((x) => !ids.has(x.id))), 1000);
    return () => clearTimeout(t);
  }, [fireKey]);

  if (particles.length === 0) return null;

  return (
    <span aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
      <style>{`
        @keyframes sachmuch-burst {
          0%   { opacity: 0; transform: translate3d(0,0,0) scale(0.3) rotate(0deg); }
          18%  { opacity: 1; }
          100% { opacity: 0;
                 transform: translate3d(var(--dx), var(--dy), 0) scale(var(--s)) rotate(var(--r)); }
        }
      `}</style>
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            fontSize: 15,
            color: p.colour,
            textShadow: `0 0 10px ${p.colour}`,
            animation: `sachmuch-burst 780ms cubic-bezier(0.18,0.9,0.3,1) ${p.delay}ms both`,
            ['--dx' as string]: `${p.dx}px`,
            ['--dy' as string]: `${p.dy}px`,
            ['--s' as string]: String(p.scale),
            ['--r' as string]: `${p.rotate}deg`,
          }}
        >
          {p.glyph}
        </span>
      ))}
    </span>
  );
}
