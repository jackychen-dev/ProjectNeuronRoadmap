"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createDoc, updateDoc, deleteDoc } from "@/lib/actions/documentation";

interface DocItem {
  id: string;
  title: string;
  body: string;
  entityType: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string | null; email: string } | null;
  program: { id: string; name: string } | null;
  workstream: { id: string; name: string } | null;
  initiative: { id: string; name: string } | null;
}

interface EntityRef { id: string; name: string; }

export default function DocsView({
  docs,
  programs,
  workstreams,
  initiatives,
  userId,
}: {
  docs: DocItem[];
  programs: EntityRef[];
  workstreams: EntityRef[];
  initiatives: EntityRef[];
  userId: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [entityType, setEntityType] = useState("PROGRAM");
  const [entityId, setEntityId] = useState("");

  function refresh() { startTransition(() => router.refresh()); }

  const entityOptions = entityType === "PROGRAM" ? programs
    : entityType === "WORKSTREAM" ? workstreams
    : initiatives;

  function handleCreate() {
    if (!title.trim()) return;
    startTransition(async () => {
      await createDoc({
        title: title.trim(),
        body,
        entityType,
        programId: entityType === "PROGRAM" ? entityId || null : null,
        workstreamId: entityType === "WORKSTREAM" ? entityId || null : null,
        initiativeId: entityType === "INITIATIVE" ? entityId || null : null,
        authorId: userId,
      });
      setTitle(""); setBody(""); setEntityId(""); setShowCreate(false);
      refresh();
    });
  }

  function handleUpdate(id: string, newTitle: string, newBody: string) {
    startTransition(async () => {
      await updateDoc(id, { title: newTitle, body: newBody });
      setEditingId(null);
      refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this document?")) return;
    startTransition(async () => {
      await deleteDoc(id);
      refresh();
    });
  }

  function entityLabel(doc: DocItem): string {
    if (doc.program) return `Initiative: ${doc.program.name}`;
    if (doc.workstream) return `Workstream: ${doc.workstream.name}`;
    if (doc.initiative) return `Subcomponent: ${doc.initiative.name}`;
    return doc.entityType;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documentation</h1>
          <p className="text-muted-foreground mt-1">Create and manage documentation for any entity</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} disabled={isPending}>+ New Document</Button>
      </div>

      {showCreate && (
        <Card className="border-primary/30">
          <CardContent className="pt-5 space-y-4">
            <h3 className="font-bold text-sm">Create Document</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Title *</label>
                <Input className="h-9" placeholder="Document title..." value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Attach To</label>
                <select className="w-full rounded-md border px-3 py-2 text-sm bg-background" value={entityType} onChange={(e) => { setEntityType(e.target.value); setEntityId(""); }}>
                  <option value="PROGRAM">Initiative</option>
                  <option value="WORKSTREAM">Workstream</option>
                  <option value="INITIATIVE">Subcomponent</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Entity</label>
                <select className="w-full rounded-md border px-3 py-2 text-sm bg-background" value={entityId} onChange={(e) => setEntityId(e.target.value)}>
                  <option value="">— Select —</option>
                  {entityOptions.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Content (Markdown)</label>
              <textarea className="w-full rounded-md border px-3 py-2 text-sm bg-background min-h-[120px] resize-y font-mono" placeholder="Write documentation content..." value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={isPending || !title.trim()}>Create</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {docs.length === 0 && (
          <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">No documentation yet.</p></CardContent></Card>
        )}
        {docs.map((doc) => (
          <Card key={doc.id}>
            <CardContent className="pt-5">
              {editingId === doc.id ? (
                <EditDocForm doc={doc} onSave={handleUpdate} onCancel={() => setEditingId(null)} isPending={isPending} />
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{doc.title}</h3>
                      <Badge variant="outline" className="text-[10px]">{entityLabel(doc)}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditingId(doc.id)}>Edit</Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-500" onClick={() => handleDelete(doc.id)}>Delete</Button>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">{doc.body || "No content."}</div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground mt-2 border-t pt-2">
                    <span>By {doc.author?.name || doc.author?.email || "Unknown"}</span>
                    <span>Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function EditDocForm({ doc, onSave, onCancel, isPending }: { doc: DocItem; onSave: (id: string, title: string, body: string) => void; onCancel: () => void; isPending: boolean }) {
  const [title, setTitle] = useState(doc.title);
  const [body, setBody] = useState(doc.body);
  return (
    <div className="space-y-3">
      <Input className="h-9" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="w-full rounded-md border px-3 py-2 text-sm bg-background min-h-[100px] resize-y font-mono" value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(doc.id, title, body)} disabled={isPending}>Save</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
