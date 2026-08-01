/* Home: title, three mode cards, continue / gallery / settings, streak. */

import { el, navigate } from './shell';
import { t, tf } from '../i18n/am';
import { toGeez } from '../core/geez';
import * as storage from '../core/storage';
import { staggerRise } from '../core/anim';

const NS = 'http://www.w3.org/2000/svg';

/* Small line ornaments, one per mode, drawn as inline SVG strokes. */
const ornament = (kind: 'sliding' | 'jigsaw' | 'daily'): SVGSVGElement => {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 48 48');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('mode-card__ornament');
  const path = document.createElementNS(NS, 'path');
  if (kind === 'sliding') {
    path.setAttribute(
      'd',
      'M8 8h13v13H8zM27 8h13v13H27zM8 27h13v13H8zM30 33h7M33.5 29.5v7',
    );
  } else if (kind === 'jigsaw') {
    path.setAttribute(
      'd',
      'M10 24c0-8 4-8 7-6s6 1 6-3-1-7 5-7 12 5 12 14-6 16-15 16-15-6-15-14zM24 24c3-2 6 0 6 3',
    );
  } else {
    path.setAttribute(
      'd',
      'M24 6v6M24 36v6M6 24h6M36 24h6M11 11l4 4M33 33l4 4M37 11l-4 4M15 33l-4 4M24 16a8 8 0 1 0 0 16 8 8 0 0 0 0-16z',
    );
  }
  svg.append(path);
  return svg;
};

export const homeScreen = (): HTMLElement => {
  const screen = el('main', 'home');
  const data = storage.load();

  const top = el('header', 'home__top');
  const title = el('h1', 'home__title type-display', t('app.title'));
  top.append(title);
  if (data.daily.streak > 0) {
    top.append(el('span', 'home__streak type-caption', tf.streakCount(toGeez(data.daily.streak))));
  }

  const cards = el('div', 'home__cards');
  const card = (
    kind: 'sliding' | 'jigsaw' | 'daily',
    name: string,
    desc: string,
    go: () => void,
  ): HTMLButtonElement => {
    const btn = el('button', 'mode-card');
    btn.type = 'button';
    const text = el('span', 'mode-card__text');
    text.append(
      el('span', 'mode-card__name type-section', name),
      el('span', 'mode-card__desc type-caption', desc),
    );
    btn.append(ornament(kind), text);
    btn.addEventListener('click', go);
    return btn;
  };
  cards.append(
    card('sliding', t('mode.sliding'), t('mode.sliding.desc'), () =>
      navigate('select', { mode: 'sliding' }),
    ),
    card('jigsaw', t('mode.jigsaw'), t('mode.jigsaw.desc'), () =>
      navigate('select', { mode: 'jigsaw' }),
    ),
    card('daily', t('mode.daily'), t('mode.daily.desc'), () => navigate('daily')),
  );

  const lower = el('div', 'home__lower');
  if (data.current) {
    const cont = el('button', 'btn btn--primary home__continue', t('nav.continue'));
    cont.type = 'button';
    cont.addEventListener('click', () => navigate('board', { continue: '1' }));
    lower.append(cont);
  }
  const row = el('div', 'home__links');
  const gallery = el('button', 'btn', t('nav.gallery'));
  gallery.type = 'button';
  gallery.addEventListener('click', () => navigate('gallery'));
  const settings = el('button', 'btn', t('nav.settings'));
  settings.type = 'button';
  settings.addEventListener('click', () => navigate('settings'));
  row.append(gallery, settings);
  lower.append(row);

  screen.append(top, cards, lower);
  requestAnimationFrame(() => staggerRise([...cards.children, lower]));
  return screen;
};
