import React from "react";
import { Pressable, Text, View } from "react-native";
import { useAppState } from "../state/AppStateProvider";
import { useAppTheme } from "../theme";
export function LanguagePicker({ onError }: { onError: () => void }) {
  const { state, setPreferences } = useAppState();
  const t = useAppTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        borderRadius: 16,
        padding: 3,
        backgroundColor: t.tint,
      }}
    >
      {(["en", "hi"] as const).map((language) => (
        <Pressable
          key={language}
          accessibilityRole="button"
          accessibilityLabel={language === "en" ? "English" : "हिन्दी"}
          accessibilityState={{
            selected: state.preferences.language === language,
          }}
          onPress={() => {
            void setPreferences({ language }).catch(onError);
          }}
          style={{
            paddingHorizontal: 13,
            minHeight: 44,
            justifyContent: "center",
            borderRadius: 13,
            backgroundColor:
              state.preferences.language === language ? t.card : "transparent",
          }}
        >
          <Text
            style={{
              color: state.preferences.language === language ? t.ink : t.muted,
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            {language === "en" ? "EN" : "हि"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
