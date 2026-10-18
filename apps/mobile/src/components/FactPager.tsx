import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import type { MobileFact } from "@sachmuch/core";
import { useAppTheme } from "../theme";
import { strings } from "../i18n";
import { CardContent } from "./CardContent";
import { Action } from "./Surface";

/** Native paging keeps finger tracking and deceleration off the JS thread.
 * The complete fact is readable on its card. */
export function FactPager({
  facts,
  index,
  language,
  savedIds,
  lovedIds = [],
  onLove,
  onIndexChange,
  onSave,
  onShare,
  onSource,
}: {
  facts: MobileFact[];
  index: number;
  language: "en" | "hi";
  savedIds: string[];
  lovedIds?: string[];
  onLove?: (fact: MobileFact) => void;
  onIndexChange: (index: number) => void;
  onSave: (fact: MobileFact) => void;
  onShare: (fact: MobileFact) => void;
  onSource: (fact: MobileFact) => void;
}) {
  const t = useAppTheme();
  const s = strings(language);
  const { height: windowHeight } = useWindowDimensions();
  const [height, setHeight] = useState(Math.max(240, windowHeight - 240));
  const list = useRef<FlatList<MobileFact>>(null);
  const settled = useRef(index);
  const previousFacts = useRef(facts);
  useEffect(() => {
    if (height > 0 && index !== settled.current) {
      list.current?.scrollToOffset({
        offset: index * height,
        animated: previousFacts.current === facts && !t.reduceMotion,
      });
      settled.current = index;
    }
    previousFacts.current = facts;
  }, [index, height, t.reduceMotion, facts]);
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
          extraData={{ language, savedIds, lovedIds }}
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
          renderItem={({ item, index: cardIndex }) => (
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
                <CardContent onBoundary={(delta) => onIndexChange(Math.max(0, Math.min(facts.length - 1, cardIndex + delta)))}>
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
                  {item.attributionText && <Text style={{color:t.muted,fontSize:10}}>{item.attributionText}</Text>}
                </CardContent>
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
                    <Action compact icon="heart" selected={lovedIds.includes(item.id)} label={lovedIds.includes(item.id) ? s.unlove : s.love} onPress={() => onLove?.(item)} />
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

    </View>
  );
}
