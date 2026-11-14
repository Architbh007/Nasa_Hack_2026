import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReadinessChart } from "@/components/scenarios/readiness-chart";
import { ScenarioCard } from "@/components/scenarios/scenario-card";
import type { ScenarioCardData } from "@/components/scenarios/types";
import { OUTCOME_LABEL } from "@/lib/constants";
import { getDataset } from "@/lib/data";
import { scenarioReadiness } from "@/lib/readiness";

export const metadata: Metadata = { title: "Mission Readiness" };

export default function ScenariosPage() {
  const { scenarios, investigations, runs, investigationById } = getDataset();
  const acronym = (id: string) => investigationById.get(id)?.acronym ?? id;
  const cards: ScenarioCardData[] = scenarios.map((s) => {
    const r = scenarioReadiness(s, { investigations, runs });
    return {
      id: s.id,
      label: s.label,
      description: s.description,
      o2Percent: s.o2Percent,
      pressurePsi: s.pressurePsi,
      gravity: s.gravity,
      airflow: s.typicalAirflow,
      pO2Psi: r.assessment.pO2.psi,
      source: s.source,
      verdicts: r.verdicts.map((v) => ({
        category: v.category,
        verdict: v.verdict,
        reason: v.reason,
        nearest: v.nearest.slice(0, 3).map((n) => ({
          runId: n.run.id,
          investigationId: n.run.investigationId,
          acronym: acronym(n.run.investigationId),
          o2Percent: n.o2Percent,
          pressurePsi: n.pressurePsi,
          outcome: OUTCOME_LABEL[n.run.outcome],
        })),
      })),
      pillars: r.pillars.map((p) => ({
        pillar: p.pillar,
        withRuns: p.withRuns,
        investigations: p.investigations.map((b) => ({
          id: b.investigation.id,
          acronym: b.investigation.acronym,
          hasRuns: b.investigation.dataLevel === "runs",
        })),
      })),
      bands: r.bands.map(({ band, solid, liquid, gas }) => ({ band, solid, liquid, gas })),
      best: r.best.map((b) => ({ id: b.investigation.id, acronym: b.investigation.acronym, name: b.investigation.name, score: Math.round(b.score * 100) })),
      gaps: r.gaps,
    };
  });

  return (
    <>
      <PageHeader
        eyebrow="Scenarios"
        title="Mission Readiness"
        description="For each habitat atmosphere: which fuel categories real NASA tests cover, the nearest real runs, and what was never tested. Each preset cites where its atmosphere comes from."
      />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Real runs near each atmosphere</CardTitle>
            <CardDescription>Count of real runs by distance from the preset, per fuel category. No bar means no real run that close.</CardDescription>
          </CardHeader>
          <CardContent>
            <ReadinessChart data={cards} />
          </CardContent>
        </Card>
        <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
          {cards.map((c) => (
            <ScenarioCard key={c.id} d={c} />
          ))}
        </div>
      </div>
    </>
  );
}
