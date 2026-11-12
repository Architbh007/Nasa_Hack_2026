"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SiResponseBody } from "@/lib/ai/errors";

export type SiState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T; cached: boolean; model: string }
  | { status: "error"; code: string; message: string };

async function postSi<T>(url: string, body: string, signal?: AbortSignal): Promise<SiState<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      signal,
    });
    const json = (await res.json()) as SiResponseBody<T>;
    if (json.ok) return { status: "success", data: json.data, cached: json.cached, model: json.model };
    return { status: "error", code: json.error.code, message: json.error.message };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return { status: "loading" };
    return { status: "error", code: "network", message: "Could not reach the server. Check your connection and retry." };
  }
}

/** Fetch an SI result automatically whenever `body` changes (null = do nothing). */
export function useSiQuery<T>(url: string, body: unknown | null) {
  const key = body === null ? null : JSON.stringify(body);
  const [nonce, setNonce] = useState(0);
  const requestKey = key === null ? null : `${key}#${nonce}`;
  const [result, setResult] = useState<{ requestKey: string; state: SiState<T> } | null>(null);

  useEffect(() => {
    if (key === null || requestKey === null) return;
    const ctrl = new AbortController();
    postSi<T>(url, key, ctrl.signal).then((state) => {
      if (!ctrl.signal.aborted) setResult({ requestKey, state });
    });
    return () => ctrl.abort();
  }, [url, key, requestKey]);

  const state: SiState<T> =
    requestKey === null ? { status: "idle" } : result?.requestKey === requestKey ? result.state : { status: "loading" };
  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { state, retry };
}

/** Run an SI request on demand (for buttons). Stale responses are ignored. */
export function useSiMutation<T>(url: string) {
  const [state, setState] = useState<SiState<T>>({ status: "idle" });
  const latest = useRef(0);
  const run = useCallback(
    async (body: unknown) => {
      const id = ++latest.current;
      setState({ status: "loading" });
      const next = await postSi<T>(url, JSON.stringify(body));
      if (id === latest.current) setState(next);
    },
    [url]
  );
  const reset = useCallback(() => {
    latest.current++;
    setState({ status: "idle" });
  }, []);
  return { state, run, reset };
}
