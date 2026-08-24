import { describe, expect, it } from 'vitest';
import { istDay, daysBetween, addDays } from '../src/ist';
import { computeEarn, streakBonus, isCompleted, DAILY_CEILING } from '../src/coins';
import { initialStreak, recordVisit } from '../src/streak';
import { newItem, review, isDue } from '../src/srs';
import { rankPage, bucketQuota, chooseFallback, engagement, type Candidate } from '../src/feed';
import { hasEntitlement, PREMIUM_ENABLED } from '../src/entitlements';
import {
  buildFeed, deserializeAffinity, emptyAffinity, interestOf, learn, NEUTRAL,
  scoreFor, serializeAffinity, type FactSignal,
} from '../src/engagement';
import { STRINGS, STRING_KEYS } from '../src/i18n';

describe('IST day boundaries', () => {
  it('rolls the day at 00:00 IST, which is 18:30 UTC the day before', () => {
    expect(istDay(new Date('2026-08-19T18:29:00Z'))).toBe('2026-08-19');
    expect(istDay(new Date('2026-08-19T18:30:00Z'))).toBe('2026-08-20');
  });

  it('counts whole days between IST days', () => {
    expect(daysBetween('2026-08-19', '2026-08-20')).toBe(1);
    expect(daysBetween('2026-08-20', '2026-08-19')).toBe(-1);
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });
});

describe('coins', () => {
  const empty = { earnedToday: 0, countsToday: {} };

  it('pays the daily open once per IST day', () => {
    const first = computeEarn({ userId: 'u', reason: 'daily_open' }, empty);
    expect(first.granted).toBe(10);
    const second = computeEarn(
      { userId: 'u', reason: 'daily_open' },
      { earnedToday: 10, countsToday: { daily_open: 1 } },
    );
    expect(second.granted).toBe(0);
    expect(second.reason).toBe('already_granted');
  });

  it('grows the streak bonus to a plateau of 50', () => {
    expect(streakBonus(1)).toBe(5);
    expect(streakBonus(10)).toBe(50);
    expect(streakBonus(400)).toBe(50);
  });

  it('caps sharing at three awards a day', () => {
    const out = computeEarn(
      { userId: 'u', reason: 'share_card', discriminator: 'fact-4' },
      { earnedToday: 15, countsToday: { share_card: 3 } },
    );
    expect(out.granted).toBe(0);
    expect(out.reason).toBe('per_day_limit');
  });

  it('truncates an award at the daily ceiling rather than exceeding it', () => {
    const out = computeEarn(
      { userId: 'u', reason: 'referral' },
      { earnedToday: DAILY_CEILING - 30, countsToday: {} },
    );
    expect(out.granted).toBe(30);
    expect(out.reason).toBe('ceiling_reached');
  });

  it('gives every award an idempotency key that includes the IST day', () => {
    const out = computeEarn({ userId: 'u', reason: 'daily_open', at: new Date('2026-08-19T10:00:00Z') }, empty);
    expect(out.entry!.idempotencyKey).toBe('daily_open:2026-08-19:');
    expect(out.entry!.istDay).toBe('2026-08-19');
  });

  it('requires a real signal before a fact counts as completed', () => {
    expect(isCompleted({ expanded: true, dwellMs: 0, bodyVisible: false })).toBe(true);
    expect(isCompleted({ expanded: false, dwellMs: 4000, bodyVisible: true })).toBe(true);
    expect(isCompleted({ expanded: false, dwellMs: 3999, bodyVisible: true })).toBe(false);
    expect(isCompleted({ expanded: false, dwellMs: 9000, bodyVisible: false })).toBe(false);
  });
});

describe('streak', () => {
  it('advances on consecutive IST days', () => {
    let s = initialStreak();
    s = recordVisit(s, new Date('2026-08-19T10:00:00Z')).next;
    s = recordVisit(s, new Date('2026-08-20T10:00:00Z')).next;
    expect(s.current).toBe(2);
    expect(s.longest).toBe(2);
  });

  it('does not double-count two visits on the same IST day', () => {
    let s = recordVisit(initialStreak(), new Date('2026-08-19T05:00:00Z')).next;
    const out = recordVisit(s, new Date('2026-08-19T17:00:00Z'));
    expect(out.advanced).toBe(false);
    expect(out.next.current).toBe(1);
  });

  it('survives a timezone change — the same instant is the same IST day either way', () => {
    // 19:00 UTC is already the 20th in IST regardless of where the device thinks it is.
    let s = recordVisit(initialStreak(), new Date('2026-08-19T19:00:00Z')).next;
    expect(s.lastDayIst).toBe('2026-08-20');
    const out = recordVisit(s, new Date('2026-08-20T04:00:00Z'));
    expect(out.advanced).toBe(false);
  });

  it('ignores a backwards clock instead of letting it rewrite the streak', () => {
    let s = recordVisit(initialStreak(), new Date('2026-08-20T10:00:00Z')).next;
    const out = recordVisit(s, new Date('2026-08-15T10:00:00Z'));
    expect(out.next.current).toBe(1);
    expect(out.next.lastDayIst).toBe('2026-08-20');
    expect(out.advanced).toBe(false);
  });

  it('breaks after a missed day with no freeze', () => {
    let s = recordVisit(initialStreak(), new Date('2026-08-19T10:00:00Z')).next;
    s = recordVisit(s, new Date('2026-08-20T10:00:00Z')).next;
    const out = recordVisit(s, new Date('2026-08-22T10:00:00Z'));
    expect(out.broken).toBe(true);
    expect(out.next.current).toBe(1);
  });

  it('spends a freeze to bridge exactly one missed day', () => {
    let s = { ...recordVisit(initialStreak(), new Date('2026-08-19T10:00:00Z')).next, freezesOwned: 1 };
    const out = recordVisit(s, new Date('2026-08-21T10:00:00Z'));
    expect(out.freezeUsed).toBe(true);
    expect(out.broken).toBe(false);
    expect(out.next.current).toBe(2);
    expect(out.next.freezesOwned).toBe(0);
  });

  it('will not bridge a two-day gap even with a freeze', () => {
    let s = { ...recordVisit(initialStreak(), new Date('2026-08-19T10:00:00Z')).next, freezesOwned: 1 };
    const out = recordVisit(s, new Date('2026-08-22T10:00:00Z'));
    expect(out.broken).toBe(true);
    expect(out.next.freezesOwned).toBe(1);
  });
});

describe('spaced repetition', () => {
  it('schedules 1 day, then 6, then by ease', () => {
    const now = new Date('2026-08-19T00:00:00Z');
    let i = newItem(now);
    i = review(i, 5, now);
    expect(i.intervalDays).toBe(1);
    i = review(i, 5, now);
    expect(i.intervalDays).toBe(6);
    i = review(i, 5, now);
    expect(i.intervalDays).toBeGreaterThan(6);
  });

  it('resets the interval on a lapse but keeps the lowered ease', () => {
    const now = new Date('2026-08-19T00:00:00Z');
    let i = review(review(newItem(now), 5, now), 5, now);
    const before = i.ease;
    i = review(i, 1, now);
    expect(i.intervalDays).toBe(1);
    expect(i.lapses).toBe(1);
    expect(i.ease).toBeLessThan(before);
  });

  it('never lets ease fall below 1.3', () => {
    const now = new Date('2026-08-19T00:00:00Z');
    let i = newItem(now);
    for (let n = 0; n < 20; n++) i = review(i, 0, now);
    expect(i.ease).toBeGreaterThanOrEqual(1.3);
  });

  it('reports due items', () => {
    const now = new Date('2026-08-19T00:00:00Z');
    expect(isDue(newItem(now), now)).toBe(true);
    expect(isDue(review(newItem(now), 5, now), now)).toBe(false);
  });
});

describe('feed ranking', () => {
  const ctx = {
    lang: 'en' as const,
    interest: new Map([[2, 0.9], [9, 0.2]]),
    maxDifficulty: 5,
    kidsMode: false,
  };

  const make = (over: Partial<Candidate>): Candidate => ({
    id: Math.random().toString(36), categoryId: 2, subtopicId: 1, quality: 0.7,
    likeCount: 10, seenCount: 100, bucket: 'interest', hiMissing: false, difficulty: 3, ...over,
  });

  it('allocates exactly the page size across buckets', () => {
    const q = bucketQuota(20);
    expect(q.interest + q.exploration + q.srs + q.evergreen).toBe(20);
    expect(q.srs).toBe(3);
    expect(q.exploration).toBe(4);
  });

  it('never serves a hi_missing fact into the Hindi feed', () => {
    const cands = Array.from({ length: 40 }, (_, i) =>
      make({ id: `f${i}`, subtopicId: i, hiMissing: i % 2 === 0 }));
    const page = rankPage(cands, { ...ctx, lang: 'hi' });
    expect(page.facts.every((f) => !f.hiMissing)).toBe(true);
  });

  it('caps a page at three cards from one subtopic', () => {
    const cands = Array.from({ length: 40 }, (_, i) => make({ id: `f${i}`, subtopicId: 1 }));
    const page = rankPage(cands, ctx);
    expect(page.facts.filter((f) => f.subtopicId === 1)).toHaveLength(3);
  });

  it('fills the page from other buckets when one runs dry', () => {
    const cands = [
      ...Array.from({ length: 30 }, (_, i) => make({ id: `i${i}`, subtopicId: i, bucket: 'interest' })),
      ...Array.from({ length: 30 }, (_, i) => make({ id: `e${i}`, subtopicId: 100 + i, bucket: 'exploration' })),
    ];
    const page = rankPage(cands, ctx);
    expect(page.facts).toHaveLength(20);
    expect(page.shortfall.srs).toBeGreaterThan(0);
  });

  it('excludes hard facts in kids mode', () => {
    const cands = Array.from({ length: 20 }, (_, i) => make({ id: `f${i}`, subtopicId: i, difficulty: 4 }));
    expect(rankPage(cands, { ...ctx, kidsMode: true }).facts).toHaveLength(0);
  });

  it('smooths engagement so a twice-seen fact does not beat a proven one', () => {
    const lucky = make({ likeCount: 2, seenCount: 2 });
    const proven = make({ likeCount: 4000, seenCount: 10000 });
    expect(engagement(proven)).toBeGreaterThan(engagement(lucky));
  });
});

describe('never-empty guarantee', () => {
  it('is satisfied when the pool is deep', () => {
    expect(chooseFallback({ unseenInCategory: 500, categoryId: 2, thinSubtopicIds: [], skippedAvailable: 0, srsAvailable: 0 }).kind)
      .toBe('ok');
  });

  it('enqueues ingestion when the pool thins', () => {
    const f = chooseFallback({ unseenInCategory: 50, categoryId: 2, thinSubtopicIds: [7, 8], skippedAvailable: 0, srsAvailable: 0 });
    expect(f).toEqual({ kind: 'topup', categoryId: 2, thinSubtopicIds: [7, 8] });
  });

  it('falls back to skipped, then to SRS — and never to an empty state', () => {
    expect(chooseFallback({ unseenInCategory: 0, categoryId: 2, thinSubtopicIds: [], skippedAvailable: 40, srsAvailable: 0 }).kind)
      .toBe('least_recently_skipped');
    expect(chooseFallback({ unseenInCategory: 0, categoryId: 2, thinSubtopicIds: [], skippedAvailable: 0, srsAvailable: 0 }).kind)
      .toBe('srs_resurface');
  });
});

describe('premium boundary', () => {
  it('is not built: everything is entitled while PREMIUM_ENABLED is false', () => {
    expect(PREMIUM_ENABLED).toBe(false);
    for (const key of ['audio', 'offline_packs', 'themes', 'ad_free'] as const) {
      expect(hasEntitlement('anyone', key)).toBe(true);
    }
  });
});

describe('i18n', () => {
  it('has both languages for every single key, errors and empty states included', () => {
    for (const key of STRING_KEYS) {
      const entry = STRINGS[key];
      expect(entry.en?.trim(), `${key}.en`).toBeTruthy();
      expect(entry.hi?.trim(), `${key}.hi`).toBeTruthy();
    }
  });

  it('writes Hindi in Devanagari, not transliterated Latin', () => {
    const devanagari = /[ऀ-ॿ]/;
    for (const key of STRING_KEYS) {
      // The app's own name is the deliberate exception: "Sachmuch" is the Latin wordmark.
      if (key === 'appName' || key === 'reaction') continue;
      expect(devanagari.test(STRINGS[key].hi), `${key}: "${STRINGS[key].hi}"`).toBe(true);
    }
  });
});

describe('engagement learning', () => {
  const sig = (over: Partial<FactSignal> = {}): FactSignal => ({
    factId: 'f', categoryId: 2, dwellMs: 6000, ...over,
  });

  it('treats a fast skip as no interest at all', () => {
    expect(interestOf(sig({ dwellMs: 400 }))).toBe(0);
  });

  it('ranks a liked card above one that was merely read', () => {
    expect(interestOf(sig({ liked: true }))).toBeGreaterThan(interestOf(sig()));
  });

  it('still counts a like on a card the user barely held', () => {
    expect(interestOf(sig({ dwellMs: 300, liked: true }))).toBeGreaterThan(0);
  });

  it('raises a category the user engages with and lowers one they skip', () => {
    let a = emptyAffinity();
    for (let i = 0; i < 6; i++) a = learn(a, sig({ categoryId: 9, dwellMs: 9000, liked: true }));
    for (let i = 0; i < 6; i++) a = learn(a, sig({ categoryId: 21, dwellMs: 200 }));
    expect(scoreFor(a, 9)).toBeGreaterThan(0.7);
    expect(scoreFor(a, 21)).toBeLessThan(0.3);
  });

  it('leaves an unseen category neutral rather than buried', () => {
    expect(scoreFor(emptyAffinity(), 14)).toBe(NEUTRAL);
  });

  it('moves fast on the first signals and slowly once settled', () => {
    let a = emptyAffinity();
    const before = scoreFor(a, 2);
    a = learn(a, sig({ dwellMs: 9000, liked: true }));
    const firstJump = scoreFor(a, 2) - before;
    for (let i = 0; i < 25; i++) a = learn(a, sig({ dwellMs: 9000, liked: true }));
    const settled = scoreFor(a, 2);
    a = learn(a, sig({ dwellMs: 0 }));
    expect(firstJump).toBeGreaterThan(settled - scoreFor(a, 2));
  });

  describe('the mixed feed', () => {
    const pool = Array.from({ length: 120 }, (_, i) => ({
      id: `f${i}`, categoryId: (i % 6) + 1, quality: 0.7,
    }));

    it('treats an unscored fact as average rather than as bad', () => {
      const unscored = pool.map(({ quality: _q, ...rest }) => rest);
      expect(buildFeed(unscored, emptyAffinity(), 20)).toHaveLength(20);
    });

    it('draws from every category, not just the favourite one', () => {
      let a = emptyAffinity();
      for (let i = 0; i < 10; i++) a = learn(a, sig({ categoryId: 1, dwellMs: 9000, liked: true }));
      const feed = buildFeed(pool, a, 40);
      expect(new Set(feed.map((f) => f.categoryId)).size).toBeGreaterThan(2);
    });

    it('never runs more than two cards from one category back to back', () => {
      let a = emptyAffinity();
      for (let i = 0; i < 30; i++) a = learn(a, sig({ categoryId: 3, dwellMs: 9000, liked: true }));
      const feed = buildFeed(pool, a, 60);
      let run = 1;
      for (let i = 1; i < feed.length; i++) {
        run = feed[i]!.categoryId === feed[i - 1]!.categoryId ? run + 1 : 1;
        expect(run, `run of ${run} at position ${i}`).toBeLessThanOrEqual(2);
      }
    });

    it('favours the learned category over one the user skips', () => {
      let a = emptyAffinity();
      for (let i = 0; i < 20; i++) {
        a = learn(a, sig({ categoryId: 4, dwellMs: 9000, liked: true }));
        a = learn(a, sig({ categoryId: 5, dwellMs: 100 }));
      }
      const feed = buildFeed(pool, a, 60);
      const liked = feed.filter((f) => f.categoryId === 4).length;
      const skipped = feed.filter((f) => f.categoryId === 5).length;
      expect(liked).toBeGreaterThan(skipped);
    });

    it('never repeats a fact within one build', () => {
      const feed = buildFeed(pool, emptyAffinity(), 60);
      expect(new Set(feed.map((f) => f.id)).size).toBe(feed.length);
    });

    it('survives a corrupt stored blob instead of wedging the feed', () => {
      expect(deserializeAffinity('{not json')).toEqual(emptyAffinity());
      expect(deserializeAffinity(null)).toEqual(emptyAffinity());
      const a = learn(emptyAffinity(), sig());
      expect(deserializeAffinity(serializeAffinity(a))).toEqual(a);
    });
  });
});

describe('template-aware mixing', () => {
  it('never runs two identically-shaped facts back to back', () => {
    // A corpus where one template dominates, which is the real situation early on.
    const pool = Array.from({ length: 90 }, (_, i) => ({
      id: `f${i}`,
      categoryId: i % 5 === 0 ? 2 : (i % 7) + 3,
      quality: 0.85,
      templateId: i % 5 === 0 ? 'awards' : `t${i % 6}`,
    }));
    const feed = buildFeed(pool, emptyAffinity(), 50);
    for (let i = 1; i < feed.length; i++) {
      expect(feed[i]!.templateId, `repeat at ${i}`).not.toBe(feed[i - 1]!.templateId);
    }
  });

  it('keeps one template from dominating any short stretch', () => {
    const pool = Array.from({ length: 90 }, (_, i) => ({
      id: `f${i}`, categoryId: (i % 4) + 1, quality: 0.85,
      templateId: i < 45 ? 'awards' : `t${i % 5}`,
    }));
    const feed = buildFeed(pool, emptyAffinity(), 40);
    for (let i = 4; i < feed.length; i++) {
      const window = feed.slice(i - 4, i + 1).filter((f) => f.templateId === 'awards').length;
      expect(window, `${window} of 5 at position ${i}`).toBeLessThanOrEqual(3);
    }
  });

  it('still fills the page when almost everything shares one template', () => {
    const pool = Array.from({ length: 60 }, (_, i) => ({
      id: `f${i}`, categoryId: 2, quality: 0.8, templateId: 'awards',
    }));
    // The constraints are preferences, not a reason to serve a short page.
    expect(buildFeed(pool, emptyAffinity(), 20)).toHaveLength(20);
  });
});
