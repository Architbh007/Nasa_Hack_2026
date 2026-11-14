import { aiConfig, generate, generateStream, type ChatMessage } from "@/lib/ai/client";
import { cacheKey, readCache, writeCache } from "@/lib/ai/cache";
import { briefContext, runContext, runStats } from "@/lib/ai/context";
import { SiError } from "@/lib/ai/errors";
import { ASK_SYSTEM, PROMPT_VERSION } from "@/lib/ai/prompts";
import { retrieve } from "@/lib/ai/retrieval";
import { getDataset } from "@/lib/data";
import { placeRun } from "@/lib/metrics";
import { CATEGORIES } from "@/lib/schema";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type AskPlan = {
  key: string;
  model: string;
  sourceIds: string[];
  messages: ChatMessage[];
};

/** Retrieval plus prompt assembly for a chat turn. The last turn must be the user's question. */
export function planAsk(turns: readonly ChatTurn[]): AskPlan {
  const question = turns.at(-1);
  if (!question || question.role !== "user") throw new SiError("bad_request", "The last message must be a question.", 400);
  const { investigations, runsByInvestigation } = getDataset();
  // Follow-ups often lean on the previous question, so retrieve on both.
  const previousQuestion = [...turns.slice(0, -1)].reverse().find((t) => t.role === "user")?.content ?? "";
  const hits = retrieve(`${question.content} ${previousQuestion}`.trim(), investigations, 6);
  const records = hits.map((h) => {
    const runs = runsByInvestigation.get(h.investigation.id) ?? [];
    return {
      retrievalScore: Math.round(h.score * 100) / 100,
      ...briefContext(h.investigation, runs),
      runStatistics: runStats(runs),
      // A few example runs so answers can cite run ids; the full tables are in the Explorer.
      exampleRuns: runs.slice(0, 3).map((run) => runContext({ run, assumedPressure: placeRun(run)?.assumedPressure ?? false })),
    };
  });
  const overview = {
    totalInvestigations: investigations.length,
    totalRuns: [...runsByInvestigation.values()].reduce((n, r) => n + r.length, 0),
    investigationsByTeamCategory: Object.fromEntries(
      CATEGORIES.map((c) => [c, investigations.filter((i) => i.category === c).map((i) => i.id)])
    ),
    note: "Only the retrieved records below include details. Other ids are listed for orientation only.",
  };
  const context = `Dataset overview (JSON):\n${JSON.stringify(overview)}\n\nRetrieved records (JSON):\n${JSON.stringify(records, null, 1)}\n\nQuestion: ${question.content}`;
  const history: ChatMessage[] = turns
    .slice(0, -1)
    .map((t) => ({ role: t.role, content: t.content }));
  const messages: ChatMessage[] = [...history, { role: "user", content: context }];
  const model = aiConfig().modelMain;
  return {
    key: cacheKey({ kind: "ask", model, v: PROMPT_VERSION, system: ASK_SYSTEM, messages }),
    model,
    sourceIds: hits.map((h) => h.investigation.id),
    messages,
  };
}

export async function cachedAnswer(plan: AskPlan): Promise<string | null> {
  const hit = await readCache<{ text: string }>(plan.key);
  return hit && typeof hit.output?.text === "string" ? hit.output.text : null;
}

export async function saveAnswer(plan: AskPlan, text: string, question: string): Promise<void> {
  await writeCache({
    key: plan.key,
    kind: "ask",
    model: plan.model,
    label: `ask:${question.slice(0, 80)}`,
    createdAt: new Date().toISOString(),
    output: { text },
  });
}

export function startAskStream(plan: AskPlan) {
  return generateStream({ model: plan.model, system: ASK_SYSTEM, messages: plan.messages, effort: "low" });
}

/** Non-interactive answer (used by the prewarm script): cached if present, otherwise generated and cached. */
export async function answerOnce(turns: readonly ChatTurn[]): Promise<{ text: string; cached: boolean }> {
  const plan = planAsk(turns);
  const hit = await cachedAnswer(plan);
  if (hit !== null) return { text: hit, cached: true };
  const { text, refused } = await generate({ model: plan.model, system: ASK_SYSTEM, messages: plan.messages, effort: "low" });
  if (refused) throw new SiError("refused", "The SI declined to answer this question.", 422);
  if (!text) throw new SiError("invalid_output", "Empty answer.", 502);
  await saveAnswer(plan, text, turns.at(-1)?.content ?? "");
  return { text, cached: false };
}
