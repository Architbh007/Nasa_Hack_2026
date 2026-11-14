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

export function habitatInterpretationSchema(allowedIds: ReadonlySet<string>) {
  const id = z
    .string()
    .trim()
    .refine((v) => allowedIds.has(v), {
      message: `investigationId must be one of the provided ids: ${[...allowedIds].join(", ")}`,
    });
  return z.object({
    plainSummary: z.string().trim().min(1).max(700),
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

/** True when every [id] citation in a text is one of the allowed ids. */
export function citesOnly(allowedIds: ReadonlySet<string>) {
  return (text: string) =>
    [...text.matchAll(/\[([a-z0-9-]+(?:\s*,\s*[a-z0-9-]+)*)\]/g)].every((m) =>
      (m[1] ?? "").split(/\s*,\s*/).every((id) => allowedIds.has(id))
    );
}

function citedText(allowedIds: ReadonlySet<string>, max: number) {
  return z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine(citesOnly(allowedIds), { message: `cite only these ids in [brackets]: ${[...allowedIds].join(", ")}` });
}

export function fireTwinNarrationSchema(allowedIds: ReadonlySet<string>) {
  return z.object({
    narration: citedText(allowedIds, 1400),
    takeaway: citedText(allowedIds, 400),
    testNext: citedText(allowedIds, 400),
  });
}
export type FireTwinNarration = z.infer<ReturnType<typeof fireTwinNarrationSchema>>;

export function lessonSchema(allowedIds: ReadonlySet<string>) {
  return z.object({ lesson: citedText(allowedIds, 900) });
}
export type Lesson = z.infer<ReturnType<typeof lessonSchema>>;
