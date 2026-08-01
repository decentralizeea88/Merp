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

export type CompletionParts = {
  well: HTMLElement;
  card: HTMLElement;
  onDone?: () => void;
};

/* The most important six seconds in the game. Beats, from DESIGN_SPEC:
   trace (0.2s) → seams close (0.5s) → breath (1.0s) → frame bloom (1.6s)
   → stats card rises (2.2s). Tapping skips to the end state; the sequence
   never blocks input. */
export const runCompletionSequence = ({ well, card, onDone }: CompletionParts): void => {
  const reduced = reducedMotion();
  const timers: number[] = [];
  const at = (ms: number, fn: () => void): void => {
    timers.push(window.setTimeout(fn, reduced ? 0 : ms));
  };

  /* gold hairline tracing the perimeter */
  const svgNS = 'http://www.w3.org/2000/svg';
  const trace = document.createElementNS(svgNS, 'svg');
  trace.classList.add('board-trace');
  trace.setAttribute('aria-hidden', 'true');
  const rect = document.createElementNS(svgNS, 'rect');
  trace.append(rect);
  well.append(trace);

  const settle = (): void => {
    card.classList.add('win-card--shown');
    trace.remove();
    onDone?.();
  };

  if (reduced) {
    well.classList.add('board-well--complete');
    fadeIn(card);
    settle();
    return;
  }

  at(200, () => {
    const w = trace.clientWidth - 5;
    const h = trace.clientHeight - 5;
    rect.setAttribute('x', '2.5');
    rect.setAttribute('y', '2.5');
    rect.setAttribute('width', String(w));
    rect.setAttribute('height', String(h));
    const perimeter = 2 * (w + h);
    rect.style.strokeDasharray = String(perimeter);
    rect.style.strokeDashoffset = String(perimeter);
    rect.animate([{ strokeDashoffset: perimeter }, { strokeDashoffset: 0 }], {
      duration: 600,
      easing: EASE.fade,
      fill: 'forwards',
    });
  });
  at(500, () => well.classList.add('board-well--complete'));
  at(1000, () => {
    well.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.02)', offset: 0.5 },
        { transform: 'scale(1)' },
      ],
      { duration: 900, easing: 'ease-in-out' },
    );
  });
  at(1600, () => {
    trace.animate([{ opacity: 1 }, { opacity: 0.25 }, { opacity: 1 }, { opacity: 0 }], {
      duration: 900,
      easing: EASE.fade,
      fill: 'forwards',
    });
  });
  at(2200, settle);

  const skip = (): void => {
    timers.forEach((id) => window.clearTimeout(id));
    well.getAnimations({ subtree: true }).forEach((a) => a.finish());
    well.classList.add('board-well--complete');
    settle();
  };
  well.addEventListener('pointerdown', skip, { once: true });
};

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
