/**
 * Extract the real BASS as-run test matrix (NASA PSI, PSI-26).
 * Source: data/raw/BASS test matrix.xlsx, sheet "as run matrix" (2012-2013 combined).
 * Text is copied VERBATIM; only unambiguous numbers are parsed. Outcome flags are
 * keyword reads of the observation notes and are meant to be reviewed by a person.
 *   npx tsx scripts/real/extract-bass.ts
 */
import ExcelJS from "exceljs";
import { writeFileSync } from "node:fs";

const SRC = "data/raw/BASS test matrix.xlsx";
const OUT = "data/real/bass-tests.json";
const PSI_PER_ATM = 14.6959;

/**
 * Start-time cell. Most rows are text ("90 - 11:10", "205:11:11"). A few are Excel elapsed-time
 * values formatted [h]:mm:ss, which exceljs returns as a Date counted from 1899-12-30. Rendering
 * them as hours:minutes:seconds reproduces what Excel displays and matches the text rows; the
 * time of day is never discarded.
 */
const startTime = (v: ExcelJS.CellValue): string => {
  if (v instanceof Date) {
    const total = Math.round((v.getTime() - Date.UTC(1899, 11, 30)) / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return text(v).replace(/\s+/g, " ").trim();
};

const text = (v: ExcelJS.CellValue): string => {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as { result?: unknown; text?: unknown; richText?: Array<{ text: string }> };
    return String(o.result ?? o.text ?? (o.richText ? o.richText.map((r) => r.text).join("") : ""));
  }
  return String(v);
};
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const num = (s: string): number | null => {
  const n = Number.parseFloat(s);
  return /^\s*-?\d+(\.\d+)?\s*$/.test(s) && Number.isFinite(n) ? n : null;
};
const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

/** Plain comma lists of air speeds (cm/s) only; ranges, "<1" and notes stay raw. */
function plainSpeeds(s: string): number[] | null {
  if (!/^[\d.,\s]+$/.test(s) || !s.trim()) return null;
  const v = s.split(",").map((x) => Number.parseFloat(x)).filter(Number.isFinite);
  return v.length ? v : null;
}

function flags(obs: string) {
  const t = obs.toLowerCase();
  return {
    noIgnition: /no ignition|did not ignite|didn.t ignite|failed to ignite/.test(t),
    extinguished: /extinguish|went out|\bout at\b|flame out|\bout\b/.test(t),
    blowoff: /blow ?off|blew off/.test(t),
    mentionsSoot: /soot/.test(t),
  };
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(SRC);
  const ws = wb.getWorksheet("as run matrix");
  if (!ws) throw new Error('sheet "as run matrix" not found');
  const rows: Array<Record<string, unknown>> = [];
  const skipped: string[] = [];
  ws.eachRow((row, i) => {
    if (i <= 3) return;
    const c = row.values as ExcelJS.CellValue[];
    const get = (n: number) => clean(text(c[n + 1] ?? null));
    const asRun = get(2);
    if (num(asRun) === null) {
      if (asRun) skipped.push(`row ${i}: ${asRun}`);
      return;
    }
    // The column is headed "% by volume" but holds fractions (0.221). A note in the file
    // ("Calc 17.07% O2" beside 0.1707) confirms it. Accept only values <= 1 as fractions.
    const o2Raw = num(get(26));
    const o2 = o2Raw !== null && o2Raw > 0 && o2Raw <= 1 ? round(o2Raw * 100, 2) : null;
    const atm = num(get(27));
    const obs = get(29);
    const air = get(10);
    rows.push({
      testId: `bass-asrun-${asRun}`,
      investigationId: "bass",
      accession: "PSI-26",
      sourceSheet: "as run matrix",
      sourceRow: i,
      asRunTestNumber: asRun,
      plannedTestNumber: get(3),
      date: get(0),
      // Some date cells are real calendar dates in the source; the year 2103 on test 104 is almost
      // certainly a typo for 2013 (every neighbouring row is 2013), but the file does not say, so
      // the value is kept as written and flagged.
      dateSuspect: /^(\d{4})-/.test(get(0)) && !["2012", "2013"].includes(get(0).slice(0, 4)),
      startTimeGmt: startTime(c[2] ?? null),
      startTimeGmtIsExcelElapsedTime: c[2] instanceof Date,
      sampleNumber: get(4),
      material: get(5),
      igniter: get(6),
      flowRestrictor: get(7),
      sampleDistance: get(8),
      fanDisplayRaw: get(9),
      airDisplayRaw: air,
      airSpeedsCmS: plainSpeeds(air),
      gn2PotRaw: get(13),
      o2Percent: o2,
      o2RawCell: o2Raw,
      pressureAtm: atm,
      pressurePsi: atm === null ? null : round(atm * PSI_PER_ATM, 2),
      co2MmHg: num(get(28)),
      observationsRaw: obs,
      flags: flags(obs),
      dataSource: "psi",
    });
  });
  writeFileSync(OUT, `${JSON.stringify(rows, null, 1)}\n`);
  const nums = (k: string) => rows.map((r) => r[k] as number | null).filter((v): v is number => v !== null);
  const range = (a: number[]) => (a.length ? `${Math.min(...a)}-${Math.max(...a)}` : "n/a");
  const mats = rows.reduce<Record<string, number>>((a, r) => ((a[String(r.material)] = (a[String(r.material)] ?? 0) + 1), a), {});
  console.log(`${rows.length} tests -> ${OUT}`);
  console.log(`O2 %: ${range(nums("o2Percent"))} (n=${nums("o2Percent").length}) | pressure atm: ${range(nums("pressureAtm"))} (n=${nums("pressureAtm").length}) | psi: ${range(nums("pressurePsi"))}`);
  console.log("materials:", mats);
  const f = (k: string) => rows.filter((r) => (r.flags as Record<string, boolean>)[k]).length;
  console.log(`flags from notes: noIgnition ${f("noIgnition")}, extinguished ${f("extinguished")}, blowoff ${f("blowoff")}; empty notes ${rows.filter((r) => !r.observationsRaw).length}`);
  console.log("skipped non-test rows:", skipped);
}
void main();
