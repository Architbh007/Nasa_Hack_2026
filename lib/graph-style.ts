import type { EdgeLabel } from "@/lib/similarity";

/** Edge type is encoded by dash pattern (not color) so it never competes with category node colors. */
export const EDGE_DASH: Record<EdgeLabel, number[] | null> = {
  "PSI-listed relation": null,
  "shared hardware": [6, 3],
  "same project": [1.5, 3],
  "shared material": [8, 3, 1.5, 3],
};
export const EDGE_COLOR = "rgba(160, 174, 196, 0.55)";
export const EDGE_COLOR_SOLID = "rgb(160, 174, 196)";
export const EDGE_DIM = "rgba(160, 174, 196, 0.15)";
export const HIGHLIGHT = "#ff7a3d";
