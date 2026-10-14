import type { BilingualMobileFact, MobileFact } from "@sachmuch/core";
// Explicit development fixtures. Never used as a fallback for the live API.
const base: Omit<MobileFact, "id" | "hook" | "body" | "sourceUrl"> = {
  categoryId: 13,
  categorySlug: "space",
  categoryLabel: "Space",
  categoryEmoji: "✦",
  publisher: "Wikipedia",
  licence: "cc_by_sa",
  attributionText:
    "Adapted from Wikipedia; CC BY-SA. See original source for authors and licence.",
  corroborationCount: 1,
  difficulty: 2,
  entities: [],
};
export const previewFacts: BilingualMobileFact[] = [
  {
    en: {
      ...base,
      id: "preview-moon",
      hook: "The Moon is slowly moving away from us.",
      body: "Laser measurements show that the Moon moves about 3.8 centimetres farther from Earth each year. Reflectors placed on the lunar surface allow scientists to measure that changing distance with remarkable precision.",
      sourceUrl:
        "https://en.wikipedia.org/wiki/Lunar_Laser_Ranging_experiments",
    },
    hi: {
      ...base,
      id: "preview-moon",
      categoryLabel: "अंतरिक्ष",
      hook: "चाँद धीरे-धीरे हमसे दूर जा रहा है।",
      body: "लेज़र माप बताते हैं कि चाँद हर साल पृथ्वी से लगभग 3.8 सेंटीमीटर दूर हो जाता है। चाँद की सतह पर रखे परावर्तकों की मदद से वैज्ञानिक इस बदलती दूरी को बहुत सटीकता से माप सकते हैं।",
      sourceUrl:
        "https://en.wikipedia.org/wiki/Lunar_Laser_Ranging_experiments",
    },
  },
  {
    en: {
      ...base,
      id: "preview-oxford",
      categoryId: 11,
      categorySlug: "history",
      categoryLabel: "History",
      categoryEmoji: "◈",
      hook: "Oxford was teaching before the Aztec empire existed.",
      body: "Teaching at Oxford is documented as early as 1096. The Aztec Triple Alliance was formed in 1428, more than three centuries later. History’s timelines can be surprisingly different from the way we picture them.",
      sourceUrl: "https://en.wikipedia.org/wiki/University_of_Oxford",
    },
    hi: {
      ...base,
      id: "preview-oxford",
      categoryId: 11,
      categorySlug: "history",
      categoryLabel: "इतिहास",
      categoryEmoji: "◈",
      hook: "एज़्टेक साम्राज्य से पहले ऑक्सफ़ोर्ड में पढ़ाई होती थी।",
      body: "ऑक्सफ़ोर्ड में 1096 से शिक्षण के प्रमाण मिलते हैं। एज़्टेक त्रिगुट गठबंधन 1428 में बना, तीन शताब्दियों से भी अधिक बाद। इतिहास की समयरेखाएँ कभी-कभी हमारी कल्पना से बहुत अलग होती हैं।",
      sourceUrl: "https://en.wikipedia.org/wiki/University_of_Oxford",
    },
  },
  {
    en: {
      ...base,
      id: "preview-sun",
      hook: "Sunlight takes about eight minutes to reach you.",
      body: "Light travels at roughly 300,000 kilometres per second. Even at that speed, crossing the distance from the Sun to Earth takes about eight minutes and twenty seconds. We see the Sun as it was a few minutes ago.",
      sourceUrl: "https://en.wikipedia.org/wiki/Sun",
    },
    hi: {
      ...base,
      id: "preview-sun",
      categoryLabel: "अंतरिक्ष",
      hook: "धूप को आप तक पहुँचने में लगभग आठ मिनट लगते हैं।",
      body: "प्रकाश लगभग तीन लाख किलोमीटर प्रति सेकंड की गति से चलता है। इतनी तेज़ गति पर भी सूर्य से पृथ्वी तक आने में लगभग आठ मिनट बीस सेकंड लगते हैं। हमें सूर्य कुछ मिनट पहले जैसा था, वैसा दिखाई देता है।",
      sourceUrl: "https://en.wikipedia.org/wiki/Sun",
    },
  },
];
