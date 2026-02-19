/**
 * Shared burndown chart data logic so Dashboard and Burndown page show the same overall chart.
 */

import { getMonthlyPeriods, parseTargetMonth, type BurnPeriod } from "./burn-periods";

export type { BurnPeriod };

export interface ProgramRef {
  id: string;
  name: string;
  fyStartYear: number;
  fyEndYear: number;
  startDate: string | null;
  targetDate: string | null;
}

export interface WorkstreamRefForTimeline {
  targetCompletionDate: string | null;
}

export interface ChartPoint {
  label: string;
  date: string;
  remaining: number | null;
  ideal: number;
  scopeLine: number;
  isCurrent: boolean;
  scopeChanged: boolean;
}

/** Build timeline of monthly periods from program + workstreams (same as Burndown page). */
export function buildTimeline(
  program: ProgramRef,
  workstreams: WorkstreamRefForTimeline[]
): BurnPeriod[] {
  let startYear = 2000 + program.fyStartYear;
  let startMonth = 1;
  if (program.startDate) {
    const d = new Date(program.startDate);
    startYear = d.getFullYear();
    startMonth = d.getMonth() + 1;
  }

  let endYear = 2000 + program.fyEndYear;
  let endMonth = 11;
  for (const ws of workstreams) {
    const parsed = parseTargetMonth(ws.targetCompletionDate);
    if (parsed && (parsed.year > endYear || (parsed.year === endYear && parsed.month > endMonth))) {
      endYear = parsed.year;
      endMonth = parsed.month;
    }
  }
  if (program.targetDate) {
    const d = new Date(program.targetDate);
    endYear = d.getFullYear();
    endMonth = d.getMonth() + 1;
  }
  return getMonthlyPeriods(startYear, startMonth, endYear, endMonth);
}

/**
 * Build chart data for a burndown (same as Burndown page).
 * Purple = scope from peak, Blue = ideal, Orange = remaining.
 */
export function buildChartData(
  allPeriods: BurnPeriod[],
  snapshotByDate: Map<string, { totalPoints: number; completedPoints: number }>,
  startTotal: number,
  liveRemaining: number,
  liveTotalPts: number,
  currentPeriod: BurnPeriod
): ChartPoint[] {
  const totalPeriods = allPeriods.length;
  const lastIdx = totalPeriods - 1 || 1;

  const scopeRaw: number[] = [];
  let lastKnownScope = startTotal;
  for (let i = 0; i < allPeriods.length; i++) {
    const snap = snapshotByDate.get(allPeriods[i].dateKey);
    const isCurrent = allPeriods[i].dateKey === currentPeriod.dateKey;
    if (snap) {
      lastKnownScope = snap.totalPoints;
    } else if (isCurrent) {
      lastKnownScope = liveTotalPts;
    }
    scopeRaw.push(lastKnownScope);
  }

  const peakScope = scopeRaw.length > 0 ? Math.max(...scopeRaw) : startTotal;

  return allPeriods.map((period, idx) => {
    const snap = snapshotByDate.get(period.dateKey);
    const isCurrent = period.dateKey === currentPeriod.dateKey;

    const idealRemaining = Math.max(0, Math.round(startTotal * (1 - idx / lastIdx)));
    const scopeLine = Math.max(0, Math.round(peakScope * (1 - idx / lastIdx)));

    let scopeChanged = idx > 0 && scopeRaw[idx] !== scopeRaw[idx - 1];

    let remaining: number | null = null;
    let label = period.shortLabel;
    if (idx === 0) {
      remaining = peakScope;
    } else if (snap) {
      remaining = snap.totalPoints - snap.completedPoints;
    } else if (isCurrent) {
      remaining = liveRemaining;
      label = `${period.shortLabel} *`;
    }

    return { label, date: period.dateKey, remaining, ideal: idealRemaining, scopeLine, isCurrent, scopeChanged };
  });
}

export interface BurnSnapshotForChart {
  programId: string;
  date: string;
  totalPoints: number;
  completedPoints: number;
  workstreamData?: Record<string, { totalPoints: number; completedPoints: number; subcomponents?: Record<string, { totalPoints: number; completedPoints: number }> }> | null;
}

/**
 * Build snapshot-by-date map for the overall chart (all workstreams, no org filter).
 * Matches Burndown page aggregation: use workstreamData when present, else totalPoints/completedPoints.
 */
export function buildOverallSnapshotByDate(
  snapshots: BurnSnapshotForChart[],
  programId: string | null
): Map<string, { totalPoints: number; completedPoints: number }> {
  const byDate = new Map<string, { totalPoints: number; completedPoints: number }>();
  const relevant = programId ? snapshots.filter((s) => s.programId === programId) : snapshots;

  for (const snap of relevant) {
    if (snap.workstreamData && typeof snap.workstreamData === "object") {
      let total = 0;
      let completed = 0;
      for (const entry of Object.values(snap.workstreamData)) {
        if (entry.subcomponents) {
          for (const sub of Object.values(entry.subcomponents)) {
            total += sub.totalPoints;
            completed += sub.completedPoints;
          }
        } else {
          total += entry.totalPoints;
          completed += entry.completedPoints;
        }
      }
      const existing = byDate.get(snap.date) || { totalPoints: 0, completedPoints: 0 };
      existing.totalPoints += total;
      existing.completedPoints += completed;
      byDate.set(snap.date, existing);
    } else {
      const e = byDate.get(snap.date) || { totalPoints: 0, completedPoints: 0 };
      e.totalPoints += snap.totalPoints;
      e.completedPoints += snap.completedPoints;
      byDate.set(snap.date, e);
    }
  }
  return byDate;
}
