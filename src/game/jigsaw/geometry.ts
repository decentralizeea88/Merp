/* Jigsaw geometry — pure. Every interior edge is a single seeded bezier
   chain drawn in one canonical frame; one neighbor traverses it forward,
   the other reversed, so the two silhouettes are exact complements by
   construction. */

import type { Rng } from '../../core/rng';
import { rngFrom } from '../../core/rng';

export type Pt = [number, number];
/* one cubic segment: control1, control2, endpoint — edge-local space,
   x 0→1 along the edge, y in cross-cell units (tab depth ≈ 0.25) */
export type Cubic = [Pt, Pt, Pt];

export type EdgeShape = { segs: readonly Cubic[] };

export type Layout = { cols: number; rows: number };

export const layoutFor = (pieces: number): Layout => {
  if (pieces <= 12) return { cols: 4, rows: 3 };
  if (pieces <= 24) return { cols: 6, rows: 4 };
  return { cols: 8, rows: 6 };
};

/* A classic knob: shoulder, neck, round lobe, neck, shoulder. sign flips
   which neighbor the knob bulges into; jitter comes from the rng. */
export const makeEdge = (rng: Rng): EdgeShape => {
  const sign = rng() < 0.5 ? 1 : -1;
  const mid = 0.5 + (rng() - 0.5) * 0.1;
  const tab = (0.2 + rng() * 0.05) * sign;
  const neck = 0.07 * sign;
  const w = 0.11 + rng() * 0.025;
  const wave = (rng() - 0.5) * 0.05;
  const segs: Cubic[] = [
    [[0.09, wave], [mid - w - 0.08, wave * 0.5], [mid - w, neck * 0.3]],
    [[mid - w + 0.03, neck], [mid - w * 1.4, tab * 0.65], [mid - w * 0.55, tab * 0.9]],
    [[mid - w * 0.1, tab * 1.18], [mid + w * 0.1, tab * 1.18], [mid + w * 0.55, tab * 0.9]],
    [[mid + w * 1.4, tab * 0.65], [mid + w - 0.03, neck], [mid + w, neck * 0.3]],
    [[mid + w + 0.08, wave * 0.5], [0.91, wave], [1, 0]],
  ];
  return { segs };
};

/* Reverse a bezier chain: walk segments backward, swapping controls. */
export const reverseEdge = (edge: EdgeShape): EdgeShape => {
  const segs: Cubic[] = [];
  const src = edge.segs;
  for (let i = src.length - 1; i >= 0; i--) {
    const [c1, c2] = src[i] as Cubic;
    const prevEnd: Pt = i === 0 ? [0, 0] : (src[i - 1] as Cubic)[2];
    segs.push([c2, c1, prevEnd]);
  }
  return { segs };
};

/* Sample a chain from its start point — (0,0) forward, (1,0) reversed. */
export const sampleEdge = (edge: EdgeShape, perSeg = 8, from: Pt = [0, 0]): Pt[] => {
  const out: Pt[] = [from];
  let start: Pt = from;
  for (const [c1, c2, end] of edge.segs) {
    for (let i = 1; i <= perSeg; i++) {
      const t = i / perSeg;
      const u = 1 - t;
      out.push([
        u * u * u * start[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * end[0],
        u * u * u * start[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * end[1],
      ]);
    }
    start = end;
  }
  return out;
};

export type PuzzleEdges = {
  /* horizontal[r][c]: edge between (r,c) and (r+1,c), canonical left→right */
  horizontal: EdgeShape[][];
  /* vertical[r][c]: edge between (r,c) and (r,c+1), canonical top→bottom */
  vertical: EdgeShape[][];
};

export const makePuzzleEdges = (seed: string, layout: Layout): PuzzleEdges => {
  const rng = rngFrom(`jigsaw-${seed}`);
  const horizontal: EdgeShape[][] = [];
  for (let r = 0; r < layout.rows - 1; r++) {
    const row: EdgeShape[] = [];
    for (let c = 0; c < layout.cols; c++) row.push(makeEdge(rng));
    horizontal.push(row);
  }
  const vertical: EdgeShape[][] = [];
  for (let r = 0; r < layout.rows; r++) {
    const row: EdgeShape[] = [];
    for (let c = 0; c < layout.cols - 1; c++) row.push(makeEdge(rng));
    vertical.push(row);
  }
  return { horizontal, vertical };
};

/* Emit a chain through a canonical frame: origin + U·x + N·y. Both
   traversals of a shared edge use the same frame, which is what makes
   the two outlines coincide exactly. */
const emitChain = (
  d: string[],
  edge: EdgeShape,
  origin: Pt,
  U: Pt,
  N: Pt,
): void => {
  const tx = (p: Pt): string => {
    const x = origin[0] + U[0] * p[0] + N[0] * p[1];
    const y = origin[1] + U[1] * p[0] + N[1] * p[1];
    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  };
  for (const [c1, c2, end] of edge.segs) {
    d.push(`C ${tx(c1)}, ${tx(c2)}, ${tx(end)}`);
  }
};

/* Closed outline of piece (r,c) in board pixels, wound top → right →
   bottom → left. Border edges are straight. */
export const piecePath = (
  edges: PuzzleEdges,
  layout: Layout,
  r: number,
  c: number,
  cellW: number,
  cellH: number,
): string => {
  const x0 = c * cellW;
  const y0 = r * cellH;
  const x1 = x0 + cellW;
  const y1 = y0 + cellH;
  const d: string[] = [`M ${x0.toFixed(2)} ${y0.toFixed(2)}`];

  /* top — shared with the piece above; this piece traverses forward */
  if (r === 0) d.push(`L ${x1.toFixed(2)} ${y0.toFixed(2)}`);
  else {
    const e = edges.horizontal[r - 1]?.[c] as EdgeShape;
    emitChain(d, e, [x0, y0], [cellW, 0], [0, cellH]);
  }
  /* right — canonical top→bottom, forward */
  if (c === layout.cols - 1) d.push(`L ${x1.toFixed(2)} ${y1.toFixed(2)}`);
  else {
    const e = edges.vertical[r]?.[c] as EdgeShape;
    emitChain(d, e, [x1, y0], [0, cellH], [cellW, 0]);
  }
  /* bottom — canonical left→right, so traverse reversed (right→left) */
  if (r === layout.rows - 1) d.push(`L ${x0.toFixed(2)} ${y1.toFixed(2)}`);
  else {
    const e = reverseEdge(edges.horizontal[r]?.[c] as EdgeShape);
    /* reversed chain runs x 1→0 in the same frame anchored at the left */
    emitChain(d, e, [x0, y1], [cellW, 0], [0, cellH]);
  }
  /* left — canonical top→bottom, traverse reversed (bottom→top) */
  if (c === 0) d.push('Z');
  else {
    const e = reverseEdge(edges.vertical[r]?.[c - 1] as EdgeShape);
    emitChain(d, e, [x0, y0], [0, cellH], [cellW, 0]);
    d.push('Z');
  }
  return d.join(' ');
};
