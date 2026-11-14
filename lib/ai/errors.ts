import OpenAI from "openai";

export type SiErrorCode =
  | "bad_request"
  | "not_found"
  | "cache_miss"
  | "no_credentials"
  | "rate_limited"
  | "upstream_error"
  | "refused"
  | "invalid_output";

export class SiError extends Error {
  constructor(
    public readonly code: SiErrorCode,
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export type SiErrorBody = { ok: false; error: { code: SiErrorCode; message: string } };
export type SiSuccessBody<T> = { ok: true; data: T; cached: boolean; model: string };
export type SiResponseBody<T> = SiSuccessBody<T> | SiErrorBody;

/** Map SDK and internal errors to a friendly message the UI can show as-is. */
export function toSiError(err: unknown): SiError {
  if (err instanceof SiError) return err;
  if (err instanceof OpenAI.AuthenticationError || err instanceof OpenAI.PermissionDeniedError) {
    return new SiError("no_credentials", "The SI service is not configured on this deployment (missing or invalid API key). Cached results still work.", 503);
  }
  if (err instanceof OpenAI.RateLimitError) {
    return new SiError("rate_limited", "The SI service is busy right now. Please try again in a moment.", 429);
  }
  if (err instanceof OpenAI.NotFoundError) {
    return new SiError("upstream_error", "The configured SI model was not found. Check MODEL_MAIN and MODEL_FAST.", 502);
  }
  if (err instanceof OpenAI.BadRequestError) {
    return new SiError("upstream_error", "The SI service rejected the request. Try a different input.", 502);
  }
  if (err instanceof OpenAI.APIConnectionError) {
    return new SiError("upstream_error", "Could not reach the SI service. Check the network connection.", 502);
  }
  if (err instanceof OpenAI.APIError) {
    return new SiError("upstream_error", `The SI service returned an error (${err.status ?? "unknown"}). Please retry.`, 502);
  }
  // Credentials missing entirely surface as a plain Error from the SDK constructor.
  if (err instanceof Error && /api[_ ]?key|credential|auth/i.test(err.message)) {
    return new SiError("no_credentials", "The SI service is not configured on this deployment (no API key). Cached results still work.", 503);
  }
  return new SiError("upstream_error", "Something went wrong generating this result. Please retry.", 500);
}

export function errorResponse(err: unknown): Response {
  const e = toSiError(err);
  if (e.code === "upstream_error" && e.status === 500) console.error("[si]", err);
  const body: SiErrorBody = { ok: false, error: { code: e.code, message: e.message } };
  return Response.json(body, { status: e.status });
}

export function okResponse<T>(data: T, meta: { cached: boolean; model: string }): Response {
  const body: SiSuccessBody<T> = { ok: true, data, ...meta };
  return Response.json(body);
}
