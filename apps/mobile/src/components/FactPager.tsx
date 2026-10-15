import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import type { MobileFact } from "@sachmuch/core";
import { useAppTheme } from "../theme";
import { strings } from "../i18n";
import { Action } from "./Surface";
import { FactReader } from "./FactReader";

/** Native paging keeps finger tracking and deceleration off the JS thread.
 * Full text opens separately, so a nested text scroller cannot steal feed swipes. */
export function FactPager({
  facts,
  index,
  language,
  savedIds,
  onIndexChange,
  onSave,
  onShare,
  onSource,
}: {
  facts: MobileFact[];
  index: number;
  language: "en" | "hi";
  savedIds: string[];
  onIndexChange: (index: number) => void;
  onSave: (fact: MobileFact) => void;
  onShare: (fact: MobileFact) => void;
  onSource: (fact: MobileFact) => void;
}) {
  const t = useAppTheme();
  const s = strings(language);
  const { height: windowHeight } = useWindowDimensions();
  const [height, setHeight] = useState(Math.max(240, windowHeight - 240));
  const [reading, setReading] = useState<MobileFact | null>(null);
  const list = useRef<FlatList<MobileFact>>(null);
  const settled = useRef(index);
  useEffect(() => {
    if (height > 0 && index !== settled.current) {
      list.current?.scrollToOffset({
        offset: index * height,
        animated: !t.reduceMotion,
      });
      settled.current = index;
    }
  }, [index, height, t.reduceMotion]);
  useEffect(() => {
    if (height > 0)
      list.current?.scrollToOffset({ offset: index * height, animated: false });
  }, [height, language]);
  function settle(y: number) {
    const next = Math.max(
      0,
      Math.min(facts.length - 1, Math.round(y / height)),
    );
    if (height > 0 && next !== settled.current) {
      settled.current = next;
      onIndexChange(next);
    }
  }
  return (
    <View
      testID="vertical-fact-pager"
      style={{ flex: 1 }}
      onLayout={(e) => setHeight(Math.round(e.nativeEvent.layout.height))}
    >
      {height > 0 && (
        <FlatList
          ref={list}
          testID="vertical-fact-list"
          data={facts}
          keyExtractor={(f) => f.id}
          pagingEnabled
          horizontal={false}
          decelerationRate="fast"
          disableIntervalMomentum
          showsVerticalScrollIndicator={false}
          bounces={false}
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          windowSize={3}
          extraData={{ language, savedIds }}
          getItemLayout={(_, i) => ({
            length: height,
            offset: height * i,
            index: i,
          })}
          onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
          onScrollEndDrag={(e) => {
            const y = e.nativeEvent.contentOffset.y;
            if (Math.abs(y / height - Math.round(y / height)) < 0.01) settle(y);
          }}
          renderItem={({ item }) => (
            <View style={{ height, paddingBottom: 10 }}>
              <View
                style={{
                  flex: 1,
                  borderRadius: 28,
                  backgroundColor: t.card,
                  borderColor: t.border,
                  borderWidth: 1,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{ flex: 1, padding: 22, gap: 14, overflow: "hidden" }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      color: t.accent,
                      fontSize: 12,
                      fontWeight: "700",
                      letterSpacing: 1,
                    }}
                  >
                    {item.categoryEmoji}{" "}
                    {item.categoryLabel.toLocaleUpperCase(language)}
                  </Text>
                  <Text
                    accessibilityRole="header"
                    numberOfLines={3}
                    style={{
                      color: t.ink,
                      fontSize: height < 450 ? 24 : 29,
                      lineHeight: language === "hi" ? 39 : 35,
                      fontWeight: "600",
                      letterSpacing: language === "hi" ? 0 : -0.7,
                    }}
                  >
                    {item.hook}
                  </Text>
                  {item.image && height > 540 && (
                    <Image
                      source={{ uri: item.image.url }}
                      accessibilityLabel={item.image.alt}
                      style={{
                        height: Math.min(160, height * 0.22),
                        width: "100%",
                        borderRadius: 16,
                      }}
                      resizeMode="cover"
                    />
                  )}
                  <Text
                    numberOfLines={
                      height < 450 ? 3 : item.image && height > 540 ? 3 : 6
                    }
                    style={{
                      color: t.muted,
                      fontSize: 16,
                      lineHeight: language === "hi" ? 28 : 26,
                      flexShrink: 1,
                    }}
                  >
                    {item.body}
                  </Text>
                  {item.image && height > 540 && (
                    <Text
                      numberOfLines={1}
                      style={{ color: t.muted, fontSize: 10 }}
                    >
                      {item.image.credit} {item.image.licence}
                    </Text>
                  )}
                  <View style={{ marginTop: "auto", gap: 8 }}>
                    <Text
                      numberOfLines={1}
                      style={{ color: t.muted, fontSize: 12 }}
                    >
                      {s.sourced}: {item.publisher}
                    </Text>
                    <Action
                      label={s.readFull}
                      onPress={() => setReading(item)}
                    />
                  </View>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    padding: 14,
                    borderTopWidth: 1,
                    borderColor: t.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Action
                      label={s.sources}
                      icon="external"
                      onPress={() => onSource(item)}
                    />
                  </View>
                  <Action
                    compact
                    selected={savedIds.includes(item.id)}
                    label={savedIds.includes(item.id) ? s.unsave : s.save}
                    icon="bookmark"
                    onPress={() => onSave(item)}
                  />
                  <Action
                    compact
                    label={s.share}
                    icon="share"
                    onPress={() => onShare(item)}
                  />
                </View>
              </View>
            </View>
          )}
        />
      )}
      <Modal
        visible={!!reading}
        animationType={t.reduceMotion ? "none" : "slide"}
        presentationStyle="pageSheet"
        onRequestClose={() => setReading(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: t.bg,
            padding: 18,
            paddingTop: 24,
          }}
        >
          <View style={{ alignItems: "flex-end", paddingBottom: 12 }}>
            <Action
              label={s.close}
              icon="close"
              onPress={() => setReading(null)}
            />
          </View>
          <ScrollView
            testID="full-fact-reader"
            contentContainerStyle={{ paddingBottom: 32 }}
          >
            {reading && (
              <FactReader
                expanded
                fact={reading}
                language={language}
                saved={savedIds.includes(reading.id)}
                onSave={() => onSave(reading)}
                onShare={() => onShare(reading)}
                onSource={() => {
                  setReading(null);
                  onSource(reading);
                }}
              />
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
