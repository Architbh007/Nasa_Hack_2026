"use client";

import type { ReactNode } from "react";
import { CheckCircle2, CircleDashed, CircleHelp, TriangleAlert } from "lucide-react";
import { AnimatedNumber } from "@/components/common/animated-number";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_LABEL } from "@/lib/constants";
import { FUEL_CATEGORIES, VERDICT_LABEL, type CategoryVerdict, type HabitatAssessment, type Verdict } from "@/lib/habitat";
import { cn } from "@/lib/utils";

export const VERDICT_COLOR: Record<Verdict, string> = {
  tested: "#3fcf8e",
  near: "#fab219",
  untested: "#ff8a5c",
  "no-runs": "#95a2b6",
};

const VERDICT_ICON: Record<Verdict, typeof CheckCircle2> = {
  tested: CheckCircle2,
  near: CircleDashed,
  untested: TriangleAlert,
  "no-runs": CircleHelp,
};

function Tile({ label, children, hint, className }: { label: ReactNode; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <Card className={cn("fs-hover-surface gap-1 py-4 hover:bg-[#161618]", className)}>
      <CardContent className="space-y-1 px-4">
        <p className="eyebrow">{label}</p>
        {children}
        {hint && <div className="text-xs leading-snug text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export function VerdictLine({ v, size = "lg" }: { v: CategoryVerdict; size?: "lg" | "sm" }) {
  const Icon = VERDICT_ICON[v.verdict];
  return (
    <p className={cn("flex items-center gap-2 font-semibold", size === "lg" ? "text-lg" : "text-sm")} style={{ color: VERDICT_COLOR[v.verdict] }}>
      <Icon className={size === "lg" ? "size-5" : "size-4"} aria-hidden /> {VERDICT_LABEL[v.verdict]}
    </p>
  );
}

export function HabitatReadouts({ a }: { a: HabitatAssessment }) {
  const increase = a.o2IncreasePct;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Tile label="O2 partial pressure" hint="Sea level is 3.09 psi (21.3 kPa)">
        <p className="tabular text-[1.75rem] font-semibold leading-tight">
          <AnimatedNumber value={a.pO2.psi} decimals={2} /> <span className="text-base font-normal text-muted-foreground">psi</span>
        </p>
        <p className="text-xs text-muted-foreground"><AnimatedNumber value={a.pO2.kPa} decimals={1} /> kPa</p>
      </Tile>

      <Tile label="O2 concentration vs Earth (21%)" hint="Relative change in oxygen fraction">
        <p className="tabular text-[1.75rem] font-semibold leading-tight">
          <AnimatedNumber value={increase} format={(v) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(0)}%`} />
        </p>
        <p className="tabular text-xs text-muted-foreground">{a.inputs.o2Percent.toFixed(1)}% O2</p>
      </Tile>

      {FUEL_CATEGORIES.map((c) => {
        const v = a.verdicts[c];
        return (
          <Tile
            key={c}
            label={
              <span className={cn(c === a.category && "font-medium text-foreground")}>
                {CATEGORY_LABEL[c]}
                {c === a.category ? " (your material)" : ""}
              </span>
            }
            hint={v.reason}
            className={cn(c === a.category && "ring-1 ring-primary/60")}
          >
            <div key={v.verdict} className="fs-swap">
              <VerdictLine v={v} />
            </div>
          </Tile>
        );
      })}
    </div>
  );
}
