/**
 * Extract the real BASS-II test matrix (NASA PSI, PSI-25) into JSON.
 * Source: data/raw/BASS-II Test Matrix by PI Final.xlsx (one tab per PI).
 * Text fields are copied VERBATIM. Only unambiguous values are parsed; anything
 * else stays null and the raw text is kept so every row can be checked by hand.
 *   npx tsx scripts/real/extract-bass2.ts
 */
import ExcelJS from "exceljs";
import { writeFileSync } from "node:fs";

const SRC = "data/raw/BASS-II Test Matrix by PI Final.xlsx";
const OUT = "data/real/bass-ii-tests.json";

type Outcome = "no-ignition" | "blowoff" | "extinguished" | "unspecified";

const text = (v: ExcelJS.CellValue): string => {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") return String((v as { result?: unknown; text?: unknown }).result ?? (v as { text?: unknown }).text ?? "");
  return String(v);
};
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const num = (s: string): number | null => {
  const n = Number.parseFloat(s);
  return /^\s*-?\d+(\.\d+)?\s*$/.test(s) && Number.isFinite(n) ? n : null;
};

/** Only a plain list of numbers ("20,10,5,2,1") is read as air speeds in cm/s; anything else stays raw. */
function plainSpeeds(s: string): number[] | null {
  if (!/^[\d.,\s]+$/.test(s) || !s.trim()) return null;
  const v = s.split(",").map((x) => Number.parseFloat(x)).filter(Number.isFinite);
  return v.length ? v : null;
}

/** Keyword read of the free-text columns. "unspecified" when the text does not say. */
function outcomeFrom(fan: string, air: string): { outcome: Outcome; evidence: string } {
  const t = `${fan} ${air}`.toLowerCase();
  if (/no ign|did not ign|didn.t ign/.test(t)) return { outcome: "no-ignition", evidence: "no ign" };
  if (/blow ?off/.test(t)) return { outcome: "blowoff", evidence: "blowoff" };
  if (/\bext(inguish\w*)?\b|\bout\b/.test(t)) return { outcome: "extinguished", evidence: "ext/out" };
  return { outcome: "unspecified", evidence: "" };
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(SRC);
  const rows: Array<Record<string, unknown>> = [];
  for (const ws of wb.worksheets) {
    ws.eachRow((row, i) => {
      if (i === 1) return;
      const c = row.values as ExcelJS.CellValue[];
      const get = (n: number) => clean(text(c[n + 1] ?? null));
      const testNo = get(2);
      if (!testNo) return;
      const initO2 = num(get(10));
      const finalRaw = get(11);
      const finalO2 = num(finalRaw);
      const air = get(7);
      const fan = get(6);
      const { outcome, evidence } = outcomeFrom(fan, air);
      rows.push({
        testId: `bass-ii-${testNo.toLowerCase()}`,
        investigationId: "bass-ii",
        accession: "PSI-25",
        pi: ws.name,
        sourceSheet: ws.name,
        sourceRow: i,
        testNumber: testNo,
        date: get(0),
        sampleNumber: get(3),
        material: get(4),
        flowRestrictor: get(5),
        fanDisplayRaw: fan,
        airDisplayRaw: air,
        airSpeedsCmS: plainSpeeds(air),
        o2InitialPercent: initO2,
        o2FinalPercent: finalO2,
        o2FinalRaw: finalRaw,
        // A final reading far from the initial one is almost certainly a sensor fault; flagged, not corrected.
        o2FinalSuspect: finalO2 !== null && initO2 !== null && Math.abs(finalO2 - initO2) > 5,
        pressure: null,
        outcome,
        outcomeEvidence: evidence,
        dataSource: "psi",
      });
    });
  }
  writeFileSync(OUT, `${JSON.stringify(rows, null, 1)}\n`);
  const by = (k: string) => rows.reduce<Record<string, number>>((a, r) => ((a[String(r[k])] = (a[String(r[k])] ?? 0) + 1), a), {});
  const o2 = rows.map((r) => r.o2InitialPercent as number | null).filter((v): v is number => v !== null);
  console.log(`${rows.length} tests -> ${OUT}`);
  console.log("by PI:", by("pi"));
  console.log("outcome (keyword read):", by("outcome"));
  console.log(`initial O2: ${Math.min(...o2)}-${Math.max(...o2)}% (n=${o2.length}); suspect final O2: ${rows.filter((r) => r.o2FinalSuspect).length}; plain air-speed lists: ${rows.filter((r) => r.airSpeedsCmS).length}`);
}
void main();
