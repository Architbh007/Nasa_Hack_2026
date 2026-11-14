/** Shared Ask-the-Data constants (client and server). */

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
