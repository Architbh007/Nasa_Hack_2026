import OpenAI from "openai";

/**
 * Single server-side OpenAI client. Never import this from client
 * components: the API key must stay on the server.
 */

export type AiConfig = {
  modelMain: string;
  modelFast: string;
  cacheOnly: boolean;
};

/** Defaults; override with MODEL_MAIN / MODEL_FAST in .env.local. */
export const DEFAULT_MODELS = { main: "gpt-6.1-sol", fast: "gpt-6-luna" } as const;

export function aiConfig(): AiConfig {
  return {
    modelMain: process.env.MODEL_MAIN?.trim() || DEFAULT_MODELS.main,
    modelFast: process.env.MODEL_FAST?.trim() || DEFAULT_MODELS.fast,
    cacheOnly: process.env.USE_CACHE_ONLY?.trim().toLowerCase() === "true",
  };
}

let client: OpenAI | null = null;

/** Lazily constructed so builds and cache-only demos never need credentials. Reads OPENAI_API_KEY. */
export function openai(): OpenAI {
  if (!client) client = new OpenAI({ maxRetries: 2, timeout: 90_000 });
  return client;
}

export type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;
