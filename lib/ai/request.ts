import { z } from "zod";
import { SiError } from "@/lib/ai/errors";

const MAX_BODY_BYTES = 8_000;

/** Read a JSON body with a size limit and validate it; throws SiError("bad_request") with a friendly message. */
export async function parseBody<S extends z.ZodType>(req: Request, schema: S, maxBytes = MAX_BODY_BYTES): Promise<z.infer<S>> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new SiError("bad_request", "Request is too large.", 413);
  const text = await req.text();
  if (text.length > maxBytes) throw new SiError("bad_request", "Request is too large.", 413);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new SiError("bad_request", "Request body must be JSON.", 400);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path.length ? `${first.path.map(String).join(".")}: ` : "";
    throw new SiError("bad_request", `Invalid request (${where}${first?.message ?? "unknown error"}).`, 400);
  }
  return parsed.data;
}

export const IdSchema = z.string().trim().min(1).max(64).regex(/^[a-z0-9-]+$/, "must be a lowercase id");
