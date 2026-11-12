import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IgnitionGauge, STATUS_COLOR } from "@/components/habitat/readouts";
import { ScenarioSiParagraph } from "@/components/scenarios/scenario-si";
import type { ScenarioCardData } from "@/components/scenarios/types";
import { AIRFLOW_LABEL, GRAVITY_LABEL, PILLAR_LABEL } from "@/lib/constants";
import { SERIES_COLORS } from "@/lib/chart-colors";
import type { SafetyPillar } from "@/lib/schema";

const PILLAR_COLOR: Record<SafetyPillar, string> = {
  prevention: SERIES_COLORS[0],
  detection: SERIES_COLORS[1],
  suppression: SERIES_COLORS[2],
};

export function ScenarioCard({ d }: { d: ScenarioCardData }) {
  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-base">{d.label}</CardTitle>
          <CardDescription>
            {d.o2Percent}% O2 at {d.pressurePsi} psi · pO2 {d.pO2Psi.toFixed(2)} psi
          </CardDescription>
          <p className="text-xs text-muted-foreground">
            {GRAVITY_LABEL[d.gravity]} · {AIRFLOW_LABEL[d.airflow]}
          </p>
        </div>
        <div className="text-right">
          <p className="tabular text-2xl font-semibold">{d.overall}</p>
          <p className="text-[11px] text-muted-foreground">readiness /100</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <IgnitionGauge probability={d.ignitionProbability} band={d.riskBand} />
          {d.gap ? (
            <Badge variant="outline" className="gap-1 border-[#ec835a]/50" style={{ color: STATUS_COLOR.high }}>
              <AlertTriangle aria-hidden /> Untested for fabrics
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 border-[#0ca30c]/50" style={{ color: STATUS_COLOR.low }}>
              <CheckCircle2 aria-hidden /> Covered for fabrics
            </Badge>
          )}
        </div>

        <ul className="space-y-2" aria-label="Coverage by safety pillar">
          {d.pillars.map((p) => (
            <li key={p.pillar} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm" style={{ backgroundColor: PILLAR_COLOR[p.pillar] }} aria-hidden />
                {PILLAR_LABEL[p.pillar]}
              </span>
              <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full" style={{ width: `${p.score}%`, backgroundColor: PILLAR_COLOR[p.pillar] }} />
              </span>
              <span className="tabular text-right">{p.score}</span>
            </li>
          ))}
        </ul>

        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Best supporting investigations</p>
          <div className="flex flex-wrap gap-1.5">
            {d.best.map((b) => (
              <Link
                key={b.id}
                href={`/explore?id=${b.id}`}
                title={b.name}
                className="rounded-md border border-border px-2 py-1 text-xs hover:border-link hover:text-link"
              >
                {b.acronym} <span className="tabular text-muted-foreground">{b.score}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Biggest gaps</p>
          {d.gaps.length === 0 ? (
            <p className="text-xs text-muted-foreground">No major gaps flagged at this atmosphere.</p>
          ) : (
            <ul className="space-y-1">
              {d.gaps.slice(0, 3).map((g) => (
                <li key={g} className="flex gap-2 text-xs leading-relaxed">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" style={{ color: STATUS_COLOR.moderate }} aria-hidden />
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
