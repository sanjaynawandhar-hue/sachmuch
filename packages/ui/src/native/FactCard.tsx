import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, space } from '../tokens/space';
import { scriptOf, typeStyle, type TypeScaleKey } from '../tokens/type';
import { palette, type Scheme } from '../tokens/color';
import { categoryTint } from '../tokens/tint';
import { Byline } from './Byline';
import { t } from '../strings';
import type { FactCardData, Lang } from '../types';

export interface FactCardProps {
  fact: FactCardData;
  lang: Lang;
  scheme?: Scheme;
  typeScale?: TypeScaleKey;
  /** Category position; the tint is derived rather than passed as a literal. */
  tintIndex?: number;
  categoryCount?: number;
  onEntityPress?(qid: string): void;
  onLike?(): void;
  onSave?(): void;
  onShare?(): void;
  onReport?(): void;
  dataSaver?: boolean;
}

/**
 * The native card. Same structure, same tokens and same strings as the web
 * card — the Phase 0 gate is that these render as one design, so a divergence
 * here is a bug rather than a platform adaptation.
 *
 * As on web, the face carries the fact and nothing else. Publisher, licence and
 * corroboration live behind the ⓘ, and the actions are icons rather than a row
 * of labelled buttons repeated on every card.
 */
export function FactCard({
  fact, lang, scheme = 'dark', typeScale = 'default', tintIndex, categoryCount = 29,
  dataSaver = false, onEntityPress, onLike, onSave, onShare, onReport,
}: FactCardProps) {
  const [open, setOpen] = useState(false);
  const [showSource, setShowSource] = useState(false);

  const p = palette[scheme];
  const tint = categoryTint(tintIndex ?? fact.categoryId - 1, categoryCount, scheme);
  const script = scriptOf(fact.hook);

  const hook = { ...typeStyle(open ? 'title' : 'display', script, typeScale), color: p.ink };
  const body = { ...typeStyle('body', script, typeScale), color: p.inkSoft };
  const caption = { ...typeStyle('caption', script, typeScale), color: p.inkSoft };

  return (
    <Pressable
      onPress={() => setOpen((v) => !v)}
      accessibilityRole="button"
      accessibilityLabel={`${fact.categoryLabel}: ${fact.hook}`}
      accessibilityState={{ expanded: open }}
      style={[styles.card, { backgroundColor: tint.bg }]}
    >
      {/* Category glow. React Native has no blur filter, so the soft corner
          light is approximated with a large, very translucent rounded block —
          the one place the two platforms genuinely differ. */}
      <View
        pointerEvents="none"
        style={[styles.glow, { backgroundColor: tint.accent, opacity: 0.16 }]}
      />
      <Text pointerEvents="none" style={styles.glyph}>{fact.categoryEmoji}</Text>

      <View style={styles.content}>
        <Text style={hook}>{fact.hook}</Text>

        {/* The signature. On every card, because every card can be screenshotted. */}
        <Byline size={12} scheme={scheme} />

        {open && (
          <>
            <Text style={body}>{fact.body}</Text>
            {fact.entities.length > 0 && (
              <View style={styles.chipRow}>
                {fact.entities.map((e) => (
                  <Pressable
                    key={e.qid}
                    onPress={() => onEntityPress?.(e.qid)}
                    accessibilityRole="link"
                    style={[styles.chip, { borderColor: tint.accent }]}
                  >
                    <Text style={[caption, { color: tint.accent, fontWeight: '600' }]}>{e.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}

        {showSource && (
          <View style={[styles.sourceSheet, { backgroundColor: p.surface }]}>
            <Text
              style={[caption, styles.link]}
              accessibilityRole="link"
              onPress={() => { void Linking.openURL(fact.sourceUrl); }}
            >
              {t('source', lang)}: {fact.publisher}
            </Text>
            {fact.corroborationCount >= 2 && (
              <Text style={[caption, { color: p.jade }]}>
                {fact.corroborationCount} {t('sources', lang)}
              </Text>
            )}
            {fact.attributionText && !dataSaver && <Text style={caption}>{fact.attributionText}</Text>}
            <Text style={[caption, { color: p.rose }]} onPress={onReport}>{t('report', lang)}</Text>
          </View>
        )}
      </View>

      <View style={styles.rail}>
        <RailButton scheme={scheme} label={t('like', lang)} active={fact.liked} onPress={onLike}>
          {fact.liked ? '❤️' : '🤍'}
        </RailButton>
        <RailButton scheme={scheme} label={t('save', lang)} active={fact.saved} onPress={onSave}>🔖</RailButton>
        <RailButton scheme={scheme} label={t('share', lang)} onPress={onShare}>↗</RailButton>
        <RailButton scheme={scheme} label={t('source', lang)} active={showSource} onPress={() => setShowSource((v) => !v)}>
          ⓘ
        </RailButton>
      </View>
    </Pressable>
  );
}

function RailButton({
  children, label, onPress, active, scheme = 'dark',
}: {
  children: React.ReactNode; label: string; onPress?(): void; active?: boolean; scheme?: Scheme;
}) {
  // React Native has no color-mix, so the two schemes carry their own overlay.
  const base = scheme === 'dark' ? '255,255,255' : '23,18,39';
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active ?? false }}
      style={[
        styles.railButton,
        { backgroundColor: `rgba(${base},${active ? 0.24 : 0.11})` },
      ]}
    >
      <Text style={{ fontSize: 19 }}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius.xl,
    padding: space.xl,
    paddingBottom: space.xxl,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: '-25%',
    right: '-30%',
    width: '90%',
    height: '55%',
    borderRadius: 999,
  },
  glyph: { position: 'absolute', top: '4%', left: '4%', fontSize: 150, opacity: 0.13 },
  content: { gap: space.lg, paddingRight: 58 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 14 },
  sourceSheet: { borderRadius: radius.md, padding: space.md, gap: 6 },
  link: { textDecorationLine: 'underline' },
  rail: { position: 'absolute', right: space.lg, bottom: space.xxxl, gap: space.lg },
  railButton: { width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
