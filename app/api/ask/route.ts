import { z } from "zod";
import { aiConfig, isRefusal, textDelta } from "@/lib/ai/client";
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

    const stream = startAskStream(plan);
    const iterator = stream[Symbol.asyncIterator]();
    // Pull the first event before responding so credential and connection errors return as JSON.
    const first = await iterator.next();

    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        let full = "";
        const emit = (text: string) => {
          full += text;
          controller.enqueue(encoder.encode(text));
        };
        try {
          let step = first;
          while (!step.done) {
            const delta = textDelta(step.value);
            if (delta) emit(delta);
            step = await iterator.next();
          }
          const final = await stream.finalResponse();
          if (isRefusal(final)) {
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
        stream.abort();
      },
    });
    return new Response(body, { headers: { ...headers, [CACHED_HEADER]: "0" } });
  } catch (err) {
    return errorResponse(err);
  }
}
