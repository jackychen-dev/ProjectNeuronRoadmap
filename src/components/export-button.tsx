"use client";

import { Button } from "@/components/ui/button";

const entities = [
  { key: "initiatives", label: "Initiatives" },
  { key: "milestones", label: "Milestones" },
  { key: "partners", label: "Partners" },
  { key: "assignments", label: "Assignments" },
];

export function ExportButton({ entity }: { entity?: string }) {
  const handleExport = (e: string) => {
    window.open(`/api/export?entity=${e}`, "_blank");
  };

  if (entity) {
    return (
      <Button variant="outline" size="sm" onClick={() => handleExport(entity)}>
        Export CSV
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {entities.map((e) => (
        <Button
          key={e.key}
          variant="outline"
          size="sm"
          onClick={() => handleExport(e.key)}
        >
          Export {e.label}
        </Button>
      ))}
    </div>
  );
}
