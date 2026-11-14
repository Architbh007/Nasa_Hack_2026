/**
 * Extract the FLEX-2 test matrix (NASA PSI, PSI-68).
 * Source: data/raw/PSI-68_Experimental table_Flex2.csv.
 * IMPORTANT: this is a PLAN, not a list of runs. Each row gives a fuel and the lists/ranges of
 * conditions to be explored. It does not say which combinations flew or what happened, so it is
 * stored as a design envelope (data/real/flex-2-design.json) and never as test runs.
 *   npx tsx scripts/real/extract-flex2.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "data/raw/PSI-68_Experimental table_Flex2.csv";
const OUT = "data/real/flex-2-design.json";
const PSI_PER_ATM = 14.6959;

const lines = readFileSync(SRC, "utf8").split(/\r?\n/).filter((l) => l.trim());
const list = (s: string) =>
  s.replace(/\bor\b/gi, ";").split(/[;,]/).map((x) => x.trim()).filter(Boolean).map(Number.parseFloat).filter(Number.isFinite);
const range = (s: string): [number, number] | null => {
  const m = /^\s*(\d*\.?\d+)\s*-\s*(\d*\.?\d+)\s*$/.exec(s);
  return m ? [Number.parseFloat(m[1] as string), Number.parseFloat(m[2] as string)] : null;
};

const rows = lines.slice(1).map((line, k) => {
  const c = line.split(",").map((x) => x.trim());
  const atm = list(c[4] ?? "");
  const o2 = list(c[3] ?? "");
  return {
    plannedRow: k + 2,
    fuelRaw: c[0] ?? "",
    initialDropletDiameterMmRange: range(c[1] ?? ""),
    ambientGasMixtureRaw: c[2] ?? "",
    o2PercentLevels: o2.map((v) => Math.round(v * 1000) / 10),
    pressureAtmLevels: atm,
    pressurePsiLevels: atm.map((v) => Math.round(v * PSI_PER_ATM * 100) / 100),
    ambientTemperatureC: Number.parseFloat(c[5] ?? ""),
    flowVelocityCmSRange: range(c[6] ?? ""),
  };
});
writeFileSync(
  OUT,
  `${JSON.stringify({ investigationId: "flex-2", accession: "PSI-68", kind: "planned-test-matrix", note: "Planned conditions only; it does not record which runs flew or their outcomes.", sourceFile: "PSI-68_Experimental table_Flex2.csv", fuels: rows }, null, 1)}\n`
);
console.log(`${rows.length} planned fuels -> ${OUT}`);
console.log("O2 %:", [...new Set(rows.flatMap((r) => r.o2PercentLevels))], "| pressure psi:", [...new Set(rows.flatMap((r) => r.pressurePsiLevels))], "| flow cm/s:", rows[0]?.flowVelocityCmSRange);
