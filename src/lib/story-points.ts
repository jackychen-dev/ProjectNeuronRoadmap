/* ─────────────────────────────────────────────────────
   Story-Point Estimation — Pure Functions
   ───────────────────────────────────────────────────── */

// ── Enums / Types ──────────────────────────────────

export const UNKNOWNS_LEVELS = [
  "None",
  "Low",
  "Low–Moderate",
  "High",
  "Very High / Exploratory",
] as const;
export type UnknownsLevel = (typeof UNKNOWNS_LEVELS)[number];

export const INTEGRATION_LEVELS = [
  "Single system",
  "1–2 systems",
  "Multiple internal systems",
  "Cross-team / external dependency",
] as const;
export type IntegrationLevel = (typeof INTEGRATION_LEVELS)[number];

export const FIBONACCI_ANCHORS = [1, 3, 5, 8, 13, 21] as const;

// ── Base Points from Estimated Days ────────────────

export function basePointsFromDays(days: number): { base: number; flag21Plus: boolean } {
  if (days <= 0) return { base: 0, flag21Plus: false };
  if (days >= 30) return { base: 21, flag21Plus: true };
  if (days <= 1) return { base: 1, flag21Plus: false };
  if (days <= 3) return { base: 3, flag21Plus: false };
  if (days <= 5) return { base: 5, flag21Plus: false };
  if (days <= 8) return { base: 8, flag21Plus: false };
  if (days <= 13) return { base: 13, flag21Plus: false };
  // 14–29 days → 21 points (no break-down); 30+ → 21+
  return { base: 21, flag21Plus: false };
}

// ── Unknowns Adjustment ────────────────────────────

export function unknownsAdd(level: UnknownsLevel): number {
  switch (level) {
    case "None":
      return 0;
    case "Low":
      return 1;
    case "Low–Moderate":
      return 2;
    case "High":
      return 4;
    case "Very High / Exploratory":
      return 5;
    default:
      return 0;
  }
}

// ── Integration Adjustment ─────────────────────────

export function integrationAdd(level: IntegrationLevel): number {
  switch (level) {
    case "Single system":
      return 0;
    case "1–2 systems":
      return 0;
    case "Multiple internal systems":
      return 1;
    case "Cross-team / external dependency":
      return 1;
    default:
      return 0;
  }
}

// ── Round to Fibonacci Anchor ──────────────────────

export function roundToFibonacci(
  raw: number,
  opts: { biasUp?: boolean } = {}
): number {
  if (raw <= 0) return 0;
  if (raw >= 21) return 21;

  const anchors = FIBONACCI_ANCHORS;
  for (let i = 0; i < anchors.length; i++) {
    if (raw === anchors[i]) return anchors[i];
    if (raw < anchors[i]) {
      if (i === 0) return anchors[0];
      const lower = anchors[i - 1];
      const upper = anchors[i];
      const mid = (lower + upper) / 2;
      if (opts.biasUp) {
        // Bias up: round up unless raw is strictly less than midpoint by > 1
        // e.g. raw=9 with biasUp => 13 (not 8)
        return raw >= mid ? upper : raw > lower ? upper : lower;
      }
      // Normal: exactly at midpoint rounds up, otherwise nearest
      return raw >= mid ? upper : lower;
    }
  }
  return 21;
}

// ── Composite Computation ──────────────────────────

export interface StoryPointsInput {
  days: number;
  unknowns: UnknownsLevel;
  integration: IntegrationLevel;
}

export interface StoryPointsResult {
  base: number;
  unknownsAdj: number;
  integrationAdj: number;
  raw: number;
  final: number | "21+";
  flags: string[];
}

export function computeStoryPoints(input: StoryPointsInput): StoryPointsResult {
  const flags: string[] = [];

  const { base, flag21Plus } = basePointsFromDays(input.days);
  const uAdd = unknownsAdd(input.unknowns);
  const iAdd = integrationAdd(input.integration);
  const raw = base + uAdd + iAdd;

  const biasUp = input.unknowns === "Very High / Exploratory";

  if (flag21Plus || input.days >= 30) {
    flags.push("break_down_required");
    if (biasUp) flags.push("very_high_unknowns");
    return {
      base,
      unknownsAdj: uAdd,
      integrationAdj: iAdd,
      raw,
      final: "21+",
      flags,
    };
  }

  if (biasUp) flags.push("very_high_unknowns");

  const final = roundToFibonacci(raw, { biasUp });

  return {
    base,
    unknownsAdj: uAdd,
    integrationAdj: iAdd,
    raw,
    final,
    flags,
  };
}

/** Treat "21+" as 21 for numeric summation */
export function finalAsNumber(val: number | "21+"): number {
  return val === "21+" ? 21 : val;
}

