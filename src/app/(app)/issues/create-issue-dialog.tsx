"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createIssue } from "@/lib/actions/issues";
import { useRouter } from "next/navigation";

export function CreateIssueDialog({ features, goals, users }: { features: any[]; goals: any[]; users: any[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await createIssue({
      title: fd.get("title") as string,
      description: fd.get("description") as string,
      severity: fd.get("severity") as string || "MEDIUM",
      status: "TRIAGE",
      featureId: fd.get("featureId") as string || null,
      goalId: fd.get("goalId") as string || null,
      ownerId: fd.get("ownerId") as string || null,
      tags: fd.get("tags") as string || null,
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ Issue</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Issue</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" name="title" required placeholder="Bug or issue title" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="severity">Severity</Label>
              <Select id="severity" name="severity" defaultValue="MEDIUM">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="ownerId">Owner</Label>
              <Select id="ownerId" name="ownerId">
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="featureId">Linked Feature</Label>
              <Select id="featureId" name="featureId">
                <option value="">None</option>
                {features.map((f) => (
                  <option key={f.id} value={f.id}>{f.title}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="goalId">Linked Goal</Label>
              <Select id="goalId" name="goalId">
                <option value="">None</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="tags">Tags</Label>
            <Input id="tags" name="tags" placeholder="Comma-separated tags" />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" placeholder="Describe the issue…" />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating…" : "Create Issue"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

