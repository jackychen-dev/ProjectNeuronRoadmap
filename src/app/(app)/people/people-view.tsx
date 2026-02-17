"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createPerson, updatePerson, deletePerson } from "@/lib/actions/people";
import { useTrackedSave } from "@/hooks/use-autosave";

interface Person {
  id: string;
  name: string;
  initials: string | null;
  title: string | null;
  team: string | null;
  roleInProgram: string | null;
}

export default function PeopleView({ people }: { people: Person[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const trackedSave = useTrackedSave();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", initials: "", title: "", team: "", roleInProgram: "" });

  function refresh() { startTransition(() => router.refresh()); }

  function startEdit(p: Person) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      initials: p.initials || "",
      title: p.title || "",
      team: p.team || "",
      roleInProgram: p.roleInProgram || "",
    });
  }

  function startAdd() {
    setShowAdd(true);
    setEditingId(null);
    setForm({ name: "", initials: "", title: "", team: "", roleInProgram: "" });
  }

  function cancel() { setEditingId(null); setShowAdd(false); }

  function handleSave() {
    if (!form.name.trim()) return;
    const data = {
      name: form.name.trim(),
      initials: form.initials.trim() || null,
      title: form.title.trim() || null,
      team: form.team.trim() || null,
      roleInProgram: form.roleInProgram.trim() || null,
    };
    startTransition(async () => {
      if (editingId) {
        await trackedSave(() => updatePerson(editingId, data));
      } else {
        await trackedSave(() => createPerson(data));
      }
      setEditingId(null);
      setShowAdd(false);
      refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this person? Their assignments will also be removed.")) return;
    startTransition(async () => {
      await trackedSave(() => deletePerson(id));
      refresh();
    });
  }

  // Group by team
  const teams = people.reduce((acc, p) => {
    const t = p.team || "Unassigned";
    if (!acc[t]) acc[t] = [];
    acc[t].push(p);
    return acc;
  }, {} as Record<string, Person[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">People</h1>
          <p className="text-muted-foreground mt-1">Project Neuron team roster &amp; roles ({people.length} members)</p>
        </div>
        <Button onClick={startAdd} disabled={isPending}>+ Add Person</Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <Card className="border-primary">
          <CardHeader><CardTitle className="text-sm">Add New Team Member</CardTitle></CardHeader>
          <CardContent>
            <PersonForm form={form} setForm={setForm} onSave={handleSave} onCancel={cancel} isPending={isPending} />
          </CardContent>
        </Card>
      )}

      {Object.entries(teams).map(([team, members]) => (
        <Card key={team}>
          <CardHeader>
            <CardTitle>{team} ({members.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((p) => (
                <div key={p.id} className="rounded-lg border p-4 hover:shadow-md transition-shadow group">
                  {editingId === p.id ? (
                    <PersonForm form={form} setForm={setForm} onSave={handleSave} onCancel={cancel} isPending={isPending} />
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                          {p.initials || p.name.split(" ").map(w => w[0]).join("")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.title || "No title"}</p>
                        </div>
                      </div>
                      {p.roleInProgram && (
                        <Badge variant="secondary" className="text-xs mb-2">{p.roleInProgram}</Badge>
                      )}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startEdit(p)} disabled={isPending}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500 hover:text-red-700" onClick={() => handleDelete(p.id)} disabled={isPending}>
                          Delete
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {people.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No team members added yet. Click &quot;+ Add Person&quot; to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Person Form ─────────────────────────────────────── */

function PersonForm({
  form,
  setForm,
  onSave,
  onCancel,
  isPending,
}: {
  form: { name: string; initials: string; title: string; team: string; roleInProgram: string };
  setForm: (f: typeof form) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Name *</label>
          <Input
            className="h-8 text-sm"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Initials</label>
          <Input
            className="h-8 text-sm"
            placeholder="e.g. DQ"
            value={form.initials}
            maxLength={4}
            onChange={(e) => setForm({ ...form, initials: e.target.value.toUpperCase() })}
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1">Title</label>
        <Input
          className="h-8 text-sm"
          placeholder="e.g. Digital Innovation Architect"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Team</label>
          <Input
            className="h-8 text-sm"
            placeholder="e.g. Digital Innovation"
            value={form.team}
            onChange={(e) => setForm({ ...form, team: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Role in Program</label>
          <Input
            className="h-8 text-sm"
            placeholder="e.g. Tech Lead"
            value={form.roleInProgram}
            onChange={(e) => setForm({ ...form, roleInProgram: e.target.value })}
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" className="h-8 text-xs" onClick={onSave} disabled={isPending || !form.name.trim()}>
          Save
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

