/**
 * Feed ranking and the never-empty guarantee.
 *
 * The mix per 20-card page is fixed by §9:
 *   55% unseen from declared interests, weighted by quality x engagement
 *   20% unseen exploration
 *   15% due SRS items
 *   10% evergreen high performers
 * with no more than 3 cards from any one subtopic.
 */

export const PAGE_SIZE = 20;

export const MIX = {
  interest: 0.55,
  exploration: 0.2,
  srs: 0.15,
  evergreen: 0.1,
} as const;

export const MAX_PER_SUBTOPIC_PER_PAGE = 3;

/** Below this many unseen facts in a browsed category, ingestion is nudged. */
export const TOPUP_THRESHOLD = 200;

export type Bucket = keyof typeof MIX;

export interface Candidate {
  id: string;
  categoryId: number;
  subtopicId: number | null;
  /** Gate output, 0–1. */
  quality: number;
  likeCount: number;
  seenCount: number;
  bucket: Bucket;
  hiMissing: boolean;
  difficulty: number;
}

export interface RankingContext {
  lang: 'en' | 'hi';
  /** 0–1 per category. */
  interest: Map<number, number>;
  maxDifficulty: number;
  kidsMode: boolean;
}

/**
 * Engagement as a like rate with a prior, so a fact seen twice and liked twice
 * does not outrank one seen ten thousand times and liked four thousand.
 */
export function engagement(c: Candidate): number {
  const PRIOR_SEEN = 50;
  const PRIOR_RATE = 0.08;
  return (c.likeCount + PRIOR_SEEN * PRIOR_RATE) / (c.seenCount + PRIOR_SEEN);
}

export function score(c: Candidate, ctx: RankingContext): number {
  const interest = ctx.interest.get(c.categoryId) ?? 0.3;
  return c.quality * engagement(c) * (0.4 + 0.6 * interest);
}

/** §2.5 — a fact without Hindi structurally cannot reach the Hindi feed. */
export function isServable(c: Candidate, ctx: RankingContext): boolean {
  if (ctx.lang === 'hi' && c.hiMissing) return false;
  if (c.difficulty > ctx.maxDifficulty) return false;
  if (ctx.kidsMode && c.difficulty > 2) return false;
  return true;
}

/** How many slots each bucket gets on one page. */
export function bucketQuota(pageSize = PAGE_SIZE): Record<Bucket, number> {
  const quota = {
    interest: Math.round(pageSize * MIX.interest),
    exploration: Math.round(pageSize * MIX.exploration),
    srs: Math.round(pageSize * MIX.srs),
    evergreen: Math.round(pageSize * MIX.evergreen),
  };
  // Rounding must never lose or invent a slot.
  const drift = pageSize - (quota.interest + quota.exploration + quota.srs + quota.evergreen);
  quota.interest += drift;
  return quota;
}

export interface RankedPage {
  facts: Candidate[];
  /** Buckets that could not be filled, so the caller knows what ran thin. */
  shortfall: Partial<Record<Bucket, number>>;
}

/**
 * Builds one page.
 *
 * A bucket that cannot be filled donates its slots to the others rather than
 * leaving a short page — §9 forbids an empty state, and a 14-card "page" is a
 * quiet form of one.
 */
export function rankPage(
  candidates: Candidate[],
  ctx: RankingContext,
  pageSize = PAGE_SIZE,
): RankedPage {
  const servable = candidates.filter((c) => isServable(c, ctx));
  const byBucket = new Map<Bucket, Candidate[]>();
  for (const c of servable) {
    const list = byBucket.get(c.bucket) ?? [];
    list.push(c);
    byBucket.set(c.bucket, list);
  }
  for (const list of byBucket.values()) {
    list.sort((a, b) => score(b, ctx) - score(a, ctx));
  }

  const quota = bucketQuota(pageSize);
  const perSubtopic = new Map<number, number>();
  const chosen: Candidate[] = [];
  const shortfall: Partial<Record<Bucket, number>> = {};

  const take = (bucket: Bucket, want: number): number => {
    const list = byBucket.get(bucket) ?? [];
    let taken = 0;
    while (taken < want && list.length > 0) {
      const next = list.shift()!;
      const key = next.subtopicId ?? -1;
      const used = perSubtopic.get(key) ?? 0;
      // A page dominated by one subtopic reads as a single long fact.
      if (key !== -1 && used >= MAX_PER_SUBTOPIC_PER_PAGE) continue;
      perSubtopic.set(key, used + 1);
      chosen.push(next);
      taken++;
    }
    return taken;
  };

  const order: Bucket[] = ['srs', 'interest', 'exploration', 'evergreen'];
  for (const bucket of order) {
    const want = quota[bucket];
    const got = take(bucket, want);
    if (got < want) shortfall[bucket] = want - got;
  }

  // Redistribute anything the quotas could not place.
  let remaining = pageSize - chosen.length;
  for (const bucket of order) {
    if (remaining <= 0) break;
    remaining -= take(bucket, remaining);
  }

  return { facts: chosen, shortfall };
}

/**
 * §9 — the never-empty guarantee, as an explicit decision rather than a fallback
 * buried in a catch block.
 */
export type FeedFallback =
  | { kind: 'ok' }
  | { kind: 'topup'; categoryId: number; thinSubtopicIds: number[] }
  | { kind: 'least_recently_skipped' }
  | { kind: 'srs_resurface' };

export function chooseFallback(input: {
  unseenInCategory: number;
  categoryId: number;
  thinSubtopicIds: number[];
  skippedAvailable: number;
  srsAvailable: number;
}): FeedFallback {
  if (input.unseenInCategory >= TOPUP_THRESHOLD) return { kind: 'ok' };
  if (input.unseenInCategory > 0) {
    return { kind: 'topup', categoryId: input.categoryId, thinSubtopicIds: input.thinSubtopicIds };
  }
  if (input.skippedAvailable > 0) return { kind: 'least_recently_skipped' };
  return { kind: 'srs_resurface' };
}

/** Two exploration rails are injected at random positions so the feed cannot bubble. */
export function railOrder(
  interestSorted: number[],
  explorationRails: number[],
  random: () => number = Math.random,
): number[] {
  const rails = [...interestSorted];
  for (const rail of explorationRails.slice(0, 2)) {
    const at = 1 + Math.floor(random() * Math.max(1, rails.length));
    rails.splice(at, 0, rail);
  }
  return rails;
}
