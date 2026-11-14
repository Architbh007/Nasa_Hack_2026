"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, TriangleAlert } from "lucide-react";
import { SourceTag } from "@/components/common/badges";
import { FlowMap } from "@/components/response/flow-map";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  RESPONSE_ACTION_DETAIL,
  RESPONSE_ACTION_LABEL,
  RESPONSE_ACTIONS,
  RESPONSE_RESULT_LABEL,
  RESPONSE_RESULTS,
  type ConsequenceRow,
  type ExtinguishedBreakdown,
  type FlowPoint,
  type ResponseAction,
  type ResponseCoverage,
  type ResponseEvent,
  type ResponseResult,
  type ResponseTally,
} from "@/lib/crew-response";
import { formatRunFlow, formatRunO2, num } from "@/lib/format";
import { PSI_PORTAL } from "@/lib/sources";

const RESULT_COLOR: Record<ResponseResult, string> = {
  "went-out": "#3987e5",
  "partly-out": "#c98500",
  "kept-burning": "#d95926",
};

const VENTILATION_SOURCE = {
  label: "ESA: No fire in the sky",
  url: "https://www.esa.int/Enabling_Support/Space_Engineering_Technology/No_fire_in_the_sky_preventing_an_astronaut_s_worst_nightmare",
};
const SAFFIRE_SOURCE = {
  label: "Preliminary Results from the Saffire VI Experiment (ICES-2024-365), Table 2",
  url: "https://ntrs.nasa.gov/citations/20240002981",
};

const NOT_RECORDED = "Not recorded";

function duration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s} s`;
  return s === 0 ? `${m} min` : `${m} min ${s} s`;
}

const orMissing = (v: number | null, unit: string, digits = 1) => (v === null ? NOT_RECORDED : `${num(v, digits)}${unit}`);

function OutLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-link hover:underline">
      {children}
      <ExternalLink className="size-3" aria-hidden />
    </a>
  );
}

function ResultMark({ result }: { result: ResponseResult }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: RESULT_COLOR[result] }} />
      {RESPONSE_RESULT_LABEL[result]}
    </span>
  );
}

/** One action: how many times it was tried and what the notes say happened. */
function TallyCard({ tally }: { tally: ResponseTally }) {
  const wentOut = tally.counts["went-out"];
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{RESPONSE_ACTION_LABEL[tally.action]}</CardTitle>
        <CardDescription className="text-xs">{RESPONSE_ACTION_DETAIL[tally.action]}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {tally.total === 0 ? (
          <p className="text-sm text-muted-foreground">No coded events.</p>
        ) : (
          <>
            <p className="tabular text-2xl font-semibold leading-none">
              {wentOut} of {tally.total}
              <span className="ml-2 text-sm font-normal text-muted-foreground">went out</span>
            </p>
            <div
              className="flex h-2 gap-0.5 overflow-hidden rounded-full"
              role="img"
              aria-label={RESPONSE_RESULTS.map((r) => `${tally.counts[r]} ${RESPONSE_RESULT_LABEL[r].toLowerCase()}`).join(", ")}
            >
              {RESPONSE_RESULTS.filter((r) => tally.counts[r] > 0).map((r) => (
                <span key={r} style={{ flexGrow: tally.counts[r], backgroundColor: RESULT_COLOR[r] }} />
              ))}
            </div>
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {RESPONSE_RESULTS.map((r) => (
                <li key={r} className="flex items-center justify-between gap-2">
                  <ResultMark result={r} />
                  <span className="tabular text-foreground/90">{tally.counts[r]}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground">
              {tally.total} {tally.total === 1 ? "event" : "events"} in {tally.runs} {tally.runs === 1 ? "run" : "runs"}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

type Filter = ResponseAction | "all";

export function ResponseView({
  events,
  tally,
  coverage,
  flowPoints,
  consequences,
  extinguished,
  codingRules,
  codingSource,
}: {
  events: readonly ResponseEvent[];
  tally: readonly ResponseTally[];
  coverage: ResponseCoverage;
  flowPoints: readonly FlowPoint[];
  consequences: readonly ConsequenceRow[];
  extinguished: ExtinguishedBreakdown;
  codingRules: readonly string[];
  codingSource: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = useMemo(() => (filter === "all" ? events : events.filter((e) => e.action === filter)), [events, filter]);
  const filters: Filter[] = ["all", ...RESPONSE_ACTIONS.filter((a) => tally.some((t) => t.action === a && t.total > 0))];
  const { o2Range } = coverage;

  return (
    <div className="space-y-6">
      <section aria-labelledby="response-tally" className="space-y-3">
        <div className="space-y-1">
          <h2 id="response-tally" className="text-lg font-semibold">
            What the crew did, and what the flame did
          </h2>
          <p className="max-w-[72ch] text-sm leading-relaxed text-muted-foreground">
            In freefall there is no buoyancy to pull fresh air into a flame, so the ventilation fans do that job. Fire procedures start by
            turning them off (<OutLink href={VENTILATION_SOURCE.url}>{VENTILATION_SOURCE.label}</OutLink>). The counts below come from{" "}
            {coverage.events} actions in {coverage.codedRuns} BASS runs, coded by the team from the investigators&apos; notes.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {tally.map((t) => (
            <TallyCard key={t.action} tally={t} />
          ))}
        </div>
      </section>

      {o2Range && (
        <Alert className="border-warning/40 bg-warning/10">
          <TriangleAlert className="text-warning" aria-hidden />
          <AlertTitle>
            Every response test here was run between {num(o2Range.min)}% and {num(o2Range.max)}% O2
          </AlertTitle>
          <AlertDescription className="text-sm leading-relaxed">
            {coverage.solidRunsAboveCodedO2 > 0 && coverage.highestSolidO2 !== null ? (
              <>
                The dataset holds {coverage.solidRunsAboveCodedO2} solid-fuel runs at higher oxygen, up to {num(coverage.highestSolidO2)}%.
                None of them records what happens when the airflow is stopped.{" "}
              </>
            ) : null}
            Whether stopping the fans puts a fire out in an oxygen-enriched exploration cabin is not tested in this data.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Airflow is what the solid-fuel tests changed</CardTitle>
          <CardDescription>
            {coverage.solidRunsWithFlow} of {coverage.solidRuns} solid-fuel runs record an airflow speed. Most were flown near cabin pressure,
            so they sit in one strip of an oxygen and pressure map. Plotted against airflow they spread out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FlowMap points={flowPoints} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Every coded action</CardTitle>
          <CardDescription>
            Each row is one action in one run. The words in the last column are copied from the investigator&apos;s note, so the coding can
            be checked against the source ({codingSource}).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by action">
            {filters.map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "secondary" : "outline"} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f === "all" ? "All actions" : RESPONSE_ACTION_LABEL[f]}
                <span className="tabular text-muted-foreground">{f === "all" ? events.length : events.filter((e) => e.action === f).length}</span>
              </Button>
            ))}
          </div>
          <div className="max-h-[34rem] overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">O2</TableHead>
                  <TableHead>Airflow in the run</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="min-w-[20rem]">What the note says</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((e) => (
                  <TableRow key={`${e.runId}-${e.action}`} className="align-top">
                    <TableCell className="whitespace-nowrap">
                      <Link href={`/explore?id=${e.run.investigationId}`} className="font-mono text-xs text-link hover:underline">
                        {e.run.id}
                      </Link>
                      <span className="block max-w-[14rem] truncate text-[11px] text-muted-foreground" title={e.run.source.ref}>
                        {e.run.source.ref}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[10rem] truncate" title={e.run.material ?? undefined}>
                      {e.run.material ?? NOT_RECORDED}
                    </TableCell>
                    <TableCell className="tabular whitespace-nowrap text-right">{formatRunO2(e.run)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatRunFlow(e.run)}</TableCell>
                    <TableCell className="whitespace-nowrap">{RESPONSE_ACTION_LABEL[e.action]}</TableCell>
                    <TableCell>
                      <ResultMark result={e.result} />
                    </TableCell>
                    <TableCell className="whitespace-normal text-sm leading-relaxed">
                      <q className="text-foreground/90">{e.quote}</q>
                      {e.caveat && <span className="mt-1 block text-[11px] text-muted-foreground">Note: {e.caveat}</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Airflow shown as cm/s where the source gives a speed. Text in quotation marks in that column is the source&apos;s own wording.
          </p>
        </CardContent>
      </Card>

      {extinguished.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>&quot;Extinguished&quot; means several different things</CardTitle>
            <CardDescription>
              {extinguished.total} BASS runs carry the outcome &quot;extinguished&quot;. A flame that goes out when the crew cuts the air is a
              different safety result from one that runs out of fuel. This splits those runs by what the note says put the flame out.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>How the flame ended</TableHead>
                  <TableHead className="text-right">Runs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RESPONSE_ACTIONS.filter((a) => extinguished.counts[a] > 0).map((a) => (
                  <TableRow key={a}>
                    <TableCell>Went out after: {RESPONSE_ACTION_LABEL[a].toLowerCase()}</TableCell>
                    <TableCell className="tabular text-right">{extinguished.counts[a]}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell>
                    No crew action coded
                    <span className="block text-[11px] text-muted-foreground">
                      Fuel ran out, the flame went out with no stated action, or the note is unclear.
                    </span>
                  </TableCell>
                  <TableCell className="tabular text-right align-top">{extinguished.counts["not-coded"]}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {consequences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>What a fire produces when it is left to burn</CardTitle>
            <CardDescription>
              The Saffire IV to VI fires burned larger samples inside an uncrewed Cygnus vehicle with the airflow left on. No response
              action was tested on them. These are the published burn times and the rise in carbon dioxide and carbon monoxide.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">O2</TableHead>
                  <TableHead className="text-right">Pressure</TableHead>
                  <TableHead className="text-right">Airflow</TableHead>
                  <TableHead className="text-right">Burn time</TableHead>
                  <TableHead className="text-right">CO2 rise</TableHead>
                  <TableHead className="text-right">CO rise</TableHead>
                  <TableHead className="text-right">Peak outlet temp.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consequences.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="whitespace-nowrap">
                      <Link href="/explore?id=saffire-iv-vi" className="font-mono text-xs text-link hover:underline">
                        {c.id}
                      </Link>
                      <SourceTag source="published" className="ml-2" />
                    </TableCell>
                    <TableCell>{c.material ?? NOT_RECORDED}</TableCell>
                    <TableCell className="tabular text-right">{orMissing(c.o2Percent, "%")}</TableCell>
                    <TableCell className="tabular text-right">{orMissing(c.pressurePsi, " psi", 2)}</TableCell>
                    <TableCell className="tabular text-right">{orMissing(c.flowMaxCmS, " cm/s")}</TableCell>
                    <TableCell className="tabular whitespace-nowrap text-right">{duration(c.burnDurationS)}</TableCell>
                    <TableCell className="tabular text-right">{orMissing(c.co2IncreasePpm, " ppm", 0)}</TableCell>
                    <TableCell className="tabular text-right">{orMissing(c.coIncreasePpm, " ppm", 0)}</TableCell>
                    <TableCell className="tabular text-right">{orMissing(c.maxTempSfuOutletC, " °C", 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-[11px] text-muted-foreground">
              Source: <OutLink href={SAFFIRE_SOURCE.url}>{SAFFIRE_SOURCE.label}</OutLink>. Values were transcribed from the paper.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>How to read this page</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 text-sm leading-relaxed md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="font-medium">What it does not show</h3>
            <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
              <li>These were small samples burning in a flow duct inside a glovebox. A cabin fire is larger and has more than one fuel.</li>
              <li>The counts describe these tests. They are not a chance that a fire will go out.</li>
              <li>The nitrogen jet was part of the experiment. It is not a spacecraft fire extinguisher.</li>
              <li>Many notes give a fan dial or pot setting. Those are shown as written and never turned into a speed.</li>
              <li>Runs whose notes do not say what the flame did after an action are left out, so they are not counted either way.</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">How the notes were coded</h3>
            <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
              {codingRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground">
              The coding is the team&apos;s, not NASA&apos;s. The notes come from the{" "}
              <OutLink href={PSI_PORTAL.url}>{PSI_PORTAL.label}</OutLink>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
