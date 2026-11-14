import { ATM_TO_PSI, ISS_NOMINAL_PRESSURE_PSI, ISS_NOMINAL_SOURCE, KPA_TO_PSI, PSI_TO_KPA } from "@/lib/constants";
import { BASS_OUTCOME_REVIEW } from "@/lib/real/bass-outcome-review";
import { materialClassForFuel } from "@/lib/materials";
import {
  effectivePressurePsi,
  type Category,
  type DataLevel,
  type Investigation,
  type Outcome,
  type Run,
  type SafetyPillar,
  type Summary,
} from "@/lib/schema";

/**
 * Turn the extracted files in data/real/ into the common run and investigation records.
 * Pure functions: the build script reads files and calls these; tests call them directly.
 * Rules: copy, convert units, or leave null. Never fill a missing value.
 */

const r2 = (v: number) => Math.round(v * 100) / 100;
const r1 = (v: number) => Math.round(v * 10) / 10;

type Required_ = "id" | "investigationId" | "dataSource" | "sourceKind" | "source" | "category";
type RunInit = Pick<Run, Required_> & Partial<Omit<Run, Required_>>;

/** Fill the optional fields with explicit nulls so every run has the same shape. */
function run(p: RunInit): Run {
  const material = p.material ?? null;
  return {
    date: null,
    material,
    materialClass: p.materialClass ?? materialClassForFuel(material),
    o2Percent: null,
    o2Text: null,
    o2Approximate: false,
    pressurePsi: null,
    pressureKPa: null,
    pressureStatus: "not-recorded",
    pressureNote: null,
    pressureAssumedPsi: null,
    pressureAssumedSource: null,
    flowMinCmS: null,
    flowMaxCmS: null,
    flowText: null,
    flowDirection: null,
    n2Percent: null,
    co2Percent: null,
    hePercent: null,
    outcome: "unknown",
    outcomeBasis: "none",
    outcomeText: null,
    metrics: {},
    flags: [],
    ...p,
  } as Run;
}

const flowFromList = (speeds: number[] | null | undefined) =>
  speeds && speeds.length ? { flowMinCmS: Math.min(...speeds), flowMaxCmS: Math.max(...speeds) } : {};

const issAssumed = {
  pressureAssumedPsi: ISS_NOMINAL_PRESSURE_PSI,
  pressureAssumedSource: ISS_NOMINAL_SOURCE,
};

// ------------------------------------------------------------------ BASS (PSI-26)

export type BassRow = {
  testId: string; sourceSheet: string; sourceRow: number; asRunTestNumber: string; date: string; dateSuspect?: boolean;
  material: string; airDisplayRaw: string; airSpeedsCmS: number[] | null; o2Percent: number | null; o2RawCell: number | null;
  pressureAtm: number | null; pressurePsi: number | null; co2MmHg: number | null; observationsRaw: string;
  flags: { noIgnition: boolean; extinguished: boolean; blowoff: boolean };
};

export function bassRuns(rows: BassRow[], file: string): Run[] {
  // The source sheet reuses some as-run test numbers; those rows get the sheet row appended.
  const seen = new Map<string, number>();
  for (const b of rows) seen.set(b.testId, (seen.get(b.testId) ?? 0) + 1);
  return rows.map((b) => {
    const repeated = (seen.get(b.testId) ?? 0) > 1;
    const id = repeated ? `${b.testId}-row${b.sourceRow}` : b.testId;
    const keywordOutcome: Outcome = b.flags.noIgnition ? "no-ignition" : b.flags.blowoff ? "blowoff" : b.flags.extinguished ? "extinguished" : "unknown";
    const review = BASS_OUTCOME_REVIEW[id];
    const outcome = review?.outcome ?? keywordOutcome;
    const flags = ["O2 converted from the source's fraction column (0.221 → 22.1%)"];
    if (b.dateSuspect) flags.push(`Date reads ${b.date} in the source; almost certainly a typo, kept as written`);
    if (repeated) flags.push(`As-run test number ${b.asRunTestNumber} appears on more than one row of the source sheet`);
    if (review) flags.push(`Outcome corrected by the team after reading the note ("${review.quote}"); the keyword match gave "${keywordOutcome}"`);
    return run({
      id,
      investigationId: "bass",
      dataSource: "psi",
      sourceKind: "psi-table",
      source: { file, ref: `sheet '${b.sourceSheet}', row ${b.sourceRow} (as-run test ${b.asRunTestNumber})` },
      category: "solid",
      date: b.date || null,
      material: b.material || null,
      o2Percent: b.o2Percent,
      pressurePsi: b.pressurePsi,
      pressureKPa: b.pressureAtm === null ? null : r1(b.pressureAtm * ATM_TO_PSI * PSI_TO_KPA),
      pressureStatus: b.pressurePsi === null ? "not-recorded" : "measured",
      pressureNote: b.pressureAtm === null ? null : `${b.pressureAtm} atm in the source`,
      ...flowFromList(b.airSpeedsCmS),
      flowText: b.airDisplayRaw || null,
      outcome,
      outcomeBasis: outcome === "unknown" ? "none" : "notes-keyword",
      outcomeText: b.observationsRaw || null,
      metrics: { co2MmHg: b.co2MmHg },
      flags,
    });
  });
}

// --------------------------------------------------------------- BASS-II (PSI-25)

export type Bass2Row = {
  testId: string; sourceSheet: string; sourceRow: number; testNumber: string; pi: string; date: string; material: string;
  airDisplayRaw: string; fanDisplayRaw: string; airSpeedsCmS: number[] | null; o2InitialPercent: number | null;
  o2FinalPercent: number | null; o2FinalSuspect: boolean; outcome: string; outcomeEvidence: string;
};

export function bass2Runs(rows: Bass2Row[], file: string): Run[] {
  return rows.map((b) => {
    const outcome: Outcome = b.outcome === "no-ignition" || b.outcome === "blowoff" || b.outcome === "extinguished" ? b.outcome : "unknown";
    const flags = ["Pressure is not recorded in the BASS-II test matrix"];
    if (b.o2FinalSuspect) flags.push(`Final O2 reading (${b.o2FinalPercent}%) looks like a sensor fault; the initial O2 is used`);
    return run({
      id: b.testId,
      investigationId: "bass-ii",
      dataSource: "psi",
      sourceKind: "psi-table",
      source: { file, ref: `tab '${b.sourceSheet}', row ${b.sourceRow} (test ${b.testNumber})` },
      category: "solid",
      date: b.date || null,
      material: b.material || null,
      o2Percent: b.o2InitialPercent,
      pressureStatus: "not-recorded",
      ...issAssumed,
      ...flowFromList(b.airSpeedsCmS),
      flowText: b.airDisplayRaw || null,
      outcome,
      outcomeBasis: outcome === "unknown" ? "none" : "notes-keyword",
      outcomeText: b.outcomeEvidence || null,
      metrics: { o2FinalPercent: b.o2FinalPercent },
      flags,
    });
  });
}

// ------------------------------------------------------------------ FLEX (PSI-69)

export type FlexRow = {
  testId: string; sourceRow: number; flexTestNumber: string; flexIdentifier: string; dateRaw: string; fuel: string;
  pressureMmHg: number | null; pressureInvalid: boolean; pressurePsi: number | null; o2Percent: number | null;
  n2Percent: number | null; co2PercentAsLabelledCO: number | null; hePercent: number | null;
  dropletInitialDiameterMm: number | null; extinctionDiameterMm: number | null; burningRate: number | null;
  burnTimeS: number | null; testEnd: string;
};

const FLEX_END: Record<string, Outcome> = { Extinction: "extinguished", Completion: "burned", Disruption: "disruption" };

export function flexRuns(rows: FlexRow[], file: string): Run[] {
  return rows.map((f) => {
    const outcome = FLEX_END[f.testEnd] ?? "unknown";
    const flags: string[] = [];
    if ((f.co2PercentAsLabelledCO ?? 0) > 0) {
      flags.push("Diluent labelled 'CO' in the PSI table; the FLEX Test Plan (Tables 8 and 9) identifies the suppressant as CO2");
    }
    if (f.pressureInvalid) flags.push("Source pressure is 0 mmHg (impossible); treated as missing");
    const gas = [f.o2Percent, f.n2Percent, f.co2PercentAsLabelledCO, f.hePercent];
    if (gas.every((g) => g !== null)) {
      const sum = gas.reduce<number>((a, g) => a + (g as number), 0);
      if (Math.abs(sum - 100) > 1.5) flags.push(`Gas composition in the source sums to ${sum}%`);
    }
    return run({
      id: f.testId,
      investigationId: "flex",
      dataSource: "psi",
      sourceKind: "psi-table",
      source: { file, ref: `row ${f.sourceRow} (FLEX test ${f.flexTestNumber}, ${f.flexIdentifier})` },
      category: "liquid",
      date: f.dateRaw || null,
      material: f.fuel || null,
      o2Percent: f.o2Percent,
      pressurePsi: f.pressurePsi,
      pressureKPa: f.pressurePsi === null ? null : r1(f.pressurePsi * PSI_TO_KPA),
      pressureStatus: f.pressurePsi === null ? "not-recorded" : "measured",
      pressureNote: f.pressureMmHg === null ? null : `${f.pressureMmHg} mmHg in the source`,
      n2Percent: f.n2Percent,
      co2Percent: f.co2PercentAsLabelledCO,
      hePercent: f.hePercent,
      outcome,
      outcomeBasis: outcome === "unknown" ? "none" : "source-field",
      outcomeText: f.testEnd ? `Test end: ${f.testEnd}` : null,
      metrics: {
        dropletInitialDiameterMm: f.dropletInitialDiameterMm,
        extinctionDiameterMm: f.extinctionDiameterMm,
        burningRate: f.burningRate,
        burnTimeS: f.burnTimeS,
      },
      flags,
    });
  });
}

// ------------------------------------------------------------------- CFI (PSI-39)

export type CfiRow = {
  testId: string; flexNumber: string; dateRaw: string; fuelRaw: string; fiberSupport: boolean | null;
  pressureAtm: number | null; pressurePsi: number | null; o2Percent: number | null; n2Percent: number | null;
  hePercent: number | null; compositionSumPercent: number | null; dropletInitialDiameterMm: number | null;
  hotFlameExtinctionDiameterMm: number | null; coolFlameExtinctionDiameterMm: number | null;
  hotFlameBurnTimeS: number | null; commentsRaw: string;
};

export function cfiRuns(rows: CfiRow[], file: string): Run[] {
  return rows.map((c) => {
    const cool = c.coolFlameExtinctionDiameterMm !== null;
    const flags: string[] = [];
    if (c.compositionSumPercent !== null && Math.abs(c.compositionSumPercent - 100) > 1.5) {
      flags.push(`Gas composition in the source sums to ${c.compositionSumPercent}%`);
    }
    if (c.fiberSupport) flags.push("Droplet held on a support fiber");
    return run({
      id: c.testId.toLowerCase(),
      investigationId: "cfi",
      dataSource: "psi",
      sourceKind: "psi-table",
      source: { file, ref: `sheets Master/DATA/Igniter/Comments, Flex Number ${c.flexNumber}` },
      category: "liquid",
      date: c.dateRaw || null,
      material: c.fuelRaw || null,
      o2Percent: c.o2Percent,
      pressurePsi: c.pressurePsi,
      pressureKPa: c.pressureAtm === null ? null : r1(c.pressureAtm * ATM_TO_PSI * PSI_TO_KPA),
      pressureStatus: c.pressurePsi === null ? "not-recorded" : "measured",
      pressureNote: c.pressureAtm === null ? null : `${c.pressureAtm} atm in the source`,
      n2Percent: c.n2Percent,
      hePercent: c.hePercent,
      // A cool-flame extinction diameter in the DATA sheet means a cool flame burned and then went out.
      outcome: cool ? "cool-flame" : "unknown",
      outcomeBasis: cool ? "source-field" : "none",
      outcomeText: c.commentsRaw || null,
      metrics: {
        dropletInitialDiameterMm: c.dropletInitialDiameterMm,
        hotFlameExtinctionDiameterMm: c.hotFlameExtinctionDiameterMm,
        coolFlameExtinctionDiameterMm: c.coolFlameExtinctionDiameterMm,
        hotFlameBurnTimeS: c.hotFlameBurnTimeS,
      },
      flags,
    });
  });
}

// ------------------------------------------------------------ Saffire I-VI

export type ThinRow = { sample: string; airFlowCmS: number; o2Percent: number; pressureKPa: number };
export type SaffireIvViFile = {
  sources: Record<string, { paper: string; tableNumber?: string; pageNumber?: number | null }>;
  samples: Array<{
    sampleId: string; flight: string; material: string; lengthCm: number; airFlowCmS: number; flowDirection: string;
    pressureKPa: number; pressurePsi: number; o2MolPercent: number; burnDurationS?: number;
    oxygenCalorimetry?: { peakHeatReleaseW: number | null; totalHeatReleasekJ: number | null };
    fuelCalorimetry?: { averageHeatReleaseW: number | null; totalHeatReleasekJ: number | null };
    maxTempSfuOutletC?: number; ffdInletCo2IncreasePpm?: number; ffdInletCoIncreasePpm?: number;
    sources: string[]; checks: string[];
  }>;
  thinSampleTable: { rows: ThinRow[] };
};

const tableRef = (f: SaffireIvViFile, key: string) => {
  const s = f.sources[key];
  if (!s) return key;
  return `${s.paper}, ${s.tableNumber ?? ""}${s.pageNumber ? `, p. ${s.pageNumber}` : ""}`.replace(/, ,/g, ",");
};

/** Flight-level pressure for Saffire I-III from the IV-V paper's thin-sample table (100 kPa rows). */
function flightPressure(paper: SaffireIvViFile, flightPrefix: "I" | "II" | "III") {
  const row = paper.thinSampleTable.rows.find((r) => r.sample.split("-")[0] === flightPrefix);
  if (!row) return {};
  return {
    pressureKPa: row.pressureKPa,
    pressurePsi: r2(row.pressureKPa * KPA_TO_PSI),
    pressureStatus: "paper" as const,
    pressureNote: `Flight-level value: ${tableRef(paper, "tableE")} lists ${row.pressureKPa} kPa for sample ${row.sample} of this flight`,
  };
}

export type SaffireIRow = {
  testId: string; sourceRow: number; sampleNumber: string; material: string; thicknessCm: number | null; lengthCm: number | null;
  widthCm: number | null; airFlowCmS: number | null; o2PercentRaw: string; o2PercentMin: number | null; o2PercentMax: number | null;
  ignitionPowerW: number | null; ignitionTimeS: number | null; burnTimeS: number | null; flowDirection: string;
};

export function saffireIRuns(rows: SaffireIRow[], file: string, paper: SaffireIvViFile): Run[] {
  return rows.map((s) => {
    const exact = s.o2PercentMin !== null && s.o2PercentMin === s.o2PercentMax;
    const o2 = s.o2PercentMin === null || s.o2PercentMax === null ? null : r2((s.o2PercentMin + s.o2PercentMax) / 2);
    return run({
      id: s.testId,
      investigationId: "saffire-i",
      dataSource: "psi",
      sourceKind: "psi-table",
      source: { file, ref: `row ${s.sourceRow} (sample ${s.sampleNumber})` },
      category: "solid",
      material: s.material,
      o2Percent: o2,
      o2Text: s.o2PercentRaw,
      o2Approximate: s.o2PercentRaw.includes("~") || !exact,
      ...flightPressure(paper, "I"),
      flowMinCmS: s.airFlowCmS,
      flowMaxCmS: s.airFlowCmS,
      flowDirection: s.flowDirection,
      outcome: s.burnTimeS ? "burned" : "unknown",
      outcomeBasis: s.burnTimeS ? "source-field" : "none",
      outcomeText: s.burnTimeS ? `Burn time ${s.burnTimeS} s in the PSI table` : null,
      metrics: { burnTimeS: s.burnTimeS, ignitionPowerW: s.ignitionPowerW, ignitionTimeS: s.ignitionTimeS, lengthCm: s.lengthCm, widthCm: s.widthCm, thicknessCm: s.thicknessCm },
      flags: [
        ...(exact ? [] : [`O2 stated as "${s.o2PercentRaw}"; plotted at the midpoint`]),
        "Length and width appear swapped in this PSI table (the IV-V paper gives width 41 cm, length 94 cm)",
      ],
    });
  });
}

export type SaffireIIRow = {
  testId: string; sourceRow: number; sampleNumber: string; material: string | null; thicknessRaw: string; airFlowCmS: number | null;
  o2PercentRaw: string; o2PercentMin: number | null; o2PercentMax: number | null; o2Approximate: boolean;
  ignitionPowerW: number | null; ignitionTimeS: number | null; burnTimeRaw: string; burnTimeS: number | null; flowDirection: string;
  microgBurnLengthRaw: string; readmeTable1: { material: string; airFlowCmS: number } | null; sourceConflicts: string[];
};

export function saffireIIRuns(file: { notes: Record<string, string>; tests: SaffireIIRow[] }, fileName: string, paper: SaffireIvViFile): Run[] {
  return file.tests.map((s) => {
    const o2 = s.o2PercentMin === null || s.o2PercentMax === null ? null : r2((s.o2PercentMin + s.o2PercentMax) / 2);
    const paperRow = paper.thinSampleTable.rows.find((r) => r.sample === `II-${s.sampleNumber.split("-")[1]}`);
    const flags = [`O2 note in the source: ${file.notes.note1 ?? "derived value"}`, ...s.sourceConflicts.map((c) => `Sources disagree on ${c}`)];
    if (paperRow && paperRow.airFlowCmS !== s.airFlowCmS) {
      flags.push(`Air flow: the IV-V paper (${tableRef(paper, "tableE")}) gives ${paperRow.airFlowCmS} cm/s for ${paperRow.sample}`);
    }
    const burned = s.burnTimeS !== null && s.burnTimeS > 0;
    return run({
      id: s.testId,
      investigationId: "saffire-ii",
      dataSource: "psi",
      sourceKind: "psi-table",
      source: { file: fileName, ref: `row ${s.sourceRow} (sample ${s.sampleNumber})` },
      category: "solid",
      material: s.material ?? (s.readmeTable1 ? `${s.readmeTable1.material} (name from the Saffire-II readme)` : null),
      o2Percent: o2,
      o2Text: s.o2PercentRaw,
      o2Approximate: true,
      ...flightPressure(paper, "II"),
      flowMinCmS: s.airFlowCmS,
      flowMaxCmS: s.airFlowCmS,
      flowDirection: s.flowDirection,
      outcome: burned ? "burned" : "unknown",
      outcomeBasis: burned ? "source-field" : "none",
      outcomeText: `Burn time: ${s.burnTimeRaw}; microgravity burn length: ${s.microgBurnLengthRaw}`,
      metrics: { burnTimeS: s.burnTimeS, ignitionPowerW: s.ignitionPowerW, ignitionTimeS: s.ignitionTimeS },
      flags,
    });
  });
}

export type SaffireIIIRow = {
  testId: string; sourceRow: number; sampleNumber: string; material: string; thicknessCm: number | null; lengthCm: number | null;
  widthCm: number | null; airFlowCmS: number | null; flowDirection: string;
};

export function saffireIIIRuns(rows: SaffireIIIRow[], file: string, paper: SaffireIvViFile): Run[] {
  const paperRow = paper.thinSampleTable.rows.find((r) => r.sample.startsWith("III-"));
  return rows.map((s) =>
    run({
      id: s.testId,
      investigationId: "saffire-iii",
      dataSource: "psi",
      sourceKind: "psi-table",
      source: { file, ref: `row ${s.sourceRow} (sample ${s.sampleNumber})` },
      category: "solid",
      material: s.material,
      ...flightPressure(paper, "III"),
      flowMinCmS: s.airFlowCmS,
      flowMaxCmS: s.airFlowCmS,
      flowDirection: s.flowDirection,
      metrics: { lengthCm: s.lengthCm, widthCm: s.widthCm, thicknessCm: s.thicknessCm },
      flags: [
        "O2 is not recorded in the Saffire-III PSI table",
        ...(paperRow && paperRow.airFlowCmS !== s.airFlowCmS
          ? [`Air flow: the IV-V paper (${tableRef(paper, "tableE")}) gives ${paperRow.airFlowCmS} cm/s for ${paperRow.sample}`]
          : []),
      ],
    })
  );
}

export function saffireIvViRuns(paper: SaffireIvViFile, file: string): Run[] {
  return paper.samples.map((s) => {
    const burned = typeof s.burnDurationS === "number" && s.burnDurationS > 0;
    return run({
      id: `saffire-${s.sampleId.toLowerCase()}`,
      investigationId: "saffire-iv-vi",
      dataSource: "published",
      sourceKind: "paper",
      source: { file, ref: s.sources.map((k) => tableRef(paper, k)).join("; ") },
      category: "solid",
      material: s.material,
      o2Percent: s.o2MolPercent,
      pressurePsi: s.pressurePsi,
      pressureKPa: s.pressureKPa,
      pressureStatus: "paper",
      flowMinCmS: s.airFlowCmS,
      flowMaxCmS: s.airFlowCmS,
      flowDirection: s.flowDirection,
      outcome: burned ? "burned" : "unknown",
      outcomeBasis: burned ? "source-field" : "none",
      outcomeText: burned ? `Burn duration ${s.burnDurationS} s (${tableRef(paper, "tableB")})` : null,
      metrics: {
        burnDurationS: s.burnDurationS ?? null,
        lengthCm: s.lengthCm,
        peakHeatReleaseW: s.oxygenCalorimetry?.peakHeatReleaseW ?? null,
        averageHeatReleaseW: s.fuelCalorimetry?.averageHeatReleaseW ?? null,
        maxTempSfuOutletC: s.maxTempSfuOutletC ?? null,
        co2IncreasePpm: s.ffdInletCo2IncreasePpm ?? null,
        coIncreasePpm: s.ffdInletCoIncreasePpm ?? null,
      },
      flags: ["Hand-transcribed from a published NASA paper; not in the PSI archive", ...s.checks.filter((c) => c.startsWith("VERIFY"))],
    });
  });
}

// ------------------------------------------------------------ investigations

export type PsiRecord = {
  accession: string; title: string; acronym: string; projectType: string; flightPlatform: string; subResearchArea: string;
  relatedInvestigations: string[]; startDate: string; endDate: string; monitoringCenter: string; keywords: string;
  objectives: string; approach: string; hypothesis: string; earthBenefits: string;
  hardware: Array<{ name: string; links: string[] }>; publicationTitlesRaw: string; pageUrl: string;
};

export type CitationRecord = {
  accession: string; doi: string | null; citationText: string | null; licenceIdentifiers?: string[]; pageUrl?: string | null;
};

/** Team classification per investigation. The basis is shown wherever the classification is used. */
export type InvestigationConfig = {
  id: string;
  accession: string | null;
  category: Category;
  categoryBasis: string;
  pillars: SafetyPillar[];
  pillarBasis: string;
};

const HARDWARE_TAGS: ReadonlyArray<[string, RegExp]> = [
  ["CIR", /Combustion Integrated Rack|\bCIR\b/i],
  ["ACME", /\bACME\b|Advanced Combustion via Microgravity/i],
  ["MDCA", /\bMDCA\b|Droplet Combustion Ap/i],
  ["MSG", /Microgravity Science Glovebox|\bMSG\b/i],
  ["Cygnus / Saffire enclosure", /Cygnus|Saffire/i],
  ["TSI P-Trak", /P-Trak/i],
  ["Comparative soot diagnostic hardware", /Soot Diagnostic/i],
];

export function hardwareTags(names: string[]): string[] {
  const text = names.join(" ");
  return HARDWARE_TAGS.filter(([, re]) => re.test(text)).map(([tag]) => tag);
}

const tidyFuel = (s: string) => s.replace(/\s+/g, " ").trim();

function rangeOf(values: number[]) {
  return values.length ? { min: Math.min(...values), max: Math.max(...values) } : null;
}

export function buildInvestigation(args: {
  config: InvestigationConfig;
  psi: PsiRecord | null;
  published?: { acronym: string; name: string; platform: string; objectives: string; startDate: string; endDate: string; pageUrl: string };
  citation: CitationRecord | null;
  runs: Run[];
  summaries: Summary[];
  knownIssues: string[];
  summaryFuels: string[];
}): Investigation {
  const { config, psi, published, citation, runs, summaries } = args;
  const placeable = runs.filter((r) => r.o2Percent !== null);
  const pressures = runs.map((r) => effectivePressurePsi(r)).filter((v): v is number => v !== null);
  const flows = runs.flatMap((r) => [r.flowMinCmS, r.flowMaxCmS]).filter((v): v is number => v !== null);
  const level: DataLevel = runs.length ? "runs" : (summaries[0]?.kind ?? "metadata-only");
  const fuels = [...new Set([...runs.map((r) => r.material), ...args.summaryFuels].filter((f): f is string => !!f).map(tidyFuel))].slice(0, 24);
  const acronym = psi?.acronym || published?.acronym || config.id;
  const project = /^ACME/i.test(acronym) ? "ACME" : /saffire/i.test(acronym) ? "Saffire" : "Standalone";
  const licence = citation?.licenceIdentifiers?.length ? citation.licenceIdentifiers.join(", ") : null;
  return {
    id: config.id,
    accession: config.accession,
    acronym: acronym.replace(/^SAFFIRE/, "Saffire"),
    name: psi?.title ?? published?.name ?? config.id,
    project,
    platform: psi?.flightPlatform ?? published?.platform ?? "",
    projectType: psi?.projectType ?? "Microgravity investigation (published results)",
    subResearchArea: psi?.subResearchArea ?? "",
    startDate: psi?.startDate ?? published?.startDate ?? "",
    endDate: psi?.endDate ?? published?.endDate ?? "",
    monitoringCenter: psi?.monitoringCenter ?? "",
    objectives: psi?.objectives ?? published?.objectives ?? "",
    approach: psi?.approach ?? "",
    hypothesis: psi?.hypothesis ?? "",
    earthBenefits: psi?.earthBenefits ?? "",
    keywords: psi?.keywords ?? "",
    hardware: psi?.hardware ?? [],
    hardwareTags: hardwareTags((psi?.hardware ?? []).map((h) => h.name)),
    relatedAccessions: psi?.relatedInvestigations ?? [],
    publicationTitlesRaw: psi?.publicationTitlesRaw ?? "",
    category: config.category,
    categoryBasis: config.categoryBasis,
    dataLevel: level,
    runCount: runs.length,
    fuels,
    ranges: {
      o2Percent: rangeOf(placeable.map((r) => r.o2Percent as number)),
      pressurePsi: rangeOf(pressures),
      pressureIncludesAssumed: runs.some((r) => r.pressurePsi === null && r.pressureAssumedPsi !== null),
      flowCmS: rangeOf(flows),
    },
    teamAssessment: { safetyPillars: config.pillars, basis: config.pillarBasis },
    citation: {
      doi: citation?.doi ?? null,
      text: citation?.citationText ?? null,
      licence,
      pageUrl: psi?.pageUrl ?? published?.pageUrl ?? null,
    },
    knownIssues: args.knownIssues,
    dataSource: config.accession ? "psi" : "published",
  };
}
