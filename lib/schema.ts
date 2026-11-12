import { z } from "zod";

/**
 * Dataset schemas. These are the contract between the data files in /data and
 * the app. Swapping the synthetic JSON for real PSI exports only requires
 * producing files that satisfy these schemas (with dataSource: "psi").
 */

export const DataSourceSchema = z.enum(["synthetic", "psi"]);
export const FuelPhaseSchema = z.enum(["solid", "liquid", "gas"]);
export const GravityLevelSchema = z.enum([
  "microgravity",
  "normal",
  "simulated-partial",
]);
export const SafetyPillarSchema = z.enum([
  "prevention",
  "detection",
  "suppression",
]);
export const OutcomeSchema = z.enum([
  "sustained",
  "self-extinguished",
  "blowoff",
  "quenched",
  "cool-flame",
  "no-ignition",
]);
export const MaterialClassSchema = z.enum([
  "fabric",
  "plastic",
  "foam",
  "wire-insulation",
  "liquid-fuel",
  "gas-leak",
]);
export const HabitatKeySchema = z.enum(["iss", "lunarBase", "rover", "marsTransit"]);
export const AirflowSchema = z.enum(["quiescent", "low", "ventilated"]);
export const HabitatGravitySchema = z.enum(["micro", "lunar", "mars", "earth"]);

const finite = z.number().finite();

export const OxygenRangeSchema = z
  .object({ min: finite.min(0).max(100), max: finite.min(0).max(100) })
  .refine((r) => r.min <= r.max, { message: "oxygenRange.min must be <= max" });

export const PressureRangeSchema = z
  .object({
    minPsi: finite.positive(),
    maxPsi: finite.positive(),
    minKPa: finite.positive(),
    maxKPa: finite.positive(),
  })
  .refine((r) => r.minPsi <= r.maxPsi, {
    message: "pressureRange.minPsi must be <= maxPsi",
  });

export const FlowRangeSchema = z
  .object({ min: finite.min(0), max: finite.min(0) })
  .refine((r) => r.min <= r.max, { message: "flowRange.min must be <= max" })
  .nullable();

export const HabitatRelevanceEntrySchema = z.object({
  score: z.number().int().min(0).max(5),
  rationale: z.string().min(1),
});

export const InvestigationSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "id must be a lowercase slug"),
  name: z.string().min(1),
  acronym: z.string().min(1),
  project: z.string().min(1),
  platform: z.string().min(1),
  hardware: z.array(z.string().min(1)).min(1),
  yearsActive: z
    .object({ start: z.number().int(), end: z.number().int() })
    .refine((y) => y.start <= y.end, { message: "yearsActive.start must be <= end" }),
  fuelPhase: FuelPhaseSchema,
  fuels: z.array(z.string().min(1)).min(1),
  sampleGeometry: z.string().min(1),
  oxygenRange: OxygenRangeSchema,
  pressureRange: PressureRangeSchema,
  flowRange: FlowRangeSchema,
  diluents: z.array(z.string().min(1)),
  gravityLevel: GravityLevelSchema,
  objectives: z.array(z.string().min(1)).min(1),
  variables: z.array(z.string().min(1)),
  constants: z.array(z.string().min(1)),
  measurements: z.array(z.string().min(1)).min(1),
  keyFindings: z.array(z.string().min(1)),
  safetyPillars: z.array(SafetyPillarSchema).min(1),
  habitatRelevance: z.object({
    iss: HabitatRelevanceEntrySchema,
    lunarBase: HabitatRelevanceEntrySchema,
    rover: HabitatRelevanceEntrySchema,
    marsTransit: HabitatRelevanceEntrySchema,
  }),
  earthApplications: z.array(z.string().min(1)),
  sourceUrls: z.array(z.string().url()).min(1),
  dataSource: DataSourceSchema,
});

export const TestRunSchema = z
  .object({
    testId: z.string().min(1),
    investigationId: z.string().min(1),
    o2Percent: finite.min(0).max(100),
    pressurePsi: finite.positive(),
    flowCmS: finite.min(0).nullable(),
    diluent: z.string().min(1).nullable(),
    diluentPercent: finite.min(0).max(100).nullable(),
    gravityLevel: GravityLevelSchema,
    fuel: z.string().min(1),
    sampleSizeMm: finite.positive(),
    ignited: z.boolean(),
    outcome: OutcomeSchema,
    flameSpreadRateMmS: finite.min(0).nullable(),
    burnDurationS: finite.min(0),
    peakTemperatureK: finite.positive().nullable(),
    smokeObscurationPercent: finite.min(0).max(100).nullable(),
    extinctionDiameterMm: finite.min(0).nullable(),
    dataSource: DataSourceSchema,
  })
  .superRefine((t, ctx) => {
    if (!t.ignited && t.outcome !== "no-ignition") {
      ctx.addIssue({
        code: "custom",
        message: `${t.testId}: non-ignited run must have outcome no-ignition`,
      });
    }
    if (t.ignited && t.outcome === "no-ignition") {
      ctx.addIssue({
        code: "custom",
        message: `${t.testId}: ignited run cannot have outcome no-ignition`,
      });
    }
    if (t.flameSpreadRateMmS !== null && t.outcome !== "sustained") {
      ctx.addIssue({
        code: "custom",
        message: `${t.testId}: flameSpreadRateMmS must be null unless the flame was sustained`,
      });
    }
    if ((t.diluent === null) !== (t.diluentPercent === null)) {
      ctx.addIssue({
        code: "custom",
        message: `${t.testId}: diluent and diluentPercent must both be set or both be null`,
      });
    }
  });

export const ScenarioSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  description: z.string().min(1),
  o2Percent: finite.min(0).max(100),
  pressurePsi: finite.positive(),
  typicalMaterials: z.array(MaterialClassSchema).min(1),
  typicalAirflow: z.enum(["ventilated", "quiescent"]),
  gravity: HabitatGravitySchema,
  habitatKey: HabitatKeySchema.nullable(),
  dataSource: DataSourceSchema,
});

export const InvestigationsFileSchema = z.array(InvestigationSchema);
export const TestsFileSchema = z.array(TestRunSchema);
export const ScenariosFileSchema = z.array(ScenarioSchema);

export type DataSource = z.infer<typeof DataSourceSchema>;
export type FuelPhase = z.infer<typeof FuelPhaseSchema>;
export type GravityLevel = z.infer<typeof GravityLevelSchema>;
export type SafetyPillar = z.infer<typeof SafetyPillarSchema>;
export type Outcome = z.infer<typeof OutcomeSchema>;
export type MaterialClass = z.infer<typeof MaterialClassSchema>;
export type HabitatKey = z.infer<typeof HabitatKeySchema>;
export type Airflow = z.infer<typeof AirflowSchema>;
export type HabitatGravity = z.infer<typeof HabitatGravitySchema>;
export type Investigation = z.infer<typeof InvestigationSchema>;
export type TestRun = z.infer<typeof TestRunSchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;

export const FUEL_PHASES = FuelPhaseSchema.options;
export const SAFETY_PILLARS = SafetyPillarSchema.options;
export const OUTCOMES = OutcomeSchema.options;
export const MATERIAL_CLASSES = MaterialClassSchema.options;
export const HABITAT_KEYS = HabitatKeySchema.options;
