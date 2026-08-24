import React from 'react';
import { View, Platform, type ViewStyle, type StyleProp } from 'react-native';
import { clayNative, type ClayLevel, type ClayState } from '../tokens/clay';
import { radius as radii, type RadiusKey } from '../tokens/space';
import type { Scheme } from '../tokens/color';

export interface ClayViewProps {
  scheme?: Scheme;
  level?: ClayLevel;
  state?: ClayState;
  radius?: RadiusKey;
  background?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * The clay surface on native.
 *
 * React Native >= 0.76 on the New Architecture implements the `boxShadow` style
 * prop, inset layers included, with the same geometry as CSS. Expo SDK 57 ships
 * RN 0.87, so this is the real recipe rather than an approximation — the same
 * four layers produced by the same function the web uses.
 *
 * Verified against the installed types: ViewStyle carries
 * `boxShadow?: ReadonlyArray<BoxShadowValue>`, and BoxShadowValue carries
 * `inset?: boolean`. No cast is needed, which is the strongest signal that this
 * is the real recipe and not an approximation.
 *
 * `supportsInsetShadow` guards the old architecture, where the prop is ignored:
 * there we fall back to a flat surface plus the legacy elevation/shadow props,
 * which loses the puff but never crashes.
 */
const supportsInsetShadow = Platform.OS !== 'web';

export function ClayView({
  scheme = 'light',
  level = 2,
  state = 'raised',
  radius = 'lg',
  background,
  style,
  children,
}: ClayViewProps) {
  const clay = clayNative({ scheme, level, state, ...(background ? { background } : {}) });

  const base: ViewStyle = {
    borderRadius: radii[radius],
    backgroundColor: background ?? clay.backgroundColor,
  };

  if (supportsInsetShadow) {
    return <View style={[base, { boxShadow: clay.boxShadow }, style]}>{children}</View>;
  }

  const outer = clay.boxShadow.find((l) => !l.inset);
  const legacy: ViewStyle = outer
    ? {
        shadowColor: '#000',
        shadowOpacity: state === 'pressed' ? 0 : 0.18,
        shadowRadius: outer.blurRadius / 2,
        shadowOffset: { width: outer.offsetX / 2, height: outer.offsetY / 2 },
        elevation: state === 'pressed' ? 0 : level * 4,
      }
    : {};
  return <View style={[base, legacy, style]}>{children}</View>;
}
