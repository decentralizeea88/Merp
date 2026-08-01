/* ሐረግ — the interlaced band and vine vocabulary of illuminated Ge'ez
   manuscripts. The braid draws both strands, then re-draws the "over"
   strand around alternate crossings so the weave genuinely alternates. */

import type { Rng } from '../core/rng';
import { PAL, paper, type Ctx } from './canvas';

export type BraidOpts = {
  bandW: number;
  amp: number;
  period: number;
  colors: readonly [string, string];
  edge?: number;
  dots?: string;
};

type Pt = [number, number];

const strokePoly = (ctx: Ctx, pts: readonly Pt[], color: string, width: number): void => {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
};

const band = (ctx: Ctx, pts: readonly Pt[], color: string, w: number, edge: number): void => {
  strokePoly(ctx, pts, PAL.ink, w + edge * 2);
  strokePoly(ctx, pts, color, w);
};

export const braidLine = (
  ctx: Ctx,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  o: BraidOpts,
): void => {
  const edge = o.edge ?? 3;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const n = Math.max(2, Math.round(len / (o.period / 2)));
  const half = len / n;

  const pt = (t: number, sign: 1 | -1): Pt => {
    const off = sign * o.amp * Math.sin((Math.PI * t) / half);
    return [x0 + ux * t + nx * off, y0 + uy * t + ny * off];
  };
  const seg = (t0: number, t1: number, sign: 1 | -1): Pt[] => {
    const pts: Pt[] = [];
    const steps = Math.max(4, Math.ceil((t1 - t0) / 5));
    for (let i = 0; i <= steps; i++) pts.push(pt(t0 + ((t1 - t0) * i) / steps, sign));
    return pts;
  };

  const [cA, cB] = o.colors;
  band(ctx, seg(0, len, 1), cA, o.bandW, edge);
  band(ctx, seg(0, len, -1), cB, o.bandW, edge);
  for (let k = 0; k <= n; k += 2) {
    const t0 = Math.max(0, k * half - half * 0.42);
    const t1 = Math.min(len, k * half + half * 0.42);
    if (t1 > t0) band(ctx, seg(t0, t1, 1), cA, o.bandW, edge);
  }
  if (o.dots) {
    ctx.fillStyle = o.dots;
    for (let k = 0; k < n; k++) {
      const [cx, cy] = [x0 + ux * (k + 0.5) * half, y0 + uy * (k + 0.5) * half];
      diamond(ctx, cx, cy, o.bandW * 0.42);
    }
  }
};

export const braidRing = (ctx: Ctx, cx: number, cy: number, R: number, o: BraidOpts): void => {
  const edge = o.edge ?? 3;
  const m = Math.max(4, 2 * Math.round((Math.PI * R) / o.period));
  const pt = (th: number, sign: 1 | -1): Pt => {
    const r = R + sign * o.amp * Math.sin(m * th);
    return [cx + r * Math.cos(th), cy + r * Math.sin(th)];
  };
  const seg = (a0: number, a1: number, sign: 1 | -1): Pt[] => {
    const pts: Pt[] = [];
    const steps = Math.max(6, Math.ceil(((a1 - a0) * R) / 5));
    for (let i = 0; i <= steps; i++) pts.push(pt(a0 + ((a1 - a0) * i) / steps, sign));
    return pts;
  };
  const [cA, cB] = o.colors;
  const step = Math.PI / m;
  band(ctx, seg(0, Math.PI * 2, 1), cA, o.bandW, edge);
  band(ctx, seg(0, Math.PI * 2, -1), cB, o.bandW, edge);
  for (let k = 0; k < 2 * m; k += 2) {
    band(ctx, seg((k - 0.42) * step, (k + 0.42) * step, 1), cA, o.bandW, edge);
  }
  if (o.dots) {
    ctx.fillStyle = o.dots;
    for (let k = 0; k < 2 * m; k++) {
      const th = (k + 0.5) * step;
      diamond(ctx, cx + R * Math.cos(th), cy + R * Math.sin(th), o.bandW * 0.4);
    }
  }
};

export const diamond = (ctx: Ctx, cx: number, cy: number, r: number): void => {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fill();
};

export const rosette = (ctx: Ctx, cx: number, cy: number, r: number, color: string): void => {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = r * 0.52;
  ctx.stroke();
  ctx.lineWidth = r * 0.36;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.fillStyle = PAL.gold;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PAL.ink;
  for (let i = 0; i < 8; i++) {
    const th = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(th) * r * 1.38, cy + Math.sin(th) * r * 1.38, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }
};

const leaf = (ctx: Ctx, x: number, y: number, angle: number, size: number, px = 1): void => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(size * 0.5, -size * 0.42, size, 0);
  ctx.quadraticCurveTo(size * 0.5, size * 0.42, 0, 0);
  ctx.closePath();
  ctx.fillStyle = PAL.verdigris;
  ctx.fill();
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 3 * px;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(size * 0.12, 0);
  ctx.lineTo(size * 0.85, 0);
  ctx.lineWidth = 1.8 * px;
  ctx.stroke();
  ctx.restore();
};

export const birdHead = (ctx: Ctx, x: number, y: number, angle: number, size: number): void => {
  const lw = size * 0.16;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  /* crest feathers first, behind the head */
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = lw * 0.8;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-size * 0.4, -size * (0.4 + i * 0.2));
    ctx.quadraticCurveTo(-size * 1.2, -size * (0.8 + i * 0.3), -size * (1.6 + i * 0.2), -size * (0.4 + i * 0.28));
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fillStyle = PAL.madder;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(size * 0.8, -size * 0.34);
  ctx.lineTo(size * 2, 0);
  ctx.lineTo(size * 0.8, size * 0.34);
  ctx.closePath();
  ctx.fillStyle = PAL.gold;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(size * 0.12, -size * 0.18, size * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = PAL.parchment;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(size * 0.12, -size * 0.18, size * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = PAL.ink;
  ctx.fill();
  ctx.restore();
};

const cubic = (t: number, p0: Pt, p1: Pt, p2: Pt, p3: Pt): Pt => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};

/* A vine scroll composed in a unit box (0,0 → 1,1): an S-stem, a spiral
   curl at the tip, leaves on the outer curve, a bird head at the end.
   Placed via translate/scale/mirror so the four quadrants stay symmetric. */
export const vineScroll = (
  ctx: Ctx,
  x: number,
  y: number,
  size: number,
  mirrorX: boolean,
  mirrorY: boolean,
  rng: Rng,
): void => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(mirrorX ? -size : size, mirrorY ? -size : size);

  const stem: [Pt, Pt, Pt, Pt] = [
    [0, 0.06],
    [0.42, -0.12],
    [0.28, 0.62],
    [0.72, 0.62],
  ];
  const pts: Pt[] = [];
  for (let i = 0; i <= 40; i++) pts.push(cubic(i / 40, ...stem));
  /* tip spiral */
  const tip = pts[pts.length - 1] as Pt;
  const prev = pts[pts.length - 2] as Pt;
  let a0 = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]);
  const sc: Pt = [tip[0] + Math.cos(a0 - Math.PI / 2) * 0.13, tip[1] + Math.sin(a0 - Math.PI / 2) * 0.13];
  const th0 = Math.atan2(tip[1] - sc[1], tip[0] - sc[0]);
  for (let i = 1; i <= 30; i++) {
    const th = th0 + (i / 30) * Math.PI * 1.72;
    const r = 0.13 * (1 - (0.55 * i) / 30);
    pts.push([sc[0] + Math.cos(th) * r, sc[1] + Math.sin(th) * r]);
  }

  const px = 1 / size;
  strokePoly(ctx, pts, PAL.ink, 16 * px);
  strokePoly(ctx, pts, PAL.verdigris, 9 * px);

  const leafAt = (t: number, side: 1 | -1, len: number): void => {
    const i = Math.round(t * 40);
    const p = pts[Math.min(i, 40)] as Pt;
    const q = pts[Math.max(0, i - 1)] as Pt;
    const ta = Math.atan2(p[1] - q[1], p[0] - q[0]);
    leaf(ctx, p[0], p[1], ta + (side * Math.PI) / 2.4, len + rng() * 0.03, px);
  };
  leafAt(0.16, -1, 0.21);
  leafAt(0.36, 1, 0.24);
  leafAt(0.56, -1, 0.22);
  leafAt(0.76, 1, 0.19);
  /* a bud in the curl's eye */
  ctx.fillStyle = PAL.madder;
  ctx.beginPath();
  ctx.arc(sc[0], sc[1], 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 3 * px;
  ctx.stroke();
  const end = pts[pts.length - 1] as Pt;
  const ep = pts[pts.length - 2] as Pt;
  const ea = Math.atan2(end[1] - ep[1], end[0] - ep[0]);
  birdHead(ctx, end[0], end[1], ea, 0.075);
  ctx.restore();
};

/* The ሐረግ artwork: braided frame, corner rosettes, a braided central
   medallion around a gold cross, and four vines flowing to the corners. */
export const drawHarag = (ctx: Ctx, s: number, rng: Rng): void => {
  paper(ctx, s, rng);
  const m = s * 0.085;
  const braid: BraidOpts = {
    bandW: s * 0.02,
    amp: s * 0.021,
    period: s * 0.1,
    colors: [PAL.madder, PAL.gold],
    dots: PAL.indigo,
  };
  braidLine(ctx, m, m, s - m, m, braid);
  braidLine(ctx, s - m, s - m, m, s - m, braid);
  braidLine(ctx, m, s - m, m, m, braid);
  braidLine(ctx, s - m, m, s - m, s - m, braid);
  for (const [cx, cy] of [
    [m, m],
    [s - m, m],
    [m, s - m],
    [s - m, s - m],
  ] as const) {
    rosette(ctx, cx, cy, s * 0.036, PAL.indigo);
  }

  const c = s / 2;
  const R = s * 0.17;
  braidRing(ctx, c, c, R, {
    bandW: s * 0.018,
    amp: s * 0.018,
    period: s * 0.085,
    colors: [PAL.indigo, PAL.madder],
    dots: PAL.gold,
  });

  /* flared Greek cross inside the medallion: four arm quads on a disc */
  const arm = R * 0.66;
  const wIn = arm * 0.2;
  const wOut = arm * 0.44;
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = s * 0.005;
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 - Math.PI / 2;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const nx = -uy;
    const ny = ux;
    ctx.beginPath();
    ctx.moveTo(c + ux * wIn * 0.5 + nx * wIn, c + uy * wIn * 0.5 + ny * wIn);
    ctx.lineTo(c + ux * arm + nx * wOut, c + uy * arm + ny * wOut);
    ctx.lineTo(c + ux * arm - nx * wOut, c + uy * arm - ny * wOut);
    ctx.lineTo(c + ux * wIn * 0.5 - nx * wIn, c + uy * wIn * 0.5 - ny * wIn);
    ctx.closePath();
    ctx.fillStyle = PAL.gold;
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(c, c, wIn * 1.35, 0, Math.PI * 2);
  ctx.fillStyle = PAL.madder;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c, c, wIn * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = PAL.gold;
  ctx.fill();
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 - Math.PI / 4;
    ctx.fillStyle = PAL.indigo;
    diamond(ctx, c + Math.cos(a) * R * 0.6, c + Math.sin(a) * R * 0.6, s * 0.015);
  }

  /* four vine scrolls filling the quadrants between medallion and frame */
  const vs = s * 0.305;
  vineScroll(ctx, c - s * 0.125, c - s * 0.145, vs, true, true, rng);
  vineScroll(ctx, c + s * 0.125, c - s * 0.145, vs, false, true, rng);
  vineScroll(ctx, c - s * 0.125, c + s * 0.145, vs, true, false, rng);
  vineScroll(ctx, c + s * 0.125, c + s * 0.145, vs, false, false, rng);

  /* manuscript filler: three-dot clusters in the remaining field */
  ctx.fillStyle = PAL.madder;
  for (const [dx, dy] of [
    [0, -s * 0.315],
    [0, s * 0.315],
    [-s * 0.315, 0],
    [s * 0.315, 0],
  ] as const) {
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(c + dx + Math.cos(a) * s * 0.012, c + dy + Math.sin(a) * s * 0.012, s * 0.005, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};
