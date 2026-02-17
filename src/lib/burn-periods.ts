/**
 * Monthly burn period utilities.
 *
 * Snapshots are captured monthly. The date key is "YYYY-MM" (e.g. "2026-02").
 * Users can only save a snapshot for the CURRENT month — not past or future.
 */

export interface BurnPeriod {
  /** The snapshot key: "YYYY-MM" */
  dateKey: string;
  /** Human label, e.g. "Feb 2026" */
  label: string;
  /** Short label for chart x-axis, e.g. "Feb '26" */
  shortLabel: string;
  /** Year */
  year: number;
  /** Month (1-12) */
  month: number;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Build a BurnPeriod for a given year/month */
export function makePeriod(year: number, month: number): BurnPeriod {
  return {
    dateKey: `${year}-${pad2(month)}`,
    label: `${MONTH_FULL[month - 1]} ${year}`,
    shortLabel: `${MONTH_NAMES[month - 1]} '${String(year).slice(2)}`,
    year,
    month,
  };
}

/** Get the current month's BurnPeriod */
export function getCurrentPeriod(): BurnPeriod {
  const now = new Date();
  return makePeriod(now.getFullYear(), now.getMonth() + 1);
}

/** Check if a date key matches the current month */
export function isCurrentMonth(dateKey: string): boolean {
  return dateKey === getCurrentPeriod().dateKey;
}

/** Generate all monthly periods from start to end (inclusive) */
export function getMonthlyPeriods(startYear: number, startMonth: number, endYear: number, endMonth: number): BurnPeriod[] {
  const periods: BurnPeriod[] = [];
  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    periods.push(makePeriod(y, m));
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return periods;
}

/**
 * Parse a target completion date like "November 2027" into { year, month }.
 * Returns null if unparseable.
 */
export function parseTargetMonth(dateStr: string | null): { year: number; month: number } | null {
  if (!dateStr) return null;
  const map: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4,
    may: 5, june: 6, july: 7, august: 8,
    september: 9, october: 10, november: 11, december: 12,
  };
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const month = map[parts[0].toLowerCase()];
  const year = parseInt(parts[1]);
  if (!month || isNaN(year)) return null;
  return { year, month };
}
