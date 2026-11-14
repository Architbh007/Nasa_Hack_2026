"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HabitatControls } from "@/components/habitat/controls";
import { FlammabilityGrid } from "@/components/habitat/flammability-grid";
import { FireTwin } from "@/components/habitat/fire-twin";
import { CabinAsk } from "@/components/habitat/cabin-ask";
import { HabitatReadouts } from "@/components/habitat/readouts";
import { RankingPanel } from "@/components/habitat/ranking-panel";
import { PartialGravityCallout } from "@/components/habitat/partial-gravity-callout";
import { InterpretationPanel } from "@/components/habitat/interpretation-panel";
import { MATERIAL_LABEL, O2_SLIDER, PRESSURE_SLIDER } from "@/lib/constants";
import { assessHabitat, inputsFromScenario, matchingScenario, type HabitatInputs } from "@/lib/habitat";
import type { ModelArtifact } from "@/lib/model";
import { DEFAULT_RANKING_WEIGHTS, type RankingWeights } from "@/lib/ranking";
import {
  AirflowSchema,
  HabitatGravitySchema,
  MaterialClassSchema,
  type Investigation,
  type MaterialClass,
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

function Section({
  id,
  title,
  description,
  children,
  action,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-20">
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
      window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}${window.location.hash}`);
    }, 300);
    return () => window.clearTimeout(id);
  }, [presetId, inputs]);

  // This view renders on the client, after the browser's own hash scroll, so honour #fire-twin etc. here.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) document.getElementById(hash)?.scrollIntoView({ block: "start" });
  }, []);

  const data = useMemo(() => ({ investigations, tests, model }), [investigations, tests, model]);
  const assessment = useMemo(() => assessHabitat(inputs, data, weights), [inputs, data, weights]);

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

  const snap = (v: number, step: number) => Math.round(v / step) * step;
  const onMove = (o2Percent: number, pressurePsi: number) =>
    onChange({ ...inputs, o2Percent: snap(o2Percent, O2_SLIDER.step), pressurePsi: Math.round(snap(pressurePsi, PRESSURE_SLIDER.step) * 10) / 10 });
  const onMaterial = (materialClass: MaterialClass) => onChange({ ...inputs, materialClass });

  return (
    <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)]">
      <HabitatControls inputs={inputs} scenarios={scenarios} presetId={presetId} onPreset={onPreset} onChange={onChange} />

      <div className="min-w-0 space-y-6">
        <PartialGravityCallout gravity={inputs.gravity} />

        <HabitatReadouts a={assessment} />

        <Section
          title="Is this air dangerous?"
          description={`Each square is one possible cabin air. Colour = predicted chance a ${MATERIAL_LABEL[inputs.materialClass].toLowerCase()} fire starts; stripes = nobody has tested it there.`}
        >
          <FlammabilityGrid
            inputs={inputs}
            model={model}
            investigations={investigations}
            tests={tests}
            scenarios={scenarios}
            onMove={onMove}
            onMaterial={onMaterial}
          />
        </Section>

        <Section title="SI explanation and sources" description="Plain-words reading of this cabin, with links to the original NASA pages behind it.">
          <div className="space-y-6">
            <InterpretationPanel assessment={assessment} weights={weights} investigations={investigations} />
            <div className="space-y-2 border-t border-border pt-5">
              <h3 className="text-sm font-medium">Ask about this cabin</h3>
              <CabinAsk inputs={inputs} />
            </div>
          </div>
        </Section>

        <Section
          id="fire-twin"
          title="Fire Twin: what would a fire look like?"
          description="A top-down cabin module running this exact air. Ignition and spread come from the data; detection and crew response times are illustrative."
        >
          <FireTwin
            inputs={inputs}
            scenarios={scenarios}
            presetId={presetId}
            onPreset={onPreset}
            model={model}
            investigations={investigations}
            tests={tests}
          />
        </Section>

        <Section title="Most relevant investigations" description="Transparent score: adjust the weights to see the ranking change.">
          <RankingPanel ranked={assessment.ranked} weights={weights} onWeights={setWeights} limit={6} />
        </Section>
      </div>
    </div>
  );
}
