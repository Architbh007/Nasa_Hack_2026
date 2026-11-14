import Link from "next/link";

/** Footer band: who built this, what it is for, and how much data is loaded. */
export function SiteFooter({ status }: { status: { investigations: number; runs: number } }) {
  return (
    <footer className="mt-12 border-t border-border bg-[#04060b]/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 py-6 text-sm text-muted-foreground sm:px-6 lg:px-8">
        <p className="max-w-[80ch]">
          <span className="font-bold uppercase tracking-[0.18em] text-foreground">
            Fire<span className="text-primary">Sight</span>
          </span>{" "}
          · Built by team MicroVibe for NASA Space Apps 2026. Supports engineering judgment; does not replace NASA-STD-6001.
        </p>
        <p className="tabular font-mono text-xs uppercase tracking-[0.1em]">
          {status.investigations} investigations · {status.runs} real test runs ·{" "}
          <Link href="/about#data-policy" className="text-link hover:underline">
            Sources and data policy
          </Link>
        </p>
      </div>
    </footer>
  );
}
