/**
 * npm run train (also runs automatically before `npm run build`).
 * Trains the ignition model on data/tests.json and writes data/model.json, so
 * swapping in real PSI data retrains the model with no code changes.
 */
import { validateDataset } from "@/lib/validate";
import { FILES, readJson } from "./io";
import { trainAndWriteModel } from "./model-artifact";

const report = validateDataset({
  investigations: readJson(FILES.investigations),
  tests: readJson(FILES.tests),
  scenarios: readJson(FILES.scenarios),
});
if (!report.ok || !report.data) {
  for (const e of report.errors) console.error(`error: ${e}`);
  process.exit(1);
}
const model = trainAndWriteModel(report.data);
console.log(
  `Trained ignition model on ${model.trainedOn.testCount} runs: train ${(model.metrics.trainAccuracy * 100).toFixed(1)}%, holdout ${(model.metrics.holdoutAccuracy * 100).toFixed(1)}% (majority baseline ${(model.metrics.holdoutBaselineAccuracy * 100).toFixed(1)}%).`
);
