"use client";

import { SiError, SiHeading, SiMeta, SiSkeleton } from "@/components/si/si-states";
import { SiMarkdown } from "@/components/si/si-markdown";
import type { Comparison } from "@/lib/ai/schemas";
import { useSiQuery } from "@/lib/si-client";

function Bullets({ title, items }: { title: string; items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg bg-background/40 p-3">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="space-y-1.5">
        {items.map((t) => (
          <li key={t} className="flex gap-2">
            <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />
            <SiMarkdown text={t} className="text-xs" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CompareSiSlot({ ids }: { ids: readonly string[] }) {
  const { state, retry } = useSiQuery<Comparison>("/api/compare", { ids: [...ids].sort() });
  return (
    <section aria-label="SI comparison" aria-live="polite" className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
      <SiHeading>SI comparison</SiHeading>
      {state.status === "loading" && <SiSkeleton lines={5} />}
      {state.status === "error" && <SiError message={state.message} onRetry={retry} />}
      {state.status === "success" && (
        <div className="space-y-3">
          <SiMarkdown text={state.data.paragraph} />
          <div className="grid gap-3 md:grid-cols-2">
            <Bullets title="Similarities" items={state.data.similarities} />
            <Bullets title="Differences" items={state.data.differences} />
          </div>
          <SiMeta cached={state.cached} model={state.model} />
        </div>
      )}
    </section>
  );
}
