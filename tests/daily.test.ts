import { describe, expect, it } from 'vitest';
import { dailyArtwork, dailySeed, formatEthiopic } from '../src/game/daily';
import { MONTHS, WEEKDAYS } from '../src/i18n/am';
import { ARTWORKS } from '../src/art/registry';

describe('calendar vocabulary', () => {
  it('has thirteen months starting at መስከረም and seven weekdays from እሑድ', () => {
    expect(MONTHS.length).toBe(13);
    expect(MONTHS[0]).toBe('መስከረም');
    expect(MONTHS[12]).toBe('ጳጉሜ');
    expect(WEEKDAYS.length).toBe(7);
    expect(WEEKDAYS[0]).toBe('እሑድ');
  });
});

describe('formatEthiopic', () => {
  it('renders month name and Ge’ez numerals', () => {
    expect(formatEthiopic({ year: 2017, month: 1, day: 1 })).toBe('መስከረም ፩፣ ፳፻፲፯');
    expect(formatEthiopic({ year: 2015, month: 13, day: 6 })).toBe('ጳጉሜ ፮፣ ፳፻፲፭');
  });

  it('prepends the weekday when given', () => {
    expect(formatEthiopic({ year: 2017, month: 4, day: 29 }, 2)).toBe(
      'ማክሰኞ፣ ታኅሣሥ ፳፱፣ ፳፻፲፯',
    );
  });
});

describe('daily seeding', () => {
  it('is stable for a date key and differs across dates', () => {
    expect(dailySeed('2017-1-1')).toBe(dailySeed('2017-1-1'));
    expect(dailySeed('2017-1-1')).not.toBe(dailySeed('2017-1-2'));
  });

  it('picks a registered artwork deterministically', () => {
    const a = dailyArtwork('2017-1-1');
    expect(ARTWORKS).toContain(a);
    expect(dailyArtwork('2017-1-1')).toBe(a);
  });

  it('spreads artworks across a month rather than repeating one', () => {
    const ids = new Set(
      Array.from({ length: 30 }, (_, i) => dailyArtwork(`2017-1-${i + 1}`).id),
    );
    expect(ids.size).toBeGreaterThan(4);
  });
});
