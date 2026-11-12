import type Anthropic from "@anthropic-ai/sdk";
import { aiConfig, anthropic, fallbackParams } from "@/lib/ai/client";
import { cacheKey, readCache, writeCache } from "@/lib/ai/cache";
import { briefContext, testStats } from "@/lib/ai/context";
import { SiError } from "@/lib/ai/errors";
import { ASK_SYSTEM, PROMPT_VERSION } from "@/lib/ai/prompts";
import { retrieve } from "@/lib/ai/retrieval";
import { getDataset } from "@/lib/data";
import { FUEL_PHASES } from "@/lib/schema";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type AskPlan = {
  key: string;
  model: string;
  sourceIds: string[];
  messages: Anthropic.Beta.Messages.BetaMessageParam[];
};

/** Retrieval plus prompt assembly for a chat turn. The last turn must be the user's question. */
export function planAsk(turns: readonly ChatTurn[]): AskPlan {
  const question = turns.at(-1);
  if (!question || question.role !== "user") throw new SiError("bad_request", "The last message must be a question.", 400);
  const { investigations, testsByInvestigation } = getDataset();
  // Follow-ups often lean on the previous question, so retrieve on both.
  const previousQuestion = [...turns.slice(0, -1)].reverse().find((t) => t.role === "user")?.content ?? "";
  const hits = retrieve(`${question.content} ${previousQuestion}`.trim(), investigations, 6);
  const records = hits.map((h) => ({
    retrievalScore: Math.round(h.score * 100) / 100,
    ...briefContext(h.investigation, testsByInvestigation.get(h.investigation.id) ?? []),
    aggregateTestStats: testStats(testsByInvestigation.get(h.investigation.id) ?? []),
  }));
  const overview = {
    totalInvestigations: investigations.length,
    investigationsByFuelPhase: Object.fromEntries(
      FUEL_PHASES.map((p) => [p, investigations.filter((i) => i.fuelPhase === p).map((i) => i.id)])
    ),
    note: "Only the retrieved records below include details. Other ids are listed for orientation only.",
  };
  const context = `Dataset overview (JSON):\n${JSON.stringify(overview)}\n\nRetrieved records (JSON):\n${JSON.stringify(records, null, 1)}\n\nQuestion: ${question.content}`;
  const history: Anthropic.Beta.Messages.BetaMessageParam[] = turns
    .slice(0, -1)
    .map((t) => ({ role: t.role, content: t.content }));
  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [...history, { role: "user", content: context }];
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
  return anthropic().beta.messages.stream({
    model: plan.model,
    max_tokens: 8000,
    system: ASK_SYSTEM,
    messages: plan.messages,
    output_config: { effort: "low" },
    ...fallbackParams(plan.model),
  });
}
