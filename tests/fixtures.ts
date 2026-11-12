import type { Investigation } from "@/lib/schema";

/** Minimal valid investigation for unit tests; override fields per case. */
export function makeInvestigation(overrides: Partial<Investigation> = {}): Investigation {
  const base: Investigation = {
    id: "test-inv",
    name: "Test Investigation",
    acronym: "TI",
    project: "Standalone",
    platform: "International Space Station",
    hardware: ["Microgravity Science Glovebox (MSG)"],
    yearsActive: { start: 2015, end: 2016 },
    fuelPhase: "solid",
    fuels: ["PMMA"],
    sampleGeometry: "Flat slab",
    oxygenRange: { min: 18, max: 25 },
    pressureRange: { minPsi: 10, maxPsi: 14.7, minKPa: 68.9, maxKPa: 101.4 },
    flowRange: { min: 5, max: 30 },
    diluents: [],
    gravityLevel: "microgravity",
    objectives: ["Measure spread"],
    variables: ["oxygen concentration"],
    constants: ["microgravity"],
    measurements: ["Color video camera"],
    keyFindings: [],
    safetyPillars: ["prevention"],
    habitatRelevance: {
      iss: { score: 3, rationale: "x" },
      lunarBase: { score: 2, rationale: "x" },
      rover: { score: 2, rationale: "x" },
      marsTransit: { score: 3, rationale: "x" },
    },
    earthApplications: [],
    sourceUrls: ["https://psi.nasa.gov"],
    dataSource: "synthetic",
  };
  return { ...base, ...overrides };
}
