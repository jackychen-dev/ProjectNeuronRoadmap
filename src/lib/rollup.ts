/**
 * Shared rollup calculation functions.
 *
 * Terminology mapping:
 *   UI "Initiative"    = Prisma Program
 *   UI "Workstream"    = Prisma Workstream
 *   UI "Subcomponent"  = Prisma Initiative
 *   UI "Subtask"       = Prisma SubTask
 *
 * Rules:
 *  - Story points exist ONLY on Subtasks (SubTask.points).
 *  - Subcomponent points   = sum(subtask.points)
 *  - Workstream points     = sum(subcomponent points)
 *  - Initiative points     = sum(workstream points)
 *  - completedPoints       = sum(points of subtasks with status "DONE")
 *  - percentComplete       = totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0
 */

export interface SubTaskLike {
  points: number;
  status: string;
  completionPercent: number;
}

export interface InitiativeLike {
  subTasks: SubTaskLike[];
  status: string;
  totalPoints: number;
}

export interface WorkstreamLike {
  initiatives: InitiativeLike[];
}

/** Sum of all subtask points for a subcomponent (Initiative) */
export function subcomponentTotalPoints(init: InitiativeLike): number {
  if (init.subTasks.length === 0) return 0;
  return init.subTasks.reduce((s, t) => s + t.points, 0);
}

/** Sum of points of DONE subtasks for a subcomponent */
export function subcomponentCompletedPoints(init: InitiativeLike): number {
  if (init.subTasks.length === 0) return 0;
  return init.subTasks
    .filter((t) => t.status === "DONE")
    .reduce((s, t) => s + t.points, 0);
}

/** Percent complete for a subcomponent */
export function subcomponentPercent(init: InitiativeLike): number {
  const total = subcomponentTotalPoints(init);
  if (total === 0) return 0;
  const completed = subcomponentCompletedPoints(init);
  return Math.round((completed / total) * 100);
}

/** Total points for a workstream = sum of its subcomponent points */
export function workstreamTotalPoints(ws: WorkstreamLike): number {
  return ws.initiatives.reduce((s, i) => s + subcomponentTotalPoints(i), 0);
}

/** Completed points for a workstream */
export function workstreamCompletedPoints(ws: WorkstreamLike): number {
  return ws.initiatives.reduce((s, i) => s + subcomponentCompletedPoints(i), 0);
}

/** Percent complete for a workstream */
export function workstreamPercent(ws: WorkstreamLike): number {
  const total = workstreamTotalPoints(ws);
  if (total === 0) return 0;
  return Math.round((workstreamCompletedPoints(ws) / total) * 100);
}

/** Total points for an initiative (Program) = sum of all workstream points */
export function initiativeTotalPoints(workstreams: WorkstreamLike[]): number {
  return workstreams.reduce((s, ws) => s + workstreamTotalPoints(ws), 0);
}

/** Completed points for an initiative (Program) */
export function initiativeCompletedPoints(workstreams: WorkstreamLike[]): number {
  return workstreams.reduce((s, ws) => s + workstreamCompletedPoints(ws), 0);
}

/** Percent complete for an initiative (Program) */
export function initiativePercent(workstreams: WorkstreamLike[]): number {
  const total = initiativeTotalPoints(workstreams);
  if (total === 0) return 0;
  return Math.round((initiativeCompletedPoints(workstreams) / total) * 100);
}

/**
 * Points completed from subtasks owned by a specific user.
 * Ownership is determined by the subcomponent (Initiative.ownerId).
 */
export function ownerCompletedPoints(
  workstreams: { initiatives: (InitiativeLike & { ownerId?: string | null })[] }[],
  userId: string
): number {
  let completed = 0;
  for (const ws of workstreams) {
    for (const init of ws.initiatives) {
      if (init.ownerId === userId) {
        completed += subcomponentCompletedPoints(init);
      }
    }
  }
  return completed;
}

/** Points total from subtasks under subcomponents owned by a specific user */
export function ownerTotalPoints(
  workstreams: { initiatives: (InitiativeLike & { ownerId?: string | null })[] }[],
  userId: string
): number {
  let total = 0;
  for (const ws of workstreams) {
    for (const init of ws.initiatives) {
      if (init.ownerId === userId) {
        total += subcomponentTotalPoints(init);
      }
    }
  }
  return total;
}
