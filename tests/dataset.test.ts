import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SYNTHETIC_SOLID_GAP } from "@/lib/constants";
import { computeRanges } from "@/lib/ranges";
import { validateDataset } from "@/lib/validate";
import { generateDataset } from "@/scripts/generator";

const read = (f: string): unknown => JSON.parse(readFileSync(`data/${f}`, "utf8"));
const seed = Number.parseInt(process.env.DATA_SEED ?? "42", 10);

describe("synthetic generator", () => {
  const a = generateDataset(seed);

  it("is reproducible from a fixed seed", () => {
    expect(generateDataset(seed)).toEqual(a);
    expect(generateDataset(seed + 1).tests).not.toEqual(a.tests);
  });

  it("produces 800-1200 runs with 20-60 per investigation", () => {
    expect(a.tests.length).toBeGreaterThanOrEqual(800);
    expect(a.tests.length).toBeLessThanOrEqual(1200);
    for (const inv of a.investigations) {
      const n = a.tests.filter((t) => t.investigationId === inv.id).length;
      expect(n).toBeGreaterThanOrEqual(20);
      expect(n).toBeLessThanOrEqual(60);
    }
  });

  it("passes schema and cross-file validation", () => {
    const report = validateDataset(a);
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("marks every record synthetic", () => {
    expect(a.investigations.every((i) => i.dataSource === "synthetic")).toBe(true);
    expect(a.tests.every((t) => t.dataSource === "synthetic")).toBe(true);
    expect(a.scenarios.every((s) => s.dataSource === "synthetic")).toBe(true);
  });

  it("leaves the deliberate solid-fuel coverage gap empty", () => {
    const solid = new Set(a.investigations.filter((i) => i.fuelPhase === "solid").map((i) => i.id));
    const inGap = a.tests.filter(
      (t) =>
        solid.has(t.investigationId) &&
        t.o2Percent >= SYNTHETIC_SOLID_GAP.o2Min &&
        t.o2Percent <= SYNTHETIC_SOLID_GAP.o2Max &&
        t.pressurePsi < SYNTHETIC_SOLID_GAP.pressureMaxPsi
    );
    expect(inGap).toEqual([]);
  });

  it("keeps investigation ranges equal to ranges computed from their tests", () => {
    for (const inv of a.investigations) {
      const c = computeRanges(a.tests.filter((t) => t.investigationId === inv.id));
      expect(inv.oxygenRange).toEqual(c.oxygenRange);
      expect(inv.pressureRange).toEqual(c.pressureRange);
      expect(inv.flowRange).toEqual(c.flowRange);
    }
  });

  it("produces smoke obscuration only where it is measured", () => {
    const withSmoke = new Set(a.tests.filter((t) => t.smokeObscurationPercent !== null).map((t) => t.investigationId));
    for (const id of withSmoke) {
      const inv = a.investigations.find((i) => i.id === id)!;
      expect(inv.measurements).toContain("Smoke obscuration photometer");
      expect(["same", "same-r"].includes(id) || inv.fuelPhase === "solid").toBe(true);
    }
  });

  it("gives extinction diameters only to droplet runs, shrinking with O2", () => {
    const droplet = new Set(["flex", "flex-2", "cfi"]);
    const withExt = a.tests.filter((t) => t.extinctionDiameterMm !== null);
    expect(withExt.every((t) => droplet.has(t.investigationId))).toBe(true);
    const undiluted = withExt.filter((t) => t.diluent === null && t.outcome !== "cool-flame");
    const ratio = (o2Max: number, o2Min: number) => {
      const r = undiluted.filter((t) => t.o2Percent >= o2Min && t.o2Percent < o2Max);
      return r.reduce((s, t) => s + t.extinctionDiameterMm! / t.sampleSizeMm, 0) / r.length;
    };
    expect(ratio(20, 0)).toBeGreaterThan(ratio(100, 28));
  });

  it("makes CO2 a stronger suppressant than helium at matched levels", () => {
    const suppressed = (d: string) => {
      const r = a.tests.filter((t) => t.diluent === d && (t.diluentPercent ?? 0) >= 15);
      return r.filter((t) => t.outcome === "quenched" || t.outcome === "no-ignition").length / r.length;
    };
    expect(suppressed("carbon dioxide")).toBeGreaterThan(suppressed("helium"));
  });

  it("records cool flames in the cool-flame investigations", () => {
    const cool = a.tests.filter((t) => t.outcome === "cool-flame");
    expect(cool.some((t) => t.investigationId === "cfi")).toBe(true);
    expect(cool.some((t) => t.investigationId === "cfi-g")).toBe(true);
  });

  it("shares the SAME particle counter name exactly with DAFT and DAFT-2", () => {
    const name = "TSI P-Trak ultrafine particle counter";
    for (const id of ["same", "same-r", "daft", "daft-2"]) {
      expect(a.investigations.find((i) => i.id === id)!.measurements).toContain(name);
    }
  });
});

const committedIsSynthetic = (read("investigations.json") as Array<{ dataSource: string }>).every(
  (i) => i.dataSource === "synthetic"
);

describe("committed data files", () => {
  // Skipped automatically once real PSI data (dataSource: "psi") replaces the synthetic files.
  it.skipIf(!committedIsSynthetic)("match the generator output for the configured seed", () => {
    const g = generateDataset(seed);
    expect(read("investigations.json")).toEqual(g.investigations);
    expect(read("tests.json")).toEqual(g.tests);
    expect(read("scenarios.json")).toEqual(g.scenarios);
  });
});
