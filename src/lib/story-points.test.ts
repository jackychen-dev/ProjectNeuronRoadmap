import { describe, it, expect } from "vitest";
import {
  basePointsFromDays,
  unknownsAdd,
  integrationAdd,
  roundToFibonacci,
  computeStoryPoints,
  finalAsNumber,
} from "./story-points";

/* ─── basePointsFromDays ─────────────────────────────── */

describe("basePointsFromDays", () => {
  it("returns 0 for 0 or negative days", () => {
    expect(basePointsFromDays(0)).toEqual({ base: 0, flag21Plus: false });
    expect(basePointsFromDays(-1)).toEqual({ base: 0, flag21Plus: false });
  });

  it("returns 1 for 1 day", () => {
    expect(basePointsFromDays(1)).toEqual({ base: 1, flag21Plus: false });
  });

  it("returns 3 for 2–3 days", () => {
    expect(basePointsFromDays(2).base).toBe(3);
    expect(basePointsFromDays(3).base).toBe(3);
  });

  it("returns 5 for 4–5 days", () => {
    expect(basePointsFromDays(4).base).toBe(5);
    expect(basePointsFromDays(5).base).toBe(5);
  });

  it("returns 8 for 6–8 days", () => {
    expect(basePointsFromDays(6).base).toBe(8);
    expect(basePointsFromDays(7).base).toBe(8);
    expect(basePointsFromDays(8).base).toBe(8);
  });

  it("returns 13 for 9–13 days", () => {
    expect(basePointsFromDays(9).base).toBe(13);
    expect(basePointsFromDays(13).base).toBe(13);
  });

  it("returns 21 with flag for 14+ days", () => {
    expect(basePointsFromDays(14)).toEqual({ base: 21, flag21Plus: true });
    expect(basePointsFromDays(20)).toEqual({ base: 21, flag21Plus: true });
    expect(basePointsFromDays(100)).toEqual({ base: 21, flag21Plus: true });
  });
});

/* ─── unknownsAdd ────────────────────────────────────── */

describe("unknownsAdd", () => {
  it("None => 0", () => expect(unknownsAdd("None")).toBe(0));
  it("Low => 1", () => expect(unknownsAdd("Low")).toBe(1));
  it("Low–Moderate => 2", () => expect(unknownsAdd("Low–Moderate")).toBe(2));
  it("High => 4", () => expect(unknownsAdd("High")).toBe(4));
  it("Very High / Exploratory => 5", () => expect(unknownsAdd("Very High / Exploratory")).toBe(5));
});

/* ─── integrationAdd ─────────────────────────────────── */

describe("integrationAdd", () => {
  it("Single system => 0", () => expect(integrationAdd("Single system")).toBe(0));
  it("1–2 systems => 0", () => expect(integrationAdd("1–2 systems")).toBe(0));
  it("Multiple internal systems => 1", () => expect(integrationAdd("Multiple internal systems")).toBe(1));
  it("Cross-team / external dependency => 1", () => expect(integrationAdd("Cross-team / external dependency")).toBe(1));
});

/* ─── roundToFibonacci ───────────────────────────────── */

describe("roundToFibonacci", () => {
  it("returns 0 for 0 or negative", () => {
    expect(roundToFibonacci(0)).toBe(0);
    expect(roundToFibonacci(-3)).toBe(0);
  });

  it("returns exact Fibonacci values unchanged", () => {
    expect(roundToFibonacci(1)).toBe(1);
    expect(roundToFibonacci(3)).toBe(3);
    expect(roundToFibonacci(5)).toBe(5);
    expect(roundToFibonacci(8)).toBe(8);
    expect(roundToFibonacci(13)).toBe(13);
    expect(roundToFibonacci(21)).toBe(21);
  });

  it("rounds up when exactly at midpoint (2 is midpoint of 1,3)", () => {
    // (1+3)/2 = 2, rule: "exactly between → round up"
    expect(roundToFibonacci(2)).toBe(3);
  });

  it("rounds up when exactly between", () => {
    // midpoint of 1 and 3 is 2 → round up to 3
    expect(roundToFibonacci(2)).toBe(3);
    // midpoint of 3 and 5 is 4 → round up to 5
    expect(roundToFibonacci(4)).toBe(5);
    // midpoint of 8 and 13 is 10.5 → 10 < 10.5 rounds down to 8
    expect(roundToFibonacci(10)).toBe(8);
    // 11 >= 10.5 → rounds to 13
    expect(roundToFibonacci(11)).toBe(13);
  });

  it("biasUp: raw=9 rounds to 13 (not 8)", () => {
    // midpoint of 8 and 13 = 10.5, 9 < 10.5 → normally 8
    expect(roundToFibonacci(9)).toBe(8);
    // with biasUp: 9 > 8 → rounds up to 13
    expect(roundToFibonacci(9, { biasUp: true })).toBe(13);
  });

  it("biasUp: raw=6 rounds to 8 (not 5)", () => {
    // midpoint of 5 and 8 = 6.5, 6 < 6.5 → normally 5
    expect(roundToFibonacci(6)).toBe(5);
    // with biasUp: 6 > 5 → rounds up to 8
    expect(roundToFibonacci(6, { biasUp: true })).toBe(8);
  });

  it("caps at 21 for values >= 21", () => {
    expect(roundToFibonacci(25)).toBe(21);
    expect(roundToFibonacci(100)).toBe(21);
  });
});

/* ─── computeStoryPoints ─────────────────────────────── */

describe("computeStoryPoints", () => {
  it("basic 3-day task, no unknowns, single system", () => {
    const result = computeStoryPoints({
      days: 3,
      unknowns: "None",
      integration: "Single system",
    });
    expect(result.base).toBe(3);
    expect(result.unknownsAdj).toBe(0);
    expect(result.integrationAdj).toBe(0);
    expect(result.raw).toBe(3);
    expect(result.final).toBe(3);
    expect(result.flags).toEqual([]);
  });

  it("5-day task with Low unknowns and Multiple systems", () => {
    const result = computeStoryPoints({
      days: 5,
      unknowns: "Low",
      integration: "Multiple internal systems",
    });
    expect(result.base).toBe(5);
    expect(result.unknownsAdj).toBe(1);
    expect(result.integrationAdj).toBe(1);
    expect(result.raw).toBe(7);
    // 7 is between 5 and 8, midpoint 6.5, 7 >= 6.5 → rounds to 8
    expect(result.final).toBe(8);
    expect(result.flags).toEqual([]);
  });

  it("8-day task with Very High unknowns => biasUp", () => {
    const result = computeStoryPoints({
      days: 8,
      unknowns: "Very High / Exploratory",
      integration: "Single system",
    });
    expect(result.base).toBe(8);
    expect(result.unknownsAdj).toBe(5);
    expect(result.raw).toBe(13);
    expect(result.final).toBe(13);
    expect(result.flags).toContain("very_high_unknowns");
  });

  it("3-day task with Very High unknowns: raw=8, biasUp no effect at exact anchor", () => {
    const result = computeStoryPoints({
      days: 3,
      unknowns: "Very High / Exploratory",
      integration: "Single system",
    });
    expect(result.base).toBe(3);
    expect(result.unknownsAdj).toBe(5);
    expect(result.raw).toBe(8);
    expect(result.final).toBe(8); // exact anchor
    expect(result.flags).toContain("very_high_unknowns");
  });

  it("14+ days forces 21+ with break_down_required", () => {
    const result = computeStoryPoints({
      days: 14,
      unknowns: "None",
      integration: "Single system",
    });
    expect(result.final).toBe("21+");
    expect(result.flags).toContain("break_down_required");
  });

  it("20 days with Very High unknowns", () => {
    const result = computeStoryPoints({
      days: 20,
      unknowns: "Very High / Exploratory",
      integration: "Cross-team / external dependency",
    });
    expect(result.final).toBe("21+");
    expect(result.flags).toContain("break_down_required");
    expect(result.flags).toContain("very_high_unknowns");
  });

  it("1-day Low–Moderate unknowns, Cross-team", () => {
    const result = computeStoryPoints({
      days: 1,
      unknowns: "Low–Moderate",
      integration: "Cross-team / external dependency",
    });
    expect(result.base).toBe(1);
    expect(result.unknownsAdj).toBe(2);
    expect(result.integrationAdj).toBe(1);
    expect(result.raw).toBe(4);
    // 4 is midpoint of 3 and 5 → rounds up to 5
    expect(result.final).toBe(5);
  });
});

/* ─── finalAsNumber ──────────────────────────────────── */

describe("finalAsNumber", () => {
  it("returns numeric value as-is", () => {
    expect(finalAsNumber(5)).toBe(5);
    expect(finalAsNumber(13)).toBe(13);
  });

  it("returns 21 for '21+'", () => {
    expect(finalAsNumber("21+")).toBe(21);
  });
});

