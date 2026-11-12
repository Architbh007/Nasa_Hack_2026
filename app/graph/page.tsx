import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shell/page-header";
import { GraphView } from "@/components/graph/graph-view";
import { getDataset } from "@/lib/data";

export const metadata: Metadata = { title: "Investigation Network" };

export default function GraphPage() {
  const { investigations } = getDataset();
  return (
    <>
      <PageHeader
        eyebrow="Network"
        title="Investigation Network"
        description="Investigations linked by weighted Jaccard similarity over hardware, fuels, fuel phase, instruments, diluents and safety pillars. Raise the threshold to keep only the strongest links."
      />
      <Suspense fallback={<Skeleton className="h-[700px] w-full rounded-xl" />}>
        <GraphView investigations={investigations} />
      </Suspense>
    </>
  );
}
