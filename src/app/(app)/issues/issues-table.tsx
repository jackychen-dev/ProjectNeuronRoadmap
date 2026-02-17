"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { statusColor, severityColor, ISSUE_STATUS_ORDER, nextIssueStatus, formatDate } from "@/lib/utils";
import { changeIssueStatus, archiveIssue } from "@/lib/actions/issues";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";

export function IssuesTable({ issues }: { issues: any[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const router = useRouter();

  const filtered = issues.filter((i) => {
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && i.status !== statusFilter) return false;
    if (severityFilter && i.severity !== severityFilter) return false;
    return true;
  });

  const handleCycleStatus = async (id: string, currentStatus: string) => {
    const next = nextIssueStatus(currentStatus);
    await changeIssueStatus(id, next as any);
    router.refresh();
  };

  const handleStatusSelect = async (id: string, newStatus: string) => {
    await changeIssueStatus(id, newStatus as any);
    router.refresh();
  };

  const handleArchive = async (id: string) => {
    await archiveIssue(id);
    router.refresh();
  };

  if (issues.length === 0) {
    return (
      <EmptyState icon="🐛" title="No issues tracked" description="Create issues to track bugs and problems." />
    );
  }

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Search issues…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
          <option value="">All statuses</option>
          {ISSUE_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </Select>
        <Select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="w-36">
          <option value="">All severities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Linked To</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>History</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((issue) => (
              <TableRow key={issue.id}>
                <TableCell className="font-medium">{issue.title}</TableCell>
                <TableCell>
                  <select
                    value={issue.status}
                    onChange={(e) => handleStatusSelect(issue.id, e.target.value)}
                    className="rounded border bg-transparent px-2 py-1 text-xs"
                  >
                    {ISSUE_STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>{s.replace("_", " ")}</option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  <Badge className={severityColor(issue.severity)} variant="secondary">
                    {issue.severity}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {issue.owner?.name || issue.owner?.email || "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {issue.feature?.title || issue.goal?.title || "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(issue.createdAt)}
                </TableCell>
                <TableCell>
                  {issue.statusHistory?.length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">
                        {issue.statusHistory.length} changes
                      </summary>
                      <div className="mt-1 space-y-0.5">
                        {issue.statusHistory.slice(0, 5).map((h: any) => (
                          <div key={h.id} className="text-muted-foreground">
                            {h.fromStatus} → {h.toStatus} ({formatDate(h.changedAt)})
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCycleStatus(issue.id, issue.status)}
                      className="text-[10px] h-6 px-2"
                    >
                      Next →
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleArchive(issue.id)}
                      className="text-[10px] h-6 px-2"
                    >
                      Archive
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

