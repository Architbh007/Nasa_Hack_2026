import Fuse, { type IFuseOptions } from "fuse.js";
import type { Investigation } from "@/lib/schema";

export const INVESTIGATION_FUSE_OPTIONS: IFuseOptions<Investigation> = {
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.38,
  minMatchCharLength: 2,
  keys: [
    { name: "acronym", weight: 3 },
    { name: "accession", weight: 2.5 },
    { name: "name", weight: 2.5 },
    { name: "project", weight: 1.5 },
    { name: "fuels", weight: 1.5 },
    { name: "hardware.name", weight: 1.2 },
    { name: "keywords", weight: 1.2 },
    { name: "subResearchArea", weight: 1 },
    { name: "objectives", weight: 1 },
    { name: "approach", weight: 0.6 },
    { name: "earthBenefits", weight: 0.5 },
  ],
};

export function createInvestigationIndex(investigations: readonly Investigation[]) {
  return new Fuse([...investigations], INVESTIGATION_FUSE_OPTIONS);
}
