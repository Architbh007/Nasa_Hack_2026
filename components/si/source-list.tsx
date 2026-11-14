import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { sourcesForInvestigation } from "@/lib/sources";
import type { Investigation } from "@/lib/schema";

/**
 * Investigations behind a claim, each with its original NASA pages. The
 * acronym opens the record in the Explorer; the links leave the app.
 */
export function SourceList({ investigations, note }: { investigations: readonly Investigation[]; note?: string }) {
  if (investigations.length === 0) return null;
  return (
    <div className="space-y-2">
      <ul className="space-y-2.5">
        {investigations.map((inv) => (
          <li key={inv.id} className="grid gap-1 sm:grid-cols-[6.5rem_1fr] sm:gap-3">
            <Link
              href={`/explore?id=${inv.id}`}
              className="h-fit w-fit rounded bg-link/10 px-1.5 py-0.5 text-sm font-medium text-link hover:bg-link/20"
            >
              {inv.acronym}
            </Link>
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs text-foreground/90">{inv.name}</p>
              <ul className="space-y-0.5">
                {sourcesForInvestigation(inv.id).map((s) => (
                  <li key={s.url}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-start gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-link hover:underline"
                    >
                      {s.label}
                      <ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
      {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
    </div>
  );
}
