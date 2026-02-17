"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createGoal } from "@/lib/actions/goals";
import { useRouter } from "next/navigation";

export function CreateGoalDialog({ users }: { users: any[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await createGoal({
      title: fd.get("title") as string,
      description: fd.get("description") as string,
      whyItMatters: fd.get("whyItMatters") as string,
      successCriteria: fd.get("successCriteria") as string,
      trackingMode: fd.get("trackingMode") as string || "CHECKLIST",
      startDate: fd.get("startDate") as string || null,
      endDate: fd.get("endDate") as string || null,
      targetReleaseWindow: fd.get("targetReleaseWindow") as string || null,
      releaseName: fd.get("releaseName") as string || null,
      ownerId: fd.get("ownerId") as string || null,
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ Goal</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Quarterly Goal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" name="title" required placeholder="Q1 2026 - Ship AI Features" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="trackingMode">Tracking Mode</Label>
              <Select id="trackingMode" name="trackingMode" defaultValue="CHECKLIST">
                <option value="CHECKLIST">Checklist</option>
                <option value="BURNDOWN">Burndown</option>
                <option value="MILESTONES">Milestones</option>
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
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" name="startDate" type="date" />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" name="endDate" type="date" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="releaseName">Release Name</Label>
              <Input id="releaseName" name="releaseName" placeholder="v2.0" />
            </div>
            <div>
              <Label htmlFor="targetReleaseWindow">Target Release Window</Label>
              <Input id="targetReleaseWindow" name="targetReleaseWindow" placeholder="March 2026" />
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" />
          </div>
          <div>
            <Label htmlFor="whyItMatters">Why It Matters</Label>
            <Textarea id="whyItMatters" name="whyItMatters" placeholder="Why this goal is important…" />
          </div>
          <div>
            <Label htmlFor="successCriteria">Success Criteria</Label>
            <Textarea id="successCriteria" name="successCriteria" placeholder="How we know it's achieved…" />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating…" : "Create Goal"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

