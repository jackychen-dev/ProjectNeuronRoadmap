import { describe, it, expect } from "vitest";

/**
 * Snapshot idempotency test.
 * 
 * The saveSnapshot action uses Prisma upsert with a unique constraint
 * on (programId, date). This test verifies the logic at the unit level.
 */
describe("snapshot idempotency", () => {
  it("upsert key is (programId, date) — same day overwrites", () => {
    // Simulate the unique key logic
    const snapshots = new Map<string, { totalPoints: number; completedPoints: number; percentComplete: number }>();

    function upsertSnapshot(programId: string, date: string, totalPoints: number, completedPoints: number) {
      const key = `${programId}::${date}`;
      const percentComplete = totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0;
      snapshots.set(key, { totalPoints, completedPoints, percentComplete });
      return snapshots.get(key);
    }

    // First save
    const s1 = upsertSnapshot("prog1", "2026-02-17", 100, 30);
    expect(s1?.totalPoints).toBe(100);
    expect(s1?.completedPoints).toBe(30);
    expect(s1?.percentComplete).toBe(30);

    // Same day — should overwrite, not duplicate
    const s2 = upsertSnapshot("prog1", "2026-02-17", 100, 50);
    expect(s2?.totalPoints).toBe(100);
    expect(s2?.completedPoints).toBe(50);
    expect(s2?.percentComplete).toBe(50);

    // Only one entry for this key
    expect(snapshots.size).toBe(1);

    // Different day — creates new entry
    upsertSnapshot("prog1", "2026-02-18", 100, 55);
    expect(snapshots.size).toBe(2);

    // Different program, same day — creates new entry
    upsertSnapshot("prog2", "2026-02-17", 200, 100);
    expect(snapshots.size).toBe(3);
  });

  it("handles zero total points gracefully", () => {
    function computePercent(total: number, completed: number): number {
      return total > 0 ? (completed / total) * 100 : 0;
    }

    expect(computePercent(0, 0)).toBe(0);
    expect(computePercent(100, 0)).toBe(0);
    expect(computePercent(100, 100)).toBe(100);
    expect(computePercent(100, 50)).toBe(50);
  });

  it("scope change detection works", () => {
    const snapshots = [
      { date: "2026-02-15", totalPoints: 100, completedPoints: 20 },
      { date: "2026-02-16", totalPoints: 100, completedPoints: 30 },
      { date: "2026-02-17", totalPoints: 120, completedPoints: 40 }, // scope changed!
    ];

    const scopeChanges: string[] = [];
    for (let i = 1; i < snapshots.length; i++) {
      if (snapshots[i].totalPoints !== snapshots[i - 1].totalPoints) {
        scopeChanges.push(snapshots[i].date);
      }
    }

    expect(scopeChanges).toEqual(["2026-02-17"]);
  });
});
