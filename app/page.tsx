import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDataset } from "@/lib/data";

/** The demo path, in the order a judge should see it. */
const FLIGHT_PLAN = [
  {
    href: "/explore?tab=history",
    title: "Why it matters",
    body: "Apollo 1, Mir, Saffire: real spacecraft fires and what each one taught NASA.",
    where: "Explorer · Then vs Now",
  },
  {
    href: "/habitat?preset=lunar-base",
    title: "Is this air dangerous?",
    body: "Pick a cabin's oxygen and pressure. The grid shows the fire risk and where nobody has tested.",
    where: "Habitat · Flammability grid",
  },
  {
    href: "/habitat?preset=lunar-base#fire-twin",
    title: "Watch the fire",
    body: "Light an item in a cabin module and follow ignition, smoke, alarm and crew response.",
    where: "Habitat · Fire Twin",
  },
  {
    href: "/earth",
    title: "Back on Earth",
    body: "The same research shapes smoke detectors, suppression systems and firefighter gear.",
    where: "Earth applications",
  },
] as const;

/** Tiny static preview of the flammability grid (blue to red as oxygen rises, stripes = untested). */
function GridGlyph() {
  const cols = 8;
  const rows = 5;
  const color = (c: number, r: number) => {
    const risk = c / (cols - 1) + (r / (rows - 1)) * 0.35;
    return risk < 0.4 ? "#3987e5" : risk < 0.7 ? "#c98500" : "#d95926";
  };
  return (
    <svg viewBox={`0 0 ${cols * 10} ${rows * 10}`} className="h-auto w-36" aria-hidden>
      <defs>
        <pattern id="home-stripe" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="1.6" height="4" fill="#9a9fa9" fillOpacity="0.6" />
        </pattern>
      </defs>
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const untested = c >= 4 && c <= 5 && r <= 2;
          return (
            <g key={`${r}-${c}`}>
              <rect x={c * 10 + 0.6} y={(rows - 1 - r) * 10 + 0.6} width="8.8" height="8.8" rx="1.6" fill={color(c, r)} fillOpacity={untested ? 0.3 : 0.9} />
              {untested && <rect x={c * 10 + 0.6} y={(rows - 1 - r) * 10 + 0.6} width="8.8" height="8.8" rx="1.6" fill="url(#home-stripe)" />}
            </g>
          );
        })
      )}
    </svg>
  );
}

export default function Home() {
  const { investigations, tests } = getDataset();
  return (
    <div className="space-y-12 pb-8">
      <section className="relative isolate overflow-hidden rounded-2xl border border-border bg-[oklch(0.17_0.004_264/0.7)] px-6 py-12 sm:px-10 sm:py-16">
        {/* Planet limb seen from orbit: a lit horizon arc low on the right. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-[62%] -right-[18%] -z-10 aspect-square w-[85%] rounded-full sm:-bottom-[95%] sm:w-[70%]"
          style={{
            background: "radial-gradient(circle at 50% 50%, oklch(0.2 0.006 264) 64%, oklch(0.32 0.02 240) 69%, transparent 70.5%)",
            boxShadow: "0 0 80px 10px oklch(0.6 0.06 235 / 0.18), inset 0 2px 0 oklch(0.85 0.04 230 / 0.5)",
          }}
        />
        <div aria-hidden className="pointer-events-none absolute -left-24 top-1/2 -z-10 size-72 -translate-y-1/2 rounded-full bg-[#ff7a3d]/10 blur-3xl" />

        <div className="relative max-w-2xl space-y-5">
          <p className="text-sm text-muted-foreground">NASA Space Apps 2026 · Flame in Freefall</p>
          <h1 className="text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[2.75rem]">
            Fire behaves differently in space. Moon and Mars cabins need to know how.
          </h1>
          <p className="max-w-[60ch] text-base leading-relaxed text-foreground/80 text-pretty">
            FireSight turns {investigations.length} NASA microgravity combustion investigations and {tests.length} test runs into a fire-risk
            map for crewed habitats, a fire you can watch play out, and plain-language answers that link back to the original NASA sources.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="lg">
              <Link href="/habitat">
                Open the habitat explorer <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-background/40">
              <Link href="/explore">Browse investigations</Link>
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby="flight-plan" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 id="flight-plan" className="text-lg font-semibold">
              Flight plan
            </h2>
            <p className="text-sm text-muted-foreground">The three-minute tour, in order.</p>
          </div>
          <GridGlyph />
        </div>

        <ol className="relative grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-4">
          {FLIGHT_PLAN.map((step, i) => (
            <li key={step.href} className="bg-[oklch(0.19_0.004_264/0.92)]">
              <Link
                href={step.href}
                className="group flex h-full flex-col gap-3 p-5 transition-colors duration-200 hover:bg-[oklch(0.23_0.005_264)] focus-visible:bg-[oklch(0.23_0.005_264)]"
              >
                <span className="flex items-center gap-3">
                  <span className="flex size-7 items-center justify-center rounded-full border border-primary/50 font-mono text-xs text-primary tabular">
                    {i + 1}
                  </span>
                  <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
                </span>
                <span className="text-base font-medium">{step.title}</span>
                <span className="text-sm leading-relaxed text-muted-foreground">{step.body}</span>
                <span className="mt-auto flex items-center gap-1 pt-2 text-xs text-foreground/70 group-hover:text-primary">
                  {step.where} <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
