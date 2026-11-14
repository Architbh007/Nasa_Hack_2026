/**
 * Extract the real SAFFIRE-I experimental table (NASA PSI, PSI-98).
 * Source: data/raw/PSI-98_Experimental table_SAFFIRE-1.csv (two burns).
 * Values are copied as written. Where the table gives a range or approximate
 * value, the text is kept in *Raw and a number is set only if it is exact.
 *   npx tsx scripts/real/extract-saffire1.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "data/raw/PSI-98_Experimental table_SAFFIRE-1.csv";
const OUT = "data/real/saffire-i-tests.json";

const num = (s: string): number | null => (/^\s*-?\d+(\.\d+)?\s*$/.test(s) ? Number.parseFloat(s) : null);

const lines = readFileSync(SRC, "utf8").split(/\r?\n/).filter((l) => l.trim());
const header = (lines[0] ?? "").split(",").map((h) => h.trim());
const col = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());

const rows = lines.slice(1).flatMap((line, k) => {
  const c = line.split(",").map((x) => x.trim());
  const sample = c[col("Sample Number")] ?? "";
  if (!/^S\d+$/.test(sample)) return []; // F1/F2 rows are flow-visualization image sets, not burns
  const o2Raw = c[col("Percent O2")] ?? "";
  const range = /^(\d+(\.\d+)?)\s*-\s*(\d+(\.\d+)?)$/.exec(o2Raw);
  return [
    {
      testId: `saffire-i-${sample.toLowerCase()}`,
      investigationId: "saffire-i",
      accession: "PSI-98",
      sourceFile: "PSI-98_Experimental table_SAFFIRE-1.csv",
      sourceRow: k + 2,
      sampleNumber: sample,
      material: c[col("Material")],
      thicknessCm: num(c[col("Sample Thickness (cm)")] ?? ""),
      lengthCm: num(c[col("Sample Length (cm)")] ?? ""),
      widthCm: num(c[col("Sample Width (cm)")] ?? ""),
      airFlowCmS: num(c[col("Air Flow (cm/s)")] ?? ""),
      o2PercentRaw: o2Raw,
      o2PercentMin: range ? Number.parseFloat(range[1] as string) : num(o2Raw),
      o2PercentMax: range ? Number.parseFloat(range[3] as string) : num(o2Raw),
      ignitionPowerW: num(c[col("Ignition Power (W)")] ?? ""),
      ignitionTimeS: num(c[col("Ignition Time (s)")] ?? ""),
      burnTimeS: num(c[col("Burn Time (s)")] ?? ""),
      flowDirection: c[col("Flow Direction")],
      pressure: null, // not in the table
      dataSource: "psi",
    },
  ];
});
writeFileSync(OUT, `${JSON.stringify(rows, null, 1)}\n`);
console.log(`${rows.length} burns -> ${OUT}`);
console.table(rows.map((r) => ({ id: r.testId, material: r.material, flow: r.airFlowCmS, o2: r.o2PercentRaw, burnS: r.burnTimeS, dir: r.flowDirection })));
