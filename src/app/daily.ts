/* Daily screen: today's Ethiopian date, streak, and the way in. */

import { el, navigate } from './shell';
import { t, tf } from '../i18n/am';
import { toGeez } from '../core/geez';
import * as storage from '../core/storage';
import { renderArtwork } from '../art/registry';
import {
  dailyArtwork,
  dailyDone,
  dailySeed,
  formatEthiopic,
  todayEthiopic,
  todayKey,
} from '../game/daily';

export const dailyScreen = (): HTMLElement => {
  const screen = el('main', 'daily');
  const header = el('header', 'select__header');
  const back = el('button', 'icon-btn');
  back.type = 'button';
  back.setAttribute('aria-label', t('nav.back'));
  back.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  back.addEventListener('click', () => navigate('home'));
  header.append(back, el('h1', 'select__title type-header', t('mode.daily')));

  const today = todayEthiopic();
  const key = todayKey();
  const art = dailyArtwork(key);
  const done = dailyDone();
  const streak = storage.load().daily.streak;

  const card = el('section', 'daily__card');
  card.append(
    el('p', 'daily__date type-section', formatEthiopic(today, new Date().getDay())),
  );
  const preview = el('div', 'daily__preview');
  if (done) preview.classList.add('daily__preview--done');
  void renderArtwork(art).then((url) => {
    preview.style.backgroundImage = `url(${url})`;
  });
  card.append(preview);
  card.append(el('p', 'daily__title type-caption', tf.todaysArtwork(t(art.titleKey))));
  if (streak > 0) {
    card.append(el('p', 'daily__streak', tf.streakCount(toGeez(streak))));
  }

  if (done) {
    card.append(
      el('p', 'daily__done type-section', t('daily.done')),
      el('p', 'type-caption', t('daily.comeBack')),
    );
  } else {
    const play = el('button', 'btn btn--primary daily__play', t('nav.play'));
    play.type = 'button';
    play.addEventListener('click', () =>
      navigate('board', { art: art.id, size: '4', daily: '1', seed: dailySeed(key) }),
    );
    card.append(play);
  }

  screen.append(header, card);
  return screen;
};
