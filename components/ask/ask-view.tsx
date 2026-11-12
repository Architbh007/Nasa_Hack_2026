"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowUp, Database, Eraser, Sparkles, Square, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiError, SiSkeleton } from "@/components/si/si-states";
import { SiMarkdown } from "@/components/si/si-markdown";
import { useInvestigationIds } from "@/components/si/investigation-ids";
import type { SiErrorBody } from "@/lib/ai/errors";
import { ASK_LIMITS, CACHED_HEADER, SOURCES_HEADER, STARTER_QUESTIONS, STREAM_ERROR_MARKER } from "@/lib/ask";
import { cn } from "@/lib/utils";

type Message =
  | { id: number; role: "user"; content: string }
  | {
      id: number;
      role: "assistant";
      content: string;
      status: "streaming" | "done" | "error";
      error?: string;
      sources: string[];
      cached: boolean;
    };

let nextId = 1;

function Sources({ ids }: { ids: readonly string[] }) {
  const { acronym } = useInvestigationIds();
  if (ids.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
      <span>Records retrieved:</span>
      {ids.map((id) => (
        <Link key={id} href={`/explore?id=${id}`} className="rounded border border-border px-1.5 py-0.5 hover:border-link hover:text-link">
          {acronym(id)}
        </Link>
      ))}
    </div>
  );
}

export function AskView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = messages.some((m) => m.role === "assistant" && m.status === "streaming");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const patch = (id: number, update: (m: Extract<Message, { role: "assistant" }>) => Partial<Extract<Message, { role: "assistant" }>>) =>
    setMessages((prev) => prev.map((m) => (m.id === id && m.role === "assistant" ? { ...m, ...update(m) } : m)));

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const userMsg: Message = { id: nextId++, role: "user", content: q.slice(0, ASK_LIMITS.questionChars) };
    const asstId = nextId++;
    const history = [...messages, userMsg]
      .filter((m) => m.role === "user" || (m.status === "done" && m.content.trim()))
      .slice(-ASK_LIMITS.historyMessages)
      .map((m) => ({ role: m.role, content: m.content.slice(0, ASK_LIMITS.messageChars) }));
    // History must start with a user turn.
    while (history[0]?.role === "assistant") history.shift();

    setMessages((prev) => [...prev, userMsg, { id: asstId, role: "assistant", content: "", status: "streaming", sources: [], cached: false }]);
    setInput("");
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        let message = "The SI could not answer right now. Please retry.";
        try {
          message = ((await res.json()) as SiErrorBody).error.message;
        } catch {
          // Keep the generic message.
        }
        patch(asstId, () => ({ status: "error", error: message }));
        return;
      }
      const sources = (res.headers.get(SOURCES_HEADER) ?? "").split(",").filter(Boolean);
      patch(asstId, () => ({ sources, cached: res.headers.get(CACHED_HEADER) === "1" }));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        const [answer = "", error] = text.split(STREAM_ERROR_MARKER);
        patch(asstId, () => ({ content: answer, ...(error !== undefined ? { status: "error" as const, error } : {}) }));
      }
      patch(asstId, (m) => (m.status === "error" ? {} : { status: "done" }));
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        patch(asstId, (m) => ({ status: "done", content: m.content ? `${m.content}\n\n_(stopped)_` : "_(stopped)_" }));
      } else {
        patch(asstId, () => ({ status: "error", error: "Could not reach the server. Check your connection and retry." }));
      }
    } finally {
      abortRef.current = null;
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void ask(input);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void ask(input);
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      {messages.length === 0 && (
        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ask about fuels, conditions, instruments, suppression or habitat coverage. Answers cite investigation records in
              brackets and say plainly when the data does not cover a question. Try one of these:
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void ask(q)}
                  className="rounded-full border border-border bg-background/40 px-3 py-1.5 text-left text-xs text-foreground/90 transition-colors hover:border-primary/50 hover:bg-primary/10"
                >
                  {q}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ol className="space-y-4" aria-live="polite">
        {messages.map((m) =>
          m.role === "user" ? (
            <li key={m.id} className="flex justify-end gap-2">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-secondary px-4 py-2.5 text-sm">{m.content}</div>
              <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden>
                <User className="size-3.5" />
              </span>
            </li>
          ) : (
            <li key={m.id} className="flex gap-2">
              <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary" aria-hidden>
                <Sparkles className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1 space-y-2 rounded-2xl rounded-tl-sm border border-border bg-card/80 px-4 py-3">
                {m.content ? <SiMarkdown text={m.content} /> : m.status === "streaming" ? <SiSkeleton lines={3} /> : null}
                {m.status === "error" && m.error && <SiError message={m.error} />}
                <Sources ids={m.sources} />
                {m.status === "done" && (
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    {m.cached ? <Database className="size-3" aria-hidden /> : <Sparkles className="size-3" aria-hidden />}
                    {m.cached ? "Cached answer" : "Streamed answer"} · grounded in synthetic records only
                  </p>
                )}
              </div>
            </li>
          )
        )}
      </ol>
      <div ref={bottomRef} />

      <form onSubmit={onSubmit} className="sticky bottom-4 rounded-2xl border border-border bg-popover/95 p-2 shadow-xl backdrop-blur">
        <div className="flex items-end gap-2">
          <label htmlFor="ask-input" className="sr-only">Your question</label>
          <textarea
            id="ask-input"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, ASK_LIMITS.questionChars))}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="Ask about the investigations… (Enter to send, Shift+Enter for a new line)"
            className="min-h-12 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="flex shrink-0 items-center gap-1">
            {messages.length > 0 && !busy && (
              <Button type="button" variant="ghost" size="icon" onClick={() => setMessages([])} aria-label="Clear conversation">
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
          </div>
        </div>
        <p className={cn("px-2 pt-1 text-right text-[10px] text-muted-foreground", input.length > ASK_LIMITS.questionChars * 0.9 && "text-warning")}>
          {input.length}/{ASK_LIMITS.questionChars}
        </p>
      </form>
    </div>
  );
}
