import { prisma } from "@/lib/prisma";
import { AdminView } from "./admin-view";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [users, people, needsRefinement] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    }),
    prisma.person.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, initials: true, userId: true },
    }),
    prisma.initiative.findMany({
      where: { needsRefinement: true, archivedAt: null },
      include: { workstream: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AdminView
      users={JSON.parse(JSON.stringify(users))}
      people={JSON.parse(JSON.stringify(people))}
      refinementInitiatives={JSON.parse(JSON.stringify(needsRefinement))}
    />
  );
}
