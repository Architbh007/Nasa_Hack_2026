import seedrandom from "seedrandom";

/** Thin wrapper around seedrandom so every draw in the generator is reproducible. */
export class Rng {
  private readonly prng: seedrandom.PRNG;

  constructor(seed: string | number) {
    this.prng = seedrandom(String(seed));
  }

  next(): number {
    return this.prng();
  }

  uniform(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(min: number, maxInclusive: number): number {
    return Math.floor(this.uniform(min, maxInclusive + 1));
  }

  /** Standard normal via Box-Muller. */
  normal(mean = 0, sd = 1): number {
    let u = 0;
    while (u === 0) u = this.next();
    const v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("pick() on empty array");
    return items[Math.floor(this.next() * items.length)] as T;
  }

  /** Multiplicative noise with median 1. */
  lognormal(sd: number): number {
    return Math.exp(this.normal(0, sd));
  }
}

export const round = (value: number, digits: number): number => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));
