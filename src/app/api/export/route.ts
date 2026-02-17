import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const entity = searchParams.get("entity");

  if (!entity) {
    return NextResponse.json({ error: "Missing entity param" }, { status: 400 });
  }

  let csv = "";

  if (entity === "initiatives") {
    const items = await prisma.initiative.findMany({
      where: { archivedAt: null },
      include: { workstream: true },
      orderBy: [{ workstreamId: "asc" }, { sortOrder: "asc" }],
    });
    csv = "Name,Workstream,Category,Status,Start,End,Owner,NeedsRefinement\n";
    csv += items
      .map((i) =>
        [
          `"${i.name}"`,
          `"${i.workstream.name}"`,
          i.category,
          i.status,
          i.plannedStartMonth || "",
          i.plannedEndMonth || "",
          i.ownerInitials || "",
          i.needsRefinement ? "Yes" : "No",
        ].join(",")
      )
      .join("\n");
  } else if (entity === "milestones") {
    const items = await prisma.milestone.findMany({
      include: { initiative: true },
      orderBy: { date: "asc" },
    });
    csv = "Name,Date,DateEnd,Initiative,Notes\n";
    csv += items
      .map((m) =>
        [
          `"${m.name}"`,
          m.date || "",
          m.dateEnd || "",
          `"${m.initiative?.name || "Program-level"}"`,
          `"${(m.notes || "").replace(/"/g, '""')}"`,
        ].join(",")
      )
      .join("\n");
  } else if (entity === "partners") {
    const items = await prisma.partner.findMany({ orderBy: { name: "asc" } });
    csv = "Name,RoleDescription,Agreements\n";
    csv += items
      .map((p) =>
        [
          `"${p.name}"`,
          `"${(p.roleDescription || "").replace(/"/g, '""')}"`,
          `"${(p.agreements || "").replace(/"/g, '""')}"`,
        ].join(",")
      )
      .join("\n");
  } else if (entity === "assignments") {
    const items = await prisma.assignment.findMany({
      include: { person: true, initiative: true },
      orderBy: { month: "asc" },
    });
    csv = "Person,Initiative,Month,HoursPlanned,HoursActual,Notes\n";
    csv += items
      .map((a) =>
        [
          `"${a.person?.name || ""}"`,
          `"${a.initiative.name}"`,
          a.month,
          a.hoursPlanned,
          a.hoursActual,
          `"${(a.notes || "").replace(/"/g, '""')}"`,
        ].join(",")
      )
      .join("\n");
  } else {
    return NextResponse.json({ error: "Unknown entity" }, { status: 400 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=${entity}-${Date.now()}.csv`,
    },
  });
}
