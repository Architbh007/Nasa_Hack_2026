import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, Factory, HardHat, ScrollText, Waves, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDataset } from "@/lib/data";
import { groupEarthApplications, type EarthGroupKey } from "@/lib/earth";

export const metadata: Metadata = { title: "Spinoffs and Earth Applications" };

const ICON: Record<EarthGroupKey, LucideIcon> = {
  suppression: Waves,
  detection: BellRing,
  gear: HardHat,
  standards: ScrollText,
  combustion: Factory,
};

export default function EarthPage() {
  const { investigations } = getDataset();
  const groups = groupEarthApplications(investigations).filter((g) => g.items.length > 0);
  const total = groups.reduce((s, g) => s + g.items.length, 0);
  return (
    <>
      <PageHeader
        eyebrow="Earth"
        title="Spinoffs and Earth Applications"
        description={`Microgravity removes buoyancy, so flames reveal the chemistry and transport that Earth-bound tests hide. ${total} application notes from the investigation records, grouped by where they help on Earth.`}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {groups.map((g) => {
          const Icon = ICON[g.key];
          return (
            <a key={g.key} href={`#${g.key}`} className="rounded-xl border border-border bg-card/70 p-4 transition-colors hover:border-primary/40">
              <Icon className="mb-2 size-5 text-primary" aria-hidden />
              <p className="text-sm font-medium leading-snug">{g.title}</p>
              <p className="tabular mt-1 text-xs text-muted-foreground">
                {g.items.length} application{g.items.length === 1 ? "" : "s"} ·{" "}
                {new Set(g.items.flatMap((i) => i.investigations.map((x) => x.id))).size} investigations
              </p>
            </a>
          );
        })}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {groups.map((g) => {
          const Icon = ICON[g.key];
          return (
            <Card key={g.key} id={g.key} className="scroll-mt-16">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="size-4 text-primary" aria-hidden /> {g.title}
                </CardTitle>
                <CardDescription>{g.blurb}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {g.items.map((item) => (
                    <li key={item.text} className="flex flex-col gap-1.5 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <span className="text-sm">{item.text}</span>
                      <span className="flex shrink-0 flex-wrap gap-1">
                        {item.investigations.map((inv) => (
                          <Link
                            key={inv.id}
                            href={`/explore?id=${inv.id}`}
                            className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:border-link hover:text-link"
                          >
                            {inv.acronym}
                          </Link>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Application notes are part of the synthetic demo records and illustrate the kinds of transfer PSI research supports; they are not
        claims about specific NASA spinoff programs.
      </p>
    </>
  );
}
