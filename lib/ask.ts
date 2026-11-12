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
  "Which investigations tested solid fuels at reduced pressure?",
  "How does carbon dioxide compare with helium as a suppressant?",
  "What evidence covers the lunar base atmosphere of 34% O2 at 8.2 psi?",
  "Which instruments were reused between smoke and dust experiments?",
  "How does airflow change flame spread over solids in microgravity?",
  "Where do cool flames appear and why do they matter?",
] as const;
