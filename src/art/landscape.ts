/* Landscape abstractions: Simien ridgelines, Dallol mineral fields, the
   Abay gorge, and the coffee ceremony as flat still life. */

import type { Rng } from '../core/rng';
import { PAL, mix, paper, shade, tint, type Ctx } from './canvas';

/* ስሜን ተራሮች — stepped amba ridgelines receding into haze. */
export const drawSimien = (ctx: Ctx, s: number, rng: Rng): void => {
  paper(ctx, s, rng, tint(PAL.gold, 0.72));
  const g = ctx.createLinearGradient(0, 0, 0, s * 0.6);
  g.addColorStop(0, tint(PAL.gold, 0.55));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s * 0.6);
  ctx.fillStyle = tint(PAL.gold, 0.2);
  ctx.beginPath();
  ctx.arc(s * 0.3, s * 0.2, s * 0.075, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = s * 0.003;
  ctx.stroke();

  const ramp = [
    tint(PAL.indigo, 0.62),
    tint(PAL.indigo, 0.45),
    tint(PAL.verdigris, 0.42),
    tint(PAL.verdigris, 0.2),
    shade(PAL.verdigris, 0.18),
    shade(PAL.verdigris, 0.45),
  ];
  const layers = ramp.length;
  for (let L = 0; L < layers; L++) {
    const t = L / (layers - 1);
    const baseY = s * (0.34 + t * 0.5);
    const color = ramp[L] as string;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, s);
    let x = 0;
    let y = baseY + (rng() - 0.5) * s * 0.05;
    ctx.lineTo(0, y);
    while (x < s) {
      const plateau = s * (0.05 + rng() * 0.13);
      const drop = s * (0.05 + rng() * 0.075) * (rng() < 0.5 ? 1 : -1);
      x += plateau;
      ctx.lineTo(Math.min(x, s), y);
      /* amba cliff: a hard step, not a slope */
      const nx = Math.min(x + s * 0.014, s);
      y = Math.max(baseY - s * 0.11, Math.min(baseY + s * 0.1, y + drop));
      ctx.lineTo(nx, y);
      x = nx;
    }
    ctx.lineTo(s, s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = mix(color, PAL.parchment, 0.35);
    ctx.lineWidth = s * 0.004;
    ctx.stroke();
  }
  /* two gelada-country birds riding the thermal */
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = s * 0.004;
  for (const [bx, by, w] of [
    [s * 0.62, s * 0.18, s * 0.03],
    [s * 0.7, s * 0.24, s * 0.02],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(bx - w, by);
    ctx.quadraticCurveTo(bx - w * 0.4, by - w * 0.8, bx, by);
    ctx.quadraticCurveTo(bx + w * 0.4, by - w * 0.8, bx + w, by);
    ctx.stroke();
  }
};

const blob = (ctx: Ctx, cx: number, cy: number, r: number, rng: Rng, wobble = 0.3): void => {
  const n = 14;
  const radii: number[] = [];
  for (let i = 0; i < n; i++) radii.push(r * (1 + (rng() - 0.5) * wobble * 2));
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const th = (i / n) * Math.PI * 2;
    const rr = radii[i % n] as number;
    const x = cx + Math.cos(th) * rr;
    const y = cy + Math.sin(th) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
};

/* ዳሎል — hydrothermal terraces from the air: acid pools ringed in mineral
   crusts, sulphur golds giving way to oxide reds. */
export const drawDallol = (ctx: Ctx, s: number, rng: Rng): void => {
  paper(ctx, s, rng, tint(PAL.gold, 0.45));
  const springs: ReadonlyArray<[number, number, number]> = [
    [s * 0.38, s * 0.42, s * 0.34],
    [s * 0.74, s * 0.7, s * 0.22],
    [s * 0.72, s * 0.22, s * 0.15],
    [s * 0.22, s * 0.8, s * 0.16],
  ];
  for (const [cx, cy, r] of springs) {
    const rings = [
      tint(PAL.gold, 0.25),
      PAL.gold,
      shade(PAL.gold, 0.18),
      tint(PAL.madder, 0.3),
      mix(PAL.verdigris, '#3A8F80', 0.6),
      tint('#3A8F80', 0.35),
    ];
    rings.forEach((color, i) => {
      const rr = r * (1 - i / rings.length);
      blob(ctx, cx, cy, rr, rng, 0.22);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = shade(color, 0.3);
      ctx.lineWidth = s * 0.0035;
      ctx.stroke();
    });
  }
  /* crust cracks and salt speckle */
  ctx.strokeStyle = 'rgba(120,80,30,0.25)';
  ctx.lineWidth = s * 0.002;
  for (let i = 0; i < 40; i++) {
    const x = rng() * s;
    const y = rng() * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rng() - 0.5) * s * 0.1, y + (rng() - 0.5) * s * 0.1);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,252,240,0.5)';
  for (let i = 0; i < 130; i++) {
    ctx.beginPath();
    ctx.arc(rng() * s, rng() * s, s * 0.0025 * (0.5 + rng()), 0, Math.PI * 2);
    ctx.fill();
  }
};

/* ዓባይ — the gorge as nested contour terraces around an indigo ribbon. */
export const drawAbay = (ctx: Ctx, s: number, rng: Rng): void => {
  paper(ctx, s, rng, tint(PAL.gold, 0.55));
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(s * 0.22, -s * 0.05);
    ctx.bezierCurveTo(s * 0.14, s * 0.22, s * 0.5, s * 0.2, s * 0.66, s * 0.34);
    ctx.bezierCurveTo(s * 0.88, s * 0.52, s * 0.62, s * 0.66, s * 0.46, s * 0.62);
    ctx.bezierCurveTo(s * 0.22, s * 0.57, s * 0.16, s * 0.74, s * 0.32, s * 0.86);
    ctx.bezierCurveTo(s * 0.44, s * 0.95, s * 0.56, s * 0.98, s * 0.62, s * 1.06);
  };
  const terraces: ReadonlyArray<[number, string]> = [
    [0.47, tint(PAL.gold, 0.32)],
    [0.37, mix(tint(PAL.madder, 0.5), PAL.gold, 0.45)],
    [0.27, tint(PAL.gold, 0.16)],
    [0.18, mix(tint(PAL.madder, 0.6), PAL.gold, 0.5)],
    [0.115, tint(PAL.verdigris, 0.3)],
  ];
  for (const [w, color] of terraces) {
    path();
    ctx.strokeStyle = color;
    ctx.lineWidth = s * w;
    ctx.stroke();
  }
  path();
  ctx.strokeStyle = mix(PAL.indigo, tint(PAL.verdigris, 0.3), 0.35);
  ctx.lineWidth = s * 0.058;
  ctx.stroke();
  path();
  ctx.strokeStyle = PAL.indigo;
  ctx.lineWidth = s * 0.04;
  ctx.stroke();
  /* falls — ጢስ ዓባይ: a white step across the channel with rising mist */
  ctx.strokeStyle = 'rgba(250,247,238,0.92)';
  ctx.lineWidth = s * 0.005;
  for (let i = 0; i < 9; i++) {
    const x = s * (0.435 + i * 0.006);
    ctx.beginPath();
    ctx.moveTo(x, s * 0.318);
    ctx.lineTo(x - s * 0.008, s * (0.345 + rng() * 0.008));
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(250,247,238,0.35)';
  ctx.beginPath();
  ctx.arc(s * 0.46, s * 0.31, s * 0.028 + rng() * s * 0.006, 0, Math.PI * 2);
  ctx.fill();
  /* terrace hatching for texture */
  ctx.strokeStyle = 'rgba(90,70,45,0.12)';
  ctx.lineWidth = s * 0.002;
  for (let i = 0; i < 60; i++) {
    const x = rng() * s;
    const y = rng() * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + s * 0.02, y);
    ctx.stroke();
  }
};

/* ጀበና — wall, table, gold disc, pot, cups: the ceremony as flat planes
   in the language of icon painting. */
export const drawJebena = (ctx: Ctx, s: number, rng: Rng): void => {
  paper(ctx, s, rng, tint(PAL.verdigris, 0.68));
  /* the gold disc behind the pot — an icon's halo */
  ctx.fillStyle = tint(PAL.gold, 0.42);
  ctx.beginPath();
  ctx.arc(s * 0.54, s * 0.38, s * 0.27, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PAL.gold;
  ctx.lineWidth = s * 0.006;
  ctx.stroke();

  ctx.fillStyle = tint(PAL.madder, 0.45);
  ctx.fillRect(0, s * 0.66, s, s * 0.34);
  ctx.fillStyle = shade(tint(PAL.madder, 0.45), 0.2);
  ctx.fillRect(0, s * 0.66, s, s * 0.01);

  const cx = s * 0.54;
  const baseY = s * 0.665;
  const clay = shade(PAL.ink, 0.08);
  const bellyR = s * 0.14;
  const bellyY = baseY - bellyR - s * 0.015;

  /* one silhouette: foot, belly, waisted neck, flared mouth */
  ctx.fillStyle = clay;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.052, baseY);
  ctx.lineTo(cx - s * 0.038, baseY - s * 0.03);
  /* left belly */
  ctx.bezierCurveTo(cx - bellyR * 1.25, bellyY + bellyR * 0.6, cx - bellyR * 1.15, bellyY - bellyR * 0.85, cx - s * 0.032, bellyY - bellyR * 0.98);
  /* left neck: narrow waist then flare */
  ctx.bezierCurveTo(cx - s * 0.02, bellyY - bellyR - s * 0.05, cx - s * 0.02, bellyY - bellyR - s * 0.1, cx - s * 0.042, bellyY - bellyR - s * 0.135);
  ctx.lineTo(cx + s * 0.042, bellyY - bellyR - s * 0.135);
  ctx.bezierCurveTo(cx + s * 0.02, bellyY - bellyR - s * 0.1, cx + s * 0.02, bellyY - bellyR - s * 0.05, cx + s * 0.032, bellyY - bellyR * 0.98);
  ctx.bezierCurveTo(cx + bellyR * 1.15, bellyY - bellyR * 0.85, cx + bellyR * 1.25, bellyY + bellyR * 0.6, cx + s * 0.038, baseY - s * 0.03);
  ctx.lineTo(cx + s * 0.052, baseY);
  ctx.closePath();
  ctx.fill();
  /* ball stopper */
  ctx.beginPath();
  ctx.arc(cx, bellyY - bellyR - s * 0.162, s * 0.03, 0, Math.PI * 2);
  ctx.fill();
  /* spout: tapered polygon rising from the shoulder */
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.085, bellyY - bellyR * 0.5);
  ctx.quadraticCurveTo(cx + s * 0.2, bellyY - bellyR * 0.95, cx + s * 0.218, bellyY - bellyR - s * 0.08);
  ctx.lineTo(cx + s * 0.175, bellyY - bellyR - s * 0.062);
  ctx.quadraticCurveTo(cx + s * 0.15, bellyY - bellyR * 0.78, cx + s * 0.07, bellyY - bellyR * 0.22);
  ctx.closePath();
  ctx.fill();
  /* handle */
  ctx.strokeStyle = clay;
  ctx.lineWidth = s * 0.018;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.09, bellyY - bellyR * 0.6);
  ctx.quadraticCurveTo(cx - s * 0.19, bellyY - bellyR * 0.95, cx - s * 0.035, bellyY - bellyR - s * 0.09);
  ctx.stroke();
  /* gold neck band, madder cord at the waist, clay highlight */
  ctx.fillStyle = PAL.gold;
  ctx.fillRect(cx - s * 0.026, bellyY - bellyR - s * 0.045, s * 0.052, s * 0.016);
  ctx.fillStyle = PAL.madder;
  ctx.fillRect(cx - s * 0.033, bellyY - bellyR * 0.99, s * 0.066, s * 0.01);
  ctx.fillStyle = 'rgba(255,250,235,0.16)';
  ctx.beginPath();
  ctx.ellipse(cx - bellyR * 0.45, bellyY - bellyR * 0.25, bellyR * 0.18, bellyR * 0.45, -0.45, 0, Math.PI * 2);
  ctx.fill();
  /* steam from the mouth */
  ctx.strokeStyle = 'rgba(250,247,238,0.5)';
  ctx.lineWidth = s * 0.007;
  ctx.beginPath();
  ctx.moveTo(cx, bellyY - bellyR - s * 0.19);
  ctx.bezierCurveTo(cx - s * 0.03, bellyY - bellyR - s * 0.25, cx + s * 0.03, bellyY - bellyR - s * 0.3, cx - s * 0.005 + rng() * s * 0.01, bellyY - bellyR - s * 0.36);
  ctx.stroke();

  /* the ረከቦት tray with three ስኒ */
  ctx.fillStyle = shade(PAL.verdigris, 0.3);
  ctx.fillRect(s * 0.08, s * 0.755, s * 0.34, s * 0.02);
  ctx.fillRect(s * 0.1, s * 0.775, s * 0.3, s * 0.035);
  for (let i = 0; i < 3; i++) {
    const sx = s * (0.14 + i * 0.11);
    const rimY = s * 0.7;
    ctx.fillStyle = tint(PAL.parchment, 0.55);
    ctx.beginPath();
    ctx.moveTo(sx - s * 0.04, rimY);
    ctx.bezierCurveTo(sx - s * 0.038, rimY + s * 0.045, sx + s * 0.038, rimY + s * 0.045, sx + s * 0.04, rimY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = s * 0.0035;
    ctx.stroke();
    /* rim */
    ctx.beginPath();
    ctx.ellipse(sx, rimY, s * 0.04, s * 0.009, 0, 0, Math.PI * 2);
    ctx.fillStyle = shade(PAL.madder, 0.2);
    ctx.fill();
    ctx.stroke();
    /* foot */
    ctx.fillStyle = tint(PAL.parchment, 0.55);
    ctx.fillRect(sx - s * 0.01, rimY + s * 0.043, s * 0.02, s * 0.012);
  }

  /* the brazier: bowl, waist, splayed foot, coals */
  const bx = s * 0.85;
  const by = s * 0.73;
  ctx.fillStyle = shade(PAL.madder, 0.4);
  ctx.beginPath();
  ctx.moveTo(bx - s * 0.065, by - s * 0.03);
  ctx.quadraticCurveTo(bx, by + s * 0.035, bx + s * 0.065, by - s * 0.03);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(bx - s * 0.018, by + 0.01 * s, s * 0.036, s * 0.03);
  ctx.beginPath();
  ctx.moveTo(bx - s * 0.045, by + s * 0.075);
  ctx.lineTo(bx + s * 0.045, by + s * 0.075);
  ctx.lineTo(bx + s * 0.02, by + s * 0.035);
  ctx.lineTo(bx - s * 0.02, by + s * 0.035);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PAL.gold;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(bx - s * 0.027 + i * s * 0.018, by - s * 0.035, s * 0.0075, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = tint(PAL.gold, 0.4);
  ctx.beginPath();
  ctx.moveTo(bx - s * 0.014, by - s * 0.04);
  ctx.quadraticCurveTo(bx, by - s * 0.085, bx + s * 0.014, by - s * 0.04);
  ctx.closePath();
  ctx.fill();
};
