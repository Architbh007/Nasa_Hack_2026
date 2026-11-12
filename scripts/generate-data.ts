/**
 * npm run generate
 * Builds the synthetic dataset from DATA_SEED, writes /data/*.json, validates
 * the result, then trains the ignition model (data/model.json).
 */
import { generateDataset } from "./generator";
import { loadEnv } from "./env";
import { FILES, writeJson, writeJsonLines } from "./io";
import { validateDataset } from "@/lib/validate";
import { trainAndWriteModel } from "./model-artifact";

loadEnv();
const seed = Number.parseInt(process.env.DATA_SEED ?? "42", 10);
if (!Number.isFinite(seed)) {
  console.error(`DATA_SEED must be an integer, got "${process.env.DATA_SEED}"`);
  process.exit(1);
}

const dataset = generateDataset(seed);
writeJson(FILES.investigations, dataset.investigations);
writeJsonLines(FILES.tests, dataset.tests);
writeJson(FILES.scenarios, dataset.scenarios);

const report = validateDataset(dataset);
for (const w of report.warnings) console.warn(`warning: ${w}`);
if (!report.ok) {
  for (const e of report.errors) console.error(`error: ${e}`);
  process.exit(1);
}

const outcomes = new Map<string, number>();
for (const t of dataset.tests) outcomes.set(t.outcome, (outcomes.get(t.outcome) ?? 0) + 1);

console.log(`Seed ${seed}: ${report.stats.investigations} investigations, ${report.stats.tests} tests (${report.stats.testsPerInvestigation.min}-${report.stats.testsPerInvestigation.max} per investigation), ${report.stats.scenarios} scenarios.`);
console.log(`Outcomes: ${[...outcomes].map(([k, v]) => `${k} ${v}`).join(", ")}`);

const model = trainAndWriteModel(dataset);
console.log(
  `Model: train accuracy ${(model.metrics.trainAccuracy * 100).toFixed(1)}%, holdout accuracy ${(model.metrics.holdoutAccuracy * 100).toFixed(1)}% (${model.metrics.nTrain}/${model.metrics.nHoldout} runs).`
);
