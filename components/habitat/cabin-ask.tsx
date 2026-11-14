"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowUp, Database, Eraser, Sparkles, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiError, SiSkeleton } from "@/components/si/si-states";
import { SiMarkdown } from "@/components/si/si-markdown";
import { useInvestigationIds } from "@/components/si/investigation-ids";
import type { SiErrorBody } from "@/lib/ai/errors";
import {
  ASK_LIMITS,
  CABIN_STARTER_QUESTIONS,
  CACHED_HEADER,
  cabinContextLine,
  cabinQuestion,
  SOURCES_HEADER,
  STREAM_ERROR_MARKER,
} from "@/lib/ask";
import type { HabitatInputs } from "@/lib/habitat";

type Answer = {
  question: string;
  content: string;
  status: "streaming" | "done" | "error";
  error?: string;
  sources: string[];
  cached: boolean;
};

/** One-question-at-a-time Q&A about the current cabin, grounded in retrieved records. */
export function CabinAsk({ inputs }: { inputs: HabitatInputs }) {
  const { acronym } = useInvestigationIds();
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [input, setInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const busy = answer?.status === "streaming";

  async function ask(question: string) {
    const q = question.trim().slice(0, ASK_LIMITS.questionChars);
    if (!q || busy) return;
    setInput("");
    setAnswer({ question: q, content: "", status: "streaming", sources: [], cached: false });
    const patch = (u: Partial<Answer>) => setAnswer((prev) => (prev ? { ...prev, ...u } : prev));
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: cabinQuestion(inputs, q) }] }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        let message = "The SI could not answer right now. Please retry.";
        try {
          message = ((await res.json()) as SiErrorBody).error.message;
        } catch {
          // Keep the generic message.
        }
        patch({ status: "error", error: message });
        return;
      }
      patch({
        sources: (res.headers.get(SOURCES_HEADER) ?? "").split(",").filter(Boolean),
        cached: res.headers.get(CACHED_HEADER) === "1",
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        const [content = "", error] = text.split(STREAM_ERROR_MARKER);
        patch(error !== undefined ? { content, status: "error", error } : { content });
      }
      setAnswer((prev) => (prev && prev.status !== "error" ? { ...prev, status: "done" } : prev));
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setAnswer((prev) => (prev ? { ...prev, status: "done", content: prev.content ? `${prev.content}\n\n_(stopped)_` : "_(stopped)_" } : prev));
      } else {
        patch({ status: "error", error: "Could not reach the server. Check your connection and retry." });
      }
    } finally {
      abortRef.current = null;
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void ask(input);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Questions are sent with this cabin: <span className="text-foreground/80">{cabinContextLine(inputs)}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {CABIN_STARTER_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={busy}
            onClick={() => void ask(q)}
            className="rounded-full border border-border bg-background/40 px-3 py-1.5 text-left text-xs text-foreground/90 transition-colors hover:border-primary/50 hover:bg-primary/10 disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex items-center gap-2 rounded-xl border border-border bg-background/40 p-1.5 pl-3">
        <label htmlFor="cabin-ask" className="sr-only">
          Ask a question about this cabin
        </label>
        <input
          id="cabin-ask"
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, ASK_LIMITS.questionChars))}
          placeholder="Ask about this cabin…"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        {answer && !busy && (
          <Button type="button" variant="ghost" size="icon" onClick={() => setAnswer(null)} aria-label="Clear answer">
            <Eraser />
          </Button>
        )}
        {busy ? (
          <Button type="button" variant="secondary" size="icon" onClick={() => abortRef.current?.abort()} aria-label="Stop generating">
            <Square />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send question">
            <ArrowUp />
          </Button>
        )}
      </form>

      {answer && (
        <div className="space-y-2 rounded-xl border border-border bg-card/80 px-4 py-3" aria-live="polite">
          <p className="text-xs font-medium text-muted-foreground">{answer.question}</p>
          {answer.content ? <SiMarkdown text={answer.content} /> : answer.status === "streaming" ? <SiSkeleton lines={3} /> : null}
          {answer.status === "error" && answer.error && <SiError message={answer.error} />}
          {answer.sources.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>Records retrieved:</span>
              {answer.sources.map((id) => (
                <Link key={id} href={`/explore?id=${id}`} className="rounded-sm border border-border px-1.5 py-0.5 hover:border-link hover:text-link">
                  {acronym(id)}
                </Link>
              ))}
            </div>
          )}
          {answer.status === "done" && (
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              {answer.cached ? <Database className="size-3" aria-hidden /> : <Sparkles className="size-3" aria-hidden />}
              {answer.cached ? "Cached answer" : "Streamed answer"} · grounded in the PSI records and real runs only
            </p>
          )}
        </div>
      )}
    </div>
  );
}
