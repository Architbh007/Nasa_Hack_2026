"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HabitatAssessment } from "@/lib/habitat";

/** Placeholder until the SI layer lands (phase 6). */
export function InterpretationPanel({ assessment }: { assessment: HabitatAssessment }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Sends this condition ({assessment.inputs.o2Percent.toFixed(1)}% O2, {assessment.inputs.pressurePsi.toFixed(1)} psi), the
        metrics, the model output and the top-ranked records to the SI for a structured interpretation.
      </p>
      <Button disabled>
        <Sparkles /> SI interpretation (coming in phase 6)
      </Button>
    </div>
  );
}
