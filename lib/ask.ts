import { AIRFLOW_LABEL, GRAVITY_LABEL, MATERIAL_LABEL } from "@/lib/constants";
import type { HabitatInputs } from "@/lib/habitat";

/** Shared Ask-the-Data and cabin Q&A constants (client and server). */

export const ASK_LIMITS = {
  questionChars: 600,
  messageChars: 4000,
  historyMessages: 8,
} as const;

/** Prefix of the in-band error line appended to a stream that fails midway. */
export const STREAM_ERROR_MARKER = "\n\n<<firesight-error>>";
export const SOURCES_HEADER = "x-firesight-sources";
export const CACHED_HEADER = "x-firesight-cached";

export const STARTER_QUESTIONS = [
  "Which real tests burned solid materials below 10 psi?",
  "What did FLEX measure about CO2 and helium as suppressants?",
  "What real runs are closest to 34% O2 at 8.2 psi?",
  "How did DAFT help the SAME smoke experiment?",
  "Which outcomes in BASS come from investigator notes rather than a table field?",
  "Where do cool flames appear in the CFI data?",
] as const;

/** Starter questions for the cabin ask box on the habitat page; they are sent with the cabin context below. */
export const CABIN_STARTER_QUESTIONS = [
  "Which real tests are closest to this cabin's air?",
  "What did the nearest runs record, and how sure is that?",
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
