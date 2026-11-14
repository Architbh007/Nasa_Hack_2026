import { Starfield } from "@/components/shell/starfield";

/**
 * Full-page backdrop: deep-space gradient, a slow starfield and a faint plotting grid.
 * It sits behind everything and never takes clicks. The starfield holds still under reduced motion.
 */
export function SpaceBackdrop() {
  return (
    <div aria-hidden className="space-backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <Starfield />
      <div className="space-grid absolute inset-0" />
    </div>
  );
}
