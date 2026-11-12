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
        eyebrow="Main feature"
        title="Habitat Flammability Explorer"
        description="Set a proposed cabin atmosphere and see where it sits relative to tested microgravity combustion conditions, which research covers it, what is untested, and a predicted ignition likelihood."
      />
      <Suspense fallback={<HabitatSkeleton />}>
        <HabitatView investigations={investigations} tests={tests} scenarios={scenarios} model={model} />
      </Suspense>
    </>
  );
}
