import type { MaterialClass } from "@/lib/schema";

/**
 * Map a material or fuel label as written in a NASA table to a habitat material class.
 * Returns null when no class fits (wax, candles, dusts). This is a team classification used for
 * matching, never shown as a NASA statement.
 */
const RULES: ReadonlyArray<{ test: RegExp; material: MaterialClass }> = [
  { test: /wire insulation|ptfe|teflon|kapton/i, material: "wire-insulation" },
  { test: /foam/i, material: "foam" },
  { test: /fabric|nomex|cotton|sibal|jersey|cloth|wick/i, material: "fabric" },
  { test: /pmma|delrin|kydex|ultem|silicone|plastic|acrylic/i, material: "plastic" },
  {
    test: /heptane|octane|decane|dodecane|hexadecane|farnesane|methanol|ethanol|propanol|c12h26|c7h16/i,
    material: "liquid-fuel",
  },
  { test: /methane|ethylene|ethane|propane|propylene|butane|hydrogen|dimethyl ether|c2h4|ch4|c3h8/i, material: "gas-leak" },
];

export function materialClassForFuel(fuel: string | null | undefined): MaterialClass | null {
  if (!fuel) return null;
  for (const rule of RULES) {
    if (rule.test.test(fuel)) return rule.material;
  }
  return null;
}
