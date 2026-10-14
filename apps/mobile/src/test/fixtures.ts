import type { BilingualMobileFact } from "@sachmuch/core";
export const fact: BilingualMobileFact = {
  en: {
    id: "one",
    categoryId: 1,
    categorySlug: "space",
    categoryLabel: "Space",
    categoryEmoji: "✦",
    hook: "A surprising fact",
    body: "A longer explanation.",
    sourceUrl: "https://example.org/source",
    publisher: "Example publisher",
    licence: "cc0",
    corroborationCount: 1,
    difficulty: 1,
    entities: [],
  },
};
export const bilingual: BilingualMobileFact = {
  en: fact.en,
  hi: {
    ...fact.en,
    hook: "एक रोचक तथ्य",
    body: "विस्तृत जानकारी।",
    categoryLabel: "अंतरिक्ष",
  },
};
