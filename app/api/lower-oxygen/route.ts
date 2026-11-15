import { z } from "zod";
import { errorResponse, okResponse } from "@/lib/ai/errors";
import { explainLowerOxygen } from "@/lib/ai/operations";
import { parseBody } from "@/lib/ai/request";
import { O2_SLIDER, PRESSURE_SLIDER } from "@/lib/constants";
import { normalizeHabitatInputs } from "@/lib/habitat";
import { MAX_COMPARE_O2 } from "@/lib/lower-oxygen";
import { AirflowSchema, HabitatGravitySchema, MaterialClassSchema } from "@/lib/schema";

const Body = z.object({
  inputs: z.object({
    o2Percent: z.number().min(O2_SLIDER.min).max(O2_SLIDER.max),
    pressurePsi: z.number().min(PRESSURE_SLIDER.min).max(PRESSURE_SLIDER.max),
    materialClass: MaterialClassSchema,
    airflow: AirflowSchema,
    gravity: HabitatGravitySchema,
  }),
  fromO2: z.number().min(0).max(MAX_COMPARE_O2),
  toO2: z.number().min(0).max(MAX_COMPARE_O2),
});

// SI calls can take longer than the default serverless limit.
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { inputs, fromO2, toO2 } = await parseBody(req, Body);
    const half = (v: number) => Math.round(v * 2) / 2;
    const r = await explainLowerOxygen(normalizeHabitatInputs(inputs), half(fromO2), half(toO2));
    return okResponse(r.data, { cached: r.cached, model: r.model });
  } catch (err) {
    return errorResponse(err);
  }
}
