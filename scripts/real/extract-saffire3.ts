/**
 * Extract the real SAFFIRE-III experimental table (NASA PSI, PSI-100).
 * Source: data/raw/PSI-100_Experimental table_SAFFIRE-3.csv (two burns).
 * Unlike SAFFIRE-I's table, this one has no O2, ignition or burn-time columns,
 * so those fields are absent (null), never filled in.
 *   npx tsx scripts/real/extract-saffire3.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "data/raw/PSI-100_Experimental table_SAFFIRE-3.csv";
const OUT = "data/real/saffire-iii-tests.json";

/** ".33 cm" -> 0.33 only when the unit matches; otherwise null. */
const withUnit = (s: string, unit: "cm" | "cm/s"): number | null => {
  const m = /^\s*(\d*\.?\d+)\s*(cm\/s|cm)\s*$/i.exec(s);
  return m && (m[2] as string).toLowerCase() === unit ? Number.parseFloat(m[1] as string) : null;
};

const lines = readFileSync(SRC, "utf8").split(/\r?\n/).filter((l) => l.trim());
const header = (lines[0] ?? "").split(",").map((h) => h.trim().toLowerCase());
const at = (c: string[], name: string) => (c[header.indexOf(name)] ?? "").trim();

const rows = lines.slice(1).flatMap((line, k) => {
  const c = line.split(",");
  const sample = at(c, "sample number");
  if (!/^S\d+$/.test(sample)) return [];
  return [
    {
      testId: `saffire-iii-${sample.toLowerCase()}`,
      investigationId: "saffire-iii",
      accession: "PSI-100",
      sourceFile: "PSI-100_Experimental table_SAFFIRE-3.csv",
      sourceRow: k + 2,
      sampleNumber: sample,
      material: at(c, "material"),
      thicknessCm: withUnit(at(c, "sample thickness"), "cm"),
      lengthCm: withUnit(at(c, "sample length"), "cm"),
      widthCm: withUnit(at(c, "sample width"), "cm"),
      airFlowCmS: withUnit(at(c, "air flow"), "cm/s"),
      flowDirection: at(c, "direction"),
      o2Percent: null,
      pressure: null,
      burnTimeS: null,
      dataSource: "psi",
    },
  ];
});
writeFileSync(OUT, `${JSON.stringify(rows, null, 1)}\n`);
console.log(`${rows.length} burns -> ${OUT}`);
console.table(rows.map((r) => ({ id: r.testId, material: r.material, thick: r.thicknessCm, len: r.lengthCm, wid: r.widthCm, flow: r.airFlowCmS, dir: r.flowDirection })));
