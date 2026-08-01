/* Sliding board state — pure. cells[row * grid + col] holds the tile id
   (1..n-1) or 0 for the gap. Tile id k belongs at cell k-1 when solved. */

import type { Rng } from '../../core/rng';

export type Board = {
  readonly grid: number;
  readonly cells: readonly number[];
};

export const solvedBoard = (grid: number): Board => {
  const n = grid * grid;
  const cells: number[] = [];
  for (let i = 0; i < n - 1; i++) cells.push(i + 1);
  cells.push(0);
  return { grid, cells };
};

export const gapIndex = (b: Board): number => b.cells.indexOf(0);

export const rowOf = (i: number, grid: number): number => Math.floor(i / grid);
export const colOf = (i: number, grid: number): number => i % grid;

export const isSolved = (b: Board): boolean =>
  b.cells.every((v, i) => v === (i === b.cells.length - 1 ? 0 : i + 1));

/* Cells that would slide if the tile at `i` is pushed toward the gap:
   the contiguous run from `i` to the gap, exclusive of the gap. Empty
   when `i` is not in the gap's row or column. */
export const segmentToGap = (b: Board, i: number): number[] => {
  const g = gapIndex(b);
  if (i === g || i < 0 || i >= b.cells.length) return [];
  const seg: number[] = [];
  if (rowOf(i, b.grid) === rowOf(g, b.grid)) {
    const step = i < g ? 1 : -1;
    for (let k = i; k !== g; k += step) seg.push(k);
  } else if (colOf(i, b.grid) === colOf(g, b.grid)) {
    const step = i < g ? b.grid : -b.grid;
    for (let k = i; k !== g; k += step) seg.push(k);
  }
  return seg;
};

export type MoveResult = {
  board: Board;
  /* tile ids that moved, nearest-to-gap first */
  moved: number[];
};

/* Push the tile at `i` (and everything between it and the gap) one step
   toward the gap. Null when the move is illegal. */
export const applyMove = (b: Board, i: number): MoveResult | null => {
  const seg = segmentToGap(b, i);
  if (seg.length === 0) return null;
  const cells = [...b.cells];
  const g = gapIndex(b);
  const moved: number[] = [];
  /* walk from the gap backward so each cell shifts into its neighbor */
  for (let k = seg.length - 1; k >= 0; k--) {
    const from = seg[k] as number;
    const to = k === seg.length - 1 ? g : (seg[k + 1] as number);
    cells[to] = cells[from] as number;
    moved.push(cells[to] as number);
  }
  const first = seg[0] as number;
  cells[first] = 0;
  return { board: { grid: b.grid, cells }, moved };
};

/* Single-step neighbors of the gap — used by shuffling and keyboard play. */
export const gapNeighbors = (b: Board): number[] => {
  const g = gapIndex(b);
  const r = rowOf(g, b.grid);
  const c = colOf(g, b.grid);
  const out: number[] = [];
  if (r > 0) out.push(g - b.grid);
  if (r < b.grid - 1) out.push(g + b.grid);
  if (c > 0) out.push(g - 1);
  if (c < b.grid - 1) out.push(g + 1);
  return out;
};

export const inversions = (cells: readonly number[]): number => {
  const seq = cells.filter((v) => v !== 0);
  let inv = 0;
  for (let a = 0; a < seq.length; a++) {
    for (let bIdx = a + 1; bIdx < seq.length; bIdx++) {
      if ((seq[a] as number) > (seq[bIdx] as number)) inv++;
    }
  }
  return inv;
};

/* Parity criterion. Odd grids: inversions must be even. Even grids: the
   sum of inversions and the gap's row-from-bottom (1-based) must be odd. */
export const isSolvable = (b: Board): boolean => {
  const inv = inversions(b.cells);
  if (b.grid % 2 === 1) return inv % 2 === 0;
  const gapRowFromBottom = b.grid - rowOf(gapIndex(b), b.grid);
  return (inv + gapRowFromBottom) % 2 === 1;
};

/* Sum of tile Manhattan distances from home — a lower bound on moves,
   used as the mastery yardstick. */
export const manhattan = (b: Board): number => {
  let sum = 0;
  b.cells.forEach((v, i) => {
    if (v === 0) return;
    const home = v - 1;
    sum +=
      Math.abs(rowOf(i, b.grid) - rowOf(home, b.grid)) +
      Math.abs(colOf(i, b.grid) - colOf(home, b.grid));
  });
  return sum;
};

/* Shuffle by applying legal single-tile moves from solved — provably
   solvable by construction. Avoids immediately undoing the previous move. */
export const shuffleBoard = (grid: number, rng: Rng): Board => {
  let b = solvedBoard(grid);
  const steps = grid * grid * grid * 3;
  let prevGap = -1;
  for (let k = 0; k < steps; k++) {
    const options = gapNeighbors(b).filter((i) => i !== prevGap);
    const pickIdx = Math.floor(rng() * options.length);
    const cell = options[pickIdx] ?? (options[0] as number);
    prevGap = gapIndex(b);
    const res = applyMove(b, cell);
    if (res) b = res.board;
  }
  /* a shuffle that lands solved would be a non-puzzle */
  if (isSolved(b)) {
    const res = applyMove(b, gapNeighbors(b)[0] as number);
    if (res) b = res.board;
  }
  return b;
};

/* Where the gap ends up if the tile in direction `dir` from the gap is
   pushed into it — keyboard: arrow key names the direction the tile moves. */
export const cellForArrow = (
  b: Board,
  dir: 'up' | 'down' | 'left' | 'right',
): number | null => {
  const g = gapIndex(b);
  const r = rowOf(g, b.grid);
  const c = colOf(g, b.grid);
  switch (dir) {
    case 'up':
      return r < b.grid - 1 ? g + b.grid : null;
    case 'down':
      return r > 0 ? g - b.grid : null;
    case 'left':
      return c < b.grid - 1 ? g + 1 : null;
    case 'right':
      return c > 0 ? g - 1 : null;
  }
};
