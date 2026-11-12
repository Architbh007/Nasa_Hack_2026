"use client";

import { Sparkles } from "lucide-react";

/** Placeholder until the SI layer lands (phase 6). */
export function SiSummaryCard({ investigationId }: { investigationId: string }) {
  return (
    <section
      aria-label="SI summary"
      data-investigation={investigationId}
      className="rounded-xl border border-primary/25 bg-primary/5 p-4"
    >
      <h3 className="mb-1 flex items-center gap-2 text-sm font-medium">
        <Sparkles className="size-4 text-primary" aria-hidden /> SI summary
      </h3>
      <p className="text-sm text-muted-foreground">
        A grounded summary of this investigation will appear here once the SI layer is connected.
      </p>
    </section>
  );
}
