import type {
  Airflow,
  Category,
  DataLevel,
  HabitatGravity,
  MaterialClass,
  Outcome,
  PressureStatus,
  SafetyPillar,
} from "@/lib/schema";

export const PSI_TO_KPA = 6.894757;
export const KPA_TO_PSI = 0.145038;
export const ATM_TO_PSI = 14.6959;
export const MMHG_TO_PSI = 0.0193368;
export const EARTH_O2_PERCENT = 21;
export const EARTH_PRESSURE_PSI = 14.7;

/** Cited nominal ISS cabin pressure, used only for tests whose source records no pressure. */
export const ISS_NOMINAL_PRESSURE_PSI = 14.7;
export const ISS_NOMINAL_SOURCE =
  "ISS cabin nominal about 14.7 psi (101.4 kPa), NASA-STD-3001 ECLSS technical brief, https://www.nasa.gov/wp-content/uploads/2023/07/eclss-technical-brief-ochmo.pdf";

/** Slider bounds on the habitat page. */
export const O2_SLIDER = { min: 15, max: 100, step: 0.5 } as const;
export const PRESSURE_SLIDER = { min: 3, max: 15, step: 0.1 } as const;

export const CATEGORY_LABEL: Record<Category, string> = {
  solid: "Solid materials",
  liquid: "Liquid fuels",
  gas: "Gaseous fuels",
  "smoke-dust": "Smoke and dust",
};

export const CATEGORY_SHORT: Record<Category, string> = {
  solid: "Solid",
  liquid: "Liquid",
  gas: "Gas",
  "smoke-dust": "Smoke/dust",
};

export const DATA_LEVEL_LABEL: Record<DataLevel, string> = {
  runs: "Test runs",
  "planned-matrix": "Planned conditions only",
  "day-summary": "Daily summary",
  "log-summary": "Burner log summary",
  schedule: "Test schedule",
  "metadata-only": "Description only",
};

export const PILLAR_LABEL: Record<SafetyPillar, string> = {
  prevention: "Prevention",
  detection: "Detection",
  suppression: "Suppression",
};

export const OUTCOME_LABEL: Record<Outcome, string> = {
  burned: "Burned",
  extinguished: "Extinguished",
  blowoff: "Blowoff",
  "no-ignition": "No ignition",
  disruption: "Droplet disruption",
  "cool-flame": "Cool flame",
  unknown: "Not stated",
};

export const PRESSURE_STATUS_LABEL: Record<PressureStatus, string> = {
  measured: "Measured",
  paper: "From a NASA paper",
  "not-recorded": "Not recorded",
};

export const MATERIAL_LABEL: Record<MaterialClass, string> = {
  fabric: "Fabric",
  plastic: "Plastic",
  foam: "Foam",
  "wire-insulation": "Wire insulation",
  "liquid-fuel": "Liquid fuel",
  "gas-leak": "Gas leak",
};

/** Which category of real tests answers a question about each material class. */
export const MATERIAL_CATEGORY: Record<MaterialClass, Category> = {
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

/** Representative airflow speed for each airflow setting (used to match tested flow ranges). */
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
