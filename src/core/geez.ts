/* Ge'ez numerals. The system is additive-multiplicative with no zero:
   137 = ፻ (100) + ፴ (30) + ፯ (7) → ፻፴፯. Powers of 100 multiply what
   precedes them: 1000 = ፲፻ (10 × 100). */

const ONES = ['', '፩', '፪', '፫', '፬', '፭', '፮', '፯', '፰', '፱'] as const;
const TENS = ['', '፲', '፳', '፴', '፵', '፶', '፷', '፸', '፹', '፺'] as const;
const HUNDRED = '፻';
const TEN_THOUSAND = '፼';

const belowHundred = (n: number): string =>
  (TENS[Math.floor(n / 10)] ?? '') + (ONES[n % 10] ?? '');

/* Renders 1..9999 as pair-groups against ፻, per the traditional system. */
const belowTenThousand = (n: number): string => {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds === 0) return belowHundred(rest);
  const head = hundreds === 1 ? '' : belowHundred(hundreds);
  return head + HUNDRED + belowHundred(rest);
};

export const toGeez = (n: number): string => {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`toGeez: expected a positive integer, got ${n}`);
  }
  const myriads = Math.floor(n / 10000);
  const rest = n % 10000;
  if (myriads === 0) return belowTenThousand(rest);
  const head = myriads === 1 ? '' : toGeez(myriads);
  return head + TEN_THOUSAND + (rest === 0 ? '' : belowTenThousand(rest));
};

const DIGIT_VALUES = new Map<string, number>([
  ...ONES.slice(1).map((c, i): [string, number] => [c, i + 1]),
  ...TENS.slice(1).map((c, i): [string, number] => [c, (i + 1) * 10]),
]);

export const fromGeez = (s: string): number => {
  if (s.length === 0) throw new Error('fromGeez: empty string');
  let total = 0;
  let group = 0;
  for (const ch of s) {
    if (ch === HUNDRED) {
      total += (group === 0 ? 1 : group) * 100;
      group = 0;
    } else if (ch === TEN_THOUSAND) {
      total = (total + (group === 0 && total === 0 ? 1 : group)) * 10000;
      group = 0;
    } else {
      const v = DIGIT_VALUES.get(ch);
      if (v === undefined) throw new Error(`fromGeez: not a Ge'ez numeral: ${ch}`);
      group += v;
    }
  }
  return total + group;
};
