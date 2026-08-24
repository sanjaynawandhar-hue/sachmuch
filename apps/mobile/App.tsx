import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FactCard } from '@sachmuch/ui/native';
import { palette, typeStyle } from '@sachmuch/ui/tokens';
import type { FactCardData } from '@sachmuch/ui';

/**
 * Phase 0 gate: one clay card, from the same tokens and the same shared
 * component data the Next.js app uses. The real feed replaces this in Phase 2.
 */
const DEMO: FactCardData = {
  id: 'demo-1',
  categoryId: 2,
  categorySlug: 'bollywood',
  categoryLabel: 'Bollywood',
  categoryEmoji: '🎬',
  hook: 'Meena Kumari won the Filmfare Award for Best Actress in 1955.',
  body:
    'Meena Kumari received the Filmfare Award for Best Actress in 1955 for Parineeta, ' +
    'early in a career that would run through the following two decades of Hindi cinema. ' +
    'The award had been running only since 1954, so she is among the first performers it ' +
    'chose to honour in that category at all, and she went on to win it three more times.',
  sourceUrl: 'https://en.wikipedia.org/wiki/Meena_Kumari',
  publisher: 'Wikidata',
  licence: 'cc0',
  corroborationCount: 2,
  difficulty: 3,
  entities: [
    { qid: 'Q465848', label: 'Meena Kumari' },
    { qid: 'Q959267', label: 'Parineeta' },
  ],
};

const DEMO_HI: FactCardData = {
  ...DEMO,
  id: 'demo-1-hi',
  hook: 'मीना कुमारी को 1955 में फ़िल्मफ़ेयर सर्वश्रेष्ठ अभिनेत्री पुरस्कार मिला।',
  body:
    'मीना कुमारी को 1955 में परिणीता के लिए फ़िल्मफ़ेयर सर्वश्रेष्ठ अभिनेत्री पुरस्कार से नवाज़ा गया। ' +
    'यह पुरस्कार 1954 में ही शुरू हुआ था, इसलिए वे इस श्रेणी में सम्मानित होने वाली शुरुआती ' +
    'अभिनेत्रियों में हैं। आगे चलकर उन्होंने यह पुरस्कार तीन बार और जीता।',
  entities: [
    { qid: 'Q465848', label: 'मीना कुमारी' },
    { qid: 'Q959267', label: 'परिणीता' },
  ],
};

export default function App() {
  // Dark-first: the feed is designed dark, and light is the accommodation.
  const scheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const p = palette[scheme];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: p.bg }]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[typeStyle('display'), { color: p.ink }]}>Sachmuch</Text>
        <FactCard fact={DEMO} lang="en" scheme={scheme} />
        <FactCard fact={DEMO_HI} lang="hi" scheme={scheme} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16, gap: 24, minHeight: 1400 },
});
