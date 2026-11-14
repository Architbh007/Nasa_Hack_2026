import { AIRFLOW_LABEL, GRAVITY_LABEL, MATERIAL_LABEL } from "@/lib/constants";
import type { HabitatInputs } from "@/lib/habitat";

/** Shared cabin Q&A constants (client and server). */

export const ASK_LIMITS = {
  questionChars: 600,
  /** Room for the cabin context line that is prepended to each question. */
  messageChars: 4000,
  historyMessages: 8,
} as const;

/** Prefix of the in-band error line appended to a stream that fails midway. */
export const STREAM_ERROR_MARKER = "\n\n<<firesight-error>>";
export const SOURCES_HEADER = "x-firesight-sources";
export const CACHED_HEADER = "x-firesight-cached";

/** Starter questions for the cabin ask box; they are sent with the cabin context below. */
export const CABIN_STARTER_QUESTIONS = [
  "Has this material been fire-tested in air like this?",
  "What would put out a fire in this cabin?",
  "Which experiments matter most for this cabin, and why?",
] as const;

/** One line describing the cabin, prepended to every question so answers are about this cabin. */
export function cabinContextLine(inputs: HabitatInputs): string {
  return `Cabin: ${inputs.o2Percent.toFixed(1)}% O2 at ${inputs.pressurePsi.toFixed(1)} psi, material ${MATERIAL_LABEL[
    inputs.materialClass
  ].toLowerCase()}, airflow ${AIRFLOW_LABEL[inputs.airflow].toLowerCase()}, gravity ${GRAVITY_LABEL[inputs.gravity].toLowerCase()}.`;
}

export function cabinQuestion(inputs: HabitatInputs, question: string): string {
  return `${cabinContextLine(inputs)}\nQuestion: ${question.trim()}`;
}
