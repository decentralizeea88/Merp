/* Select: artwork chooser as a vertical scroller of large cards, with a
   segmented size control. Uncompleted artworks preview blurred. */

import { el, navigate } from './shell';
import { t } from '../i18n/am';
import { toGeez } from '../core/geez';
import * as storage from '../core/storage';
import { ARTWORKS, renderArtwork } from '../art/registry';
import { staggerRise } from '../core/anim';
import { timeText } from './board';

const SIZES: Record<string, ReadonlyArray<[string, string]>> = {
  sliding: [
    ['3', 'size.easy'],
    ['4', 'size.medium'],
    ['5', 'size.hard'],
  ],
  jigsaw: [
    ['12', 'size.easy'],
    ['24', 'size.medium'],
    ['48', 'size.hard'],
  ],
};

export const selectScreen = (params: Record<string, string>): HTMLElement => {
  const mode = params['mode'] === 'jigsaw' ? 'jigsaw' : 'sliding';
  const sizes = SIZES[mode] as ReadonlyArray<[string, string]>;
  let size = (sizes[1] as [string, string])[0];

  const screen = el('main', 'select');
  const header = el('header', 'select__header');
  const back = el('button', 'icon-btn');
  back.type = 'button';
  back.setAttribute('aria-label', t('nav.back'));
  back.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  back.addEventListener('click', () => navigate('home'));
  header.append(
    back,
    el('h1', 'select__title type-header', t(mode === 'jigsaw' ? 'mode.jigsaw' : 'mode.sliding')),
  );

  /* size segmented control */
  const sizeBox = el('div', 'select__sizes');
  sizeBox.append(el('span', 'select__sizes-label type-caption', t('size.label')));
  const seg = el('div', 'board-toggle');
  seg.setAttribute('role', 'group');
  seg.setAttribute('aria-label', t('size.label'));
  const opts: HTMLButtonElement[] = [];
  for (const [value, key] of sizes) {
    const opt = el('button', 'board-toggle__opt', t(key as Parameters<typeof t>[0]));
    opt.type = 'button';
    opt.dataset['value'] = value;
    opt.addEventListener('click', () => {
      size = value;
      for (const o of opts) o.setAttribute('aria-pressed', String(o === opt));
      updateStats();
    });
    opts.push(opt);
    seg.append(opt);
  }
  (opts[1] as HTMLButtonElement).setAttribute('aria-pressed', 'true');
  (opts[0] as HTMLButtonElement).setAttribute('aria-pressed', 'false');
  (opts[2] as HTMLButtonElement).setAttribute('aria-pressed', 'false');
  sizeBox.append(seg);

  const list = el('div', 'select__list');
  list.append(el('h2', 'visually-hidden', t('select.chooseArt')));
  const data = storage.load();
  const statEls = new Map<string, HTMLElement>();
  const updateStats = (): void => {
    for (const [artId, statEl] of statEls) {
      const rec = storage.getRecord(storage.puzzleKey(mode, artId, Number(size)));
      const bits: string[] = [];
      if (rec.bestTimeMs !== null) bits.push(`${t('board.time')} ${timeText(rec.bestTimeMs)}`);
      if (rec.bestMoves !== null) bits.push(`${t('board.moves')} ${toGeez(rec.bestMoves)}`);
      statEl.textContent = bits.length > 0 ? `${t('board.best')}፦ ${bits.join('፣ ')}` : '';
    }
  };
  for (const art of ARTWORKS) {
    const btn = el('button', 'art-card');
    btn.type = 'button';
    const img = el('span', 'art-card__img');
    if (!data.unlocked.includes(art.id)) img.classList.add('art-card__img--locked');
    void renderArtwork(art).then((url) => {
      img.style.backgroundImage = `url(${url})`;
    });
    const meta = el('span', 'art-card__meta');
    const statEl = el('span', 'art-card__stats type-caption');
    statEls.set(art.id, statEl);
    meta.append(el('span', 'art-card__title type-section', t(art.titleKey)), statEl);
    btn.append(img, meta);
    btn.addEventListener('click', () => {
      if (mode === 'jigsaw') navigate('jigsaw', { art: art.id, size });
      else navigate('board', { art: art.id, size });
    });
    list.append(btn);
  }
  updateStats();

  screen.append(header, sizeBox, list);
  requestAnimationFrame(() => staggerRise([...list.children].slice(0, 8)));
  return screen;
};
