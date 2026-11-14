import { Badge } from "@/components/ui/badge";
import { CATEGORY_COLOR } from "@/lib/chart-colors";
import { CATEGORY_LABEL, DATA_LEVEL_LABEL, PILLAR_LABEL } from "@/lib/constants";
import { SAFETY_PILLARS, type Category, type DataLevel, type DataSource, type SafetyPillar } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { BellRing, ShieldCheck, Waves } from "lucide-react";

export function CategoryBadge({ category, className }: { category: Category; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-foreground/90", className)}>
      <span
        aria-hidden
        className="size-2 rounded-full"
        style={{ backgroundColor: CATEGORY_COLOR[category] }}
      />
      {CATEGORY_LABEL[category]}
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

/** How much data we hold for an investigation. */
export function DataLevelBadge({ level, className }: { level: DataLevel; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-normal", level === "runs" ? "text-foreground/90" : "text-muted-foreground", className)}
    >
      {DATA_LEVEL_LABEL[level]}
    </Badge>
  );
}

/** Marks values hand-transcribed from a published NASA paper rather than read from a PSI file. */
export function SourceTag({ source, className }: { source: DataSource; className?: string }) {
  if (source === "psi") return null;
  return (
    <Badge variant="outline" className={cn("border-warning/40 text-[10px] font-medium uppercase tracking-wide text-warning", className)}>
      Published paper
    </Badge>
  );
}

/** Small "team assessment" marker for labels that are our classification, not NASA's. */
export function TeamTag({ className }: { className?: string }) {
  return (
    <span className={cn("text-[10px] uppercase tracking-wide text-muted-foreground", className)} title="The team's own classification, not a NASA statement">
      team assessment
    </span>
  );
}
