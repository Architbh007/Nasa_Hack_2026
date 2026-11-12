import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { ExploreView } from "@/components/explore/explore-view";
import { Skeleton } from "@/components/ui/skeleton";
import { getDataset } from "@/lib/data";

export const metadata: Metadata = { title: "Investigation Explorer" };

function ExploreSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-[480px] w-full rounded-xl" />
    </div>
  );
}

export default function ExplorePage() {
  const { investigations, tests } = getDataset();
  return (
    <>
      <PageHeader
        eyebrow="Explore"
        title="Investigation Explorer"
        description={`${investigations.length} PSI combustion investigations and ${tests.length} test runs. Filter by fuel phase, hardware, safety pillar, habitat relevance and tested oxygen range.`}
      />
      <Suspense fallback={<ExploreSkeleton />}>
        <ExploreView investigations={investigations} tests={tests} />
      </Suspense>
    </>
  );
}
