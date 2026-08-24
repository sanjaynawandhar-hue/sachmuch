import { istDay } from './ist';

/**
 * Coins. Server-authoritative in every respect: the client displays what the
 * server returns and computes nothing.
 *
 * Every award carries an idempotency key, and the unique index on
 * (user_id, idempotency_key) in the ledger is what actually enforces it — a
 * retried request writes nothing rather than paying twice.
 */

export type EarnReason =
  | 'daily_open'
  | 'streak_bonus'
  | 'twenty_facts'
  | 'quiz_all_correct'
  | 'share_card'
  | 'accepted_report'
  | 'referral';

export type SpendReason = 'streak_freeze' | 'theme_unlock' | 'ad_free_day';

export const EARN_AMOUNTS: Record<Exclude<EarnReason, 'streak_bonus'>, number> = {
  daily_open: 10,
  twenty_facts: 15,
  quiz_all_correct: 25,
  share_card: 5,
  accepted_report: 30,
  referral: 100,
};

export const SPEND_AMOUNTS: Record<SpendReason, number> = {
  streak_freeze: 150,
  theme_unlock: 300,
  ad_free_day: 500,
};

export const DAILY_CEILING = 200;
/** Sharing is worth rewarding, but not farmable. */
export const SHARE_AWARDS_PER_DAY = 3;

/** min(5 x day, 50) — grows for ten days, then plateaus. */
export function streakBonus(streakDay: number): number {
  return Math.min(5 * Math.max(0, streakDay), 50);
}

export interface EarnRequest {
  userId: string;
  reason: EarnReason;
  /** Distinguishes repeatable awards within a day, e.g. which card was shared. */
  discriminator?: string;
  streakDay?: number;
  at?: Date;
}

export interface LedgerEntry {
  userId: string;
  delta: number;
  reason: string;
  idempotencyKey: string;
  istDay: string;
}

export interface DayState {
  /** Coins already earned on this IST day. */
  earnedToday: number;
  /** Awards already granted today, by reason. */
  countsToday: Partial<Record<EarnReason, number>>;
}

export interface EarnOutcome {
  entry?: LedgerEntry;
  granted: number;
  /** Why nothing, or less than the full amount, was granted. */
  reason?: 'ceiling_reached' | 'per_day_limit' | 'already_granted';
}

/**
 * `state` is read from the ledger for the same IST day. The caller writes
 * `entry` if present; the unique index makes a double write harmless.
 */
export function computeEarn(req: EarnRequest, state: DayState): EarnOutcome {
  const day = istDay(req.at ?? new Date());
  const amount =
    req.reason === 'streak_bonus' ? streakBonus(req.streakDay ?? 0) : EARN_AMOUNTS[req.reason];

  if (amount <= 0) return { granted: 0, reason: 'already_granted' };

  if (req.reason === 'share_card' && (state.countsToday.share_card ?? 0) >= SHARE_AWARDS_PER_DAY) {
    return { granted: 0, reason: 'per_day_limit' };
  }

  // Once-a-day awards are keyed on the day alone, so the ledger's unique index
  // rejects the second attempt without any read-modify-write race.
  const oncePerDay: EarnReason[] = ['daily_open', 'streak_bonus', 'twenty_facts', 'quiz_all_correct'];
  if (oncePerDay.includes(req.reason) && (state.countsToday[req.reason] ?? 0) > 0) {
    return { granted: 0, reason: 'already_granted' };
  }

  const headroom = DAILY_CEILING - state.earnedToday;
  if (headroom <= 0) return { granted: 0, reason: 'ceiling_reached' };

  const granted = Math.min(amount, headroom);
  const key = [req.reason, day, req.discriminator ?? ''].join(':');

  return {
    granted,
    entry: { userId: req.userId, delta: granted, reason: req.reason, idempotencyKey: key, istDay: day },
    ...(granted < amount ? { reason: 'ceiling_reached' as const } : {}),
  };
}

/**
 * §11 — what counts as "completing" a fact. A swipe past is not engagement;
 * requiring a real signal is what stops the coin economy rewarding scrolling.
 */
export const COMPLETION_DWELL_MS = 4000;

export function isCompleted(signal: { expanded: boolean; dwellMs: number; bodyVisible: boolean }): boolean {
  return signal.expanded || (signal.dwellMs >= COMPLETION_DWELL_MS && signal.bodyVisible);
}
