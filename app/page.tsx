import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import orbitalSunrise from "@/public/images/orbital-sunrise.jpg";
import candleFlame from "@/public/images/microgravity-candle-flame.jpg";
import earthNight from "@/public/images/earth-night-aurora.jpg";
import { Button } from "@/components/ui/button";
import { getResponseCoding, tallyResponses } from "@/lib/crew-response";
import { getDataset } from "@/lib/data";
import { num } from "@/lib/format";
import { categoryVerdict } from "@/lib/habitat";

/** The demo path, in the order a judge should see it. */
const TOUR = [
  {
    href: "/explore?tab=history",
    title: "Why it matters",
    body: "Apollo 1, Mir, Saffire: real spacecraft fires and what each one taught NASA.",
    where: "Then vs Now",
  },
  {
    href: "/habitat?preset=lunar-base",
    title: "Is this air dangerous?",
    body: "Pick a cabin's oxygen and pressure. See what real tests found nearby and where nobody has tested.",
    where: "Flammability grid",
  },
  {
    href: "/habitat?preset=lunar-base#fire-twin",
    title: "Watch the fire",
    body: "Light an item in a cabin module and follow ignition, smoke, alarm and crew response.",
    where: "Fire Twin",
  },
  {
    href: "/response",
    title: "What puts it out?",
    body: "Every time a crew cut the airflow or used a nitrogen jet on a real flame in orbit.",
    where: "Crew Response",
  },
  {
    href: "/earth",
    title: "Back on Earth",
    body: "The same research shapes smoke detectors, suppression systems and firefighter gear.",
    where: "Earth Applications",
  },
] as const;

/** The sentence in a run's note that contains `phrase`, or null when the note does not have it. */
function noteSentence(note: string | null, phrase: string): string | null {
  const hit = (note ?? "").split(/(?<=[.!?])\s+/).find((sentence) => sentence.includes(phrase));
  return hit?.trim() ?? null;
}

function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-0.5 text-[1.0625rem] text-link hover:underline">
      {children}
      <ChevronRight className="size-4 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
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

  const tile = "group flex flex-col rounded-[1.75rem] bg-[#111113] p-8 transition-colors duration-300 hover:bg-[#161618] sm:p-10";

  return (
    <>
      {/* Hero: the photograph is the page; the headline sits on its dark lower edge and fades into the story below. */}
      <section className="full-bleed -mt-14 overflow-hidden">
        <div className="relative flex min-h-[calc(100svh-3rem)] items-end">
          <Image
            src={orbitalSunrise}
            alt="An orbital sunrise seen from the International Space Station, a thin band of blue and orange light along Earth's horizon"
            fill
            preload
            placeholder="blur"
            sizes="100vw"
            className="fs-settle object-cover object-[center_72%]"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/0" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/10 to-transparent" />
          <div className="relative mx-auto w-full max-w-[1280px] px-5 pb-20 sm:px-8 sm:pb-28 lg:px-10">
            <p className="mb-5 text-[1.0625rem] font-medium text-foreground/85">NASA Space Apps 2026 · Flame in Freefall</p>
            <h1 className="max-w-[14ch] text-[2.75rem] leading-[1.02] sm:text-[4rem] lg:text-[5rem]">Fire behaves differently in space.</h1>
            <p className="mt-6 max-w-[40rem] text-[1.1875rem] leading-relaxed text-foreground/80 sm:text-[1.375rem]">
              Moon and Mars cabins need to know how. FireSight shows what real NASA fire tests cover for any cabin atmosphere, and
              what was never tested.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Button asChild size="lg" className="h-12 px-6 text-[1rem] font-medium hover:bg-[#ff8f5a]">
                <Link href="/habitat">Open the habitat explorer</Link>
              </Button>
              <MoreLink href="/response">See the crew response evidence</MoreLink>
            </div>
          </div>
          <p className="absolute bottom-4 right-5 text-[0.6875rem] text-white/45">NASA · iss071e439624</p>
        </div>
      </section>

      {/* The physics, with the photograph that shows it. */}
      <section aria-labelledby="sphere" className="grid items-center gap-12 py-28 lg:grid-cols-2 lg:gap-20 lg:py-36">
        <figure className="relative mx-auto w-full max-w-[520px] overflow-hidden rounded-[2rem] bg-black">
          <Image
            src={candleFlame}
            alt="A candle flame burning in microgravity: a dim blue sphere around the wick instead of a tall yellow teardrop"
            placeholder="blur"
            sizes="(min-width: 1024px) 520px, 90vw"
            className="h-auto w-full"
          />
          <figcaption className="absolute bottom-3 right-4 text-[0.6875rem] text-white/45">NASA · 9902615</figcaption>
        </figure>
        <div className="max-w-[34rem]">
          <h2 id="sphere" className="text-[2.25rem] leading-[1.08] sm:text-[3rem]">
            Without gravity, a flame has no up.
          </h2>
          <p className="mt-6 text-[1.1875rem] leading-relaxed text-foreground/75">
            On Earth, hot gas rises and pulls fresh air into a flame. In orbit nothing rises, so a candle burns as a slow blue sphere,
            and a fire on a spacecraft depends on the airflow the crew controls.
          </p>
          <p className="mt-6 text-[1.1875rem] leading-relaxed text-foreground/75">
            FireSight reads <span className="tabular font-semibold text-foreground">{investigations.length}</span> NASA microgravity
            combustion investigations and <span className="tabular font-semibold text-foreground">{runs.length}</span> real test runs,
            with <span className="tabular font-semibold text-foreground">{scenarios.length}</span> cabin presets to start from. Every
            value leads back to the NASA file it came from.
          </p>
          <div className="mt-8">
            <MoreLink href="/explore">Browse the investigations</MoreLink>
          </div>
        </div>
      </section>

      {/* Findings: an uneven grid so the strongest result leads. */}
      <section aria-labelledby="findings" className="pb-28 lg:pb-36">
        <div className="mb-12 max-w-[44rem]">
          <h2 id="findings" className="text-[2.25rem] leading-[1.08] sm:text-[3rem]">
            What the data shows.
          </h2>
          <p className="mt-4 text-[1.1875rem] text-foreground/70">Three results, each counted from the real runs when this page is built.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {lunar && lunarSolid && (
            <Link href="/habitat?preset=lunar-base" className={`${tile} md:col-span-2 lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-16 lg:p-14`}>
              <div>
                <p className="text-[1.0625rem] font-medium text-primary">Lunar exploration atmosphere</p>
                <h3 className="mt-4 text-[2rem] leading-[1.08] sm:text-[3rem]">
                  <span className="tabular">{lunarSolid.withinTolerance}</span> solid-fuel{" "}
                  {lunarSolid.withinTolerance === 1 ? "run" : "runs"} at {num(lunar.o2Percent)}% oxygen and {num(lunar.pressurePsi)} psi.
                </h3>
              </div>
              <div>
                <p className="mt-5 max-w-[34rem] text-[1.0625rem] leading-relaxed text-foreground/70 lg:mt-0">{lunarSolid.reason}</p>
                <span className="mt-6 inline-flex items-center gap-0.5 text-[1.0625rem] text-link group-hover:underline">
                  Open the coverage map <ChevronRight className="size-4" aria-hidden />
                </span>
              </div>
            </Link>
          )}
          {stopped && stopped.total > 0 && (
            <Link href="/response" className={tile}>
              <p className="text-[1.0625rem] font-medium text-primary">Fans off</p>
              <h3 className="mt-3 text-[1.625rem] leading-[1.15] sm:text-[2rem]">
                <span className="tabular">{stopped.counts["went-out"]}</span> of <span className="tabular">{stopped.total}</span> flames went
                out when the crew stopped the airflow.
              </h3>
              <p className="mt-4 text-[1rem] leading-relaxed text-foreground/65">
                Counted from investigators&apos; notes on small BASS samples near cabin air. No such test exists at exploration oxygen
                levels.
              </p>
            </Link>
          )}
          {nitrogen && nitrogen.total > 0 && (
            <Link href="/response" className={tile}>
              <p className="text-[1.0625rem] font-medium text-primary">Nitrogen jet</p>
              <h3 className="mt-3 text-[1.625rem] leading-[1.15] sm:text-[2rem]">
                <span className="tabular">{nitrogen.counts["went-out"]}</span> of <span className="tabular">{nitrogen.total}</span> flames were
                fully put out by a nitrogen jet.
              </h3>
              <p className="mt-4 text-[1rem] leading-relaxed text-foreground/65">
                In {nitrogen.counts["partly-out"]} more the jet put out part of the flame. The jet was part of the experiment, not a
                spacecraft extinguisher.
              </p>
            </Link>
          )}
        </div>
      </section>

      {gravityRun && gravityQuote && (
        <figure className="mx-auto max-w-[56rem] pb-28 text-center lg:pb-36">
          <blockquote className="text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.02em] sm:text-[2.5rem]">
            &ldquo;{gravityQuote}&rdquo;
          </blockquote>
          <figcaption className="mx-auto mt-8 max-w-[44rem] text-[1.0625rem] leading-relaxed text-foreground/65">
            Investigator&apos;s note on BASS run <span className="font-mono text-[0.9375rem] text-foreground/85">{gravityRun.id}</span>, a
            strip of {gravityRun.material} burning against the airflow at {num(gravityRun.o2Percent ?? 0)}% oxygen. Ground tests alone do
            not show how a material burns in freefall.
          </figcaption>
        </figure>
      )}

      {/* The tour is a real sequence, so it is numbered. */}
      <section aria-labelledby="tour" className="pb-28 lg:pb-36">
        <h2 id="tour" className="mb-12 text-[2.25rem] leading-[1.08] sm:text-[3rem]">
          Take the three-minute tour.
        </h2>
        <ol className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-5">
          {TOUR.map((step, i) => (
            <li key={step.href} className="border-t border-white/10 pt-6">
              <Link href={step.href} className="group flex h-full flex-col">
                <span className="tabular text-[0.9375rem] text-muted-foreground">{i + 1}</span>
                <span className="mt-3 text-[1.25rem] font-semibold leading-snug">{step.title}</span>
                <span className="mt-2 text-[1rem] leading-relaxed text-foreground/65">{step.body}</span>
                <span className="mt-auto inline-flex items-center gap-0.5 pt-5 text-[0.9375rem] text-link group-hover:underline">
                  {step.where} <ChevronRight className="size-4" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* Closing band: Earth at night, fading up out of the black page. */}
      <section aria-labelledby="earth" className="full-bleed -mb-24 overflow-hidden">
        <div className="relative flex min-h-[34rem] items-center">
          <Image
            src={earthNight}
            alt="Earth at night from the International Space Station, city lights below a green aurora along the horizon"
            fill
            placeholder="blur"
            sizes="100vw"
            className="object-cover object-[center_65%]"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black via-black/30 to-black" />
          <div className="relative mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-10">
            <h2 id="earth" className="max-w-[16ch] text-[2.25rem] leading-[1.08] sm:text-[3rem]">
              The same research protects people on Earth.
            </h2>
            <p className="mt-5 max-w-[36rem] text-[1.1875rem] leading-relaxed text-foreground/80">
              Smoke detectors, suppression systems and firefighter gear, as NASA&apos;s own investigation records describe them.
            </p>
            <div className="mt-8">
              <MoreLink href="/earth">See the Earth applications</MoreLink>
            </div>
          </div>
          <p className="absolute bottom-4 right-5 text-[0.6875rem] text-white/45">NASA · iss058e005282</p>
        </div>
      </section>
    </>
  );
}
