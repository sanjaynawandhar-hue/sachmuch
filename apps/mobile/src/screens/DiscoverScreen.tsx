import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  AppState,
  PanResponder,
  Share,
  Text,
  View,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  buildFeed,
  balanceTopics,
  isDiscoveryFact,
  type BilingualMobileFact,
  type MobileFact,
} from "@sachmuch/core";
import { useAppState } from "../state/AppStateProvider";
import { useFeed } from "../feed/useFeed";
import { resolveCurrentId, selectLanguageFacts } from "../feed/selection";
import { useAppTheme } from "../theme";
import { strings } from "../i18n";
import { Action, Heading, Notice, Surface } from "../components/Surface";
import { FactPager } from "../components/FactPager";
import { FactReader } from "../components/FactReader";
import { SourceSheet } from "../components/SourceSheet";
import { LanguagePicker } from "../components/LanguagePicker";
import { ReadingLayout, useExpandedReading } from "../components/ReadingLayout";
import { Icon } from "../components/Icon";
export function DiscoverScreen({
  origin = process.env.EXPO_PUBLIC_API_URL ?? "",
  previewFacts,
}: {
  origin?: string;
  previewFacts?: BilingualMobileFact[];
}) {
  const expanded = useExpandedReading();
  const feed = useFeed(origin, !previewFacts);
  const { state, toggleSaved, toggleLoved, recordSignal } = useAppState();
  const t = useAppTheme();
  const lang = state.preferences.language;
  const s = strings(lang);
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const data = previewFacts ?? feed.facts;
  const affinity = useRef(state.affinity);
  affinity.current = state.affinity;
  const orderCache = useRef<BilingualMobileFact[]>([]);
  const ordered = useMemo(() => {
    const current = new Map(data.map((f) => [f.en.id, f]));
    const retained = orderCache.current.filter((f) => current.has(f.en.id)).map((f) => current.get(f.en.id)!);
    const previous = new Set(retained.map((f) => f.en.id));
    const fresh = data.filter((f) => !previous.has(f.en.id) && isDiscoveryFact(f.en));
    const byId = new Map(fresh.map((f) => [f.en.id, f]));
    const result = [...retained, ...balanceTopics(buildFeed(fresh.map((f) => f.en), affinity.current, fresh.length)).map((f) => byId.get(f.id)!)];
    orderCache.current = result;
    return result;
  }, [data]);
  const facts = useMemo(
    () => selectLanguageFacts(ordered, lang),
    [ordered, lang],
  );
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [notice, setNotice] = useState<"save" | "action" | null>(null);
  const [source, setSource] = useState<MobileFact | null>(null);
  const selected = resolveCurrentId(facts, currentId);
  const index = facts.findIndex((f) => f.id === selected);
  const fact = facts[index];
  useEffect(() => {
    if (!previewFacts && feed.hasMore && index >= facts.length - 10 && !feed.error) void feed.loadMore();
  }, [index, data, facts.length, feed.hasMore, feed.loadMore, feed.error, previewFacts]);
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  const signal = useRef(recordSignal);
  signal.current = recordSignal;
  const translate = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const listener = AppState.addEventListener("change", (v) =>
      setForeground(v === "active"),
    );
    return () => listener.remove();
  }, []);
  useEffect(() => {
    setEnded(false);
  }, [lang, data]);
  useEffect(() => {
    if (selected !== currentId) setCurrentId(selected);
  }, [selected, currentId]);
  useEffect(() => {
    if (!fact || !focused || !foreground || source || ended) return;
    const start = Date.now();
    return () => {
      void signal
        .current({
          factId: fact.id,
          categoryId: fact.categoryId,
          dwellMs: Math.max(0, Date.now() - start),
        })
        .catch(() => {});
    };
  }, [fact?.id, focused, foreground, !!source, ended]);
  function move(delta: number) {
    if (!fact || (delta < 0 && index === 0)) return;
    if (index + delta >= facts.length) {
      if (feed.hasMore) { void feed.loadMore(); return; }
      setEnded(true);
      return;
    }
    setCurrentId(facts[index + delta]!.id);
    setNotice(null);
    if (!t.reduceMotion) {
      translate.setValue(delta > 0 ? 12 : -12);
      Animated.timing(translate, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
    if (state.preferences.haptics)
      void Haptics.selectionAsync().catch(() => {});
  }
  const moveRef = useRef(move);
  moveRef.current = move;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dy) > 12 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderRelease: (_e, g) => {
          if (Math.abs(g.dy) > 35) moveRef.current(g.dy < 0 ? 1 : -1);
        },
      }),
    [],
  );
  async function save(target = fact) {
    if (!target) return;
    const original = data.find((f) => f.en.id === target.id);
    if (!original) return;
    try {
      await toggleSaved(original);
      setNotice(null);
    } catch {
      setNotice("save");
    }
  }
  async function love(target = fact) {
    if (!target) return;
    try { await toggleLoved(target.id); setNotice(null); } catch { setNotice("save"); }
  }
  async function share(target = fact) {
    if (!target) return;
    try {
      await Share.share({
        message: `${target.hook}\n\n${target.body}\n\n${s.sourced}: ${target.publisher}\n${target.sourceUrl}`,
      });
    } catch {
      setNotice("action");
    }
  }
  return (
    <ReadingLayout
      expanded={expanded}
      testID="accessible-discover-scroll"
      style={{
        flex: 1,
        backgroundColor: t.bg,
        paddingTop: insets.top,
        paddingHorizontal: 22,
        paddingBottom: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 8,
        }}
      >
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Icon name="spark" color={t.accent} size={24} filled />
          <Text
            style={{
              fontSize: 23,
              fontWeight: "700",
              letterSpacing: -0.8,
              color: t.ink,
            }}
          >
            {s.brand}
            <Text style={{ color: t.accent }}>.</Text>
          </Text>
        </View>
        <LanguagePicker onError={() => setNotice("save")} />
      </View>
      <Text
        style={{
          color: t.muted,
          fontSize: 13,
          paddingTop: 12,
          paddingBottom: 4,
        }}
      >
        {s.subtitle}
      </Text>
      {previewFacts && (
        <Text
          style={{
            color: t.accent,
            fontSize: 10,
            fontWeight: "700",
            paddingBottom: 6,
          }}
        >
          {s.sample}
        </Text>
      )}
      {notice && (
        <Notice text={notice === "save" ? s.saveError : s.actionError} />
      )}
      {!previewFacts && feed.error && facts.length > 0 && (
        <View style={{ gap: 6, marginBottom: 8 }}>
          <Notice text={s.cachedFeed} />
          <Action label={s.retry} onPress={feed.refresh} />
        </View>
      )}
      {ended ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Surface>
            <View
              style={{ gap: 20, alignItems: "center", paddingVertical: 30 }}
            >
              <Icon name="spark" size={50} color={t.accent} />
              <Text
                style={{
                  color: t.ink,
                  fontSize: 27,
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                {s.end}
              </Text>
              <Text style={{ color: t.muted, textAlign: "center" }}>
                {s.endBody}
              </Text>
              <Action
                label={s.revisit}
                primary
                onPress={() => {
                  setCurrentId(facts[0]?.id ?? null);
                  setEnded(false);
                }}
              />
              <Action
                label={s.refresh}
                onPress={() => {
                  setEnded(false);
                  feed.refresh();
                }}
              />
            </View>
          </Surface>
        </View>
      ) : fact ? (
        <>
          <View
            {...pan.panHandlers}
            accessible
            accessibilityLabel={s.swipe}
            accessibilityRole="adjustable"
            accessibilityActions={[{name: "increment", label: s.next}, {name: "decrement", label: s.previous}]}
            onAccessibilityAction={(e) => move(e.nativeEvent.actionName === "increment" ? 1 : -1)}
            style={{
              paddingVertical: 12,
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontSize: 10,
                letterSpacing: 1.4,
                color: t.muted,
                fontWeight: "600",
              }}
            >
              {s.swipe}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: t.accent,
                fontVariant: ["tabular-nums"],
              }}
            >
              {String(index + 1).padStart(2, "0")} /{" "}
              {String(facts.length).padStart(2, "0")}{feed.hasMore ? "+" : ""}
            </Text>
          </View>
          {expanded ? (
            <Animated.View
              style={{
                flex: expanded ? undefined : 1,
                transform: [{ translateY: translate }],
              }}
            >
              <FactReader
                expanded={expanded}
                key={`${fact.id}-${lang}`}
                fact={fact}
                language={lang}
                loved={state.lovedIds.includes(fact.id)}
                onLove={() => { void love(); }}
                saved={state.saved.some((e) => e.fact.en.id === fact.id)}
                onSave={() => {
                  void save();
                }}
                onShare={() => {
                  void share();
                }}
                onSource={() => setSource(fact)}
              />
            </Animated.View>
          ) : (
            <FactPager
              facts={facts}
              index={Math.max(0, index)}
              language={lang}
              lovedIds={state.lovedIds}
              onLove={(f) => { void love(f); }}
              savedIds={state.saved.map((e) => e.fact.en.id)}
              onIndexChange={(next) => {
                setCurrentId(facts[next]!.id);
                setNotice(null);
                if (state.preferences.haptics)
                  void Haptics.selectionAsync().catch(() => {});
              }}
              onSave={(f) => {
                void save(f);
              }}
              onShare={(f) => {
                void share(f);
              }}
              onSource={setSource}
            />
          )}
        </>
      ) : (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Surface>
            <View
              style={{ gap: 20, paddingVertical: 28, alignItems: "center" }}
            >
              {feed.status === "loading" && !previewFacts ? (
                <>
                  <ActivityIndicator color={t.accent} />
                  <Text style={{ color: t.muted }}>{s.loading}</Text>
                </>
              ) : (
                <>
                  <Icon name="spark" size={42} color={t.accent} />
                  <Text
                    style={{
                      color: t.ink,
                      fontSize: 24,
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  >
                    {feed.error && !previewFacts
                      ? feed.error === "configuration"
                        ? s.configuration
                        : s.error
                      : s.empty}
                  </Text>
                  <Text
                    style={{
                      color: t.muted,
                      fontSize: 16,
                      lineHeight: 25,
                      textAlign: "center",
                    }}
                  >
                    {feed.error && !previewFacts
                      ? feed.error === "configuration"
                        ? s.configurationBody
                        : s.errorBody
                      : s.emptyBody}
                  </Text>
                  <Action primary label={s.retry} onPress={feed.refresh} />
                </>
              )}
            </View>
          </Surface>
        </View>
      )}
      <SourceSheet fact={source} onClose={() => setSource(null)} />
    </ReadingLayout>
  );
}
