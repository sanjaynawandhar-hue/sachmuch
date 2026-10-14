import React, { type ReactNode } from "react";
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { useAppTheme } from "../theme";
import { Icon, type IconName } from "./Icon";
export function Surface({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const t = useAppTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.card,
          borderColor: t.border,
          borderWidth: 1,
          borderRadius: 28,
          padding: 22,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Action({
  label,
  onPress,
  icon,
  primary,
  disabled = false,
  compact = false,
  selected = false,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  primary?: boolean;
  disabled?: boolean;
  compact?: boolean;
  selected?: boolean;
}) {
  const t = useAppTheme();
  const color = primary
    ? t.scheme === "dark"
      ? "#251837"
      : "#FFFFFF"
    : t.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: primary ? t.accent : t.tint,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
          paddingHorizontal: compact ? 13 : 18,
        },
      ]}
    >
      {icon && (
        <Icon
          name={icon}
          color={color}
          filled={selected && icon === "bookmark"}
        />
      )}
      {!compact && (
        <Text style={{ color, fontWeight: "600", fontSize: 15, flexShrink: 1 }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
export function Heading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  const t = useAppTheme();
  return (
    <View style={{ gap: 8, paddingTop: 20, paddingBottom: 22 }}>
      <Text
        style={{
          color: t.accent,
          letterSpacing: 2.2,
          fontSize: 11,
          fontWeight: "700",
        }}
      >
        {eyebrow}
      </Text>
      <Text
        accessibilityRole="header"
        style={{
          color: t.ink,
          fontSize: 36,
          fontWeight: "700",
          letterSpacing: -1.4,
        }}
      >
        {title}
      </Text>
      <Text style={{ color: t.muted, fontSize: 15, lineHeight: 23 }}>
        {subtitle}
      </Text>
    </View>
  );
}
export function Notice({ text }: { text: string }) {
  const t = useAppTheme();
  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        color: t.danger,
        backgroundColor: t.soft,
        padding: 12,
        borderRadius: 14,
        fontSize: 14,
      }}
    >
      {text}
    </Text>
  );
}
const styles = StyleSheet.create({
  action: {
    minHeight: 48,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
  },
});
