/* Ethiopian cross geometry — lattice and rotational symmetry, not tracing. */

import type { Rng } from '../core/rng';
import { PAL, paper, shade, tint, type Ctx } from './canvas';
import { diamond } from './harag';

/* Greek cross as a single closed polygon; arm = half-length, w = half-width. */
export const crossPath = (ctx: Ctx, cx: number, cy: number, arm: number, w: number): void => {
  ctx.beginPath();
  ctx.moveTo(cx - w, cy - w);
  ctx.lineTo(cx - w, cy - arm);
  ctx.lineTo(cx + w, cy - arm);
  ctx.lineTo(cx + w, cy - w);
  ctx.lineTo(cx + arm, cy - w);
  ctx.lineTo(cx + arm, cy + w);
  ctx.lineTo(cx + w, cy + w);
  ctx.lineTo(cx + w, cy + arm);
  ctx.lineTo(cx - w, cy + arm);
  ctx.lineTo(cx - w, cy + w);
  ctx.lineTo(cx - arm, cy + w);
  ctx.lineTo(cx - arm, cy - w);
  ctx.closePath();
};

const rotated = (ctx: Ctx, cx: number, cy: number, angle: number, draw: () => void): void => {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.translate(-cx, -cy);
  draw();
  ctx.restore();
};

/* የላሊበላ መስቀል — processional cross: a diamond openwork head on a stem,
   built from a woven lattice clipped to the head, a bold central cross,
   and crosslet finials at the four points. */
export const drawLalibelaCross = (ctx: Ctx, s: number, rng: Rng): void => {
  paper(ctx, s, rng);
  const cx = s / 2;
  const cy = s * 0.44;
  const R = s * 0.315;

  ctx.save();
  rotated(ctx, cx, cy, Math.PI / 4, () => {
    const half = R / Math.SQRT2;
    ctx.fillStyle = PAL.madder;
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = s * 0.008;
    ctx.fillRect(cx - half, cy - half, half * 2, half * 2);
    ctx.strokeRect(cx - half, cy - half, half * 2, half * 2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - half, cy - half, half * 2, half * 2);
    ctx.clip();
    const step = (half * 2) / 8;
    ctx.strokeStyle = PAL.gold;
    ctx.lineWidth = s * 0.011;
    for (let i = -8; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - half + i * step, cy - half);
      ctx.lineTo(cx - half + i * step + half * 2, cy + half);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - half + i * step, cy + half);
      ctx.lineTo(cx - half + i * step + half * 2, cy - half);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = shade(PAL.madder, 0.3);
    ctx.lineWidth = s * 0.004;
    for (let i = 1; i < 8; i++) {
      ctx.strokeRect(
        cx - half + (i * step) / 2,
        cy - half + (i * step) / 2,
        half * 2 - i * step,
        half * 2 - i * step,
      );
      if (half * 2 - i * step <= 0) break;
    }
  });
  ctx.restore();

  /* lattice node studs */
  ctx.fillStyle = tint(PAL.gold, 0.25);
  const nodes = 8;
  for (let i = 1; i < nodes; i++) {
    const t = i / nodes;
    for (const [x, y] of [
      [cx - R + R * t, cy - R * t],
      [cx + R * t, cy - R + R * t],
      [cx - R + R * t, cy + R * t],
      [cx + R * t, cy + R - R * t],
    ] as const) {
      diamond(ctx, x, y, s * 0.011);
    }
  }

  /* central bold cross */
  crossPath(ctx, cx, cy, R * 0.52, R * 0.13);
  ctx.fillStyle = PAL.gold;
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = s * 0.006;
  ctx.fill();
  ctx.stroke();
  crossPath(ctx, cx, cy, R * 0.3, R * 0.065);
  ctx.fillStyle = PAL.parchment;
  ctx.fill();
  ctx.stroke();

  /* crosslet finials at the four points of the diamond */
  for (const [fx, fy] of [
    [cx, cy - R],
    [cx + R, cy],
    [cx, cy + R],
    [cx - R, cy],
  ] as const) {
    crossPath(ctx, fx, fy, s * 0.042, s * 0.013);
    ctx.fillStyle = PAL.gold;
    ctx.fill();
    ctx.stroke();
  }

  /* stem and handle plate */
  const stemW = s * 0.022;
  ctx.fillStyle = PAL.gold;
  ctx.fillRect(cx - stemW, cy + R + s * 0.035, stemW * 2, s * 0.13);
  ctx.strokeRect(cx - stemW, cy + R + s * 0.035, stemW * 2, s * 0.13);
  const plateW = s * 0.075;
  const plateY = cy + R + s * 0.165;
  ctx.fillStyle = PAL.madder;
  ctx.fillRect(cx - plateW, plateY, plateW * 2, s * 0.075);
  ctx.strokeRect(cx - plateW, plateY, plateW * 2, s * 0.075);
  ctx.fillStyle = PAL.gold;
  diamond(ctx, cx, plateY + s * 0.0375, s * 0.026);

  /* side pendants — cords hung from the side finials, beaded */
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = s * 0.004;
  for (const sign of [-1, 1] as const) {
    const x0 = cx + sign * R;
    const y0 = cy + s * 0.045;
    const x1 = cx + sign * R * 0.55;
    const y1 = plateY + s * 0.04;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx + sign * R * 1.02, (y0 + y1) / 2 + s * 0.03, x1, y1);
    ctx.stroke();
    ctx.fillStyle = PAL.madder;
    for (const t of [0.3, 0.6]) {
      const bx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * (cx + sign * R * 1.02) + t * t * x1;
      const by = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * ((y0 + y1) / 2 + s * 0.03) + t * t * y1;
      ctx.beginPath();
      ctx.arc(bx, by, s * 0.008, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = PAL.gold;
    diamond(ctx, x1, y1 + s * 0.012, s * 0.016);
  }

  /* corner crosslets ground the composition */
  ctx.lineWidth = s * 0.005;
  for (const [gx, gy] of [
    [s * 0.09, s * 0.09],
    [s * 0.91, s * 0.09],
    [s * 0.09, s * 0.91],
    [s * 0.91, s * 0.91],
  ] as const) {
    crossPath(ctx, gx, gy, s * 0.032, s * 0.01);
    ctx.fillStyle = PAL.indigo;
    ctx.fill();
    ctx.strokeStyle = PAL.ink;
    ctx.stroke();
  }
};
