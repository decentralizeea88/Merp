/* Screen container: registration, navigation with cross-fade, theme,
   reduced-motion override, and the aria-live announcer. */

import { load } from '../core/storage';
import { dur, EASE } from '../core/anim';

export type ScreenParams = Record<string, string>;
export type ScreenFactory = (params: ScreenParams) => HTMLElement;

const screens = new Map<string, ScreenFactory>();
let root: HTMLElement | null = null;
let currentEl: HTMLElement | null = null;
let currentName = '';
let liveRegion: HTMLElement | null = null;

export const registerScreen = (name: string, factory: ScreenFactory): void => {
  screens.set(name, factory);
};

export const currentScreen = (): string => currentName;

export const mountShell = (container: HTMLElement): void => {
  root = container;
  liveRegion = document.createElement('div');
  liveRegion.className = 'visually-hidden';
  liveRegion.setAttribute('aria-live', 'polite');
  container.append(liveRegion);
  applyTheme();
  applyMotion();
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', applyTheme);
};

export const announce = (text: string): void => {
  if (!liveRegion) return;
  liveRegion.textContent = '';
  requestAnimationFrame(() => {
    if (liveRegion) liveRegion.textContent = text;
  });
};

export const applyTheme = (): void => {
  const { theme } = load().settings;
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset['theme'] = dark ? 'dark' : 'light';
};

export const applyMotion = (): void => {
  const { reduceMotion } = load().settings;
  if (reduceMotion) document.documentElement.dataset['motion'] = 'reduce';
  else delete document.documentElement.dataset['motion'];
};

export const navigate = (name: string, params: ScreenParams = {}): void => {
  const factory = screens.get(name);
  if (!root || !factory) return;
  const q = new URLSearchParams(params).toString();
  history.replaceState(null, '', `#${name}${q ? '?' + q : ''}`);
  const next = factory(params);
  next.classList.add('screen');
  const prev = currentEl;
  currentEl = next;
  currentName = name;
  root.append(next);
  if (prev) {
    const out = prev.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: dur(160, true),
      easing: EASE.fade,
      fill: 'forwards',
    });
    out.onfinish = () => prev.remove();
    next.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: dur(160, true),
      easing: EASE.fade,
      fill: 'backwards',
    });
  }
  const heading = next.querySelector('h1, h2');
  if (heading instanceof HTMLElement) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
};

/* Small element helper used by every screen — keeps construction terse
   without a framework. */
export const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
