/* Motion vocabulary — mirrors styles/tokens.css. Keep the two in sync. */

export const EASE = {
  slide: 'cubic-bezier(0.22, 1, 0.36, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  rise: 'cubic-bezier(0.16, 1, 0.3, 1)',
  fade: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const DUR = {
  slide: 180,
  settle: 260,
  spring: 220,
  rise: 320,
  fade: 160,
} as const;

export const reducedMotion = (): boolean =>
  document.documentElement.dataset['motion'] === 'reduce' ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Duration scaled to 0 under reduced motion; fades keep a 100ms floor so
   state changes still register visually. */
export const dur = (ms: number, isFade = false): number =>
  reducedMotion() ? (isFade ? 100 : 0) : ms;

export const animate = (
  el: Element,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Animation => {
  const base = typeof options.duration === 'number' ? options.duration : 0;
  return el.animate(keyframes, { fill: 'both', ...options, duration: dur(base) });
};

export const fadeIn = (el: Element, ms = DUR.fade): Animation =>
  el.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: dur(ms, true),
    easing: EASE.fade,
    fill: 'both',
  });

export const fadeOut = (el: Element, ms = DUR.fade): Animation =>
  el.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: dur(ms, true),
    easing: EASE.fade,
    fill: 'both',
  });

/* Staggered entrance: 24ms steps, compressed so the whole run lands within
   400ms no matter how many items arrive. */
export const staggerRise = (els: readonly Element[], distance = 16): void => {
  const step = Math.min(24, els.length > 1 ? 400 / (els.length - 1) : 0);
  els.forEach((el, i) => {
    el.animate(
      [
        { opacity: 0, transform: `translate3d(0, ${distance}px, 0)` },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ],
      {
        duration: dur(DUR.rise),
        easing: EASE.rise,
        delay: reducedMotion() ? 0 : i * step,
        fill: 'backwards',
      },
    );
  });
};
