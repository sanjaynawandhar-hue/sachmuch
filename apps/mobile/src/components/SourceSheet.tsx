import React, { useState } from "react";
import { Linking, Modal, ScrollView, Text, View } from "react-native";
import { isWebUrl, type MobileFact } from "@sachmuch/core";
import { useAppState } from "../state/AppStateProvider";
import { strings } from "../i18n";
import { useAppTheme } from "../theme";
import { Action, Notice } from "./Surface";
export function SourceSheet({
  fact,
  onClose,
}: {
  fact: MobileFact | null;
  onClose: () => void;
}) {
  const t = useAppTheme();
  const { state } = useAppState();
  const s = strings(state.preferences.language);
  const [failed, setFailed] = useState(false);
  async function open() {
    if (!fact || !isWebUrl(fact.sourceUrl)) {
      setFailed(true);
      return;
    }
    try {
      await Linking.openURL(fact.sourceUrl);
    } catch {
      setFailed(true);
    }
  }
  return (
    <Modal
      visible={!!fact}
      transparent
      animationType={t.reduceMotion ? "none" : "slide"}
      onRequestClose={onClose}
      onShow={() => setFailed(false)}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#00000060",
          justifyContent: "flex-end",
        }}
      >
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: "85%",
            backgroundColor: t.card,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            padding: 26,
            paddingBottom: 40,
            gap: 18,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              accessibilityRole="header"
              style={{ fontSize: 26, fontWeight: "700", color: t.ink }}
            >
              {s.sources}
            </Text>
            <Action label={s.close} compact icon="close" onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={{ gap: 15 }}>
            <Text style={{ color: t.muted }}>{s.sourced}</Text>
            <Text style={{ color: t.ink, fontSize: 22, fontWeight: "600" }}>
              {fact?.publisher}
            </Text>
            <Text selectable style={{ color: t.accent, fontSize: 14 }}>
              {fact?.sourceUrl}
            </Text>
            <Text style={{ color: t.muted }}>
              {s.licence}: {fact?.licence}
            </Text>
            {fact?.attributionText && (
              <Text style={{ color: t.muted }}>{fact.attributionText}</Text>
            )}
            {fact?.image?.credit && (
              <Text style={{ color: t.muted }}>
                {s.imageCredit}: {fact.image.credit} · {fact.image.licence}
              </Text>
            )}
          </ScrollView>
          {failed && <Notice text={s.actionError} />}
          <Action
            label={s.openSource}
            icon="external"
            primary
            onPress={() => {
              void open();
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
