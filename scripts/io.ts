import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const DATA_DIR = "data";
export const FILES = {
  investigations: join(DATA_DIR, "investigations.json"),
  runs: join(DATA_DIR, "runs.json"),
  summaries: join(DATA_DIR, "summaries.json"),
  scenarios: join(DATA_DIR, "scenarios.json"),
} as const;

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/** One record per line: compact, but still diff-friendly for large arrays. */
export function writeJsonLines(path: string, rows: readonly unknown[]): void {
  mkdirSync(dirname(path), { recursive: true });
  const body = rows.map((r) => `  ${JSON.stringify(r)}`).join(",\n");
  writeFileSync(path, `[\n${body}\n]\n`, "utf8");
}
