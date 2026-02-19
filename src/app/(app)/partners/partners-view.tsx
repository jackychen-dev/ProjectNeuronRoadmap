"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createPartner, updatePartner, deletePartner } from "@/lib/actions/partners";
import { useTrackedSave } from "@/hooks/use-autosave";

/* ─── Types ───────────────────────────────────────────── */

interface Artifact {
  id: string;
  name: string;
  url: string | null;
}

interface Partner {
  id: string;
  name: string;
  roleDescription: string | null;
  agreements: string | null;
  logoUrl: string | null;
  workstreamLinks: { workstream: { id: string; name: string } }[];
  initiativeLinks: { initiative: { id: string; name: string; workstream: { name: string } } }[];
  artifacts: Artifact[];
}

/* ─── Component ───────────────────────────────────────── */

export function PartnersView({ partners }: { partners: Partner[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const trackedSave = useTrackedSave();
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      {/* Add Partner button */}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowAdd(true)} disabled={showAdd}>
          + Add Partner
        </Button>
      </div>

      {/* Add Partner form */}
      {showAdd && (
        <AddPartnerForm
          isPending={isPending}
          onSubmit={(data) => {
            startTransition(async () => {
              await trackedSave(() => createPartner(data));
              setShowAdd(false);
              refresh();
            });
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Partner cards */}
      {partners.length === 0 && !showAdd && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No partners yet. Click &quot;+ Add Partner&quot; to get started.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {partners.map((p) => {
          const isExpanded = expandedId === p.id;
          const isEditing = editingId === p.id;

          return (
            <Card
              key={p.id}
              className={`transition-all ${isExpanded ? "md:col-span-2 xl:col-span-3" : ""}`}
            >
              <CardHeader
                className="cursor-pointer hover:bg-accent/20 transition-colors pb-2"
                onClick={() => setExpandedId(isExpanded ? null : p.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {p.logoUrl ? (
                      <Image src={p.logoUrl} alt={p.name} width={40} height={40} className="w-10 h-10 rounded object-contain border" unoptimized />
                    ) : (
                      <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                        {p.name[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{p.name}</CardTitle>
                      {p.roleDescription && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.roleDescription}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{isExpanded ? "−" : "+"}</span>
                </div>

                {/* Tags summary */}
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {p.workstreamLinks.map((wl) => (
                    <Badge key={wl.workstream.id} variant="outline" className="text-[10px]">
                      {wl.workstream.name}
                    </Badge>
                  ))}
                  {p.initiativeLinks.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {p.initiativeLinks.length} initiative{p.initiativeLinks.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                  {p.artifacts.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      📎 {p.artifacts.length}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="border-t pt-4 space-y-4">
                  {isEditing ? (
                    <EditPartnerForm
                      partner={p}
                      isPending={isPending}
                      onSubmit={(data) => {
                        startTransition(async () => {
                          await trackedSave(() => updatePartner(p.id, data));
                          setEditingId(null);
                          refresh();
                        });
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <>
                      {/* Description */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-1">Description</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {p.roleDescription || "No description provided."}
                        </p>
                      </div>

                      {/* Agreements */}
                      {p.agreements && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground mb-1">Agreements</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.agreements}</p>
                        </div>
                      )}

                      {/* Linked Initiatives */}
                      {p.initiativeLinks.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground mb-1">Linked Initiatives</h4>
                          <div className="space-y-1">
                            {p.initiativeLinks.map((il) => (
                              <div key={il.initiative.id} className="flex items-center gap-2 text-sm">
                                <span className="font-medium">{il.initiative.name}</span>
                                <span className="text-xs text-muted-foreground">({il.initiative.workstream.name})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Artifacts */}
                      {p.artifacts.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground mb-1">Artifacts</h4>
                          <div className="flex gap-2 flex-wrap">
                            {p.artifacts.map((a) => (
                              <a
                                key={a.id}
                                href={a.url || "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary underline"
                              >
                                {a.name}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => setEditingId(p.id)}>
                          ✏️ Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs text-red-500 hover:text-red-700"
                          disabled={isPending}
                          onClick={() => {
                            if (confirm(`Delete partner "${p.name}"?`)) {
                              startTransition(async () => {
                                await trackedSave(() => deletePartner(p.id));
                                setExpandedId(null);
                                refresh();
                              });
                            }
                          }}
                        >
                          🗑 Delete
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Add Partner Form ──────────────────────────────────── */

function AddPartnerForm({
  isPending,
  onSubmit,
  onCancel,
}: {
  isPending: boolean;
  onSubmit: (data: { name: string; roleDescription?: string; agreements?: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [agreements, setAgreements] = useState("");

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Add New Partner</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Partner Name *</label>
          <Input
            className="h-8 text-sm"
            placeholder="e.g. NVIDIA, Siemens, PTC..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Description</label>
          <textarea
            className="w-full rounded-md border px-3 py-2 text-sm bg-background min-h-[80px] resize-y"
            placeholder="What does this partner do? What is their role in the program?"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Agreements</label>
          <textarea
            className="w-full rounded-md border px-3 py-2 text-sm bg-background min-h-[60px] resize-y"
            placeholder="Any active agreements, contracts, or MOUs..."
            value={agreements}
            onChange={(e) => setAgreements(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="text-xs"
            disabled={isPending || !name.trim()}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                roleDescription: desc.trim() || undefined,
                agreements: agreements.trim() || undefined,
              })
            }
          >
            Create Partner
          </Button>
          <Button size="sm" variant="ghost" className="text-xs" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Edit Partner Form ─────────────────────────────────── */

function EditPartnerForm({
  partner,
  isPending,
  onSubmit,
  onCancel,
}: {
  partner: Partner;
  isPending: boolean;
  onSubmit: (data: { name: string; roleDescription?: string; agreements?: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(partner.name);
  const [desc, setDesc] = useState(partner.roleDescription || "");
  const [agreements, setAgreements] = useState(partner.agreements || "");

  return (
    <div className="space-y-3 border rounded-lg p-3 bg-muted/20">
      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1">Partner Name *</label>
        <Input
          className="h-8 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1">Description</label>
        <textarea
          className="w-full rounded-md border px-3 py-2 text-sm bg-background min-h-[80px] resize-y"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1">Agreements</label>
        <textarea
          className="w-full rounded-md border px-3 py-2 text-sm bg-background min-h-[60px] resize-y"
          value={agreements}
          onChange={(e) => setAgreements(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="text-xs"
          disabled={isPending || !name.trim()}
          onClick={() =>
            onSubmit({
              name: name.trim(),
              roleDescription: desc.trim() || undefined,
              agreements: agreements.trim() || undefined,
            })
          }
        >
          Save
        </Button>
        <Button size="sm" variant="ghost" className="text-xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

