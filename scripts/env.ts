import { existsSync } from "node:fs";

/** Load .env.local (then .env) into process.env for CLI scripts. Existing env vars win. */
export function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    if (existsSync(file)) {
      try {
        process.loadEnvFile(file);
      } catch {
        // Malformed env files should not stop data scripts; defaults apply.
      }
    }
  }
}
