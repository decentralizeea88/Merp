/* Ethiopian calendar conversion via Julian Day Number. Thirteen months —
   twelve of thirty days and ጳጉሜ of five, or six when year % 4 === 3. */

export type EthiopicDate = { year: number; month: number; day: number };

/* JDN of the day before መስከረም ፩, year ፩ (Amete Mihret epoch) */
const EPOCH = 1723856;

export const gregorianToJdn = (y: number, m: number, d: number): number => {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  );
};

export const jdnToEthiopic = (jdn: number): EthiopicDate => {
  const r = (((jdn - EPOCH) % 1461) + 1461) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year =
    4 * Math.floor((jdn - EPOCH) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  return { year, month, day };
};

export const ethiopicToJdn = ({ year, month, day }: EthiopicDate): number =>
  EPOCH + 365 * year + Math.floor(year / 4) + 30 * (month - 1) + (day - 1);

export const isEthiopicLeap = (year: number): boolean => year % 4 === 3;

export const daysInEthiopicMonth = (year: number, month: number): number =>
  month < 13 ? 30 : isEthiopicLeap(year) ? 6 : 5;

export const toEthiopic = (date: Date): EthiopicDate =>
  jdnToEthiopic(gregorianToJdn(date.getFullYear(), date.getMonth() + 1, date.getDate()));

/* 0 = Sunday, matching the weekday list in i18n */
export const ethiopicWeekday = (date: Date): number => date.getDay();

export const ethiopicDateKey = ({ year, month, day }: EthiopicDate): string =>
  `${year}-${month}-${day}`;
