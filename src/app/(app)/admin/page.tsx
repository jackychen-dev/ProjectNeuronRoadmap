import { prisma } from "@/lib/prisma";
import { AdminView } from "./admin-view";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  // Get initiatives that need date refinement
  const needsRefinement = await prisma.initiative.findMany({
    where: { needsRefinement: true, archivedAt: null },
    include: { workstream: true },
    orderBy: { name: "asc" },
  });

  return (
    <AdminView
      users={JSON.parse(JSON.stringify(users))}
      refinementInitiatives={JSON.parse(JSON.stringify(needsRefinement))}
    />
  );
}
