import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Database, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aiConfig } from "@/lib/ai/client";
import { DATA_LEVEL_LABEL, ISS_NOMINAL_SOURCE } from "@/lib/constants";
import { getDataset } from "@/lib/data";
import { NEAR_DISTANCE, RUN_SCALE, TESTED_TOLERANCE } from "@/lib/metrics";
import { DEFAULT_RANKING_WEIGHTS, RANKING_COMPONENTS, RANKING_LABEL } from "@/lib/ranking";
import { DEFAULT_SIMILARITY_WEIGHTS, SIMILARITY_KEYS, SIMILARITY_LABEL } from "@/lib/similarity";

export const metadata: Metadata = { title: "About and Sources" };

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-16">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">{children}</CardContent>
    </Card>
  );
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-muted-foreground">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

const code = (s: string) => <code className="rounded bg-muted px-1">{s}</code>;

const RANKING_DEFINITION: Record<(typeof RANKING_COMPONENTS)[number], string> = {
  rangeOverlap: "1 inside the O2/pressure span of the investigation's real runs, exp(−d/0.15) outside (d normalized by the dataset span), 0 without run data",
  categoryMatch: "1 same fuel category with a matching material, 0.75 same category, 0.1 other category",
  flowMatch: "1 when the recorded airflow range includes the cabin's, decaying with the gap; 0.5 when airflow is not recorded",
  evidenceLevel: "Run tables 0.6 plus up to 0.4 by run count (full at 100 runs); planned matrix or day summary 0.4; log or schedule 0.2; description only 0",
};

export default function AboutPage() {
  const { investigations, runs, summaries, scenarios } = getDataset();
  const { modelMain, modelFast } = aiConfig();
  const published = runs.filter((r) => r.dataSource === "published").length;
  const notesOutcomes = runs.filter((r) => r.outcomeBasis === "notes-keyword").length;
  const unknownOutcomes = runs.filter((r) => r.outcome === "unknown").length;
  const assumed = runs.filter((r) => r.pressureAssumedPsi !== null).length;

  return (
    <>
      <PageHeader
        title="About and Sources"
        description="Where every number comes from, how coverage is judged, and what the data cannot tell you."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Section id="data-policy" title="Data policy">
            <Alert className="border-primary/30 bg-primary/5">
              <Database className="text-primary" aria-hidden />
              <AlertTitle>Real NASA data only</AlertTitle>
              <AlertDescription>
                {runs.length} run-level tests from NASA Physical Science Informatics (PSI) tables and {published} from published NASA
                papers, across {investigations.length} investigations. Nothing is generated or filled in.
              </AlertDescription>
            </Alert>
            <Bullets
              items={[
                <>Every run records its file and exact place in it (sheet and row, or paper, table and page). Open any investigation in the <Link href="/explore" className="text-link hover:underline">Explorer</Link> to see them.</>,
                "Missing values stay missing and are shown as \"Not recorded\". Unit conversions use 1 atm = 14.6959 psi, 1 mmHg = 0.0193368 psi and 1 kPa = 0.145038 psi, and are checked at build time.",
                <>Outcomes come only from the source. {runs.length - unknownOutcomes - notesOutcomes} are stated in a table field; {notesOutcomes} were read from investigator notes by keyword and reviewed by a team member; {unknownOutcomes} are &quot;not stated&quot; because the source does not say.</>,
                <>Pressure is never invented. {assumed} BASS-II runs record no pressure; they are placed on the map at the cited ISS nominal 14.7 psi (hollow markers), kept in a separate field and labelled. Source: {ISS_NOMINAL_SOURCE.split(", ").slice(-1)[0]}.</>,
                "Saffire I to III pressure comes from a NASA paper's flight-level table (100 kPa), not from the PSI tables, and is labelled \"from a NASA paper\".",
                `Saffire IV to VI values (${published} samples) are hand-transcribed from NASA papers and marked "Published paper". They still need a cell-by-cell check against the PDFs by a second person.`,
                "Fuel category and safety pillars are the team's own classification, labelled \"team assessment\" with the reason.",
                `Data held varies: ${summaries.map((s) => s.title).join(", ")} are summaries, not runs, and are never plotted as runs.`,
              ]}
            />
          </Section>

          <Section title="Sources">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1 pr-2 font-normal">Investigation</th>
                    <th className="py-1 pr-2 font-normal">Data held</th>
                    <th className="py-1 pr-2 text-right font-normal">Runs</th>
                    <th className="py-1 font-normal">Citation</th>
                  </tr>
                </thead>
                <tbody>
                  {investigations.map((i) => (
                    <tr key={i.id} className="border-t border-border/60 align-top">
                      <td className="py-1.5 pr-2">
                        <Link href={`/explore?id=${i.id}`} className="text-link hover:underline">
                          {i.acronym}
                        </Link>
                        <span className="block text-muted-foreground">{i.accession ?? "NASA papers"}</span>
                      </td>
                      <td className="py-1.5 pr-2">{DATA_LEVEL_LABEL[i.dataLevel]}</td>
                      <td className="tabular py-1.5 pr-2 text-right">{i.runCount}</td>
                      <td className="py-1.5 text-muted-foreground">
                        {i.citation.doi ? (
                          <a href={`https://doi.org/${i.citation.doi}`} target="_blank" rel="noreferrer" className="text-link hover:underline">
                            doi:{i.citation.doi}
                          </a>
                        ) : i.citation.pageUrl ? (
                          <a href={i.citation.pageUrl} target="_blank" rel="noreferrer" className="text-link hover:underline">
                            {i.accession ? "PSI page (no DOI found)" : "NTRS paper"}
                          </a>
                        ) : (
                          "–"
                        )}
                        {i.citation.licence && <span className="ml-1">· {i.citation.licence.toUpperCase()}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Investigation text (objectives, approach, hardware, earth benefits) is retrieved from the PSI search service that psi.nasa.gov
              uses. Licences are from DataCite records; 16 of 19 PSI records list CC0 1.0, and three list none (PSI-10, PSI-20, PSI-22).
              Five PSI ground investigations are not included. Raw video and image folders were not used.
            </p>
          </Section>

          <Section title="Coverage method">
            <p>
              The habitat and readiness pages compare an atmosphere with real runs only. Distance between a run and the atmosphere is{" "}
              {code(`hypot(ΔO2/${RUN_SCALE.o2}, Δpsi/${RUN_SCALE.psi})`)}, so {RUN_SCALE.o2} points of O2 count the same as {RUN_SCALE.psi} psi.
            </p>
            <Bullets
              items={[
                `Tested: a same-category run within ±${TESTED_TOLERANCE.o2}% O2 and ±${TESTED_TOLERANCE.psi} psi.`,
                `Near tested runs: none that close, but the nearest is within distance ${NEAR_DISTANCE}.`,
                "Not tested: runs exist in the category, none near this atmosphere.",
                "No run data: the category has no runs with both O2 and pressure (true for gaseous fuels: the gas-flame tables in PSI are summaries or schedules).",
                "Gravity is not matched: every run here was in microgravity.",
                "Nearest runs are neighbours to read, not a prediction. FireSight does not estimate ignition probability or flame spread.",
              ]}
            />
            <p className="text-xs text-muted-foreground">
              Scenario presets cite where their atmosphere comes from; {scenarios.filter((s) => !s.source).length} of {scenarios.length} are marked
              &quot;citation needed&quot;.
            </p>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Ranking method">
            <p>
              Each investigation gets four components in [0, 1] for the chosen condition. The score is their weighted mean, and the Habitat page
              shows every component so the order can be challenged and the weights changed.
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 font-normal">Component</th>
                  <th className="py-1 font-normal">Weight</th>
                  <th className="py-1 font-normal">Definition</th>
                </tr>
              </thead>
              <tbody>
                {RANKING_COMPONENTS.map((k) => (
                  <tr key={k} className="border-t border-border/60 align-top">
                    <td className="py-1.5 pr-2">{RANKING_LABEL[k]}</td>
                    <td className="tabular py-1.5">{DEFAULT_RANKING_WEIGHTS[k].toFixed(2)}</td>
                    <td className="py-1.5 text-muted-foreground">{RANKING_DEFINITION[k]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Similarity method">
            <p>
              Weighted Jaccard similarity over set-valued attributes. Components where both records are empty are skipped and the remaining
              weights renormalized. A link is labelled &quot;PSI-listed relation&quot; when either PSI record lists the other as related;
              otherwise by its strongest shared component.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {SIMILARITY_KEYS.map((k) => (
                <span key={k} className="rounded-md border border-border px-2 py-1">
                  {SIMILARITY_LABEL[k]} <span className="tabular text-muted-foreground">{DEFAULT_SIMILARITY_WEIGHTS[k].toFixed(2)}</span>
                </span>
              ))}
            </div>
          </Section>

          <Section title="SI layer">
            <Bullets
              items={[
                <>Main model {code(modelMain)} writes summaries, comparisons, habitat interpretations, readiness notes and Q&amp;A; the fast model {code(modelFast)} explains graph links.</>,
                "All calls run in server-side route handlers; the API key never reaches the browser.",
                "Prompts require answers grounded only in the provided records, citations by investigation and run id, plain statements of which fields are missing, the basis of any outcome, and no invented numbers or predictions.",
                "Structured calls return JSON validated with zod and retried once with the error; habitat evidence may only cite ids from the ranked list sent.",
                "Outputs are cached in data/cache by a hash of model, prompt version and grounded input. USE_CACHE_ONLY=true serves cached results only, for an offline demo.",
              ]}
            />
          </Section>

          <Section title="Open items">
            <Bullets
              items={[
                "Saffire IV to VI: second-person check of every transcribed value; confirm sample VI-2's 409 kJ total is not a copy of IV-1's.",
                "Reuse terms for NASA NTRS papers and for PSI-10, PSI-20 and PSI-22 (no licence listed).",
                "Citations for the rover, Mars transit and spacesuit atmospheres.",
              ]}
            />
          </Section>

          <Alert className="border-[#ec835a]/40 bg-[#ec835a]/10">
            <ShieldAlert className="text-[#ec835a]" aria-hidden />
            <AlertTitle>Supports engineering judgment; does not replace standards</AlertTitle>
            <AlertDescription>
              FireSight shows what has and has not been tested in the NASA data we examined. It does not replace NASA flammability standards such
              as NASA-STD-6001, certified material testing, or the judgment of fire safety engineers.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </>
  );
}
