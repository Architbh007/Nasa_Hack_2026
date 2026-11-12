"use client";

import { SiError, SiHeading, SiMeta, SiSkeleton } from "@/components/si/si-states";
import { SiMarkdown } from "@/components/si/si-markdown";
import type { InvestigationSummary } from "@/lib/ai/schemas";
import { useSiQuery } from "@/lib/si-client";

export function SiSummaryCard({ investigationId }: { investigationId: string }) {
  const { state, retry } = useSiQuery<InvestigationSummary>("/api/summarize", { investigationId });
  return (
    <section aria-label="SI summary" aria-live="polite" className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
      <SiHeading>SI summary</SiHeading>
      {state.status === "loading" && <SiSkeleton lines={5} />}
      {state.status === "error" && <SiError message={state.message} onRetry={retry} />}
      {state.status === "success" && (
        <div className="space-y-3">
          <SiMarkdown text={state.data.overview} />
          <ul className="space-y-1.5 text-sm">
            {state.data.keyTakeaways.map((t) => (
              <li key={t} className="flex gap-2">
                <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                <SiMarkdown text={t} />
              </li>
            ))}
          </ul>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg bg-background/40 p-2.5">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Habitat relevance</p>
              <SiMarkdown text={state.data.habitatRelevance} className="text-xs" />
            </div>
            <div className="rounded-lg bg-background/40 p-2.5">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Caveats</p>
              <SiMarkdown text={state.data.caveats} className="text-xs" />
            </div>
          </div>
          <SiMeta cached={state.cached} model={state.model} />
        </div>
      )}
    </section>
  );
}
