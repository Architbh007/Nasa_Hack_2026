"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CategoryBadge, DataLevelBadge, PillarBadges, SourceTag, TeamTag } from "@/components/common/badges";
import { TestScatter } from "@/components/charts/test-scatter";
import { SiSummaryCard } from "@/components/explore/si-summary-card";
import { DATA_LEVEL_LABEL, OUTCOME_LABEL } from "@/lib/constants";
import { formatFlowRange, formatO2Range, formatPressureRange, formatRunFlow, formatRunO2, formatRunPressure, formatYears } from "@/lib/format";
import type { Investigation, Run, Summary } from "@/lib/schema";
import { sourcesForInvestigation } from "@/lib/sources";
import { cn } from "@/lib/utils";

function Section({ title, children, className, aside }: { title: string; children: React.ReactNode; className?: string; aside?: React.ReactNode }) {
  return (
    <section className={cn("space-y-2", className)}>
      <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
        {aside}
      </h3>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 px-3 py-2">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="tabular mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}

function PsiText({ text }: { text: string }) {
  if (!text) return <p className="text-sm text-muted-foreground">Not given in the PSI record.</p>;
  return <p className="text-sm leading-relaxed whitespace-pre-line">{text}</p>;
}

function outcomeCounts(runs: readonly Run[]) {
  const m = new Map<string, number>();
  for (const r of runs) m.set(OUTCOME_LABEL[r.outcome], (m.get(OUTCOME_LABEL[r.outcome]) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

const RUN_PAGE = 25;

function RunsTable({ runs }: { runs: readonly Run[] }) {
  const [shown, setShown] = useState(RUN_PAGE);
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Run</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>O2</TableHead>
              <TableHead>Pressure</TableHead>
              <TableHead>Flow</TableHead>
              <TableHead>Outcome</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.slice(0, shown).map((r) => (
              <TableRow key={r.id} title={[r.outcomeText, ...r.flags].filter(Boolean).join("\n")}>
                <TableCell className="align-top">
                  <span className="font-mono text-[11px]">{r.id}</span>
                  <span className="block max-w-[11rem] text-[10px] leading-snug text-muted-foreground">{r.source.ref}</span>
                </TableCell>
                <TableCell className="max-w-[9rem] align-top text-xs">{r.material ?? "Not recorded"}</TableCell>
                <TableCell className="align-top text-xs">{formatRunO2(r)}</TableCell>
                <TableCell className="align-top text-xs">{formatRunPressure(r)}</TableCell>
                <TableCell className="align-top text-xs">{formatRunFlow(r)}</TableCell>
                <TableCell className="align-top text-xs">
                  {OUTCOME_LABEL[r.outcome]}
                  {r.outcomeBasis === "notes-keyword" && <span className="block text-[10px] text-muted-foreground">from notes</span>}
                  {r.flags.length > 0 && <span className="block text-[10px] text-warning">{r.flags.length} caveat{r.flags.length === 1 ? "" : "s"}</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          Showing {Math.min(shown, runs.length)} of {runs.length}. Hover a row for notes and caveats.
        </span>
        {shown < runs.length && (
          <Button size="sm" variant="ghost" onClick={() => setShown((n) => n + RUN_PAGE * 4)}>
            Show more
          </Button>
        )}
      </div>
    </div>
  );
}

export function InvestigationDetail({ inv, runs, summaries }: { inv: Investigation; runs: readonly Run[]; summaries: readonly Summary[] }) {
  const counts = outcomeCounts(runs);
  return (
    <div className="space-y-6">
      <SiSummaryCard investigationId={inv.id} />

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Fact label={<>Fuel category <TeamTag /></>} value={<CategoryBadge category={inv.category} />} />
        <Fact label="Data held" value={DATA_LEVEL_LABEL[inv.dataLevel]} />
        <Fact label="Run-level tests" value={inv.runCount} />
        <Fact label="O2 in runs" value={formatO2Range(inv)} />
        <Fact label="Pressure in runs" value={formatPressureRange(inv)} />
        <Fact label="Airflow in runs" value={formatFlowRange(inv)} />
      </dl>
      {inv.ranges.pressureIncludesAssumed && (
        <p className="-mt-4 text-[11px] text-muted-foreground">* The source does not record pressure; runs are placed at the cited ISS nominal 14.7 psi.</p>
      )}

      {runs.length > 0 && (
        <Section title="Real runs">
          <p className="text-xs text-muted-foreground">
            Recorded outcomes: {counts.map(([k, n]) => `${k} ${n}`).join(" · ")}
          </p>
          <TestScatter runs={runs} height={230} />
          <RunsTable runs={runs} />
        </Section>
      )}

      {summaries.map((s) => (
        <Section key={s.kind} title={s.title} aside={<DataLevelBadge level={s.kind} />}>
          <p className="text-sm leading-relaxed">{s.note}</p>
          <p className="text-[11px] text-muted-foreground">Source file: {s.sourceFile}</p>
        </Section>
      ))}

      <Section title="Objectives (PSI)">
        <PsiText text={inv.objectives} />
      </Section>
      {inv.approach && (
        <Section title="Approach (PSI)">
          <PsiText text={inv.approach} />
        </Section>
      )}
      {inv.hypothesis && (
        <Section title="Hypothesis (PSI)">
          <PsiText text={inv.hypothesis} />
        </Section>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Section title="Fuels and materials as written">
          {inv.fuels.length ? <p className="text-sm">{inv.fuels.join(", ")}</p> : <p className="text-sm text-muted-foreground">No fuel list in the data we hold.</p>}
        </Section>
        <Section title="Hardware (PSI)">
          {inv.hardware.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not listed.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {inv.hardware.map((h) => (
                <li key={h.name}>
                  {h.name}
                  {h.links.map((l) => (
                    <a key={l} href={l} target="_blank" rel="noreferrer" className="ml-1 inline-flex text-link" aria-label={`Link for ${h.name}`}>
                      <ExternalLink className="size-3" aria-hidden />
                    </a>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Earth benefits (PSI)">
        <PsiText text={inv.earthBenefits} />
      </Section>

      {inv.publicationTitlesRaw && (
        <Section title="Publications (PSI, as listed)">
          <p className="text-xs leading-relaxed text-muted-foreground">{inv.publicationTitlesRaw}</p>
        </Section>
      )}

      <Section title="Team assessment" aside={<TeamTag />}>
        <p className="text-sm">{inv.categoryBasis}</p>
        {inv.teamAssessment.safetyPillars.length > 0 && <PillarBadges pillars={inv.teamAssessment.safetyPillars} />}
        <p className="text-xs text-muted-foreground">{inv.teamAssessment.basis}</p>
      </Section>

      {inv.knownIssues.length > 0 && (
        <Section title="Known data issues">
          <ul className="space-y-1 text-sm">
            {inv.knownIssues.map((k) => (
              <li key={k} className="flex gap-2">
                <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-warning" />
                {k}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Separator />
      <Section title="Citation">
        {inv.citation.text ? <p className="text-xs leading-relaxed">{inv.citation.text}</p> : <p className="text-xs text-muted-foreground">No DOI record found.</p>}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <SourceTag source={inv.dataSource} />
          <span>Record id {inv.id}</span>
          {inv.citation.licence && <span>Licence: {inv.citation.licence.toUpperCase()}</span>}
          {inv.citation.pageUrl && (
            <a href={inv.citation.pageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-link hover:underline">
              {inv.accession ? "PSI page" : "Source paper"} <ExternalLink className="size-3" aria-hidden />
            </a>
          )}
          {inv.citation.doi && (
            <a href={`https://doi.org/${inv.citation.doi}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-link hover:underline">
              doi:{inv.citation.doi} <ExternalLink className="size-3" aria-hidden />
            </a>
          )}
        </div>
      </Section>
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Original NASA sources</p>
        <ul className="space-y-1 text-xs">
          {sourcesForInvestigation(inv.id).map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 text-link hover:underline">
                {s.label} <ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function InvestigationSheet({
  inv,
  runs,
  summaries,
  open,
  onOpenChange,
}: {
  inv: Investigation | null;
  runs: readonly Run[];
  summaries: readonly Summary[];
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
                {inv.accession && <Badge variant="secondary">{inv.accession}</Badge>}
                {inv.project !== "Standalone" && <Badge variant="outline">{inv.project}</Badge>}
                <DataLevelBadge level={inv.dataLevel} />
                <SourceTag source={inv.dataSource} />
              </div>
              <SheetTitle className="text-xl">
                {inv.acronym} <span className="font-normal text-muted-foreground">· {inv.name}</span>
              </SheetTitle>
              <SheetDescription>
                {[inv.platform, formatYears(inv), inv.subResearchArea].filter(Boolean).join(" · ")}
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="min-h-0 flex-1">
              <div className="px-6 py-5">
                <InvestigationDetail inv={inv} runs={runs} summaries={summaries} />
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
