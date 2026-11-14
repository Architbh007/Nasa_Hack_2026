/**
 * Extract the real CFI data summary (NASA PSI, PSI-39): droplet cool-flame tests on the ISS.
 * Source: data/raw/CFI_DataSummary_Spreadsheet_Jan2021.xlsx. Sheets joined by "Flex Number":
 *   Master Sheet (conditions) + DATA (measurements) + Igniter + Comments (investigators' notes).
 * Text is verbatim; numbers are parsed only when the cell is a plain number (optionally with a
 * unit that is checked). Cool-flame keyword flags are readings of the notes, meant for review.
 *   npx tsx scripts/real/extract-cfi.ts
 */
import ExcelJS from "exceljs";
import { writeFileSync } from "node:fs";

const SRC = "data/raw/CFI_DataSummary_Spreadsheet_Jan2021.xlsx";
const OUT = "data/real/cfi-tests.json";
const PSI_PER_ATM = 14.6959;

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
const plain = (s: string): number | null => (/^\s*-?\d*\.?\d+\s*$/.test(s) ? Number.parseFloat(s) : null);
const withUnit = (s: string, unit: string): number | null => {
  const m = /^\s*(\d*\.?\d+)\s*([a-z]+)\s*$/i.exec(s);
  return m && (m[2] as string).toLowerCase() === unit ? Number.parseFloat(m[1] as string) : null;
};
const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

type Sheet = Map<string, Record<string, string>>;
function sheet(wb: ExcelJS.Workbook, name: string): Sheet {
  const ws = wb.getWorksheet(name);
  if (!ws) throw new Error(`sheet not found: ${name}`);
  const header = (ws.getRow(1).values as ExcelJS.CellValue[]).slice(1).map((h) => clean(text(h)));
  const out: Sheet = new Map();
  ws.eachRow((row, i) => {
    if (i === 1) return;
    const cells = (row.values as ExcelJS.CellValue[]).slice(1).map((c) => clean(text(c ?? null)));
    const id = cells[0] ?? "";
    if (!id) return;
    out.set(id, Object.fromEntries(header.map((h, k) => [h, cells[k] ?? ""])));
  });
  return out;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(SRC);
  const master = sheet(wb, "Master Sheet");
  const data = sheet(wb, "DATA");
  const igniter = sheet(wb, "Igniter");
  const comments = sheet(wb, "Comments");

  const rows = [...master.entries()].map(([id, m]) => {
    const d = data.get(id) ?? {};
    const ig = igniter.get(id) ?? {};
    const note = comments.get(id)?.Comments ?? "";
    const atmMaster = withUnit(m.Pressure ?? "", "atm");
    const atmData = plain(d["Pressure (atm)"] ?? "");
    const o2 = plain(m.Oxygen ?? "");
    const pct = (s: string | undefined) => {
      const v = plain(s ?? "");
      return v === null ? null : round(v * 100, 2);
    };
    const n = note.toLowerCase();
    return {
      testId: `cfi-${id}`,
      investigationId: "cfi",
      accession: "PSI-39",
      sourceFile: "CFI_DataSummary_Spreadsheet_Jan2021.xlsx",
      flexNumber: id,
      dateRaw: m["Test Date"] ?? "",
      localTimeRaw: m["Local Time"] ?? "",
      cirIdentifier: m.CIR ?? "",
      fuelRaw: m.Fuel ?? "",
      fiberSupport: m.Fiber === "Yes" ? true : m.Fiber === "No" ? false : null,
      pressureAtm: atmMaster,
      pressurePsi: atmMaster === null ? null : round(atmMaster * PSI_PER_ATM, 2),
      pressureRawMaster: m.Pressure ?? "",
      // Master and DATA each give a pressure; a mismatch is flagged, not resolved.
      pressureMismatch: atmMaster !== null && atmData !== null && Math.abs(atmMaster - atmData) > 0.01,
      pressureAtmDataSheet: atmData,
      o2Percent: pct(m.Oxygen),
      n2Percent: pct(m.Nitrogen),
      hePercent: pct(m.Helium),
      compositionSumPercent: [m.Oxygen, m.Nitrogen, m.Helium].map((x) => plain(x ?? "")).every((x) => x !== null)
        ? round(((o2 ?? 0) + (plain(m.Nitrogen ?? "") ?? 0) + (plain(m.Helium ?? "") ?? 0)) * 100, 2)
        : null,
      dropletInitialDiameterMm: plain(d["D0 ( mm )"] ?? ""),
      hotFlameExtinctionDiameterMm: plain(d["Dext, hot ( mm )"] ?? ""),
      coolFlameExtinctionDiameterMm: plain(d["Dext,cool ( mm )"] ?? ""),
      kHotMm2PerS: plain(d["khot ( mm^2/s )"] ?? ""),
      kCoolMm2PerS: plain(d["kcool ( mm^2/s )"] ?? ""),
      reignitions: plain(d.Reignitions ?? ""),
      hotFlameBurnTimeS: plain(d["HF Burn Time"] ?? ""),
      analysisCompleted: d["Completed Analysis?"] === "Yes" ? true : d["Completed Analysis?"] === "No" ? false : null,
      ignitionPowerW: withUnit(ig["Ignition Power ( W )"] ?? "", "w"),
      ignitionTimeMs: withUnit(ig["Ignition Time ( ms )"] ?? "", "ms"),
      commentsRaw: note,
      // Keyword reads of the investigators' notes (review these).
      notesMentionCoolFlame: /cool flame/.test(n),
      notesMentionNoCoolFlame: /no cool flame|without cool flame|no evidence of cool flame/.test(n),
      dataSource: "psi",
    };
  });
  writeFileSync(OUT, `${JSON.stringify(rows, null, 1)}\n`);

  const count = (f: (r: (typeof rows)[number]) => string) =>
    rows.reduce<Record<string, number>>((a, r) => ((a[f(r)] = (a[f(r)] ?? 0) + 1), a), {});
  const nums = (f: (r: (typeof rows)[number]) => number | null) => rows.map(f).filter((v): v is number => v !== null);
  const rg = (a: number[]) => (a.length ? `${Math.min(...a)}-${Math.max(...a)} (n=${a.length})` : "n/a");
  console.log(`${rows.length} tests -> ${OUT}`);
  console.log("fuels:", count((r) => r.fuelRaw));
  console.log("O2 %:", rg(nums((r) => r.o2Percent)), "| He %:", rg(nums((r) => r.hePercent)), "| pressure psi:", rg(nums((r) => r.pressurePsi)));
  console.log("pressure (atm) levels:", count((r) => String(r.pressureAtm)));
  console.log("O2 levels:", count((r) => String(r.o2Percent)));
  console.log("with cool-flame extinction diameter:", rows.filter((r) => r.coolFlameExtinctionDiameterMm !== null).length, "| notes mention cool flame:", rows.filter((r) => r.notesMentionCoolFlame).length, "| analysis completed:", rows.filter((r) => r.analysisCompleted).length);
  console.log("pressure mismatches master vs DATA:", rows.filter((r) => r.pressureMismatch).map((r) => `${r.flexNumber}:${r.pressureAtm}vs${r.pressureAtmDataSheet}`));
  console.log("unparsed pressure:", rows.filter((r) => r.pressureAtm === null).map((r) => `${r.flexNumber}:"${r.pressureRawMaster}"`));
  console.log("composition not summing 100:", rows.filter((r) => r.compositionSumPercent !== null && Math.abs(r.compositionSumPercent - 100) > 1.5).map((r) => `${r.flexNumber}:${r.compositionSumPercent}`));
}
void main();
