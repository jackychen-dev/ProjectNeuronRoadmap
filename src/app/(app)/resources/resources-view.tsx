"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createResource, archiveResource, createTeam } from "@/lib/actions/resources";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";

const bucketColors: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-700",
  MID: "bg-blue-100 text-blue-700",
  SENIOR: "bg-green-100 text-green-700",
};

export function ResourcesView({ resources, teams }: { resources: any[]; teams: any[] }) {
  const router = useRouter();

  const handleArchive = async (id: string) => {
    await archiveResource(id);
    router.refresh();
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <CreateResourceDialog teams={teams} />
        <CreateTeamDialog />
      </div>

      {resources.length === 0 ? (
        <EmptyState icon="👥" title="No resources yet" description="Add team members to track assignments and capacity." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Bucket</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>Weekly Capacity</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.email || "—"}</TableCell>
                  <TableCell>
                    <Badge className={bucketColors[r.bucket]} variant="secondary">{r.bucket}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.team?.name || "—"}</TableCell>
                  <TableCell className="text-sm">{r.hourlyRate ? `$${r.hourlyRate}/hr` : "—"}</TableCell>
                  <TableCell className="text-sm">{r.weeklyCapacity}h</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleArchive(r.id)} className="text-xs">
                      Archive
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

function CreateResourceDialog({ teams }: { teams: any[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await createResource({
      name: fd.get("name") as string,
      email: fd.get("email") as string,
      bucket: fd.get("bucket") as string || "MID",
      teamId: fd.get("teamId") as string || null,
      hourlyRate: fd.get("hourlyRate") ? Number(fd.get("hourlyRate")) : null,
      weeklyCapacity: fd.get("weeklyCapacity") ? Number(fd.get("weeklyCapacity")) : 40,
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ Resource</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Resource</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bucket">Bucket</Label>
              <Select id="bucket" name="bucket" defaultValue="MID">
                <option value="OWNER">Owner</option>
                <option value="MID">Mid</option>
                <option value="SENIOR">Senior</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="teamId">Team</Label>
              <Select id="teamId" name="teamId">
                <option value="">No team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
              <Input id="hourlyRate" name="hourlyRate" type="number" step="0.01" />
            </div>
            <div>
              <Label htmlFor="weeklyCapacity">Weekly Capacity (hrs)</Label>
              <Input id="weeklyCapacity" name="weeklyCapacity" type="number" defaultValue="40" />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating…" : "Create Resource"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateTeamDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await createTeam({ name: fd.get("name") as string });
    setLoading(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">+ Team</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Team Name *</Label>
            <Input id="name" name="name" required />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating…" : "Create Team"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

