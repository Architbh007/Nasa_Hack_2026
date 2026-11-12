/** npm run validate:data — schema and cross-file checks on /data. */
import { validateDataset } from "@/lib/validate";
import { FILES, readJson } from "./io";

const report = validateDataset({
  investigations: readJson(FILES.investigations),
  tests: readJson(FILES.tests),
  scenarios: readJson(FILES.scenarios),
});
for (const w of report.warnings) console.warn(`warning: ${w}`);
for (const e of report.errors) console.error(`error: ${e}`);
console.log(
  report.ok
    ? `OK: ${report.stats.investigations} investigations, ${report.stats.tests} tests, ${report.stats.scenarios} scenarios.`
    : `FAILED with ${report.errors.length} error(s).`
);
process.exit(report.ok ? 0 : 1);
