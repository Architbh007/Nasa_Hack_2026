"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";
import { NavIcon } from "@/components/shell/nav-icon";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-1">
      <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 text-[#160803] shadow-[0_0_24px_rgb(255_122_61/0.35)]">
        <Flame className="size-4.5" aria-hidden />
      </span>
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-wide">FireSight</span>
          <span className="text-[11px] text-muted-foreground">
            Flame in Freefall
          </span>
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
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            )}
          >
            <NavIcon
              name={item.icon}
              className={cn(
                "size-4 shrink-0",
                active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar/90 px-3 py-4 backdrop-blur md:flex">
      <BrandMark />
      <NavLinks />
      <div className="mt-auto rounded-lg border border-sidebar-border bg-card/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
        NASA Space Apps 2026 prototype. Supports engineering judgment; does
        not replace NASA flammability standards (NASA-STD-6001).
      </div>
    </aside>
  );
}
