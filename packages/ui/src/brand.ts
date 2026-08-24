/**
 * Brand identity, in one place.
 *
 * The handle appears on every card and will appear on every share card, which
 * is the distribution channel — so it lives here rather than being typed out at
 * each call site where one of them could drift.
 */
export const BRAND = {
  /** The Instagram username the profile actually lives at. */
  handle: 'iam_sanjay_navandar',
  /**
   * What readers see. The display name and the username differ on Instagram —
   * @professorSK is the brand, iam_sanjay_navandar is the account — so the label
   * and the link are deliberately different values rather than one derived from
   * the other.
   */
  display: '@professorSK',
  /**
   * Canonical profile URL, without the `igsi` and `utm_source=qr` parameters a
   * QR share appends. Those identify one share instance rather than the profile;
   * they add nothing for a visitor and would sit in the repo forever.
   */
  instagram: 'https://www.instagram.com/iam_sanjay_navandar',
  /** Shown under the handle on the share card. */
  tagline: { en: 'Finance & markets, explained', hi: 'वित्त और बाज़ार, आसान भाषा में' },
} as const;
