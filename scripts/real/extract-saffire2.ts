/**
 * Extract the real SAFFIRE-II experimental table (NASA PSI, PSI-99).
 * Source: data/raw/PSI-99_Experimental table_SAFFIRE-2.csv (nine burns + notes).
 * Every cell is kept as written in *Raw fields; numbers are parsed only when the
 * cell is a plain value with a unit. Approximations ("~ 22.1") and ranges
 * ("22.1 to 22.0") are flagged, not rounded off. Nothing is filled in.
 *   npx tsx scripts/real/extract-saffire2.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "data/raw/PSI-99_Experimental table_SAFFIRE-2.csv";
const OUT = "data/real/saffire-ii-tests.json";

const lines = readFileSync(SRC, "utf8").split(/\r?\n/).filter((l) => l.trim());
const header = (lines[0] ?? "").split(",");

/** Plain "<number> <unit>" -> number; anything else (approximate, range, text) -> null. */
const withUnit = (s: string, unit: string): number | null => {
  const m = /^\s*(\d*\.?\d+)\s*([a-z/]+)\s*$/i.exec(s);
  if (!m || (m[2] as string).toLowerCase() !== unit) return null;
  // "037" (leading zero, no decimal point) is a typo in the source, not 37; leave it unparsed.
  if (/^0\d+$/.test(m[1] as string)) return null;
  return Number.parseFloat(m[1] as string);
};
const plain = (s: string): number | null => (/^\s*\d*\.?\d+\s*$/.test(s) ? Number.parseFloat(s) : null);

/** O2: exact, "~ x" (approximate), or "a to b" (range). */
function o2(raw: string) {
  const range = /^\s*(\d*\.?\d+)\s+to\s+(\d*\.?\d+)\s*$/i.exec(raw);
  if (range) return { min: Number.parseFloat(range[1] as string), max: Number.parseFloat(range[2] as string), approximate: false };
  const approx = /^\s*~\s*(\d*\.?\d+)\s*$/.exec(raw);
  if (approx) return { min: Number.parseFloat(approx[1] as string), max: Number.parseFloat(approx[1] as string), approximate: true };
  const exact = plain(raw);
  return { min: exact, max: exact, approximate: false };
}

/**
 * SAFFIRE-II readme, Table 1 (data/raw/SAFFIRE-II DoD.docx). The table is an embedded
 * image, so these values were transcribed by eye; verify them against the document.
 */
const README_TABLE1: Record<string, { material: string; thicknessMm: number | null; thicknessText: string; airFlowCmS: number; igniter: string }> = {
  "2-1": { material: "Silicone", thicknessMm: 0.25, thicknessText: "0.25 mm", airFlowCmS: 20, igniter: "Upstream" },
  "2-2": { material: "Silicone", thicknessMm: 0.61, thicknessText: "0.61 mm", airFlowCmS: 20, igniter: "Upstream" },
  "2-3": { material: "Silicone", thicknessMm: 1.02, thicknessText: "1.02 mm", airFlowCmS: 20, igniter: "Upstream" },
  "2-4": { material: "Silicone", thicknessMm: 0.36, thicknessText: "0.36 mm", airFlowCmS: 20, igniter: "Downstream" },
  "2-5": { material: "SIBAL fabric", thicknessMm: 0.33, thicknessText: "0.33 mm", airFlowCmS: 20, igniter: "Upstream" },
  "2-6": { material: "SIBAL fabric", thicknessMm: 0.33, thicknessText: "0.33 mm", airFlowCmS: 30, igniter: "Upstream" },
  "2-7": { material: "PMMA to Nomex", thicknessMm: 0.33, thicknessText: "0.33 mm", airFlowCmS: 20, igniter: "Upstream" },
  "2-8": { material: "Structured PMMA", thicknessMm: 10, thicknessText: "10 mm (with tapered edge for ignition)", airFlowCmS: 20, igniter: "Upstream" },
  "2-9": { material: "Flat PMMA", thicknessMm: 10, thicknessText: "10 mm (with tapered edge for ignition)", airFlowCmS: 30, igniter: "Upstream" },
};

const notes: Record<string, string> = {};
const rows: Array<Record<string, unknown>> = [];

lines.slice(1).forEach((line, k) => {
  const c = line.split(",").map((x) => x.trim());
  const note = /^Note (\d)\s*(.*)$/.exec(c[0] ?? "");
  if (note) {
    notes[`note${note[1]}`] = (note[2] ?? "").trim();
    return;
  }
  const id = c[0] ?? "";
  if (!/^2-\d+$/.test(id)) return; // flow-visualization rows are not burns
  const readme = README_TABLE1[id];
  const tableFlow = withUnit(c[5] ?? "", "cm/s");
  const tableThickness = withUnit(c[2] ?? "", "mm");
  const conflicts: string[] = [];
  if (readme) {
    if (tableFlow !== null && tableFlow !== readme.airFlowCmS) conflicts.push(`air flow: table ${tableFlow} cm/s vs readme ${readme.airFlowCmS} cm/s`);
    if (readme.thicknessMm !== null && readme.thicknessMm < 5) {
      if (tableThickness === null) conflicts.push(`thickness: table "${c[2] ?? ""}" is not a plain value; readme ${readme.thicknessText}`);
      else if (Math.abs(tableThickness - readme.thicknessMm) > 0.005) conflicts.push(`thickness: table ${tableThickness} mm vs readme ${readme.thicknessMm} mm`);
    }
    if (!c[1]) conflicts.push(`material: blank in table; readme ${readme.material}`);
  }
  const o2Raw = c[6] ?? "";
  const o2v = o2(o2Raw);
  rows.push({
    testId: `saffire-ii-${id}`,
    investigationId: "saffire-ii",
    accession: "PSI-99",
    sourceFile: "PSI-99_Experimental table_SAFFIRE-2.csv",
    sourceRow: k + 2,
    sampleNumber: id,
    material: c[1] || null,
    thicknessRaw: c[2] ?? "",
    lengthRaw: c[3] ?? "",
    widthCm: withUnit(c[4] ?? "", "cm") ?? plain(c[4] ?? ""),
    airFlowCmS: withUnit(c[5] ?? "", "cm/s"),
    o2PercentRaw: o2Raw,
    o2PercentMin: o2v.min,
    o2PercentMax: o2v.max,
    o2Approximate: o2v.approximate,
    ignitionPowerW: withUnit(c[7] ?? "", "w"),
    ignitionTimeS: withUnit(c[8] ?? "", "s"),
    burnTimeRaw: c[9] ?? "",
    burnTimeS: withUnit(c[9] ?? "", "s"),
    flowDirection: c[10] ?? "",
    // The source header reads "?-g Burn Length" (a lost micro sign); read as microgravity because
    // it sits beside the "1-g" columns. This is an inference about the header, not data.
    microgBurnLengthRaw: c[11] ?? "",
    microgSpreadLengthRaw: c[12] ?? "",
    normalGravityBurnLengthRaw: c[13] ?? "",
    normalGravitySpreadRateRaw: c[14] ?? "",
    readmeTable1: readme ?? null,
    sourceConflicts: conflicts,
    pressure: null,
    dataSource: "psi",
  });
});

writeFileSync(OUT, `${JSON.stringify({ notes, tests: rows }, null, 1)}\n`);
console.log(`${rows.length} burns -> ${OUT}`);
console.table(rows.map((r) => ({ id: r.sampleNumber, material: r.material, thick: r.thicknessRaw, o2: r.o2PercentRaw, flow: r.airFlowCmS, burn: r.burnTimeRaw, ugBurn: r.microgBurnLengthRaw })));
console.log("notes:", notes);
console.log("conflicts between experimental table and readme:");
for (const r of rows) for (const x of r.sourceConflicts as string[]) console.log(`  ${r.sampleNumber}: ${x}`);
