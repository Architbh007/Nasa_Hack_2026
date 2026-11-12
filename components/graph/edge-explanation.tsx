"use client";

import { Sparkles } from "lucide-react";
import { SiError, SiMeta, SiSkeleton } from "@/components/si/si-states";
import { SiMarkdown } from "@/components/si/si-markdown";
import type { EdgeExplanationResult } from "@/lib/ai/schemas";
import { useSiQuery } from "@/lib/si-client";

/** Two-sentence SI explanation of a link (fast model, cached by edge). */
export function EdgeExplanation({ source, target }: { source: string; target: string }) {
  const { state, retry } = useSiQuery<EdgeExplanationResult>("/api/edge-explain", { source, target });
  return (
    <div aria-live="polite" className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm">
      <p className="flex items-center gap-1.5 font-medium">
        <Sparkles className="size-3.5 text-primary" aria-hidden /> Why these are linked
      </p>
      {state.status === "loading" && <SiSkeleton lines={3} />}
      {state.status === "error" && <SiError message={state.message} onRetry={retry} />}
      {state.status === "success" && (
        <>
          <SiMarkdown text={state.data.explanation} />
          <SiMeta cached={state.cached} model={state.model} />
        </>
      )}
    </div>
  );
}
