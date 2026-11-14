import type { Outcome } from "@/lib/schema";

/**
 * BASS outcomes are first read from the investigator notes by keyword (scripts/real/extract-bass.ts).
 * A keyword cannot tell "blew off" from "did not blow off", so these runs were re-read by the team
 * and their outcome corrected. Each entry quotes the words in the note that decide it.
 * Keyed by run id. Anything not listed here keeps its keyword outcome.
 */
export const BASS_OUTCOME_REVIEW: Readonly<Record<string, { outcome: Outcome; quote: string }>> = {
  "bass-asrun-3": { outcome: "extinguished", quote: "Only extinguishes when all flow stops." },
  "bass-asrun-11": { outcome: "unknown", quote: "flame did not blow off stagnation region" },
  "bass-asrun-16": { outcome: "extinguished", quote: "Flame extinuishes right away." },
  "bass-asrun-22": { outcome: "extinguished", quote: "All blue sphere just before extinction." },
  "bass-asrun-29": { outcome: "extinguished", quote: "oscilates before extinction" },
  "bass-asrun-41": { outcome: "extinguished", quote: "extinction when air flow off" },
  "bass-asrun-54": { outcome: "unknown", quote: "Did not blow out." },
  "bass-asrun-55": { outcome: "unknown", quote: "Did not blow out." },
  "bass-asrun-60": { outcome: "unknown", quote: "Did not blow out either at high flow or with GN2" },
  "bass-asrun-63": { outcome: "unknown", quote: "flame strong enough did not blow out at 10" },
  "bass-asrun-68": { outcome: "extinguished", quote: "soot disappeared then flame went out" },
};
