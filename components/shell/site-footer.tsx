import Link from "next/link";
import { NAV_ITEMS } from "@/lib/nav";

/** Footer: what the data is, where to go, and who made it, in small print on a quiet surface. */
export function SiteFooter({ status }: { status: { investigations: number; runs: number } }) {
  return (
    <footer className="bg-[#0b0b0d] text-[0.8125rem] leading-relaxed text-muted-foreground">
      <div className="mx-auto w-full max-w-[1280px] px-5 py-12 sm:px-8 lg:px-10">
        <p className="max-w-[90ch] border-b border-white/[0.08] pb-6">
          FireSight shows only real NASA data: {status.investigations} investigations from NASA Physical Science Informatics plus
          published Saffire IV–VI results, {status.runs} test runs in all. Missing values are shown as missing and nothing is
          predicted. It supports engineering judgment and does not replace NASA-STD-6001.
        </p>

        <div className="grid gap-8 py-8 sm:grid-cols-[1fr_1fr_2fr]">
          <div>
            <h2 className="mb-3 text-[0.8125rem] font-semibold text-foreground">Explore</h2>
            <ul className="space-y-2">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-foreground hover:underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-[0.8125rem] font-semibold text-foreground">Data</h2>
            <ul className="space-y-2">
              <li>
                <a href="https://psi.nasa.gov" target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
                  NASA Physical Science Informatics
                </a>
              </li>
              <li>
                <a href="https://ntrs.nasa.gov" target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
                  NASA Technical Reports Server
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-[0.8125rem] font-semibold text-foreground">Images</h2>
            <p className="max-w-[60ch]">
              Photographs courtesy of NASA (images.nasa.gov): orbital sunrise from the ISS (iss071e439624), a candle flame in
              microgravity (9902615), an ISS module at night (iss042e021318), the Combustion Integrated Rack
              (iss032e014574), flame spreading over a solid fuel (9902618), Earth at night with an aurora (iss058e005282) and Earth setting over the
              Moon from Orion on Artemis II (art002e021278).
            </p>
          </div>
        </div>

        <p className="border-t border-white/[0.08] pt-6">
          Built by team MicroVibe for NASA Space Apps 2026 · Flame in Freefall. Not an official NASA website.
        </p>
      </div>
    </footer>
  );
}
