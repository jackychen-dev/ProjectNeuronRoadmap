"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Initiative {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  status: string;
  plannedStartMonth?: string | null;
  plannedEndMonth?: string | null;
  ownerInitials?: string | null;
  needsRefinement: boolean;
  workstream: { id: string; name: string; slug: string; color?: string | null };
  milestones: { id: string; name: string; date?: string | null }[];
  partnerLinks: { partner: { id: string; name: string } }[];
}

interface Workstream {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  BLOCKED: "bg-red-100 text-red-700",
  DONE: "bg-green-100 text-green-700",
};

export function DeliverablesTable({
  initiatives,
  workstreams,
}: {
  initiatives: Initiative[];
  workstreams: Workstream[];
}) {
  const [search, setSearch] = useState("");
  const [wsFilter, setWsFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categories = Array.from(new Set(initiatives.map((i) => i.category))).sort();

  const filtered = initiatives.filter((i) => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (wsFilter !== "all" && i.workstream.id !== wsFilter) return false;
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (categoryFilter !== "all" && i.category !== categoryFilter) return false;
    return true;
  });

  const exportCSV = () => {
    const rows = [
      ["Name", "Workstream", "Category", "Status", "Start", "End", "Owner", "Needs Refinement"].join(","),
      ...filtered.map((i) =>
        [
          `"${i.name}"`,
          `"${i.workstream.name}"`,
          i.category,
          i.status,
          i.plannedStartMonth || "",
          i.plannedEndMonth || "",
          i.ownerInitials || "",
          i.needsRefinement ? "Yes" : "No",
        ].join(",")
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "deliverables.csv";
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search initiatives…"
          className="w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="rounded-md border px-3 py-2 text-sm bg-background" value={wsFilter} onChange={(e) => setWsFilter(e.target.value)}>
          <option value="all">All Workstreams</option>
          {workstreams.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        <select className="rounded-md border px-3 py-2 text-sm bg-background" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="NOT_STARTED">Not Started</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="BLOCKED">Blocked</option>
          <option value="DONE">Done</option>
        </select>
        <select className="rounded-md border px-3 py-2 text-sm bg-background" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
          ))}
        </select>
        <Button variant="outline" size="sm" onClick={exportCSV}>Export CSV</Button>
        <span className="text-xs text-muted-foreground">{filtered.length} results</span>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Workstream</th>
              <th className="text-left p-3 font-medium">Category</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Timeline</th>
              <th className="text-left p-3 font-medium">Owner</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="border-b hover:bg-accent/30 transition-colors">
                <td className="p-3">
                  <span className="font-medium">{i.name}</span>
                  {i.needsRefinement && <span className="ml-1 text-amber-500 text-xs font-medium">⚠ refine</span>}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: i.workstream.color || "#888" }} />
                    <span className="text-xs">{i.workstream.name}</span>
                  </div>
                </td>
                <td className="p-3"><Badge variant="outline" className="text-xs">{i.category.replace(/_/g, " ")}</Badge></td>
                <td className="p-3"><Badge className={STATUS_COLORS[i.status] || ""} variant="secondary">{i.status.replace(/_/g, " ")}</Badge></td>
                <td className="p-3 text-xs text-muted-foreground">
                  {i.plannedStartMonth || "—"} → {i.plannedEndMonth || "—"}
                </td>
                <td className="p-3 text-xs">{i.ownerInitials || "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">No initiatives match your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

