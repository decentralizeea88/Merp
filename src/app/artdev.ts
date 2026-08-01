/* Dev-only review route (#art): all twelve artworks on one page so the set
   can be judged together. Unlinked from the shipped UI. */

import { el } from './shell';
import { ARTWORKS, renderArtwork } from '../art/registry';
import { t } from '../i18n/am';

export const artDevScreen = (): HTMLElement => {
  const screen = el('main', 'artdev');
  const grid = el('div', 'artdev__grid');
  screen.append(grid);
  for (const art of ARTWORKS) {
    const card = el('figure', 'artdev__card');
    const img = el('div', 'artdev__img');
    const cap = el('figcaption', 'artdev__cap');
    cap.append(
      el('span', 'artdev__title type-section', t(art.titleKey)),
      el('span', 'artdev__id type-caption', art.id),
    );
    card.append(img, cap);
    grid.append(card);
    void renderArtwork(art).then((url) => {
      img.style.backgroundImage = `url(${url})`;
      img.dataset['ready'] = 'true';
    });
  }
  return screen;
};
