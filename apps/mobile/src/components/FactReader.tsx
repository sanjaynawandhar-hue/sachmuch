import React from "react";
import { Image, ScrollView, Text, View } from "react-native";
import type { MobileFact } from "@sachmuch/core";
import { strings } from "../i18n";
import { useAppTheme } from "../theme";
import { Action } from "./Surface";
export function FactReader({
  fact,
  language,
  saved,
  onSave,
  onShare,
  onSource,
}: {
  fact: MobileFact;
  language: "en" | "hi";
  saved: boolean;
  onSave: () => void;
  onShare: () => void;
  onSource: () => void;
}) {
  const t = useAppTheme();
  const s = strings(language);
  return (
    <View
      style={{
        flex: 1,
        minHeight: 200,
        borderRadius: 28,
        backgroundColor: t.card,
        borderWidth: 1,
        borderColor: t.border,
        overflow: "hidden",
      }}
    >
      <ScrollView
        testID="fact-body"
        contentContainerStyle={{ padding: 24, gap: 18 }}
        showsVerticalScrollIndicator
      >
        <View style={{ alignItems: "flex-start" }}>
          <View
            style={{
              backgroundColor: t.tint,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            <Text
              style={{
                color: t.accent,
                fontSize: 12,
                fontWeight: "700",
                letterSpacing: 1,
              }}
            >
              {fact.categoryEmoji}{" "}
              {fact.categoryLabel.toLocaleUpperCase(language)}
            </Text>
          </View>
        </View>
        <Text
          accessibilityRole="header"
          style={{
            color: t.ink,
            fontSize: 29,
            fontWeight: "600",
            letterSpacing: language === "hi" ? 0 : -0.8,
            lineHeight: language === "hi" ? 43 : 37,
          }}
        >
          {fact.hook}
        </Text>
        <View
          style={{
            width: 32,
            height: 3,
            borderRadius: 2,
            backgroundColor: t.accent,
            opacity: 0.5,
          }}
        />
        <Text
          style={{
            color: t.muted,
            fontSize: 17,
            lineHeight: language === "hi" ? 30 : 28,
          }}
        >
          {fact.body}
        </Text>
        {fact.image && (
          <View style={{ gap: 8 }}>
            <Image
              source={{ uri: fact.image.url }}
              accessibilityLabel={fact.image.alt}
              style={{ width: "100%", aspectRatio: 1.6, borderRadius: 18 }}
              resizeMode="cover"
            />
            {(fact.image.credit || fact.image.licence) && (
              <Text style={{ color: t.muted, fontSize: 12 }}>
                {fact.image.credit} {fact.image.licence}
              </Text>
            )}
          </View>
        )}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: t.border,
            paddingTop: 16,
            gap: 4,
          }}
        >
          <Text style={{ color: t.muted, fontSize: 11, letterSpacing: 1 }}>
            {s.sourced.toLocaleUpperCase(language)}
          </Text>
          <Text style={{ color: t.ink, fontSize: 14, fontWeight: "600" }}>
            {fact.publisher}
          </Text>
          {fact.attributionText && (
            <Text style={{ color: t.muted, fontSize: 12 }}>
              {fact.attributionText}
            </Text>
          )}
        </View>
      </ScrollView>
      <View
        style={{
          padding: 14,
          borderTopWidth: 1,
          borderColor: t.border,
          flexDirection: "row",
          gap: 10,
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1 }}>
          <Action label={s.sources} icon="external" onPress={onSource} />
        </View>
        <Action
          compact
          selected={saved}
          label={saved ? s.unsave : s.save}
          icon="bookmark"
          onPress={onSave}
        />
        <Action compact label={s.share} icon="share" onPress={onShare} />
      </View>
    </View>
  );
}
