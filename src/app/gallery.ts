/* Gallery: a designed room. One artwork per screen in a horizontal
   scroll-snap scroller, title and caption as a proper caption block.
   Locked slots show only the empty harag frame. */

import { el, navigate } from './shell';
import { t } from '../i18n/am';
import * as storage from '../core/storage';
import { ARTWORKS, renderArtwork, renderFrameImage } from '../art/registry';

export const galleryScreen = (): HTMLElement => {
  const screen = el('main', 'gallery');
  const header = el('header', 'gallery__header');
  const back = el('button', 'icon-btn');
  back.type = 'button';
  back.setAttribute('aria-label', t('nav.back'));
  back.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  back.addEventListener('click', () => navigate('home'));
  header.append(back, el('h1', 'gallery__title type-header', t('gallery.title')));

  const scroller = el('div', 'gallery__scroller');
  const unlocked = storage.load().unlocked;
  const anyUnlocked = unlocked.length > 0;

  void renderFrameImage().then((frameUrl) => {
    for (const art of ARTWORKS) {
      const room = el('figure', 'gallery__room');
      const frame = el('div', 'gallery__frame');
      frame.style.borderImage = `url(${frameUrl}) 84 / 16px round`;
      const isOpen = unlocked.includes(art.id);
      if (isOpen) {
        void renderArtwork(art).then((url) => {
          frame.style.backgroundImage = `url(${url})`;
          frame.classList.add('gallery__frame--open');
        });
        const cap = el('figcaption', 'gallery__caption');
        cap.append(
          el('span', 'gallery__name type-section', t(art.titleKey)),
          el('span', 'gallery__text type-caption', t(art.captionKey)),
        );
        room.append(frame, cap);
      } else {
        frame.classList.add('gallery__frame--locked');
        const cap = el('figcaption', 'gallery__caption');
        cap.append(
          el('span', 'gallery__name type-section', t('gallery.locked')),
          el('span', 'gallery__text type-caption', t('gallery.lockedHint')),
        );
        room.append(frame, cap);
      }
      scroller.append(room);
    }
  });

  screen.append(header, scroller);
  if (!anyUnlocked) {
    screen.append(el('p', 'gallery__empty type-caption', t('gallery.empty')));
  }
  return screen;
};
