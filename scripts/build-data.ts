/**
 * npm run build:data
 * Read the extracted NASA files in data/real/, normalize them, validate, and write the app's
 * dataset: data/investigations.json, data/runs.json, data/summaries.json. Fails on any error.
 */
import { join } from "node:path";
import { buildAll, REAL_FILE_NAMES, type RealFiles } from "@/lib/real/build";
import { validateDataset, validateSourceConversions } from "@/lib/validate";
import { FILES, readJson, writeJson, writeJsonLines } from "./io";

export function readRealFiles(dir = join("data", "real")): RealFiles {
  return Object.fromEntries(REAL_FILE_NAMES.map((n) => [n, readJson(join(dir, `${n}.json`))])) as RealFiles;
}

const real = readRealFiles();
const conversionErrors = validateSourceConversions(real);
const { investigations, runs, summaries } = buildAll(real);
const report = validateDataset({ investigations, runs, summaries, scenarios: readJson(FILES.scenarios) });

for (const w of report.warnings) console.warn(`warning: ${w}`);
for (const e of [...conversionErrors, ...report.errors]) console.error(`error: ${e}`);
if (!report.ok || conversionErrors.length) {
  console.error(`FAILED with ${report.errors.length + conversionErrors.length} error(s); nothing written.`);
  process.exit(1);
}

writeJson(FILES.investigations, investigations);
writeJsonLines(FILES.runs, runs);
writeJson(FILES.summaries, summaries);
const s = report.stats;
console.log(`OK: ${s.investigations} investigations, ${s.runs} runs, ${s.summaries} summaries, ${s.scenarios} scenarios.`);
