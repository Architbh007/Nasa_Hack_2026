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
      className="sticky top-0 z-40 flex items-center justify-center gap-2 border-b border-warning/30 bg-[#2a1f05]/95 px-4 py-1.5 text-xs text-amber-100 backdrop-blur"
    >
      <FlaskConical className="size-3.5 shrink-0 text-warning" aria-hidden />
      <span className="font-semibold tracking-wide text-warning">
        Synthetic demo data
      </span>
      <span className="hidden text-amber-100/80 sm:inline">
        Real PSI investigation names and hardware, generated measurements. Not
        NASA results.
      </span>
      <Link
        href="/about#data-policy"
        className="underline decoration-amber-100/40 underline-offset-2 hover:text-white"
      >
        Data policy
      </Link>
    </div>
  );
}
