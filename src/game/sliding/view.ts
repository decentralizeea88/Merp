/* DOM construction and transform updates for the sliding board. All
   geometry writes happen here; measurements are cached on resize and
   never read during a gesture. */

import type { Board } from './model';
import { colOf, rowOf, segmentToGap } from './model';
import { toGeez } from '../../core/geez';
import { tf } from '../../i18n/am';
import { el } from '../../app/shell';

export type BoardView = {
  well: HTMLElement;
  tileAt: (cell: number) => HTMLButtonElement | null;
  setBoard: (board: Board) => void;
  setImageMode: (on: boolean) => void;
  /* pixel distance from one cell origin to the next; cached */
  pitch: () => number;
  beginDrag: (cells: readonly number[]) => void;
  dragTo: (cells: readonly number[], dx: number, dy: number) => void;
  endDrag: (cells: readonly number[], spring: boolean) => void;
  destroy: () => void;
};

export const createBoardView = (
  container: HTMLElement,
  initial: Board,
  artworkUrl: string,
): BoardView => {
  const grid = initial.grid;
  const well = el('div', 'board-well');
  well.style.setProperty('--grid', String(grid));
  well.style.setProperty('--artwork', `url(${artworkUrl})`);

  const ghost = el('div', 'board-ghost');
  ghost.style.backgroundImage = `url(${artworkUrl})`;
  well.append(ghost);

  /* tile id → element; tiles are created once at their home slice */
  const tiles = new Map<number, HTMLButtonElement>();
  let board = initial;
  let cachedPitch = 0;

  for (let id = 1; id < grid * grid; id++) {
    const btn = el('button', 'board-tile');
    btn.type = 'button';
    btn.dataset['tile'] = String(id);
    const home = id - 1;
    btn.style.setProperty('--home-col', String(colOf(home, grid)));
    btn.style.setProperty('--home-row', String(rowOf(home, grid)));
    const numeral = el('span', 'board-tile__numeral', toGeez(id));
    numeral.setAttribute('aria-hidden', 'true');
    btn.append(numeral);
    tiles.set(id, btn);
    well.append(btn);
  }

  const positionAll = (): void => {
    board.cells.forEach((id, cell) => {
      if (id === 0) return;
      const btn = tiles.get(id);
      if (!btn) return;
      btn.style.setProperty('--col', String(colOf(cell, grid)));
      btn.style.setProperty('--row', String(rowOf(cell, grid)));
      const movable = segmentToGap(board, cell).length > 0;
      btn.setAttribute('aria-disabled', movable ? 'false' : 'true');
      btn.setAttribute(
        'aria-label',
        tf.tileLabel(toGeez(id), toGeez(rowOf(cell, grid) + 1), toGeez(colOf(cell, grid) + 1)),
      );
    });
  };

  const measure = (): void => {
    const rect = well.getBoundingClientRect();
    const inner = rect.width - 28; /* well border */
    const gap = 3;
    cachedPitch = (inner - (grid - 1) * gap) / grid + gap;
  };
  const ro = new ResizeObserver(measure);
  ro.observe(well);

  positionAll();
  container.append(well);

  const baseTransform = (cell: number): string => {
    const x = colOf(cell, grid) * cachedPitch;
    const y = rowOf(cell, grid) * cachedPitch;
    return `translate3d(${x}px, ${y}px, 0)`;
  };

  return {
    well,
    tileAt: (cell) => {
      const id = board.cells[cell];
      return id ? (tiles.get(id) ?? null) : null;
    },
    setBoard: (b) => {
      board = b;
      positionAll();
    },
    setImageMode: (on) => {
      well.classList.toggle('board-well--image', on);
    },
    pitch: () => cachedPitch,
    beginDrag: (cells) => {
      for (const cell of cells) {
        const id = board.cells[cell];
        const btn = id ? tiles.get(id) : null;
        if (!btn) continue;
        btn.classList.add('board-tile--dragging');
        btn.style.willChange = 'transform';
        btn.style.transform = baseTransform(cell);
      }
    },
    dragTo: (cells, dx, dy) => {
      for (const cell of cells) {
        const id = board.cells[cell];
        const btn = id ? tiles.get(id) : null;
        if (!btn) continue;
        const x = colOf(cell, grid) * cachedPitch + dx;
        const y = rowOf(cell, grid) * cachedPitch + dy;
        btn.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    },
    endDrag: (cells, spring) => {
      for (const cell of cells) {
        const id = board.cells[cell];
        const btn = id ? tiles.get(id) : null;
        if (!btn) continue;
        btn.classList.remove('board-tile--dragging');
        if (spring) {
          btn.classList.add('board-tile--spring');
          btn.addEventListener(
            'transitionend',
            () => btn.classList.remove('board-tile--spring'),
            { once: true },
          );
        }
        btn.style.willChange = '';
        btn.style.transform = '';
      }
    },
    destroy: () => {
      ro.disconnect();
      well.remove();
    },
  };
};
