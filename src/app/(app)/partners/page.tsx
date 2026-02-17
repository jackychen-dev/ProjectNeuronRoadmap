import { prisma } from "@/lib/prisma";
import { PartnersView } from "./partners-view";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const partners = await prisma.partner.findMany({
    orderBy: { name: "asc" },
    include: {
      workstreamLinks: { include: { workstream: true } },
      initiativeLinks: { include: { initiative: { include: { workstream: true } } } },
      artifacts: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Partners</h1>
        <p className="text-muted-foreground mt-1">
          Key technology, research, and industry partners driving Project Neuron
        </p>
      </div>
      <PartnersView partners={JSON.parse(JSON.stringify(partners))} />
    </div>
  );
}
