import type { EdgeLabel } from "@/lib/similarity";

/** Edge type is encoded by dash pattern (not color) so it never competes with fuel-phase node colors. */
export const EDGE_DASH: Record<EdgeLabel, number[] | null> = {
  "shared hardware": null,
  "shared instrument": [6, 3],
  "shared fuel": [1.5, 3],
  "shared variable": [8, 3, 1.5, 3],
};
export const EDGE_COLOR = "rgba(160, 174, 196, 0.55)";
export const EDGE_COLOR_SOLID = "rgb(160, 174, 196)";
export const EDGE_DIM = "rgba(160, 174, 196, 0.15)";
export const HIGHLIGHT = "#ff7a3d";
