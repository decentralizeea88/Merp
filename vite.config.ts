import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

/* Emits src/sw.js as dist/sw.js with the hashed bundle names baked into
   its precache list, so the first visit caches the whole shell. */
const serviceWorker = (): Plugin => ({
  name: 'tibeb-service-worker',
  apply: 'build',
  generateBundle(_options, bundle) {
    const assets = Object.keys(bundle)
      .filter((name) => name.startsWith('assets/'))
      .map((name) => `/${name}`);
    const source = readFileSync('src/sw.js', 'utf8')
      .replace('__BUILD__', Date.now().toString(36))
      .replace("'__ASSETS__'", JSON.stringify(JSON.stringify(assets)));
    this.emitFile({ type: 'asset', fileName: 'sw.js', source });
  },
});

export default defineConfig({
  plugins: [serviceWorker()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 2048,
  },
  server: {
    host: true,
  },
});
