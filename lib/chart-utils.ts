/** Round an axis domain out to multiples of `step` so ticks land on clean values. */
export function niceDomain(values: readonly number[], step = 5, fallback: [number, number] = [0, 100]): [number, number] {
  if (values.length === 0) return fallback;
  let lo = Math.floor(Math.min(...values) / step) * step;
  let hi = Math.ceil(Math.max(...values) / step) * step;
  if (hi - lo < step) hi = lo + step;
  lo = Math.max(0, lo);
  return [lo, hi];
}

export function tickCountFor(domain: [number, number], step = 5, max = 11): number {
  return Math.min(max, Math.round((domain[1] - domain[0]) / step) + 1);
}
