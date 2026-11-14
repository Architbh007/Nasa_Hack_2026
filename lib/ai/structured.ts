import type { z } from "zod";
import { aiConfig, openai, type ChatMessage } from "@/lib/ai/client";
import { cacheKey, readCache, writeCache } from "@/lib/ai/cache";
import { SiError } from "@/lib/ai/errors";
import { PROMPT_VERSION, retryNote } from "@/lib/ai/prompts";

type Effort = "low" | "medium" | "high";

export type StructuredRequest<S extends z.ZodType> = {
  kind: string;
  /** Short human-readable label stored with the cache entry. */
  label: string;
  model: string;
  system: string;
  /** Grounded input; serialized into the user message and the cache key. */
  input: unknown;
  schema: S;
  /** How much thinking the task needs; kept as a hint (not sent, so any chat model works). */
  effort?: Effort;
  maxTokens?: number;
};

export type StructuredResult<T> = { data: T; cached: boolean; model: string };

/** Pull the JSON object out of a reply, tolerating stray code fences or prose. */
export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const body = fenced?.[1] ?? text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object found in the reply");
  return JSON.parse(body.slice(start, end + 1));
}

function describeIssues(err: z.ZodError): string {
  return err.issues
    .slice(0, 6)
    .map((i) => `${i.path.map(String).join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}

async function callModel(model: string, system: string, messages: ChatMessage[], maxTokens: number): Promise<string> {
  const response = await openai().chat.completions.create({
    model,
    max_completion_tokens: maxTokens,
    // JSON mode: the reply must be a single JSON object (the prompts say so too).
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: system }, ...messages],
  });
  const choice = response.choices[0];
  if (choice?.message.refusal || choice?.finish_reason === "content_filter") {
    throw new SiError("refused", "The SI declined to answer this request. Try rephrasing or a different input.", 422);
  }
  return (choice?.message.content ?? "").trim();
}

/**
 * Cached, validated JSON call: request JSON only, parse, validate with zod,
 * and retry once with the validation error appended.
 */
export async function structuredCall<S extends z.ZodType>(req: StructuredRequest<S>): Promise<StructuredResult<z.infer<S>>> {
  const key = cacheKey({ kind: req.kind, model: req.model, v: PROMPT_VERSION, system: req.system, input: req.input });
  const hit = await readCache<unknown>(key);
  if (hit) {
    const parsed = req.schema.safeParse(hit.output);
    if (parsed.success) return { data: parsed.data, cached: true, model: hit.model };
  }
  if (aiConfig().cacheOnly) {
    throw new SiError("cache_miss", "Cache-only demo mode is on and this result has not been precomputed. Run npm run prewarm or set USE_CACHE_ONLY=false.", 503);
  }

  const userText = `Data (JSON):\n${JSON.stringify(req.input, null, 1)}`;
  const messages: ChatMessage[] = [{ role: "user", content: userText }];
  const maxTokens = req.maxTokens ?? 8000;

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await callModel(req.model, req.system, messages, maxTokens);
    try {
      const parsed = req.schema.safeParse(extractJson(text));
      if (parsed.success) {
        await writeCache({
          key,
          kind: req.kind,
          model: req.model,
          label: req.label,
          createdAt: new Date().toISOString(),
          output: parsed.data,
        });
        return { data: parsed.data, cached: false, model: req.model };
      }
      lastError = describeIssues(parsed.error);
    } catch (e) {
      lastError = e instanceof Error ? e.message : "the reply was not valid JSON";
    }
    messages.push({ role: "assistant", content: text || "(empty reply)" }, { role: "user", content: retryNote(lastError) });
  }
  throw new SiError("invalid_output", `The SI returned an unusable answer twice (${lastError}). Please retry.`, 502);
}
