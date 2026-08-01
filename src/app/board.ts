/* The sliding-board screen: HUD, board, input wiring, timing, records. */

import { el, announce, navigate } from './shell';
import { t, tf } from '../i18n/am';
import { toGeez } from '../core/geez';
import * as storage from '../core/storage';
import { rngFrom } from '../core/rng';
import { playCompletion, playSlide, playThud } from '../core/audio';
import { ARTWORKS, artworkById, renderArtwork, renderFrameImage } from '../art/registry';
import {
  applyMove,
  isSolved,
  manhattan,
  shuffleBoard,
  type Board,
} from '../game/sliding/model';
import { createBoardView, type BoardView } from '../game/sliding/view';
import { attachInput } from '../game/sliding/input';
import { runCompletionSequence } from '../core/anim';

export const timeText = (ms: number): string => {
  const totalS = Math.floor(ms / 1000);
  const m = Math.floor(totalS / 60);
  const s = totalS % 60;
  const sTxt = s === 0 ? '—' : toGeez(s);
  return m === 0 ? sTxt : `${toGeez(m)}:${sTxt}`;
};

type BoardParams = {
  art?: string;
  size?: string;
  seed?: string;
  daily?: string;
  continue?: string;
};

type SavedSlidingState = { seed: string; cells: number[]; daily?: boolean };

const savedSliding = (): (storage.SavedGame & { state: SavedSlidingState }) | null => {
  const cur = storage.load().current;
  if (!cur || cur.mode !== 'sliding') return null;
  const st = cur.state;
  if (
    typeof st === 'object' &&
    st !== null &&
    typeof (st as SavedSlidingState).seed === 'string' &&
    Array.isArray((st as SavedSlidingState).cells)
  ) {
    return cur as storage.SavedGame & { state: SavedSlidingState };
  }
  return null;
};

export const boardScreen = (params: BoardParams): HTMLElement => {
  const resume = params.continue === '1' ? savedSliding() : null;
  const art =
    artworkById(resume ? resume.artworkId : (params.art ?? '')) ?? ARTWORKS[0];
  if (!art) throw new Error('no artworks registered');
  const grid = resume
    ? resume.size
    : Math.max(3, Math.min(5, Number(params.size ?? 4)));
  const isDaily = resume ? resume.state.daily === true : params.daily === '1';
  const seed = resume
    ? resume.state.seed
    : (params.seed ?? `${art.id}-${grid}-${Date.now()}`);
  const recordKey = storage.puzzleKey(isDaily ? 'daily' : 'sliding', art.id, grid);

  let board: Board = resume
    ? { grid, cells: resume.state.cells }
    : shuffleBoard(grid, rngFrom(seed));
  const par = Math.max(manhattan(shuffleBoard(grid, rngFrom(seed))) * 2, grid * grid);
  let moves = resume ? resume.moves : 0;
  let elapsed = resume ? resume.elapsedMs : 0;
  let running = true;
  let finished = false;

  const screen = el('main', 'board-screen');

  /* HUD */
  const hud = el('div', 'board-hud');
  const back = el('button', 'icon-btn');
  back.type = 'button';
  back.setAttribute('aria-label', t('nav.back'));
  back.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  back.addEventListener('click', () =>
    navigate(isDaily ? 'home' : 'select', isDaily ? {} : { mode: 'sliding' }),
  );
  const timeStat = el('div', 'board-hud__stat');
  const timeValue = el('span', 'board-hud__value', '—');
  timeStat.append(el('span', 'board-hud__label', t('board.time')), timeValue);
  const movesStat = el('div', 'board-hud__stat');
  const movesValue = el('span', 'board-hud__value', '—');
  movesStat.append(el('span', 'board-hud__label', t('board.moves')), movesValue);
  const spacer = el('div', 'board-hud__spacer');
  const pauseBtn = el('button', 'icon-btn');
  pauseBtn.type = 'button';
  pauseBtn.setAttribute('aria-label', t('board.pause'));
  pauseBtn.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>';
  hud.append(back, timeStat, movesStat, spacer, pauseBtn);

  /* stage */
  const stage = el('div', 'board-stage');
  const boardBox = el('div');
  const toggle = el('div', 'board-toggle');
  toggle.setAttribute('role', 'group');
  toggle.setAttribute('aria-label', t('board.viewImage'));
  const optNum = el('button', 'board-toggle__opt', t('board.numeralMode'));
  const optImg = el('button', 'board-toggle__opt', t('board.imageMode'));
  optNum.type = 'button';
  optImg.type = 'button';
  toggle.append(optNum, optImg);
  stage.append(boardBox, toggle);
  screen.append(hud, stage);

  let view: BoardView | null = null;
  let imageMode = storage.load().current?.imageMode ?? true;

  const setImageMode = (on: boolean): void => {
    imageMode = on;
    view?.setImageMode(on);
    optNum.setAttribute('aria-pressed', String(!on));
    optImg.setAttribute('aria-pressed', String(on));
  };
  optNum.addEventListener('click', () => setImageMode(false));
  optImg.addEventListener('click', () => setImageMode(true));

  const persist = (): void => {
    storage.update((d) => {
      d.current = finished
        ? null
        : {
            mode: 'sliding',
            artworkId: art.id,
            size: grid,
            imageMode,
            elapsedMs: elapsed,
            moves,
            state: { seed, cells: [...board.cells], daily: isDaily },
          };
    });
  };

  const updateHud = (): void => {
    timeValue.textContent = timeText(elapsed);
    movesValue.textContent = moves === 0 ? '—' : toGeez(moves);
  };

  let tickHandle = 0;
  let lastTick = performance.now();
  let started = false;
  const tick = (): void => {
    if (started && !screen.isConnected) return;
    if (screen.isConnected) started = true;
    const now = performance.now();
    if (running && !finished && started) elapsed += now - lastTick;
    lastTick = now;
    updateHud();
    tickHandle = window.setTimeout(tick, 250);
  };

  const buildWinCard = (newRecord: boolean, mastery: boolean): HTMLElement => {
    const card = el('section', 'win-card');
    card.setAttribute('aria-label', t('win.title'));
    card.append(
      el('h2', 'win-card__title type-header', t('win.title')),
      el('p', 'win-card__art type-caption', t(art.titleKey)),
    );
    const stats = el('dl', 'win-card__stats');
    const stat = (label: string, value: string): void => {
      const row = el('div', 'win-card__stat');
      row.append(el('dt', 'win-card__label', label), el('dd', 'win-card__value', value));
      stats.append(row);
    };
    stat(t('win.yourTime'), timeText(elapsed));
    stat(t('win.yourMoves'), toGeez(moves));
    const rec = storage.getRecord(recordKey);
    if (rec.bestTimeMs !== null) stat(t('board.best'), timeText(rec.bestTimeMs));
    card.append(stats);
    if (newRecord || mastery) {
      const marks = el('p', 'win-card__marks');
      if (newRecord) marks.append(el('span', 'win-card__mark', t('win.newRecord')));
      if (mastery) marks.append(el('span', 'win-card__mark win-card__mark--gold', t('win.mastery')));
      card.append(marks);
    }
    const actions = el('div', 'win-card__actions');
    const again = el('button', 'btn btn--primary', t('win.playAgain'));
    again.type = 'button';
    again.addEventListener('click', () =>
      navigate('board', { art: art.id, size: String(grid) }),
    );
    const gallery = el('button', 'btn', t('nav.gallery'));
    gallery.type = 'button';
    gallery.addEventListener('click', () => navigate('gallery'));
    actions.append(again, gallery);
    card.append(actions);
    return card;
  };

  const finish = (): void => {
    finished = true;
    running = false;
    const rec = storage.getRecord(recordKey);
    const newTime = rec.bestTimeMs === null || elapsed < rec.bestTimeMs;
    const newMoves = rec.bestMoves === null || moves < rec.bestMoves;
    const mastery = moves <= par;
    storage.update((d) => {
      d.records[recordKey] = {
        completed: true,
        bestTimeMs: newTime ? Math.round(elapsed) : rec.bestTimeMs,
        bestMoves: newMoves ? moves : rec.bestMoves,
        mastery: rec.mastery || mastery,
      };
      if (!d.unlocked.includes(art.id)) d.unlocked.push(art.id);
      d.current = null;
    });
    announce(tf.completeAnnounce(t(art.titleKey)));
    playCompletion();
    if (view) {
      const card = buildWinCard(newTime || newMoves, mastery);
      stage.append(card);
      runCompletionSequence({ well: view.well, card });
    }
  };

  const doMove = (cell: number): void => {
    const res = applyMove(board, cell);
    if (!res || !view) return;
    board = res.board;
    moves++;
    view.setBoard(board);
    updateHud();
    playSlide();
    const movedFirst = res.moved[0];
    if (movedFirst !== undefined) announce(tf.moveAnnounce(toGeez(movedFirst)));
    if (isSolved(board)) finish();
    else persist();
  };

  void Promise.all([renderArtwork(art), renderFrameImage()]).then(([artUrl, frameUrl]) => {
    if (!screen.isConnected) return;
    view = createBoardView(boardBox, board, artUrl);
    view.well.style.borderImage = `url(${frameUrl}) 84 / 14px round`;
    view.well.tabIndex = 0;
    view.well.setAttribute('role', 'application');
    view.well.setAttribute('aria-label', t('mode.sliding'));
    view.setBoard(board);
    setImageMode(imageMode);
    attachInput(view, {
      getBoard: () => board,
      onMove: doMove,
      onIllegal: () => playThud(),
      enabled: () => !finished,
    });
  });

  const onVisibility = (): void => {
    if (!screen.isConnected) {
      document.removeEventListener('visibilitychange', onVisibility);
      return;
    }
    running = document.visibilityState === 'visible';
  };
  document.addEventListener('visibilitychange', onVisibility);

  /* pause sheet — restart and hint live here, off the board */
  const doRestart = (): void => {
    window.clearTimeout(tickHandle);
    storage.update((d) => {
      d.current = null;
    });
    navigate('board', {
      art: art.id,
      size: String(grid),
      ...(isDaily ? { daily: '1', seed } : {}),
    });
  };

  let sheet: HTMLElement | null = null;
  const closePause = (): void => {
    sheet?.remove();
    sheet = null;
    if (!finished && document.visibilityState === 'visible') running = true;
  };
  const showHint = (): void => {
    running = false;
    const overlay = el('button', 'hint-overlay');
    overlay.type = 'button';
    overlay.setAttribute('aria-label', t('common.close'));
    void renderArtwork(art).then((url) => {
      overlay.style.backgroundImage = `url(${url})`;
    });
    overlay.addEventListener('click', () => {
      overlay.remove();
      if (!finished) running = true;
    });
    screen.append(overlay);
    overlay.focus();
  };
  const openPause = (): void => {
    if (sheet || finished) return;
    running = false;
    sheet = el('div', 'sheet');
    const backdrop = el('button', 'sheet__backdrop');
    backdrop.type = 'button';
    backdrop.setAttribute('aria-label', t('common.close'));
    backdrop.addEventListener('click', closePause);
    const card = el('div', 'sheet__card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', t('board.pause'));
    card.append(el('h2', 'sheet__title type-section', t('board.pause')));
    const mkBtn = (label: string, cls: string, fn: () => void): HTMLButtonElement => {
      const b = el('button', cls, label);
      b.type = 'button';
      b.addEventListener('click', fn);
      return b;
    };
    card.append(
      mkBtn(t('board.resume'), 'btn btn--primary sheet__btn', closePause),
      mkBtn(t('board.viewImage'), 'btn sheet__btn', () => {
        closePause();
        showHint();
      }),
      mkBtn(t('board.restart'), 'btn sheet__btn', doRestart),
      mkBtn(t('nav.home'), 'btn sheet__btn', () => navigate('home')),
    );
    sheet.append(backdrop, card);
    screen.append(sheet);
    (card.querySelector('button') as HTMLButtonElement | null)?.focus();
  };
  pauseBtn.addEventListener('click', openPause);

  const onKey = (e: KeyboardEvent): void => {
    if (!screen.isConnected) {
      document.removeEventListener('keydown', onKey);
      return;
    }
    if (e.key === 'Escape') {
      if (sheet) closePause();
      else openPause();
    }
  };
  document.addEventListener('keydown', onKey);

  updateHud();
  tick();

  return screen;
};
