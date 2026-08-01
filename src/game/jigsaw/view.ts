/* Jigsaw piece elements, dragging, snapping and group welding. Pieces are
   buttons clipped by shared SVG clipPaths; positions live in stage pixels
   and all measurements are cached outside the gesture. */

import { layoutFor, makePuzzleEdges, piecePath, type Layout } from './geometry';
import { toGeez } from '../../core/geez';
import { tf } from '../../i18n/am';
import { el } from '../../app/shell';
import { EASE, dur } from '../../core/anim';

const SVG = 'http://www.w3.org/2000/svg';

export type JigsawCallbacks = {
  onSnap: (progress: number) => void;
  onComplete: () => void;
  onMoved: () => void;
};

export type JigsawView = {
  stage: HTMLElement;
  board: HTMLElement;
  placedCount: () => number;
  positions: () => Array<[number, number]>;
  placedIds: () => number[];
  destroy: () => void;
};

type Opts = {
  pieces: number;
  seed: string;
  artworkUrl: string;
  /* stage-relative board origin and size, set by the screen's CSS */
  restore?: { positions: Array<[number, number]>; placed: number[] } | undefined;
  trayOrder: number[];
  cb: JigsawCallbacks;
};

export const createJigsawView = (stage: HTMLElement, opts: Opts): JigsawView => {
  const layout: Layout = layoutFor(opts.pieces);
  const n = layout.cols * layout.rows;
  const edges = makePuzzleEdges(opts.seed, layout);

  /* measured once per build; the screen rebuilds the view on resize */
  const stageRect = stage.getBoundingClientRect();
  const boardEl = el('div', 'jigsaw-board');
  stage.append(boardEl);
  const boardW = Math.min(stageRect.width - 8, stageRect.height * 0.62, 560);
  boardEl.style.width = `${boardW}px`;
  boardEl.style.height = `${boardW}px`;
  const boardX = (stageRect.width - boardW) / 2;
  const boardY = 4;
  /* the frame border is outside the content box; snapping aligns to content */
  const FRAME = 12;
  const px0 = boardX + FRAME;
  const py0 = boardY + FRAME;
  boardEl.style.transform = `translate3d(${boardX}px, ${boardY}px, 0)`;
  const ghost = el('div', 'jigsaw-board__ghost');
  ghost.style.backgroundImage = `url(${opts.artworkUrl})`;
  boardEl.append(ghost);

  const cellW = boardW / layout.cols;
  const cellH = boardW / layout.rows;
  const marginX = cellW * 0.34;
  const marginY = cellH * 0.34;
  const tol = Math.max(14, cellW * 0.22);

  /* shared clip paths */
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.classList.add('jigsaw-defs');
  const defs = document.createElementNS(SVG, 'defs');
  svg.append(defs);
  stage.append(svg);

  const uid = `jw${Math.floor(performance.now() % 100000)}`;
  const home = (id: number): [number, number] => [
    (id % layout.cols) * cellW,
    Math.floor(id / layout.cols) * cellH,
  ];

  /* piece state */
  const pos: Array<[number, number]> = [];
  const parent: number[] = [];
  const placed: boolean[] = [];
  const els: HTMLButtonElement[] = [];

  const find = (a: number): number => {
    let root = a;
    while (parent[root] !== root) root = parent[root] as number;
    let cur = a;
    while (cur !== root) {
      const next = parent[cur] as number;
      parent[cur] = root;
      cur = next;
    }
    return root;
  };
  const union = (a: number, b: number): void => {
    parent[find(a)] = find(b);
  };
  const groupOf = (id: number): number[] => {
    const root = find(id);
    const out: number[] = [];
    for (let i = 0; i < n; i++) if (find(i) === root) out.push(i);
    return out;
  };

  /* tray geometry: a pannable row below the board in portrait, a wrapped
     column block beside it in landscape */
  const wide = stageRect.width >= 900;
  const slotW = cellW + marginX * 2 + 8;
  const slotH = cellH + marginY * 2 + 8;
  const trayY = boardY + boardW + 18;
  const perCol = wide ? Math.max(1, Math.floor((stageRect.height - 16) / slotH)) : 1;
  const traySlot = (index: number): [number, number] =>
    wide
      ? [
          boardX + boardW + 28 + Math.floor(index / perCol) * slotW,
          8 + (index % perCol) * slotH,
        ]
      : [12 + index * slotW, trayY];
  const inTray = new Set<number>();

  for (let id = 0; id < n; id++) {
    const [hx, hy] = home(id);
    const r = Math.floor(id / layout.cols);
    const c = id % layout.cols;
    const clip = document.createElementNS(SVG, 'clipPath');
    clip.setAttribute('id', `${uid}-${id}`);
    clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', piecePath(edges, layout, r, c, cellW, cellH));
    path.setAttribute('transform', `translate(${marginX - hx}, ${marginY - hy})`);
    clip.append(path);
    defs.append(clip);

    const btn = el('button', 'jigsaw-piece');
    btn.type = 'button';
    btn.dataset['piece'] = String(id);
    btn.style.width = `${cellW + marginX * 2}px`;
    btn.style.height = `${cellH + marginY * 2}px`;
    btn.style.backgroundImage = `url(${opts.artworkUrl})`;
    btn.style.backgroundSize = `${boardW}px ${boardW}px`;
    btn.style.backgroundPosition = `${-(hx - marginX)}px ${-(hy - marginY)}px`;
    btn.style.clipPath = `url(#${uid}-${id})`;
    btn.setAttribute('aria-label', tf.pieceLabel(toGeez(id + 1)));
    parent.push(id);
    placed.push(false);
    pos.push([0, 0]);
    els.push(btn);
    stage.append(btn);
  }

  /* initial placement: restore, or scatter into the tray */
  if (opts.restore) {
    opts.restore.positions.forEach((p, id) => {
      pos[id] = [p[0] * boardW + boardX, p[1] * boardW + boardY];
    });
    for (const id of opts.restore.placed) {
      placed[id] = true;
      const [hx, hy] = home(id);
      pos[id] = [px0 + hx, py0 + hy];
    }
    /* re-weld loose neighbors that were left joined */
    for (let id = 0; id < n; id++) {
      if (placed[id]) continue;
      for (const nb of neighbors(id)) {
        if (placed[nb] || nb < id) continue;
        if (aligned(id, nb)) union(id, nb);
      }
    }
  } else {
    opts.trayOrder.forEach((id, index) => {
      const [tx, ty] = traySlot(index);
      pos[id] = [tx, ty];
      inTray.add(id);
    });
  }

  function neighbors(id: number): number[] {
    const r = Math.floor(id / layout.cols);
    const c = id % layout.cols;
    const out: number[] = [];
    if (r > 0) out.push(id - layout.cols);
    if (r < layout.rows - 1) out.push(id + layout.cols);
    if (c > 0) out.push(id - 1);
    if (c < layout.cols - 1) out.push(id + 1);
    return out;
  }

  function aligned(a: number, b: number): boolean {
    const [ax, ay] = pos[a] as [number, number];
    const [bx, by] = pos[b] as [number, number];
    const [ahx, ahy] = home(a);
    const [bhx, bhy] = home(b);
    return (
      Math.abs(ax - ahx - (bx - bhx)) < 2 && Math.abs(ay - ahy - (by - bhy)) < 2
    );
  }

  const render = (ids?: readonly number[]): void => {
    for (const id of ids ?? els.keys()) {
      const btn = els[id] as HTMLButtonElement;
      const [x, y] = pos[id] as [number, number];
      btn.style.transform = `translate3d(${x - marginX}px, ${y - marginY}px, 0)`;
    }
  };
  render();

  const settleTo = (ids: readonly number[], dx: number, dy: number): void => {
    for (const id of ids) {
      const p = pos[id] as [number, number];
      pos[id] = [p[0] + dx, p[1] + dy];
      const btn = els[id] as HTMLButtonElement;
      const [x, y] = pos[id] as [number, number];
      btn.animate(
        [
          { transform: `translate3d(${x - marginX - dx}px, ${y - marginY - dy}px, 0)` },
          { transform: `translate3d(${x - marginX}px, ${y - marginY}px, 0)` },
        ],
        { duration: dur(260), easing: EASE.settle, fill: 'none' },
      );
      btn.style.transform = `translate3d(${x - marginX}px, ${y - marginY}px, 0)`;
    }
  };

  /* drag — a piece drags its group; empty tray space pans the tray */
  let dragIds: number[] = [];
  let panning = false;
  let pid = -1;
  let lastX = 0;
  let lastY = 0;

  const onDown = (e: PointerEvent): void => {
    if (pid !== -1 || !e.isPrimary) return;
    const target = (e.target as HTMLElement).closest('.jigsaw-piece');
    if (target instanceof HTMLButtonElement) {
      const id = Number(target.dataset['piece']);
      if (placed[id]) return;
      inTray.delete(id);
      dragIds = groupOf(id);
      pid = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      target.setPointerCapture(pid);
      for (const gid of dragIds) {
        const b = els[gid] as HTMLButtonElement;
        b.classList.add('jigsaw-piece--dragging');
        b.style.willChange = 'transform';
      }
      e.preventDefault();
    } else if (inTray.size > 0) {
      panning = true;
      pid = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      stage.setPointerCapture(pid);
    }
  };

  const onMove = (e: PointerEvent): void => {
    if (e.pointerId !== pid) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    if (panning) {
      const ids = [...inTray];
      for (const id of ids) {
        const p = pos[id] as [number, number];
        pos[id] = [p[0] + (wide ? 0 : dx), p[1] + (wide ? dy : 0)];
      }
      render(ids);
      return;
    }
    for (const id of dragIds) {
      const p = pos[id] as [number, number];
      pos[id] = [p[0] + dx, p[1] + dy];
    }
    render(dragIds);
  };

  const onUp = (e: PointerEvent): void => {
    if (e.pointerId !== pid) return;
    pid = -1;
    if (panning) {
      panning = false;
      return;
    }
    const ids = dragIds;
    dragIds = [];
    for (const id of ids) {
      const b = els[id] as HTMLButtonElement;
      b.classList.remove('jigsaw-piece--dragging');
      b.style.willChange = '';
    }
    trySnap(ids);
    opts.cb.onMoved();
  };

  const trySnap = (ids: readonly number[]): void => {
    /* board snap: any piece near its home aligns the whole group */
    for (const id of ids) {
      const [x, y] = pos[id] as [number, number];
      const [hx, hy] = home(id);
      const dx = px0 + hx - x;
      const dy = py0 + hy - y;
      if (Math.abs(dx) < tol && Math.abs(dy) < tol) {
        settleTo(ids, dx, dy);
        for (const gid of ids) {
          placed[gid] = true;
          (els[gid] as HTMLButtonElement).classList.add('jigsaw-piece--placed');
        }
        const done = placed.filter(Boolean).length;
        opts.cb.onSnap(done / n);
        if (done === n) opts.cb.onComplete();
        return;
      }
    }
    /* neighbor weld: match relative offset against loose neighbors */
    for (const id of ids) {
      for (const nb of neighbors(id)) {
        if (placed[nb] || ids.includes(nb)) continue;
        const [x, y] = pos[id] as [number, number];
        const [nx, ny] = pos[nb] as [number, number];
        const [hx, hy] = home(id);
        const [nhx, nhy] = home(nb);
        const dx = nx - nhx + hx - x;
        const dy = ny - nhy + hy - y;
        if (Math.abs(dx) < tol && Math.abs(dy) < tol) {
          settleTo(ids, dx, dy);
          union(id, nb);
          opts.cb.onSnap(placed.filter(Boolean).length / n);
          return;
        }
      }
    }
  };

  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerup', onUp);
  stage.addEventListener('pointercancel', onUp);

  return {
    stage,
    board: boardEl,
    placedCount: () => placed.filter(Boolean).length,
    positions: () =>
      pos.map(([x, y]) => [(x - boardX) / boardW, (y - boardY) / boardW]),
    placedIds: () => placed.flatMap((p, i) => (p ? [i] : [])),
    destroy: () => {
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointercancel', onUp);
      svg.remove();
      boardEl.remove();
      for (const b of els) b.remove();
    },
  };
};
