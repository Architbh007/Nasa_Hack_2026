import { PSI_TO_KPA } from "@/lib/constants";
import type { Investigation, TestRun } from "@/lib/schema";

export type ComputedRanges = Pick<
  Investigation,
  "oxygenRange" | "pressureRange" | "flowRange"
>;

const r = (v: number, digits: number) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

/**
 * Investigation-level ranges derived from test runs. The generator writes these
 * into investigations.json and the validator recomputes them, so the two files
 * can never drift apart.
 */
export function computeRanges(tests: readonly TestRun[]): ComputedRanges {
  if (tests.length === 0) {
    throw new Error("computeRanges requires at least one test run");
  }
  const o2 = tests.map((t) => t.o2Percent);
  const p = tests.map((t) => t.pressurePsi);
  const flows = tests.map((t) => t.flowCmS).filter((f): f is number => f !== null);
  const minPsi = Math.min(...p);
  const maxPsi = Math.max(...p);
  return {
    oxygenRange: { min: r(Math.min(...o2), 1), max: r(Math.max(...o2), 1) },
    pressureRange: {
      minPsi: r(minPsi, 2),
      maxPsi: r(maxPsi, 2),
      minKPa: r(minPsi * PSI_TO_KPA, 1),
      maxKPa: r(maxPsi * PSI_TO_KPA, 1),
    },
    flowRange:
      flows.length === 0
        ? null
        : { min: r(Math.min(...flows), 1), max: r(Math.max(...flows), 1) },
  };
}
