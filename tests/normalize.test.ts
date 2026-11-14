import { describe, expect, it } from "vitest";
import { ATM_TO_PSI, KPA_TO_PSI, MMHG_TO_PSI } from "@/lib/constants";
import { materialClassForFuel } from "@/lib/materials";
import { bass2Runs, bassRuns, cfiRuns, flexRuns, hardwareTags, saffireIRuns, saffireIvViRuns, type BassRow, type SaffireIvViFile } from "@/lib/real/normalize";
import { readRealFiles } from "./fixtures";

/** Small real fixtures: the first rows of each extracted NASA file. */
const real = readRealFiles();
const bassRow = real["bass-tests"][0]!;
const flexRow = real["flex-tests"][0]!;
const cfiRow = real["cfi-tests"][0]!;
const bass2Row = real["bass-ii-tests"][0]!;
const paper = real["saffire-iv-vi-tests"] as SaffireIvViFile;

describe("unit conversion factors", () => {
  it("match the published definitions", () => {
    expect(ATM_TO_PSI).toBeCloseTo(14.6959, 4);
    expect(760 * MMHG_TO_PSI).toBeCloseTo(ATM_TO_PSI, 3);
    expect(101.325 * KPA_TO_PSI).toBeCloseTo(ATM_TO_PSI, 3);
  });

  it("BASS: 0.97 atm in the sheet is 14.26 psi, and O2 is the fraction x 100", () => {
    expect(bassRow.pressureAtm).toBe(0.97);
    expect(bassRow.pressurePsi).toBeCloseTo(0.97 * ATM_TO_PSI, 2);
    expect(bassRow.o2Percent).toBeCloseTo((bassRow.o2RawCell ?? 0) * 100, 5);
    const [r] = bassRuns([bassRow], "f");
    expect(r!.pressureKPa).toBeCloseTo(98.3, 1);
  });

  it("FLEX: 757.7 mmHg is 14.65 psi", () => {
    expect(flexRow.pressureMmHg).toBe(757.7);
    expect(flexRow.pressurePsi).toBeCloseTo(757.7 * MMHG_TO_PSI, 2);
  });

  it("Saffire IV-VI: kPa converts to psi", () => {
    for (const s of paper.samples) expect(s.pressurePsi).toBeCloseTo(s.pressureKPa * KPA_TO_PSI, 1);
  });
});

describe("run normalizers", () => {
  it("BASS keeps the observation notes and reads the outcome from their keyword flags", () => {
    const [r] = bassRuns([bassRow], "BASS.xlsx");
    expect(r).toMatchObject({ id: "bass-asrun-1", investigationId: "bass", pressureStatus: "measured", flowMinCmS: 5, flowMaxCmS: 10 });
    expect(r!.outcomeText).toBe(bassRow.observationsRaw);
    expect(r!.outcome).toBe("extinguished");
    expect(r!.outcomeBasis).toBe("notes-keyword");
    expect(r!.source.ref).toContain("row 4");
  });

  it("BASS gives repeated as-run numbers a row suffix instead of a duplicate id", () => {
    const twin: BassRow = { ...bassRow, sourceRow: 99 };
    const ids = bassRuns([bassRow, twin], "f").map((r) => r.id);
    expect(ids).toEqual(["bass-asrun-1-row4", "bass-asrun-1-row99"]);
  });

  it("BASS-II leaves pressure null and puts the cited ISS nominal in a separate field", () => {
    const [r] = bass2Runs([bass2Row], "f");
    expect(r!.pressurePsi).toBeNull();
    expect(r!.pressureStatus).toBe("not-recorded");
    expect(r!.pressureAssumedPsi).toBe(14.7);
    expect(r!.pressureAssumedSource).toMatch(/eclss/i);
    expect(r!.outcome).toBe("unknown"); // the source says nothing for this test
  });

  it("FLEX maps the test-end column and flags the 'CO' column", () => {
    const [r] = flexRuns([flexRow], "f");
    expect(r!.outcome).toBe("disruption");
    expect(r!.outcomeBasis).toBe("source-field");
    const co2Row = real["flex-tests"].find((f) => (f.co2PercentAsLabelledCO ?? 0) > 0)!;
    const [c] = flexRuns([co2Row], "f");
    expect(c!.co2Percent).toBe(co2Row.co2PercentAsLabelledCO);
    expect(c!.flags.join(" ")).toMatch(/labelled 'CO'.*CO2/);
  });

  it("CFI marks a cool flame only when a cool-flame extinction diameter is recorded", () => {
    const [r] = cfiRuns([cfiRow], "f");
    expect(r!.outcome).toBe("cool-flame");
    const noCool = real["cfi-tests"].find((c) => c.coolFlameExtinctionDiameterMm === null)!;
    expect(cfiRuns([noCool], "f")[0]!.outcome).toBe("unknown");
  });

  it("Saffire-I plots a stated O2 range at its midpoint and keeps the text", () => {
    const [r] = saffireIRuns(real["saffire-i-tests"], "f", paper);
    expect(r!.o2Text).toBe("21.5 - 21.7");
    expect(r!.o2Percent).toBe(21.6);
    expect(r!.pressureStatus).toBe("paper");
    expect(r!.pressureKPa).toBe(100);
    expect(r!.flags.join(" ")).toMatch(/midpoint/);
  });

  it("Saffire IV-VI runs are marked as published and cite their tables", () => {
    const rs = saffireIvViRuns(paper, "papers");
    expect(rs.every((r) => r.dataSource === "published" && r.sourceKind === "paper")).toBe(true);
    const vi2 = rs.find((r) => r.id === "saffire-vi-2")!;
    expect(vi2.o2Percent).toBe(31);
    expect(vi2.source.ref).toMatch(/Table 1, p\. 3/);
    // A blank results cell stays null, never zero.
    expect(rs.find((r) => r.id === "saffire-iv-1")!.metrics.peakHeatReleaseW).toBeNull();
  });
});

describe("labels", () => {
  it("classifies materials as written in NASA tables", () => {
    expect(materialClassForFuel("SIBAL 2 cm")).toBe("fabric");
    expect(materialClassForFuel("100 micron pmma film, 2 cm wide")).toBe("plastic");
    expect(materialClassForFuel("n-Heptane")).toBe("liquid-fuel");
    expect(materialClassForFuel("100% C2H4")).toBe("gas-leak");
    expect(materialClassForFuel("candle, Japan wax")).toBeNull();
  });

  it("tags hardware from PSI's concatenated hardware text", () => {
    expect(hardwareTags(["Combustion Integrated Rack (CIR) ACME"])).toEqual(["CIR", "ACME"]);
    expect(hardwareTags(["TSI P-Trak"])).toEqual(["TSI P-Trak"]);
  });
});
