import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { HabitatView } from "@/components/habitat/habitat-view";
import { Skeleton } from "@/components/ui/skeleton";
import { getDataset } from "@/lib/data";

export const metadata: Metadata = { title: "Habitat Flammability Explorer" };

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
  const { investigations, tests, scenarios, model } = getDataset();
  return (
    <>
      <PageHeader
        title="Habitat Flammability Explorer"
        description="Pick a cabin air. See how likely a fire is and whether NASA has tested it, read the SI's explanation with its sources, then watch the same fire play out in a cabin module."
      />
      <Suspense fallback={<HabitatSkeleton />}>
        <HabitatView investigations={investigations} tests={tests} scenarios={scenarios} model={model} />
      </Suspense>
    </>
  );
}
