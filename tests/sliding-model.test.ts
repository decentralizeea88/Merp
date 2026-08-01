import { describe, expect, it } from 'vitest';
import {
  applyMove,
  cellForArrow,
  gapIndex,
  gapNeighbors,
  inversions,
  isSolvable,
  isSolved,
  manhattan,
  segmentToGap,
  shuffleBoard,
  solvedBoard,
  type Board,
} from '../src/game/sliding/model';
import { rngFrom } from '../src/core/rng';

describe('solvedBoard / isSolved', () => {
  it('builds and recognizes the solved state', () => {
    const b = solvedBoard(4);
    expect(b.cells).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]);
    expect(isSolved(b)).toBe(true);
    expect(gapIndex(b)).toBe(15);
  });
});

describe('segmentToGap / applyMove', () => {
  it('rejects tiles not sharing the gap row or column', () => {
    const b = solvedBoard(4);
    /* gap at 15 (row 3, col 3); cell 0 shares neither */
    expect(segmentToGap(b, 0)).toEqual([]);
    expect(applyMove(b, 0)).toBeNull();
  });

  it('slides a single adjacent tile', () => {
    const b = solvedBoard(4);
    const res = applyMove(b, 14);
    expect(res).not.toBeNull();
    expect(res?.moved).toEqual([15]);
    expect(res?.board.cells[15]).toBe(15);
    expect(res?.board.cells[14]).toBe(0);
  });

  it('slides a whole row segment in one move', () => {
    const b = solvedBoard(4);
    /* push tile at start of gap row: cells 12,13,14 all shift right */
    const res = applyMove(b, 12);
    expect(res).not.toBeNull();
    expect(res?.board.cells.slice(12)).toEqual([0, 13, 14, 15]);
    expect(res?.moved.sort((a, z) => a - z)).toEqual([13, 14, 15]);
  });

  it('slides a whole column segment in one move', () => {
    const b = solvedBoard(4);
    const res = applyMove(b, 3);
    expect(res).not.toBeNull();
    expect(res?.board.cells[3]).toBe(0);
    expect(res?.board.cells[7]).toBe(4);
    expect(res?.board.cells[11]).toBe(8);
    expect(res?.board.cells[15]).toBe(12);
  });

  it('is reversible', () => {
    const b = solvedBoard(3);
    const there = applyMove(b, 7);
    expect(there).not.toBeNull();
    const back = applyMove(there!.board, 8);
    expect(back?.board.cells).toEqual(b.cells);
  });
});

describe('solvability', () => {
  it('accepts the solved board and any legal-move shuffle', () => {
    for (const grid of [3, 4, 5]) {
      expect(isSolvable(solvedBoard(grid))).toBe(true);
      for (let s = 0; s < 20; s++) {
        const b = shuffleBoard(grid, rngFrom(`t-${grid}-${s}`));
        expect(isSolvable(b), `grid=${grid} seed=${s}`).toBe(true);
        expect(isSolved(b)).toBe(false);
      }
    }
  });

  it('rejects a single transposition (the classic 14-15 swap)', () => {
    const cells = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 14, 0];
    const b: Board = { grid: 4, cells };
    expect(isSolvable(b)).toBe(false);
    const odd: Board = { grid: 3, cells: [1, 2, 3, 4, 5, 6, 8, 7, 0] };
    expect(isSolvable(odd)).toBe(false);
  });

  it('counts inversions ignoring the gap', () => {
    expect(inversions([1, 2, 3, 4, 5, 6, 7, 8, 0])).toBe(0);
    expect(inversions([2, 1, 3, 4, 5, 6, 7, 8, 0])).toBe(1);
    expect(inversions([0, 8, 7, 6, 5, 4, 3, 2, 1])).toBe(28);
  });
});

describe('shuffleBoard', () => {
  it('is deterministic for a given seed', () => {
    const a = shuffleBoard(4, rngFrom('daily-2017-01-01'));
    const b = shuffleBoard(4, rngFrom('daily-2017-01-01'));
    expect(a.cells).toEqual(b.cells);
  });

  it('produces a permutation of all tiles', () => {
    const b = shuffleBoard(5, rngFrom('perm'));
    expect([...b.cells].sort((x, y) => x - y)).toEqual(
      Array.from({ length: 25 }, (_, i) => i),
    );
  });
});

describe('keyboard mapping', () => {
  it('maps arrows to the tile that slides in that direction', () => {
    const b = solvedBoard(3); /* gap bottom-right (2,2) */
    expect(cellForArrow(b, 'up')).toBeNull();
    expect(cellForArrow(b, 'left')).toBeNull();
    expect(cellForArrow(b, 'down')).toBe(5);
    expect(cellForArrow(b, 'right')).toBe(7);
  });
});

describe('manhattan', () => {
  it('is zero when solved and positive otherwise', () => {
    expect(manhattan(solvedBoard(4))).toBe(0);
    const res = applyMove(solvedBoard(4), 14);
    expect(manhattan(res!.board)).toBe(1);
  });
});

describe('gapNeighbors', () => {
  it('finds two neighbors in a corner, four in the middle', () => {
    expect(gapNeighbors(solvedBoard(3)).length).toBe(2);
    const mid: Board = { grid: 3, cells: [1, 2, 3, 4, 0, 6, 7, 8, 5] };
    expect(gapNeighbors(mid).length).toBe(4);
  });
});
