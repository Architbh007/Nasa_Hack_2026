"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Slider } from "@/components/ui/slider";
import { CATEGORY_LABEL } from "@/lib/constants";
import { num } from "@/lib/format";
import type { HabitatInputs } from "@/lib/habitat";
import { CREW_BAND, lowerOxygenCheck, outWhenFlowDropped, SEA_LEVEL_PO2_PSI } from "@/lib/lower-oxygen";
import type { Category, Run } from "@/lib/schema";
import { cn } from "@/lib/utils";

const MIN_TARGET = 0;
const EVEREST_M = 8849;

const BAND_TONE = {
  fine: "border-emerald-500/40 bg-emerald-500/10",
  mild: "border-sky-500/40 bg-sky-500/10",
  hypoxic: "border-amber-500/50 bg-amber-500/10",
  danger: "border-red-500/50 bg-red-500/10",
} as const;

function defaultTarget(fromO2: number): number {
  return fromO2 > 18 ? 17 : Math.max(MIN_TARGET, Math.round(fromO2 - 3));
}

/**
 * "Can we just lower the oxygen during a fire?" Shows what real runs recorded at the lowered air
 * and what that air means for the crew. Evidence only, no prediction.
 */
export function LowerOxygen({ inputs, category, runs }: { inputs: HabitatInputs; category: Category; runs: readonly Run[] }) {
  const fromO2 = inputs.o2Percent;
  const [chosen, setChosen] = useState<number | null>(null);
  const maxTarget = Math.max(MIN_TARGET, Math.floor(fromO2));
  const toO2 = Math.min(chosen ?? defaultTarget(fromO2), maxTarget);

  const check = useMemo(
    () => lowerOxygenCheck({ fromO2, toO2, pressurePsi: inputs.pressurePsi, category }, runs),
    [fromO2, toO2, inputs.pressurePsi, category, runs]
  );
  const band = CREW_BAND[check.band];
  const categoryLabel = CATEGORY_LABEL[category].toLowerCase();

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-4 text-sm">
          <span>
            Lower the cabin from <strong className="tabular">{num(fromO2)}%</strong> to{" "}
            <strong className="tabular">{num(toO2)}%</strong> O2 at {num(inputs.pressurePsi)} psi
          </span>
        </div>
        <Slider
          min={MIN_TARGET}
          max={maxTarget}
          step={0.5}
          value={[toO2]}
          onValueChange={(v) => setChosen(v[0] ?? toO2)}
          aria-label="Lowered oxygen percent"
          disabled={maxTarget <= MIN_TARGET}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium">Does a flame still burn there?</h3>
          {toO2 === 0 ? (
            <p className="text-sm text-muted-foreground">
              With no oxygen at all nothing can burn. But nobody can breathe either, and emptying a cabin of oxygen takes far longer than a
              fire needs to grow.
            </p>
          ) : check.runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No real {categoryLabel} run sits within ±2% O2 and ±1 psi of this lowered air. Nobody has tested it, so we can&apos;t say a
              flame would go out.
            </p>
          ) : (
            <>
              <p className="text-3xl font-semibold tabular">
                {check.withFlame}
                <span className="text-base font-normal text-muted-foreground"> of {check.runs.length} real runs had a flame</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {check.noIgnition > 0 && <>{check.noIgnition} did not ignite. </>}
                {check.notStated > 0 && <>{check.notStated} don&apos;t state a result. </>}
                {check.flowLinkedOut > 0 && (
                  <>
                    In <strong className="text-foreground">{check.flowLinkedOut}</strong>, the notes say the flame went out when the airflow was
                    turned down or off.
                  </>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Recorded outcomes: {check.outcomeCounts.map((c) => `${c.label} ${c.count}`).join(" · ")}
              </p>
            </>
          )}
        </div>

        <div className={cn("space-y-2 rounded-lg border p-4", BAND_TONE[check.band])}>
          <h3 className="text-sm font-medium">What the crew breathes</h3>
          <p className="text-3xl font-semibold tabular">
            {num(check.pO2Psi, 2)}
            <span className="text-base font-normal text-muted-foreground"> psi of oxygen (sea level {num(SEA_LEVEL_PO2_PSI, 2)})</span>
          </p>
          <p className="text-sm">
            <strong>{band.label}</strong>
            {toO2 === 0 ? (
              <> · no oxygen to breathe at all</>
            ) : check.altitudeM > EVEREST_M ? (
              <> · less oxygen than the top of Mount Everest ({num(EVEREST_M, 0)} m)</>
            ) : (
              check.altitudeM > 0 && <> · like being about {num(Math.round(check.altitudeM / 100) * 100, 0)} m up</>
            )}
          </p>
          <p className="text-sm text-muted-foreground">{band.detail}</p>
        </div>
      </div>

      {check.examples.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">What the investigators wrote</h3>
          <ul className="space-y-2">
            {check.examples.map((p) => (
              <li key={p.run.id} className="rounded-md border border-border p-3 text-sm">
                <p className="italic">&ldquo;{p.run.outcomeText}&rdquo;</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <Link href={`/explore?id=${p.run.investigationId}`} className="text-link hover:underline">
                    {p.run.id}
                  </Link>{" "}
                  · {num(p.o2Percent)}% O2, {num(p.pressurePsi)} psi
                  {outWhenFlowDropped(p.run) && <> · went out when airflow dropped</>}
                  {" "}· {p.run.source.file}, {p.run.source.ref}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
        <p className="font-medium">So, is lowering the oxygen a fire response?</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Less oxygen makes flames weaker, but in the real runs above flames still burned at the lowered air.</li>
          {inputs.gravity === "micro" && (
            <li>In microgravity there is no rising hot air, so the ventilation breeze is what feeds a flame. Turning the vents off starves it.</li>
          )}
          <li>Diluting a whole cabin&apos;s air is much slower than a fire grows, and on a low-pressure cabin it quickly becomes unsafe to breathe.</li>
          <li>Lower oxygen is a design choice to make ignition harder, not an emergency off-switch.</li>
        </ul>
      </div>
    </div>
  );
}
