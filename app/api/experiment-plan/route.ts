import { z } from "zod";
import { SiError, errorResponse, okResponse } from "@/lib/ai/errors";
import { proposeExperimentPlan } from "@/lib/ai/operations";
import { IdSchema, parseBody } from "@/lib/ai/request";
import { getDataset } from "@/lib/data";
import { GRID_O2, GRID_PRESSURE } from "@/lib/flammability-grid";
import { PLAN_LIMITS, resolveTargets } from "@/lib/planner";
import { MaterialClassSchema } from "@/lib/schema";

const Body = z.object({
  targetIds: z.array(IdSchema).max(4),
  custom: z
    .object({
      o2Percent: z.number().min(GRID_O2.min).max(GRID_O2.max),
      pressurePsi: z.number().min(GRID_PRESSURE.min).max(GRID_PRESSURE.max),
    })
    .nullable()
    .optional(),
  scope: z.union([z.literal("all-solids"), MaterialClassSchema]),
  budget: z.number().int().min(PLAN_LIMITS.minBudget).max(PLAN_LIMITS.maxBudget),
  mode: z.enum(["stepping", "direct"]),
});

// SI calls can take longer than the default serverless limit.
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, Body);
    const targets = resolveTargets(getDataset().scenarios, body.targetIds, body.custom ?? null);
    if (targets.length === 0) throw new SiError("bad_request", "Choose at least one mission target.", 400);
    const r = await proposeExperimentPlan({ targets, scope: body.scope, budget: body.budget, mode: body.mode });
    return okResponse(r.data, { cached: r.cached, model: r.model });
  } catch (err) {
    return errorResponse(err);
  }
}
