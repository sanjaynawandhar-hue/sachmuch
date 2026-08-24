import type { Lang } from './types';

/**
 * Card-level strings live in the UI package so a card is renderable without the
 * app wiring i18n first. Everything else lives in @sachmuch/core.
 *
 * Every string exists in both languages, errors and empty states included —
 * that is precisely where bilingual apps break.
 */
export const CARD_STRINGS = {
  source: { en: 'Source', hi: 'स्रोत' },
  sources: { en: 'sources', hi: 'स्रोत' },
  tapToExpand: { en: 'Tap to read more', hi: 'और पढ़ने के लिए दबाएँ' },
  tapToCollapse: { en: 'Tap to close', hi: 'बंद करने के लिए दबाएँ' },
  like: { en: 'Like', hi: 'पसंद' },
  save: { en: 'Save', hi: 'सहेजें' },
  share: { en: 'Share', hi: 'साझा करें' },
  /** Deliberately not "share": nothing is posted anywhere, the count is the point. */
  boost: { en: 'Boost this fact', hi: 'इस तथ्य को आगे बढ़ाएँ' },
  boosts: { en: 'boosts', hi: 'बूस्ट' },
  listen: { en: 'Listen', hi: 'सुनें' },
  stop: { en: 'Stop', hi: 'रोकें' },
  report: { en: 'Report', hi: 'रिपोर्ट' },
  noHindiVoice: {
    en: 'No Hindi voice on this device',
    hi: 'इस डिवाइस पर हिंदी आवाज़ नहीं है',
  },
  relatedTo: { en: 'Related to', hi: 'से जुड़ा' },
  difficulty: { en: 'Level', hi: 'स्तर' },
} as const;

export type CardStringKey = keyof typeof CARD_STRINGS;

export function t(key: CardStringKey, lang: Lang): string {
  return CARD_STRINGS[key][lang];
}

/** Shown under the hook when the licence requires a visible credit. */
export function licenceCredit(licence: string, publisher: string, lang: Lang): string | null {
  switch (licence) {
    case 'cc_by':
      return lang === 'hi' ? `${publisher} · CC BY 4.0` : `${publisher} · CC BY 4.0`;
    case 'cc_by_sa':
      return `${publisher} · CC BY-SA`;
    case 'terms_only':
      return publisher;
    // CC0 and public domain carry no attribution obligation. §2.7 says the copy
    // stays honest about provenance, so we still name the source elsewhere on
    // the card — we just do not claim an obligation that does not exist.
    default:
      return null;
  }
}
