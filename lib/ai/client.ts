import Anthropic from "@anthropic-ai/sdk";

/**
 * Single server-side Anthropic client. Never import this from client
 * components: the API key must stay on the server.
 */

export type AiConfig = {
  modelMain: string;
  modelFast: string;
  cacheOnly: boolean;
};

export function aiConfig(): AiConfig {
  return {
    modelMain: process.env.MODEL_MAIN?.trim() || "claude-sonnet-5-5",
    modelFast: process.env.MODEL_FAST?.trim() || "claude-haiku-5-5",
    cacheOnly: process.env.USE_CACHE_ONLY?.trim().toLowerCase() === "true",
  };
}

let client: Anthropic | null = null;

/** Lazily constructed so builds and cache-only demos never need credentials. */
export function anthropic(): Anthropic {
  if (!client) {
    // Resolves ANTHROPIC_API_KEY (or another configured credential source) from the environment.
    client = new Anthropic({ maxRetries: 2, timeout: 90_000 });
  }
  return client;
}

/**
 * Models that accept server-side refusal fallbacks. When a request is declined
 * by a safety classifier, the API re-runs it on a fallback model in the same
 * call. Models not listed (for example Haiku) are called without it.
 */
const FALLBACK_CAPABLE = new Set([
  "claude-sonnet-5-5",
  "claude-opus-5-5",
  "claude-opus-5",
  "claude-fable-5-2",
  "claude-fable-5-1",
]);

export function fallbackParams(model: string): {
  betas?: Anthropic.Beta.AnthropicBeta[];
  fallbacks?: Anthropic.Beta.Messages.BetaFallbacksParam;
} {
  return FALLBACK_CAPABLE.has(model)
    ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }
    : {};
}

export function textOf(message: Anthropic.Beta.Messages.BetaMessage): string {
  return message.content
    .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}
