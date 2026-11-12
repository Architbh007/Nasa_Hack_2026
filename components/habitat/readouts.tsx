"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, CircleAlert, Flame, OctagonAlert, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FUEL_PHASE_LABEL } from "@/lib/constants";
import { RISK_LABEL, type HabitatAssessment, type RiskBand } from "@/lib/habitat";
import { cn } from "@/lib/utils";

export const STATUS_COLOR: Record<RiskBand, string> = {
  low: "#0ca30c",
  moderate: "#fab219",
  high: "#ec835a",
  "very-high": "#d03b3b",
};

const STATUS_ICON: Record<RiskBand, typeof ShieldCheck> = {
  low: ShieldCheck,
  moderate: CircleAlert,
  high: AlertTriangle,
  "very-high": OctagonAlert,
};

function Tile({ label, children, hint, className }: { label: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <Card className={cn("gap-1 py-4", className)}>
      <CardContent className="space-y-1 px-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        {children}
        {hint && <div className="text-[11px] leading-snug text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

/** Semicircle meter; the fill carries severity, the track is a faint step of the same hue. */
export function IgnitionGauge({ probability, band }: { probability: number; band: RiskBand }) {
  const r = 52;
  const cx = 64;
  const cy = 62;
  const len = Math.PI * r;
  const color = STATUS_COLOR[band];
  const Icon = STATUS_ICON[band];
  return (
    <div className="flex items-center gap-4">
      <svg width="128" height="72" viewBox="0 0 128 72" role="img" aria-label={`Predicted ignition probability ${(probability * 100).toFixed(0)} percent`}>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeOpacity={0.18} strokeWidth={10} strokeLinecap="round" />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${Math.max(0.001, probability) * len} ${len}`}
        />
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-foreground" fontSize="22" fontWeight="600">
          {(probability * 100).toFixed(0)}%
        </text>
      </svg>
      <div className="space-y-1">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Icon className="size-4" style={{ color }} aria-hidden />
          {RISK_LABEL[band]}
        </p>
        <p className="text-[11px] leading-snug text-muted-foreground">Logistic model trained on synthetic test runs</p>
      </div>
    </div>
  );
}

export function HabitatReadouts({ a }: { a: HabitatAssessment }) {
  const phase = FUEL_PHASE_LABEL[a.fuelPhase].toLowerCase();
  const increase = a.o2IncreasePct;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Tile label="O2 partial pressure" hint="Sea level is 3.09 psi (21.3 kPa)">
        <p className="tabular text-2xl font-semibold">
          {a.pO2.psi.toFixed(2)} <span className="text-base font-normal text-muted-foreground">psi</span>
        </p>
        <p className="tabular text-xs text-muted-foreground">{a.pO2.kPa.toFixed(1)} kPa</p>
      </Tile>

      <Tile label="O2 concentration vs Earth (21%)" hint="Relative change in oxygen fraction">
        <p className="tabular text-2xl font-semibold">
          {increase >= 0 ? "+" : "−"}
          {Math.abs(increase).toFixed(0)}%
        </p>
        <p className="tabular text-xs text-muted-foreground">{a.inputs.o2Percent.toFixed(1)}% O2</p>
      </Tile>

      <Tile label="Predicted ignition probability" className="sm:col-span-2 xl:col-span-1">
        <IgnitionGauge probability={a.ignitionProbability} band={a.riskBand} />
      </Tile>

      <Tile
        label="Estimated flame spread rate"
        hint={
          a.spread.estimate === null
            ? `No ${phase}-fuel runs measured spread (droplet tests report burning rate instead).`
            : `Weighted mean of the ${a.spread.neighbors.length} nearest runs (range ${a.spread.min?.toFixed(2)}–${a.spread.max?.toFixed(2)} mm/s).`
        }
      >
        {a.spread.estimate === null ? (
          <p className="text-2xl font-semibold text-muted-foreground">n/a</p>
        ) : (
          <p className="tabular flex items-baseline gap-1.5 text-2xl font-semibold">
            <Flame className="size-4 self-center text-primary" aria-hidden />
            {a.spread.estimate.toFixed(2)} <span className="text-base font-normal text-muted-foreground">mm/s</span>
          </p>
        )}
      </Tile>

      <Tile
        label={`Covering ${phase}-fuel investigations`}
        hint={
          a.coverage.covering.length > 0 ? (
            <span className="flex flex-wrap gap-x-1.5">
              {a.coverage.covering.map((i) => (
                <Link key={i.id} href={`/explore?id=${i.id}`} className="text-link hover:underline">
                  {i.acronym}
                </Link>
              ))}
            </span>
          ) : (
            "No tested range contains this point."
          )
        }
      >
        <p className="tabular text-2xl font-semibold">{a.coverage.covering.length}</p>
        <p className="tabular text-xs text-muted-foreground">{a.nearbyTestCount} runs within ±2.5% O2, ±0.75 psi</p>
      </Tile>

      <Tile label="Coverage status">
        {a.coverage.gap ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="flex w-fit items-center gap-2 text-lg font-semibold" style={{ color: STATUS_COLOR.high }}>
                <AlertTriangle className="size-5" aria-hidden /> Untested
              </p>
            </TooltipTrigger>
            <TooltipContent>No {phase}-fuel investigation brackets this O2 and pressure.</TooltipContent>
          </Tooltip>
        ) : (
          <p className="flex items-center gap-2 text-lg font-semibold" style={{ color: STATUS_COLOR.low }}>
            <CheckCircle2 className="size-5" aria-hidden /> Covered
          </p>
        )}
        <p className="text-[11px] leading-snug text-muted-foreground">
          {a.coverage.gap
            ? `Nearest: ${a.coverage.nearest
                .slice(0, 2)
                .map((n) => n.investigation.acronym)
                .join(", ")}. Predictions here are extrapolations.`
            : `${a.coverage.covering.length} ${phase}-fuel record${a.coverage.covering.length === 1 ? "" : "s"} bracket this point.`}
        </p>
      </Tile>
    </div>
  );
}
