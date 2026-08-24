import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { BRAND } from '../brand';
import { palette, type Scheme } from '../tokens/color';

/**
 * The verified badge, drawn from the same two paths and the same three gold
 * stops as the web version. Using SVG on both platforms is the point: a ✓ emoji
 * would render as a different shape and colour on Android than in the browser,
 * and the badge is a brand mark that has to look like itself everywhere.
 */
export function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="verified">
      <Defs>
        <LinearGradient id="sachmuchGold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#FFE9A3" />
          <Stop offset="45%" stopColor="#F5C23E" />
          <Stop offset="100%" stopColor="#C98A11" />
        </LinearGradient>
      </Defs>
      <Path
        fill="url(#sachmuchGold)"
        d="M12 1.6l2.2 1.9 2.9-.5 1.2 2.7 2.7 1.2-.5 2.9 1.9 2.2-1.9 2.2.5 2.9-2.7 1.2-1.2 2.7-2.9-.5L12 22.4l-2.2-1.9-2.9.5-1.2-2.7-2.7-1.2.5-2.9L1.6 12l1.9-2.2-.5-2.9 2.7-1.2 1.2-2.7 2.9.5z"
      />
      <Path fill="#3A2600" d="M10.6 15.4l-3-3 1.3-1.3 1.7 1.7 4.5-4.5 1.3 1.3z" />
    </Svg>
  );
}

export function Byline({
  size = 12, scheme = 'dark', emphasis = 'quiet',
}: { size?: number; scheme?: Scheme; emphasis?: 'quiet' | 'full' }) {
  const p = palette[scheme];
  return (
    <View style={styles.row}>
      <Text
        accessibilityRole="link"
        onPress={() => { void Linking.openURL(BRAND.instagram); }}
        style={[
          styles.handle,
          { fontSize: size, color: emphasis === 'full' ? p.ink : p.inkSoft },
        ]}
      >
        {BRAND.display}
      </Text>
      <VerifiedBadge size={Math.round(size * 1.15)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  handle: { fontWeight: '700', letterSpacing: 0.2 },
});
