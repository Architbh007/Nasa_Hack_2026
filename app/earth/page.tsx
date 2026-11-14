import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, ExternalLink, Factory, Flame, Sparkles, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDataset } from "@/lib/data";
import { groupEarthBenefits, type EarthGroupKey } from "@/lib/earth";

export const metadata: Metadata = { title: "Spinoffs and Earth Applications" };

const ICON: Record<EarthGroupKey, LucideIcon> = {
  detection: BellRing,
  "fire-safety": Flame,
  combustion: Factory,
  other: Sparkles,
};

export default function EarthPage() {
  const { investigations } = getDataset();
  const groups = groupEarthBenefits(investigations);
  const total = groups.reduce((s, g) => s + g.items.length, 0);
  return (
    <>
      <PageHeader
        title="Spinoffs and Earth Applications"
        description={`What each investigation's PSI record says it means on Earth, quoted from the "Research Impacts/Earth Benefits" field of ${total} records. We grouped them by keyword; the words are NASA's.`}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {groups.map((g) => {
          const Icon = ICON[g.key];
          return (
            <a key={g.key} href={`#${g.key}`} className="rounded-xl border border-border bg-card/70 p-4 transition-colors hover:border-primary/40">
              <Icon className="mb-2 size-5 text-primary" aria-hidden />
              <p className="text-sm font-medium leading-snug">{g.title}</p>
              <p className="tabular mt-1 text-xs text-muted-foreground">
                {g.items.length} investigation{g.items.length === 1 ? "" : "s"}
              </p>
            </a>
          );
        })}
      </div>
      <div className="space-y-6">
        {groups.map((g) => {
          const Icon = ICON[g.key];
          return (
            <Card key={g.key} id={g.key} className="scroll-mt-16">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="size-4 text-primary" aria-hidden /> {g.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {g.items.map((item) => (
                    <li key={item.investigationId} className="space-y-1.5 py-3">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        <Link href={`/explore?id=${item.investigationId}`} className="text-link hover:underline">
                          {item.acronym}
                        </Link>
                        {item.accession && <span className="text-xs font-normal text-muted-foreground">{item.accession}</span>}
                        {item.pageUrl && (
                          <a href={item.pageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground hover:text-link">
                            PSI record <ExternalLink className="size-3" aria-hidden />
                          </a>
                        )}
                      </p>
                      <blockquote className="border-l-2 border-border pl-3 text-sm leading-relaxed text-foreground/90">{item.text}</blockquote>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Text retrieved from NASA PSI investigation records (psi.nasa.gov). Statements are the investigators&apos; own descriptions of expected
        benefits, not claims about specific NASA spinoff programs.
      </p>
    </>
  );
}
