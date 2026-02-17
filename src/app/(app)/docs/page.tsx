import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const docs = [
  {
    href: "/docs/agile-estimation",
    title: "Agile Estimation & 3-Point Anchor Guide",
    description:
      "Learn how to calibrate story-point estimation using a 3-point anchor, compare good vs bad anchors, and size work consistently across sprints.",
    tags: ["Estimation", "Story Points", "Process"],
  },
];

export default function DocsIndexPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
        <p className="text-muted-foreground">
          Guides, references, and process documentation for the Project Neuron team.
        </p>
      </header>

      <div className="grid gap-4">
        {docs.map((doc) => (
          <Link key={doc.href} href={doc.href} className="block group">
            <Card className="transition-shadow group-hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                  {doc.title}
                </CardTitle>
                <CardDescription>{doc.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2 flex-wrap">
                  {doc.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

