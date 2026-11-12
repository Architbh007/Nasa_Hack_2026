"use client";

import { ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FuelPhaseBadge, PillarBadges, SyntheticTag } from "@/components/common/badges";
import { TestScatter } from "@/components/charts/test-scatter";
import { SiSummaryCard } from "@/components/explore/si-summary-card";
import { HABITAT_LABEL } from "@/lib/constants";
import {
  formatFlowRange,
  formatO2Range,
  formatPressureRange,
  formatPressureRangeKPa,
  formatYears,
  GRAVITY_LEVEL_LABEL,
  percent,
} from "@/lib/format";
import { HABITAT_KEYS, type Investigation, type TestRun } from "@/lib/schema";
import { ignitionRate } from "@/lib/test-metrics";
import { cn } from "@/lib/utils";

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-2", className)}>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 px-3 py-2">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="tabular mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}

function BulletList({ items }: { items: readonly string[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">None recorded.</p>;
  return (
    <ul className="space-y-1.5 text-sm leading-relaxed">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function InvestigationDetail({ inv, tests }: { inv: Investigation; tests: readonly TestRun[] }) {
  return (
    <div className="space-y-6">
      <SiSummaryCard investigationId={inv.id} />

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Fact label="Fuel phase" value={<FuelPhaseBadge phase={inv.fuelPhase} />} />
        <Fact label="O2 tested" value={formatO2Range(inv)} />
        <Fact label="Pressure" value={<span>{formatPressureRange(inv)} <span className="text-muted-foreground">({formatPressureRangeKPa(inv)})</span></span>} />
        <Fact label="Airflow" value={formatFlowRange(inv)} />
        <Fact label="Gravity" value={GRAVITY_LEVEL_LABEL[inv.gravityLevel]} />
        <Fact label="Test runs" value={`${tests.length} · ${percent(ignitionRate(tests))} ignited`} />
      </dl>

      <Section title="Test runs">
        <TestScatter tests={tests} height={230} />
      </Section>

      <Section title="Variables vs constants">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
            <p className="mb-2 text-xs font-medium text-primary">Varied between tests</p>
            <div className="flex flex-wrap gap-1.5">
              {inv.variables.map((v) => (
                <Badge key={v} variant="secondary" className="font-normal">{v}</Badge>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Held constant</p>
            <div className="flex flex-wrap gap-1.5">
              {inv.constants.map((c) => (
                <Badge key={c} variant="outline" className="font-normal text-muted-foreground">{c}</Badge>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Key findings">
        <BulletList items={inv.keyFindings} />
      </Section>

      <Section title="Objectives">
        <BulletList items={inv.objectives} />
      </Section>

      <div className="grid gap-6 sm:grid-cols-2">
        <Section title="Fuels and samples">
          <p className="text-sm">{inv.fuels.join(", ")}</p>
          <p className="text-xs text-muted-foreground">{inv.sampleGeometry}</p>
          {inv.diluents.length > 0 && <p className="text-xs text-muted-foreground">Diluents: {inv.diluents.join(", ")}</p>}
        </Section>
        <Section title="Hardware">
          <BulletList items={inv.hardware} />
        </Section>
      </div>

      <Section title="Measurements">
        <div className="flex flex-wrap gap-1.5">
          {inv.measurements.map((m) => (
            <Badge key={m} variant="outline" className="font-normal">{m}</Badge>
          ))}
        </div>
      </Section>

      <Section title="Habitat relevance">
        <ul className="space-y-2.5">
          {HABITAT_KEYS.map((h) => {
            const r = inv.habitatRelevance[h];
            return (
              <li key={h} className="grid grid-cols-[7.5rem_1fr] items-start gap-3">
                <span className="text-sm">{HABITAT_LABEL[h]}</span>
                <span className="space-y-1">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary/15">
                      <span className="block h-full rounded-full bg-primary" style={{ width: `${(r.score / 5) * 100}%` }} />
                    </span>
                    <span className="tabular w-8 text-right text-xs">{r.score}/5</span>
                  </span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">{r.rationale}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Earth applications">
        <BulletList items={inv.earthApplications} />
      </Section>

      <Separator />
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <SyntheticTag />
        <span>Record id {inv.id}</span>
        {inv.sourceUrls.map((u) => (
          <a key={u} href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-link hover:underline">
            Source <ExternalLink className="size-3" aria-hidden />
          </a>
        ))}
      </div>
    </div>
  );
}

export function InvestigationSheet({
  inv,
  tests,
  open,
  onOpenChange,
}: {
  inv: Investigation | null;
  tests: readonly TestRun[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-2xl data-[side=right]:sm:max-w-2xl">
        {inv && (
          <>
            <SheetHeader className="border-b border-border px-6 py-5">
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <Badge variant="secondary">{inv.project}</Badge>
                <PillarBadges pillars={inv.safetyPillars} />
              </div>
              <SheetTitle className="text-xl">
                {inv.acronym} <span className="font-normal text-muted-foreground">· {inv.name}</span>
              </SheetTitle>
              <SheetDescription>
                {inv.platform} · {formatYears(inv)}
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="min-h-0 flex-1">
              <div className="px-6 py-5">
                <InvestigationDetail inv={inv} tests={tests} />
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
