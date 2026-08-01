# ጥበብ (Tibeb)

A sliding-tile and jigsaw puzzle game built on Ethiopian visual art. The
interface is Amharic throughout, set in Noto Ethiopic. All twelve artworks are
generated in code from seeded parameters — no image files are shipped.

## Running it

```
npm install
npm run dev
```

## Checks

```
npx tsc --noEmit     # strict, no any, no unchecked indexing
npm run test         # Vitest: numerals, calendar, solvability, edge geometry
npm run build
npm run shots        # Playwright captures every screen into shots/
```

`npm run shots` takes each screen at 375×667, 768×1024 and 1440×900 in both
themes. Look at the images — the tests do not cover composition.

`#art` renders all twelve artworks on one page for reviewing them together.

## How it is put together

The interactive layer is DOM and CSS. Tiles and jigsaw pieces are real
`<button>` elements moved with `transform: translate3d()`, so Amharic shapes
correctly at every size, focus and keyboard operation work natively, and the
whole board is inspectable in dev tools. Canvas is used once, offscreen, to
render an artwork into a blob URL that CSS then slices across the tiles.

A tile's position is two custom properties, `--col` and `--row`; a move sets
them and a CSS transition does the rest. `--gap` is registered with `@property`
so the completion sequence can close the seams by interpolating it.

- `src/art/` — the generators. `harag.ts` (interlace, vines, bird heads) is the
  one to read first; `registry.ts` lists the twelve.
- `src/game/sliding/` — `model.ts` is pure: move legality, parity solvability,
  win detection. `view.ts` and `input.ts` are the only files touching the DOM.
- `src/game/jigsaw/` — `geometry.ts` generates each interior edge once, and the
  two pieces sharing it traverse the same curve in opposite directions, so
  their silhouettes are exact complements.
- `src/core/` — seeded RNG (never `Math.random`), Ge'ez numerals, Ethiopian
  calendar, versioned storage, Web Audio synthesis, motion tokens.
- `src/i18n/am.ts` — every user-visible string.

Zero runtime dependencies. Offline after first load via a service worker whose
precache list is baked in at build time.

## Deploying

The build is static — `dist/` is the whole game. Any static host works:
build with `npm run build` and publish `dist`. The app routes on the hash, so
no rewrite rules are needed.

On hosts that need a process (Railway, Render, Fly), `railway.toml` starts
`node server.js`, a static server written against Node built-ins so nothing
is added to the dependency tree. `PORT` comes from the environment.

Whichever host, the cache headers are the part that matters, and
`public/_headers` carries them for Cloudflare Pages and Netlify:

- `/assets/*` is fingerprinted by Vite, so `immutable`
- `index.html` and `sw.js` are `no-cache`

If those two are ever cached at the edge, players stay pinned to an old
service worker and stop receiving updates. `Vary` is deliberately not sent —
it makes the worker's precached entries miss.

Keep `server.js` and `public/_headers` in step; they express the same policy.

## Conventions

`CLAUDE.md` holds the rules that apply to every change; `DESIGN_SPEC.md` is the
source of truth for anything visual. Both are worth reading before editing.

## Needs a native speaker

The strings in `src/i18n/am.ts` came from `STRINGS_am.md` and have not been
reviewed by a native speaker. The artwork captions and these entries in
particular are worth a second opinion: `nav.gallery` / `gallery.title`
(ማዕከለ ስዕላት), `board.shuffle` (በትን), `settings.reset` (ሂደትን ደምስስ), and the
assembled forms in `tf` — `bestBoth`, `pieceProgress` (`፭ ከ ፲፪`) and
`todaysArtwork`.
