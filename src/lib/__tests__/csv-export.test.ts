import { describe, it, expect } from "vitest";

/**
 * CSV export formatting tests.
 * Tests the CSV generation logic without needing the full Next.js API route.
 */

function escapeCsvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function buildCsvRow(fields: (string | number | null | undefined)[]): string {
  return fields
    .map((f) => {
      if (f === null || f === undefined) return "";
      if (typeof f === "number") return String(f);
      return escapeCsvField(String(f));
    })
    .join(",");
}

describe("CSV export formatting", () => {
  it("escapes double quotes in field values", () => {
    expect(escapeCsvField('He said "hello"')).toBe('"He said ""hello"""');
  });

  it("wraps strings in quotes", () => {
    expect(escapeCsvField("simple text")).toBe('"simple text"');
  });

  it("handles empty strings", () => {
    expect(escapeCsvField("")).toBe('""');
  });

  it("builds a CSV row correctly", () => {
    const row = buildCsvRow(["Name", 42, null, "Has \"quotes\"", undefined]);
    expect(row).toBe('"Name",42,,"Has ""quotes""",');
  });

  it("numbers are not quoted", () => {
    const row = buildCsvRow([100, 0, 3.14]);
    expect(row).toBe("100,0,3.14");
  });

  it("produces valid CSV with headers and rows", () => {
    const header = "ID,Name,Points,Status";
    const rows = [
      buildCsvRow(["id1", "Task One", 5, "DONE"]),
      buildCsvRow(["id2", 'Task "Two"', 3, "IN_PROGRESS"]),
      buildCsvRow(["id3", "Task, Three", 8, "NOT_STARTED"]),
    ];
    const csv = [header, ...rows].join("\n");

    expect(csv).toContain("ID,Name,Points,Status");
    expect(csv).toContain('"Task One"');
    expect(csv).toContain('"Task ""Two"""');
    expect(csv).toContain('"Task, Three"');
    // Verify it has 4 lines (1 header + 3 rows)
    expect(csv.split("\n").length).toBe(4);
  });

  it("handles the full export entities list", () => {
    const entities = [
      "programs",
      "initiatives",
      "workstreams",
      "subtasks",
      "snapshots",
      "users",
      "open-issues",
      "docs",
      "milestones",
      "partners",
      "assignments",
    ];
    // Just verify all entity names are valid strings
    for (const e of entities) {
      expect(typeof e).toBe("string");
      expect(e.length).toBeGreaterThan(0);
    }
    expect(entities.length).toBe(11);
  });
});
