"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HabitatControls } from "@/components/habitat/controls";
import { FlammabilityGrid } from "@/components/habitat/flammability-grid";
import { FireTwin } from "@/components/habitat/fire-twin";
import { CabinAsk } from "@/components/habitat/cabin-ask";
import { HabitatReadouts } from "@/components/habitat/readouts";
import { HabitatHero } from "@/components/habitat/habitat-hero";
import { PageGuide, type GuideItem } from "@/components/shell/page-guide";
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
  type MaterialClass,
  type Run,
  type Scenario,
} from "@/lib/schema";
import { cn } from "@/lib/utils";

const DEFAULT_PRESET = "iss-cabin";

const GUIDE: readonly GuideItem[] = [
  {
    title: "Cabin condition",
    anchor: "cabin",
    does: "Set oxygen, pressure, material, airflow and gravity, or pick a preset. Every section below updates to match.",
  },
  {
    title: "Readouts and verdicts",
    anchor: "verdicts",
    does: "O2 partial pressure, the change from Earth air, and whether solid, liquid and gas fuels have real test data at this air.",
  },
  {
    title: "Coverage map",
    anchor: "coverage",
    does: "Every cabin air from 15–51% O2 and 3–15 psi, coloured by what real runs recorded. Stripes mean untested. Click a square to move your cabin there.",
  },
  {
    title: "Nearest experiments and gaps",
    anchor: "nearest",
    does: "The five real runs closest to your air, with their results and sources, and what no run in the data has reached.",
  },
  {
    title: "SI explanation",
    anchor: "explanation",
    does: "A plain-words reading of this cabin with NASA sources and recommended tests. You can also ask your own question about it.",
  },
  {
    title: "Fire Twin",
    anchor: "fire-twin",
    does: "A simulated fire in a cabin module. Whether each item catches comes from real runs; spread and response times are illustrative.",
  },
  {
    title: "Most relevant investigations",
    anchor: "ranking",
    does: "Which NASA experiments matter most for this air, with every score shown and weights you can change.",
  },
];

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
  dark = false,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  /** Keep this panel dark: its drawing was designed on a dark surface. */
  dark?: boolean;
}) {
  return (
    <Card id={id} className={cn(dark && "dark")}>
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
      window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}${window.location.hash}`);
    }, 300);
    return () => window.clearTimeout(id);
  }, [presetId, inputs]);

  // This view renders on the client, after the browser's own hash scroll, so honour #fire-twin etc. here.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) document.getElementById(hash)?.scrollIntoView({ block: "start" });
  }, []);

  const data = useMemo(() => ({ investigations, runs }), [investigations, runs]);
  const assessment = useMemo(() => assessHabitat(inputs, data, weights), [inputs, data, weights]);
  const acronyms = useMemo(() => new Map(investigations.map((i) => [i.id, i.acronym])), [investigations]);
  const acronym = (id: string) => acronyms.get(id) ?? id;

  const verdict = assessment.verdicts[assessment.category];

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
  const snap = (v: number, step: number) => Math.round(v / step) * step;
  const onMove = (o2Percent: number, pressurePsi: number) =>
    onChange({ ...inputs, o2Percent: snap(o2Percent, O2_SLIDER.step), pressurePsi: Math.round(snap(pressurePsi, PRESSURE_SLIDER.step) * 10) / 10 });
  const onMaterial = (materialClass: MaterialClass) => onChange({ ...inputs, materialClass });

  return (
    <>
      <HabitatHero assessment={assessment} scenarios={scenarios} presetId={presetId} onPreset={onPreset} />
      <PageGuide question="Is this cabin air covered by real NASA fire tests?" items={GUIDE} />
      <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <HabitatControls inputs={inputs} scenarios={scenarios} presetId={presetId} onPreset={onPreset} onChange={onChange} />

        <div className="min-w-0 space-y-6">
          <PartialGravityCallout gravity={inputs.gravity} />

          <div id="verdicts">
            <HabitatReadouts a={assessment} />
          </div>

          <Section
            dark
            id="coverage"
            title="Is this air covered by real tests?"
            description={`Each square is one possible cabin air. Colour shows what the real ${MATERIAL_LABEL[inputs.materialClass].toLowerCase()} runs inside it recorded; stripes mean nobody has tested it there. No prediction is made.`}
          >
            <FlammabilityGrid
              inputs={inputs}
              investigations={investigations}
              runs={runs}
              scenarios={scenarios}
              onMove={onMove}
              onMaterial={onMaterial}
            />
          </Section>

          <div id="nearest" className="grid gap-6 2xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
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

          <Section id="explanation" title="SI explanation and sources" description="Plain-words reading of this cabin, with links to the original NASA pages behind it.">
            <div className="space-y-6">
              <InterpretationPanel assessment={assessment} weights={weights} investigations={investigations} />
              <div className="space-y-2 border-t border-border pt-5">
                <h3 className="text-sm font-medium">Ask about this cabin</h3>
                <CabinAsk inputs={inputs} />
              </div>
            </div>
          </Section>

          <Section
            dark
            id="fire-twin"
            title="Fire Twin: what would a fire look like?"
            description="A top-down cabin module running this exact air. Whether an item burns comes from what the nearest real runs of that material recorded; spread speed, detection and crew response times are illustrative."
          >
            <FireTwin inputs={inputs} scenarios={scenarios} presetId={presetId} onPreset={onPreset} runs={runs} />
          </Section>

          <Section id="ranking" title="Most relevant investigations" description="Transparent score: adjust the weights to see the ranking change.">
            <RankingPanel ranked={assessment.ranked} weights={weights} onWeights={setWeights} limit={6} />
          </Section>
        </div>
      </div>
    </>
  );
}
