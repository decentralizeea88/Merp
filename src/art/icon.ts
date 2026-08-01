/* Manuscript-page and radial compositions: ብራና, the fidel table, and the
   Meskel bonfire. The two typographic pieces draw real fidel with the
   loaded webfont — the one place canvas sets type. */

import type { Rng } from '../core/rng';
import { PAL, mix, paper, shade, tint, type Ctx } from './canvas';
import { braidLine, diamond } from './harag';
import { crossPath } from './cross';

const GLYPHS = 'ሀለሐመሠረሰሸቀበተቸነኘአከወዐዘዠየደጀገጠጨጰጸፀፈፐ';

const randGlyph = (rng: Rng): string => {
  const base = GLYPHS.codePointAt(Math.floor(rng() * GLYPHS.length)) ?? 0x1218;
  return String.fromCodePoint(base + Math.floor(rng() * 7));
};

/* ብራና — a manuscript leaf: pricked margins, ruled block, two columns of
   text with rubricated openings, a thin braid divider. */
export const drawBirana = (ctx: Ctx, s: number, rng: Rng): void => {
  paper(ctx, s, rng, tint(PAL.parchmentDeep, 0.25));
  /* edge darkening — a handled leaf */
  const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.42, s / 2, s / 2, s * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(80,55,25,0.18)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);

  const mx = s * 0.14;
  const my = s * 0.13;
  /* pricking holes */
  ctx.fillStyle = 'rgba(60,40,20,0.5)';
  for (let i = 0; i < 14; i++) {
    const y = my + ((s - 2 * my) * i) / 13;
    ctx.beginPath();
    ctx.arc(s * 0.045, y, s * 0.004, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.955, y, s * 0.004, 0, Math.PI * 2);
    ctx.fill();
  }
  /* ruling */
  ctx.strokeStyle = 'rgba(100,75,45,0.28)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 14; i++) {
    const y = my + ((s - 2 * my) * i) / 13;
    ctx.beginPath();
    ctx.moveTo(mx * 0.7, y);
    ctx.lineTo(s - mx * 0.7, y);
    ctx.stroke();
  }
  for (const x of [mx, s / 2 - mx * 0.28, s / 2 + mx * 0.28, s - mx]) {
    ctx.beginPath();
    ctx.moveTo(x, my * 0.7);
    ctx.lineTo(x, s - my * 0.7);
    ctx.stroke();
  }

  /* headpiece braid */
  braidLine(ctx, mx, my * 0.62, s - mx, my * 0.62, {
    bandW: s * 0.013,
    amp: s * 0.014,
    period: s * 0.07,
    colors: [PAL.madder, PAL.ink],
    dots: PAL.gold,
  });

  /* two columns of text; openings rubricated in madder */
  ctx.textBaseline = 'alphabetic';
  const lineH = (s - 2 * my) / 13;
  const fontPx = lineH * 0.62;
  ctx.font = `500 ${fontPx}px "Noto Serif Ethiopic"`;
  const cols: ReadonlyArray<[number, number]> = [
    [mx, s / 2 - mx * 0.36],
    [s / 2 + mx * 0.36, s - mx],
  ];
  cols.forEach(([x0, x1], cIdx) => {
    for (let line = 0; line < 13; line++) {
      const y = my + lineH * (line + 0.78);
      const red = (cIdx === 0 && line < 2) || (cIdx === 1 && line > 6 && line < 9);
      ctx.fillStyle = red ? PAL.madder : shade(PAL.ink, 0.05);
      let x = x0;
      while (x < x1 - fontPx * 0.7) {
        const gl = randGlyph(rng);
        ctx.fillText(gl, x, y);
        x += ctx.measureText(gl).width + fontPx * 0.12;
        if (rng() < 0.16) {
          ctx.fillStyle = red ? PAL.madder : shade(PAL.ink, 0.05);
          ctx.fillText('፡', x, y);
          x += ctx.measureText('፡').width + fontPx * 0.12;
        }
      }
    }
  });
  /* the scribe's cross in the lower margin */
  crossPath(ctx, s / 2, s - my * 0.45, s * 0.022, s * 0.007);
  ctx.fillStyle = PAL.madder;
  ctx.fill();
};

/* ግዕዝ ፊደል — seven consonant rows by seven vowel orders, one glyph lit. */
export const drawFidel = (ctx: Ctx, s: number, rng: Rng): void => {
  paper(ctx, s, rng);
  const bases = [0x1200, 0x1208, 0x1218, 0x1228, 0x1230, 0x1260, 0x1320];
  const m = s * 0.1;
  const cell = (s - 2 * m) / 7;
  ctx.strokeStyle = 'rgba(90,70,45,0.18)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 7; i++) {
    ctx.beginPath();
    ctx.moveTo(m, m + i * cell);
    ctx.lineTo(s - m, m + i * cell);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(m + i * cell, m);
    ctx.lineTo(m + i * cell, s - m);
    ctx.stroke();
  }
  ctx.font = `700 ${cell * 0.56}px "Noto Serif Ethiopic"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const base = bases[r] as number;
      const ch = String.fromCodePoint(base + c);
      const x = m + (c + 0.5) * cell;
      const y = m + (r + 0.5) * cell + cell * 0.03;
      const lit = base === 0x1320 && c === 5;
      if (lit) {
        ctx.fillStyle = PAL.gold;
        ctx.fillRect(m + c * cell + 3, m + r * cell + 3, cell - 6, cell - 6);
        ctx.fillStyle = PAL.ink;
      } else {
        const fade = 0.12 + 0.1 * Math.abs(r - 3 + (rng() - 0.5));
        ctx.fillStyle = mix(PAL.ink, PAL.parchment, Math.min(0.35, fade));
      }
      ctx.fillText(ch, x, y);
    }
  }
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
  /* madder frame rule */
  ctx.strokeStyle = PAL.madder;
  ctx.lineWidth = s * 0.006;
  ctx.strokeRect(m - s * 0.02, m - s * 0.02, s - 2 * m + s * 0.04, s - 2 * m + s * 0.04);
};

/* ደመራ — the Meskel bonfire: rays, flame, the crossed poles, the ring of
   white-shawled watchers. */
export const drawDemera = (ctx: Ctx, s: number, rng: Rng): void => {
  paper(ctx, s, rng, shade(PAL.indigo, 0.55));
  const cx = s / 2;
  const cy = s * 0.52;
  /* radial gold rays */
  ctx.save();
  ctx.strokeStyle = 'rgba(200,148,64,0.3)';
  ctx.lineWidth = s * 0.005;
  for (let i = 0; i < 36; i++) {
    const th = (i / 36) * Math.PI * 2 + rng() * 0.04;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(th) * s * 0.16, cy + Math.sin(th) * s * 0.16);
    ctx.lineTo(cx + Math.cos(th) * s * (0.34 + (i % 3) * 0.08), cy + Math.sin(th) * s * (0.34 + (i % 3) * 0.08));
    ctx.stroke();
  }
  ctx.restore();
  /* glow */
  const glow = ctx.createRadialGradient(cx, cy - s * 0.05, 0, cx, cy - s * 0.05, s * 0.4);
  glow.addColorStop(0, 'rgba(221,174,92,0.5)');
  glow.addColorStop(1, 'rgba(221,174,92,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, s, s);

  /* the pyre: a tall cone of leaning poles, clearly built, not drawn over */
  const apexY = cy - s * 0.3;
  const baseY = cy + s * 0.16;
  const baseW = s * 0.19;
  ctx.strokeStyle = shade(PAL.inkSoft, 0.25);
  ctx.lineCap = 'butt';
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const bx = cx - baseW + baseW * 2 * t;
    ctx.lineWidth = s * (0.011 + 0.004 * Math.sin(t * Math.PI));
    ctx.beginPath();
    ctx.moveTo(bx, baseY);
    ctx.lineTo(cx + (t - 0.5) * s * 0.04, apexY + Math.abs(t - 0.5) * s * 0.03);
    ctx.stroke();
  }
  ctx.lineCap = 'round';
  /* fire climbing the lower half */
  const flame = (fx: number, fw: number, fh: number, lean: number, color: string): void => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(fx - fw, baseY);
    ctx.quadraticCurveTo(fx - fw * 1.2, baseY - fh * 0.45, fx + lean, baseY - fh);
    ctx.quadraticCurveTo(fx + fw * 1.2, baseY - fh * 0.45, fx + fw, baseY);
    ctx.closePath();
    ctx.fill();
  };
  flame(cx - s * 0.1, s * 0.055, s * 0.2, -s * 0.03, mix(PAL.madder, PAL.gold, 0.3));
  flame(cx + s * 0.1, s * 0.055, s * 0.22, s * 0.03, mix(PAL.madder, PAL.gold, 0.3));
  flame(cx - s * 0.045, s * 0.06, s * 0.3, -s * 0.01, mix(PAL.madder, PAL.gold, 0.55));
  flame(cx + s * 0.05, s * 0.058, s * 0.27, s * 0.015, mix(PAL.madder, PAL.gold, 0.55));
  flame(cx, s * 0.065, s * 0.37, s * 0.005, PAL.gold);
  flame(cx, s * 0.04, s * 0.24, -s * 0.005, tint(PAL.gold, 0.55));
  /* embers at the base */
  ctx.fillStyle = mix(PAL.madder, PAL.gold, 0.4);
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    ctx.arc(cx - baseW * 0.9 + rng() * baseW * 1.8, baseY + s * 0.008, s * (0.005 + rng() * 0.006), 0, Math.PI * 2);
    ctx.fill();
  }
  /* sparks rising with the heat */
  ctx.fillStyle = tint(PAL.gold, 0.35);
  for (let i = 0; i < 22; i++) {
    const th = -Math.PI / 2 + (rng() - 0.5) * 1.6;
    const r = s * (0.2 + rng() * 0.26);
    diamond(ctx, cx + Math.cos(th) * r, baseY - s * 0.1 + Math.sin(th) * r, s * 0.004 + rng() * s * 0.004);
  }
  /* the cross crowning the pyre */
  crossPath(ctx, cx, apexY - s * 0.06, s * 0.04, s * 0.012);
  ctx.fillStyle = PAL.gold;
  ctx.fill();
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = s * 0.004;
  ctx.stroke();

  /* watchers in white shawls, ringed around the fire in an ellipse */
  const watchers = 12;
  for (let i = 0; i < watchers; i++) {
    const th = Math.PI * (0.12 + (0.76 * i) / (watchers - 1));
    const wx = cx + Math.cos(th) * s * 0.42;
    const wy = cy + s * 0.24 + Math.sin(th) * s * 0.1;
    const wh = s * (0.05 + rng() * 0.014);
    ctx.fillStyle = tint(PAL.parchment, 0.35);
    ctx.beginPath();
    ctx.moveTo(wx - wh * 0.5, wy);
    ctx.quadraticCurveTo(wx - wh * 0.42, wy - wh * 1.1, wx, wy - wh * 1.32);
    ctx.quadraticCurveTo(wx + wh * 0.42, wy - wh * 1.1, wx + wh * 0.5, wy);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(wx, wy - wh * 1.42, wh * 0.24, 0, Math.PI * 2);
    ctx.fillStyle = shade(PAL.inkSoft, 0.15);
    ctx.fill();
    /* a held taper */
    if (i % 3 === 1) {
      ctx.fillStyle = tint(PAL.gold, 0.3);
      ctx.beginPath();
      ctx.arc(wx + wh * 0.55, wy - wh * 0.9, wh * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};
