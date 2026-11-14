import { z } from "zod";
import { errorResponse, okResponse } from "@/lib/ai/errors";
import { interpretHabitat } from "@/lib/ai/operations";
import { parseBody } from "@/lib/ai/request";
import { O2_SLIDER, PRESSURE_SLIDER } from "@/lib/constants";
import { normalizeHabitatInputs } from "@/lib/habitat";
import { AirflowSchema, HabitatGravitySchema, MaterialClassSchema } from "@/lib/schema";

const weight = z.number().min(0).max(1);
const Body = z.object({
  inputs: z.object({
    o2Percent: z.number().min(O2_SLIDER.min).max(O2_SLIDER.max),
    pressurePsi: z.number().min(PRESSURE_SLIDER.min).max(PRESSURE_SLIDER.max),
    materialClass: MaterialClassSchema,
    airflow: AirflowSchema,
    gravity: HabitatGravitySchema,
  }),
  weights: z
    .object({ rangeOverlap: weight, categoryMatch: weight, flowMatch: weight, evidenceLevel: weight })
    .optional(),
});

// SI calls can take longer than the default serverless limit.
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { inputs, weights } = await parseBody(req, Body);
    const r = await interpretHabitat(normalizeHabitatInputs(inputs), weights);
    return okResponse(r.data, { cached: r.cached, model: r.model });
  } catch (err) {
    return errorResponse(err);
  }
}
