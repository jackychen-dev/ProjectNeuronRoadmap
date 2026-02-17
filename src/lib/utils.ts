import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const ISSUE_STATUS_ORDER = [
  "TRIAGE",
  "INVESTIGATING",
  "IN_PROGRESS",
  "VERIFYING",
  "DONE",
] as const;

export function nextIssueStatus(
  current: string
): (typeof ISSUE_STATUS_ORDER)[number] {
  const idx = ISSUE_STATUS_ORDER.indexOf(current as any);
  return ISSUE_STATUS_ORDER[(idx + 1) % ISSUE_STATUS_ORDER.length];
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    IDEA: "bg-gray-100 text-gray-700",
    PLANNED: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-yellow-100 text-yellow-700",
    BLOCKED: "bg-red-100 text-red-700",
    DONE: "bg-green-100 text-green-700",
    TRIAGE: "bg-orange-100 text-orange-700",
    INVESTIGATING: "bg-purple-100 text-purple-700",
    VERIFYING: "bg-cyan-100 text-cyan-700",
  };
  return map[status] || "bg-gray-100 text-gray-700";
}

export function severityColor(severity: string): string {
  const map: Record<string, string> = {
    LOW: "bg-gray-100 text-gray-600",
    MEDIUM: "bg-yellow-100 text-yellow-700",
    HIGH: "bg-orange-100 text-orange-700",
    CRITICAL: "bg-red-100 text-red-700",
  };
  return map[severity] || "bg-gray-100 text-gray-600";
}

