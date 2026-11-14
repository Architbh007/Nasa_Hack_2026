import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REAL_FILE_NAMES, type RealFiles } from "@/lib/real/build";
import type { Investigation, Run } from "@/lib/schema";

/** The extracted NASA files in data/real/, parsed. */
export function readRealFiles(): RealFiles {
  return Object.fromEntries(
    REAL_FILE_NAMES.map((n) => [n, JSON.parse(readFileSync(join("data", "real", `${n}.json`), "utf8"))])
  ) as RealFiles;
}

/** The built app dataset in data/*.json, unparsed. */
export function readBuiltFiles() {
  const read = (n: string) => JSON.parse(readFileSync(join("data", `${n}.json`), "utf8")) as unknown;
  return { investigations: read("investigations"), runs: read("runs"), summaries: read("summaries"), scenarios: read("scenarios") };
}

/** Minimal valid run for unit tests; override fields per case. */
export function makeRun(overrides: Partial<Run> = {}): Run {
  return {
    id: "test-run",
    investigationId: "test-inv",
    dataSource: "psi",
    sourceKind: "psi-table",
    source: { file: "test.csv", ref: "row 2" },
    date: null,
    material: "PMMA",
    materialClass: "plastic",
    category: "solid",
    o2Percent: 21,
    o2Text: null,
    o2Approximate: false,
    pressurePsi: 14.7,
    pressureKPa: 101.4,
    pressureStatus: "measured",
    pressureNote: null,
    pressureAssumedPsi: null,
    pressureAssumedSource: null,
    flowMinCmS: 10,
    flowMaxCmS: 10,
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
    ...overrides,
  };
}

/** Minimal valid investigation for unit tests; override fields per case. */
export function makeInvestigation(overrides: Partial<Investigation> = {}): Investigation {
  return {
    id: "test-inv",
    accession: "PSI-1",
    acronym: "TI",
    name: "Test Investigation",
    project: "Standalone",
    platform: "International Space Station (ISS)",
    projectType: "Microgravity Investigation",
    subResearchArea: "",
    startDate: "",
    endDate: "",
    monitoringCenter: "",
    objectives: "",
    approach: "",
    hypothesis: "",
    earthBenefits: "",
    keywords: "",
    hardware: [],
    hardwareTags: [],
    relatedAccessions: [],
    publicationTitlesRaw: "",
    category: "solid",
    categoryBasis: "test",
    dataLevel: "runs",
    runCount: 10,
    fuels: ["PMMA"],
    ranges: { o2Percent: { min: 18, max: 25 }, pressurePsi: { min: 10, max: 14.7 }, pressureIncludesAssumed: false, flowCmS: { min: 5, max: 30 } },
    teamAssessment: { safetyPillars: ["prevention"], basis: "test" },
    citation: { doi: null, text: null, licence: null, pageUrl: null },
    knownIssues: [],
    dataSource: "psi",
    ...overrides,
  };
}
