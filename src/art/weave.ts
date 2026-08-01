/* የጥልፍ ጥበብ — the woven tibeb borders of the habesha kemis: stacked bands
   of diamonds, chevrons and stepped crosses. */

import type { Rng } from '../core/rng';
import { PAL, paper, tint, type Ctx } from './canvas';
import { diamond } from './harag';

type BandPainter = (ctx: Ctx, s: number, y: number, h: number, rng: Rng) => void;

const rule = (ctx: Ctx, s: number, y: number, color: string, w: number): void => {
  ctx.fillStyle = color;
  ctx.fillRect(0, y - w / 2, s, w);
};

let bandCycle = 0;
const CYCLE = [PAL.madder, PAL.indigo, PAL.verdigris, PAL.madder] as const;
const nextColor = (): string => CYCLE[bandCycle++ % CYCLE.length] as string;

const diamondBand: BandPainter = (ctx, s, y, h) => {
  const n = 9;
  const step = s / n;
  const cy = y + h / 2;
  const major = nextColor();
  const minor = major === PAL.madder ? PAL.indigo : PAL.madder;
  for (let i = 0; i < n; i++) {
    const cx = step * (i + 0.5);
    ctx.fillStyle = major;
    diamond(ctx, cx, cy, h * 0.4);
    ctx.fillStyle = tint(major, 0.55);
    diamond(ctx, cx, cy, h * 0.26);
    ctx.fillStyle = i % 2 === 0 ? PAL.gold : minor;
    diamond(ctx, cx, cy, h * 0.12);
  }
};

const chevronBand: BandPainter = (ctx, s, y, h) => {
  const n = 18;
  const step = s / n;
  const color = nextColor();
  ctx.strokeStyle = color;
  ctx.lineWidth = h * 0.22;
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'butt';
  for (const off of [-0.18, 0.18]) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const x = i * step;
      const py = y + h * (0.5 + off) + (i % 2 === 0 ? -h * 0.2 : h * 0.2);
      if (i === 0) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    }
    ctx.stroke();
    ctx.strokeStyle = PAL.gold;
    ctx.lineWidth = h * 0.1;
  }
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
};

const steppedCrossBand: BandPainter = (ctx, s, y, h) => {
  const n = 7;
  const step = s / n;
  const u = h / 7;
  const color = nextColor();
  for (let i = 0; i < n; i++) {
    const cx = step * (i + 0.5);
    const cy = y + h / 2;
    ctx.fillStyle = i % 2 === 0 ? color : PAL.ink;
    /* stepped cross drawn as stacked rows of squares: 1,3,5,3,1 */
    const rows: ReadonlyArray<[number, number]> = [
      [0, 1],
      [1, 3],
      [2, 5],
      [3, 3],
      [4, 1],
    ];
    for (const [r, cols] of rows) {
      for (let cIdx = 0; cIdx < cols; cIdx++) {
        const x = cx + (cIdx - (cols - 1) / 2) * u - u / 2;
        const py = cy + (r - 2) * u - u / 2;
        ctx.fillRect(x, py, u + 0.5, u + 0.5);
      }
    }
    ctx.fillStyle = PAL.gold;
    ctx.fillRect(cx - u / 2, cy - u / 2, u + 0.5, u + 0.5);
  }
};

const combBand: BandPainter = (ctx, s, y, h) => {
  const n = 44;
  const step = s / n;
  ctx.fillStyle = PAL.ink;
  for (let i = 0; i < n; i++) {
    if (i % 2 === 0) ctx.fillRect(i * step, y + h * 0.15, step * 0.55, h * 0.7);
  }
};

/* The full artwork: a stacked reading of a kemis border, wide pattern bands
   separated by fine rules on unbleached cotton. */
export const drawTilf = (ctx: Ctx, s: number, rng: Rng): void => {
  bandCycle = 0;
  paper(ctx, s, rng, tint(PAL.parchment, 0.4));
  /* faint warp threads */
  ctx.strokeStyle = 'rgba(90,70,45,0.07)';
  ctx.lineWidth = 1.5;
  for (let x = 0; x < s; x += 5) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, s);
    ctx.stroke();
  }

  const painters: readonly BandPainter[] = [diamondBand, chevronBand, steppedCrossBand];
  const layout: ReadonlyArray<[number, 'wide' | 'comb']> = [
    [0.1, 'wide'],
    [0.265, 'comb'],
    [0.33, 'wide'],
    [0.51, 'comb'],
    [0.575, 'wide'],
    [0.755, 'comb'],
    [0.82, 'wide'],
  ];
  let wideIdx = 0;
  for (const [yF, kind] of layout) {
    const y = s * yF;
    if (kind === 'comb') {
      combBand(ctx, s, y, s * 0.035, rng);
    } else {
      const h = s * 0.13;
      rule(ctx, s, y - s * 0.012, PAL.ink, s * 0.006);
      const painter = painters[wideIdx % painters.length] as BandPainter;
      painter(ctx, s, y, h, rng);
      rule(ctx, s, y + h + s * 0.012, PAL.ink, s * 0.006);
      wideIdx++;
    }
  }
};
