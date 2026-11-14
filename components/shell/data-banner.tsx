import Link from "next/link";
import { Database } from "lucide-react";

/** Persistent data-source banner: every page says where its numbers come from. */
export function DataBanner() {
  return (
    <div
      role="note"
      aria-label="Data source"
      className="sticky top-0 z-40 flex items-center justify-center gap-2 border-b border-primary/25 bg-[#0b1a2e]/95 px-4 py-1.5 text-xs text-sky-100 backdrop-blur"
    >
      <Database className="size-3.5 shrink-0 text-primary" aria-hidden />
      <span className="font-semibold tracking-wide text-primary">Real NASA PSI data</span>
      <span className="hidden text-sky-100/80 sm:inline">plus published Saffire IV–VI results. Missing values are shown as missing.</span>
      <Link href="/about#data-policy" className="underline decoration-sky-100/40 underline-offset-2 hover:text-white">
        Sources on the About page
      </Link>
    </div>
  );
}
