import type { MaterialClass } from "@/lib/schema";

const RULES: ReadonlyArray<{ test: RegExp; material: MaterialClass }> = [
  { test: /wire insulation|ptfe|teflon|kapton/i, material: "wire-insulation" },
  { test: /foam/i, material: "foam" },
  { test: /fabric|nomex|cotton|sibal|wick/i, material: "fabric" },
  { test: /pmma|delrin|kydex|silicone|plastic|acrylic|polymer/i, material: "plastic" },
  {
    test: /heptane|decane|dodecane|hexadecane|methanol|ethanol|droplet/i,
    material: "liquid-fuel",
  },
  {
    test: /methane|ethylene|ethane|propane|butane|hydrogen|dimethyl ether/i,
    material: "gas-leak",
  },
];

/**
 * Best-effort mapping from a free-text fuel name to a habitat material class.
 * Returns null for non-fuels such as test dusts.
 */
export function materialClassForFuel(fuel: string): MaterialClass | null {
  for (const rule of RULES) {
    if (rule.test.test(fuel)) return rule.material;
  }
  return null;
}
