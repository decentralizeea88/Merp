/* Captures every screen at three viewports in both themes into shots/.
   Run against the production build: `npm run build` first, then `npm run shots`.
   Optionally pass routes as CLI args (hash fragments), e.g. `npm run shots -- art`. */

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const VIEWPORTS = [
  { name: 'phone', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

const THEMES = ['light', 'dark'] as const;
const PORT = 4173;

const startPreview = (): Promise<ReturnType<typeof spawn>> =>
  new Promise((resolve, reject) => {
    const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    proc.stdout?.on('data', (d: Buffer) => {
      if (d.toString().includes('localhost')) resolve(proc);
    });
    proc.on('error', reject);
    setTimeout(() => reject(new Error('vite preview did not start')), 15000);
  });

const main = async (): Promise<void> => {
  const routes = process.argv.slice(2);
  if (routes.length === 0) routes.push('');
  mkdirSync('shots', { recursive: true });
  const preview = await startPreview();
  const browser = await chromium.launch({
    executablePath: process.env['CHROMIUM_PATH'] ?? '/opt/pw-browsers/chromium',
  });
  try {
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        const ctx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          colorScheme: theme,
          deviceScaleFactor: 2,
        });
        const page = await ctx.newPage();
        for (const route of routes) {
          const url = `http://localhost:${PORT}/${route ? '#' + route : ''}`;
          await page.goto(url, { waitUntil: 'networkidle' });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(2200);
          const label = route ? route.replace(/[^a-z0-9-]/gi, '_') : 'home';
          await page.screenshot({
            path: `shots/${label}-${vp.name}-${theme}.png`,
            fullPage: route === 'art',
          });
        }
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
    preview.kill();
  }
  process.exit(0);
};

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
