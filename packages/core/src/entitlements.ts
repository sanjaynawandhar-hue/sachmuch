/**
 * §11 — the premium boundary, and the whole of it.
 *
 * Every gated feature routes through hasEntitlement(). Right now it returns true
 * for everything: audio, offline packs and themes are free, and there are no
 * ads. There is no Play Billing, no RevenueCat, no Stripe, no ad SDK anywhere in
 * this repo, by design.
 *
 * When premium ships it is a change to this one function plus a billing
 * integration, and nothing else in the codebase moves.
 */

export const PREMIUM_ENABLED = false;

export type EntitlementKey =
  | 'audio'
  | 'offline_packs'
  | 'themes'
  | 'ad_free'
  | 'unlimited_collections';

export interface EntitlementRow {
  key: string;
  expiresAt: Date | null;
}

export function hasEntitlement(
  _userId: string,
  _key: EntitlementKey,
  rows: EntitlementRow[] = [],
  now: Date = new Date(),
): boolean {
  if (!PREMIUM_ENABLED) return true;
  return rows.some(
    (r) => r.key === _key && (r.expiresAt === null || r.expiresAt.getTime() > now.getTime()),
  );
}
