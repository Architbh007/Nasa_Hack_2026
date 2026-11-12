"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { BellRing, FlaskConical, ShieldCheck, Sparkles, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiError, SiMeta, SiSkeleton } from "@/components/si/si-states";
import { SiMarkdown } from "@/components/si/si-markdown";
import { useInvestigationIds } from "@/components/si/investigation-ids";
import type { HabitatInterpretation } from "@/lib/ai/schemas";
import type { HabitatAssessment } from "@/lib/habitat";
import type { RankingWeights } from "@/lib/ranking";
import { useSiMutation } from "@/lib/si-client";

function Block({ title, children, icon }: { title: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <section className="space-y-2 rounded-lg border border-border bg-background/40 p-3.5">
      <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {icon}
        {title}
      </h4>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: readonly string[] }) {
  if (items.length === 0) return <p className="text-xs text-muted-foreground">None noted.</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((t) => (
        <li key={t} className="flex gap-2">
          <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />
          <SiMarkdown text={t} />
        </li>
      ))}
    </ul>
  );
}

function InterpretationView({ data }: { data: HabitatInterpretation }) {
  const { acronym } = useInvestigationIds();
  return (
    <div className="space-y-4">
      <SiMarkdown text={data.summary} className="text-[15px]" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Block title="Risk drivers">
          <Bullets items={data.riskDrivers} />
        </Block>
        <Block title="Knowledge gaps">
          <Bullets items={data.knowledgeGaps} />
        </Block>
      </div>
      <Block title="Relevant evidence">
        <ul className="space-y-2.5">
          {data.relevantEvidence.map((e) => (
            <li key={`${e.investigationId}-${e.evidence}`} className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:gap-3">
              <Link
                href={`/explore?id=${e.investigationId}`}
                className="h-fit w-fit rounded bg-link/10 px-1.5 py-0.5 text-sm font-medium text-link hover:bg-link/20"
              >
                {acronym(e.investigationId)}
              </Link>
              <div className="space-y-0.5">
                <SiMarkdown text={e.evidence} />
                <SiMarkdown text={e.relevance} className="text-xs text-muted-foreground" />
              </div>
            </li>
          ))}
        </ul>
      </Block>
      <Block title="Recommended tests" icon={<FlaskConical className="size-3.5" aria-hidden />}>
        <ol className="space-y-2">
          {data.recommendedTests.map((t, i) => (
            <li key={t.test} className="flex gap-2.5">
              <span className="tabular mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px]">{i + 1}</span>
              <div>
                <SiMarkdown text={t.test} className="font-medium" />
                <SiMarkdown text={t.rationale} className="text-xs text-muted-foreground" />
              </div>
            </li>
          ))}
        </ol>
      </Block>
      <div className="grid gap-4 md:grid-cols-3">
        <Block title="Prevention" icon={<ShieldCheck className="size-3.5" aria-hidden />}>
          <Bullets items={data.designImplications.prevention} />
        </Block>
        <Block title="Detection" icon={<BellRing className="size-3.5" aria-hidden />}>
          <Bullets items={data.designImplications.detection} />
        </Block>
        <Block title="Suppression" icon={<Waves className="size-3.5" aria-hidden />}>
          <Bullets items={data.designImplications.suppression} />
        </Block>
      </div>
    </div>
  );
}

export function InterpretationPanel({ assessment, weights }: { assessment: HabitatAssessment; weights: RankingWeights }) {
  const { state: raw, run } = useSiMutation<HabitatInterpretation>("/api/habitat-interpret");
  const { o2Percent, pressurePsi, materialClass, airflow, gravity } = assessment.inputs;
  const conditionKey = JSON.stringify([o2Percent, pressurePsi, materialClass, airflow, gravity, weights]);
  const [ranFor, setRanFor] = useState<string | null>(null);
  // A changed condition makes an earlier interpretation stale, so only show results for the current one.
  const state = ranFor === conditionKey ? raw : ({ status: "idle" } as const);

  const go = () => {
    setRanFor(conditionKey);
    void run({ inputs: { o2Percent, pressurePsi, materialClass, airflow, gravity }, weights });
  };

  return (
    <div className="space-y-4" aria-live="polite">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Sends this condition ({o2Percent.toFixed(1)}% O2, {pressurePsi.toFixed(1)} psi), the metrics, the model output and the
          top-ranked records to the SI. Numbers are recomputed on the server from the dataset.
        </p>
        <Button onClick={go} disabled={state.status === "loading"} className="shrink-0">
          <Sparkles /> {state.status === "success" ? "Regenerate" : "Run SI interpretation"}
        </Button>
      </div>
      {state.status === "loading" && <SiSkeleton lines={8} />}
      {state.status === "error" && <SiError message={state.message} onRetry={go} />}
      {state.status === "success" && (
        <>
          <InterpretationView data={state.data} />
          <SiMeta cached={state.cached} model={state.model} />
        </>
      )}
    </div>
  );
}
