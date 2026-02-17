import { describe, it, expect } from "vitest";
import {
  subcomponentTotalPoints,
  subcomponentCompletedPoints,
  subcomponentPercent,
  workstreamTotalPoints,
  workstreamCompletedPoints,
  workstreamPercent,
  initiativeTotalPoints,
  initiativeCompletedPoints,
  initiativePercent,
  ownerTotalPoints,
  ownerCompletedPoints,
} from "../rollup";

describe("rollup calculations", () => {
  const makeSubTask = (points: number, status: string) => ({
    points,
    status,
    completionPercent: status === "DONE" ? 100 : status === "IN_PROGRESS" ? 50 : 0,
  });

  describe("subcomponentTotalPoints", () => {
    it("returns 0 for empty subtasks", () => {
      expect(subcomponentTotalPoints({ subTasks: [], status: "NOT_STARTED", totalPoints: 10 })).toBe(0);
    });

    it("sums subtask points", () => {
      const init = {
        subTasks: [makeSubTask(5, "DONE"), makeSubTask(3, "IN_PROGRESS"), makeSubTask(8, "NOT_STARTED")],
        status: "IN_PROGRESS",
        totalPoints: 0,
      };
      expect(subcomponentTotalPoints(init)).toBe(16);
    });
  });

  describe("subcomponentCompletedPoints", () => {
    it("only counts DONE subtasks", () => {
      const init = {
        subTasks: [makeSubTask(5, "DONE"), makeSubTask(3, "IN_PROGRESS"), makeSubTask(8, "NOT_STARTED")],
        status: "IN_PROGRESS",
        totalPoints: 0,
      };
      // Only the 5-point DONE subtask counts
      expect(subcomponentCompletedPoints(init)).toBe(5);
    });

    it("returns 0 when no subtasks are DONE", () => {
      const init = {
        subTasks: [makeSubTask(3, "IN_PROGRESS"), makeSubTask(8, "NOT_STARTED")],
        status: "IN_PROGRESS",
        totalPoints: 0,
      };
      expect(subcomponentCompletedPoints(init)).toBe(0);
    });

    it("returns all points when all subtasks are DONE", () => {
      const init = {
        subTasks: [makeSubTask(5, "DONE"), makeSubTask(3, "DONE")],
        status: "DONE",
        totalPoints: 0,
      };
      expect(subcomponentCompletedPoints(init)).toBe(8);
    });
  });

  describe("subcomponentPercent", () => {
    it("returns 0 for no subtasks", () => {
      expect(subcomponentPercent({ subTasks: [], status: "NOT_STARTED", totalPoints: 0 })).toBe(0);
    });

    it("returns correct percentage", () => {
      const init = {
        subTasks: [makeSubTask(5, "DONE"), makeSubTask(5, "NOT_STARTED")],
        status: "IN_PROGRESS",
        totalPoints: 0,
      };
      expect(subcomponentPercent(init)).toBe(50);
    });

    it("returns 100% when all done", () => {
      const init = {
        subTasks: [makeSubTask(3, "DONE"), makeSubTask(7, "DONE")],
        status: "DONE",
        totalPoints: 0,
      };
      expect(subcomponentPercent(init)).toBe(100);
    });
  });

  describe("workstream rollup", () => {
    it("sums across initiatives", () => {
      const ws = {
        initiatives: [
          { subTasks: [makeSubTask(5, "DONE"), makeSubTask(3, "NOT_STARTED")], status: "IN_PROGRESS", totalPoints: 0 },
          { subTasks: [makeSubTask(8, "DONE"), makeSubTask(2, "DONE")], status: "DONE", totalPoints: 0 },
        ],
      };
      expect(workstreamTotalPoints(ws)).toBe(18); // 5+3+8+2
      expect(workstreamCompletedPoints(ws)).toBe(15); // 5+8+2
      expect(workstreamPercent(ws)).toBe(83); // round(15/18*100)
    });
  });

  describe("initiative (program) rollup", () => {
    it("sums across all workstreams", () => {
      const ws1 = {
        initiatives: [
          { subTasks: [makeSubTask(10, "DONE")], status: "DONE", totalPoints: 0 },
        ],
      };
      const ws2 = {
        initiatives: [
          { subTasks: [makeSubTask(10, "NOT_STARTED")], status: "NOT_STARTED", totalPoints: 0 },
        ],
      };
      expect(initiativeTotalPoints([ws1, ws2])).toBe(20);
      expect(initiativeCompletedPoints([ws1, ws2])).toBe(10);
      expect(initiativePercent([ws1, ws2])).toBe(50);
    });
  });

  describe("owner rollup", () => {
    it("only counts items owned by the user", () => {
      const ws = {
        initiatives: [
          { subTasks: [makeSubTask(5, "DONE")], status: "DONE", totalPoints: 0, ownerId: "user1" },
          { subTasks: [makeSubTask(10, "DONE")], status: "DONE", totalPoints: 0, ownerId: "user2" },
          { subTasks: [makeSubTask(3, "NOT_STARTED")], status: "NOT_STARTED", totalPoints: 0, ownerId: "user1" },
        ],
      };
      expect(ownerTotalPoints([ws], "user1")).toBe(8); // 5+3
      expect(ownerCompletedPoints([ws], "user1")).toBe(5); // only the DONE one
    });
  });

  describe("story points rule enforcement", () => {
    it("points only come from subtasks, not initiative/workstream level", () => {
      // An initiative with totalPoints=100 but no subtasks should have 0 computed points
      const init = { subTasks: [], status: "IN_PROGRESS", totalPoints: 100 };
      expect(subcomponentTotalPoints(init)).toBe(0);
      expect(subcomponentCompletedPoints(init)).toBe(0);
    });
  });
});
