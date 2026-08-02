/* Packs the built game into one self-contained HTML file, for handing to
   someone as a demo or dropping on any host. Fonts become data URIs and
   the CSS and JS are inlined, so the file has no external references and
   runs straight from disk.

   Run `npm run build` first, then `npm run demo`.

   Two things are patched out, and both assert rather than fail quietly:
   there is no /sw.js to register when everything lives in one file, and
   the artwork moves from blob: to data: URLs because a strict host CSP
   commonly allows data: but not blob:. */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const OUT = process.argv[2] ?? 'tibeb-demo.html';

const assets = readdirSync(join(DIST, 'assets'));
const cssName = assets.find((f) => f.endsWith('.css'));
const jsName = assets.find((f) => f.endsWith('.js'));
if (!cssName || !jsName) throw new Error('no build output — run `npm run build` first');

let css = readFileSync(join(DIST, 'assets', cssName), 'utf8');
let js = readFileSync(join(DIST, 'assets', jsName), 'utf8');

const inlineFont = (name: string): void => {
  const pattern = new RegExp(`url\\(/fonts/${name}\\.woff2\\)`, 'g');
  if (!pattern.test(css)) throw new Error(`font url not found: ${name}`);
  const base64 = readFileSync(join('public', 'fonts', `${name}.woff2`)).toString('base64');
  css = css.replace(pattern, `url(data:font/woff2;base64,${base64})`);
};
for (const family of ['NotoSerifEthiopic', 'NotoSansEthiopic']) {
  for (const subset of ['ethiopic', 'latin']) inlineFont(`${family}-${subset}`);
}

const swGuard = '"serviceWorker"in navigator&&';
if (!js.includes(swGuard)) throw new Error('service worker guard not found');
js = js.replace(swGuard, 'false&&');

const blobToData =
  /const (\w+)=await new Promise\(\(\w+,\w+\)=>\{(\w+)\.toBlob\([^}]*?"image\/png"\)\}\),(\w+)=URL\.createObjectURL\(\1\);/;
const match = blobToData.exec(js);
if (!match) throw new Error('artwork blob url pattern not found');
js = js.replace(blobToData, `const ${match[3]}=${match[2]}.toDataURL("image/png");`);
if (js.includes('URL.createObjectURL')) throw new Error('blob url still present');

/* A classic script, not a module: module scripts are blocked by CORS when
   the page is opened from disk, and the bundle has no top-level imports. */
if (/^\s*(import|export)[\s{*]/m.test(js)) {
  throw new Error('bundle has top-level module syntax and cannot run as a classic script');
}

const html = `<!doctype html>
<html lang="am">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="color-scheme" content="light dark" />
<title>ጥበብ</title>
<style>
${css}
</style>
</head>
<body>
<div id="app"></div>
<script>
${js}
</script>
</body>
</html>
`;

writeFileSync(OUT, html);
console.log(`${OUT} — ${(html.length / 1024).toFixed(0)} KB`);
