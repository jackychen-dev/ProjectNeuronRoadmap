"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createFeature } from "@/lib/actions/features";
import { useRouter } from "next/navigation";

export function CreateFeatureDialog({ themes, users }: { themes: any[]; users: any[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await createFeature({
      title: fd.get("title") as string,
      description: fd.get("description") as string,
      whyItMatters: fd.get("whyItMatters") as string,
      successCriteria: fd.get("successCriteria") as string,
      status: fd.get("status") as string || "IDEA",
      priority: fd.get("priority") as string || "MEDIUM",
      trackingMode: fd.get("trackingMode") as string || "CHECKLIST",
      themeId: fd.get("themeId") as string || null,
      ownerId: fd.get("ownerId") as string || null,
      plannedStart: fd.get("plannedStart") as string || null,
      plannedEnd: fd.get("plannedEnd") as string || null,
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ Feature</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Feature</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" name="title" required placeholder="Feature title" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue="IDEA">
                <option value="IDEA">Idea</option>
                <option value="PLANNED">Planned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="BLOCKED">Blocked</option>
                <option value="DONE">Done</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select id="priority" name="priority" defaultValue="MEDIUM">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </Select>
            </div>
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
              <Label htmlFor="themeId">Theme</Label>
              <Select id="themeId" name="themeId">
                <option value="">None</option>
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </div>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="plannedStart">Planned Start</Label>
              <Input id="plannedStart" name="plannedStart" type="date" />
            </div>
            <div>
              <Label htmlFor="plannedEnd">Planned End</Label>
              <Input id="plannedEnd" name="plannedEnd" type="date" />
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" placeholder="What is this feature about?" />
          </div>
          <div>
            <Label htmlFor="whyItMatters">Why It Matters</Label>
            <Textarea id="whyItMatters" name="whyItMatters" placeholder="Why is this important?" />
          </div>
          <div>
            <Label htmlFor="successCriteria">Success Criteria</Label>
            <Textarea id="successCriteria" name="successCriteria" placeholder="How do we know it's done well?" />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating…" : "Create Feature"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

