import React, { useState } from "react";
import { FlatList, Pressable, Share, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MobileFact } from "@sachmuch/core";
import { useAppState } from "../state/AppStateProvider";
import { useAppTheme } from "../theme";
import { strings } from "../i18n";
import { Action, Heading, Notice, Surface } from "../components/Surface";
import { FactReader } from "../components/FactReader";
import { SourceSheet } from "../components/SourceSheet";
import { Icon } from "../components/Icon";
export function SavedScreen() {
  const { state, toggleSaved } = useAppState();
  const t = useAppTheme();
  const s = strings(state.preferences.language);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [id, setId] = useState<string | null>(null);
  const [english, setEnglish] = useState(false);
  const [source, setSource] = useState<MobileFact | null>(null);
  const [error, setError] = useState<"save" | "action" | null>(null);
  const entry = state.saved.find((e) => e.fact.en.id === id);
  const lang = english ? "en" : state.preferences.language;
  const fact = entry?.fact[lang];
  async function remove() {
    if (!entry) return;
    try {
      await toggleSaved(entry.fact);
      setId(null);
      setError(null);
    } catch {
      setError("save");
    }
  }
  async function share() {
    if (!fact) return;
    try {
      await Share.share({
        message: `${fact.hook}\n\n${fact.body}\n\n${fact.publisher}\n${fact.sourceUrl}`,
      });
    } catch {
      setError("action");
    }
  }
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.bg,
        paddingTop: insets.top + 12,
        paddingHorizontal: 22,
        paddingBottom: 18,
      }}
    >
      {entry ? (
        <>
          <View style={{ marginBottom: 14, alignItems: "flex-start" }}>
            <Action
              label={s.back}
              icon="back"
              onPress={() => {
                setId(null);
                setError(null);
              }}
            />
          </View>
          <Text style={{ color: t.muted, fontSize: 12, marginBottom: 10 }}>
            {s.savedCopy} ·{" "}
            {new Date(entry.savedAt).toLocaleDateString(
              state.preferences.language === "hi" ? "hi-IN" : "en-IN",
            )}
          </Text>
          {error && (
            <Notice text={error === "save" ? s.saveError : s.actionError} />
          )}
          {fact ? (
            <FactReader
              fact={fact}
              language={lang}
              saved
              onSave={() => {
                void remove();
              }}
              onShare={() => {
                void share();
              }}
              onSource={() => setSource(fact)}
            />
          ) : (
            <Surface>
              <View style={{ gap: 16 }}>
                <Text style={{ color: t.ink, fontSize: 20 }}>
                  {s.missingHindi}
                </Text>
                <Action
                  label={s.viewEnglish}
                  primary
                  onPress={() => setEnglish(true)}
                />
                <Action
                  label={s.unsave}
                  onPress={() => {
                    void remove();
                  }}
                />
              </View>
            </Surface>
          )}
        </>
      ) : (
        <>
          <Heading
            eyebrow={s.collection}
            title={s.savedTitle}
            subtitle={s.savedSubtitle}
          />
          {state.saved.length > 0 ? (
            <>
              <Text
                style={{
                  color: t.accent,
                  fontSize: 12,
                  fontWeight: "600",
                  marginBottom: 18,
                }}
              >
                {state.saved.length} {s.count}
              </Text>
              <FlatList
                data={state.saved}
                keyExtractor={(e) => e.fact.en.id}
                contentContainerStyle={{ gap: 14, paddingBottom: 20 }}
                renderItem={({ item }) => {
                  const f =
                    item.fact[state.preferences.language] ?? item.fact.en;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={f.hook}
                      onPress={() => {
                        setId(f.id);
                        setEnglish(false);
                        setError(null);
                      }}
                    >
                      <Surface>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            marginBottom: 12,
                          }}
                        >
                          <Text
                            style={{
                              color: t.accent,
                              fontSize: 12,
                              fontWeight: "700",
                            }}
                          >
                            {f.categoryEmoji} {f.categoryLabel}
                          </Text>
                          <Icon
                            name="bookmark"
                            color={t.accent}
                            filled
                            size={18}
                          />
                        </View>
                        <Text
                          style={{
                            color: t.ink,
                            fontSize: 21,
                            lineHeight: 29,
                            fontWeight: "600",
                          }}
                        >
                          {f.hook}
                        </Text>
                        {state.preferences.language === "hi" &&
                          !item.fact.hi && (
                            <Text
                              style={{
                                color: t.muted,
                                fontSize: 12,
                                marginTop: 8,
                              }}
                            >
                              {s.missingHindi}
                            </Text>
                          )}
                        <Text
                          style={{
                            color: t.muted,
                            fontSize: 12,
                            marginTop: 14,
                          }}
                        >
                          {s.savedCopy}
                        </Text>
                      </Surface>
                    </Pressable>
                  );
                }}
              />
            </>
          ) : (
            <View style={{ flex: 1, justifyContent: "center" }}>
              <Surface>
                <View
                  style={{ alignItems: "center", gap: 22, paddingVertical: 30 }}
                >
                  <View
                    style={{
                      padding: 22,
                      backgroundColor: t.tint,
                      borderRadius: 28,
                    }}
                  >
                    <Icon name="bookmark" color={t.accent} size={40} />
                  </View>
                  <Text
                    style={{
                      color: t.ink,
                      fontSize: 25,
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  >
                    {s.savedEmpty}
                  </Text>
                  <Text
                    style={{
                      color: t.muted,
                      lineHeight: 25,
                      fontSize: 16,
                      textAlign: "center",
                    }}
                  >
                    {s.savedEmptyBody}
                  </Text>
                  <Action
                    primary
                    label={s.explore}
                    icon="spark"
                    onPress={() => navigation.navigate("Discover")}
                  />
                </View>
              </Surface>
            </View>
          )}
        </>
      )}
      <SourceSheet fact={source} onClose={() => setSource(null)} />
    </View>
  );
}
