"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { NavIcon } from "@/components/shell/nav-icon";
import { cn } from "@/lib/utils";

/** An orbit around a small flame: fire safety, seen from space. The satellite circles slowly. */
function OrbitMark() {
  return (
    <svg viewBox="0 0 32 32" className="size-9 shrink-0" aria-hidden>
      <circle cx="16" cy="16" r="15" fill="#0b1220" stroke="rgb(108 201 255 / 0.4)" />
      <g transform="rotate(-24 16 16)">
        <ellipse cx="16" cy="16" rx="11.5" ry="5" fill="none" stroke="rgb(200 220 255 / 0.55)" strokeWidth="0.8" />
        <g transform="translate(16 16) scale(1 0.435) translate(-16 -16)">
          <g className="fs-spin" style={{ "--fs-dur": "9s" } as React.CSSProperties}>
            <circle cx="27.5" cy="16" r="1.5" fill="#ffffff" transform="scale(1 2.3)" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
          </g>
        </g>
      </g>
      <path d="M16 9.5c2.6 2.4 3.9 4.6 3.9 6.7a3.9 3.9 0 1 1-7.8 0c0-1.3.6-2.6 1.6-3.7.2 1.1.8 1.8 1.6 2.1-.4-1.7-.1-3.4.7-5.1Z" fill="#ff7a3d" />
    </svg>
  );
}

/** Console header: brand on the left, the displays beside it, the current one marked in flame orange. */
export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-[30px] z-30 border-b border-border bg-[#070b14]/80 backdrop-blur-xl">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
        <div className="fs-scan h-px w-64 bg-gradient-to-r from-transparent via-[#6cc9ff] to-transparent opacity-70" />
      </div>
      <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center gap-x-8 gap-y-1 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 rounded-sm py-3 outline-offset-4">
          <OrbitMark />
          <span className="flex flex-col leading-none">
            <span className="text-[1.05rem] font-bold uppercase tracking-[0.22em]">
              Fire<span className="text-primary">Sight</span>
            </span>
            <span className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Flame in Freefall</span>
          </span>
        </Link>
        <nav aria-label="Main" className="-mx-1 flex min-w-0 flex-1 items-stretch gap-0.5 self-stretch overflow-x-auto xl:justify-end">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.description}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-2 whitespace-nowrap px-3 py-3 text-[0.8125rem] font-semibold tracking-wide transition-colors duration-200",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <NavIcon
                  name={item.icon}
                  className={cn("size-3.5 shrink-0 transition-colors duration-200", active ? "text-primary" : "text-muted-foreground/70 group-hover:text-link")}
                />
                {item.label}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-3 bottom-0 h-0.5 origin-left transition-transform duration-300",
                    active
                      ? "scale-x-100 bg-primary shadow-[0_0_12px_rgb(255_122_61/0.9)]"
                      : "scale-x-0 bg-link group-hover:scale-x-100"
                  )}
                />
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
