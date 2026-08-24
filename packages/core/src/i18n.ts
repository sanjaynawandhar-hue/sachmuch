/**
 * The string table.
 *
 * Every user-facing string exists in both languages, errors and empty states
 * included. That is exactly where bilingual apps break: the happy path gets
 * translated and the failure path silently falls back to English at the moment
 * the user is already confused.
 */

export type Lang = 'en' | 'hi';

export const STRINGS = {
  /* chrome */
  appName: { en: 'Sachmuch', hi: 'सचमुच' },
  forYou: { en: 'For You', hi: 'आपके लिए' },
  search: { en: 'Search', hi: 'खोजें' },
  saved: { en: 'Saved', hi: 'सहेजे गए' },
  profile: { en: 'Profile', hi: 'प्रोफ़ाइल' },
  settings: { en: 'Settings', hi: 'सेटिंग्स' },
  sourcesScreen: { en: 'Sources', hi: 'स्रोत' },
  today: { en: 'Today', hi: 'आज' },

  /* the reaction the app is named for */
  reaction: { en: 'Sachmuch?!', hi: 'सचमुच?!' },

  /* feed */
  factOfTheDay: { en: 'Fact of the day', hi: 'आज का तथ्य' },
  onThisDayInIndia: { en: 'On this day in India', hi: 'भारत में आज के दिन' },
  worthRemembering: { en: 'Worth remembering', hi: 'याद रखने लायक़' },
  exploreRail: { en: 'Something different', hi: 'कुछ अलग' },
  nextFact: { en: 'Next fact', hi: 'अगला तथ्य' },
  previousFact: { en: 'Previous fact', hi: 'पिछला तथ्य' },
  nextCategory: { en: 'Next category', hi: 'अगली श्रेणी' },
  previousCategory: { en: 'Previous category', hi: 'पिछली श्रेणी' },

  /* streak and coins */
  streakDays: { en: 'day streak', hi: 'दिन की लय' },
  streakSaved: { en: 'Your streak was saved', hi: 'आपकी लय बच गई' },
  coins: { en: 'Coins', hi: 'सिक्के' },
  earnedToday: { en: 'Earned today', hi: 'आज कमाए' },
  dailyLimitReached: { en: "That's today's limit", hi: 'आज की सीमा पूरी' },

  /* quiz */
  dailyQuiz: { en: 'Daily quiz', hi: 'आज की क्विज़' },
  quizFromWhatYouRead: { en: 'Built from what you read', hi: 'जो आपने पढ़ा उसी से बनी' },
  correct: { en: 'Correct', hi: 'सही' },
  incorrect: { en: 'Not quite', hi: 'बिल्कुल नहीं' },
  allCorrect: { en: 'All correct. Sachmuch?!', hi: 'सब सही। सचमुच?!' },

  /* provenance — §2.7, honest about where things come from */
  sourcedFrom: { en: 'Sourced from', hi: 'स्रोत' },
  twoSources: { en: 'Two independent sources', hi: 'दो अलग स्रोत' },
  findSources: { en: 'Find sources', hi: 'स्रोत खोजें' },
  findSourcesHelp: {
    en: 'Searches our corpus and the linked pages. It finds sources; it does not judge the claim.',
    hi: 'यह हमारे संग्रह और जुड़े पन्नों में खोजता है। यह स्रोत ढूँढता है, दावे पर फ़ैसला नहीं देता।',
  },
  reportInaccuracy: { en: 'Report an inaccuracy', hi: 'ग़लती की रिपोर्ट करें' },
  reportThanks: { en: 'Thanks — we will look at it', hi: 'शुक्रिया — हम इसे देखेंगे' },

  /* settings */
  language: { en: 'Language', hi: 'भाषा' },
  appearance: { en: 'Appearance', hi: 'रूप' },
  textSize: { en: 'Text size', hi: 'अक्षरों का आकार' },
  highLegibility: { en: 'High legibility', hi: 'ज़्यादा साफ़ अक्षर' },
  dataSaver: { en: 'Data saver', hi: 'डेटा बचाएँ' },
  dataSaverOn: { en: 'Data saver is on', hi: 'डेटा सेवर चालू है' },
  dataSaved: { en: 'Data saved so far', hi: 'अब तक बचा डेटा' },
  kidsMode: { en: 'Kids mode', hi: 'बच्चों का मोड' },
  reduceMotion: { en: 'Reduce motion', hi: 'हलचल कम करें' },
  offlinePacks: { en: 'Offline packs', hi: 'ऑफ़लाइन पैक' },

  /* audio */
  listen: { en: 'Listen', hi: 'सुनें' },
  noHindiVoice: {
    en: 'This device has no Hindi voice installed, so listening is off for Hindi cards.',
    hi: 'इस डिवाइस में हिंदी आवाज़ नहीं है, इसलिए हिंदी कार्ड सुनना बंद है।',
  },

  /* errors and empty states — the half that usually goes untranslated */
  offline: { en: 'You are offline', hi: 'आप ऑफ़लाइन हैं' },
  offlineBody: {
    en: 'Showing what is already on your phone. New facts arrive when you reconnect.',
    hi: 'जो आपके फ़ोन में पहले से है वही दिख रहा है। जुड़ते ही नए तथ्य आ जाएँगे।',
  },
  somethingWentWrong: { en: 'Something went wrong', hi: 'कुछ गड़बड़ हो गई' },
  tryAgain: { en: 'Try again', hi: 'फिर कोशिश करें' },
  noResults: { en: 'Nothing matched that', hi: 'इससे कुछ नहीं मिला' },
  noResultsBody: {
    en: 'Try a shorter phrase, or a name.',
    hi: 'छोटा वाक्यांश आज़माएँ, या कोई नाम।',
  },
  noSavedYet: { en: 'Nothing saved yet', hi: 'अभी कुछ सहेजा नहीं' },
  noSavedYetBody: {
    en: 'Press and hold a card to keep it.',
    hi: 'कार्ड को दबाकर रखें और सहेज लें।',
  },
  requestCategory: { en: 'Request a topic', hi: 'कोई विषय माँगें' },
  requestCategoryThanks: {
    en: 'Noted. It goes on the list.',
    hi: 'नोट कर लिया। यह सूची में जुड़ गया।',
  },
} as const;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, lang: Lang): string {
  return STRINGS[key][lang];
}

/** Every key must exist in both languages — asserted by the test, not by hope. */
export const STRING_KEYS = Object.keys(STRINGS) as StringKey[];
