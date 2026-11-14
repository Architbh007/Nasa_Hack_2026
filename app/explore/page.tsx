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
  const { investigations, runs, summaries } = getDataset();
  return (
    <>
      <PageHeader
        eyebrow="Display 03 · Explorer"
        title="Investigation Explorer"
        description={`${investigations.length} combustion investigations (PSI records plus published Saffire IV–VI) and ${runs.length} real run-level tests. Filter by fuel category, data held, hardware, pillar and the O2 range of real runs.`}
      />
      <Suspense fallback={<ExploreSkeleton />}>
        <ExploreView investigations={investigations} runs={runs} summaries={summaries} />
      </Suspense>
    </>
  );
}
