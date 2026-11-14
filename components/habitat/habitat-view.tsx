"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HabitatControls } from "@/components/habitat/controls";
import { FlammabilityMap } from "@/components/habitat/flammability-map";
import { HabitatReadouts } from "@/components/habitat/readouts";
import { NearestRuns } from "@/components/habitat/nearest-runs";
import { RankingPanel } from "@/components/habitat/ranking-panel";
import { PartialGravityCallout } from "@/components/habitat/partial-gravity-callout";
import { InterpretationPanel } from "@/components/habitat/interpretation-panel";
import { CATEGORY_LABEL, MATERIAL_LABEL, O2_SLIDER, PRESSURE_SLIDER } from "@/lib/constants";
import { assessHabitat, inputsFromScenario, matchingScenario, type HabitatInputs } from "@/lib/habitat";
import { DEFAULT_RANKING_WEIGHTS, type RankingWeights } from "@/lib/ranking";
import {
  AirflowSchema,
  HabitatGravitySchema,
  MaterialClassSchema,
  type Investigation,
  type Run,
  type Scenario,
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
  runs,
  scenarios,
}: {
  investigations: Investigation[];
  runs: Run[];
  scenarios: Scenario[];
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

  const data = useMemo(() => ({ investigations, runs }), [investigations, runs]);
  const assessment = useMemo(() => assessHabitat(inputs, data, weights), [inputs, data, weights]);
  const acronyms = useMemo(() => new Map(investigations.map((i) => [i.id, i.acronym])), [investigations]);
  const acronym = (id: string) => acronyms.get(id) ?? id;

  const verdict = assessment.verdicts[assessment.category];
  const chartRuns = useMemo(() => runs.filter((r) => r.category === assessment.category), [runs, assessment.category]);
  const highlightIds = useMemo(() => verdict.nearest.map((n) => n.run.id), [verdict]);

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

  const onChange = (next: HabitatInputs) => setState({ presetId: matchingScenario(scenarios, next)?.id ?? "custom", inputs: next });

  const categoryLabel = CATEGORY_LABEL[assessment.category].toLowerCase();

  return (
    <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)]">
      <HabitatControls inputs={inputs} scenarios={scenarios} presetId={presetId} onPreset={onPreset} onChange={onChange} />

      <div className="min-w-0 space-y-6">
        <PartialGravityCallout gravity={inputs.gravity} />

        <HabitatReadouts a={assessment} />

        <Section
          title="Where this atmosphere sits among real tests"
          description={`${MATERIAL_LABEL[inputs.materialClass]} is compared with ${categoryLabel}. Each point is one real run from a NASA file or paper; the large marker is your cabin.`}
        >
          <FlammabilityMap
            runs={chartRuns}
            category={assessment.category}
            scenarios={scenarios}
            point={{ o2Percent: inputs.o2Percent, pressurePsi: inputs.pressurePsi }}
            highlightIds={highlightIds}
          />
        </Section>

        <div className="grid gap-6 2xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Section
            title="Nearest real experiments"
            description={`The ${verdict.nearest.length} closest ${categoryLabel} runs by O2 and pressure (10% O2 counts the same as 3 psi). These are neighbours to read, not a prediction.`}
          >
            <NearestRuns runs={verdict.nearest} acronym={acronym} />
          </Section>
          <Section title="Never tested in this data" description="Checked against every run we hold.">
            {assessment.neverTested.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing flagged: real runs reach this atmosphere in every fuel category.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {assessment.neverTested.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <Section title="SI interpretation" description="Grounded in the records above; cites investigation and run ids, and says which fields are missing.">
          <InterpretationPanel assessment={assessment} weights={weights} />
        </Section>

        <Section title="Most relevant investigations" description="Transparent score: adjust the weights to see the ranking change.">
          <RankingPanel ranked={assessment.ranked} weights={weights} onWeights={setWeights} limit={6} />
        </Section>
      </div>
    </div>
  );
}
