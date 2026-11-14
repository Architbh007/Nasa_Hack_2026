"use client";

import issModule from "@/public/images/iss-module-night.jpg";
import { AnimatedNumber } from "@/components/common/animated-number";
import { VerdictLine } from "@/components/habitat/readouts";
import { PageHeader } from "@/components/shell/page-header";
import { MATERIAL_LABEL } from "@/lib/constants";
import type { HabitatAssessment } from "@/lib/habitat";
import type { Scenario } from "@/lib/schema";
import { cn } from "@/lib/utils";

export const HABITAT_TITLE = "Habitat Flammability Explorer";
export const HABITAT_DESCRIPTION =
  "Pick a cabin air. See which real NASA tests cover it and which do not, read the SI's explanation with its sources, then watch a fire play out in a cabin module.";
export const HABITAT_IMAGE = {
  src: issModule,
  alt: "Inside a module of the International Space Station under dim night lighting, racks and cables lining the walls",
  credit: "NASA · iss042e021318",
  position: "center 45%",
};

/**
 * The page's photographic header, live: preset chips sit on the photograph and the readout on the
 * right follows the cabin as the controls below change it.
 */
export function HabitatHero({
  assessment,
  scenarios,
  presetId,
  onPreset,
}: {
  assessment: HabitatAssessment;
  scenarios: readonly Scenario[];
  presetId: string;
  onPreset: (id: string) => void;
}) {
  const { inputs } = assessment;
  const preset = scenarios.find((s) => s.id === presetId);
  const verdict = assessment.verdicts[assessment.category];

  return (
    <PageHeader
      title={HABITAT_TITLE}
      description={HABITAT_DESCRIPTION}
      image={HABITAT_IMAGE}
      aside={
        <section
          aria-label="Current cabin"
          aria-live="polite"
          className="rounded-[1.5rem] bg-black/45 p-6 ring-1 ring-white/10 backdrop-blur-xl"
        >
          <p className="flex items-baseline justify-between gap-3 text-[0.8125rem] text-foreground/70">
            Your cabin
            <span key={presetId} className="fs-swap truncate text-foreground">
              {preset ? preset.label : "Custom air"}
            </span>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <p>
              <span className="block text-[2.25rem] font-semibold leading-none tracking-[-0.02em]">
                <AnimatedNumber value={inputs.o2Percent} decimals={1} />
                <span className="ml-1 text-[1rem] font-normal text-foreground/65">%</span>
              </span>
              <span className="mt-1.5 block text-[0.8125rem] text-foreground/65">oxygen</span>
            </p>
            <p>
              <span className="block text-[2.25rem] font-semibold leading-none tracking-[-0.02em]">
                <AnimatedNumber value={inputs.pressurePsi} decimals={1} />
                <span className="ml-1 text-[1rem] font-normal text-foreground/65">psi</span>
              </span>
              <span className="mt-1.5 block text-[0.8125rem] text-foreground/65">total pressure</span>
            </p>
          </div>
          <p className="mt-4 text-[0.8125rem] text-foreground/65">
            O2 partial pressure{" "}
            <span className="text-foreground">
              <AnimatedNumber value={assessment.pO2.psi} decimals={2} /> psi
            </span>
          </p>
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-[0.8125rem] text-foreground/65">{MATERIAL_LABEL[inputs.materialClass]}</p>
            <div key={`${assessment.category}-${verdict.verdict}`} className="fs-swap mt-1">
              <VerdictLine v={verdict} />
            </div>
          </div>
        </section>
      }
    >
      <div role="group" aria-label="Cabin presets" className="flex flex-wrap gap-2">
        {scenarios.map((s) => {
          const active = s.id === presetId;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={active}
              onClick={() => onPreset(s.id)}
              title={s.description}
              className={cn(
                "rounded-full px-4 py-1.5 text-[0.875rem] transition-[background-color,color] duration-300 ease-out",
                active ? "bg-white text-black" : "bg-black/45 text-foreground/90 ring-1 ring-white/15 hover:bg-white/20"
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </PageHeader>
  );
}
