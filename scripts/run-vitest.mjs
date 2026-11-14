// Windows quirk: when the shell's cwd has a lowercase drive letter (c:\...),
// vitest can load two copies of itself and every suite fails with
// "Cannot read properties of undefined (reading 'config')". Normalize the
// drive letter, then hand off to the vitest CLI.
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const cwd = process.cwd().replace(/^([a-z]):/, (_, d) => `${d.toUpperCase()}:`);
const bin = join(cwd, "node_modules", "vitest", "vitest.mjs");
const result = spawnSync(process.execPath, [bin, ...process.argv.slice(2)], {
  cwd,
  stdio: "inherit",
  env: { VITE_CONFIG_NATIVE_IGNORE_WARNING: "true", ...process.env },
});
process.exit(result.status ?? 1);
