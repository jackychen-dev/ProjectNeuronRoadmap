import { getFeatures } from "@/lib/actions/features";
import { getThemes } from "@/lib/actions/themes";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { FeaturesTable } from "./features-table";
import { CreateFeatureDialog } from "./create-feature-dialog";
import { ExportButton } from "@/components/export-button";

export const dynamic = "force-dynamic";

export default async function FeaturesPage() {
  const [features, themes, users] = await Promise.all([
    getFeatures(),
    getThemes(),
    prisma.user.findMany({ select: { id: true, name: true, email: true } }),
  ]);

  return (
    <div>
      <PageHeader title="Features" description="Track and manage all features">
        <ExportButton entity="features" />
        <CreateFeatureDialog themes={themes} users={users} />
      </PageHeader>
      <FeaturesTable features={features} />
    </div>
  );
}

