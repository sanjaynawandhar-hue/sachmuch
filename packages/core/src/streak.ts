import { addDays, daysBetween, istDay } from './ist';

/**
 * Streaks.
 *
 * The whole design brief for this file is one line: the streak must survive a
 * timezone change and a device clock change. It does, because `now` is always
 * the server clock and the day is always the IST calendar day — the client
 * never supplies either.
 */

export interface StreakState {
  current: number;
  longest: number;
  /** IST day of the last qualifying visit, or null for a user who has never opened. */
  lastDayIst: string | null;
  freezesOwned: number;
  freezeUsedOnIst: string | null;
}

export interface StreakOutcome {
  next: StreakState;
  /** True on the day the streak actually advances, which is when the bonus pays. */
  advanced: boolean;
  /** A freeze was spent to bridge exactly one missed day. */
  freezeUsed: boolean;
  /** The streak lapsed and restarted at 1. */
  broken: boolean;
}

export function initialStreak(): StreakState {
  return { current: 0, longest: 0, lastDayIst: null, freezesOwned: 0, freezeUsedOnIst: null };
}

/**
 * Records a qualifying visit at `at` (server clock).
 *
 * A freeze covers exactly one missed day and is consumed automatically — asking
 * the user to spend it in a modal the morning after is how you lose the streak
 * and the user together.
 */
export function recordVisit(state: StreakState, at: Date = new Date()): StreakOutcome {
  const today = istDay(at);

  if (state.lastDayIst === today) {
    return { next: state, advanced: false, freezeUsed: false, broken: false };
  }

  if (state.lastDayIst === null) {
    const next = { ...state, current: 1, longest: Math.max(1, state.longest), lastDayIst: today };
    return { next, advanced: true, freezeUsed: false, broken: false };
  }

  const gap = daysBetween(state.lastDayIst, today);

  // A clock skew that puts "today" before the last recorded day is not a streak
  // event at all. Ignore it rather than letting it rewrite history.
  if (gap <= 0) return { next: state, advanced: false, freezeUsed: false, broken: false };

  if (gap === 1) {
    const current = state.current + 1;
    return {
      next: { ...state, current, longest: Math.max(current, state.longest), lastDayIst: today },
      advanced: true, freezeUsed: false, broken: false,
    };
  }

  if (gap === 2 && state.freezesOwned > 0) {
    const current = state.current + 1;
    return {
      next: {
        ...state,
        current,
        longest: Math.max(current, state.longest),
        lastDayIst: today,
        freezesOwned: state.freezesOwned - 1,
        freezeUsedOnIst: addDays(state.lastDayIst, 1),
      },
      advanced: true, freezeUsed: true, broken: false,
    };
  }

  return {
    next: { ...state, current: 1, longest: Math.max(1, state.longest), lastDayIst: today },
    advanced: true, freezeUsed: false, broken: true,
  };
}

/** Seven beads, each day pressed permanently into the clay. */
export function weekBeads(state: StreakState, at: Date = new Date()): boolean[] {
  const today = istDay(at);
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6);
    if (!state.lastDayIst) return false;
    const offset = daysBetween(day, state.lastDayIst);
    return offset >= 0 && offset < state.current;
  });
}
