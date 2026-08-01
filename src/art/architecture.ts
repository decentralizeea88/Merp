/* Architectural silhouettes: the Aksum stelae and the cruciform plan of
   Bete Giyorgis seen from directly above. */

import type { Rng } from '../core/rng';
import { PAL, mix, paper, shade, tint, type Ctx } from './canvas';
import { crossPath } from './cross';

/* የአክሱም ሐውልት — three stelae against banded dusk, carved with the beam
   rows and false door of the real monuments. */
export const drawAxumStele = (ctx: Ctx, s: number, rng: Rng): void => {
  paper(ctx, s, rng);
  const bands = [tint(PAL.indigo, 0.75), tint(PAL.indigo, 0.6), tint(PAL.madder, 0.72), tint(PAL.gold, 0.6)];
  const horizon = s * 0.82;
  bands.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(0, (horizon * i) / bands.length, s, horizon / bands.length + 1);
  });
  ctx.fillStyle = PAL.gold;
  ctx.beginPath();
  ctx.arc(s * 0.78, s * 0.2, s * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = s * 0.004;
  ctx.stroke();
  ctx.fillStyle = shade(PAL.verdigris, 0.35);
  ctx.fillRect(0, horizon, s, s - horizon);
  ctx.strokeStyle = shade(PAL.verdigris, 0.55);
  ctx.lineWidth = s * 0.003;
  for (let i = 0; i < 14; i++) {
    const y = horizon + ((s - horizon) * (i + 0.5)) / 14;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(s, y);
    ctx.stroke();
  }

  const stele = (cx: number, w: number, top: number): void => {
    const baseY = horizon + s * 0.02;
    const stone = PAL.inkSoft;
    ctx.fillStyle = stone;
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = s * 0.005;
    ctx.beginPath();
    ctx.moveTo(cx - w, baseY);
    ctx.lineTo(cx - w, top + w * 0.9);
    ctx.quadraticCurveTo(cx - w, top, cx - w * 0.45, top);
    ctx.lineTo(cx + w * 0.45, top);
    ctx.quadraticCurveTo(cx + w, top, cx + w, top + w * 0.9);
    ctx.lineTo(cx + w, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    /* storey divisions with beam-end "monkey heads" */
    const floors = Math.floor((baseY - top) / (s * 0.085));
    for (let f = 1; f < floors; f++) {
      const y = baseY - f * s * 0.085;
      ctx.strokeStyle = mix(PAL.ink, stone, 0.35);
      ctx.lineWidth = s * 0.004;
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.86, y);
      ctx.lineTo(cx + w * 0.86, y);
      ctx.stroke();
      ctx.fillStyle = mix(PAL.ink, stone, 0.2);
      const heads = 3;
      for (let h = 0; h < heads; h++) {
        const hx = cx - w * 0.6 + (w * 1.2 * h) / (heads - 1);
        ctx.beginPath();
        ctx.arc(hx, y - s * 0.012, s * 0.008, 0, Math.PI * 2);
        ctx.fill();
      }
      /* window pair per storey */
      ctx.fillStyle = shade(stone, 0.4);
      ctx.fillRect(cx - w * 0.42, y - s * 0.055, w * 0.3, s * 0.03);
      ctx.fillRect(cx + w * 0.12, y - s * 0.055, w * 0.3, s * 0.03);
    }
    /* false door at the base */
    ctx.fillStyle = shade(stone, 0.45);
    ctx.fillRect(cx - w * 0.4, baseY - s * 0.075, w * 0.8, s * 0.06);
    ctx.strokeStyle = PAL.ink;
    ctx.strokeRect(cx - w * 0.4, baseY - s * 0.075, w * 0.8, s * 0.06);
  };

  stele(s * 0.22, s * 0.058, s * 0.34);
  stele(s * 0.52, s * 0.078, s * 0.075);
  stele(s * 0.81, s * 0.048, s * 0.5);
};

/* ቤተ ጊዮርጊስ — the church from directly above: rock pit, cruciform roof
   with its nested relief crosses. */
export const drawBeteGiyorgis = (ctx: Ctx, s: number, rng: Rng): void => {
  const rock = mix(tint(PAL.gold, 0.42), tint(PAL.madder, 0.5), 0.4);
  paper(ctx, s, rng, rock);
  /* surrounding scarred rock */
  ctx.strokeStyle = mix(PAL.inkSoft, rock, 0.6);
  ctx.lineWidth = s * 0.004;
  for (let i = 0; i < 46; i++) {
    const x = rng() * s;
    const y = rng() * s;
    const len = s * (0.03 + rng() * 0.08);
    const a = rng() * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }

  const c = s / 2;
  const pit = s * 0.37;
  ctx.fillStyle = shade(PAL.inkSoft, 0.5);
  ctx.fillRect(c - pit, c - pit, pit * 2, pit * 2);
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = s * 0.006;
  ctx.strokeRect(c - pit, c - pit, pit * 2, pit * 2);
  /* pit floor shadow gradient */
  const g = ctx.createLinearGradient(c - pit, c - pit, c + pit, c + pit);
  g.addColorStop(0, 'rgba(0,0,0,0.3)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(c - pit, c - pit, pit * 2, pit * 2);

  /* the cruciform roof: nested relief crosses in cut stone */
  const layers: ReadonlyArray<[number, number, string]> = [
    [0.94, 0.33, mix(rock, PAL.ink, 0.12)],
    [0.76, 0.26, rock],
    [0.58, 0.19, mix(rock, PAL.parchment, 0.25)],
    [0.4, 0.12, PAL.gold],
  ];
  for (const [armF, wF, color] of layers) {
    crossPath(ctx, c, c, pit * armF, pit * wF);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = s * 0.005;
    ctx.stroke();
  }

  /* the entrance trench: a sunk channel joining the pit's lower-left */
  const tw = pit * 0.2;
  const ex0: [number, number] = [s * 0.05, s * 0.95];
  const ex1: [number, number] = [c - pit * 0.5, c + pit - s * 0.002];
  const dxs = ex1[0] - ex0[0];
  const dys = ex1[1] - ex0[1];
  const nlen = Math.hypot(dxs, dys);
  const nx = (-dys / nlen) * tw * 0.5;
  const ny = (dxs / nlen) * tw * 0.5;
  ctx.fillStyle = shade(PAL.inkSoft, 0.5);
  ctx.beginPath();
  ctx.moveTo(ex0[0] + nx, ex0[1] + ny);
  ctx.lineTo(ex1[0] + nx, ex1[1] + ny);
  ctx.lineTo(ex1[0] - nx, ex1[1] - ny);
  ctx.lineTo(ex0[0] - nx, ex0[1] - ny);
  ctx.closePath();
  ctx.fill();
  /* only the long walls get an edge line, so it stays a channel */
  ctx.strokeStyle = mix(PAL.ink, rock, 0.3);
  ctx.lineWidth = s * 0.004;
  ctx.beginPath();
  ctx.moveTo(ex0[0] + nx, ex0[1] + ny);
  ctx.lineTo(ex1[0] + nx, ex1[1] + ny);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ex0[0] - nx, ex0[1] - ny);
  ctx.lineTo(ex1[0] - nx, ex1[1] - ny);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = s * 0.0025;
  for (let i = 2; i < 8; i++) {
    const t = i / 10;
    const x0 = ex0[0] + dxs * t;
    const y0 = ex0[1] + dys * t;
    ctx.beginPath();
    ctx.moveTo(x0 + nx * 0.8, y0 + ny * 0.8);
    ctx.lineTo(x0 - nx * 0.8, y0 - ny * 0.8);
    ctx.stroke();
  }

  /* corner marks hold the composition square */
  ctx.fillStyle = PAL.indigo;
  for (const [gx, gy] of [
    [s * 0.07, s * 0.07],
    [s * 0.93, s * 0.07],
    [s * 0.07, s * 0.93],
    [s * 0.93, s * 0.93],
  ] as const) {
    crossPath(ctx, gx, gy, s * 0.026, s * 0.008);
    ctx.fill();
  }
};
