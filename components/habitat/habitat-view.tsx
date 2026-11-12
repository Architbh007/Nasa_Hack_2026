"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HabitatControls } from "@/components/habitat/controls";
import { FlammabilityMap } from "@/components/habitat/flammability-map";
import { HabitatReadouts } from "@/components/habitat/readouts";
import { SensitivityChart } from "@/components/habitat/sensitivity-chart";
import { RankingPanel } from "@/components/habitat/ranking-panel";
import { PartialGravityCallout } from "@/components/habitat/partial-gravity-callout";
import { InterpretationPanel } from "@/components/habitat/interpretation-panel";
import { FUEL_PHASE_LABEL, MATERIAL_LABEL, O2_SLIDER, PRESSURE_SLIDER, SYNTHETIC_SOLID_GAP } from "@/lib/constants";
import {
  assessHabitat,
  ignitionStudyTests,
  inputsFromScenario,
  matchingScenario,
  phaseLookup,
  type HabitatInputs,
} from "@/lib/habitat";
import type { ModelArtifact } from "@/lib/model";
import { DEFAULT_RANKING_WEIGHTS, type RankingWeights } from "@/lib/ranking";
import {
  AirflowSchema,
  HabitatGravitySchema,
  MaterialClassSchema,
  type Investigation,
  type Scenario,
  type TestRun,
} from "@/lib/schema";

const DEFAULT_PRESET = "iss-cabin";

function clampNum(raw: string | null, min: number, max: number): number | null {
  if (raw === null) return null;
  const v = Number.parseFloat(raw);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : null;
}

/** Read initial state from the URL (?preset=lunar-base or ?o2=34&p=8.2&m=fabric&a=ventilated&g=lunar). */
function initialState(params: URLSearchParams, scenarios: readonly Scenario[]): { presetId: string; inputs: HabitatInputs } {
  const preset = scenarios.find((s) => s.id === params.get("preset")) ?? scenarios.find((s) => s.id === DEFAULT_PRESET) ?? scenarios[0];
  if (!preset) throw new Error("No scenarios available");
  const base = inputsFromScenario(preset);
  const m = MaterialClassSchema.safeParse(params.get("m"));
  const a = AirflowSchema.safeParse(params.get("a"));
  const g = HabitatGravitySchema.safeParse(params.get("g"));
  const inputs: HabitatInputs = {
    o2Percent: clampNum(params.get("o2"), O2_SLIDER.min, O2_SLIDER.max) ?? base.o2Percent,
    pressurePsi: clampNum(params.get("p"), PRESSURE_SLIDER.min, PRESSURE_SLIDER.max) ?? base.pressurePsi,
    materialClass: m.success ? m.data : base.materialClass,
    airflow: a.success ? a.data : base.airflow,
    gravity: g.success ? g.data : base.gravity,
  };
  return { presetId: matchingScenario(scenarios, inputs)?.id ?? "custom", inputs };
}

function Section({ title, description, children, action }: { title: string; description?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function HabitatView({
  investigations,
  tests,
  scenarios,
  model,
}: {
  investigations: Investigation[];
  tests: TestRun[];
  scenarios: Scenario[];
  model: ModelArtifact;
}) {
  const searchParams = useSearchParams();
  const [{ presetId, inputs }, setState] = useState(() => initialState(new URLSearchParams(searchParams.toString()), scenarios));
  const [weights, setWeights] = useState<RankingWeights>(DEFAULT_RANKING_WEIGHTS);

  // Keep the URL shareable without triggering navigations on every slider tick.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const p = new URLSearchParams();
      if (presetId !== "custom") p.set("preset", presetId);
      p.set("o2", inputs.o2Percent.toString());
      p.set("p", inputs.pressurePsi.toString());
      p.set("m", inputs.materialClass);
      p.set("a", inputs.airflow);
      p.set("g", inputs.gravity);
      window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
    }, 300);
    return () => window.clearTimeout(id);
  }, [presetId, inputs]);

  const data = useMemo(() => ({ investigations, tests, model }), [investigations, tests, model]);
  const assessment = useMemo(() => assessHabitat(inputs, data, weights), [inputs, data, weights]);

  const phaseOf = useMemo(() => phaseLookup(investigations), [investigations]);
  const chartRuns = useMemo(
    () => ignitionStudyTests(investigations, tests).filter((t) => phaseOf(t) === assessment.fuelPhase),
    [investigations, tests, phaseOf, assessment.fuelPhase]
  );

  // Shade the generated gap only for synthetic solid-fuel data, and only if it really is empty.
  const showSyntheticGap = useMemo(
    () =>
      assessment.fuelPhase === "solid" &&
      investigations.every((i) => i.dataSource === "synthetic") &&
      !chartRuns.some(
        (t) =>
          t.o2Percent >= SYNTHETIC_SOLID_GAP.o2Min &&
          t.o2Percent <= SYNTHETIC_SOLID_GAP.o2Max &&
          t.pressurePsi < SYNTHETIC_SOLID_GAP.pressureMaxPsi
      ),
    [assessment.fuelPhase, investigations, chartRuns]
  );

  const onPreset = (id: string) => {
    const s = scenarios.find((x) => x.id === id);
    if (!s) {
      setState((prev) => ({ ...prev, presetId: "custom" }));
      return;
    }
    setState((prev) => ({
      presetId: id,
      inputs: inputsFromScenario(s, s.typicalMaterials.includes(prev.inputs.materialClass) ? prev.inputs.materialClass : undefined),
    }));
  };

  const onChange = (next: HabitatInputs) =>
    setState({ presetId: matchingScenario(scenarios, next)?.id ?? "custom", inputs: next });

  const phaseLabel = FUEL_PHASE_LABEL[assessment.fuelPhase].toLowerCase();

  return (
    <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)]">
      <HabitatControls inputs={inputs} scenarios={scenarios} presetId={presetId} onPreset={onPreset} onChange={onChange} />

      <div className="min-w-0 space-y-6">
        <PartialGravityCallout gravity={inputs.gravity} />

        <HabitatReadouts a={assessment} />

        <Section
          title="Where this atmosphere sits among tested conditions"
          description={`${MATERIAL_LABEL[inputs.materialClass]} maps to ${phaseLabel} fuels. Each point is one test run; the large marker is your cabin.`}
        >
          <FlammabilityMap
            runs={chartRuns}
            fuelPhase={assessment.fuelPhase}
            scenarios={scenarios}
            point={{ o2Percent: inputs.o2Percent, pressurePsi: inputs.pressurePsi }}
            showSyntheticGap={showSyntheticGap}
          />
        </Section>

        <Section title="SI interpretation" description="Structured risk drivers, evidence, gaps, recommended tests and design implications.">
          <InterpretationPanel assessment={assessment} />
        </Section>

        <div className="grid gap-6 2xl:grid-cols-2">
          <Section title="Sensitivity to oxygen" description="Predicted ignition probability as O2 sweeps at your pressure.">
            <SensitivityChart model={model} inputs={inputs} currentProbability={assessment.ignitionProbability} />
          </Section>
          <Section title="Most relevant investigations" description="Transparent score: adjust the weights to see the ranking change.">
            <RankingPanel ranked={assessment.ranked} weights={weights} onWeights={setWeights} limit={6} />
          </Section>
        </div>
      </div>
    </div>
  );
}
