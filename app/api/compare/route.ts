import { z } from "zod";
import { errorResponse, okResponse } from "@/lib/ai/errors";
import { compareInvestigations } from "@/lib/ai/operations";
import { IdSchema, parseBody } from "@/lib/ai/request";

const Body = z.object({ ids: z.array(IdSchema).min(2).max(4) });

export async function POST(req: Request) {
  try {
    const { ids } = await parseBody(req, Body);
    const r = await compareInvestigations(ids);
    return okResponse(r.data, { cached: r.cached, model: r.model });
  } catch (err) {
    return errorResponse(err);
  }
}
