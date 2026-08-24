import { BRAND } from '../brand';

export interface BylineProps {
  /** Cap height in px; the badge scales with it. */
  size?: number;
  /** Muted on a card, full strength on a share card. */
  emphasis?: 'quiet' | 'full';
}

/**
 * The verified badge.
 *
 * Drawn as an SVG rather than set as an emoji: the ✓ and ☑ emoji render as a
 * different shape, weight and colour on every platform, and a badge that looks
 * like a different badge on Android than on iOS is worse than none. The gold is
 * a three-stop gradient so it reads as metal rather than as a flat yellow disc.
 */
export function VerifiedBadge({ size = 14 }: { size?: number }) {
  const id = 'sachmuch-gold';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label="verified"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE9A3" />
          <stop offset="45%" stopColor="#F5C23E" />
          <stop offset="100%" stopColor="#C98A11" />
        </linearGradient>
      </defs>
      {/* The scalloped rosette, as twelve points around a circle. */}
      <path
        fill={`url(#${id})`}
        d="M12 1.6l2.2 1.9 2.9-.5 1.2 2.7 2.7 1.2-.5 2.9 1.9 2.2-1.9 2.2.5 2.9-2.7 1.2-1.2 2.7-2.9-.5L12 22.4l-2.2-1.9-2.9.5-1.2-2.7-2.7-1.2.5-2.9L1.6 12l1.9-2.2-.5-2.9 2.7-1.2 1.2-2.7 2.9.5z"
      />
      <path
        fill="#3A2600"
        d="M10.6 15.4l-3-3 1.3-1.3 1.7 1.7 4.5-4.5 1.3 1.3z"
      />
    </svg>
  );
}

/**
 * The creator byline that sits on every card.
 *
 * Deliberately quiet: it is a signature, not a call to action, and it appears on
 * every single fact. Anything louder would become the clutter the action row was
 * cut back to avoid.
 */
export function Byline({ size = 12, emphasis = 'quiet' }: BylineProps) {
  return (
    <a
      href={BRAND.instagram}
      target="_blank"
      rel="noreferrer noopener"
      onClick={(e) => e.stopPropagation()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: 0.2,
        textDecoration: 'none',
        color: emphasis === 'full' ? 'var(--clay-ink)' : 'var(--clay-ink-soft)',
        opacity: emphasis === 'full' ? 1 : 0.85,
        width: 'fit-content',
      }}
    >
      {BRAND.display}
      <VerifiedBadge size={Math.round(size * 1.15)} />
    </a>
  );
}
