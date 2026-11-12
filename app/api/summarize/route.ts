import { z } from "zod";
import { errorResponse, okResponse } from "@/lib/ai/errors";
import { summarizeInvestigation } from "@/lib/ai/operations";
import { IdSchema, parseBody } from "@/lib/ai/request";

const Body = z.object({ investigationId: IdSchema });

// SI calls can take longer than the default serverless limit.
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { investigationId } = await parseBody(req, Body);
    const r = await summarizeInvestigation(investigationId);
    return okResponse(r.data, { cached: r.cached, model: r.model });
  } catch (err) {
    return errorResponse(err);
  }
}
