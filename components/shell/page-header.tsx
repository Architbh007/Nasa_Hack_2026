import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Short display code shown above the title, for example "Display 01 · Habitat". */
  eyebrow?: string;
}) {
  return (
    <header className="relative mb-8 flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-3">
        <p className="eyebrow flex items-center gap-2.5">
          <span aria-hidden className="h-px w-8 bg-primary shadow-[0_0_10px_rgb(255_122_61/0.8)]" />
          <span className="text-link">{eyebrow ?? "FireSight display"}</span>
        </p>
        <h1 className="text-[2rem] leading-[1.1] tracking-tight sm:text-[2.375rem]">{title}</h1>
        {description && <p className="max-w-[70ch] text-[0.9375rem] leading-relaxed text-muted-foreground text-pretty">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-primary/70 via-border to-transparent" />
    </header>
  );
}
