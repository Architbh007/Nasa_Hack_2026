import Link from "next/link";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamTag } from "@/components/common/badges";
import { VERDICT_COLOR } from "@/components/habitat/readouts";
import { ScenarioSiParagraph } from "@/components/scenarios/scenario-si";
import type { ScenarioCardData } from "@/components/scenarios/types";
import { AIRFLOW_LABEL, CATEGORY_LABEL, GRAVITY_LABEL, PILLAR_LABEL } from "@/lib/constants";
import { num } from "@/lib/format";
import { VERDICT_LABEL } from "@/lib/habitat";

function Heading({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{children}</p>;
}

export function ScenarioCard({ d }: { d: ScenarioCardData }) {
  return (
    <Card className="gap-4">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">{d.label}</CardTitle>
        <CardDescription>
          {d.o2Percent}% O2 at {d.pressurePsi} psi · pO2 {d.pO2Psi.toFixed(2)} psi
        </CardDescription>
        <p className="text-xs text-muted-foreground">
          {GRAVITY_LABEL[d.gravity]} · {AIRFLOW_LABEL[d.airflow]}
        </p>
        <p className="text-[11px] leading-snug text-muted-foreground">
          {d.source ? (
            <>
              Atmosphere:{" "}
              <a href={d.source.url} target="_blank" rel="noreferrer" className="text-link hover:underline">
                {d.source.label}
              </a>{" "}
              ({d.source.detail})
            </>
          ) : (
            <span className="text-warning">Atmosphere values: citation needed</span>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Heading>Coverage by real tests</Heading>
          <ul className="space-y-2">
            {d.verdicts.map((v) => (
              <li key={v.category} className="space-y-0.5 text-xs">
                <p className="flex items-center justify-between gap-2">
                  <span>{CATEGORY_LABEL[v.category]}</span>
                  <span className="font-semibold" style={{ color: VERDICT_COLOR[v.verdict] }}>
                    {VERDICT_LABEL[v.verdict]}
                  </span>
                </p>
                <p className="leading-snug text-muted-foreground">{v.reason}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-1.5">
          <Heading>Nearest real solid-material runs</Heading>
          {(d.verdicts.find((v) => v.category === "solid")?.nearest ?? []).map((n) => (
            <Link
              key={n.runId}
              href={`/explore?id=${n.investigationId}`}
              className="flex justify-between gap-2 rounded-md border border-border px-2 py-1 text-xs hover:border-link"
            >
              <span>
                {n.acronym} <span className="font-mono text-[10px] text-muted-foreground">{n.runId}</span>
              </span>
              <span className="tabular text-muted-foreground">
                {num(n.o2Percent)}% · {num(n.pressurePsi)} psi · {n.outcome}
              </span>
            </Link>
          ))}
        </div>

        <div className="space-y-1.5">
          <Heading>
            Pillar evidence <TeamTag className="ml-1 normal-case" />
          </Heading>
          <ul className="space-y-1 text-xs">
            {d.pillars.map((p) => (
              <li key={p.pillar} className="flex flex-wrap gap-x-1.5">
                <span className="w-24 shrink-0 text-muted-foreground">{PILLAR_LABEL[p.pillar]}</span>
                {p.investigations.length === 0
                  ? "None"
                  : p.investigations.map((i) => (
                      <Link key={i.id} href={`/explore?id=${i.id}`} className={i.hasRuns ? "text-link hover:underline" : "text-muted-foreground hover:underline"}>
                        {i.acronym}
                      </Link>
                    ))}
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-muted-foreground">Blue: has run-level data. Grey: description or summary only.</p>
        </div>

        <div className="space-y-1.5">
          <Heading>What is missing</Heading>
          {d.gaps.length === 0 ? (
            <p className="text-xs text-muted-foreground">No gaps flagged at this atmosphere.</p>
          ) : (
            <ul className="space-y-1">
              {d.gaps.slice(0, 5).map((g) => (
                <li key={g} className="flex gap-2 text-xs leading-relaxed">
                  <TriangleAlert className="mt-0.5 size-3 shrink-0 text-warning" aria-hidden />
                  {g}
                </li>
              ))}
            </ul>
          )}
        </div>

        <ScenarioSiParagraph scenarioId={d.id} />

        <Link href={`/habitat?preset=${d.id}`} className="inline-flex items-center gap-1 text-xs text-link hover:underline">
          Open in Habitat Explorer <ArrowRight className="size-3" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  );
}
