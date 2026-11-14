import Link from "next/link";
import { MissionClock } from "@/components/shell/mission-clock";

function Readout({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <span className={className}>
      <span className="text-muted-foreground">{label}</span> <span className="tabular text-foreground">{value}</span>
    </span>
  );
}

/** Persistent telemetry strip: where the numbers come from, how many records are loaded, and the time in GMT. */
export function DataBanner({ status }: { status: { investigations: number; runs: number } }) {
  return (
    <div
      role="note"
      aria-label="Data source"
      className="sticky top-0 z-40 flex h-[30px] items-center gap-5 border-b border-border bg-[#04060b]/90 px-4 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground backdrop-blur sm:px-6 lg:px-8"
    >
      <span className="flex items-center gap-2 whitespace-nowrap text-foreground">
        <span aria-hidden className="fs-live-dot size-1.5 rounded-full" />
        Real NASA PSI data
      </span>
      <span className="hidden whitespace-nowrap xl:inline">plus published Saffire IV–VI results · missing values shown as missing</span>
      <span className="ml-auto flex items-center gap-5">
        <Readout label="Investigations" value={String(status.investigations)} className="hidden whitespace-nowrap sm:inline" />
        <Readout label="Runs" value={String(status.runs)} className="hidden whitespace-nowrap sm:inline" />
        <Link href="/about#data-policy" className="hidden whitespace-nowrap text-link hover:underline md:inline">
          Sources
        </Link>
        <span aria-hidden className="hidden h-3 w-px bg-border md:inline-block" />
        <MissionClock />
      </span>
    </div>
  );
}
