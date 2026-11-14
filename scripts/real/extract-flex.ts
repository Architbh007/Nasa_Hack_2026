/**
 * Extract the real FLEX experimental table (NASA PSI, PSI-69): droplet combustion
 * and suppression tests on the ISS (Combustion Integrated Rack / MDCA).
 * Source: data/raw/PSI-69_Experimental table_FLEX.csv. Cells are kept verbatim in *Raw
 * fields; numbers are parsed only when the cell is a plain number. Cells holding a
 * corrupted character (U+FFFD) are left null, never repaired.
 *   npx tsx scripts/real/extract-flex.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "data/raw/PSI-69_Experimental table_FLEX.csv";
const OUT = "data/real/flex-tests.json";
const PSI_PER_MMHG = 0.0193368;

const lines = readFileSync(SRC, "utf8").split(/\r?\n/).filter((l) => l.trim());
const header = (lines[0] ?? "").split(",").map((h) => h.trim());
const idx = (needle: string) => {
  const i = header.findIndex((h) => h.toLowerCase().startsWith(needle.toLowerCase()));
  if (i < 0) throw new Error(`column not found: ${needle}`);
  return i;
};
const COL = {
  n: idx("FLEX Test #"),
  id: idx("FLEX Identifier"),
  date: idx("Test Date"),
  gmt: idx("Test GMT"),
  fuel: idx("Fuel"),
  mmHg: idx("Ambient pressure"),
  o2: idx("O initial"),
  n2: idx("N initial"),
  co: idx("CO initial"),
  he: idx("He initial"),
  d0: idx("Droplet initial diameter"),
  dExt: idx("Visible flame extinction diameter"),
  burnRate: idx("Burning rate"),
  burnTime: idx("Burn time"),
  end: idx("Test end"),
};
const plain = (s: string): number | null => (/^\s*-?\d*\.?\d+\s*$/.test(s) ? Number.parseFloat(s) : null);
const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

const bad: string[] = [];
const rows = lines.slice(1).flatMap((line, k) => {
  const c = line.split(",").map((x) => x.trim());
  if (c.length !== header.length) {
    bad.push(`line ${k + 2}: ${c.length} cells (expected ${header.length})`);
    return [];
  }
  const get = (i: number) => c[i] ?? "";
  const mmHgRaw = plain(get(COL.mmHg));
  // A pressure of 0 mmHg is impossible (one row, test 114): a missing value written as zero.
  // Keep the raw cell, report no pressure.
  const mmHg = mmHgRaw !== null && mmHgRaw >= 100 ? mmHgRaw : null;
  const frac = (i: number) => {
    const v = plain(get(i));
    return v === null ? null : round(v * 100, 2);
  };
  return [
    {
      testId: `flex-${get(COL.n)}`,
      investigationId: "flex",
      accession: "PSI-69",
      sourceFile: "PSI-69_Experimental table_FLEX.csv",
      sourceRow: k + 2,
      flexTestNumber: get(COL.n),
      flexIdentifier: get(COL.id),
      dateRaw: get(COL.date),
      gmtRaw: get(COL.gmt),
      fuel: get(COL.fuel),
      pressureMmHgRaw: get(COL.mmHg),
      pressureMmHg: mmHg,
      pressureInvalid: mmHgRaw !== null && mmHg === null,
      pressurePsi: mmHg === null ? null : round(mmHg * PSI_PER_MMHG, 2),
      o2Percent: frac(COL.o2),
      n2Percent: frac(COL.n2),
      // The source header says "CO initial ambient composition". In the CO2-suppression runs it
      // reads 0.7 alongside 0.21 O2 and 0.09 N2 (sums to 1), which only makes sense as CO2.
      // Stored as co2PercentAsLabelledCO; the CO2 reading is an inference, not stated by the file.
      co2PercentAsLabelledCO: frac(COL.co),
      hePercent: frac(COL.he),
      dropletInitialDiameterMm: plain(get(COL.d0)),
      dropletInitialDiameterRaw: get(COL.d0),
      extinctionDiameterMm: plain(get(COL.dExt)),
      extinctionDiameterRaw: get(COL.dExt),
      burningRateRaw: get(COL.burnRate),
      burningRate: plain(get(COL.burnRate)),
      burnTimeS: plain(get(COL.burnTime)),
      testEnd: get(COL.end),
      dataSource: "psi",
    },
  ];
});
writeFileSync(OUT, `${JSON.stringify(rows, null, 1)}\n`);

const count = (f: (r: (typeof rows)[number]) => string) =>
  rows.reduce<Record<string, number>>((a, r) => ((a[f(r)] = (a[f(r)] ?? 0) + 1), a), {});
const nums = (f: (r: (typeof rows)[number]) => number | null) => rows.map(f).filter((v): v is number => v !== null);
const rg = (a: number[]) => (a.length ? `${Math.min(...a)}-${Math.max(...a)} (n=${a.length})` : "n/a");
console.log(`${rows.length} tests -> ${OUT}${bad.length ? `, ${bad.length} malformed lines skipped` : ""}`);
if (bad.length) console.log(bad.slice(0, 5));
console.log("fuel:", count((r) => r.fuel));
console.log("test end:", count((r) => r.testEnd));
console.log("O2 %:", rg(nums((r) => r.o2Percent)), "| pressure psi:", rg(nums((r) => r.pressurePsi)));
console.log("O2 levels:", count((r) => String(r.o2Percent)));
console.log("diluent: CO2-labelled", rows.filter((r) => (r.co2PercentAsLabelledCO ?? 0) > 0).length, "| helium", rows.filter((r) => (r.hePercent ?? 0) > 0).length, "| none", rows.filter((r) => !(r.co2PercentAsLabelledCO ?? 0) && !(r.hePercent ?? 0)).length);
console.log("corrupted/empty extinction cells:", rows.filter((r) => r.extinctionDiameterMm === null).length, "of which U+FFFD:", rows.filter((r) => r.extinctionDiameterRaw.includes("�")).length);
