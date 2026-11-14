import Link from "next/link";
import { FlaskConical } from "lucide-react";

/**
 * Persistent data-policy banner. Every page renders under it, so no screen
 * can be mistaken for real NASA PSI results.
 */
export function SyntheticBanner() {
  return (
    <div
      role="note"
      aria-label="Synthetic demo data"
      className="sticky top-0 z-40 flex items-center justify-center gap-2 border-b border-warning/25 bg-[oklch(0.19_0.02_80/0.92)] px-4 py-1.5 text-xs text-foreground/85 backdrop-blur"
    >
      <FlaskConical className="size-3.5 shrink-0 text-warning" aria-hidden />
      <span className="font-semibold text-warning">Synthetic demo data</span>
      <span className="hidden sm:inline">
        Real PSI investigation names, hardware and source links; generated measurements. Not NASA results.
      </span>
      <Link href="/about#data-policy" className="underline decoration-foreground/30 underline-offset-2 hover:text-foreground">
        Data policy
      </Link>
    </div>
  );
}
