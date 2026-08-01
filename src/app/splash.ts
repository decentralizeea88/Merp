/* Splash: a harag ornament draws itself on, the title fades up beneath,
   auto-advances at 1.6s or on tap. */

import { el, navigate } from './shell';
import { t } from '../i18n/am';
import { dur, EASE } from '../core/anim';

const NS = 'http://www.w3.org/2000/svg';

/* Two interlaced sine strands with a central eye — the splash flourish,
   built as path data so the strokes can draw themselves on. */
const strandPath = (sign: 1 | -1): string => {
  const w = 260;
  const amp = 16 * sign;
  const period = 65;
  let d = `M 10 40`;
  for (let x = 10; x < 10 + w; x += 4) {
    const y = 40 + amp * Math.sin(((x - 10) / period) * Math.PI * 2);
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
};

export const splashScreen = (): HTMLElement => {
  const screen = el('main', 'splash');
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 280 80');
  svg.classList.add('splash__ornament');
  svg.setAttribute('aria-hidden', 'true');

  const paths: SVGPathElement[] = [];
  for (const sign of [1, -1] as const) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', strandPath(sign));
    p.classList.add(sign === 1 ? 'splash__strand--a' : 'splash__strand--b');
    svg.append(p);
    paths.push(p);
  }
  const eye = document.createElementNS(NS, 'circle');
  eye.setAttribute('cx', '140');
  eye.setAttribute('cy', '40');
  eye.setAttribute('r', '9');
  eye.classList.add('splash__eye');
  svg.append(eye);

  const title = el('h1', 'splash__title type-display', t('app.title'));
  screen.append(svg, title);

  for (const p of paths) {
    const len = 600;
    p.style.strokeDasharray = String(len);
    p.style.strokeDashoffset = String(len);
    p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
      duration: dur(900),
      easing: EASE.rise,
      fill: 'forwards',
    });
  }
  eye.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: dur(400, true),
    delay: dur(600),
    easing: EASE.fade,
    fill: 'both',
  });
  title.animate(
    [
      { opacity: 0, transform: 'translate3d(0, 12px, 0)' },
      { opacity: 1, transform: 'translate3d(0, 0, 0)' },
    ],
    { duration: dur(500), delay: dur(500), easing: EASE.rise, fill: 'both' },
  );

  let advanced = false;
  const advance = (): void => {
    if (advanced) return;
    advanced = true;
    navigate('home');
  };
  window.setTimeout(advance, dur(1600) || 200);
  screen.addEventListener('pointerdown', advance);
  return screen;
};
