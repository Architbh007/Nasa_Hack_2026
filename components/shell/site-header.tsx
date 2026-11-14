"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** Brand mark: a small flame, drawn round the way it burns without gravity. */
function FlameMark() {
  return (
    <svg viewBox="0 0 20 20" className="size-5 shrink-0" aria-hidden>
      <circle cx="10" cy="10" r="8.5" fill="#5eb1ff" fillOpacity="0.16" />
      <circle cx="10" cy="10" r="5.5" fill="#5eb1ff" fillOpacity="0.38" />
      <circle cx="10" cy="10" r="2.6" fill="#ff7a3d" />
    </svg>
  );
}

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** Slim navigation bar: translucent over the page, links in plain text, a full-screen menu on small screens. */
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-black/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-12 w-full max-w-[1280px] items-center gap-8 px-5 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-2 text-[0.9375rem] font-semibold tracking-[-0.01em]" onClick={() => setOpen(false)}>
          <FlameMark />
          FireSight
        </Link>

        <nav aria-label="Main" className="ml-auto hidden items-center gap-7 lg:flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.description}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-[0.8125rem] transition-colors duration-200",
                  active ? "text-foreground" : "text-foreground/65 hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="-mr-2 ml-auto grid size-10 place-items-center rounded-full text-foreground/80 hover:text-foreground lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <svg viewBox="0 0 18 18" className="size-[18px]" aria-hidden>
            <path
              d={open ? "M4 4l10 10M14 4L4 14" : "M2 6h14M2 12h14"}
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </button>
      </div>

      {open && (
        <nav
          id="mobile-menu"
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 top-12 z-40 overflow-y-auto bg-black px-8 pb-12 pt-6 lg:hidden"
        >
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn("block py-2.5 text-[1.75rem] font-semibold tracking-[-0.02em]", active ? "text-foreground" : "text-foreground/70")}
                  >
                    {item.label}
                  </Link>
                  <p className="pb-2 text-sm text-muted-foreground">{item.description}</p>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
