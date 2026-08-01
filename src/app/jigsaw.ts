/* The jigsaw screen: HUD, stage, piece view wiring, records. */

import { announce, el, navigate } from './shell';
import { t, tf } from '../i18n/am';
import { toGeez } from '../core/geez';
import * as storage from '../core/storage';
import { rngFrom, shuffle } from '../core/rng';
import { playCompletion, playSnap } from '../core/audio';
import { ARTWORKS, artworkById, renderArtwork, renderFrameImage } from '../art/registry';
import { layoutFor } from '../game/jigsaw/geometry';
import { createJigsawView, type JigsawView } from '../game/jigsaw/view';
import { runCompletionSequence } from '../core/anim';
import { DASH, timeText } from './board';

type JigsawParams = { art?: string; size?: string; seed?: string; continue?: string };

type SavedJigsawState = {
  seed: string;
  positions: Array<[number, number]>;
  placed: number[];
};

const savedJigsaw = (): (storage.SavedGame & { state: SavedJigsawState }) | null => {
  const cur = storage.load().current;
  if (!cur || cur.mode !== 'jigsaw') return null;
  const st = cur.state as SavedJigsawState | null;
  if (st && typeof st.seed === 'string' && Array.isArray(st.positions)) {
    return cur as storage.SavedGame & { state: SavedJigsawState };
  }
  return null;
};

export const jigsawScreen = (params: JigsawParams): HTMLElement => {
  const resume = params.continue === '1' ? savedJigsaw() : null;
  const art = artworkById(resume ? resume.artworkId : (params.art ?? '')) ?? ARTWORKS[0];
  if (!art) throw new Error('no artworks registered');
  const pieces = resume ? resume.size : Math.max(12, Math.min(48, Number(params.size ?? 24)));
  const seed = resume ? resume.state.seed : (params.seed ?? `${art.id}-${pieces}-${Date.now()}`);
  const recordKey = storage.puzzleKey('jigsaw', art.id, pieces);

  let elapsed = resume ? resume.elapsedMs : 0;
  let running = true;
  let finished = false;
  let view: JigsawView | null = null;

  const screen = el('main', 'board-screen jigsaw-screen');
  const hud = el('div', 'board-hud');
  const back = el('button', 'icon-btn');
  back.type = 'button';
  back.setAttribute('aria-label', t('nav.back'));
  back.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  back.addEventListener('click', () => navigate('select', { mode: 'jigsaw' }));
  const timeStat = el('div', 'board-hud__stat');
  const timeValue = el('span', 'board-hud__value', DASH);
  timeStat.append(el('span', 'board-hud__label', t('board.time')), timeValue);
  const doneStat = el('div', 'board-hud__stat');
  const doneValue = el('span', 'board-hud__value', DASH);
  doneStat.append(el('span', 'board-hud__label', t('size.pieces')), doneValue);
  hud.append(back, timeStat, doneStat, el('div', 'board-hud__spacer'));
  const stage = el('div', 'jigsaw-stage');
  screen.append(hud, stage);

  const layout = layoutFor(pieces);
  const total = layout.cols * layout.rows;

  const updateHud = (): void => {
    timeValue.textContent = timeText(elapsed);
    const done = view?.placedCount() ?? 0;
    doneValue.textContent = tf.pieceProgress(done === 0 ? DASH : toGeez(done), toGeez(total));
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

  const persist = (): void => {
    if (!view || finished) return;
    storage.update((d) => {
      d.current = {
        mode: 'jigsaw',
        artworkId: art.id,
        size: pieces,
        imageMode: true,
        elapsedMs: elapsed,
        moves: view?.placedCount() ?? 0,
        state: {
          seed,
          positions: view?.positions() ?? [],
          placed: view?.placedIds() ?? [],
        },
      };
    });
  };

  const finish = (): void => {
    finished = true;
    running = false;
    window.clearTimeout(tickHandle);
    const rec = storage.getRecord(recordKey);
    const newTime = rec.bestTimeMs === null || elapsed < rec.bestTimeMs;
    storage.update((d) => {
      d.records[recordKey] = {
        completed: true,
        bestTimeMs: newTime ? Math.round(elapsed) : rec.bestTimeMs,
        bestMoves: rec.bestMoves,
        mastery: rec.mastery,
      };
      if (!d.unlocked.includes(art.id)) d.unlocked.push(art.id);
      d.current = null;
    });
    announce(tf.completeAnnounce(t(art.titleKey)));
    playCompletion();
    if (!view) return;
    const card = el('section', 'win-card');
    card.setAttribute('aria-label', t('win.title'));
    card.append(
      el('h2', 'win-card__title type-header', t('win.title')),
      el('p', 'win-card__art type-caption', t(art.titleKey)),
    );
    const stats = el('dl', 'win-card__stats');
    const row = el('div', 'win-card__stat');
    row.append(
      el('dt', 'win-card__label', t('win.yourTime')),
      el('dd', 'win-card__value', timeText(elapsed)),
    );
    stats.append(row);
    card.append(stats);
    if (newTime) {
      const marks = el('p', 'win-card__marks');
      marks.append(el('span', 'win-card__mark', t('win.newRecord')));
      card.append(marks);
    }
    const actions = el('div', 'win-card__actions');
    const again = el('button', 'btn btn--primary', t('win.playAgain'));
    again.type = 'button';
    again.addEventListener('click', () =>
      navigate('jigsaw', { art: art.id, size: String(pieces) }),
    );
    const gallery = el('button', 'btn', t('nav.gallery'));
    gallery.type = 'button';
    gallery.addEventListener('click', () => navigate('gallery'));
    actions.append(again, gallery);
    card.append(actions);
    screen.append(card);
    runCompletionSequence({ well: view.board, card });
  };

  void Promise.all([renderArtwork(art), renderFrameImage()]).then(([artUrl, frameUrl]) => {
    /* wait a frame so the stage has layout before measuring */
    requestAnimationFrame(() => {
      if (!screen.isConnected) return;
      const trayOrder = shuffle(
        rngFrom(`tray-${seed}`),
        Array.from({ length: total }, (_, i) => i),
      );
      view = createJigsawView(stage, {
        pieces,
        seed,
        artworkUrl: artUrl,
        restore: resume
          ? { positions: resume.state.positions, placed: resume.state.placed }
          : undefined,
        trayOrder,
        cb: {
          onSnap: (progress) => {
            playSnap(progress);
            const done = view?.placedCount() ?? 0;
            if (done > 0) announce(tf.pieceSnapped(toGeez(done)));
            updateHud();
          },
          onComplete: finish,
          onMoved: persist,
        },
      });
      view.board.style.borderImage = `url(${frameUrl}) 84 / 12px round`;
      updateHud();
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

  updateHud();
  tick();
  return screen;
};
