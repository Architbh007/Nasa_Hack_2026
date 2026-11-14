import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/home/count-up";
import { HeroOrbit } from "@/components/home/hero-orbit";
import { getResponseCoding, tallyResponses } from "@/lib/crew-response";
import { getDataset } from "@/lib/data";
import { num } from "@/lib/format";
import { categoryVerdict } from "@/lib/habitat";

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
    body: "Pick a cabin's oxygen and pressure. The grid shows what real tests found nearby and where nobody has tested.",
    where: "Habitat · Flammability grid",
  },
  {
    href: "/habitat?preset=lunar-base#fire-twin",
    title: "Watch the fire",
    body: "Light an item in a cabin module and follow ignition, smoke, alarm and crew response.",
    where: "Habitat · Fire Twin",
  },
  {
    href: "/response",
    title: "What puts it out?",
    body: "Every time a crew cut the airflow or used a nitrogen jet on a real flame in orbit, and what the test notes say happened.",
    where: "Crew Response",
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

/** The sentence in a run's note that contains `phrase`, or null when the note does not have it. */
function noteSentence(note: string | null, phrase: string): string | null {
  const hit = (note ?? "").split(/(?<=[.!?])\s+/).find((sentence) => sentence.includes(phrase));
  return hit?.trim() ?? null;
}

export default function Home() {
  const { investigations, runs, scenarios, runById } = getDataset();

  // Headline findings, each computed from the dataset when the page is built.
  const lunar = scenarios.find((s) => s.id === "lunar-base") ?? null;
  const lunarSolid = lunar ? categoryVerdict(lunar, runs, "solid") : null;
  const tally = tallyResponses(getResponseCoding().events);
  const stopped = tally.find((t) => t.action === "airflow-stopped");
  const nitrogen = tally.find((t) => t.action === "nitrogen");
  const gravityRun = runById.get("bass-asrun-45") ?? null;
  const gravityQuote = noteSentence(gravityRun?.outcomeText ?? null, "1g");

  const card = "hud-panel group flex flex-col gap-2.5 p-6";
  const cardLink = "mt-auto flex items-center gap-1 pt-3 text-sm font-semibold text-link";
  const arrow = "size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5";

  return (
    <div className="space-y-16 pb-8">
      <section className="relative isolate -mt-2 grid items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="fs-stagger relative space-y-6 py-6 lg:py-14">
          <p className="eyebrow flex items-center gap-2.5">
            <span aria-hidden className="h-px w-8 bg-primary shadow-[0_0_10px_rgb(255_122_61/0.8)]" />
            <span className="text-link">NASA Space Apps 2026 · Flame in Freefall</span>
          </p>
          <h1 className="text-4xl leading-[1.05] tracking-tight sm:text-5xl xl:text-[3.5rem]">
            Fire behaves differently in space.{" "}
            <span className="bg-gradient-to-r from-[#ffb057] via-primary to-[#ff5a3d] bg-clip-text text-transparent">
              Moon and Mars cabins need to know how.
            </span>
          </h1>
          <p className="max-w-[58ch] text-base leading-relaxed text-muted-foreground text-pretty sm:text-[1.0625rem]">
            FireSight reads {investigations.length} NASA microgravity combustion investigations and {runs.length} real test runs. Set a cabin
            atmosphere to see which real tests are near it and what was never tested, watch a fire play out, and follow every answer back to
            the original NASA source.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild size="lg" className="h-11 px-5 text-[0.9375rem] font-semibold shadow-[0_0_32px_-6px_rgb(255_122_61/0.75)] hover:bg-[#ff8f5a]">
              <Link href="/habitat">
                Open the habitat explorer <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 px-5 text-[0.9375rem]">
              <Link href="/response">See the crew response evidence</Link>
            </Button>
          </div>
          <dl className="grid max-w-xl grid-cols-3 divide-x divide-border border-y border-border">
            {[
              { label: "Investigations", value: investigations.length },
              { label: "Real test runs", value: runs.length },
              { label: "Cabin presets", value: scenarios.length },
            ].map((stat) => (
              <div key={stat.label} className="px-4 py-4 first:pl-0">
                <dt className="eyebrow">{stat.label}</dt>
                <dd className="mt-1 text-3xl font-semibold">
                  <CountUp value={stat.value} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="fs-rise relative mx-auto hidden w-full max-w-[540px] lg:block" style={{ animationDelay: "0.25s" }}>
          <HeroOrbit className="h-auto w-full" />
        </div>
      </section>

      <section aria-labelledby="findings" className="space-y-6">
        <div className="space-y-1.5">
          <h2 id="findings" className="rule-heading text-2xl sm:text-[1.75rem]">
            What the data shows
          </h2>
          <p className="text-sm text-muted-foreground">Three results from the real runs, each counted from the dataset on this page.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {lunar && lunarSolid && (
            <Link href="/habitat?preset=lunar-base" className={card}>
              <span className="eyebrow">Lunar exploration atmosphere</span>
              <span className="text-5xl font-semibold leading-none text-primary">
                <CountUp value={lunarSolid.withinTolerance} />
              </span>
              <span className="font-semibold">
                solid-fuel {lunarSolid.withinTolerance === 1 ? "run" : "runs"} at {num(lunar.o2Percent)}% oxygen and {num(lunar.pressurePsi)} psi
              </span>
              <span className="text-sm leading-relaxed text-muted-foreground">{lunarSolid.reason}</span>
              <span className={cardLink}>
                Open the coverage map <ArrowUpRight className={arrow} aria-hidden />
              </span>
            </Link>
          )}
          {stopped && stopped.total > 0 && (
            <Link href="/response" className={card}>
              <span className="eyebrow">Fans off</span>
              <span className="text-5xl font-semibold leading-none text-primary">
                <CountUp value={stopped.counts["went-out"]} />
                <span className="text-2xl font-medium text-muted-foreground"> of {stopped.total}</span>
              </span>
              <span className="font-semibold">flames went out when the crew stopped the airflow</span>
              <span className="text-sm leading-relaxed text-muted-foreground">
                Counted from the investigators&apos; notes on small BASS samples at close to cabin air. No such test exists at exploration
                oxygen levels.
              </span>
              <span className={cardLink}>
                Read every note <ArrowUpRight className={arrow} aria-hidden />
              </span>
            </Link>
          )}
          {nitrogen && nitrogen.total > 0 && (
            <Link href="/response" className={card}>
              <span className="eyebrow">Nitrogen jet</span>
              <span className="text-5xl font-semibold leading-none text-primary">
                <CountUp value={nitrogen.counts["went-out"]} />
                <span className="text-2xl font-medium text-muted-foreground"> of {nitrogen.total}</span>
              </span>
              <span className="font-semibold">flames were fully put out by a nitrogen jet</span>
              <span className="text-sm leading-relaxed text-muted-foreground">
                In {nitrogen.counts["partly-out"]} more the jet put out part of the flame and the rest kept burning. The jet was part of the
                experiment, not a spacecraft extinguisher.
              </span>
              <span className={cardLink}>
                Read every note <ArrowUpRight className={arrow} aria-hidden />
              </span>
            </Link>
          )}
        </div>
        {gravityRun && gravityQuote && (
          <figure className="relative overflow-hidden border-l-2 border-primary bg-gradient-to-r from-primary/10 via-card to-card px-6 py-5">
            <p className="eyebrow mb-2 !text-primary">Investigator&apos;s note</p>
            <blockquote className="text-xl font-semibold leading-snug sm:text-2xl">&ldquo;{gravityQuote}&rdquo;</blockquote>
            <figcaption className="mt-3 max-w-[90ch] text-sm leading-relaxed text-muted-foreground">
              BASS run <span className="font-mono text-xs text-foreground/90">{gravityRun.id}</span>, a strip of {gravityRun.material}{" "}
              burning against the airflow at {num(gravityRun.o2Percent ?? 0)}% oxygen. Ground tests alone do not show how a material burns in
              freefall.
            </figcaption>
          </figure>
        )}
      </section>

      <section aria-labelledby="flight-plan" className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1.5">
            <h2 id="flight-plan" className="rule-heading text-2xl sm:text-[1.75rem]">
              Flight plan
            </h2>
            <p className="text-sm text-muted-foreground">The three-minute tour, in order.</p>
          </div>
          <GridGlyph />
        </div>

        <ol className="relative grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
          {FLIGHT_PLAN.map((step, i) => (
            <li key={step.href} className="bg-card">
              <Link
                href={step.href}
                className="group relative flex h-full flex-col gap-3 p-5 transition-colors duration-200 hover:bg-accent/60 focus-visible:bg-accent/60"
              >
                <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100" />
                <span className="flex items-center gap-3">
                  <span className="font-mono text-xs tracking-[0.14em] text-primary tabular">T+{String(i + 1).padStart(2, "0")}</span>
                  <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent" />
                  <span aria-hidden className="size-1.5 rounded-full border border-link/70 transition-colors duration-200 group-hover:bg-link" />
                </span>
                <span className="text-base font-semibold">{step.title}</span>
                <span className="text-sm leading-relaxed text-muted-foreground">{step.body}</span>
                <span className="mt-auto flex items-center gap-1 pt-2 font-mono text-[11px] uppercase tracking-[0.1em] text-foreground/70 group-hover:text-link">
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
