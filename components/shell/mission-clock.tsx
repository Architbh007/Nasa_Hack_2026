"use client";

import { useEffect, useState } from "react";

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** GMT day-of-year and time, the timestamp format used in the BASS as-run notes ("GMT 181:11:12"). */
export function formatGmt(d: Date): string {
  const startOfYear = Date.UTC(d.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((d.getTime() - startOfYear) / 86_400_000);
  return `${pad(dayOfYear, 3)}/${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** Live GMT clock for the status bar. Renders a placeholder on the server so hydration matches. */
export function MissionClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <time
      className="tabular whitespace-nowrap font-mono text-foreground/90"
      dateTime={now?.toISOString()}
      title="Greenwich Mean Time: day of year / hours:minutes:seconds"
      suppressHydrationWarning
    >
      GMT {now ? formatGmt(now) : "---/--:--:--"}
    </time>
  );
}
