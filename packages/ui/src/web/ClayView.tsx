import type { CSSProperties, ReactNode } from 'react';
import { radius as radii, type RadiusKey } from '../tokens/space';
import type { ClayLevel, ClayState } from '../tokens/clay';

export interface ClayViewProps {
  level?: ClayLevel;
  state?: ClayState;
  radius?: RadiusKey;
  /** Category tint, or any explicit fill. Falls through to the scheme default. */
  background?: string;
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
}

/**
 * The clay surface on the web. Reads the CSS custom properties emitted by
 * scripts/emit-css.ts so it inherits the scheme without a React context.
 */
export function ClayView({
  level = 2,
  state = 'raised',
  radius = 'lg',
  background,
  style,
  className,
  children,
}: ClayViewProps) {
  const shadowVar =
    state === 'flat' ? 'none' : `var(--clay-${state === 'pressed' ? 'pressed' : 'raised'}-${level})`;
  return (
    <div
      className={className}
      style={{
        borderRadius: radii[radius],
        background: background ?? `var(--clay-${state === 'pressed' ? 'sunken' : 'surface'})`,
        boxShadow: shadowVar,
        transition: 'box-shadow 180ms var(--ease-press), background 180ms var(--ease-press)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
