/**
 * Record the ACME BRE test-day summary (NASA PSI, PSI-20).
 * Source: data/raw/PSI-20_Experimental table_ACME BRE.csv: one row per test day with the burner size,
 * fuel, the O2 levels used that day, and how many flames ignited that day. It is a DAY-LEVEL summary:
 * individual runs, their pressures and their outcomes are not in it, so it is not turned into runs.
 * The source says: "The chamber pressures were also varied but are not identified in this summary table."
 *   npx tsx scripts/real/summarize-bre.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "data/raw/PSI-20_Experimental table_ACME BRE.csv";
const OUT = "data/real/bre-test-days.json";
const lines = readFileSync(SRC, "utf8").split(/\r?\n/).filter((l) => l.trim());

const days = lines.slice(1).map((line, k) => {
  // The Notes column can contain commas, so split only the first 7 commas.
  const parts: string[] = [];
  let rest = line;
  for (let i = 0; i < 7; i++) {
    const j = rest.indexOf(",");
    parts.push(j < 0 ? rest : rest.slice(0, j));
    rest = j < 0 ? "" : rest.slice(j + 1);
  }
  const [year, month, date, burner, fuel, o2Raw, ignited] = parts.map((p) => p.trim());
  const levels = (o2Raw ?? "").split(";").map((x) => x.trim());
  // Levels like "3400%" / "2100%" are almost certainly typos for 34 / 21 (a stray "00%"), but the
  // file does not say, so they are flagged and left out of the parsed list.
  const parsed = levels.map((x) => (/^\d*\.?\d+$/.test(x) ? Number.parseFloat(x) : null));
  return {
    sourceRow: k + 2,
    year: Number(year),
    month: month ?? "",
    day: Number(date),
    burnerSizeMm: Number(burner),
    fuelBottleRaw: fuel ?? "",
    o2PercentRaw: o2Raw ?? "",
    o2PercentLevels: parsed.filter((v): v is number => v !== null),
    o2Unparsed: levels.filter((_, i) => parsed[i] === null),
    flamesIgnited: Number(ignited),
    notesRaw: rest.trim(),
  };
});

const o2 = days.flatMap((d) => d.o2PercentLevels);
const summary = {
  investigationId: "bre",
  accession: "PSI-20",
  kind: "test-day-summary",
  note: "Day-level summary: O2 levels used that day and flames ignited that day. Pressure was varied but is not identified in the table. Not individual runs.",
  sourceFile: "PSI-20_Experimental table_ACME BRE.csv",
  testDays: days,
  totals: {
    days: days.length,
    flamesIgnited: days.reduce((s, d) => s + d.flamesIgnited, 0),
    o2PercentMin: Math.min(...o2),
    o2PercentMax: Math.max(...o2),
    o2PercentDistinctLevels: [...new Set(o2)].sort((a, b) => a - b),
  },
};
writeFileSync(OUT, `${JSON.stringify(summary, null, 1)}\n`);
console.log(`${days.length} test days -> ${OUT}`);
console.log(summary.totals);
console.log("unparsed O2 cells:", days.filter((d) => d.o2Unparsed.length).map((d) => `${d.year}-${d.month}-${d.day}: ${d.o2Unparsed.join(",")}`));
console.log("fuels:", [...new Set(days.map((d) => d.fuelBottleRaw))], "| burners mm:", [...new Set(days.map((d) => d.burnerSizeMm))]);
