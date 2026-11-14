import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { HabitatView } from "@/components/habitat/habitat-view";
import { Skeleton } from "@/components/ui/skeleton";
import { getDataset } from "@/lib/data";

export const metadata: Metadata = { title: "Habitat Flammability Explorer" };

/** Fire Twin reports the sample length behind each item; no other measured value is needed on this page. */
const lengthOnly = (m: Record<string, number | null>): Record<string, number | null> =>
  m.lengthCm === null || m.lengthCm === undefined ? {} : { lengthCm: m.lengthCm };

function HabitatSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)]">
      <Skeleton className="h-[560px] rounded-xl" />
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[520px] rounded-xl" />
      </div>
    </div>
  );
}

export default function HabitatPage() {
  const { investigations, runs: allRuns, scenarios } = getDataset();
  // The map and nearest-runs table need values and outcomes, not the long investigator notes (those are in the Explorer).
  const runs = allRuns.map((r) => ({ ...r, outcomeText: null, metrics: lengthOnly(r.metrics), flags: [], pressureNote: null }));
  return (
    <>
      <PageHeader
        title="Habitat Flammability Explorer"
        description="Pick a cabin air. See which real NASA tests cover it and which do not, read the SI's explanation with its sources, then watch a fire play out in a cabin module."
      />
      <Suspense fallback={<HabitatSkeleton />}>
        <HabitatView investigations={investigations} runs={runs} scenarios={scenarios} />
      </Suspense>
    </>
  );
}
