/**
 * Brand identity, in one place.
 *
 * The handle appears on every card and will appear on every share card, which
 * is the distribution channel — so it lives here rather than being typed out at
 * each call site where one of them could drift.
 */
export const BRAND = {
  handle: 'professorSK',
  /** Rendered form, with the @. */
  display: '@professorSK',
  instagram: 'https://instagram.com/professorSK',
  /** Shown under the handle on the share card. */
  tagline: { en: 'Finance & markets, explained', hi: 'वित्त और बाज़ार, आसान भाषा में' },
} as const;
