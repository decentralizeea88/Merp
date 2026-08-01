/* The twelve artworks: id, seed, generator, string keys. Rendering is
   seeded and deterministic — a saved puzzle survives reload pixel-for-pixel. */

import type { StringKey } from '../i18n/am';
import { rngFrom } from '../core/rng';
import { ART_SIZE, canvasToBlobUrl, makeCanvas, type Generator } from './canvas';
import { drawHarag } from './harag';
import { drawLalibelaCross } from './cross';
import { drawTilf } from './weave';
import { drawAxumStele, drawBeteGiyorgis } from './architecture';
import { drawBirana, drawDemera, drawFidel } from './icon';
import { drawAbay, drawDallol, drawJebena, drawSimien } from './landscape';

export type Artwork = {
  id: string;
  seed: string;
  titleKey: StringKey;
  captionKey: StringKey;
  generator: Generator;
  /* the two typographic pieces need the display font before drawing */
  needsFont: boolean;
};

export const ARTWORKS: readonly Artwork[] = [
  { id: 'harag', seed: 'harag-1', titleKey: 'art.harag.title', captionKey: 'art.harag.caption', generator: drawHarag, needsFont: false },
  { id: 'lalibela-cross', seed: 'lalibela-3', titleKey: 'art.lalibela-cross.title', captionKey: 'art.lalibela-cross.caption', generator: drawLalibelaCross, needsFont: false },
  { id: 'axum-stele', seed: 'axum-1', titleKey: 'art.axum-stele.title', captionKey: 'art.axum-stele.caption', generator: drawAxumStele, needsFont: false },
  { id: 'bete-giyorgis', seed: 'giyorgis-1', titleKey: 'art.bete-giyorgis.title', captionKey: 'art.bete-giyorgis.caption', generator: drawBeteGiyorgis, needsFont: false },
  { id: 'tilf', seed: 'tilf-2', titleKey: 'art.tilf.title', captionKey: 'art.tilf.caption', generator: drawTilf, needsFont: false },
  { id: 'jebena', seed: 'jebena-1', titleKey: 'art.jebena.title', captionKey: 'art.jebena.caption', generator: drawJebena, needsFont: false },
  { id: 'simien', seed: 'simien-4', titleKey: 'art.simien.title', captionKey: 'art.simien.caption', generator: drawSimien, needsFont: false },
  { id: 'dallol', seed: 'dallol-2', titleKey: 'art.dallol.title', captionKey: 'art.dallol.caption', generator: drawDallol, needsFont: false },
  { id: 'birana', seed: 'birana-1', titleKey: 'art.birana.title', captionKey: 'art.birana.caption', generator: drawBirana, needsFont: true },
  { id: 'fidel', seed: 'fidel-1', titleKey: 'art.fidel.title', captionKey: 'art.fidel.caption', generator: drawFidel, needsFont: true },
  { id: 'abay', seed: 'abay-3', titleKey: 'art.abay.title', captionKey: 'art.abay.caption', generator: drawAbay, needsFont: false },
  { id: 'demera', seed: 'demera-1', titleKey: 'art.demera.title', captionKey: 'art.demera.caption', generator: drawDemera, needsFont: false },
];

export const artworkById = (id: string): Artwork | undefined =>
  ARTWORKS.find((a) => a.id === id);

export const renderArtwork = async (art: Artwork, size = ART_SIZE): Promise<string> => {
  if (art.needsFont && 'fonts' in document) {
    await document.fonts.load(`700 ${Math.round(size * 0.08)}px "Noto Serif Ethiopic"`, 'ጥበብ፡');
  }
  const { canvas, ctx } = makeCanvas(size);
  art.generator(ctx, size, rngFrom(art.seed));
  return canvasToBlobUrl(canvas, `${art.id}@${size}`);
};
