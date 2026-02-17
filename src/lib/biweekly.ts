/**
 * Biweekly period utilities.
 *
 * Snapshots are locked to biweekly (2-week) periods.
 * Each period starts on a Monday and lasts 14 days.
 * Users can only save a snapshot for the CURRENT biweekly period.
 *
 * We anchor periods to ISO weeks, pairing them:
 *   Period 1 = ISO weeks 1–2, Period 2 = ISO weeks 3–4, etc.
 * The snapshot date stored is the Monday of the first week in the period.
 */

/** Get the ISO week number for a date (Monday = start of week) */
function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Get the ISO week-year for a date */
function getISOWeekYear(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  return date.getUTCFullYear();
}

/** Get the Monday of ISO week `wk` in `year` */
function mondayOfISOWeek(year: number, wk: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dow = jan4.getUTCDay() || 7; // Mon=1 .. Sun=7
  const isoWeek1Monday = new Date(jan4.getTime() - (dow - 1) * 86400000);
  return new Date(isoWeek1Monday.getTime() + (wk - 1) * 7 * 86400000);
}

export interface BiweeklyPeriod {
  /** The snapshot key date: Monday of the first week (YYYY-MM-DD) */
  dateKey: string;
  /** Start of the 2-week window (inclusive) */
  startDate: Date;
  /** End of the 2-week window (inclusive, Sunday) */
  endDate: Date;
  /** Human label, e.g. "Feb 10 – Feb 23" */
  label: string;
  /** ISO year */
  year: number;
  /** Which biweekly period in the year (1-based) */
  periodNumber: number;
}

function fmtShort(d: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Given any date, return the biweekly period it falls in. */
export function getBiweeklyPeriod(date: Date): BiweeklyPeriod {
  const isoWeek = getISOWeek(date);
  const isoYear = getISOWeekYear(date);

  // Pair weeks: 1-2 → period 1, 3-4 → period 2, etc.
  const periodNumber = Math.ceil(isoWeek / 2);
  const firstWeekOfPeriod = (periodNumber - 1) * 2 + 1;

  const startDate = mondayOfISOWeek(isoYear, firstWeekOfPeriod);
  const endDate = new Date(startDate.getTime() + 13 * 86400000); // +13 days = Sunday

  return {
    dateKey: toDateString(startDate),
    startDate,
    endDate,
    label: `${fmtShort(startDate)} – ${fmtShort(endDate)}`,
    year: isoYear,
    periodNumber,
  };
}

/** Get the current biweekly period. */
export function getCurrentBiweeklyPeriod(): BiweeklyPeriod {
  return getBiweeklyPeriod(new Date());
}

/** Check if a given date string (YYYY-MM-DD) falls in the current biweekly period. */
export function isInCurrentPeriod(dateStr: string): boolean {
  const current = getCurrentBiweeklyPeriod();
  return dateStr === current.dateKey;
}

/** Format a snapshot date key for chart display. */
export function formatPeriodLabel(dateKey: string): string {
  const d = new Date(dateKey + "T00:00:00Z");
  const period = getBiweeklyPeriod(d);
  return period.label;
}

/**
 * Generate all biweekly period date keys between two dates.
 * Useful for building the x-axis of the burndown chart.
 */
export function getBiweeklyPeriodsInRange(from: Date, to: Date): BiweeklyPeriod[] {
  const periods: BiweeklyPeriod[] = [];
  const seen = new Set<string>();
  let cursor = new Date(from);

  while (cursor <= to) {
    const period = getBiweeklyPeriod(cursor);
    if (!seen.has(period.dateKey)) {
      seen.add(period.dateKey);
      periods.push(period);
    }
    // Jump forward 14 days
    cursor = new Date(cursor.getTime() + 14 * 86400000);
  }

  // Make sure we include the period containing `to`
  const lastPeriod = getBiweeklyPeriod(to);
  if (!seen.has(lastPeriod.dateKey)) {
    periods.push(lastPeriod);
  }

  return periods.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}
