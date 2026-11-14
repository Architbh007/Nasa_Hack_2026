"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, FileText } from "lucide-react";
import { AnimatedNumber } from "@/components/common/animated-number";
import { VERDICT_COLOR } from "@/components/habitat/readouts";
import { PlannerMap } from "@/components/planner/planner-map";
import { useInvestigationIds } from "@/components/si/investigation-ids";
import { SiMarkdown } from "@/components/si/si-markdown";
import { SiError, SiMeta, SiSkeleton } from "@/components/si/si-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import type { ExperimentProposal } from "@/lib/ai/schemas";
import { OUTCOME_GROUP, OUTCOME_GROUP_STYLE } from "@/lib/chart-colors";
import { MATERIAL_LABEL } from "@/lib/constants";
import { scopeRuns, type GridScope } from "@/lib/flammability-grid";
import {
  NON_TARGET_PRESETS,
  PLAN_LIMITS,
  PLAN_VERDICT_LABEL,
  planExperiments,
  resolveTargets,
  type ExperimentPlan,
  type PlanMode,
  type PlannedTest,
} from "@/lib/planner";
import type { Run, Scenario } from "@/lib/schema";
import { useSiMutation } from "@/lib/si-client";
import { cn } from "@/lib/utils";

const SCOPES: readonly GridScope[] = ["all-solids", "fabric", "plastic", "foam", "wire-insulation", "liquid-fuel"];
const scopeLabel = (s: GridScope) => (s === "all-solids" ? "All solids" : MATERIAL_LABEL[s]);
const DEFAULT_TARGETS = ["lunar-base", "mars-transit"];

function Chip({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: ReactNode; title?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={title}
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-[0.875rem] transition-[background-color,color] duration-200 ease-out",
        active ? "bg-foreground text-background" : "bg-secondary text-foreground/85 hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}

function Field({ label, value, children }: { label: string; value?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[0.8125rem] font-medium text-muted-foreground">{label}</span>
        {value !== undefined && <span className="tabular text-sm">{value}</span>}
      </div>
      {children}
    </div>
  );
}

function VerdictText({ v }: { v: keyof typeof PLAN_VERDICT_LABEL }) {
  return (
    <span className="font-semibold" style={{ color: VERDICT_COLOR[v] }}>
      {PLAN_VERDICT_LABEL[v]}
    </span>
  );
}

/** Plain-text Markdown of the plan, plus the SI proposal when one has been written. */
function planToMarkdown(plan: ExperimentPlan, acronym: (id: string) => string, proposal: ExperimentProposal | null): string {
  const o = plan.options;
  const lines: string[] = [];
  lines.push(`# ${proposal?.title ?? "FireSight experiment plan"}`, "");
  lines.push(
    `Material: ${scopeLabel(o.scope)} · Tests: ${plan.tests.length} · Style: ${o.mode === "stepping" ? "stepping stones" : "direct"} · Based on ${plan.evidenceRunCount} real NASA runs`,
    ""
  );
  if (proposal) lines.push("## Objective", "", proposal.objective, "");
  lines.push("## Mission targets", "");
  for (const t of plan.targets) {
    lines.push(
      `- ${t.target.label} (${t.target.o2Percent}% O2, ${t.target.pressurePsi} psi): ${PLAN_VERDICT_LABEL[t.before]} → ${PLAN_VERDICT_LABEL[t.after]}${
        t.testedAfterTest ? ` (after test ${t.testedAfterTest})` : ""
      }`
    );
  }
  lines.push(
    "",
    `Grid squares tested or near tested: ${plan.coverageBefore.tested + plan.coverageBefore.near} → ${plan.coverageAfter.tested + plan.coverageAfter.near} of ${plan.coverageAfter.total}`,
    "",
    "## Tests",
    ""
  );
  for (const t of plan.tests) {
    const p = proposal?.tests.find((x) => x.testNumber === t.index);
    lines.push(`### Test ${t.index}: ${t.o2Percent}% O2 at ${t.pressurePsi} psi (${t.pressureKPa} kPa), O2 partial pressure ${t.pO2Psi} psi`, "");
    lines.push(`- Why: ${t.reason}`);
    if (p) lines.push(`- Purpose: ${p.purpose}`, `- Measure: ${p.measure}`);
    lines.push(`- Builds on: ${t.buildsOn.map((r) => `${r.runId} (${acronym(r.investigationId)}, ${r.o2Percent}% O2, ${r.pressurePsi} psi, ${r.outcome})`).join("; ")}`);
    if (t.boundary) lines.push(`- Limit nearby: ${t.boundary.burned} nearby runs burned and ${t.boundary.wentOut} went out or never lit`);
    if (t.hardware.length) lines.push(`- Hardware precedent: ${t.hardware.map((h) => `${acronym(h.investigationId)} at ${h.pressurePsi} psi (${h.runId})`).join("; ")}`);
    if (t.needsPartialGravity) lines.push("- Gravity: serves a lunar or Mars target; every run in the data is microgravity");
    lines.push("");
  }
  if (proposal?.openQuestions.length) lines.push("## Open questions", "", ...proposal.openQuestions.map((q) => `- ${q}`), "");
  if (proposal?.limitations.length) lines.push("## Limitations", "", ...proposal.limitations.map((q) => `- ${q}`), "");
  lines.push("Coverage and distances use FireSight's rules (10% O2 counts the same as 3 psi; tested within ±2% O2 and ±1 psi). The plan says where new data would help most; it does not predict outcomes and does not replace NASA-STD-6001.");
  return lines.join("\n");
}

function TestCard({ t, selected, onSelect }: { t: PlannedTest; selected: boolean; onSelect: (i: number | null) => void }) {
  const { acronym } = useInvestigationIds();
  return (
    <li
      id={`test-${t.index}`}
      onMouseEnter={() => onSelect(t.index)}
      onMouseLeave={() => onSelect(null)}
      className={cn(
        "fs-hover-surface rounded-[1.25rem] bg-card p-6 ring-1 transition-[box-shadow,background-color]",
        selected ? "bg-[#161618] ring-primary/60" : "ring-transparent"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.875rem] font-medium text-primary">Test {t.index}</p>
          <p className="mt-1 text-[1.75rem] font-semibold leading-tight tracking-[-0.02em]">
            {t.o2Percent}% O2 · {t.pressurePsi} psi
          </p>
          <p className="tabular mt-1 text-[0.875rem] text-muted-foreground">
            {t.pressureKPa} kPa · O2 partial pressure {t.pO2Psi} psi
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {t.atTargetId && <span className="rounded-full bg-white/10 px-3 py-1 text-[0.8125rem]">At a mission target</span>}
          {t.boundary && (
            <span className="rounded-full bg-[#fab219]/15 px-3 py-1 text-[0.8125rem] text-[#fab219]" title="Nearby real runs both burned and went out">
              Flammability limit nearby
            </span>
          )}
          {t.needsPartialGravity && (
            <span className="rounded-full bg-[#5eb1ff]/15 px-3 py-1 text-[0.8125rem] text-link" title="Every run in the data is microgravity">
              Needs a partial-gravity platform
            </span>
          )}
        </div>
      </div>

      <p className="mt-4 text-[1rem] leading-relaxed text-foreground/85">{t.reason}</p>

      <dl className="mt-5 grid gap-5 text-[0.875rem] md:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Steps from</dt>
          <dd className="mt-1.5">
            {t.stepsFrom === null ? (
              "No real run of this material yet; this would be the first."
            ) : t.stepsFrom.kind === "test" ? (
              <>
                Test {t.stepsFrom.index} <span className="tabular text-muted-foreground">(distance {t.stepsFrom.distance})</span>
              </>
            ) : (
              <>
                <Link href={`/explore?id=${t.stepsFrom.investigationId}`} className="font-mono text-[0.8125rem] text-link hover:underline">
                  {t.stepsFrom.runId}
                </Link>{" "}
                <span className="tabular text-muted-foreground">(distance {t.stepsFrom.distance})</span>
              </>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Builds on these real runs</dt>
          <dd className="mt-1.5 space-y-1.5">
            {t.buildsOn.length === 0 && <span className="text-muted-foreground">None for this material.</span>}
            {t.buildsOn.map((r) => {
              const style = OUTCOME_GROUP_STYLE[OUTCOME_GROUP[r.outcome]];
              return (
                <p key={r.runId} className="flex flex-wrap items-center gap-x-2" title={r.source}>
                  <span aria-hidden className="size-2 rounded-full" style={{ background: style.color }} />
                  <Link href={`/explore?id=${r.investigationId}`} className="font-mono text-[0.8125rem] text-link hover:underline">
                    {r.runId}
                  </Link>
                  <span className="tabular text-muted-foreground">
                    {r.o2Percent}%, {r.pressurePsi} psi{r.pressureAssumed ? " (nominal)" : ""} · {style.label.toLowerCase()}
                  </span>
                </p>
              );
            })}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Flown hardware at this pressure</dt>
          <dd className="mt-1.5 space-y-1">
            {t.hardware.length === 0 ? (
              <span className="text-muted-foreground">No flown investigation recorded a pressure within 0.75 psi.</span>
            ) : (
              t.hardware.slice(0, 4).map((h) => (
                <p key={h.investigationId}>
                  <Link href={`/explore?id=${h.investigationId}`} className="text-link hover:underline">
                    {acronym(h.investigationId)}
                  </Link>{" "}
                  <span className="tabular text-muted-foreground">at {h.pressurePsi} psi</span>
                </p>
              ))
            )}
          </dd>
        </div>
      </dl>
    </li>
  );
}

function ProposalPanel({ plan, body }: { plan: ExperimentPlan; body: unknown }) {
  const { state, run } = useSiMutation<ExperimentProposal>("/api/experiment-plan");
  const { acronym } = useInvestigationIds();
  const [copied, setCopied] = useState(false);
  const proposal = state.status === "success" ? state.data : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(planToMarkdown(plan, acronym, proposal));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card id="proposal">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-lg">Experiment proposal</CardTitle>
          <CardDescription>
            The SI writes a cited proposal from this exact plan. The plan is recomputed on the server, so it only sees numbers from the data.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void run(body)} disabled={state.status === "loading" || plan.tests.length === 0}>
            <FileText /> {proposal ? "Write again" : "Write proposal"}
          </Button>
          <Button variant="outline" onClick={() => void copy()} disabled={plan.tests.length === 0}>
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy as Markdown"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {state.status === "idle" && (
          <p className="text-sm text-muted-foreground">
            Not written yet. Copy as Markdown works without it and includes the full plan with sources.
          </p>
        )}
        {state.status === "loading" && <SiSkeleton lines={5} />}
        {state.status === "error" && <SiError message={state.message} onRetry={() => void run(body)} />}
        {proposal && state.status === "success" && (
          <div key={proposal.title} className="fs-swap space-y-6">
            <div>
              <h3 className="text-[1.375rem] font-semibold leading-snug">{proposal.title}</h3>
              <SiMarkdown text={proposal.objective} className="mt-3 text-[1rem] leading-relaxed text-foreground/85" />
            </div>
            <ol className="space-y-4">
              {proposal.tests.map((pt) => (
                <li key={pt.testNumber} className="grid gap-1 border-t border-white/10 pt-4 md:grid-cols-[6rem_1fr]">
                  <span className="text-[0.875rem] font-medium text-primary">Test {pt.testNumber}</span>
                  <div className="space-y-1.5 text-[0.9375rem] leading-relaxed">
                    <SiMarkdown text={pt.purpose} />
                    <p className="text-muted-foreground">Measure: {pt.measure}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="grid gap-6 md:grid-cols-2">
              {proposal.openQuestions.length > 0 && (
                <div>
                  <h4 className="text-[0.875rem] font-medium text-muted-foreground">Open questions</h4>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.9375rem]">
                    {proposal.openQuestions.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <h4 className="text-[0.875rem] font-medium text-muted-foreground">Limitations</h4>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.9375rem]">
                  {proposal.limitations.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </div>
            </div>
            <SiMeta cached={state.cached} model={state.model} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PlannerView({ runs, scenarios }: { runs: Run[]; scenarios: Scenario[] }) {
  const targetPresets = useMemo(() => scenarios.filter((s) => !NON_TARGET_PRESETS.has(s.id)), [scenarios]);
  const [targetIds, setTargetIds] = useState<string[]>(DEFAULT_TARGETS.filter((id) => scenarios.some((s) => s.id === id)));
  const [customOn, setCustomOn] = useState(false);
  const [custom, setCustom] = useState({ o2Percent: 30, pressurePsi: 8 });
  const [scope, setScope] = useState<GridScope>("all-solids");
  const [budget, setBudget] = useState(5);
  const [mode, setMode] = useState<PlanMode>("stepping");
  const [view, setView] = useState<"before" | "after">("after");
  const [selected, setSelected] = useState<number | null>(null);

  const targets = useMemo(() => resolveTargets(scenarios, targetIds, customOn ? custom : null), [scenarios, targetIds, customOn, custom]);
  const plan = useMemo(() => planExperiments(runs, { targets, scope, budget, mode }), [runs, targets, scope, budget, mode]);
  const mapRuns = useMemo(() => scopeRuns(scope, runs), [runs, scope]);
  const body = { targetIds, custom: customOn ? custom : null, scope, budget, mode };

  const toggleTarget = (id: string) => setTargetIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(-4)));
  const coveredBefore = plan.coverageBefore.tested + plan.coverageBefore.near;
  const coveredAfter = plan.coverageAfter.tested + plan.coverageAfter.near;

  return (
    <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
      <Card id="plan-controls" className="h-fit xl:sticky xl:top-16">
        <CardHeader>
          <CardTitle className="text-base">Plan the campaign</CardTitle>
        </CardHeader>
        <CardContent className="space-y-7">
          <Field label="Mission targets">
            <div className="flex flex-wrap gap-2">
              {targetPresets.map((s) => (
                <Chip key={s.id} active={targetIds.includes(s.id)} onClick={() => toggleTarget(s.id)} title={`${s.o2Percent}% O2, ${s.pressurePsi} psi`}>
                  {s.label}
                </Chip>
              ))}
              <Chip active={customOn} onClick={() => setCustomOn((v) => !v)}>
                Custom
              </Chip>
            </div>
          </Field>
          {customOn && (
            <div className="fs-swap space-y-5">
              <Field label="Custom oxygen" value={`${custom.o2Percent}%`}>
                <Slider min={15} max={51} step={0.5} value={[custom.o2Percent]} onValueChange={(v) => setCustom((c) => ({ ...c, o2Percent: v[0] ?? c.o2Percent }))} aria-label="Custom target oxygen percent" />
              </Field>
              <Field label="Custom pressure" value={`${custom.pressurePsi} psi`}>
                <Slider min={3} max={15} step={0.1} value={[custom.pressurePsi]} onValueChange={(v) => setCustom((c) => ({ ...c, pressurePsi: Math.round((v[0] ?? c.pressurePsi) * 10) / 10 }))} aria-label="Custom target pressure psi" />
              </Field>
            </div>
          )}
          <Field label="Material">
            <div className="flex flex-wrap gap-2">
              {SCOPES.map((s) => (
                <Chip key={s} active={scope === s} onClick={() => setScope(s)}>
                  {scopeLabel(s)}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Test budget" value={`${budget} test${budget === 1 ? "" : "s"}`}>
            <Slider min={PLAN_LIMITS.minBudget} max={PLAN_LIMITS.maxBudget} step={1} value={[budget]} onValueChange={(v) => setBudget(v[0] ?? budget)} aria-label="Number of tests" />
          </Field>
          <Field label="Campaign style">
            <div className="flex flex-wrap gap-2">
              <Chip active={mode === "stepping"} onClick={() => setMode("stepping")} title="Each test stays within near distance of existing or planned evidence">
                Stepping stones
              </Chip>
              <Chip active={mode === "direct"} onClick={() => setMode("direct")} title="Tests may jump straight to a target">
                Direct
              </Chip>
            </div>
            <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
              {mode === "stepping"
                ? "Each test stays one safe step (distance 0.6) from real runs or an earlier test, so the campaign walks out from proven air."
                : "Tests may jump straight to a target, covering more ground with less evidence behind each step."}
            </p>
          </Field>
        </CardContent>
      </Card>

      <div className="min-w-0 space-y-6">
        {targets.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-[1.0625rem] text-muted-foreground">Choose at least one mission target to plan a campaign.</CardContent>
          </Card>
        ) : (
          <>
            <section id="before-after" aria-label="Before and after the plan" className="grid gap-4 md:grid-cols-2">
              {plan.targets.map((t) => (
                <div key={t.target.id} className="rounded-[1.25rem] bg-card p-6">
                  <p className="text-[0.875rem] text-muted-foreground">
                    {t.target.label} · {t.target.o2Percent}% O2, {t.target.pressurePsi} psi
                  </p>
                  <p key={`${t.before}-${t.after}`} className="fs-swap mt-2 flex flex-wrap items-center gap-2 text-[1.375rem]">
                    <VerdictText v={t.before} />
                    <ArrowRight className="size-5 text-muted-foreground" aria-hidden />
                    <VerdictText v={t.after} />
                  </p>
                  <p className="mt-1.5 text-[0.875rem] text-muted-foreground">
                    {t.before === "tested"
                      ? "Already covered by real runs."
                      : t.testedAfterTest
                        ? `Tested after test ${t.testedAfterTest}.`
                        : t.distanceAfter !== null
                          ? `Nearest evidence distance ${t.distanceBefore ?? "none"} → ${t.distanceAfter}.`
                          : "No evidence yet."}
                    {t.offChart && " Off the map's 15–51% O2 window."}
                  </p>
                </div>
              ))}
              <div className="rounded-[1.25rem] bg-card p-6 md:col-span-2">
                <p className="text-[0.875rem] text-muted-foreground">Map squares tested or near tested ({scopeLabel(scope).toLowerCase()})</p>
                <p className="mt-2 text-[1.375rem] font-semibold">
                  <AnimatedNumber value={coveredBefore} /> <span className="font-normal text-muted-foreground">→</span>{" "}
                  <AnimatedNumber value={coveredAfter} /> <span className="text-[1rem] font-normal text-muted-foreground">of {plan.coverageAfter.total}</span>
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
                  <div className="relative h-full">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-[#5eb1ff]/50 transition-[width] duration-500 ease-out" style={{ width: `${(coveredAfter / plan.coverageAfter.total) * 100}%` }} />
                    <div className="absolute inset-y-0 left-0 rounded-full bg-[#5eb1ff] transition-[width] duration-500 ease-out" style={{ width: `${(coveredBefore / plan.coverageBefore.total) * 100}%` }} />
                  </div>
                </div>
                <p className="mt-2 text-[0.8125rem] text-muted-foreground">
                  Solid bar: real runs today. Lighter bar: after the plan. Based on {plan.evidenceRunCount} real runs.
                  {plan.stoppedEarly && ` Stopped at ${plan.tests.length} tests: no further test helps these targets or widens coverage.`}
                </p>
              </div>
            </section>

            <Card id="plan-map" className="dark">
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-lg">The campaign on the map</CardTitle>
                  <CardDescription>
                    Green squares hold real runs, grey ones are near them, striped ones are untested. Dashed rings are the mission targets; orange
                    numbers are the tests, with arrows from the evidence each one steps from.
                  </CardDescription>
                </div>
                <div className="flex gap-2" role="group" aria-label="Map view">
                  <Chip active={view === "before"} onClick={() => setView("before")}>
                    Before
                  </Chip>
                  <Chip active={view === "after"} onClick={() => setView("after")}>
                    After the plan
                  </Chip>
                </div>
              </CardHeader>
              <CardContent>
                <PlannerMap plan={plan} runs={mapRuns} view={view} selected={selected} onSelect={setSelected} />
                <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] text-muted-foreground">
                  {(["burned", "extinguished", "no-ignition", "unknown"] as const).map((g) => (
                    <span key={g} className="inline-flex items-center gap-1.5">
                      <span aria-hidden className="size-2 rounded-full" style={{ background: OUTCOME_GROUP_STYLE[g].color }} />
                      {OUTCOME_GROUP_STYLE[g].label}
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden className="size-2 rounded-full border border-[#8a96a3]" /> Pressure not recorded (placed at ISS nominal)
                  </span>
                </p>
              </CardContent>
            </Card>

            <section id="plan-tests" aria-labelledby="plan-tests-title" className="space-y-4">
              <h2 id="plan-tests-title" className="text-[1.5rem] font-semibold">
                {plan.tests.length} proposed test{plan.tests.length === 1 ? "" : "s"}
              </h2>
              <ol className="space-y-4">
                {plan.tests.map((t) => (
                  <TestCard key={`${t.index}-${t.o2Percent}-${t.pressurePsi}`} t={t} selected={selected === t.index} onSelect={setSelected} />
                ))}
              </ol>
            </section>

            {/* Keyed by the plan inputs so a proposal never stays on screen for a different plan. */}
            <ProposalPanel key={JSON.stringify(body)} plan={plan} body={body} />

            <p className="text-[0.875rem] leading-relaxed text-muted-foreground">
              The plan covers oxygen and pressure only; airflow, sample size and gravity are flagged, not optimised. It says where new data would
              help most. It does not predict whether anything ignites and does not replace NASA-STD-6001.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
