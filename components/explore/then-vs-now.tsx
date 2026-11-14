"use client";

import { ExternalLink, History, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiError, SiMeta, SiSkeleton } from "@/components/si/si-states";
import { SiMarkdown } from "@/components/si/si-markdown";
import type { Lesson } from "@/lib/ai/schemas";
import { FIRE_EVENTS, type FireHistoryEvent } from "@/lib/fire-history";
import type { Investigation } from "@/lib/schema";
import { useSiMutation } from "@/lib/si-client";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<FireHistoryEvent["kind"], string> = {
  incident: "Fire incident",
  experiment: "Experiment",
  standard: "Design today",
};

const KIND_STYLE: Record<FireHistoryEvent["kind"], string> = {
  incident: "bg-destructive/15 text-destructive",
  experiment: "bg-link/10 text-link",
  standard: "bg-primary/15 text-primary",
};

function Lessons({ eventId }: { eventId: string }) {
  const { state, run } = useSiMutation<Lesson>("/api/fire-lesson");
  const go = () => void run({ eventId });
  return (
    <div className="space-y-2">
      {state.status === "idle" && (
        <Button size="sm" variant="outline" onClick={go}>
          <Sparkles /> SI: what&apos;s the lesson?
        </Button>
      )}
      {state.status === "loading" && <SiSkeleton lines={3} />}
      {state.status === "error" && <SiError message={state.message} onRetry={go} compact />}
      {state.status === "success" && (
        <div className="space-y-1 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="text-[0.8125rem] font-medium text-primary">SI lesson</p>
          <SiMarkdown text={state.data.lesson} />
          <SiMeta cached={state.cached} model={state.model} />
        </div>
      )}
    </div>
  );
}

function EventCard({ event, byId, onOpen }: { event: FireHistoryEvent; byId: ReadonlyMap<string, Investigation>; onOpen: (id: string) => void }) {
  const related = event.relatedInvestigationIds.map((id) => byId.get(id)).filter((i): i is Investigation => Boolean(i));
  return (
    <li className="relative pl-8">
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1.5 flex size-5 items-center justify-center rounded-full border-2 border-background",
          event.kind === "incident" ? "bg-destructive" : event.kind === "experiment" ? "bg-link" : "bg-primary"
        )}
      />
      <article className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
        <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="tabular text-lg font-semibold text-foreground">{event.year}</span>
          <h3 className="text-base font-semibold">{event.title}</h3>
          <span className={cn("rounded-sm px-1.5 py-0.5 text-[11px] font-medium", KIND_STYLE[event.kind])}>{KIND_LABEL[event.kind]}</span>
          <span className="text-xs text-muted-foreground">{event.dateLabel}</span>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="space-y-2">
            <h4 className="text-[0.8125rem] font-medium text-muted-foreground">Then</h4>
            <p className="text-sm leading-relaxed">{event.then}</p>
            {event.atmosphere && (
              <p className="rounded-md bg-secondary px-2.5 py-1.5 text-xs">
                <span className="text-muted-foreground">Atmosphere: </span>
                {event.atmosphere}
              </p>
            )}
            {event.whatWentWrong && (
              <p className="text-sm leading-relaxed">
                <span className="font-medium text-destructive">What went wrong: </span>
                {event.whatWentWrong}
              </p>
            )}
          </section>
          <section className="space-y-2 md:border-l md:border-border md:pl-4">
            <h4 className="text-[0.8125rem] font-medium text-muted-foreground">Now</h4>
            <p className="text-sm leading-relaxed">{event.now}</p>
            {related.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs text-muted-foreground">Related investigations:</span>
                {related.map((inv) => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => onOpen(inv.id)}
                    className="rounded-sm bg-link/10 px-1.5 py-0.5 text-xs font-medium text-link hover:bg-link/20"
                    title={inv.name}
                  >
                    {inv.acronym}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-3 lg:flex-row lg:items-start lg:justify-between">
          <ul className="space-y-1">
            {event.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 text-xs text-muted-foreground hover:text-link hover:underline">
                  {s.label}
                  <ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
          <div className="lg:w-[26rem]">
            <Lessons eventId={event.id} />
          </div>
        </div>
      </article>
    </li>
  );
}

export function ThenVsNow({ investigations, onOpen }: { investigations: readonly Investigation[]; onOpen: (id: string) => void }) {
  const byId = new Map(investigations.map((i) => [i.id, i] as const));
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card/60 p-4">
        <History className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="space-y-1 text-sm">
          <p className="font-medium">From Apollo 1 to the Moon: why spacecraft fire research exists</p>
          <p className="text-muted-foreground">
            The events and facts on this tab are documented history, written from the linked NASA pages. The investigation records they link to
            hold the real PSI run data used everywhere else in the app.
          </p>
        </div>
      </div>
      <ol className="relative space-y-5 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-0.5 before:bg-border">
        {FIRE_EVENTS.map((e) => (
          <EventCard key={e.id} event={e} byId={byId} onOpen={onOpen} />
        ))}
      </ol>
    </div>
  );
}
