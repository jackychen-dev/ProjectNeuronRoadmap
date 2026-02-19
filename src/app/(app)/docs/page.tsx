import { prisma } from "@/lib/prisma";
import { serializeForClient } from "@/lib/serialize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DocsView from "./docs-view";

export const dynamic = "force-dynamic";

export default async function DocsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id || null;

  const [docs, programs, workstreams, initiatives] = await Promise.all([
    prisma.documentation.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        author: { select: { id: true, name: true, email: true } },
        program: { select: { id: true, name: true } },
        workstream: { select: { id: true, name: true } },
        initiative: { select: { id: true, name: true } },
      },
    }),
    prisma.program.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.workstream.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.initiative.findMany({
      where: { archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <DocsView
      docs={serializeForClient(docs)}
      programs={serializeForClient(programs)}
      workstreams={serializeForClient(workstreams)}
      initiatives={serializeForClient(initiatives)}
      userId={userId}
    />
  );
}
