import {
  bass2Runs,
  bassRuns,
  buildInvestigation,
  cfiRuns,
  flexRuns,
  saffireIIIRuns,
  saffireIIRuns,
  saffireIRuns,
  saffireIvViRuns,
  type Bass2Row,
  type BassRow,
  type CfiRow,
  type CitationRecord,
  type FlexRow,
  type InvestigationConfig,
  type PsiRecord,
  type SaffireIIIRow,
  type SaffireIIRow,
  type SaffireIRow,
  type SaffireIvViFile,
} from "@/lib/real/normalize";
import type { Investigation, Run, Summary } from "@/lib/schema";

/** The parsed contents of data/real/*.json, keyed by file name without extension. */
export type RealFiles = {
  "psi-investigations": { records: PsiRecord[] };
  citations: { records: CitationRecord[] };
  "source-registry": { datasets: Array<{ id: string; knownIssues: string[] }> };
  "bass-tests": BassRow[];
  "bass-ii-tests": Bass2Row[];
  "flex-tests": FlexRow[];
  "cfi-tests": CfiRow[];
  "saffire-i-tests": SaffireIRow[];
  "saffire-ii-tests": { notes: Record<string, string>; tests: SaffireIIRow[] };
  "saffire-iii-tests": SaffireIIIRow[];
  "saffire-iv-vi-tests": SaffireIvViFile & { note: string };
  "flex-2-design": { note: string; sourceFile: string; fuels: Array<{ fuelRaw: string }> };
  "bre-test-days": { note: string; sourceFile: string; testDays: Array<{ fuelBottleRaw: string }>; totals: unknown };
  "spice-envelope": { note: string; sourceFile: string; fuelLabelsAsWritten: Record<string, number>; rows: number };
  "slice-schedule": { note: string; sourceFile: string; testDays: Array<{ fuelCellRaw: string }> };
};

export const REAL_FILE_NAMES = [
  "psi-investigations", "citations", "source-registry", "bass-tests", "bass-ii-tests", "flex-tests", "cfi-tests",
  "saffire-i-tests", "saffire-ii-tests", "saffire-iii-tests", "saffire-iv-vi-tests", "flex-2-design", "bre-test-days",
  "spice-envelope", "slice-schedule",
] as const satisfies ReadonlyArray<keyof RealFiles>;

const TEAM = "Team classification";
const PSI_SOLID = `${TEAM}: the PSI objectives describe burning solid samples (fabrics, plastics).`;
const PSI_LIQUID = `${TEAM}: the PSI objectives describe burning liquid-fuel droplets.`;
const PSI_GAS = `${TEAM}: the PSI sub-research area and objectives describe gaseous-fuel flames.`;
const PSI_SMOKE = `${TEAM}: the PSI objectives describe measuring smoke particles, not burning a fuel.`;
const NO_PILLAR = "Fundamental flame research; the team did not assign a fire-safety pillar.";
const FLAMMABILITY = "Team assessment: the PSI objectives study how readily materials ignite and spread flame (prevention).";

/** Every microgravity combustion investigation in PSI plus the published Saffire IV-VI results. */
export const INVESTIGATION_CONFIG: InvestigationConfig[] = [
  { id: "acme-flame-design", accession: "PSI-10", category: "gas", categoryBasis: PSI_GAS, pillars: [], pillarBasis: NO_PILLAR },
  { id: "bre", accession: "PSI-20", category: "gas", categoryBasis: PSI_GAS, pillars: [], pillarBasis: NO_PILLAR },
  { id: "cld-flame", accession: "PSI-21", category: "gas", categoryBasis: PSI_GAS, pillars: [], pillarBasis: NO_PILLAR },
  { id: "e-field-flames", accession: "PSI-22", category: "gas", categoryBasis: PSI_GAS, pillars: [], pillarBasis: NO_PILLAR },
  { id: "s-flame", accession: "PSI-23", category: "gas", categoryBasis: PSI_GAS, pillars: [], pillarBasis: NO_PILLAR },
  {
    id: "bass-ii", accession: "PSI-25", category: "solid", categoryBasis: PSI_SOLID, pillars: ["prevention", "suppression"],
    pillarBasis: "Team assessment from the investigation name, 'Burning and Suppression of Solids II'.",
  },
  {
    id: "bass", accession: "PSI-26", category: "solid", categoryBasis: PSI_SOLID, pillars: ["prevention", "suppression"],
    pillarBasis: "Team assessment: the PSI objectives cover material flammability and assessing extinguishment.",
  },
  { id: "cfi", accession: "PSI-39", category: "liquid", categoryBasis: PSI_LIQUID, pillars: ["prevention"], pillarBasis: FLAMMABILITY },
  {
    id: "daft", accession: "PSI-47", category: "smoke-dust", categoryBasis: PSI_SMOKE, pillars: ["detection"],
    pillarBasis: "Team assessment: the PSI earth-benefits text names fire and smoke detection systems.",
  },
  { id: "flex-2", accession: "PSI-68", category: "liquid", categoryBasis: PSI_LIQUID, pillars: [], pillarBasis: NO_PILLAR },
  {
    id: "flex", accession: "PSI-69", category: "liquid", categoryBasis: PSI_LIQUID, pillars: ["prevention", "suppression"],
    pillarBasis: "Team assessment: the PSI objectives map flammability limits and measure gaseous suppressants (CO2, He, SF6).",
  },
  { id: "saffire-i", accession: "PSI-98", category: "solid", categoryBasis: PSI_SOLID, pillars: ["prevention"], pillarBasis: FLAMMABILITY },
  { id: "saffire-ii", accession: "PSI-99", category: "solid", categoryBasis: PSI_SOLID, pillars: ["prevention"], pillarBasis: FLAMMABILITY },
  { id: "saffire-iii", accession: "PSI-100", category: "solid", categoryBasis: PSI_SOLID, pillars: ["prevention"], pillarBasis: FLAMMABILITY },
  {
    id: "same-r", accession: "PSI-101", category: "smoke-dust", categoryBasis: PSI_SMOKE, pillars: ["detection"],
    pillarBasis: "Team assessment: the PSI earth-benefits text names an advanced fire detector.",
  },
  {
    id: "same", accession: "PSI-102", category: "smoke-dust", categoryBasis: PSI_SMOKE, pillars: ["detection"],
    pillarBasis: "Team assessment: the PSI earth-benefits text names an advanced fire detector.",
  },
  { id: "slice", accession: "PSI-106", category: "gas", categoryBasis: PSI_GAS, pillars: [], pillarBasis: NO_PILLAR },
  {
    id: "spice", accession: "PSI-107", category: "gas", categoryBasis: PSI_GAS, pillars: ["prevention"],
    pillarBasis: "Team assessment: PSI files SPICE under 'Fire Safety' and its earth-benefits text mentions safer spacecraft environments.",
  },
  { id: "cfi-g", accession: "PSI-159", category: "gas", categoryBasis: PSI_GAS, pillars: [], pillarBasis: NO_PILLAR },
  {
    id: "saffire-iv-vi", accession: null, category: "solid",
    categoryBasis: `${TEAM}: the papers describe burning large solid samples (fabric, PMMA, Nomex and others).`,
    pillars: ["prevention", "detection"],
    pillarBasis: "Team assessment: flammability of large samples (prevention); NASA's Saffire overview says the flights also exercised fire detection.",
  },
];

const SAFFIRE_IV_VI_META = {
  acronym: "Saffire IV-VI",
  name: "Spacecraft Fire Safety Demonstration (Saffire) IV, V and VI: published results",
  platform: "Cygnus cargo vehicle, after leaving the ISS",
  objectives:
    "Not in the PSI combustion archive. Sample conditions and results are hand-transcribed from NASA papers ICES-2024-365 (NTRS 20240002981) and ICES 2021-266 (NTRS 20210011521) and the ICES 2024 slide deck (NTRS 20240007488).",
  startDate: "",
  endDate: "",
  pageUrl: "https://ntrs.nasa.gov/citations/20240002981",
};

const SAFFIRE_IV_VI_CITATION: CitationRecord = {
  accession: "",
  doi: null,
  citationText:
    "\"Preliminary Results from the Saffire VI Experiment\", ICES-2024-365, NASA NTRS 20240002981; \"Fire Safety Implications of Preliminary Results from Saffire IV and V Experiments on Large Scale Spacecraft Fires\", ICES 2021-266, NASA NTRS 20210011521",
  licenceIdentifiers: [],
};

const uniq =(xs: string[]) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))];

export function buildAll(f: RealFiles): { investigations: Investigation[]; runs: Run[]; summaries: Summary[] } {
  const paper = f["saffire-iv-vi-tests"];
  const runs: Run[] = [
    ...bassRuns(f["bass-tests"], "BASS test matrix.xlsx (PSI-26)"),
    ...bass2Runs(f["bass-ii-tests"], "BASS-II Test Matrix by PI Final.xlsx (PSI-25)"),
    ...flexRuns(f["flex-tests"], "PSI-69_Experimental table_FLEX.csv"),
    ...cfiRuns(f["cfi-tests"], "CFI_DataSummary_Spreadsheet_Jan2021.xlsx (PSI-39)"),
    ...saffireIRuns(f["saffire-i-tests"], "PSI-98_Experimental table_SAFFIRE-1.csv", paper),
    ...saffireIIRuns(f["saffire-ii-tests"], "PSI-99_Experimental table_SAFFIRE-2.csv", paper),
    ...saffireIIIRuns(f["saffire-iii-tests"], "PSI-100_Experimental table_SAFFIRE-3.csv", paper),
    ...saffireIvViRuns(paper, "Saffire IV-VI papers (NTRS 20240002981, 20240007488, 20210011521)"),
  ];

  const summaries: Summary[] = [
    {
      investigationId: "flex-2", kind: "planned-matrix", title: "FLEX-2 planned test matrix",
      note: f["flex-2-design"].note, sourceFile: f["flex-2-design"].sourceFile, data: f["flex-2-design"].fuels,
    },
    {
      investigationId: "bre", kind: "day-summary", title: "ACME BRE test days",
      note: f["bre-test-days"].note, sourceFile: f["bre-test-days"].sourceFile,
      data: { testDays: f["bre-test-days"].testDays, totals: f["bre-test-days"].totals },
    },
    {
      investigationId: "spice", kind: "log-summary", title: "SPICE burner operating log",
      note: f["spice-envelope"].note, sourceFile: f["spice-envelope"].sourceFile,
      data: { rows: f["spice-envelope"].rows, fuelLabelsAsWritten: f["spice-envelope"].fuelLabelsAsWritten },
    },
    {
      investigationId: "slice", kind: "schedule", title: "SLICE test-day schedule",
      note: f["slice-schedule"].note, sourceFile: f["slice-schedule"].sourceFile, data: f["slice-schedule"].testDays,
    },
  ];
  const summaryFuels: Record<string, string[]> = {
    "flex-2": uniq(f["flex-2-design"].fuels.map((x) => x.fuelRaw)),
    bre: uniq(f["bre-test-days"].testDays.map((x) => x.fuelBottleRaw)),
    spice: uniq(Object.keys(f["spice-envelope"].fuelLabelsAsWritten)),
    slice: uniq(f["slice-schedule"].testDays.map((x) => x.fuelCellRaw)),
  };

  const psiByAccession = new Map(f["psi-investigations"].records.map((r) => [r.accession, r]));
  const citationByAccession = new Map(f.citations.records.map((r) => [r.accession, r]));
  const issuesById = new Map(f["source-registry"].datasets.map((d) => [d.id, d.knownIssues]));

  const investigations = INVESTIGATION_CONFIG.map((config) => {
    const psi = config.accession ? psiByAccession.get(config.accession) ?? null : null;
    if (config.accession && !psi) throw new Error(`No PSI metadata for ${config.accession}`);
    return buildInvestigation({
      config,
      psi,
      published: config.accession ? undefined : SAFFIRE_IV_VI_META,
      citation: config.accession ? citationByAccession.get(config.accession) ?? null : SAFFIRE_IV_VI_CITATION,
      runs: runs.filter((r) => r.investigationId === config.id),
      summaries: summaries.filter((s) => s.investigationId === config.id),
      knownIssues: issuesById.get(config.id) ?? [],
      summaryFuels: summaryFuels[config.id] ?? [],
    });
  });

  return { investigations, runs, summaries };
}
