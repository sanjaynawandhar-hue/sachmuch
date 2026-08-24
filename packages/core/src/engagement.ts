import { PAGE_SIZE } from './feed';

/**
 * What the feed learns from behaviour.
 *
 * The onboarding picker is a guess a user makes about themselves before they
 * have seen anything. How long they actually hold on a card, and what they
 * like, is a better signal — so declared interest only seeds the model and
 * behaviour moves it from there.
 *
 * Everything here is pure. The caller owns storage: localStorage on web,
 * AsyncStorage on native, the `user_interests` table on the server.
 */

/** Reading a hook and its body takes roughly this long. Full credit at 1x. */
export const TARGET_DWELL_MS = 6000;
/** Below this, the card was passed over rather than read. */
export const SKIM_DWELL_MS = 1200;

export interface FactSignal {
  factId: string;
  categoryId: number;
  dwellMs: number;
  /** The body was opened — the strongest signal short of a like. */
  expanded?: boolean;
  liked?: boolean;
  saved?: boolean;
  shared?: boolean;
}

/**
 * One event's interest value, 0–1.
 *
 * Dwell carries the most weight because it is the only signal every card
 * generates; likes are rarer and therefore worth more per occurrence, but a feed
 * ranked on likes alone learns only from the small fraction of cards anyone
 * bothers to tap.
 */
export function interestOf(s: FactSignal): number {
  if (s.dwellMs < SKIM_DWELL_MS && !s.liked && !s.saved && !s.expanded) return 0;

  // The weights deliberately sum to more than 1 and are then clamped. A first
  // cut had them summing to exactly 1, which meant a user who read a card right
  // through and liked it still scored only 0.65 — the model could never reach
  // its own ceiling without a save AND a share, which almost nobody does.
  const dwell = Math.min(s.dwellMs / TARGET_DWELL_MS, 1);
  const value =
    0.55 * dwell +
    0.20 * (s.expanded ? 1 : 0) +
    0.30 * (s.liked ? 1 : 0) +
    0.12 * (s.saved ? 1 : 0) +
    0.08 * (s.shared ? 1 : 0);
  return Math.max(0, Math.min(1, value));
}

export interface Affinity {
  /** categoryId -> { score 0–1, how many signals it rests on } */
  byCategory: Record<number, { score: number; samples: number }>;
  totalSignals: number;
}

export const emptyAffinity = (): Affinity => ({ byCategory: {}, totalSignals: 0 });

/** Neutral until proven otherwise, so an unseen category is neither favoured nor buried. */
export const NEUTRAL = 0.5;

/**
 * Early signals move the score a lot, later ones a little. Without the decay a
 * long-standing preference would be overturned by one idle afternoon.
 */
function learningRate(samples: number): number {
  return Math.max(0.06, 0.45 / (1 + samples * 0.35));
}

export function learn(affinity: Affinity, signal: FactSignal): Affinity {
  const value = interestOf(signal);
  const prev = affinity.byCategory[signal.categoryId] ?? { score: NEUTRAL, samples: 0 };
  const alpha = learningRate(prev.samples);
  return {
    totalSignals: affinity.totalSignals + 1,
    byCategory: {
      ...affinity.byCategory,
      [signal.categoryId]: {
        score: Math.max(0, Math.min(1, prev.score + alpha * (value - prev.score))),
        samples: prev.samples + 1,
      },
    },
  };
}

/** Seeds from the onboarding picker, as a starting point rather than a verdict. */
export function seedFromDeclared(categoryIds: number[]): Affinity {
  return {
    totalSignals: 0,
    byCategory: Object.fromEntries(categoryIds.map((id) => [id, { score: 0.7, samples: 0 }])),
  };
}

export const scoreFor = (a: Affinity, categoryId: number): number =>
  a.byCategory[categoryId]?.score ?? NEUTRAL;

/** Feeds the existing ranker in feed.ts. */
export const asInterestMap = (a: Affinity): Map<number, number> =>
  new Map(Object.entries(a.byCategory).map(([id, v]) => [Number(id), v.score]));

export interface Rankable {
  id: string;
  categoryId: number;
  /** Quality gate output. An unscored fact is treated as average, not as bad. */
  quality?: number;
  /** Facts from one template share a sentence shape; the feed spaces them out. */
  templateId?: string;
}

/**
 * How often the next card is chosen at random rather than by affinity.
 *
 * Without this the feed converges on two categories within an afternoon and the
 * user never discovers the other twenty-seven. It is the single most important
 * number in this file.
 */
export const EXPLORATION_RATE = 0.28;

/**
 * Builds the next stretch of a single mixed feed.
 *
 * There are no category rails: every card is chosen from the whole corpus, most
 * of them weighted by what the user has actually engaged with and a steady
 * minority picked to keep the feed from narrowing. No more than two cards in a
 * row come from the same category, however strong the preference — a run of
 * five Bollywood cards reads as a bug even to someone who likes Bollywood.
 */
export function buildFeed<T extends Rankable>(
  candidates: T[],
  affinity: Affinity,
  count = PAGE_SIZE,
  random: () => number = Math.random,
): T[] {
  const pool = [...candidates];
  const out: T[] = [];
  let lastCategory = -1;
  let runLength = 0;
  /** The last few templates used, so identical sentence shapes get separated. */
  const recentTemplates: string[] = [];

  while (out.length < count && pool.length > 0) {
    const explore = random() < EXPLORATION_RATE;

    const eligible = pool.filter((c) => {
      if (c.categoryId === lastCategory && runLength >= 2) return false;
      // Never two in a row from one template, and no more than twice in any
      // window of four. A corpus dominated by one template otherwise reads as a
      // single fact repeated with the names swapped.
      if (c.templateId && recentTemplates[0] === c.templateId) return false;
      if (c.templateId && recentTemplates.filter((t) => t === c.templateId).length >= 2) return false;
      return true;
    });
    const from = eligible.length > 0 ? eligible : pool;

    let pick: T;
    if (explore) {
      pick = from[Math.floor(random() * from.length)]!;
    } else {
      // Weighted draw rather than a strict argmax: always taking the top score
      // makes the feed repetitive and freezes the model, because a category that
      // never appears never gets another signal.
      const weights = from.map((c) => (0.15 + scoreFor(affinity, c.categoryId)) * (0.4 + (c.quality ?? 0.5)));
      const total = weights.reduce((a, b) => a + b, 0);
      let r = random() * total;
      pick = from[from.length - 1]!;
      for (let i = 0; i < from.length; i++) {
        r -= weights[i]!;
        if (r <= 0) { pick = from[i]!; break; }
      }
    }

    out.push(pick);
    pool.splice(pool.indexOf(pick), 1);
    runLength = pick.categoryId === lastCategory ? runLength + 1 : 1;
    lastCategory = pick.categoryId;
    if (pick.templateId) {
      recentTemplates.unshift(pick.templateId);
      recentTemplates.length = Math.min(recentTemplates.length, 4);
    }
  }

  return out;
}

/** Storage-agnostic serialisation, so web and native persist the same shape. */
export const serializeAffinity = (a: Affinity): string => JSON.stringify(a);

export function deserializeAffinity(raw: string | null): Affinity {
  if (!raw) return emptyAffinity();
  try {
    const parsed = JSON.parse(raw) as Affinity;
    if (!parsed || typeof parsed !== 'object' || !parsed.byCategory) return emptyAffinity();
    return parsed;
  } catch {
    // A corrupt blob must not wedge the feed; start over rather than throw.
    return emptyAffinity();
  }
}
