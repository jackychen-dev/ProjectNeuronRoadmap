"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createOpenIssue,
  updateOpenIssue,
  resolveOpenIssue,
  reopenIssue,
  deleteOpenIssue,
  addIssueComment,
  deleteIssueComment,
} from "@/lib/actions/open-issues";
import { useTrackedSave } from "@/hooks/use-autosave";

/* ─── Types ───────────────────────────────────────────── */

interface SubTaskRef {
  id: string;
  name: string;
  initiative?: { id: string; name: string } | null;
}

interface WorkstreamRef {
  id: string;
  name: string;
  slug: string;
  initiatives: {
    id: string;
    name: string;
    subTasks: { id: string; name: string }[];
  }[];
}

interface IssueComment {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: string;
}

interface OpenIssue {
  id: string;
  workstreamId: string;
  subTaskId: string | null;
  title: string;
  description: string | null;
  severity: string;
  screenshotUrl: string | null;
  createdAt: string;
  resolvedAt: string | null;
  workstream: { id: string; name: string; slug: string };
  subTask: SubTaskRef | null;
  comments: IssueComment[];
}

/* ─── Severity Config ─────────────────────────────────── */

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  STOPPING: { label: "Stopping", color: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-300 dark:border-red-800" },
  SLOWING: { label: "Slowing", color: "text-yellow-700 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/30", border: "border-yellow-300 dark:border-yellow-800" },
  NOT_A_CONCERN: { label: "Not a concern", color: "text-green-700 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-300 dark:border-green-800" },
};

const SEVERITY_BADGE: Record<string, "destructive" | "secondary" | "outline"> = {
  STOPPING: "destructive",
  SLOWING: "secondary",
  NOT_A_CONCERN: "outline",
};

/* ─── Component ───────────────────────────────────────── */

export function OpenIssuesView({
  workstreams,
  issues: initialIssues,
}: {
  workstreams: WorkstreamRef[];
  issues: OpenIssue[];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const trackedSave = useTrackedSave();
  const [filterWs, setFilterWs] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [showResolved, setShowResolved] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSeverity, setNewSeverity] = useState("NOT_A_CONCERN");
  const [newWs, setNewWs] = useState(workstreams[0]?.id || "");
  const [newSubTask, setNewSubTask] = useState("");
  const [newScreenshot, setNewScreenshot] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  // Filtered issues
  const filtered = useMemo(() => {
    return initialIssues.filter((i) => {
      if (filterWs !== "all" && i.workstreamId !== filterWs) return false;
      if (filterSeverity !== "all" && i.severity !== filterSeverity) return false;
      if (!showResolved && i.resolvedAt) return false;
      return true;
    });
  }, [initialIssues, filterWs, filterSeverity, showResolved]);

  // Summary counts
  const openIssues = initialIssues.filter((i) => !i.resolvedAt);
  const stoppingCount = openIssues.filter((i) => i.severity === "STOPPING").length;
  const slowingCount = openIssues.filter((i) => i.severity === "SLOWING").length;
  const notConcernCount = openIssues.filter((i) => i.severity === "NOT_A_CONCERN").length;

  // Get subtasks for selected workstream in create form
  const selectedWsData = workstreams.find((w) => w.id === newWs);
  const availableSubTasks = selectedWsData?.initiatives.flatMap((init) =>
    init.subTasks.map((st) => ({ ...st, initiativeName: init.name }))
  ) || [];

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Convert to base64 data URL for storage (small screenshots)
    const reader = new FileReader();
    reader.onload = () => {
      setNewScreenshot(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleCreate() {
    if (!newTitle.trim() || !newWs) return;
    startTransition(async () => {
      await trackedSave(() => createOpenIssue({
        workstreamId: newWs,
        subTaskId: newSubTask || null,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        severity: newSeverity,
        screenshotUrl: newScreenshot,
      }));
      setNewTitle("");
      setNewDesc("");
      setNewSeverity("NOT_A_CONCERN");
      setNewSubTask("");
      setNewScreenshot(null);
      setShowCreateForm(false);
      refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Total Open</p>
            <p className="text-3xl font-bold">{openIssues.length}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-red-600 dark:text-red-400 font-semibold">🔴 Stopping</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stoppingCount}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 dark:border-yellow-900">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold">🟡 Slowing</p>
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{slowingCount}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-900">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-green-600 dark:text-green-400 font-semibold">🟢 Not a Concern</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{notConcernCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters + Create ── */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <select
            className="rounded-md border px-3 py-1.5 text-sm bg-background"
            value={filterWs}
            onChange={(e) => setFilterWs(e.target.value)}
          >
            <option value="all">All Workstreams</option>
            {workstreams.map((ws) => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>
          <select
            className="rounded-md border px-3 py-1.5 text-sm bg-background"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
          >
            <option value="all">All Severities</option>
            <option value="STOPPING">Stopping</option>
            <option value="SLOWING">Slowing</option>
            <option value="NOT_A_CONCERN">Not a Concern</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="rounded"
            />
            Show resolved
          </label>
          <span className="text-xs text-muted-foreground">
            Showing {filtered.length} issue{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Button size="sm" onClick={() => setShowCreateForm(true)} disabled={isPending}>
          + New Issue
        </Button>
      </div>

      {/* ── Create Issue Form ── */}
      {showCreateForm && (
        <Card className="border-primary/30">
          <CardContent className="pt-5 space-y-4">
            <h3 className="font-bold text-sm">Report New Issue</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Title *</label>
                <Input
                  className="h-9"
                  placeholder="Brief issue title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Severity</label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value)}
                >
                  <option value="STOPPING">Stopping — blocks work entirely</option>
                  <option value="SLOWING">Slowing — degraded progress</option>
                  <option value="NOT_A_CONCERN">Not a concern at this time</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Workstream *</label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                  value={newWs}
                  onChange={(e) => { setNewWs(e.target.value); setNewSubTask(""); }}
                >
                  {workstreams.map((ws) => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Blocks Sub-Task (optional)</label>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                  value={newSubTask}
                  onChange={(e) => setNewSubTask(e.target.value)}
                >
                  <option value="">— None —</option>
                  {availableSubTasks.map((st) => (
                    <option key={st.id} value={st.id}>[{st.initiativeName}] {st.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Description</label>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background min-h-[80px] resize-y"
                  placeholder="Describe the issue, steps to reproduce, impact..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Screenshot (optional)</label>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="text-sm"
                    onChange={handleFileUpload}
                  />
                  {newScreenshot && (
                    <div className="relative">
                      <img src={newScreenshot} alt="Screenshot preview" className="h-16 rounded border" />
                      <button
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center"
                        onClick={() => { setNewScreenshot(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      >
                        &times;
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={isPending || !newTitle.trim()}>
                Create Issue
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Issues List ── */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {showResolved ? "No issues match the filters." : "No open issues."}
              </p>
            </CardContent>
          </Card>
        )}

        {filtered.map((issue) => (
          <IssueCard key={issue.id} issue={issue} workstreams={workstreams} onUpdate={refresh} trackedSave={trackedSave} />
        ))}
      </div>
    </div>
  );
}

/* ─── Issue Card ──────────────────────────────────────── */

function IssueCard({
  issue,
  workstreams,
  onUpdate,
  trackedSave,
}: {
  issue: OpenIssue;
  workstreams: WorkstreamRef[];
  onUpdate: () => void;
  trackedSave: <T>(action: () => Promise<T>) => Promise<T | undefined>;
}) {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(issue.title);
  const [editDesc, setEditDesc] = useState(issue.description || "");
  const [editSeverity, setEditSeverity] = useState(issue.severity);

  // Comment state
  const [commentText, setCommentText] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("");

  const cfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.NOT_A_CONCERN;
  const isResolved = !!issue.resolvedAt;
  const commentCount = issue.comments?.length || 0;

  function handleAddComment() {
    if (!commentText.trim()) return;
    startTransition(async () => {
      await trackedSave(() => addIssueComment({
        issueId: issue.id,
        body: commentText.trim(),
        authorName: commentAuthor.trim() || null,
      }));
      setCommentText("");
      onUpdate();
    });
  }

  return (
    <Card className={`transition-colors ${isResolved ? "opacity-60" : ""} ${cfg.border} border`}>
      <div
        className={`p-4 cursor-pointer hover:bg-accent/20 transition-colors ${cfg.bg}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
            issue.severity === "STOPPING" ? "bg-red-500" :
            issue.severity === "SLOWING" ? "bg-yellow-500" : "bg-green-500"
          }`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-semibold truncate ${isResolved ? "line-through" : ""}`}>
                {issue.title}
              </h3>
              <Badge variant={SEVERITY_BADGE[issue.severity] || "outline"} className="text-[10px]">
                {cfg.label}
              </Badge>
              {isResolved && <Badge variant="outline" className="text-[10px] text-green-600">Resolved</Badge>}
              {commentCount > 0 && (
                <span className="text-[10px] text-muted-foreground ml-1">
                  💬 {commentCount}
                </span>
              )}
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
              <span>
                Workstream: <strong className="text-foreground">{issue.workstream.name}</strong>
              </span>
              {issue.subTask && (
                <span>
                  Blocks: <strong className="text-foreground">{issue.subTask.name}</strong>
                  {issue.subTask.initiative && (
                    <span className="text-muted-foreground"> ({issue.subTask.initiative.name})</span>
                  )}
                </span>
              )}
              <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{expanded ? "−" : "+"}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t p-4 space-y-4 bg-background">
          {/* Description */}
          {issue.description && !editing && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{issue.description}</p>
          )}

          {/* Screenshot */}
          {issue.screenshotUrl && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Screenshot</p>
              <img
                src={issue.screenshotUrl}
                alt="Issue screenshot"
                className="max-h-64 rounded-lg border cursor-pointer"
                onClick={() => window.open(issue.screenshotUrl!, "_blank")}
              />
            </div>
          )}

          {/* Edit form */}
          {editing && (
            <div className="space-y-3 border rounded-lg p-3 bg-muted/20">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Title</label>
                <Input
                  className="h-8 text-sm"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Description</label>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background min-h-[60px] resize-y"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Severity</label>
                <select
                  className="rounded-md border px-3 py-1.5 text-sm bg-background w-full"
                  value={editSeverity}
                  onChange={(e) => setEditSeverity(e.target.value)}
                >
                  <option value="STOPPING">Stopping</option>
                  <option value="SLOWING">Slowing</option>
                  <option value="NOT_A_CONCERN">Not a concern</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="text-xs"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      await trackedSave(() => updateOpenIssue(issue.id, {
                        title: editTitle.trim(),
                        description: editDesc.trim() || null,
                        severity: editSeverity,
                      }));
                      setEditing(false);
                      onUpdate();
                    });
                  }}
                >
                  Save
                </Button>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* ── Comment Thread ── */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              💬 Comments {commentCount > 0 && <span>({commentCount})</span>}
            </h4>

            {/* Existing comments */}
            {issue.comments && issue.comments.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {issue.comments.map((c) => (
                  <div key={c.id} className="flex gap-2 group">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">
                      {c.authorName ? c.authorName.slice(0, 2).toUpperCase() : "??"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold">{c.authorName || "Anonymous"}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                        <button
                          className="text-[10px] text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                          disabled={isPending}
                          onClick={() => {
                            if (confirm("Delete this comment?")) {
                              startTransition(async () => {
                                await trackedSave(() => deleteIssueComment(c.id));
                                onUpdate();
                              });
                            }
                          }}
                        >
                          &times;
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-0.5">{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No comments yet.</p>
            )}

            {/* Add comment form */}
            <div className="flex gap-2 items-start pt-1 border-t">
              <div className="flex-1 space-y-1.5">
                <div className="flex gap-2">
                  <Input
                    className="h-7 text-xs flex-1"
                    placeholder="Your name (optional)"
                    value={commentAuthor}
                    onChange={(e) => setCommentAuthor(e.target.value)}
                  />
                </div>
                <textarea
                  className="w-full rounded-md border px-2.5 py-1.5 text-sm bg-background min-h-[50px] resize-y"
                  placeholder="Add a comment or update..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      handleAddComment();
                    }
                  }}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="text-xs h-7"
                    disabled={isPending || !commentText.trim()}
                    onClick={handleAddComment}
                  >
                    Post Comment
                  </Button>
                  <span className="text-[10px] text-muted-foreground">Ctrl+Enter to submit</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap border-t pt-3">
            {!editing && (
              <Button size="sm" variant="outline" className="text-[10px] h-6 px-2" onClick={() => setEditing(true)}>
                ✏️ Edit
              </Button>
            )}
            {!isResolved ? (
              <Button
                size="sm"
                variant="outline"
                className="text-[10px] h-6 px-2 text-green-600"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await trackedSave(() => resolveOpenIssue(issue.id));
                    onUpdate();
                  });
                }}
              >
                ✓ Resolve
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="text-[10px] h-6 px-2"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await trackedSave(() => reopenIssue(issue.id));
                    onUpdate();
                  });
                }}
              >
                ↻ Reopen
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-[10px] h-6 px-2 text-red-500 hover:text-red-700"
              disabled={isPending}
              onClick={() => {
                if (confirm("Delete this issue?")) {
                  startTransition(async () => {
                    await trackedSave(() => deleteOpenIssue(issue.id));
                    onUpdate();
                  });
                }
              }}
            >
              🗑 Delete
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

