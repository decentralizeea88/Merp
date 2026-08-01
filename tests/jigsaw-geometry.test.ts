import { describe, expect, it } from 'vitest';
import {
  layoutFor,
  makeEdge,
  makePuzzleEdges,
  piecePath,
  reverseEdge,
  sampleEdge,
} from '../src/game/jigsaw/geometry';
import { rngFrom } from '../src/core/rng';

describe('layoutFor', () => {
  it('maps piece counts to grids', () => {
    expect(layoutFor(12)).toEqual({ cols: 4, rows: 3 });
    expect(layoutFor(24)).toEqual({ cols: 6, rows: 4 });
    expect(layoutFor(48)).toEqual({ cols: 8, rows: 6 });
  });
});

describe('edge complementarity', () => {
  it('reversed chain traces the same curve backwards', () => {
    for (let s = 0; s < 12; s++) {
      const edge = makeEdge(rngFrom(`edge-${s}`));
      const fwd = sampleEdge(edge, 16);
      const rev = sampleEdge(reverseEdge(edge), 16, [1, 0]);
      /* reversed samples start at the forward end (1,0) and finish at
         the start; same points in opposite order within tolerance */
      expect(rev.length).toBe(fwd.length);
      const first = rev[0] as [number, number];
      expect(first[0]).toBeCloseTo(1, 5);
      expect(first[1]).toBeCloseTo(0, 5);
      for (let i = 0; i < fwd.length; i++) {
        const a = fwd[i] as [number, number];
        const b = rev[rev.length - 1 - i] as [number, number];
        expect(Math.abs(a[0] - b[0])).toBeLessThan(1e-6);
        expect(Math.abs(a[1] - b[1])).toBeLessThan(1e-6);
      }
    }
  });

  it('edges end exactly at (1,0)', () => {
    const edge = makeEdge(rngFrom('end'));
    const last = edge.segs[edge.segs.length - 1];
    expect(last?.[2]).toEqual([1, 0]);
  });
});

describe('piecePath', () => {
  it('is deterministic for a seed', () => {
    const layout = layoutFor(24);
    const a = makePuzzleEdges('abc', layout);
    const b = makePuzzleEdges('abc', layout);
    expect(piecePath(a, layout, 1, 2, 100, 80)).toBe(piecePath(b, layout, 1, 2, 100, 80));
  });

  it('adjacent pieces share their boundary curve exactly', () => {
    const layout = layoutFor(12);
    const edges = makePuzzleEdges('share', layout);
    /* the C-segment block emitted for (0,0)'s bottom edge must appear,
       reversed, relative to (1,0)'s top edge: both are generated from
       the same frame, so the rendered point strings match as sets */
    const below = piecePath(edges, layout, 1, 0, 100, 80);
    const above = piecePath(edges, layout, 0, 0, 100, 80);
    const nums = (s: string): string[] => s.match(/-?\d+\.\d+ -?\d+\.\d+/g) ?? [];
    const shared = nums(above).filter((p) => nums(below).includes(p));
    /* five cubic segments × three points on the shared edge appear in both */
    expect(shared.length).toBeGreaterThanOrEqual(15);
  });

  it('closes back at its start corner', () => {
    const layout = layoutFor(48);
    const edges = makePuzzleEdges('close', layout);
    const d = piecePath(edges, layout, 2, 3, 60, 55);
    expect(d.startsWith('M 180.00 110.00')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
  });
});
