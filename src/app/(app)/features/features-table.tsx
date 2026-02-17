"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, statusColor } from "@/lib/utils";
import { archiveFeature, updateFeature } from "@/lib/actions/features";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";

export function FeaturesTable({ features }: { features: any[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const router = useRouter();

  const filtered = features.filter((f) => {
    if (search && !f.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && f.status !== statusFilter) return false;
    return true;
  });

  const handleStatusChange = async (id: string, newStatus: string) => {
    const feature = features.find((f) => f.id === id);
    if (!feature) return;
    await updateFeature(id, { title: feature.title, status: newStatus });
    router.refresh();
  };

  const handleArchive = async (id: string) => {
    await archiveFeature(id);
    router.refresh();
  };

  if (features.length === 0) {
    return (
      <EmptyState icon="✨" title="No features yet" description="Create your first feature to start tracking.">
        <p className="text-xs text-muted-foreground">Use the + Feature button above</p>
      </EmptyState>
    );
  }

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Search features…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
          <option value="">All statuses</option>
          <option value="IDEA">Idea</option>
          <option value="PLANNED">Planned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="BLOCKED">Blocked</option>
          <option value="DONE">Done</option>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Tracking</TableHead>
              <TableHead>Theme</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.title}</TableCell>
                <TableCell>
                  <select
                    value={f.status}
                    onChange={(e) => handleStatusChange(f.id, e.target.value)}
                    className="rounded border bg-transparent px-2 py-1 text-xs"
                  >
                    <option value="IDEA">Idea</option>
                    <option value="PLANNED">Planned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="BLOCKED">Blocked</option>
                    <option value="DONE">Done</option>
                  </select>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{f.priority}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{f.trackingMode}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {f.theme?.name || "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {f.owner?.name || f.owner?.email || "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(f.plannedStart)} → {formatDate(f.plannedEnd)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleArchive(f.id)}
                    className="text-[10px] h-6 px-2"
                  >
                    Archive
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

