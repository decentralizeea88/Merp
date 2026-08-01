/* Daily puzzle: seeded from the Ethiopian calendar date so every player
   gets the same board; streak accounting lives here. */

import {
  ethiopicDateKey,
  ethiopicToJdn,
  jdnToEthiopic,
  toEthiopic,
  type EthiopicDate,
} from '../core/ethiopic-date';
import { hashString } from '../core/rng';
import { toGeez } from '../core/geez';
import { tf } from '../i18n/am';
import { ARTWORKS, type Artwork } from '../art/registry';
import * as storage from '../core/storage';

export const todayEthiopic = (): EthiopicDate => toEthiopic(new Date());

export const todayKey = (): string => ethiopicDateKey(todayEthiopic());

export const yesterdayKey = (): string =>
  ethiopicDateKey(jdnToEthiopic(ethiopicToJdn(todayEthiopic()) - 1));

export const formatEthiopic = (d: EthiopicDate, weekday?: number): string =>
  weekday === undefined
    ? tf.ethiopicDate(d.month, toGeez(d.day), toGeez(d.year))
    : tf.ethiopicDateFull(weekday, d.month, toGeez(d.day), toGeez(d.year));

export const dailySeed = (key: string): string => `daily-${key}`;

export const dailyArtwork = (key: string): Artwork => {
  const art = ARTWORKS[hashString(key) % ARTWORKS.length];
  if (!art) throw new Error('no artworks registered');
  return art;
};

export const dailyDone = (): boolean => storage.load().daily.lastPlayedKey === todayKey();

/* Called when today's daily is completed; returns the new streak. */
export const recordDailyWin = (): number => {
  const key = todayKey();
  const yester = yesterdayKey();
  let streak = 0;
  storage.update((d) => {
    if (d.daily.lastPlayedKey === key) {
      streak = d.daily.streak;
      return;
    }
    streak = d.daily.lastPlayedKey === yester ? d.daily.streak + 1 : 1;
    d.daily.streak = streak;
    d.daily.lastPlayedKey = key;
  });
  return streak;
};
