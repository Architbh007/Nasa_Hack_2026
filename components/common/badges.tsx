import { Badge } from "@/components/ui/badge";
import { FUEL_PHASE_COLOR } from "@/lib/chart-colors";
import { FUEL_PHASE_LABEL, PILLAR_LABEL } from "@/lib/constants";
import { SAFETY_PILLARS, type FuelPhase, type SafetyPillar } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { BellRing, ShieldCheck, Waves } from "lucide-react";

export function FuelPhaseBadge({ phase, className }: { phase: FuelPhase; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-foreground/90", className)}>
      <span
        aria-hidden
        className="size-2 rounded-full"
        style={{ backgroundColor: FUEL_PHASE_COLOR[phase] }}
      />
      {FUEL_PHASE_LABEL[phase]}
    </span>
  );
}

const PILLAR_ICON: Record<SafetyPillar, typeof ShieldCheck> = {
  prevention: ShieldCheck,
  detection: BellRing,
  suppression: Waves,
};

export function PillarBadge({ pillar }: { pillar: SafetyPillar }) {
  const Icon = PILLAR_ICON[pillar];
  return (
    <Badge variant="outline" className="gap-1 font-normal text-muted-foreground">
      <Icon aria-hidden />
      {PILLAR_LABEL[pillar]}
    </Badge>
  );
}

export function PillarBadges({ pillars: raw, compact = false }: { pillars: readonly SafetyPillar[]; compact?: boolean }) {
  const pillars = SAFETY_PILLARS.filter((p) => raw.includes(p));
  if (compact) {
    return (
      <span className="flex items-center gap-1.5" aria-label={pillars.map((p) => PILLAR_LABEL[p]).join(", ")}>
        {pillars.map((p) => {
          const Icon = PILLAR_ICON[p];
          return (
            <span
              key={p}
              title={PILLAR_LABEL[p]}
              className="flex size-6 items-center justify-center rounded-md border border-border text-muted-foreground"
            >
              <Icon className="size-3.5" aria-hidden />
            </span>
          );
        })}
      </span>
    );
  }
  return (
    <span className="flex flex-wrap gap-1">
      {pillars.map((p) => (
        <PillarBadge key={p} pillar={p} />
      ))}
    </span>
  );
}

export function SyntheticTag({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-warning/40 text-[10px] font-medium uppercase tracking-wide text-warning", className)}
    >
      Synthetic
    </Badge>
  );
}
