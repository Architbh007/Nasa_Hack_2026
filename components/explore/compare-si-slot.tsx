"use client";

import { Sparkles } from "lucide-react";

/** Placeholder for the SI comparison paragraph (wired in phase 6). */
export function CompareSiSlot({ ids }: { ids: readonly string[] }) {
  return (
    <section aria-label="SI comparison" data-ids={ids.join(",")} className="rounded-xl border border-primary/25 bg-primary/5 p-4">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-medium">
        <Sparkles className="size-4 text-primary" aria-hidden /> SI comparison
      </h3>
      <p className="text-sm text-muted-foreground">
        An SI paragraph on similarities and differences between these investigations will appear here once the SI layer is connected.
      </p>
    </section>
  );
}
