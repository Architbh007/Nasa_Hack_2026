import { z } from "zod";
import { errorResponse, okResponse } from "@/lib/ai/errors";
import { explainEdge } from "@/lib/ai/operations";
import { IdSchema, parseBody } from "@/lib/ai/request";

const Body = z.object({ source: IdSchema, target: IdSchema }).refine((b) => b.source !== b.target, {
  message: "source and target must differ",
});

export async function POST(req: Request) {
  try {
    const { source, target } = await parseBody(req, Body);
    const r = await explainEdge(source, target);
    return okResponse(r.data, { cached: r.cached, model: r.model });
  } catch (err) {
    return errorResponse(err);
  }
}
