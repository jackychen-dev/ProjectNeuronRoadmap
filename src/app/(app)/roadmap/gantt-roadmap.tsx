"use client";

import { useState, useMemo, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { updateInitiativeField, createInitiative, archiveInitiative } from "@/lib/actions/initiatives";
import { createWorkstream, deleteWorkstream } from "@/lib/actions/workstreams";
import { saveMonthlySnapshot } from "@/lib/actions/snapshots";
import { getCurrentPeriod } from "@/lib/burn-periods";
import { useTrackedSave } from "@/hooks/use-autosave";

// ── Types ────────────────────────────────────────────
interface Initiative {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  plannedStartMonth?: string | null;
  plannedEndMonth?: string | null;
  status: string;
  ownerInitials?: string | null;
  needsRefinement: boolean;
  milestones: { id: string; name: string; date?: string | null }[];
  partnerLinks: { partner: { id: string; name: string } }[];
}

interface Workstream {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  programId?: string;
  initiatives: Initiative[];
}

// ── Constants ────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "#94a3b8",
  IN_PROGRESS: "#3b82f6",
  BLOCKED: "#ef4444",
  DONE: "#22c55e",
};

const CATEGORY_LABELS: Record<string, string> = {
  CONNECTOR: "Connector",
  KIT_APP: "Kit App",
  PORTAL: "Portal",
  AI_SYSTEM: "AI",
  INFRA: "Infra",
  DEVSECOPS: "DevSecOps",
  ROBOTICS: "Robotics",
  TOOLING: "Tooling",
};

function buildMonths(): string[] {
  const months: string[] = [];
  for (let year = 2025; year <= 2028; year++) {
    const startM = year === 2025 ? 12 : 1;
    const endM = year === 2028 ? 11 : 12;
    for (let m = startM; m <= endM; m++) {
      months.push(`${year}-${String(m).padStart(2, "0")}`);
    }
  }
  return months;
}

function monthIndex(month: string, months: string[]): number {
  return months.indexOf(month);
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[parseInt(m)]} ${y.slice(2)}`;
}

function getFY(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (m >= 12) return `FY${(y + 1) % 100}`;
  return `FY${y % 100}`;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

interface Person {
  id: string;
  name: string;
  initials: string | null;
  title?: string | null;
  team?: string | null;
}

interface ProgramStat {
  id: string;
  name: string;
  status: string;
  totalPts: number;
  completedPts: number;
  currentPct: number;
  savedPct: number;
  lastSnapshotDate: string | null;
}

export function GanttRoadmap({ workstreams, people = [], programs = [] }: { workstreams: Workstream[]; people?: Person[]; programs?: ProgramStat[] }) {
  const months = useMemo(() => buildMonths(), []);
  const [selectedInit, setSelectedInit] = useState<Initiative | null>(null);
  const [wsFilter, setWsFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const trackedSave = useTrackedSave();

  // Editing state
  const [editingDates, setEditingDates] = useState<{ id: string; start: string; end: string } | null>(null);

  // Add workstream state
  const [showAddWs, setShowAddWs] = useState(false);
  const [newWs, setNewWs] = useState({ name: "", color: "#3b82f6", description: "" });

  // Add initiative state
  const [addingInitWs, setAddingInitWs] = useState<string | null>(null);
  const [newInit, setNewInit] = useState({ name: "", category: "TOOLING", start: "", end: "" });

  

  // People lookup: initials → full name
  const peopleByInitials = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of people) {
      if (p.initials) map.set(p.initials, p.name);
    }
    return map;
  }, [people]);

  function ownerLabel(initials: string | null | undefined): string {
    if (!initials) return "";
    const name = peopleByInitials.get(initials);
    return name ? `${initials} — ${name}` : initials;
  }

  const COL_W = 38;
  const ROW_H = 36;
  const LABEL_W = 340;

  const filtered = workstreams
    .filter((ws) => wsFilter === "all" || ws.id === wsFilter)
    .map((ws) => ({
      ...ws,
      initiatives: ws.initiatives.filter(
        (i) => statusFilter === "all" || i.status === statusFilter
      ),
    }))
    .filter((ws) => ws.initiatives.length > 0 || wsFilter !== "all");

  // FY header groups
  const fyGroups: { label: string; start: number; span: number }[] = [];
  let currentFY = "";
  for (let i = 0; i < months.length; i++) {
    const fy = getFY(months[i]);
    if (fy !== currentFY) {
      fyGroups.push({ label: fy, start: i, span: 1 });
      currentFY = fy;
    } else {
      fyGroups[fyGroups.length - 1].span++;
    }
  }

  function refresh() { startTransition(() => router.refresh()); }

  function saveDates(id: string, start: string, end: string) {
    startTransition(async () => {
      await trackedSave(async () => {
        await updateInitiativeField(id, "plannedStartMonth", start || null);
        await updateInitiativeField(id, "plannedEndMonth", end || null);
      });
      setEditingDates(null);
      refresh();
    });
  }

  function handleAddWorkstream() {
    if (!newWs.name.trim()) return;
    const programId = workstreams[0]?.programId;
    if (!programId) return;
    startTransition(async () => {
      await trackedSave(() => createWorkstream({
        name: newWs.name.trim(),
        slug: slugify(newWs.name.trim()),
        color: newWs.color,
        description: newWs.description || undefined,
        programId,
      }));
      setNewWs({ name: "", color: "#3b82f6", description: "" });
      setShowAddWs(false);
      refresh();
    });
  }

  function handleAddInitiative(wsId: string) {
    if (!newInit.name.trim()) return;
    startTransition(async () => {
      await trackedSave(() => createInitiative({
        name: newInit.name.trim(),
        workstreamId: wsId,
        category: newInit.category,
        plannedStartMonth: newInit.start || null,
        plannedEndMonth: newInit.end || null,
      }));
      setNewInit({ name: "", category: "TOOLING", start: "", end: "" });
      setAddingInitWs(null);
      refresh();
    });
  }

  

  const currentPeriod = useMemo(() => getCurrentPeriod(), []);

  function handleSaveSnapshot(programId: string) {
    startTransition(async () => {
      await trackedSave(() => saveMonthlySnapshot(programId));
      refresh();
    });
  }

  // Today marker
  const now = new Date();
  const todayMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const todayIdx = monthIndex(todayMonth, months);

  return (
    <div className="space-y-4">
      {/* ── Initiatives (Programs) with Progress Bars ── */}
      {programs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Initiatives</h2>
          </div>
          {programs.map((p) => (
            <div key={p.id} className="border rounded-lg p-3 bg-card space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{p.name}</span>
                  <Badge variant="secondary" className="text-[10px]">{p.status.replace(/_/g, " ")}</Badge>
                  <span className="text-[10px] text-muted-foreground">{p.totalPts} pts</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-muted-foreground">{currentPeriod.label}</span>
                  <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => handleSaveSnapshot(p.id)} disabled={isPending}>
                    Save Month
                  </Button>
                </div>
              </div>
              {/* Dual progress bars */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-20 shrink-0">Last Saved</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="h-3 rounded-full bg-gray-400 transition-all" style={{ width: `${Math.max(p.savedPct, 0.5)}%` }} />
                  </div>
                  <span className="text-[10px] font-mono w-10 text-right">{p.savedPct}%</span>
                  {p.lastSnapshotDate && <span className="text-[9px] text-muted-foreground">({p.lastSnapshotDate})</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-20 shrink-0">Current</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all" style={{ width: `${Math.max(p.currentPct, 0.5)}%` }} />
                  </div>
                  <span className="text-[10px] font-mono w-10 text-right">{p.currentPct}%</span>
                </div>
              </div>
            </div>
          ))}
          
        </div>
      )}

      {/* Filters + Actions */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <select
            className="rounded-md border px-3 py-1.5 text-sm bg-background"
            value={wsFilter}
            onChange={(e) => setWsFilter(e.target.value)}
          >
            <option value="all">All Workstreams</option>
            {workstreams.map((ws) => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>
          <select
            className="rounded-md border px-3 py-1.5 text-sm bg-background"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="BLOCKED">Blocked</option>
            <option value="DONE">Done</option>
          </select>
          <span className="text-xs text-muted-foreground">
            {filtered.reduce((s, ws) => s + ws.initiatives.length, 0)} initiatives across {filtered.length} workstreams
          </span>
        </div>
        <Button size="sm" onClick={() => setShowAddWs(true)} disabled={isPending}>
          + New Workstream
        </Button>
      </div>

      {/* Add Workstream Form */}
      {showAddWs && (
        <div className="border rounded-lg p-4 bg-card space-y-3">
          <h3 className="font-semibold text-sm">New Workstream</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Name *</label>
              <Input
                className="h-8 text-sm"
                placeholder="e.g. Data Analytics"
                value={newWs.name}
                onChange={(e) => setNewWs({ ...newWs, name: e.target.value })}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={newWs.color}
                  onChange={(e) => setNewWs({ ...newWs, color: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <Input
                  className="h-8 text-sm flex-1"
                  value={newWs.color}
                  onChange={(e) => setNewWs({ ...newWs, color: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Description</label>
              <Input
                className="h-8 text-sm"
                placeholder="Brief description..."
                value={newWs.description}
                onChange={(e) => setNewWs({ ...newWs, description: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-xs" onClick={handleAddWorkstream} disabled={isPending || !newWs.name.trim()}>
              Create Workstream
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowAddWs(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Gantt chart */}
      <div className="border rounded-lg overflow-hidden">
        <div className="flex">
          {/* Left labels */}
          <div className="shrink-0 bg-card z-10 border-r" style={{ width: LABEL_W }}>
            <div className="h-8 border-b" />
            <div className="h-7 border-b" />
            {filtered.map((ws) => (
              <div key={ws.id}>
                {/* Workstream header */}
                <div
                  className="flex items-center justify-between px-3 border-b font-semibold text-xs group"
                  style={{ height: ROW_H, backgroundColor: `${ws.color}15` }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ws.color || "#888" }} />
                    <span className="truncate" title={ws.name}>{ws.name}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      className="text-sm font-semibold text-primary hover:text-primary/80 whitespace-nowrap"
                      onClick={(e) => { e.stopPropagation(); setAddingInitWs(ws.id); setNewInit({ name: "", category: "TOOLING", start: "", end: "" }); }}
                    >
                      + Add initiative
                    </button>
                    <button
                      className="text-base text-red-500 hover:text-red-700 whitespace-nowrap"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete workstream "${ws.name}" and all its initiatives? This cannot be undone.`)) {
                          startTransition(async () => {
                            await trackedSave(() => deleteWorkstream(ws.id));
                            refresh();
                          });
                        }
                      }}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
                {/* Initiative rows */}
                {ws.initiatives.map((init) => (
                  <div
                    key={init.id}
                    className="flex items-center px-3 border-b text-xs cursor-pointer hover:bg-accent/50 transition-colors group"
                    style={{ height: ROW_H }}
                    onClick={() => setSelectedInit(init)}
                  >
                    <span className="truncate flex-1" title={init.name}>{init.name}</span>
                    {init.needsRefinement && (
                      <Badge variant="outline" className="ml-1 text-[9px] text-amber-600 border-amber-400 px-1">refine</Badge>
                    )}
                    <button
                      className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingDates({
                          id: init.id,
                          start: init.plannedStartMonth || "",
                          end: init.plannedEndMonth || "",
                        });
                      }}
                      title="Edit dates"
                    >
                      ✏️
                    </button>
                    <button
                      className="text-[10px] text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Remove "${init.name}" from the roadmap? It will be archived and hidden from this view.`)) {
                          startTransition(async () => {
                            await trackedSave(() => archiveInitiative(init.id));
                            refresh();
                          });
                        }
                      }}
                      title="Remove from roadmap"
                    >
                      🗑
                    </button>
                  </div>
                ))}
                {/* Add initiative row (inline) */}
                {addingInitWs === ws.id && (
                  <div className="px-2 py-1.5 border-b bg-primary/5" style={{ minHeight: ROW_H }}>
                    <div className="flex gap-1.5 items-center flex-wrap">
                      <Input
                        className="h-7 text-xs flex-1 min-w-[120px]"
                        placeholder="Initiative name..."
                        value={newInit.name}
                        onChange={(e) => setNewInit({ ...newInit, name: e.target.value })}
                        autoFocus
                      />
                      <Select
                        className="h-7 text-xs w-24"
                        value={newInit.category}
                        onChange={(e) => setNewInit({ ...newInit, category: e.target.value })}
                      >
                        {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </Select>
                      <Input
                        type="month"
                        className="h-7 text-xs w-32"
                        value={newInit.start}
                        onChange={(e) => setNewInit({ ...newInit, start: e.target.value })}
                        title="Start month"
                      />
                      <Input
                        type="month"
                        className="h-7 text-xs w-32"
                        value={newInit.end}
                        onChange={(e) => setNewInit({ ...newInit, end: e.target.value })}
                        title="End month"
                      />
                      <Button
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => handleAddInitiative(ws.id)}
                        disabled={isPending || !newInit.name.trim()}
                      >
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs px-2"
                        onClick={() => setAddingInitWs(null)}
                      >
                      Cancel
                    </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right timeline */}
          <div className="overflow-x-auto flex-1" ref={scrollRef}>
            <div style={{ width: months.length * COL_W, minWidth: "100%" }}>
              {/* FY header */}
              <div className="flex h-8 border-b">
                {fyGroups.map((g) => (
                  <div
                    key={g.label}
                    className="text-center text-xs font-bold border-r flex items-center justify-center bg-muted/50"
                    style={{ width: g.span * COL_W }}
                  >
                    {g.label}
                  </div>
                ))}
              </div>
              {/* Month header */}
              <div className="flex h-7 border-b">
                {months.map((m) => (
                  <div
                    key={m}
                    className={`text-center text-[10px] border-r flex items-center justify-center ${
                      m === todayMonth ? "bg-blue-100 font-bold text-blue-700" : "text-muted-foreground"
                    }`}
                    style={{ width: COL_W }}
                  >
                    {formatMonth(m).split(" ")[0]}
                  </div>
                ))}
              </div>
              {/* Rows */}
              {filtered.map((ws) => (
                <div key={ws.id}>
                  {/* Workstream header row */}
                  <div
                    className="border-b"
                    style={{ height: ROW_H, backgroundColor: `${ws.color}08` }}
                  />
                  {/* Initiative bars */}
                  {ws.initiatives.map((init) => {
                    const startIdx = init.plannedStartMonth
                      ? monthIndex(init.plannedStartMonth, months)
                      : -1;
                    const endIdx = init.plannedEndMonth
                      ? monthIndex(init.plannedEndMonth, months)
                      : -1;
                    const hasBar = startIdx >= 0 && endIdx >= 0;

                    return (
                      <div
                        key={init.id}
                        className="border-b relative cursor-pointer"
                        style={{ height: ROW_H }}
                        onClick={() => setSelectedInit(init)}
                      >
                        {/* Grid lines */}
                        <div className="absolute inset-0 flex pointer-events-none">
                          {months.map((m) => (
                            <div key={m} className="border-r h-full" style={{ width: COL_W, opacity: 0.15 }} />
                          ))}
                        </div>
                        {/* Today marker */}
                        {todayIdx >= 0 && (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-blue-400/50 z-10 pointer-events-none"
                            style={{ left: todayIdx * COL_W + COL_W / 2 }}
                          />
                        )}
                        {/* Bar */}
                        {hasBar && (
                          <div
                            className="absolute top-1.5 rounded-sm transition-all hover:opacity-100"
                            style={{
                              left: startIdx * COL_W + 2,
                              width: Math.max((endIdx - startIdx + 1) * COL_W - 4, 8),
                              height: ROW_H - 12,
                              backgroundColor: STATUS_COLORS[init.status] || "#94a3b8",
                              opacity: 0.85,
                            }}
                            title={`${init.name}: ${init.plannedStartMonth} → ${init.plannedEndMonth}${init.ownerInitials ? ` (${ownerLabel(init.ownerInitials)})` : ""}`}
                          >
                            <span className="text-[9px] text-white font-medium px-1 truncate block leading-5">
                              {init.ownerInitials || ""}
                            </span>
                          </div>
                        )}
                        {!hasBar && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-[10px] text-muted-foreground italic">No dates set</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Placeholder for add initiative row height */}
                  {addingInitWs === ws.id && (
                    <div className="border-b" style={{ height: ROW_H }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Date editing modal */}
      {editingDates && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setEditingDates(null)}>
          <div className="bg-card rounded-xl shadow-2xl p-6 w-96 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg">Edit Initiative Dates</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Start Month</label>
                <Input
                  type="month"
                  className="h-9"
                  value={editingDates.start}
                  onChange={(e) => setEditingDates({ ...editingDates, start: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">End Month</label>
                <Input
                  type="month"
                  className="h-9"
                  value={editingDates.end}
                  onChange={(e) => setEditingDates({ ...editingDates, end: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setEditingDates(null)}>Cancel</Button>
              <Button
                size="sm"
                onClick={() => saveDates(editingDates.id, editingDates.start, editingDates.end)}
                disabled={isPending}
              >
                Save Dates
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail panel */}
      {selectedInit && (
        <div className="fixed right-0 top-16 bottom-0 w-96 bg-card border-l shadow-xl z-50 overflow-y-auto p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-bold">{selectedInit.name}</h2>
            <Button variant="ghost" size="sm" onClick={() => setSelectedInit(null)}>Close</Button>
          </div>
          <div className="space-y-4">
            {/* Editable Status */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Status</label>
              <select
                className="rounded-md border px-2 py-1 text-sm bg-background w-full"
                defaultValue={selectedInit.status}
                onChange={(e) => {
                  startTransition(async () => {
                    await trackedSave(() => updateInitiativeField(selectedInit.id, "status", e.target.value));
                    refresh();
                  });
                }}
              >
                {["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE"].map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>

            {/* Editable Owner — assigned from People roster */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Owner</label>
              <select
                className="rounded-md border px-2 py-1 text-sm bg-background w-full h-8"
                defaultValue={selectedInit.ownerInitials || "__none"}
                onChange={(e) => {
                  const val = e.target.value;
                  startTransition(async () => {
                    await trackedSave(() => updateInitiativeField(selectedInit.id, "ownerInitials", val === "__none" ? null : val));
                    refresh();
                  });
                }}
              >
                <option value="__none">Unassigned</option>
                {people.map((p) => (
                  <option key={p.id} value={p.initials || p.name}>
                    {p.initials ? `${p.initials} — ${p.name}` : p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Badge style={{ backgroundColor: STATUS_COLORS[selectedInit.status], color: "#fff" }}>
                {selectedInit.status.replace(/_/g, " ")}
              </Badge>
              <Badge variant="outline">{CATEGORY_LABELS[selectedInit.category] || selectedInit.category}</Badge>
              {selectedInit.ownerInitials && <Badge variant="secondary">{ownerLabel(selectedInit.ownerInitials)}</Badge>}
              {selectedInit.needsRefinement && <Badge variant="destructive">Needs Date Refinement</Badge>}
            </div>

            {/* Editable Name */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Name</label>
              <Input
                className="h-8 text-sm"
                defaultValue={selectedInit.name}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val && val !== selectedInit.name) {
                    startTransition(async () => {
                      await trackedSave(() => updateInitiativeField(selectedInit.id, "name", val));
                      refresh();
                    });
                  }
                }}
              />
            </div>

            {/* Editable Description */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Description</label>
              <textarea
                className="w-full rounded-md border px-3 py-2 text-sm bg-background min-h-[60px] resize-y"
                defaultValue={selectedInit.description || ""}
                placeholder="Add a description..."
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val !== (selectedInit.description || "")) {
                    startTransition(async () => {
                      await trackedSave(() => updateInitiativeField(selectedInit.id, "description", val || null));
                      refresh();
                    });
                  }
                }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold mb-1">Timeline</h3>
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    setSelectedInit(null);
                    setEditingDates({
                      id: selectedInit.id,
                      start: selectedInit.plannedStartMonth || "",
                      end: selectedInit.plannedEndMonth || "",
                    });
                  }}
                >
                  Edit dates
                </button>
              </div>
              <p className="text-sm">
                {selectedInit.plannedStartMonth ? formatMonth(selectedInit.plannedStartMonth) : "TBD"} →{" "}
                {selectedInit.plannedEndMonth ? formatMonth(selectedInit.plannedEndMonth) : "TBD"}
              </p>
            </div>

            {selectedInit.milestones.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-1">Milestones</h3>
                <div className="space-y-1">
                  {selectedInit.milestones.map((m) => (
                    <div key={m.id} className="flex gap-2 text-xs">
                      <Badge variant="outline" className="font-mono">{m.date || "TBD"}</Badge>
                      <span>{m.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedInit.partnerLinks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-1">Partners</h3>
                <div className="flex gap-2 flex-wrap">
                  {selectedInit.partnerLinks.map((pl) => (
                    <Badge key={pl.partner.id} variant="secondary">{pl.partner.name}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground mt-2 flex-wrap">
        {Object.entries(STATUS_COLORS).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: v }} />
            <span>{k.replace(/_/g, " ")}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-blue-400" />
          <span>Today</span>
        </div>
        <span className="ml-auto">✏️ Edit dates · + Add initiative per workstream · + New Workstream to add a section (e.g. Connectors, Kit Applications)</span>
      </div>
    </div>
  );
}
