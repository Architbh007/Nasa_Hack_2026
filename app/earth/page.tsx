import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import earthNight from "@/public/images/earth-night-aurora.jpg";
import { PageHeader } from "@/components/shell/page-header";
import { getDataset } from "@/lib/data";
import { groupEarthBenefits } from "@/lib/earth";

export const metadata: Metadata = { title: "Spinoffs and Earth Applications" };

export default function EarthPage() {
  const { investigations } = getDataset();
  const groups = groupEarthBenefits(investigations);
  const total = groups.reduce((s, g) => s + g.items.length, 0);
  return (
    <>
      <PageHeader
        title="Back on Earth"
        description={`What each investigation's PSI record says it means on Earth, quoted from the "Research Impacts/Earth Benefits" field of ${total} records. We grouped them by keyword; the words are NASA's.`}
        image={{
          src: earthNight,
          alt: "Earth at night from the International Space Station, city lights below a green aurora along the horizon",
          credit: "NASA · iss058e005282",
          position: "center 70%",
        }}
      />

      <nav aria-label="Groups" className="mb-16 flex flex-wrap gap-x-8 gap-y-3 text-[0.9375rem]">
        {groups.map((g) => (
          <a key={g.key} href={`#${g.key}`} className="group text-foreground/80 hover:text-foreground">
            {g.title} <span className="tabular text-muted-foreground">{g.items.length}</span>
          </a>
        ))}
      </nav>

      <div className="space-y-24">
        {groups.map((g) => (
          <section key={g.key} id={g.key} aria-labelledby={`${g.key}-title`} className="scroll-mt-20">
            <h2 id={`${g.key}-title`} className="mb-10 text-[2rem] leading-tight sm:text-[2.5rem]">
              {g.title}
            </h2>
            <ul className="grid gap-x-16 gap-y-12 md:grid-cols-2">
              {g.items.map((item) => (
                <li key={item.investigationId} className="space-y-3">
                  <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <Link href={`/explore?id=${item.investigationId}`} className="text-[1.0625rem] font-semibold hover:text-link">
                      {item.acronym}
                    </Link>
                    {item.accession && <span className="text-sm text-muted-foreground">{item.accession}</span>}
                    {item.pageUrl && (
                      <a href={item.pageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-sm text-link hover:underline">
                        PSI record <ArrowUpRight className="size-3.5" aria-hidden />
                      </a>
                    )}
                  </p>
                  <blockquote className="max-w-[62ch] text-[1.0625rem] leading-relaxed text-foreground/80">{item.text}</blockquote>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-24 max-w-[80ch] text-sm text-muted-foreground">
        Text retrieved from NASA PSI investigation records (psi.nasa.gov). Statements are the investigators&apos; own descriptions of expected
        benefits, not claims about specific NASA spinoff programs.
      </p>
    </>
  );
}
