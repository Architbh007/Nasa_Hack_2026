import { z } from "zod";
import { errorResponse, okResponse } from "@/lib/ai/errors";
import { explainFireEvent } from "@/lib/ai/operations";
import { parseBody } from "@/lib/ai/request";

const Body = z.object({ eventId: z.string().trim().min(1).max(60) });

// SI calls can take longer than the default serverless limit.
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { eventId } = await parseBody(req, Body);
    const r = await explainFireEvent(eventId);
    return okResponse(r.data, { cached: r.cached, model: r.model });
  } catch (err) {
    return errorResponse(err);
  }
}
