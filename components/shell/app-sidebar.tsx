"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";
import { NavIcon } from "@/components/shell/nav-icon";

export type SystemStatus = { investigations: number; runs: number };

/** An orbit around a small flame: fire safety, seen from space. */
function OrbitMark() {
  return (
    <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
      <circle cx="16" cy="16" r="15" fill="oklch(0.24 0.005 264)" stroke="oklch(1 0 0 / 0.1)" />
      <ellipse cx="16" cy="16" rx="11.5" ry="5" fill="none" stroke="oklch(0.78 0.01 264 / 0.55)" strokeWidth="1" transform="rotate(-24 16 16)" />
      <path d="M16 9.5c2.6 2.4 3.9 4.6 3.9 6.7a3.9 3.9 0 1 1-7.8 0c0-1.3.6-2.6 1.6-3.7.2 1.1.8 1.8 1.6 2.1-.4-1.7-.1-3.4.7-5.1Z" fill="#ff7a3d" />
      <circle cx="26.2" cy="11.6" r="1.6" fill="oklch(0.93 0.003 264)" />
    </svg>
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md px-1 outline-offset-4">
      <OrbitMark />
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">FireSight</span>
          <span className="text-[11px] text-muted-foreground">Flame in Freefall</span>
        </span>
      )}
    </Link>
  );
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors duration-200",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            )}
          >
            <NavIcon
              name={item.icon}
              className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}
            />
            <span className="truncate">{item.label}</span>
            {active && <span aria-hidden className="absolute inset-y-1 left-0 w-0.5 bg-primary" />}
          </Link>
        );
      })}
    </nav>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono tabular text-sidebar-foreground">{value}</dd>
    </div>
  );
}

export function AppSidebar({ status }: { status: SystemStatus }) {
  return (
    <aside className="sticky top-[30px] hidden h-[calc(100svh-30px)] w-60 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar px-3 py-4 backdrop-blur-md md:flex">
      <BrandMark />
      <div className="space-y-2">
        <p className="eyebrow px-2.5">Displays</p>
        <NavLinks />
      </div>
      <div className="mt-auto space-y-3">
        <p className="eyebrow px-1">Dataset</p>
        <dl className="space-y-1.5 rounded-lg border border-sidebar-border bg-background/40 p-3 text-[11px]">
          <StatusLine label="Data" value="NASA PSI + papers" />
          <StatusLine label="Investigations" value={String(status.investigations)} />
          <StatusLine label="Real test runs" value={String(status.runs)} />
        </dl>
        <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
          Built by team MicroVibe for NASA Space Apps 2026. Supports engineering judgment; does not replace NASA-STD-6001.
        </p>
      </div>
    </aside>
  );
}
