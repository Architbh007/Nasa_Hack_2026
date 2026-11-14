/**
 * npm run prewarm  [-- --core]
 * Generates and caches SI outputs so the demo works offline with USE_CACHE_ONLY=true:
 *  - core: every investigation summary, every scenario readiness note, a
 *    habitat interpretation for each preset, and the planner demo proposal
 *  - extras (skipped with --core): Ask starter questions
 *    and the demo comparison
 * Already-cached results are reused, so re-running is cheap.
 */
import { loadEnv } from "./env";

loadEnv();
// Prewarming exists to fill the cache, so it always calls the API on a miss.
process.env.USE_CACHE_ONLY = "false";

type Task = { label: string; run: () => Promise<{ cached: boolean }> };

async function main() {
  const [{ getDataset }, ops, { answerOnce }, { inputsFromScenario, normalizeHabitatInputs }, { STARTER_QUESTIONS }, { toSiError }, { aiConfig }, { FIRE_EVENTS }, { resolveTargets }] =
    await Promise.all([
      import("@/lib/data"),
      import("@/lib/ai/operations"),
      import("@/lib/ai/ask"),
      import("@/lib/habitat"),
      import("@/lib/ask"),
      import("@/lib/ai/errors"),
      import("@/lib/ai/client"),
      import("@/lib/fire-history"),
      import("@/lib/planner"),
    ]);

  const core = process.argv.includes("--core");
  const { investigations, scenarios } = getDataset();
  const tasks: Task[] = [];

  for (const inv of investigations) {
    tasks.push({ label: `summary   ${inv.id}`, run: () => ops.summarizeInvestigation(inv.id) });
  }
  for (const s of scenarios) {
    tasks.push({ label: `scenario  ${s.id}`, run: () => ops.summarizeScenario(s.id) });
    tasks.push({ label: `habitat   ${s.id}`, run: () => ops.interpretHabitat(normalizeHabitatInputs(inputsFromScenario(s))) });
  }
  // The planner's demo plan: lunar and Mars-transit targets, all solids, five stepping-stone tests.
  {
    const targets = resolveTargets(scenarios, ["lunar-base", "mars-transit"]);
    tasks.push({ label: "plan      lunar+mars/all-solids/5/stepping", run: () => ops.proposeExperimentPlan({ targets, scope: "all-solids", budget: 5, mode: "stepping" }) });
  }
  for (const e of FIRE_EVENTS) {
    tasks.push({ label: `lesson    ${e.id}`, run: () => ops.explainFireEvent(e.id) });
  }
  for (const s of scenarios) {
    const inputs = normalizeHabitatInputs(inputsFromScenario(s));
    tasks.push({
      label: `fire-twin ${s.id}`,
      run: () => ops.narrateFireTwin(inputs, { startItemId: "stowage-bag", ventsOn: inputs.airflow !== "quiescent", crewResponse: true }),
    });
  }
  if (!core) {
    for (const q of STARTER_QUESTIONS) {
      tasks.push({ label: `ask       ${q.slice(0, 48)}`, run: () => answerOnce([{ role: "user", content: q }]) });
    }
    tasks.push({ label: "compare   bass,bass-ii,saffire-ii", run: () => ops.compareInvestigations(["bass", "bass-ii", "saffire-ii"]) });
  }

  const { modelMain, modelFast } = aiConfig();
  console.log(`Prewarming ${tasks.length} SI outputs (main ${modelMain}, fast ${modelFast})${core ? " [core only]" : ""}\n`);

  let fresh = 0;
  let cached = 0;
  const failures: string[] = [];
  let stop = false;
  let next = 0;
  const started = Date.now();

  async function worker() {
    while (!stop && next < tasks.length) {
      const task = tasks[next++] as Task;
      try {
        const r = await task.run();
        if (r.cached) cached++;
        else fresh++;
        console.log(`${r.cached ? "  cached" : "  new   "}  ${task.label}`);
      } catch (err) {
        const e = toSiError(err);
        failures.push(`${task.label}: ${e.message}`);
        console.log(`  FAILED  ${task.label}  (${e.code})`);
        if (e.code === "no_credentials") stop = true;
      }
    }
  }
  await Promise.all([worker(), worker(), worker()]);

  const secs = ((Date.now() - started) / 1000).toFixed(0);
  console.log(`\nDone in ${secs}s: ${fresh} generated, ${cached} already cached, ${failures.length} failed.`);
  if (stop) {
    console.log("\nNo API credentials found. Set OPENAI_API_KEY in .env.local and run npm run prewarm again.");
  }
  if (failures.length) {
    for (const f of failures.slice(0, 10)) console.log(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log("Commit data/cache/*.json so deployments and USE_CACHE_ONLY demos can serve these results.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
