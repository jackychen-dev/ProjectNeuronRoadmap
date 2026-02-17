"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createTheme } from "@/lib/actions/themes";
import { createFeatureGroup } from "@/lib/actions/feature-groups";
import { createFeature } from "@/lib/actions/features";
import { useRouter } from "next/navigation";

export function RoadmapActions({ themes }: { themes: any[] }) {
  return (
    <div className="flex gap-2">
      <CreateThemeDialog />
      {themes.length > 0 && <CreateFeatureGroupDialog themes={themes} />}
      {themes.length > 0 && <QuickAddFeatureDialog themes={themes} />}
    </div>
  );
}

function CreateThemeDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await createTheme({
      name: fd.get("name") as string,
      description: fd.get("description") as string,
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ Theme</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Theme</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="e.g. AI, Cameras" required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" placeholder="Optional description..." />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating…" : "Create Theme"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateFeatureGroupDialog({ themes }: { themes: any[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await createFeatureGroup({
      name: fd.get("name") as string,
      description: fd.get("description") as string,
      themeId: fd.get("themeId") as string,
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">+ Group</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Feature Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="themeId">Theme</Label>
            <Select id="themeId" name="themeId" required>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Feature group name" required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating…" : "Create Group"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuickAddFeatureDialog({ themes }: { themes: any[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await createFeature({
      title: fd.get("title") as string,
      themeId: fd.get("themeId") as string || null,
      status: "IDEA",
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">+ Quick Feature</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick Add Feature</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" placeholder="Feature title" required />
          </div>
          <div>
            <Label htmlFor="themeId">Theme (optional)</Label>
            <Select id="themeId" name="themeId">
              <option value="">No theme</option>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating…" : "Add Feature"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

