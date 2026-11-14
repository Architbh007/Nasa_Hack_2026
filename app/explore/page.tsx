import { Suspense } from "react";
import type { Metadata } from "next";
import rackPhoto from "@/public/images/combustion-integrated-rack.jpg";
import { PageGuide } from "@/components/shell/page-guide";
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
        title="Investigation Explorer"
        description={`${investigations.length} combustion investigations (PSI records plus published Saffire IV–VI) and ${runs.length} real run-level tests. Filter by fuel category, data held, hardware, pillar and the O2 range of real runs.`}
        image={{
          src: rackPhoto,
          alt: "An astronaut working on the Combustion Integrated Rack aboard the International Space Station",
          credit: "NASA · iss032e014574",
          position: "center 40%",
        }}
      />
      <PageGuide
        question="Where does the data come from, and how do the experiments compare?"
        items={[
          {
            title: "Investigations table",
            does: "All 20 NASA combustion investigations. Search, filter by fuel, data held, hardware or oxygen range, and sort any column.",
          },
          {
            title: "Investigation detail",
            does: "Click a row to open the original NASA record, every test run with its exact source, the citation and an SI summary.",
          },
          {
            title: "Compare mode",
            does: "Pick two to four investigations to plot their runs on one chart and read an SI comparison of what they share and where they differ.",
          },
          {
            title: "Then vs Now",
            does: "The second tab: real spacecraft fires, from Apollo 1 to Mir, and the experiments NASA ran afterwards, each with its sources.",
          },
        ]}
      />
      <Suspense fallback={<ExploreSkeleton />}>
        <ExploreView investigations={investigations} runs={runs} summaries={summaries} />
      </Suspense>
    </>
  );
}
