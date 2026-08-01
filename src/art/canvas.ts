/* Offscreen canvas production. Artwork is rendered once per puzzle at a
   fixed square size and handed to CSS as a blob URL — canvas never touches
   the interactive layer. */

import type { Rng } from '../core/rng';

export const ART_SIZE = 1200;

export type Ctx = CanvasRenderingContext2D;
export type Generator = (ctx: Ctx, s: number, rng: Rng) => void;

/* The manuscript palette. Artwork keeps one fixed palette in both themes —
   a painting does not change with the room's light. */
export const PAL = {
  parchment: '#EFE6D3',
  parchmentDeep: '#E2D4B7',
  ink: '#231A12',
  inkSoft: '#5C4B39',
  madder: '#A6302A',
  indigo: '#1F3A5F',
  gold: '#C89440',
  verdigris: '#4B6B54',
} as const;

const hex = (c: string): [number, number, number] => [
  parseInt(c.slice(1, 3), 16),
  parseInt(c.slice(3, 5), 16),
  parseInt(c.slice(5, 7), 16),
];

export const mix = (a: string, b: string, t: number): string => {
  const [ar, ag, ab] = hex(a);
  const [br, bg, bb] = hex(b);
  const ch = (x: number, y: number): string =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, '0');
  return `#${ch(ar, br)}${ch(ag, bg)}${ch(ab, bb)}`;
};

export const tint = (c: string, t: number): string => mix(c, PAL.parchment, t);
export const shade = (c: string, t: number): string => mix(c, PAL.ink, t);

/* Parchment ground with fibre speckle and a breath of vignette. Every
   artwork starts here so the set reads as one manuscript. */
export const paper = (ctx: Ctx, s: number, rng: Rng, base: string = PAL.parchment): void => {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);
  const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.3, s / 2, s / 2, s * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(60,40,20,0.08)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  ctx.save();
  for (let i = 0; i < s * 0.7; i++) {
    const x = rng() * s;
    const y = rng() * s;
    const dark = rng() < 0.6;
    ctx.fillStyle = dark ? 'rgba(90,70,45,0.10)' : 'rgba(255,250,235,0.35)';
    const r = 0.6 + rng() * 1.6;
    ctx.fillRect(x, y, r, r);
  }
  ctx.restore();
};

/* Polyline with hand-drawn jitter — a plotted line, not a CAD line. */
export const jitterPoly = (
  ctx: Ctx,
  pts: ReadonlyArray<[number, number]>,
  rng: Rng,
  amount = 1.5,
): void => {
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    const jx = x + (rng() - 0.5) * amount;
    const jy = y + (rng() - 0.5) * amount;
    if (i === 0) ctx.moveTo(jx, jy);
    else ctx.lineTo(jx, jy);
  });
};

export const makeCanvas = (s: number): { canvas: HTMLCanvasElement; ctx: Ctx } => {
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  return { canvas, ctx };
};

const urlCache = new Map<string, string>();

export const canvasToBlobUrl = async (
  canvas: HTMLCanvasElement,
  cacheKey: string,
): Promise<string> => {
  const cached = urlCache.get(cacheKey);
  if (cached) return cached;
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
  const url = URL.createObjectURL(blob);
  urlCache.set(cacheKey, url);
  return url;
};
