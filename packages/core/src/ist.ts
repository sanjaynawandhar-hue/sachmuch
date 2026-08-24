/**
 * Day boundaries for the whole app.
 *
 * Every streak, coin ceiling, quiz and fact-of-the-day keys off the IST calendar
 * day taken from the SERVER clock. Device time is the first thing anyone will
 * try to cheat, so no function here accepts a client-supplied "today".
 */

/** India Standard Time is a fixed UTC+05:30 with no daylight saving, ever. */
export const IST_OFFSET_MINUTES = 5 * 60 + 30;

/** 'YYYY-MM-DD' for the IST day containing `instant`. */
export function istDay(instant: Date = new Date()): string {
  const shifted = new Date(instant.getTime() + IST_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** The UTC instant at which an IST day begins. */
export function istDayStart(day: string): Date {
  return new Date(new Date(`${day}T00:00:00.000Z`).getTime() - IST_OFFSET_MINUTES * 60_000);
}

export function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Whole IST days between two day strings. Negative when `b` precedes `a`. */
export function daysBetween(a: string, b: string): number {
  const ms = new Date(`${b}T00:00:00.000Z`).getTime() - new Date(`${a}T00:00:00.000Z`).getTime();
  return Math.round(ms / 86_400_000);
}

export const isConsecutive = (previous: string, next: string) => daysBetween(previous, next) === 1;
