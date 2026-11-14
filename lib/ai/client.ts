import OpenAI from "openai";
import type { Response as OpenAIResponse, ResponseStreamEvent } from "openai/resources/responses/responses";

/**
 * Single server-side OpenAI client. Never import this from client
 * components: the API key must stay on the server.
 */

export type AiConfig = {
  modelMain: string;
  modelFast: string;
  cacheOnly: boolean;
};

export function aiConfig(): AiConfig {
  return {
    modelMain: process.env.MODEL_MAIN?.trim() || "gpt-6.1-sol",
    modelFast: process.env.MODEL_FAST?.trim() || "gpt-6-luna",
    cacheOnly: process.env.USE_CACHE_ONLY?.trim().toLowerCase() === "true",
  };
}

let client: OpenAI | null = null;

/** Lazily constructed so builds and cache-only demos never need credentials. */
export function openai(): OpenAI {
  if (!client) {
    // Resolves OPENAI_API_KEY from the environment.
    client = new OpenAI({ maxRetries: 2, timeout: 90_000 });
  }
  return client;
}

export type Effort = "low" | "medium" | "high";
export type ChatMessage = { role: "user" | "assistant"; content: string };

export type GenerateParams = {
  model: string;
  system: string;
  messages: ChatMessage[];
  effort?: Effort;
  maxTokens?: number;
};

/** Reasoning effort is only accepted by reasoning models; plain models reject the parameter. */
const NON_REASONING = /^(gpt-4|gpt-3\.5|chatgpt-)/i;

function requestBody(p: GenerateParams) {
  return {
    model: p.model,
    instructions: p.system,
    input: p.messages,
    max_output_tokens: p.maxTokens ?? 8000,
    ...(NON_REASONING.test(p.model) ? {} : { reasoning: { effort: p.effort ?? "low" } }),
  };
}

/** True when the model declined (a refusal content part instead of text). */
export function isRefusal(response: OpenAIResponse): boolean {
  return response.output.some(
    (item) => item.type === "message" && item.content.some((c) => c.type === "refusal")
  );
}

export async function generate(p: GenerateParams): Promise<{ text: string; refused: boolean }> {
  const response = await openai().responses.create(requestBody(p));
  return { text: (response.output_text ?? "").trim(), refused: isRefusal(response) };
}

export function generateStream(p: GenerateParams) {
  return openai().responses.stream(requestBody(p));
}

export function textDelta(event: ResponseStreamEvent): string | null {
  return event.type === "response.output_text.delta" ? event.delta : null;
}
