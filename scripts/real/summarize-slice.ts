/**
 * Record the SLICE test schedule (NASA PSI, PSI-106).
 * Source: data/raw/PSI-106_Experimental table_Slice.csv: one row per test day with the fuel mix.
 * No O2, pressure, flow or outcome, so it is kept as a schedule, never as test runs.
 * Rows are kept verbatim because some mix the date and a note in one cell.
 *   npx tsx scripts/real/summarize-slice.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "data/raw/PSI-106_Experimental table_Slice.csv";
const OUT = "data/real/slice-schedule.json";
const lines = readFileSync(SRC, "utf8").split(/\r?\n/).filter((l) => l.trim());
const days = lines.slice(1).map((line, k) => {
  const i = line.lastIndexOf(",");
  return { sourceRow: k + 2, dateCellRaw: line.slice(0, i).trim(), fuelCellRaw: line.slice(i + 1).trim() };
});
writeFileSync(
  OUT,
  `${JSON.stringify({ investigationId: "slice", accession: "PSI-106", kind: "test-day-schedule", note: "Test days and fuel mixes only: no O2, pressure, flow or outcomes. Not converted to test runs.", sourceFile: "PSI-106_Experimental table_Slice.csv", testDays: days }, null, 1)}\n`
);
console.log(`${days.length} test days -> ${OUT}`);
