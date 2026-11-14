import type { Metadata } from "next";
import earthset from "@/public/images/earthset-over-moon.jpg";
import { PlannerView } from "@/components/planner/planner-view";
import { PageGuide } from "@/components/shell/page-guide";
import { PageHeader } from "@/components/shell/page-header";
import { getDataset } from "@/lib/data";

export const metadata: Metadata = { title: "Experiment Planner" };

export default function PlannerPage() {
  const { runs: allRuns, scenarios } = getDataset();
  // The planner needs positions, outcomes and sources, not the long notes and per-run metrics.
  const runs = allRuns.map((r) => ({ ...r, outcomeText: null, metrics: {}, flags: [], pressureNote: null }));
  return (
    <>
      <PageHeader
        title="Experiment Planner"
        description="Choose the Moon or Mars cabin air you need to be sure about and how many tests you can fly. FireSight works out where each new test should go to close the most untested ground, building out from the real NASA runs."
        image={{
          src: earthset,
          alt: "Earth setting behind the cratered lunar horizon, photographed from the Orion spacecraft during Artemis II",
          credit: "NASA · art002e021278",
          position: "center 55%",
        }}
      />
      <PageGuide
        question="Which fire tests should NASA fly next?"
        items={[
          {
            title: "Plan the campaign",
            anchor: "plan-controls",
            does: "Pick the mission atmospheres, the material, how many tests you can afford, and whether tests must stay one safe step from existing evidence.",
          },
          {
            title: "Before and after",
            anchor: "before-after",
            does: "For each mission, its coverage now and after the plan (for example Near tested → Tested after test 1), and how much of the map the plan covers.",
          },
          {
            title: "The campaign on the map",
            anchor: "plan-map",
            does: "Every real run, the mission targets and the numbered tests, with arrows from the evidence each test steps from. Switch between before and after.",
          },
          {
            title: "Proposed tests",
            anchor: "plan-tests",
            does: "Each test's oxygen, pressure and partial pressure, why it was chosen, the real runs it builds on, flown hardware at that pressure, and any flags.",
          },
          {
            title: "Experiment proposal",
            anchor: "proposal",
            does: "One click has the SI write a cited proposal from the plan. Copy as Markdown exports the whole plan with sources, with or without it.",
          },
        ]}
      />
      <PlannerView runs={runs} scenarios={scenarios} />
    </>
  );
}
