"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createAssignment, deleteAssignment } from "@/lib/actions/assignments";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { useTrackedSave } from "@/hooks/use-autosave";

interface PersonRef {
  id: string;
  name: string;
  initials: string | null;
}

interface InitiativeRef {
  id: string;
  name: string;
  workstream: { id: string; name: string };
}

export function AssignmentsView({
  assignments,
  people,
  initiatives,
}: {
  assignments: any[];
  people: PersonRef[];
  initiatives: InitiativeRef[];
}) {
  const router = useRouter();
  const trackedSave = useTrackedSave();

  const handleDelete = async (id: string) => {
    await trackedSave(() => deleteAssignment(id));
    router.refresh();
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <CreateAssignmentDialog people={people} initiatives={initiatives} />
      </div>

      {assignments.length === 0 ? (
        <EmptyState icon="📋" title="No assignments yet" description="Create assignments to track who's working on what." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Initiative</TableHead>
                <TableHead>Planned</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Notes / Outcome</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{a.person?.name || a.user?.name || "—"}</div>
                    {a.person?.initials && (
                      <Badge variant="secondary" className="text-xs">{a.person.initials}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{a.month || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.initiative?.name || "—"}
                    {a.initiative?.workstream && (
                      <span className="text-xs ml-1 opacity-60">({a.initiative.workstream.name})</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{a.hoursPlanned}h</TableCell>
                  <TableCell className="text-sm">{a.hoursActual}h</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {a.outcome || a.notes || "—"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)} className="text-xs">
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function CreateAssignmentDialog({
  people,
  initiatives,
}: {
  people: PersonRef[];
  initiatives: InitiativeRef[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const trackedSave = useTrackedSave();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await trackedSave(() =>
      createAssignment({
        personId: (fd.get("personId") as string) || null,
        initiativeId: fd.get("initiativeId") as string,
        month: fd.get("month") as string,
        hoursPlanned: Number(fd.get("hoursPlanned") || 0),
        hoursActual: Number(fd.get("hoursActual") || 0),
        notes: (fd.get("notes") as string) || null,
        outcome: (fd.get("outcome") as string) || null,
      })
    );
    setLoading(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ Assignment</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Assignment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="personId">Person *</Label>
            <Select id="personId" name="personId" required>
              <option value="">Select person</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.initials ? `${p.initials} — ` : ""}{p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="initiativeId">Initiative *</Label>
            <Select id="initiativeId" name="initiativeId" required>
              <option value="">Select initiative</option>
              {initiatives.map((i) => (
                <option key={i.id} value={i.id}>
                  [{i.workstream.name}] {i.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="month">Month *</Label>
            <Input id="month" name="month" type="month" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hoursPlanned">Hours Planned</Label>
              <Input id="hoursPlanned" name="hoursPlanned" type="number" defaultValue="0" />
            </div>
            <div>
              <Label htmlFor="hoursActual">Hours Actual</Label>
              <Input id="hoursActual" name="hoursActual" type="number" defaultValue="0" />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" />
          </div>
          <div>
            <Label htmlFor="outcome">Outcome</Label>
            <Textarea id="outcome" name="outcome" placeholder="Summary of outcomes..." />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating…" : "Create Assignment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
