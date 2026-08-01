/* Pointer, drag and keyboard handling. A dragged segment tracks the
   pointer 1:1, clamped to its legal travel; release commits past the
   midpoint or on a flick, springs back otherwise. */

import type { Board } from './model';
import { cellForArrow, colOf, gapIndex, rowOf, segmentToGap } from './model';
import type { BoardView } from './view';

export type InputCallbacks = {
  getBoard: () => Board;
  /* commit a legal move of the tile at `cell`; animate=false when the
     drag already carried the tiles to their destination */
  onMove: (cell: number) => void;
  onIllegal: () => void;
  enabled: () => boolean;
};

const TAP_SLOP = 7;
const FLICK_VELOCITY = 0.45; /* px per ms */

export const attachInput = (view: BoardView, cb: InputCallbacks): (() => void) => {
  let dragCells: number[] = [];
  let dragCell = -1;
  let pointerId = -1;
  let startX = 0;
  let startY = 0;
  let axis: 'x' | 'y' = 'x';
  let dirSign = 1;
  let lastDelta = 0;
  let samples: Array<[number, number]> = [];

  const onPointerDown = (e: PointerEvent): void => {
    if (!cb.enabled() || pointerId !== -1 || !e.isPrimary) return;
    const target = (e.target as HTMLElement).closest('.board-tile');
    if (!(target instanceof HTMLButtonElement)) return;
    const board = cb.getBoard();
    const id = Number(target.dataset['tile']);
    const cell = board.cells.indexOf(id);
    const seg = segmentToGap(board, cell);
    if (seg.length === 0) {
      cb.onIllegal();
      return;
    }
    const g = gapIndex(board);
    const sameRow = rowOf(cell, board.grid) === rowOf(g, board.grid);
    axis = sameRow ? 'x' : 'y';
    dirSign = sameRow
      ? Math.sign(colOf(g, board.grid) - colOf(cell, board.grid))
      : Math.sign(rowOf(g, board.grid) - rowOf(cell, board.grid));
    dragCells = seg;
    dragCell = cell;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    lastDelta = 0;
    samples = [[e.timeStamp, 0]];
    target.setPointerCapture(e.pointerId);
    view.beginDrag(seg);
    e.preventDefault();
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== pointerId) return;
    const raw = axis === 'x' ? e.clientX - startX : e.clientY - startY;
    /* clamp to [0, one pitch] of travel toward the gap */
    const along = Math.max(0, Math.min(view.pitch(), raw * dirSign));
    lastDelta = along;
    samples.push([e.timeStamp, along]);
    if (samples.length > 5) samples.shift();
    const dx = axis === 'x' ? along * dirSign : 0;
    const dy = axis === 'y' ? along * dirSign : 0;
    view.dragTo(dragCells, dx, dy);
  };

  const finishDrag = (e: PointerEvent, cancelled: boolean): void => {
    if (e.pointerId !== pointerId) return;
    const cells = dragCells;
    const cell = dragCell;
    pointerId = -1;
    dragCells = [];
    dragCell = -1;

    const total = Math.hypot(e.clientX - startX, e.clientY - startY);
    const first = samples[0];
    const last = samples[samples.length - 1];
    const dt = first && last ? last[0] - first[0] : 1;
    const velocity = first && last && dt > 0 ? (last[1] - first[1]) / dt : 0;

    const isTap = !cancelled && total < TAP_SLOP;
    const commit =
      !cancelled &&
      !isTap &&
      (lastDelta > view.pitch() / 2 || velocity > FLICK_VELOCITY);

    if (isTap || commit) {
      view.endDrag(cells, false);
      cb.onMove(cell);
    } else {
      view.endDrag(cells, true);
    }
  };

  const onPointerUp = (e: PointerEvent): void => finishDrag(e, false);
  const onPointerCancel = (e: PointerEvent): void => finishDrag(e, true);

  const onKeyDown = (e: KeyboardEvent): void => {
    if (!cb.enabled()) return;
    const dir = (
      {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      } as const
    )[e.key];
    if (!dir) return;
    e.preventDefault();
    const cell = cellForArrow(cb.getBoard(), dir);
    if (cell === null) {
      cb.onIllegal();
      return;
    }
    cb.onMove(cell);
  };

  const wellEl = view.well;
  wellEl.addEventListener('pointerdown', onPointerDown);
  wellEl.addEventListener('pointermove', onPointerMove);
  wellEl.addEventListener('pointerup', onPointerUp);
  wellEl.addEventListener('pointercancel', onPointerCancel);
  wellEl.addEventListener('keydown', onKeyDown);

  return () => {
    wellEl.removeEventListener('pointerdown', onPointerDown);
    wellEl.removeEventListener('pointermove', onPointerMove);
    wellEl.removeEventListener('pointerup', onPointerUp);
    wellEl.removeEventListener('pointercancel', onPointerCancel);
    wellEl.removeEventListener('keydown', onKeyDown);
  };
};
