import React, { type ReactNode } from "react";
import {
  ScrollView,
  View,
  useWindowDimensions,
  type ViewStyle,
} from "react-native";
export function useExpandedReading() {
  const { height, fontScale } = useWindowDimensions();
  return fontScale > 1.3 || height < 700;
}
/** Large text gets one document scroll, keeping all chrome and actions reachable. */
export function ReadingLayout({
  expanded,
  style,
  children,
  testID,
}: {
  expanded: boolean;
  style: ViewStyle;
  children: ReactNode;
  testID?: string;
}) {
  return expanded ? (
    <ScrollView
      testID={testID}
      style={{ flex: 1, backgroundColor: style.backgroundColor }}
      contentContainerStyle={{ ...style, flex: undefined, flexGrow: 1 }}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={style}>{children}</View>
  );
}
