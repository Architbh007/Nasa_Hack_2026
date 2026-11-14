"use client";

import { SiError, SiSkeleton } from "@/components/si/si-states";
import { SiMarkdown } from "@/components/si/si-markdown";
import type { ScenarioSummary } from "@/lib/ai/schemas";
import { useSiQuery } from "@/lib/si-client";
import { Database, Sparkles } from "lucide-react";

export function ScenarioSiParagraph({ scenarioId }: { scenarioId: string }) {
  const { state, retry } = useSiQuery<ScenarioSummary>("/api/scenario-summary", { scenarioId });
  return (
    <div aria-live="polite" className="space-y-1.5 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary/90">
        <Sparkles className="size-3.5" aria-hidden /> SI readiness note
      </p>
      {state.status === "loading" && <SiSkeleton lines={4} />}
      {state.status === "error" && <SiError compact message={state.message} onRetry={retry} />}
      {state.status === "success" && (
        <>
          <SiMarkdown text={state.data.paragraph} className="text-[13px]" />
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {state.cached ? <Database className="size-3" aria-hidden /> : <Sparkles className="size-3" aria-hidden />}
            {state.cached ? "Cached" : "Fresh"} · {state.model} · grounded in real runs
          </p>
        </>
      )}
    </div>
  );
}
