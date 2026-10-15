import React, { useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "../state/AppStateProvider";
import { useAppTheme } from "../theme";
import { strings } from "../i18n";
import { Action, Heading, Notice, Surface } from "../components/Surface";
import { Icon } from "../components/Icon";
import type { Preferences } from "../state/storage";
export function SettingsScreen() {
  const { state, setPreferences } = useAppState();
  const t = useAppTheme();
  const s = strings(state.preferences.language);
  const insets = useSafeAreaInsets();
  const [error, setError] = useState(false);
  async function change(patch: Partial<Preferences>) {
    try {
      await setPreferences(patch);
      setError(false);
    } catch {
      setError(true);
    }
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingHorizontal: 22,
        paddingBottom: 30,
        gap: 16,
      }}
    >
      <Heading
        eyebrow={s.preferences}
        title={s.settingsTitle}
        subtitle={s.settingsSubtitle}
      />
      {error && <Notice text={s.saveError} />}
      <Surface>
        <Text style={{color: t.muted, fontSize: 14}}>{s.loved}</Text>
        <Text accessibilityLabel={`${s.loved}: ${state.lovedIds.length}`} style={{color: t.accent, fontSize: 40, fontWeight: "700", marginVertical: 8}}>{state.lovedIds.length}</Text>
        <Text style={{color: t.muted, fontSize: 13}}>{s.lovedBody}</Text>
      </Surface>
      <Surface>
        <View style={{flexDirection: "row", alignItems: "center", gap: 16}}>
          <View style={{flex: 1, gap: 6}}><Text style={{color: t.ink, fontSize: 17, fontWeight: "600"}}>{s.music}</Text><Text style={{color: t.muted, fontSize: 13, lineHeight: 20}}>{s.musicBody}</Text></View>
          <Switch accessibilityLabel={s.music} value={state.preferences.music} onValueChange={(music) => { void change({music}); }} trackColor={{true: t.accent, false: t.border}} />
        </View>
        {state.preferences.music && <View style={{flexDirection: "row", gap: 10, marginTop: 16}}>{([0.06, 0.12] as const).map((musicVolume) => <Action key={musicVolume} label={musicVolume === 0.06 ? s.softer : s.soft} selected={state.preferences.musicVolume === musicVolume} onPress={() => { void change({musicVolume}); }} />)}</View>}
      </Surface>
      <Surface>
        <Text
          style={{
            color: t.ink,
            fontSize: 17,
            fontWeight: "600",
            marginBottom: 16,
          }}
        >
          {s.language}
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {(["en", "hi"] as const).map((language) => (
            <View key={language} style={{ flex: 1 }}>
              <Action
                label={language === "en" ? s.english : s.hindi}
                selected={state.preferences.language === language}
                primary={state.preferences.language === language}
                onPress={() => {
                  void change({ language });
                }}
              />
            </View>
          ))}
        </View>
      </Surface>
      <Surface>
        <Text
          style={{
            color: t.ink,
            fontSize: 17,
            fontWeight: "600",
            marginBottom: 16,
          }}
        >
          {s.appearance}
        </Text>
        <View style={{ gap: 8 }}>
          {(["system", "light", "dark"] as const).map((appearance) => (
            <Action
              key={appearance}
              label={s[appearance]}
              selected={state.preferences.appearance === appearance}
              icon={
                appearance === "dark"
                  ? "moon"
                  : appearance === "light"
                    ? "sun"
                    : "settings"
              }
              primary={state.preferences.appearance === appearance}
              onPress={() => {
                void change({ appearance });
              }}
            />
          ))}
        </View>
      </Surface>
      <Surface>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: t.ink, fontSize: 17, fontWeight: "600" }}>
              {s.haptics}
            </Text>
            <Text style={{ color: t.muted, lineHeight: 20, fontSize: 13 }}>
              {s.hapticsBody}
            </Text>
          </View>
          <Switch
            accessibilityLabel={s.haptics}
            value={state.preferences.haptics}
            onValueChange={(haptics) => {
              void change({ haptics });
            }}
            trackColor={{ true: t.accent, false: t.border }}
          />
        </View>
      </Surface>
      <Surface>
        <View style={{ gap: 12 }}>
          <Text style={{ color: t.ink, fontWeight: "600", fontSize: 17 }}>
            {s.storage}
          </Text>
          <Text style={{ color: t.muted, fontSize: 15, lineHeight: 24 }}>
            {s.storageBody}
          </Text>
        </View>
      </Surface>
      <View style={{ alignItems: "center", gap: 14, paddingVertical: 24 }}>
        <Icon name="spark" size={26} color={t.accent} />
        <Text style={{ fontSize: 10, letterSpacing: 1.3, color: t.muted }}>
          {s.about}
        </Text>
        <Text style={{ fontSize: 36, color: t.accent, fontWeight: "700" }}>
          {s.aboutWord}
        </Text>
        <Text style={{ fontSize: 13, color: t.muted }}>{s.aboutBody}</Text>
      </View>
    </ScrollView>
  );
}
