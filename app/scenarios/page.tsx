import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReadinessChart } from "@/components/scenarios/readiness-chart";
import { ScenarioCard } from "@/components/scenarios/scenario-card";
import type { ScenarioCardData } from "@/components/scenarios/types";
import { getDataset } from "@/lib/data";
import { scenarioReadiness } from "@/lib/readiness";

export const metadata: Metadata = { title: "Mission Readiness Scorecard" };

export default function ScenariosPage() {
  const { scenarios, investigations, tests, model } = getDataset();
  const cards: ScenarioCardData[] = scenarios.map((s) => {
    const r = scenarioReadiness(s, { investigations, tests, model });
    return {
      id: s.id,
      label: s.label,
      description: s.description,
      o2Percent: s.o2Percent,
      pressurePsi: s.pressurePsi,
      gravity: s.gravity,
      airflow: s.typicalAirflow,
      pO2Psi: r.assessment.pO2.psi,
      ignitionProbability: r.assessment.ignitionProbability,
      riskBand: r.assessment.riskBand,
      gap: r.assessment.coverage.gap,
      overall: r.overall,
      nearbyTests: r.assessment.nearbyTestCount,
      pillars: r.pillars.map((p) => ({
        pillar: p.pillar,
        score: p.score,
        best: p.best.map((b) => ({ id: b.investigation.id, acronym: b.investigation.acronym })),
      })),
      best: r.best.map((b) => ({
        id: b.investigation.id,
        acronym: b.investigation.acronym,
        name: b.investigation.name,
        score: Math.round(b.score * 100),
      })),
      gaps: r.gaps,
    };
  });

  return (
    <>
      <PageHeader
        eyebrow="Scenarios"
        title="Mission Readiness Scorecard"
        description="For each habitat atmosphere preset: how well the evidence base covers prevention, detection and suppression for cabin fabrics, the model's predicted ignition probability, and the biggest gaps."
      />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coverage by scenario</CardTitle>
            <CardDescription>Higher bars mean closer, better-matched evidence for that safety pillar.</CardDescription>
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
