/* Seeded PRNG — the only source of randomness in the project, so every
   artwork and every shuffle is reproducible from its seed. */

export type Rng = () => number;

export const mulberry32 = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const hashString = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const rngFrom = (seed: string | number): Rng =>
  mulberry32(typeof seed === 'number' ? seed : hashString(seed));

export const randInt = (rng: Rng, min: number, max: number): number =>
  min + Math.floor(rng() * (max - min + 1));

export const randFloat = (rng: Rng, min: number, max: number): number =>
  min + rng() * (max - min);

export const pick = <T>(rng: Rng, items: readonly T[]): T => {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error('pick from empty array');
  return item;
};

export const shuffle = <T>(rng: Rng, items: readonly T[]): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    // Indices are within bounds by construction of the Fisher–Yates loop.
    const a = out[i] as T;
    out[i] = out[j] as T;
    out[j] = a;
  }
  return out;
};
