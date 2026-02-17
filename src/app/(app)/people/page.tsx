import { prisma } from "@/lib/prisma";
import PeopleView from "./people-view";

export default async function PeoplePage() {
  const people = await prisma.person.findMany({
    orderBy: { name: "asc" },
  });

  return <PeopleView people={JSON.parse(JSON.stringify(people))} />;
}
