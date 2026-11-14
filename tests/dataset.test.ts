import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildAll } from "@/lib/real/build";
import { effectivePressurePsi, type Investigation, type Run } from "@/lib/schema";
import { validateDataset, validateSourceConversions } from "@/lib/validate";
import { readBuiltFiles, readRealFiles } from "./fixtures";
import { BASS_OUTCOME_REVIEW } from "@/lib/real/bass-outcome-review";

const real = readRealFiles();
const built = readBuiltFiles();
const report = validateDataset(built);
const runs = (report.data?.runs ?? []) as Run[];
const investigations = (report.data?.investigations ?? []) as Investigation[];

describe("built dataset", () => {
  it("passes schema and cross-file validation", () => {
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("is exactly what the build script produces from data/real (no hand edits, not stale)", () => {
    const fresh = buildAll(real);
    expect(fresh.investigations).toEqual(built.investigations);
    expect(fresh.runs).toEqual(built.runs);
    expect(fresh.summaries).toEqual(built.summaries);
  });

  it("holds the expected record counts", () => {
    expect(investigations).toHaveLength(20);
    expect(runs).toHaveLength(772);
    const by = (id: string) => runs.filter((r) => r.investigationId === id).length;
    expect([by("bass"), by("bass-ii"), by("flex"), by("cfi"), by("saffire-iv-vi")]).toEqual([121, 129, 274, 227, 8]);
  });
});

describe("provenance", () => {
  it("every run names its source file and the place in it", () => {
    for (const r of runs) {
      expect(r.source.file.length, r.id).toBeGreaterThan(0);
      expect(r.source.ref.length, r.id).toBeGreaterThan(0);
      expect(r.sourceKind, r.id).toBe(r.dataSource === "psi" ? "psi-table" : "paper");
    }
  });

  it("every PSI investigation has an accession and a PSI page; published records cite a paper", () => {
    for (const i of investigations) {
      if (i.dataSource === "psi") {
        expect(i.accession, i.id).toMatch(/^PSI-\d+$/);
        expect(i.citation.pageUrl, i.id).toContain("psi.nasa.gov");
      } else {
        expect(i.citation.text, i.id).toMatch(/NTRS/);
      }
    }
  });

  it("only Saffire IV-VI comes from papers", () => {
    expect(new Set(runs.filter((r) => r.dataSource === "published").map((r) => r.investigationId))).toEqual(new Set(["saffire-iv-vi"]));
  });
});

describe("no invented values", () => {
  it("an outcome is set only with a stated basis, and notes-based outcomes keep the notes", () => {
    for (const r of runs) {
      expect(r.outcome === "unknown", r.id).toBe(r.outcomeBasis === "none");
      if (r.outcomeBasis === "notes-keyword") expect(r.outcomeText, r.id).toBeTruthy();
    }
  });

  it("BASS outcomes match the keyword flags in the extracted file, or a reviewed correction that quotes the note", () => {
    const byRow = new Map(real["bass-tests"].map((b) => [b.sourceRow, b]));
    const bass = runs.filter((x) => x.investigationId === "bass");
    for (const r of bass) {
      const row = Number(/row (\d+)/.exec(r.source.ref)?.[1]);
      const b = byRow.get(row)!;
      const keyword = b.flags.noIgnition ? "no-ignition" : b.flags.blowoff ? "blowoff" : b.flags.extinguished ? "extinguished" : "unknown";
      const review = BASS_OUTCOME_REVIEW[r.id];
      expect(r.outcome, r.id).toBe(review?.outcome ?? keyword);
      if (review) {
        expect(review.outcome, r.id).not.toBe(keyword);
        expect(r.outcomeText?.includes(review.quote), `${r.id}: "${review.quote}"`).toBe(true);
        expect(r.flags.some((f) => f.startsWith("Outcome corrected by the team")), r.id).toBe(true);
      }
    }
    const ids = new Set(bass.map((r) => r.id));
    for (const id of Object.keys(BASS_OUTCOME_REVIEW)) expect(ids.has(id), id).toBe(true);
  });

  it("FLEX outcomes come only from the test-end column", () => {
    const end = new Map(real["flex-tests"].map((f) => [f.testId, f.testEnd]));
    const map: Record<string, string> = { Extinction: "extinguished", Completion: "burned", Disruption: "disruption" };
    for (const r of runs.filter((x) => x.investigationId === "flex")) expect(r.outcome, r.id).toBe(map[end.get(r.id)!] ?? "unknown");
  });

  it("pressure that is not recorded is never stored as a measured value", () => {
    for (const r of runs) {
      if (r.pressureStatus === "not-recorded") expect(r.pressurePsi, r.id).toBeNull();
      if (r.pressureAssumedPsi !== null) {
        expect(r.pressurePsi, r.id).toBeNull();
        expect(r.pressureAssumedSource, r.id).toMatch(/nasa\.gov/);
      }
    }
    expect(runs.filter((r) => r.pressureAssumedPsi !== null).every((r) => r.investigationId === "bass-ii")).toBe(true);
  });

  it("missing O2 stays missing (Saffire-III records none)", () => {
    for (const r of runs.filter((x) => x.investigationId === "saffire-iii")) expect(r.o2Percent).toBeNull();
  });

  it("investigations without runs have no ranges, and summaries never become runs", () => {
    for (const i of investigations.filter((x) => x.dataLevel !== "runs")) {
      expect(i.runCount).toBe(0);
      expect(i.ranges.o2Percent).toBeNull();
      expect(i.ranges.pressurePsi).toBeNull();
    }
    for (const id of ["bre", "flex-2", "spice", "slice"]) expect(runs.some((r) => r.investigationId === id)).toBe(false);
  });

  it("investigation ranges equal the min and max of their own runs", () => {
    const bass = investigations.find((i) => i.id === "bass")!;
    const own = runs.filter((r) => r.investigationId === "bass");
    const p = own.map(effectivePressurePsi).filter((v): v is number => v !== null);
    expect(bass.ranges.pressurePsi).toEqual({ min: Math.min(...p), max: Math.max(...p) });
  });

  it("contains none of the old synthetic fields or markers", () => {
    // The word "synthetic" itself appears in genuine PSI text ("synthetic air flow"), so check structure instead.
    const banned = /"dataSource":\s*"synthetic"|"habitatRelevance"|"keyFindings"|"earthApplications"|"ignited":|"ignitionProbability"/;
    const files = ["investigations.json", "runs.json", "summaries.json", "scenarios.json"];
    for (const f of files) expect(readFileSync(join("data", f), "utf8"), f).not.toMatch(banned);
    for (const f of readdirSync(join("data", "real"))) expect(readFileSync(join("data", "real", f), "utf8"), f).not.toMatch(banned);
  });
});

describe("unit conversions in the extracted files", () => {
  it("atm, mmHg and kPa values convert with the published factors", () => {
    expect(validateSourceConversions(real)).toEqual([]);
  });
});

describe("scenarios", () => {
  it("cite a source or say citation needed (null); the lunar preset cites the Saffire status paper", () => {
    const scenarios = (report.data?.scenarios ?? []) as Array<{ id: string; source: { url: string; detail: string } | null }>;
    const lunar = scenarios.find((s) => s.id === "lunar-base");
    expect(lunar?.source?.url).toContain("20170000230");
    expect(lunar?.source?.detail).toMatch(/page 7/);
  });
});
