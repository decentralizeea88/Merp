/* Web Audio synthesis — warm, wooden, quiet. The context is created on
   the first user gesture, never on load. */

import { load } from './storage';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

const ensure = (): { ctx: AudioContext; master: GainNode } | null => {
  if (!load().settings.sound) return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  if (!master) return null;
  return { ctx, master };
};

/* Short filtered noise burst — a tile sliding over wood. Pitch wanders
   ±3% per call so repetition doesn't grate. */
export const playSlide = (): void => {
  const a = ensure();
  if (!a) return;
  const t = a.ctx.currentTime;
  const dur = 0.09;
  const buf = a.ctx.createBuffer(1, a.ctx.sampleRate * dur, a.ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1;
  }
  const src = a.ctx.createBufferSource();
  src.buffer = buf;
  const filter = a.ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 820 * (0.97 + ((t * 997) % 1) * 0.06);
  filter.Q.value = 1.1;
  const gain = a.ctx.createGain();
  gain.gain.setValueAtTime(0.28, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filter).connect(gain).connect(a.master);
  src.start(t);
  src.stop(t + dur);
};

/* Dull damped thud for an illegal move. Quiet — not a buzzer. */
export const playThud = (): void => {
  const a = ensure();
  if (!a) return;
  const t = a.ctx.currentTime;
  const osc = a.ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);
  const gain = a.ctx.createGain();
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(gain).connect(a.master);
  osc.start(t);
  osc.stop(t + 0.12);
};

/* Soft struck tone, pitch rising as the puzzle nears completion.
   progress ∈ [0,1]. */
export const playSnap = (progress = 0): void => {
  const a = ensure();
  if (!a) return;
  const t = a.ctx.currentTime;
  const freq = 440 * Math.pow(2, (progress * 7) / 12);
  const osc = a.ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  const gain = a.ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.2, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  const shimmer = a.ctx.createOscillator();
  shimmer.type = 'sine';
  shimmer.frequency.value = freq * 2.01;
  const sGain = a.ctx.createGain();
  sGain.gain.setValueAtTime(0.05, t);
  sGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.connect(gain).connect(a.master);
  shimmer.connect(sGain).connect(a.master);
  osc.start(t);
  osc.stop(t + 0.55);
  shimmer.start(t);
  shimmer.stop(t + 0.35);
};

/* Completion: struck tone plus a low resolving chord. */
export const playCompletion = (): void => {
  const a = ensure();
  if (!a) return;
  const t = a.ctx.currentTime;
  playSnap(1);
  const chord = [130.81, 196.0, 261.63, 329.63];
  chord.forEach((f, i) => {
    const osc = a.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    const gain = a.ctx.createGain();
    const start = t + 0.25 + i * 0.04;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.09, start + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 2.2);
    osc.connect(gain).connect(a.master);
    osc.start(start);
    osc.stop(start + 2.3);
  });
};
