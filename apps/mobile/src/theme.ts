import { useEffect, useState } from "react";
import { AccessibilityInfo, useColorScheme } from "react-native";
import { useAppState } from "./state/AppStateProvider";
const light = {
  bg: "#F7F5FA",
  card: "#FFFFFF",
  ink: "#272033",
  muted: "#756B83",
  accent: "#7451BE",
  tint: "#ECE5F7",
  border: "#E4DFED",
  soft: "#F2EDF8",
  warm: "#F2E7D8",
  danger: "#9D354C",
};
const dark = {
  bg: "#17141F",
  card: "#25202E",
  ink: "#F6F0FF",
  muted: "#B5A9C4",
  accent: "#C3A2FF",
  tint: "#3C2E53",
  border: "#41354F",
  soft: "#302637",
  warm: "#43372F",
  danger: "#FFA6B7",
};
export function useAppTheme() {
  const { state } = useAppState();
  const device = useColorScheme();
  const scheme =
    state.preferences.appearance === "system"
      ? device === "dark"
        ? "dark"
        : "light"
      : state.preferences.appearance;
  const [reduceMotion, setReduceMotion] = useState(true);
  const [reduceTransparency, setReduceTransparency] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (active) setReduceMotion(v);
    });
    void AccessibilityInfo.isReduceTransparencyEnabled().then((v) => {
      if (active) setReduceTransparency(v);
    });
    const motion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    const transparency = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setReduceTransparency,
    );
    return () => {
      active = false;
      motion.remove();
      transparency.remove();
    };
  }, []);
  return {
    ...(scheme === "dark" ? dark : light),
    scheme,
    reduceMotion,
    reduceTransparency,
  };
}
