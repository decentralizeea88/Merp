import { describe, expect, it } from 'vitest';
import { fromGeez, toGeez } from '../src/core/geez';

const KNOWN: ReadonlyArray<[number, string]> = [
  [1, '፩'],
  [2, '፪'],
  [3, '፫'],
  [4, '፬'],
  [5, '፭'],
  [6, '፮'],
  [7, '፯'],
  [8, '፰'],
  [9, '፱'],
  [10, '፲'],
  [11, '፲፩'],
  [12, '፲፪'],
  [13, '፲፫'],
  [14, '፲፬'],
  [15, '፲፭'],
  [20, '፳'],
  [24, '፳፬'],
  [30, '፴'],
  [42, '፵፪'],
  [50, '፶'],
  [60, '፷'],
  [70, '፸'],
  [77, '፸፯'],
  [80, '፹'],
  [90, '፺'],
  [99, '፺፱'],
  [100, '፻'],
  [101, '፻፩'],
  [110, '፻፲'],
  [111, '፻፲፩'],
  [137, '፻፴፯'],
  [200, '፪፻'],
  [999, '፱፻፺፱'],
  [1000, '፲፻'],
  [1996, '፲፱፻፺፮'],
  [2018, '፳፻፲፰'],
  [10000, '፼'],
  [10137, '፼፻፴፯'],
];

describe('toGeez', () => {
  it('matches known values', () => {
    for (const [n, s] of KNOWN) expect(toGeez(n), `n=${n}`).toBe(s);
  });

  it('rejects zero, negatives and non-integers', () => {
    expect(() => toGeez(0)).toThrow();
    expect(() => toGeez(-5)).toThrow();
    expect(() => toGeez(1.5)).toThrow();
  });
});

describe('fromGeez', () => {
  it('inverts toGeez for 1–100 and the century boundary', () => {
    for (let n = 1; n <= 100; n++) expect(fromGeez(toGeez(n)), `n=${n}`).toBe(n);
    for (const n of [101, 137, 999, 1000, 1996, 9999, 10000, 10137]) {
      expect(fromGeez(toGeez(n)), `n=${n}`).toBe(n);
    }
  });

  it('rejects garbage', () => {
    expect(() => fromGeez('')).toThrow();
    expect(() => fromGeez('abc')).toThrow();
  });
});
