import type { Metadata } from "next";
import type { ReactNode } from "react";
import { FlaskConical, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aiConfig } from "@/lib/ai/client";
import { FUEL_PHASE_LABEL, SYNTHETIC_SOLID_GAP } from "@/lib/constants";
import { getDataset } from "@/lib/data";
import { ILLUSTRATIVE } from "@/lib/fire-twin";
import { GRID_O2, GRID_PRESSURE, LEVEL_THRESHOLDS } from "@/lib/flammability-grid";
import { coefficientTable } from "@/lib/model";
import { DEFAULT_RANKING_WEIGHTS, RANKING_COMPONENTS, RANKING_LABEL } from "@/lib/ranking";
import { FUEL_PHASES } from "@/lib/schema";

export const metadata: Metadata = { title: "About and Methods" };

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-16">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">{children}</CardContent>
    </Card>
  );
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-muted-foreground">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
export default function AboutPage() {
  const { investigations, tests, scenarios, model } = getDataset();
  const coef = coefficientTable(model);
  const { modelMain, modelFast } = aiConfig();
  const synthetic = investigations.every((i) => i.dataSource === "synthetic");

  return (
    <>
      <PageHeader
        title="About and Methods"
        description="How FireSight's data, model, ranking and SI layer work, so every number on screen can be traced and challenged."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Section id="data-policy" title="Data policy">
            <Alert className="border-warning/40 bg-warning/10">
              <FlaskConical className="text-warning" aria-hidden />
              <AlertTitle>{synthetic ? "This build runs on synthetic demo data" : "This build includes PSI data"}</AlertTitle>
              <AlertDescription>
                Investigation names, hardware and project groupings follow real NASA PSI combustion investigations. Every
                numeric value, test run, finding and measurement is generated. Do not cite these numbers as NASA results.
              </AlertDescription>
            </Alert>
            <Bullets
              items={[
                <>Every record carries <code className="rounded bg-muted px-1">dataSource: &quot;synthetic&quot;</code>; the banner on every page states the same.</>,
                <>
                  {investigations.length} investigations, {tests.length} test runs and {scenarios.length} habitat presets, regenerated
                  reproducibly with <code className="rounded bg-muted px-1">npm run generate</code> from <code className="rounded bg-muted px-1">DATA_SEED</code>.
                </>,
                <>
                  By fuel phase:{" "}
                  {FUEL_PHASES.map((p) => `${FUEL_PHASE_LABEL[p]} ${investigations.filter((i) => i.fuelPhase === p).length}`).join(", ")}.
                </>,
                <>
                  The schema (<code className="rounded bg-muted px-1">lib/schema.ts</code>) is the contract: real PSI exports that satisfy it
                  replace the JSON files with no app code changes, and the model retrains on the next build.
                </>,
              ]}
            />
          </Section>

          <Section title="How the synthetic data was generated">
            <Bullets
              items={[
                "Ignition probability is a logistic function of O2 partial pressure with fuel-phase midpoints (solids need more oxygen than liquids, liquids more than gases), an O2 concentration term, diluent penalties and noise.",
                "Flame spread rises roughly linearly with O2 above a threshold and scales mildly with pressure (exponent 0.35).",
                "In microgravity, flow under about 5 cm/s raises self-extinguishment of solids (oxygen starvation), moderate flow increases spread and flow above about 30 cm/s causes blowoff.",
                "Carbon dioxide suppresses more strongly than helium, and helium more than nitrogen, at equal diluent percent.",
                "Droplet extinction diameters shrink as O2 rises; cool flames appear at lower O2 in the cool-flame investigations.",
                "Smoke obscuration exists only for SAME, SAME-R and solid runs with a smoke obscuration photometer; DAFT and DAFT-2 reuse the SAME particle counter by name.",
                "Investigation O2, pressure and flow ranges are computed from their own test runs, and key findings are templates filled with statistics from those runs.",
                `A deliberate gap: no solid-fuel runs between ${SYNTHETIC_SOLID_GAP.o2Min} and ${SYNTHETIC_SOLID_GAP.o2Max}% O2 below ${SYNTHETIC_SOLID_GAP.pressureMaxPsi} psi, so the lunar base and rover presets expose an untested region.`,
              ]}
            />
          </Section>

          <Section title="Ranking method">
            <p>
              Each investigation gets four components in [0, 1] for the chosen condition. The score is their weighted mean, and the
              Habitat page shows every component so the order can be challenged and the weights changed.
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 font-normal">Component</th>
                  <th className="py-1 font-normal">Default weight</th>
                  <th className="py-1 font-normal">Definition</th>
                </tr>
              </thead>
              <tbody>
                {RANKING_COMPONENTS.map((k) => (
                  <tr key={k} className="border-t border-border/60 align-top">
                    <td className="py-1.5 pr-2">{RANKING_LABEL[k]}</td>
                    <td className="tabular py-1.5">{DEFAULT_RANKING_WEIGHTS[k].toFixed(2)}</td>
                    <td className="py-1.5 text-muted-foreground">
                      {k === "rangeOverlap" && "1 inside the tested O2/pressure box, exp(−d/0.15) outside, with d the distance normalized by the dataset span"}
                      {k === "fuelPhaseMatch" && "1 same phase with a matching material, 0.75 same phase, 0.1 other phase"}
                      {k === "flowRegimeMatch" && "1 when the tested airflow range includes the cabin's, decaying with the gap"}
                      {k === "safetyPillar" && "Share of prevention, detection and suppression the record addresses"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Ignition model">
            <p>
              A logistic regression implemented by hand and fit with batch gradient descent ({model.hyperparameters.iterations} iterations,
              learning rate {model.hyperparameters.learningRate}, L2 {model.hyperparameters.l2}) when the app is built. Continuous features
              are standardized; the three fuel-phase indicators act as phase-specific baselines (no separate intercept), and a plastic
              indicator separates plastic from fabric among solids. Foam and wire insulation never appear in an ignition study (only in
              smoke studies), so the app reports them as never ignition-tested instead of guessing. It is trained on synthetic data and is
              a relative indicator, not a certified flammability limit.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["Training accuracy", pct(model.metrics.trainAccuracy)],
                ["Holdout accuracy", pct(model.metrics.holdoutAccuracy)],
                ["Majority baseline", pct(model.metrics.holdoutBaselineAccuracy)],
                ["Holdout log loss", model.metrics.holdoutLogLoss.toFixed(3)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-border bg-background/40 p-2.5">
                  <p className="text-[11px] text-muted-foreground">{k}</p>
                  <p className="tabular text-lg font-semibold">{v}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {model.metrics.nTrain} training runs and {model.metrics.nHoldout} holdout runs (deterministic 20% split by test id) from{" "}
              {model.trainedOn.investigationIds.length} ignition studies. Excluded because they were smoke or dust tests, not ignition
              attempts: {model.trainedOn.excludedInvestigationIds.join(", ")}.
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 font-normal">Feature</th>
                  <th className="py-1 text-right font-normal">Std. weight</th>
                  <th className="py-1 text-right font-normal">Per unit</th>
                  <th className="py-1 text-right font-normal">Odds ratio / unit</th>
                </tr>
              </thead>
              <tbody>
                {coef.map((c) => (
                  <tr key={c.key} className="border-t border-border/60">
                    <td className="py-1.5">
                      {c.label} <span className="text-muted-foreground">({c.unit})</span>
                    </td>
                    <td className="tabular py-1.5 text-right">{c.standardizedWeight.toFixed(2)}</td>
                    <td className="tabular py-1.5 text-right">{c.perUnitWeight.toFixed(3)}</td>
                    <td className="tabular py-1.5 text-right">{c.oddsRatioPerUnit.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground">
              Flame spread estimates use the 10 nearest runs with a measured spread rate (distance over O2, pressure and flow, plus
              penalties for a different material class or gravity level), weighted by inverse distance.
            </p>
          </Section>

          <Section id="grid" title="Flammability grid">
            <Bullets
              items={[
                `A ${(GRID_O2.max - GRID_O2.min) / GRID_O2.step} × ${(GRID_PRESSURE.max - GRID_PRESSURE.min) / GRID_PRESSURE.step} square: O2 ${GRID_O2.min}–${GRID_O2.max}% in ${GRID_O2.step}% steps across, pressure ${GRID_PRESSURE.min}–${GRID_PRESSURE.max} psi in ${GRID_PRESSURE.step} psi steps up. Cabins above ${GRID_O2.max}% O2 (the spacesuit) are reported as off-chart.`,
                `Each square is coloured by the ignition model at its centre: blue below ${Math.round(LEVEL_THRESHOLDS.possible * 100)}%, amber in between, red from ${Math.round(LEVEL_THRESHOLDS.likely * 100)}%. The palette stays readable with colour-vision deficiency.`,
                "A square is solid when at least one ignition-study run of the same material lies inside it, and striped (a model extrapolation) when none does. Hovering lists the five nearest evidence runs.",
              ]}
            />
          </Section>

          <Section id="fire-twin" title="Fire Twin">
            <Bullets
              items={[
                "From the data: whether each item ignites (ignition model; 50% or more counts as igniting) and how fast its flame spreads (the nearest-run flame-spread estimate above).",
                `Illustrative, not in the dataset: smoke travel at the airflow speed (${ILLUSTRATIVE.stillAirSmokeCmS} cm/s in still air) plus a ${ILLUSTRATIVE.detectorDelayS} s detector delay, an alarm ${ILLUSTRATIVE.alarmAfterDetectS} s later, vent shutdown ${ILLUSTRATIVE.ventShutdownAfterAlarmS} s and a CO2 extinguisher ${ILLUSTRATIVE.extinguisherAfterAlarmS} s after the alarm, a ${Math.round(ILLUSTRATIVE.downstreamBoost * 100)}% spread boost toward downstream items, and microgravity flames going out ${ILLUSTRATIVE.selfExtinguishAfterFlowStopsS} s after forced flow stops.`,
                "Items never ignition-tested (foam, wire insulation) are never set alight; the fire reaching them is shown as an open question.",
                "The timeline marks data-backed events with filled dots and illustrative timings with hollow dots.",
              ]}
            />
          </Section>

          <Section title="SI layer">
            <Bullets
              items={[
                <>Main model <code className="rounded bg-muted px-1">{modelMain}</code> writes summaries, comparisons, habitat interpretations and cabin Q&amp;A; the fast model <code className="rounded bg-muted px-1">{modelFast}</code> narrates Fire Twin and the Then vs Now lessons.</>,
                "All calls run in server-side route handlers; the API key never reaches the browser.",
                "Prompts require answers grounded only in the provided records, citations by investigation id, plain statements when data is missing, no invented numbers, and a reminder that the data is synthetic.",
                "Structured calls return JSON that is validated with zod and retried once with the error; habitat evidence may only cite ids from the ranked list sent, and Fire Twin and Then vs Now text may only cite the ids they were given.",
                "Source links point to real NASA pages (NASA Science, nasa.gov and NASA Technical Reports Server), checked by hand. Only the links are real; the numbers stay synthetic.",
                "Outputs are cached in data/cache by a hash of model, prompt version and grounded input. USE_CACHE_ONLY=true serves cached results only, for a safe offline demo.",
              ]}
            />
          </Section>

          <Alert className="border-[#ec835a]/40 bg-[#ec835a]/10">
            <ShieldAlert className="text-[#ec835a]" aria-hidden />
            <AlertTitle>Supports engineering judgment; does not replace standards</AlertTitle>
            <AlertDescription>
              FireSight helps engineers and students see what has and has not been tested. It does not replace NASA flammability
              standards such as NASA-STD-6001, certified material testing, or the judgment of fire safety engineers.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </>
  );
}
