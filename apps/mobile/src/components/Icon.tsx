import React from "react";
import Svg, { Path, Circle } from "react-native-svg";
export type IconName =
  | "spark"
  | "bookmark"
  | "share"
  | "arrow"
  | "back"
  | "up"
  | "down"
  | "close"
  | "settings"
  | "external"
  | "sun"
  | "moon"
  | "check";
const paths: Record<IconName, string> = {
  spark: "M12 2l2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7Z",
  bookmark: "M6 4h12v17l-6-4-6 4Z",
  share: "M12 16V3m-4 4 4-4 4 4M5 13v7h14v-7",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  up: "M12 19V5m-6 6 6-6 6 6",
  down: "M12 5v14m-6-6 6 6 6-6",
  back: "M19 12H5m6-6-6 6 6 6",
  close: "m6 6 12 12M6 18 18 6",
  settings: "M4 7h16M4 17h16M9 4v6m6 4v6",
  external: "M14 3h7v7m0-7L10 14M10 5H4v15h15v-6",
  sun: "M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5",
  moon: "M20 15A8.5 8.5 0 0 1 9 4a8.5 8.5 0 1 0 11 11Z",
  check: "m5 12 4 4L19 6",
};
export function Icon({
  name,
  color,
  size = 22,
  filled = false,
}: {
  name: IconName;
  color: string;
  size?: number;
  filled?: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path
        d={paths[name]}
        stroke={color}
        strokeWidth={1.65}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? color : "none"}
      />
      {name === "sun" && (
        <Circle
          cx={12}
          cy={12}
          r={4}
          fill="none"
          stroke={color}
          strokeWidth={1.65}
        />
      )}
    </Svg>
  );
}
