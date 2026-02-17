"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateSubTask, updateSubTaskCompletion, updateSubTaskEstimation } from "@/lib/actions/subtasks";
import {
  computeStoryPoints,
  UNKNOWNS_LEVELS,
  INTEGRATION_LEVELS,
  type UnknownsLevel,
  type IntegrationLevel,
  type StoryPointsResult,
} from "@/lib/story-points";
import Link from "next/link";

interface SubTaskData {
  id: string;
  name: string;
  description: string | null;
  points: number;
  completionPercent: number;
  status: string;
  estimatedDays: number | null;
  unknowns: string | null;
  integration: string | null;
  isAddedScope: boolean;
  initiative: {
    id: string;
    name: string;
    workstream: { id: string; name: string; slug: string; color: string | null };
  };
}

const STATUS_OPTIONS = ["NOT_STARTED", "IN_PROGRESS", "DONE"] as const;

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-gray-300",
  IN_PROGRESS: "bg-blue-500",
  BLOCKED: "bg-red-500",
  DONE: "bg-green-500",
};

function EditableSubTaskRow({ subTask: initial }: { subTask: SubTaskData }) {
  const [st, setSt] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(st.name);
  const [completionInput, setCompletionInput] = useState(String(st.completionPercent));
  const [days, setDays] = useState<number | "">(st.estimatedDays ?? "");
  const [unknowns, setUnknowns] = useState<string>(st.unknowns || "None");
  const [integration, setIntegration] = useState<string>(st.integration || "Single system");
  const router = useRouter();

  function refresh() { startTransition(() => router.refresh()); }

  const sp: StoryPointsResult | null = useMemo(() => {
    if (days === "" || days <= 0) return null;
    return computeStoryPoints({
      days: typeof days === "number" ? days : 0,
      unknowns: unknowns as UnknownsLevel,
      integration: integration as IntegrationLevel,
    });
  }, [days, unknowns, integration]);

  function persistEstimation(overrides?: { days?: number | null; unknowns?: string | null; integration?: string | null }) {
    const d = overrides?.days !== undefined ? overrides.days : (typeof days === "number" ? days : null);
    const u = overrides?.unknowns !== undefined ? overrides.unknowns : unknowns;
    const ig = overrides?.integration !== undefined ? overrides.integration : integration;

    let pts = st.points;
    if (d != null && d > 0) {
      const result = computeStoryPoints({
        days: d,
        unknowns: (u as UnknownsLevel) || "None",
        integration: (ig as IntegrationLevel) || "Single system",
      });
      pts = result.raw;
    }

    startTransition(async () => {
      await updateSubTaskEstimation(st.id, { estimatedDays: d, unknowns: u, integration: ig, points: pts });
      setSt((prev) => ({ ...prev, points: pts, estimatedDays: d, unknowns: u, integration: ig }));
      refresh();
    });
  }

  function handleCompletionBlur() {
    const val = Math.max(0, Math.min(100, parseInt(completionInput) || 0));
    setCompletionInput(String(val));
    if (val !== st.completionPercent) {
      const newStatus = val === 100 ? "DONE" : val > 0 ? "IN_PROGRESS" : "NOT_STARTED";
      setSt((prev) => ({ ...prev, completionPercent: val, status: newStatus }));
      startTransition(async () => {
        await updateSubTaskCompletion(st.id, val);
        refresh();
      });
    }
  }

  function handleStatusChange(newStatus: string) {
    const newPct = newStatus === "DONE" ? 100 : newStatus === "NOT_STARTED" ? 0 : st.completionPercent;
    setSt((prev) => ({ ...prev, status: newStatus, completionPercent: newPct }));
    setCompletionInput(String(newPct));
    startTransition(async () => {
      await updateSubTaskCompletion(st.id, newPct);
      refresh();
    });
  }

  function handleNameSave() {
    if (nameVal.trim() && nameVal !== st.name) {
      setSt((prev) => ({ ...prev, name: nameVal.trim() }));
      startTransition(async () => {
        await updateSubTask(st.id, { name: nameVal.trim() });
        refresh();
      });
    }
    setEditingName(false);
  }

  const barColor = st.completionPercent === 100 ? "bg-green-500" : st.completionPercent > 0 ? "bg-blue-500" : "bg-gray-300";

  return (
    <div className={`border rounded-lg p-3 transition-colors ${isPending ? "opacity-60" : ""} ${
      st.isAddedScope ? "border-purple-300 bg-purple-50/30" : ""
    }`}>
      {/* Row 1: name + link */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[st.status]}`} />
          {editingName ? (
            <div className="flex gap-1 items-center flex-1">
              <Input
                className="h-7 text-sm flex-1"
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleNameSave(); if (e.key === "Escape") { setEditingName(false); setNameVal(st.name); } }}
                autoFocus
              />
              <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={handleNameSave}>Save</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-1" onClick={() => { setEditingName(false); setNameVal(st.name); }}>Cancel</Button>
            </div>
          ) : (
            <span
              className="font-medium text-sm cursor-pointer hover:underline truncate"
              onClick={() => setEditingName(true)}
              title="Click to edit name"
            >
              {st.name}
            </span>
          )}
          {st.isAddedScope && <Badge variant="secondary" className="text-[8px] bg-purple-100 text-purple-700 flex-shrink-0">Added Scope</Badge>}
        </div>
        <Link href={`/workstreams/${st.initiative.workstream.slug}`} className="text-[10px] text-primary hover:underline flex-shrink-0 ml-2">
          View in workstream
        </Link>
      </div>

      {/* Row 2: estimation levers + status + completion */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Days */}
        <div className="flex items-center gap-1">
          <label className="text-[10px] text-muted-foreground">Days:</label>
          <input
            type="number"
            className="w-12 h-6 text-[10px] font-mono text-center border rounded bg-background"
            value={days}
            min={0}
            step={1}
            placeholder="—"
            onChange={(e) => setDays(e.target.value === "" ? "" : parseFloat(e.target.value))}
            onBlur={() => {
              const d = typeof days === "number" ? days : null;
              if (d !== st.estimatedDays) persistEstimation({ days: d });
            }}
          />
        </div>

        {/* Unknowns */}
        <div className="flex items-center gap-1">
          <label className="text-[10px] text-muted-foreground">Unk:</label>
          <select
            className="h-6 text-[10px] border rounded px-0.5 bg-background"
            value={unknowns}
            onChange={(e) => { setUnknowns(e.target.value); persistEstimation({ unknowns: e.target.value }); }}
          >
            {UNKNOWNS_LEVELS.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
          </select>
        </div>

        {/* Integration */}
        <div className="flex items-center gap-1">
          <label className="text-[10px] text-muted-foreground">Int:</label>
          <select
            className="h-6 text-[10px] border rounded px-0.5 bg-background"
            value={integration}
            onChange={(e) => { setIntegration(e.target.value); persistEstimation({ integration: e.target.value }); }}
          >
            {INTEGRATION_LEVELS.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
          </select>
        </div>

        <div className="border-l h-4 mx-0.5" />

        {/* Computed points */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Pts:</span>
          {sp ? (
            <Badge variant={sp.final === "21+" ? "destructive" : "secondary"} className="font-mono text-[9px] px-1 py-0">
              {sp.final === "21+" ? "21+" : sp.raw}
            </Badge>
          ) : (
            <span className="text-[10px] font-mono font-semibold">{st.points || "—"}</span>
          )}
        </div>

        <div className="border-l h-4 mx-0.5" />

        {/* Status */}
        <div className="flex items-center gap-1">
          <label className="text-[10px] text-muted-foreground">Status:</label>
          <select className="h-6 text-[10px] border rounded px-1 bg-background" value={st.status} onChange={(e) => handleStatusChange(e.target.value)}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </div>

        {/* Completion % */}
        <div className="flex items-center gap-1">
          <label className="text-[10px] text-muted-foreground">Done:</label>
          <input
            type="number" min={0} max={100} step={5}
            className="w-12 h-6 text-[10px] font-mono text-center border rounded bg-background"
            value={completionInput}
            onChange={(e) => setCompletionInput(e.target.value)}
            onBlur={handleCompletionBlur}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          />
          <span className="text-[9px] text-muted-foreground">%</span>
        </div>
      </div>

      {/* Row 3: progress bar + context */}
      <div className="mt-2">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${st.completionPercent}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.initiative.workstream.color || "#888" }} />
            <span>{st.initiative.workstream.name} · {st.initiative.name}</span>
          </div>
          <span className="font-mono">{st.completionPercent}%</span>
        </div>
      </div>

      {/* Warnings */}
      {sp && (sp.flags.includes("break_down_required") || sp.flags.includes("very_high_unknowns")) && (
        <div className="flex gap-2 mt-1">
          {sp.flags.includes("break_down_required") && <span className="text-[9px] font-semibold text-red-600">Break down (&ge;14d)</span>}
          {sp.flags.includes("very_high_unknowns") && <span className="text-[9px] font-semibold text-amber-600">Consider spike / split</span>}
        </div>
      )}
    </div>
  );
}

export default function MySubtasksList({ subtasks }: { subtasks: SubTaskData[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>My Assigned Subtasks</CardTitle>
          <span className="text-xs text-muted-foreground">{subtasks.length} subtask{subtasks.length !== 1 ? "s" : ""}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Edit directly here — changes sync to the workstream view automatically.
        </p>
      </CardHeader>
      <CardContent>
        {subtasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No subtasks assigned to you yet. Ask your lead to assign you from the workstream page.
          </p>
        ) : (
          <div className="space-y-2">
            {subtasks.map((st) => (
              <EditableSubTaskRow key={st.id} subTask={st} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
