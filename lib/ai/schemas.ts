import { z } from "zod";

/** zod schemas for every structured SI response. Shared by routes, UI and scripts. */

const line = z.string().trim().min(1).max(600);

export const InvestigationSummarySchema = z.object({
  overview: z.string().trim().min(1).max(900),
  keyTakeaways: z.array(line).min(1).max(5),
  habitatRelevance: line,
  caveats: line,
});
export type InvestigationSummary = z.infer<typeof InvestigationSummarySchema>;

export const ComparisonSchema = z.object({
  paragraph: z.string().trim().min(1).max(1500),
  similarities: z.array(line).max(6),
  differences: z.array(line).max(6),
});
export type Comparison = z.infer<typeof ComparisonSchema>;

export const EdgeExplanationSchema = z.object({ explanation: z.string().trim().min(1).max(700) });
export type EdgeExplanationResult = z.infer<typeof EdgeExplanationSchema>;

export const ScenarioSummarySchema = z.object({ paragraph: z.string().trim().min(1).max(1500) });
export type ScenarioSummary = z.infer<typeof ScenarioSummarySchema>;

export function habitatInterpretationSchema(allowedIds: ReadonlySet<string>) {
  const id = z
    .string()
    .trim()
    .refine((v) => allowedIds.has(v), {
      message: `investigationId must be one of the provided ids: ${[...allowedIds].join(", ")}`,
    });
  return z.object({
    summary: z.string().trim().min(1).max(1200),
    riskDrivers: z.array(line).min(1).max(6),
    relevantEvidence: z
      .array(z.object({ investigationId: id, evidence: line, relevance: line }))
      .min(1)
      .max(6),
    knowledgeGaps: z.array(line).min(1).max(6),
    recommendedTests: z.array(z.object({ test: line, rationale: line })).min(1).max(5),
    designImplications: z.object({
      prevention: z.array(line).max(4),
      detection: z.array(line).max(4),
      suppression: z.array(line).max(4),
    }),
  });
}
export type HabitatInterpretation = z.infer<ReturnType<typeof habitatInterpretationSchema>>;
