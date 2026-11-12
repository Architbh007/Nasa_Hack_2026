import { fitIgnitionModel, type ModelArtifact } from "@/lib/model";
import type { ParsedDataset } from "@/lib/validate";
import { FILES, writeJson } from "./io";

/** Fit the ignition model on a parsed dataset and write data/model.json. */
export function trainAndWriteModel(data: ParsedDataset): ModelArtifact {
  const model = fitIgnitionModel(data.tests, data.investigations);
  writeJson(FILES.model, model);
  return model;
}
