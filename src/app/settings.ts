/* Settings: theme, sound, reduced motion, reset with confirmation. */

import { applyMotion, applyTheme, el, navigate } from './shell';
import { t } from '../i18n/am';
import * as storage from '../core/storage';

export const settingsScreen = (): HTMLElement => {
  const screen = el('main', 'settings');
  const header = el('header', 'settings__header');
  const back = el('button', 'icon-btn');
  back.type = 'button';
  back.setAttribute('aria-label', t('nav.back'));
  back.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  back.addEventListener('click', () => navigate('home'));
  header.append(back, el('h1', 'settings__title type-header', t('settings.title')));

  const list = el('div', 'settings__list');

  /* theme */
  const themeRow = el('div', 'settings__row');
  themeRow.append(el('span', 'settings__label', t('settings.theme')));
  const seg = el('div', 'board-toggle');
  seg.setAttribute('role', 'group');
  seg.setAttribute('aria-label', t('settings.theme'));
  const themes: ReadonlyArray<['light' | 'dark' | 'system', string]> = [
    ['light', t('settings.theme.light')],
    ['dark', t('settings.theme.dark')],
    ['system', t('settings.theme.system')],
  ];
  const themeOpts: HTMLButtonElement[] = [];
  for (const [value, label] of themes) {
    const opt = el('button', 'board-toggle__opt', label);
    opt.type = 'button';
    opt.setAttribute('aria-pressed', String(storage.load().settings.theme === value));
    opt.addEventListener('click', () => {
      storage.update((d) => {
        d.settings.theme = value;
      });
      for (const o of themeOpts) o.setAttribute('aria-pressed', String(o === opt));
      applyTheme();
    });
    themeOpts.push(opt);
    seg.append(opt);
  }
  themeRow.append(seg);

  /* switch rows */
  const switchRow = (label: string, get: () => boolean, set: (v: boolean) => void): HTMLElement => {
    const row = el('div', 'settings__row');
    row.append(el('span', 'settings__label', label));
    const sw = el('button', 'switch');
    sw.type = 'button';
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-checked', String(get()));
    sw.setAttribute('aria-label', label);
    sw.append(el('span', 'switch__thumb'));
    sw.addEventListener('click', () => {
      const next = !get();
      set(next);
      sw.setAttribute('aria-checked', String(next));
    });
    row.append(sw);
    return row;
  };

  const soundRow = switchRow(
    t('settings.sound'),
    () => storage.load().settings.sound,
    (v) =>
      storage.update((d) => {
        d.settings.sound = v;
      }),
  );
  const motionRow = switchRow(
    t('settings.motion'),
    () => storage.load().settings.reduceMotion,
    (v) => {
      storage.update((d) => {
        d.settings.reduceMotion = v;
      });
      applyMotion();
    },
  );

  /* reset with inline confirmation */
  const resetRow = el('div', 'settings__row settings__row--reset');
  const resetBtn = el('button', 'btn btn--danger', t('settings.reset'));
  resetBtn.type = 'button';
  const confirmBox = el('div', 'settings__confirm');
  confirmBox.hidden = true;
  confirmBox.append(el('p', 'type-caption', t('settings.resetConfirm')));
  const confirmRow = el('div', 'settings__confirm-actions');
  const yes = el('button', 'btn btn--danger', t('common.confirm'));
  yes.type = 'button';
  const no = el('button', 'btn', t('common.cancel'));
  no.type = 'button';
  confirmRow.append(no, yes);
  confirmBox.append(confirmRow);
  resetBtn.addEventListener('click', () => {
    confirmBox.hidden = false;
    resetBtn.hidden = true;
  });
  no.addEventListener('click', () => {
    confirmBox.hidden = true;
    resetBtn.hidden = false;
  });
  yes.addEventListener('click', () => {
    storage.resetAll();
    applyTheme();
    applyMotion();
    navigate('home');
  });
  resetRow.append(resetBtn, confirmBox);

  list.append(themeRow, soundRow, motionRow, resetRow);
  screen.append(header, list);
  return screen;
};
