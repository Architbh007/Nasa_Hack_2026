import type {
  Airflow,
  FuelPhase,
  HabitatGravity,
  HabitatKey,
  MaterialClass,
  Outcome,
  SafetyPillar,
} from "@/lib/schema";

export const PSI_TO_KPA = 6.894757;
export const EARTH_O2_PERCENT = 21;
export const EARTH_PRESSURE_PSI = 14.7;

/** Slider bounds on the habitat page. */
export const O2_SLIDER = { min: 15, max: 100, step: 0.5 } as const;
export const PRESSURE_SLIDER = { min: 3, max: 15, step: 0.1 } as const;

/**
 * Deliberate coverage gap in the synthetic data: no solid-fuel runs inside this
 * box. Only used by the generator, its tests and the chart shading.
 */
export const SYNTHETIC_SOLID_GAP = {
  o2Min: 30,
  o2Max: 40,
  pressureMaxPsi: 10.5,
} as const;

export const FUEL_PHASE_LABEL: Record<FuelPhase, string> = {
  solid: "Solid",
  liquid: "Liquid",
  gas: "Gas",
};

export const PILLAR_LABEL: Record<SafetyPillar, string> = {
  prevention: "Prevention",
  detection: "Detection",
  suppression: "Suppression",
};

export const OUTCOME_LABEL: Record<Outcome, string> = {
  sustained: "Sustained",
  "self-extinguished": "Self-extinguished",
  blowoff: "Blowoff",
  quenched: "Quenched",
  "cool-flame": "Cool flame",
  "no-ignition": "No ignition",
};

export const MATERIAL_LABEL: Record<MaterialClass, string> = {
  fabric: "Fabric",
  plastic: "Plastic",
  foam: "Foam",
  "wire-insulation": "Wire insulation",
  "liquid-fuel": "Liquid fuel",
  "gas-leak": "Gas leak",
};

export const MATERIAL_PHASE: Record<MaterialClass, FuelPhase> = {
  fabric: "solid",
  plastic: "solid",
  foam: "solid",
  "wire-insulation": "solid",
  "liquid-fuel": "liquid",
  "gas-leak": "gas",
};

export const AIRFLOW_LABEL: Record<Airflow, string> = {
  quiescent: "Quiescent",
  low: "Low (≈5 cm/s)",
  ventilated: "Ventilated (≈20 cm/s)",
};

/** Representative airflow speed used by the model for each airflow setting. */
export const AIRFLOW_CM_S: Record<Airflow, number | null> = {
  quiescent: null,
  low: 5,
  ventilated: 20,
};

export const GRAVITY_LABEL: Record<HabitatGravity, string> = {
  micro: "Microgravity",
  lunar: "Lunar (0.16 g)",
  mars: "Mars (0.38 g)",
  earth: "Earth (1 g)",
};

export const HABITAT_LABEL: Record<HabitatKey, string> = {
  iss: "ISS",
  lunarBase: "Lunar base",
  rover: "Pressurized rover",
  marsTransit: "Mars transit",
};
