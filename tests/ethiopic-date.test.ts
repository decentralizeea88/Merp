import { describe, expect, it } from 'vitest';
import {
  daysInEthiopicMonth,
  ethiopicToJdn,
  gregorianToJdn,
  isEthiopicLeap,
  jdnToEthiopic,
  toEthiopic,
} from '../src/core/ethiopic-date';

describe('gregorianToJdn', () => {
  it('matches known JDN values', () => {
    expect(gregorianToJdn(2000, 1, 1)).toBe(2451545);
    expect(gregorianToJdn(1858, 11, 17)).toBe(2400001);
  });
});

describe('Ethiopian new year', () => {
  it('lands on Sep 11, or Sep 12 after an Ethiopian leap year', () => {
    /* EC 2000 began Sep 12 2007 (1999 was leap: 1999 % 4 === 3) */
    expect(jdnToEthiopic(gregorianToJdn(2007, 9, 12))).toEqual({ year: 2000, month: 1, day: 1 });
    expect(jdnToEthiopic(gregorianToJdn(2007, 9, 11))).toEqual({ year: 1999, month: 13, day: 6 });
    /* EC 2017 began Sep 11 2024 */
    expect(jdnToEthiopic(gregorianToJdn(2024, 9, 11))).toEqual({ year: 2017, month: 1, day: 1 });
    /* EC 2016 began Sep 12 2023, following leap year 2015 */
    expect(jdnToEthiopic(gregorianToJdn(2023, 9, 12))).toEqual({ year: 2016, month: 1, day: 1 });
    expect(jdnToEthiopic(gregorianToJdn(2023, 9, 11))).toEqual({ year: 2015, month: 13, day: 6 });
  });

  it('handles ገና — Ethiopian Christmas, ታኅሣሥ 29', () => {
    expect(jdnToEthiopic(gregorianToJdn(2025, 1, 7))).toEqual({ year: 2017, month: 4, day: 29 });
  });
});

describe('round trip', () => {
  it('ethiopicToJdn inverts jdnToEthiopic across several years', () => {
    for (let jdn = 2451545; jdn < 2451545 + 1500; jdn += 13) {
      const e = jdnToEthiopic(jdn);
      expect(ethiopicToJdn(e), JSON.stringify(e)).toBe(jdn);
    }
  });
});

describe('leap years and ጳጉሜ', () => {
  it('year % 4 === 3 is leap', () => {
    expect(isEthiopicLeap(2015)).toBe(true);
    expect(isEthiopicLeap(2016)).toBe(false);
    expect(isEthiopicLeap(1999)).toBe(true);
  });

  it('month lengths', () => {
    expect(daysInEthiopicMonth(2016, 1)).toBe(30);
    expect(daysInEthiopicMonth(2016, 12)).toBe(30);
    expect(daysInEthiopicMonth(2016, 13)).toBe(5);
    expect(daysInEthiopicMonth(2015, 13)).toBe(6);
  });
});

describe('toEthiopic', () => {
  it('converts a local Date', () => {
    const e = toEthiopic(new Date(2024, 8, 11));
    expect(e).toEqual({ year: 2017, month: 1, day: 1 });
  });
});
