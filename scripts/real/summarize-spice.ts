/**
 * Summarize the SPICE burner log (NASA PSI, PSI-107) as an operating envelope.
 * Source: data/raw/PSI-107_Experimental table_Spice.csv. The table is a log of burner settings
 * (fuel, nozzle, fuel rate, air speed, ignition and flame-off times). It has NO O2, NO pressure and
 * NO result column, and ~7% of rows are exact duplicates with more near-duplicates (mixed time
 * formats), so it is NOT turned into test runs. Only what the table covers is summarized.
 *   npx tsx scripts/real/summarize-spice.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "data/raw/PSI-107_Experimental table_Spice.csv";
const OUT = "data/real/spice-envelope.json";
const lines = readFileSync(SRC, "utf8").split(/\r?\n/).filter((l) => l.trim());
const header = (lines[0] ?? "").split(",").map((h) => h.trim());
const rows = lines.slice(1).map((l) => l.split(",").map((x) => x.trim()));
const col = (needle: string) => header.findIndex((h) => h.toLowerCase().startsWith(needle.toLowerCase()));
const iFuel = col("Fuel");
const iNozzle = col("Nozzle");
const iSccm = col("Fuel Rate (sccm)");
const iAir = col("Air Rate");
const iDate = col("GMT date");

const numeric = (i: number) => rows.map((r) => Number.parseFloat(r[i] ?? "")).filter(Number.isFinite);
const range = (a: number[]) => (a.length ? { min: Math.min(...a), max: Math.max(...a), n: a.length } : null);
const tally = (i: number) => rows.reduce<Record<string, number>>((a, r) => ((a[r[i] ?? ""] = (a[r[i] ?? ""] ?? 0) + 1), a), {});

const seen = new Set<string>();
let exactDuplicates = 0;
for (const r of rows) {
  const k = r.join("|");
  if (seen.has(k)) exactDuplicates++;
  seen.add(k);
}
const air = numeric(iAir);
const summary = {
  investigationId: "spice",
  accession: "PSI-107",
  kind: "burner-operating-log-summary",
  note: "Burner settings only: no O2, no pressure, no outcome column. Not converted to test runs.",
  sourceFile: "PSI-107_Experimental table_Spice.csv",
  rows: rows.length,
  exactDuplicateRows: exactDuplicates,
  fuelLabelsAsWritten: tally(iFuel),
  nozzleDiameterMm: tally(iNozzle),
  fuelRateSccm: range(numeric(iSccm)),
  airSpeedCmS: range(air),
  negativeAirSpeedReadings: air.filter((v) => v < 0).length,
  gmtDayOfYearValues: [...new Set(rows.map((r) => r[iDate] ?? ""))],
};
writeFileSync(OUT, `${JSON.stringify(summary, null, 1)}\n`);
console.log(`summary -> ${OUT}`);
console.log(JSON.stringify(summary, null, 1));
