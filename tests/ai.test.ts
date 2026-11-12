import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { citedIds, linkifyCitations } from "@/lib/citations";
import { habitatInterpretationSchema } from "@/lib/ai/schemas";

// In-memory cache and a scripted fake Anthropic client.
const store = new Map<string, unknown>();
vi.mock("@/lib/ai/cache", async (orig) => {
  const real = await orig<typeof import("@/lib/ai/cache")>();
  return {
    ...real,
    readCache: vi.fn(async (key: string) => (store.get(key) as never) ?? null),
    writeCache: vi.fn(async (entry: { key: string }) => {
      store.set(entry.key, entry);
    }),
  };
});

const replies: string[] = [];
const create = vi.fn(async () => ({
  stop_reason: "end_turn",
  content: [{ type: "text", text: replies.shift() ?? "" }],
}));
vi.mock("@/lib/ai/client", async (orig) => {
  const real = await orig<typeof import("@/lib/ai/client")>();
  return { ...real, anthropic: () => ({ beta: { messages: { create } } }) };
});

const { extractJson, structuredCall } = await import("@/lib/ai/structured");
const { SiError } = await import("@/lib/ai/errors");

const Schema = z.object({ answer: z.string().min(1) });
const req = (input: unknown) => ({ kind: "test", label: "t", model: "claude-sonnet-5-5", system: "sys", input, schema: Schema });

beforeEach(() => {
  store.clear();
  replies.length = 0;
  create.mockClear();
  delete process.env.USE_CACHE_ONLY;
});
afterEach(() => {
  delete process.env.USE_CACHE_ONLY;
});

describe("extractJson", () => {
  it("handles bare JSON, code fences and surrounding prose", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('```json\n{"a":2}\n```')).toEqual({ a: 2 });
    expect(extractJson('Here you go: {"a":3} hope that helps')).toEqual({ a: 3 });
    expect(() => extractJson("no json here")).toThrow();
  });
});

describe("structuredCall", () => {
  it("validates, caches, and serves the second call from cache", async () => {
    replies.push('{"answer":"yes"}');
    const first = await structuredCall(req({ q: 1 }));
    expect(first).toMatchObject({ data: { answer: "yes" }, cached: false });
    const second = await structuredCall(req({ q: 1 }));
    expect(second).toMatchObject({ data: { answer: "yes" }, cached: true });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("retries once with the validation error appended", async () => {
    replies.push('{"answer":""}', '{"answer":"fixed"}');
    const r = await structuredCall(req({ q: 2 }));
    expect(r.data.answer).toBe("fixed");
    expect(create).toHaveBeenCalledTimes(2);
    const secondCall = create.mock.calls[1] as unknown as [{ messages: Array<{ role: string; content: string }> }];
    const last = secondCall[0].messages.at(-1);
    expect(last?.role).toBe("user");
    expect(last?.content).toMatch(/answer/);
  });

  it("fails with invalid_output after two bad replies", async () => {
    replies.push("not json", "still not json");
    await expect(structuredCall(req({ q: 3 }))).rejects.toMatchObject({ code: "invalid_output" });
  });

  it("opts the main model into server-side refusal fallbacks but not the fast model", async () => {
    replies.push('{"answer":"a"}', '{"answer":"b"}');
    await structuredCall(req({ q: 4 }));
    await structuredCall({ ...req({ q: 5 }), model: "claude-haiku-5-5" });
    const [main, fast] = create.mock.calls as unknown as Array<[Record<string, unknown>]>;
    expect(main?.[0]).toMatchObject({ fallbacks: "default", betas: ["server-side-fallback-2026-07-01"] });
    expect(fast?.[0]).not.toHaveProperty("fallbacks");
  });

  it("never calls the API in cache-only mode", async () => {
    process.env.USE_CACHE_ONLY = "true";
    await expect(structuredCall(req({ q: 6 }))).rejects.toBeInstanceOf(SiError);
    await expect(structuredCall(req({ q: 6 }))).rejects.toMatchObject({ code: "cache_miss" });
    expect(create).not.toHaveBeenCalled();
  });

  it("maps a refusal stop reason to a friendly error", async () => {
    create.mockImplementationOnce(async () => ({ stop_reason: "refusal", content: [] }));
    await expect(structuredCall(req({ q: 7 }))).rejects.toMatchObject({ code: "refused" });
  });
});

describe("habitat interpretation schema", () => {
  const schema = habitatInterpretationSchema(new Set(["bass", "bass-ii"]));
  const base = {
    summary: "s",
    riskDrivers: ["r"],
    relevantEvidence: [{ investigationId: "bass", evidence: "e", relevance: "r" }],
    knowledgeGaps: ["g"],
    recommendedTests: [{ test: "t", rationale: "r" }],
    designImplications: { prevention: [], detection: [], suppression: [] },
  };
  it("accepts cited ids from the provided list only", () => {
    expect(schema.safeParse(base).success).toBe(true);
    const bad = { ...base, relevantEvidence: [{ investigationId: "made-up", evidence: "e", relevance: "r" }] };
    expect(schema.safeParse(bad).success).toBe(false);
  });
});

describe("citations", () => {
  const ids = new Set(["bass", "bass-ii", "flex"]);
  const acr = (id: string) => id.toUpperCase();
  it("links known ids and leaves unknown brackets alone", () => {
    expect(linkifyCitations("See [bass-ii].", ids, acr)).toBe("See [BASS-II](/explore?id=bass-ii).");
    expect(linkifyCitations("Both [bass, flex].", ids, acr)).toBe("Both [BASS](/explore?id=bass), [FLEX](/explore?id=flex).");
    expect(linkifyCitations("Ref [1] and [nope].", ids, acr)).toBe("Ref [1] and [nope].");
    expect(citedIds("[flex] then [bass, flex]", ids)).toEqual(["flex", "bass"]);
  });
});
