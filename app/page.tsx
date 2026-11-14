import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS } from "@/lib/nav";
import { NavIcon } from "@/components/shell/nav-icon";

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[#121b2e] via-[#0b1220] to-[#1d1209] px-6 py-10 sm:px-10">
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-orange-500/15 blur-3xl" />
        <div className="relative max-w-2xl space-y-4">
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
            <Flame className="size-3.5" aria-hidden /> NASA Space Apps 2026 ·
            Flame in Freefall
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            What real NASA fire tests cover, and what they miss, for crewed habitats.
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            FireSight reads the combustion data NASA has archived in Physical
            Science Informatics. Set a cabin atmosphere and see which real tests
            are near it, what was never tested, and where the next experiment
            should go. Every number links back to its NASA file or paper.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild size="lg">
              <Link href="/habitat">
                Open Habitat Flammability Explorer <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/explore">Browse investigations</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-card/80">
              <CardHeader>
                <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
                  <NavIcon name={item.icon} className="size-4.5" />
                </div>
                <CardTitle>{item.label}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
