"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiError, SiHeading, SiMeta, SiSkeleton } from "@/components/si/si-states";
import { SiMarkdown } from "@/components/si/si-markdown";
import { Slider } from "@/components/ui/slider";
import type { LowerOxygenExplanation } from "@/lib/ai/schemas";
import { CATEGORY_LABEL } from "@/lib/constants";
import { ESTIMATE_LABEL, estimateFlame, type FlameEstimate } from "@/lib/flame-estimate";
import { num } from "@/lib/format";
import type { HabitatInputs } from "@/lib/habitat";
import {
  CREW_BAND,
  defaultComparePair,
  hadFlame,
  lowerOxygenCheck,
  MAX_COMPARE_O2,
  outWhenFlowDropped,
  SEA_LEVEL_PO2_PSI,
  type LowerOxygenCheck,
} from "@/lib/lower-oxygen";
import type { Category, Run } from "@/lib/schema";
import { useSiQuery } from "@/lib/si-client";
import { cn } from "@/lib/utils";

const EVEREST_M = 8849;

const BAND_TONE = {
  fine: "border-emerald-500/40 bg-emerald-500/10",
  mild: "border-sky-500/40 bg-sky-500/10",
  hypoxic: "border-amber-500/50 bg-amber-500/10",
  danger: "border-red-500/50 bg-red-500/10",
} as const;

const signed = (v: number, unit: string, digits = 1) => `${v >= 0 ? "+" : "−"}${num(Math.abs(v), digits)}${unit}`;

/** Wait this long after the slider stops before asking the SI. */
const SI_DEBOUNCE_MS = 700;

function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return settled;
}

function altitudeText(o2: number, altitudeM: number): string {
  if (o2 === 0) return "no oxygen to breathe at all";
  if (altitudeM > EVEREST_M) return `less oxygen than the top of Mount Everest (${num(EVEREST_M, 0)} m)`;
  if (altitudeM > 0) return `like being about ${num(Math.round(altitudeM / 100) * 100, 0)} m up`;
  return "as much oxygen as sea level or more";
}

/** Flame evidence at one air: counts when runs sit there, else the closest runs that state a result. */
function FlameEvidence({ o2, check, categoryLabel }: { o2: number; check: LowerOxygenCheck; categoryLabel: string }) {
  if (o2 === 0) {
    return <p className="text-sm text-muted-foreground">With no oxygen at all nothing can burn, but nobody can breathe either.</p>;
  }
  if (check.runs.length === 0) {
    return (
      <div className="space-y-1.5 text-sm">
        <p className="text-muted-foreground">No {categoryLabel} run sits exactly here. Closest real tests:</p>
        <ul className="space-y-1">
          {check.nearestWithResult.map((n) => (
            <li key={n.run.id} className="flex justify-between gap-3">
              <span className="tabular">
                {num(n.o2Percent)}%, {num(n.pressurePsi)} psi
                <span className="text-muted-foreground"> ({signed(n.dO2, "%")}, {signed(n.dPsi, " psi")})</span>
              </span>
              <span className={hadFlame(n.run) ? "font-medium" : "text-muted-foreground"}>{hadFlame(n.run) ? "Flame" : "No ignition"}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <p className="text-2xl font-semibold tabular">
        {check.withFlame}
        <span className="text-sm font-normal text-muted-foreground"> of {check.runs.length} real runs had a flame</span>
      </p>
      <p className="text-xs text-muted-foreground">
        {check.noIgnition > 0 && <>{check.noIgnition} did not ignite. </>}
        {check.notStated > 0 && <>{check.notStated} don&apos;t state a result. </>}
        {check.flowLinkedOut > 0 && (
          <>
            <strong className="text-foreground">{check.flowLinkedOut}</strong> went out when the airflow was turned down or off.
          </>
        )}
      </p>
    </div>
  );
}

const CONFIDENCE_LABEL = { high: "high", medium: "medium", low: "low" } as const;

/** Model estimate for one air, kept visually apart from the test evidence. */
function EstimateBox({ estimate }: { estimate: FlameEstimate }) {
  return (
    <div className="space-y-1 rounded-md border border-dashed border-primary/50 bg-primary/5 p-3">
      <p className="flex items-center justify-between gap-2 text-[0.8125rem] font-medium">
        Flame estimate
        <span className="rounded-sm bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">Estimate, not a test</span>
      </p>
      {estimate.kind === "no-oxygen" && <p className="text-sm">Nothing can burn without oxygen.</p>}
      {estimate.kind === "too-far" && <p className="text-sm text-muted-foreground">Too far from any real test to estimate.</p>}
      {estimate.kind === "estimate" && (
        <>
          <p className="text-sm">
            <strong>{ESTIMATE_LABEL(estimate.probability, estimate.low, estimate.high)}</strong>{" "}
            <span className="tabular">
              · {num(estimate.probability * 100, 0)}% chance of a flame (range {num(estimate.low * 100, 0)}–{num(estimate.high * 100, 0)}%)
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            Confidence {CONFIDENCE_LABEL[estimate.confidence]} · weighs about {num(estimate.evidence, estimate.evidence < 10 ? 1 : 0)} nearby
            real tests
            {estimate.extrapolating && estimate.lowestTestedO2 !== null && (
              <> · below the lowest real test ({num(estimate.lowestTestedO2)}% O2), so this is an extrapolation</>
            )}
          </p>
        </>
      )}
    </div>
  );
}

function AirColumn({
  title,
  o2,
  pressurePsi,
  check,
  estimate,
  categoryLabel,
}: {
  title: string;
  o2: number;
  pressurePsi: number;
  check: LowerOxygenCheck;
  estimate: FlameEstimate;
  categoryLabel: string;
}) {
  const band = CREW_BAND[check.band];
  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <p className="text-xl font-semibold tabular">
          {num(o2)}% <span className="text-sm font-normal text-muted-foreground">O2 · {num(pressurePsi)} psi</span>
        </p>
      </div>
      <div className="space-y-1.5">
        <p className="text-[0.8125rem] font-medium">Does a flame burn here?</p>
        <FlameEvidence o2={o2} check={check} categoryLabel={categoryLabel} />
      </div>
      <EstimateBox estimate={estimate} />
      <div className={cn("space-y-1 rounded-md border p-3", BAND_TONE[check.band])}>
        <p className="text-[0.8125rem] font-medium">What the crew breathes</p>
        <p className="text-lg font-semibold tabular">
          {num(check.pO2Psi, 2)} <span className="text-sm font-normal text-muted-foreground">psi of oxygen</span>
        </p>
        <p className="text-sm">
          <strong>{band.label}</strong> · {altitudeText(o2, check.altitudeM)}
        </p>
      </div>
    </div>
  );
}

/** SI reading of the before/after pair. Runs automatically once the slider settles; the server recomputes everything it sees. */
function LowerOxygenSi({ inputs, fromO2, toO2 }: { inputs: HabitatInputs; fromO2: number; toO2: number }) {
  const body = useDebounced(JSON.stringify({ inputs, fromO2, toO2 }), SI_DEBOUNCE_MS);
  const parsed = useMemo(() => JSON.parse(body) as unknown, [body]);
  const { state, retry } = useSiQuery<LowerOxygenExplanation>("/api/lower-oxygen", parsed);
  return (
    <section aria-label="SI explanation" aria-live="polite" className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
      <SiHeading>SI explanation: what changes when we lower the oxygen?</SiHeading>
      {state.status === "loading" && <SiSkeleton lines={6} />}
      {state.status === "error" && <SiError message={state.message} onRetry={retry} />}
      {state.status === "success" && (
        <div className="space-y-2">
          <SiMarkdown text={`**${state.data.answer}**`} />
          <SiMarkdown text={`**What changes:** ${state.data.whatChanges}`} />
          <SiMarkdown text={`**What you would see:** ${state.data.whatYouWouldSee}`} />
          <SiMarkdown text={`**Crew:** ${state.data.crew}`} />
          <SiMarkdown text={`**Better response:** ${state.data.instead}`} />
          <SiMeta cached={state.cached} model={state.model} />
        </div>
      )}
    </section>
  );
}

/**
 * "What happens if we lower the oxygen during a fire?" Puts two airs side by side (before and after,
 * same pressure) with what real runs recorded at each and what each means for the crew. Evidence only.
 */
export function LowerOxygen({ inputs, category, runs }: { inputs: HabitatInputs; category: Category; runs: readonly Run[] }) {
  const [chosen, setChosen] = useState<{ fromO2: number; toO2: number } | null>(null);
  const { fromO2, toO2 } = chosen ?? defaultComparePair(inputs.o2Percent);
  const pressurePsi = inputs.pressurePsi;

  const before = useMemo(() => lowerOxygenCheck({ fromO2, toO2: fromO2, pressurePsi, category }, runs), [fromO2, pressurePsi, category, runs]);
  const after = useMemo(() => lowerOxygenCheck({ fromO2, toO2, pressurePsi, category }, runs), [fromO2, toO2, pressurePsi, category, runs]);
  const beforeEstimate = useMemo(() => estimateFlame({ o2Percent: fromO2, pressurePsi }, runs, category), [fromO2, pressurePsi, category, runs]);
  const afterEstimate = useMemo(() => estimateFlame({ o2Percent: toO2, pressurePsi }, runs, category), [toO2, pressurePsi, category, runs]);
  const categoryLabel = CATEGORY_LABEL[category].toLowerCase();

  // Investigator notes at the lowered air, or the closest airflow evidence and results when none sit there.
  const examples =
    after.examples.length > 0
      ? after.examples
      : [...new Map([...after.airflowEvidence, ...after.nearestWithResult].map((n) => [n.run.id, n])).values()]
          .filter((n) => (n.run.outcomeText ?? "").length > 0)
          .slice(0, 3);

  const altitudeChange = after.altitudeM - before.altitudeM;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm">
          Compare <strong className="tabular">{num(fromO2)}%</strong> with <strong className="tabular">{num(toO2)}%</strong> O2 at{" "}
          {num(pressurePsi)} psi. The right handle is the air before, the left handle the air after lowering.
        </p>
        <Slider
          min={0}
          max={MAX_COMPARE_O2}
          step={0.5}
          minStepsBetweenThumbs={1}
          value={[toO2, fromO2]}
          onValueChange={(v) => setChosen({ toO2: v[0] ?? toO2, fromO2: v[1] ?? fromO2 })}
          aria-label="Oxygen after and before lowering, percent"
        />
        <div className="flex justify-between text-[11px] text-muted-foreground tabular">
          <span>0%</span>
          <span>{MAX_COMPARE_O2}%</span>
        </div>
      </div>

      <div className="grid items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <AirColumn title="Before" o2={fromO2} pressurePsi={pressurePsi} check={before} estimate={beforeEstimate} categoryLabel={categoryLabel} />
        <div className="flex items-center justify-center text-muted-foreground">
          <ArrowRight className="size-5 rotate-90 md:rotate-0" aria-hidden />
        </div>
        <AirColumn title="After lowering" o2={toO2} pressurePsi={pressurePsi} check={after} estimate={afterEstimate} categoryLabel={categoryLabel} />
      </div>

      <div className="grid gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm sm:grid-cols-3">
        <p>
          <span className="block text-xs text-muted-foreground">Oxygen in the air</span>
          <strong className="tabular">{signed(toO2 - fromO2, " points")}</strong>
        </p>
        <p>
          <span className="block text-xs text-muted-foreground">Oxygen the crew breathes</span>
          <strong className="tabular">{signed(after.pO2Psi - before.pO2Psi, " psi", 2)}</strong>
          <span className="text-muted-foreground"> (sea level {num(SEA_LEVEL_PO2_PSI, 2)})</span>
        </p>
        <p>
          <span className="block text-xs text-muted-foreground">Feels like climbing</span>
          <strong className="tabular">{toO2 === 0 ? "no breathable air" : signed(Math.round(altitudeChange / 100) * 100, " m", 0)}</strong>
        </p>
      </div>

      {examples.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">
            {after.examples.length > 0 ? "What the investigators wrote at the lowered air" : "What the investigators wrote in the closest tests"}
          </h3>
          <ul className="space-y-2">
            {examples.map((p) => (
              <li key={p.run.id} className="rounded-md border border-border p-3 text-sm">
                <p className="italic">&ldquo;{p.run.outcomeText}&rdquo;</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <Link href={`/explore?id=${p.run.investigationId}`} className="text-link hover:underline">
                    {p.run.id}
                  </Link>{" "}
                  · {num(p.o2Percent)}% O2, {num(p.pressurePsi)} psi
                  {outWhenFlowDropped(p.run) && <> · went out when airflow dropped</>} · {p.run.source.file}, {p.run.source.ref}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <LowerOxygenSi inputs={inputs} fromO2={fromO2} toO2={toO2} />
    </div>
  );
}
