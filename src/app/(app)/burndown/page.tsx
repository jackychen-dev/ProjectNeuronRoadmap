import { prisma } from "@/lib/prisma";
import BurndownView from "./burndown-view";

export const dynamic = "force-dynamic";

export default async function BurndownPage() {
  const workstreams = await prisma.workstream.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      initiatives: {
        where: { archivedAt: null },
        orderBy: { sortOrder: "asc" },
        include: {
          subTasks: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  return <BurndownView workstreams={JSON.parse(JSON.stringify(workstreams))} />;
}
