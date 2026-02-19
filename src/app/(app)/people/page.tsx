import { prisma } from "@/lib/prisma";
import { serializeForClient } from "@/lib/serialize";
import PeopleView from "./people-view";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const people = await prisma.person.findMany({
    orderBy: { name: "asc" },
  });

  return <PeopleView people={serializeForClient(people)} />;
}
