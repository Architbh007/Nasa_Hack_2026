"use client";

import { Sparkles } from "lucide-react";

/** Placeholder for the SI edge explanation (wired in phase 6). */
export function EdgeExplanation({ edgeId }: { edgeId: string }) {
  return (
    <div data-edge={edgeId} className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm">
      <p className="mb-1 flex items-center gap-1.5 font-medium">
        <Sparkles className="size-3.5 text-primary" aria-hidden /> Why these are linked
      </p>
      <p className="text-muted-foreground">A two-sentence SI explanation of this link will appear here once the SI layer is connected.</p>
    </div>
  );
}
