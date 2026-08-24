/**
 * Spaced repetition, SM-2.
 *
 * Everyone in this category markets microlearning; nobody implements retention.
 * A fact you liked comes back on a schedule, and the daily quiz is built from
 * what you personally have seen — that is the difference between reading and
 * learning.
 */

export interface SrsItem {
  ease: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueAt: Date;
}

/** 0–5, SM-2's grade scale. Below 3 is a lapse. */
export type Grade = 0 | 1 | 2 | 3 | 4 | 5;

export const MIN_EASE = 1.3;
export const DEFAULT_EASE = 2.5;

export function newItem(now: Date = new Date()): SrsItem {
  return { ease: DEFAULT_EASE, intervalDays: 0, repetitions: 0, lapses: 0, dueAt: now };
}

export function review(item: SrsItem, grade: Grade, now: Date = new Date()): SrsItem {
  const ease = Math.max(
    MIN_EASE,
    item.ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)),
  );

  if (grade < 3) {
    // A lapse resets the interval but keeps the (now lower) ease, so a fact you
    // keep forgetting comes back more often rather than being treated as new.
    return {
      ease,
      intervalDays: 1,
      repetitions: 0,
      lapses: item.lapses + 1,
      dueAt: addDaysTo(now, 1),
    };
  }

  const repetitions = item.repetitions + 1;
  const intervalDays =
    repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(item.intervalDays * ease);

  return { ease, intervalDays, repetitions, lapses: item.lapses, dueAt: addDaysTo(now, intervalDays) };
}

function addDaysTo(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

export const isDue = (item: SrsItem, now: Date = new Date()) => item.dueAt.getTime() <= now.getTime();
