import { z } from "zod";
import { aiConfig } from "@/lib/ai/client";
import { cachedAnswer, planAsk, saveAnswer, startAskStream } from "@/lib/ai/ask";
import { errorResponse, SiError, toSiError } from "@/lib/ai/errors";
import { parseBody } from "@/lib/ai/request";
import { ASK_LIMITS, CACHED_HEADER, SOURCES_HEADER, STREAM_ERROR_MARKER } from "@/lib/ask";

const Turn = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(ASK_LIMITS.messageChars),
});
const Body = z.object({
  messages: z
    .array(Turn)
    .min(1)
    .max(ASK_LIMITS.historyMessages)
    .refine((m) => m.at(-1)?.role === "user", { message: "the last message must be the user's question" })
    .refine((m) => (m.at(-1)?.content.length ?? 0) <= ASK_LIMITS.questionChars, {
      message: `questions are limited to ${ASK_LIMITS.questionChars} characters`,
    }),
});

const encoder = new TextEncoder();

/** Replay a cached answer as a stream so the UI behaves the same either way. */
function replay(text: string): ReadableStream<Uint8Array> {
  const chunks = text.match(/[\s\S]{1,28}/g) ?? [];
  return new ReadableStream({
    async start(controller) {
      for (const c of chunks) {
        controller.enqueue(encoder.encode(c));
        await new Promise((r) => setTimeout(r, 8));
      }
      controller.close();
    },
  });
}

// SI calls can take longer than the default serverless limit.
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages } = await parseBody(req, Body, 40_000);
    const plan = planAsk(messages);
    const question = messages.at(-1)?.content ?? "";
    const headers = {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      [SOURCES_HEADER]: plan.sourceIds.join(","),
    };

    const cached = await cachedAnswer(plan);
    if (cached !== null) return new Response(replay(cached), { headers: { ...headers, [CACHED_HEADER]: "1" } });
    if (aiConfig().cacheOnly) {
      throw new SiError("cache_miss", "Cache-only demo mode is on and this question has no precomputed answer. Try a starter question.", 503);
    }

    // Awaiting the request before responding lets credential and connection errors return as JSON.
    const stream = await startAskStream(plan);

    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        let full = "";
        let refused = false;
        try {
          for await (const chunk of stream) {
            const choice = chunk.choices[0];
            const text = choice?.delta?.content;
            if (text) {
              full += text;
              controller.enqueue(encoder.encode(text));
            }
            if (choice?.delta?.refusal || choice?.finish_reason === "content_filter") refused = true;
          }
          if (refused) {
            controller.enqueue(encoder.encode(`${STREAM_ERROR_MARKER}The SI declined to answer this question. Try rephrasing it.`));
          } else if (full.trim()) {
            await saveAnswer(plan, full, question);
          }
        } catch (err) {
          controller.enqueue(encoder.encode(`${STREAM_ERROR_MARKER}${toSiError(err).message}`));
        } finally {
          controller.close();
        }
      },
      cancel() {
        stream.controller.abort();
      },
    });
    return new Response(body, { headers: { ...headers, [CACHED_HEADER]: "0" } });
  } catch (err) {
    return errorResponse(err);
  }
}
