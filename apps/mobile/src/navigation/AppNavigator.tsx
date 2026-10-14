import React from "react";
import { StyleSheet, View } from "react-native";
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import { useAppState } from "../state/AppStateProvider";
import { useAppTheme } from "../theme";
import { strings } from "../i18n";
import { DiscoverScreen } from "../screens/DiscoverScreen";
import { SavedScreen } from "../screens/SavedScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { Icon, type IconName } from "../components/Icon";
const sampleFacts =
  __DEV__ && process.env.EXPO_PUBLIC_SAMPLE_MODE === "1"
    ? require("../preview/facts").previewFacts
    : undefined;
function DiscoverEntry() {
  return <DiscoverScreen previewFacts={sampleFacts} />;
}
const Tab = createBottomTabNavigator();
const icons: Record<string, IconName> = {
  Discover: "spark",
  Saved: "bookmark",
  Settings: "settings",
};
export function AppNavigator() {
  const t = useAppTheme();
  const { state } = useAppState();
  const s = strings(state.preferences.language);
  const theme = t.scheme === "dark" ? DarkTheme : DefaultTheme;
  return (
    <NavigationContainer
      theme={{
        ...theme,
        colors: {
          ...theme.colors,
          background: t.bg,
          card: t.card,
          text: t.ink,
          primary: t.accent,
          border: t.border,
        },
      }}
    >
      <StatusBar style={t.scheme === "dark" ? "light" : "dark"} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: t.accent,
          tabBarInactiveTintColor: t.muted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
          tabBarStyle: {
            backgroundColor: t.reduceTransparency ? t.card : "transparent",
            borderTopColor: t.border,
            paddingTop: 8,
          },
          tabBarBackground: () =>
            t.reduceTransparency ? (
              <View
                style={[StyleSheet.absoluteFill, { backgroundColor: t.card }]}
              />
            ) : (
              <BlurView
                style={StyleSheet.absoluteFill}
                intensity={65}
                tint={t.scheme === "dark" ? "dark" : "light"}
              />
            ),
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name={icons[route.name] ?? "spark"}
              color={color}
              filled={focused && route.name === "Saved"}
            />
          ),
        })}
      >
        <Tab.Screen
          name="Discover"
          component={DiscoverEntry}
          options={{ title: s.discover }}
        />
        <Tab.Screen
          name="Saved"
          component={SavedScreen}
          options={{ title: s.saved }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: s.settings }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
