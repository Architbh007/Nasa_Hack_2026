import { z } from "zod";

/**
 * Real-data contract. Every value shown in the app comes from a NASA PSI file or a cited NASA
 * paper, and every record says which. Missing values stay null; nothing is filled in.
 */

export const DataSourceSchema = z.enum(["psi", "published"]);
export const SourceKindSchema = z.enum(["psi-table", "paper"]);

/** Team classification of what an investigation burned (basis recorded per investigation). */
export const CategorySchema = z.enum(["solid", "liquid", "gas", "smoke-dust"]);

/** How detailed the data we hold for an investigation is. */
export const DataLevelSchema = z.enum([
  "runs",
  "planned-matrix",
  "day-summary",
  "log-summary",
  "schedule",
  "metadata-only",
]);

/**
 * measured: recorded per test in the source table. paper: stated in a cited NASA paper.
 * not-recorded: the source does not give it (a cited ISS nominal may be supplied separately
 * in pressureAssumedPsi, never in pressurePsi).
 */
export const PressureStatusSchema = z.enum(["measured", "paper", "not-recorded"]);

export const OutcomeSchema = z.enum([
  "burned",
  "extinguished",
  "blowoff",
  "no-ignition",
  "disruption",
  "cool-flame",
  "unknown",
]);
/** source-field: the table states it. notes-keyword: read from free-text notes (reviewed by a person). */
export const OutcomeBasisSchema = z.enum(["source-field", "notes-keyword", "none"]);

export const SafetyPillarSchema = z.enum(["prevention", "detection", "suppression"]);
export const MaterialClassSchema = z.enum([
  "fabric",
  "plastic",
  "foam",
  "wire-insulation",
  "liquid-fuel",
  "gas-leak",
]);
export const AirflowSchema = z.enum(["quiescent", "low", "ventilated"]);
export const HabitatGravitySchema = z.enum(["micro", "lunar", "mars", "earth"]);

const num = z.number().finite();
const range = z.object({ min: num, max: num }).refine((r) => r.min <= r.max, "min must be <= max");

export const RunSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  investigationId: z.string(),
  dataSource: DataSourceSchema,
  sourceKind: SourceKindSchema,
  /** File (or paper) and the exact place in it, e.g. "sheet 'as run matrix', row 70" or "Table 1, p. 3". */
  source: z.object({ file: z.string().min(1), ref: z.string().min(1) }),
  date: z.string().nullable(),
  material: z.string().nullable(),
  materialClass: MaterialClassSchema.nullable(),
  category: CategorySchema,

  o2Percent: num.min(0).max(100).nullable(),
  /** Verbatim O2 text when the source gives a range or an approximate value. */
  o2Text: z.string().nullable(),
  o2Approximate: z.boolean(),

  pressurePsi: num.positive().nullable(),
  pressureKPa: num.positive().nullable(),
  pressureStatus: PressureStatusSchema,
  pressureNote: z.string().nullable(),
  /** Cited nominal cabin pressure for tests whose source does not record one. Kept apart on purpose. */
  pressureAssumedPsi: num.positive().nullable(),
  pressureAssumedSource: z.string().nullable(),

  flowMinCmS: num.nullable(),
  flowMaxCmS: num.nullable(),
  flowText: z.string().nullable(),
  flowDirection: z.string().nullable(),

  n2Percent: num.nullable(),
  co2Percent: num.nullable(),
  hePercent: num.nullable(),

  outcome: OutcomeSchema,
  outcomeBasis: OutcomeBasisSchema,
  outcomeText: z.string().nullable(),

  /** Measured values carried over as named numbers (units in the key). */
  metrics: z.record(z.string(), num.nullable()),
  /** Plain-language caveats for this run (conflicts between sources, suspect cells, conversions). */
  flags: z.array(z.string()),
});

export const SummarySchema = z.object({
  investigationId: z.string(),
  kind: DataLevelSchema.exclude(["runs", "metadata-only"]),
  title: z.string(),
  note: z.string(),
  sourceFile: z.string(),
  data: z.unknown(),
});

export const InvestigationSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  accession: z.string().nullable(),
  acronym: z.string().min(1),
  name: z.string().min(1),
  project: z.string(),
  platform: z.string(),
  projectType: z.string(),
  subResearchArea: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  monitoringCenter: z.string(),
  objectives: z.string(),
  approach: z.string(),
  hypothesis: z.string(),
  earthBenefits: z.string(),
  keywords: z.string(),
  hardware: z.array(z.object({ name: z.string(), links: z.array(z.string()) })),
  /** Short tags matched from PSI's hardware text (for similarity); the text itself is in `hardware`. */
  hardwareTags: z.array(z.string()),
  relatedAccessions: z.array(z.string()),
  publicationTitlesRaw: z.string(),

  category: CategorySchema,
  categoryBasis: z.string(),
  dataLevel: DataLevelSchema,
  runCount: z.number().int().min(0),
  fuels: z.array(z.string()),
  ranges: z.object({
    o2Percent: range.nullable(),
    pressurePsi: range.nullable(),
    pressureIncludesAssumed: z.boolean(),
    flowCmS: range.nullable(),
  }),
  teamAssessment: z.object({ safetyPillars: z.array(SafetyPillarSchema), basis: z.string() }),
  citation: z.object({
    doi: z.string().nullable(),
    text: z.string().nullable(),
    licence: z.string().nullable(),
    pageUrl: z.string().nullable(),
  }),
  knownIssues: z.array(z.string()),
  dataSource: DataSourceSchema,
});

export const ScenarioSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  description: z.string().min(1),
  o2Percent: num.min(0).max(100),
  pressurePsi: num.positive(),
  typicalMaterials: z.array(MaterialClassSchema).min(1),
  typicalAirflow: z.enum(["ventilated", "quiescent"]),
  gravity: HabitatGravitySchema,
  /** Where the atmosphere values come from; null means "citation needed" and the UI says so. */
  source: z.object({ label: z.string(), url: z.string().url(), detail: z.string() }).nullable(),
});

export const InvestigationsFileSchema = z.array(InvestigationSchema);
export const RunsFileSchema = z.array(RunSchema);
export const SummariesFileSchema = z.array(SummarySchema);
export const ScenariosFileSchema = z.array(ScenarioSchema);

export type DataSource = z.infer<typeof DataSourceSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type DataLevel = z.infer<typeof DataLevelSchema>;
export type PressureStatus = z.infer<typeof PressureStatusSchema>;
export type Outcome = z.infer<typeof OutcomeSchema>;
export type OutcomeBasis = z.infer<typeof OutcomeBasisSchema>;
export type SafetyPillar = z.infer<typeof SafetyPillarSchema>;
export type MaterialClass = z.infer<typeof MaterialClassSchema>;
export type Airflow = z.infer<typeof AirflowSchema>;
export type HabitatGravity = z.infer<typeof HabitatGravitySchema>;
export type Run = z.infer<typeof RunSchema>;
export type Summary = z.infer<typeof SummarySchema>;
export type Investigation = z.infer<typeof InvestigationSchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;

export const CATEGORIES = CategorySchema.options;
export const SAFETY_PILLARS = SafetyPillarSchema.options;
export const OUTCOMES = OutcomeSchema.options;
export const MATERIAL_CLASSES = MaterialClassSchema.options;
export const DATA_LEVELS = DataLevelSchema.options;

/** A run can be placed on the O2-pressure map if it has O2 and some pressure (measured, paper or assumed). */
export function effectivePressurePsi(r: Pick<Run, "pressurePsi" | "pressureAssumedPsi">): number | null {
  return r.pressurePsi ?? r.pressureAssumedPsi;
}
