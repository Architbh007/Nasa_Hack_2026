import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * File cache for SI outputs: data/cache/<sha256>.json. Committed cache files
 * let the demo run offline and keep API costs low. On read-only hosts
 * (Vercel) new entries fall back to the OS temp directory.
 */

export const CACHE_DIR = join(process.cwd(), "data", "cache");
const TMP_CACHE_DIR = join(tmpdir(), "firesight-cache");

export type CacheEntry<T> = {
  key: string;
  kind: string;
  model: string;
  label: string;
  createdAt: string;
  output: T;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

/** Hash of everything that determines an output: kind, model, prompt version and grounded input. */
export function cacheKey(parts: Record<string, unknown>): string {
  return createHash("sha256").update(stableStringify(parts)).digest("hex");
}

export async function readCache<T>(key: string): Promise<CacheEntry<T> | null> {
  for (const dir of [CACHE_DIR, TMP_CACHE_DIR]) {
    try {
      const raw = await readFile(join(dir, `${key}.json`), "utf8");
      return JSON.parse(raw) as CacheEntry<T>;
    } catch {
      // Missing or unreadable entry: try the next location.
    }
  }
  return null;
}

export async function writeCache<T>(entry: CacheEntry<T>): Promise<void> {
  const body = `${JSON.stringify(entry, null, 2)}\n`;
  for (const dir of [CACHE_DIR, TMP_CACHE_DIR]) {
    try {
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, `${entry.key}.json`), body, "utf8");
      return;
    } catch {
      // Read-only filesystem: fall through to the temp directory.
    }
  }
}
