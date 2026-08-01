# ጥበብ (Tibeb) — project rules

An HTML5 sliding-tile and jigsaw puzzle game built on Ethiopian visual art.
UI language: Amharic only. Audience: fluent Amharic speakers.

These rules apply to every session in this repo. Read `DESIGN_SPEC.md` before
touching anything visual, and `STRINGS_am.md` before writing any user-facing text.

## Stack

Vite + TypeScript (strict). Vanilla — **no game engine, no framework, no UI kit.**

The interactive layer is **DOM + CSS**. Tiles are real `<button>` elements moved
with `transform: translate3d()`. Canvas appears exactly once, offscreen, to render
generated artwork into an image that CSS then slices across the tiles. Animation
is CSS transitions plus the Web Animations API — no tween library and no
hand-rolled tween engine.

**Zero runtime dependencies.** If you think you need a package, propose it and
wait for an answer instead of installing it.

## Layout

```
src/
  main.ts            entry, boots the app shell
  app/               screens: splash, home, select, board, gallery, settings
  game/
    sliding/
      model.ts       board state, move legality, solvability, win check (pure)
      view.ts        DOM construction + transform updates
      input.ts       pointer, drag, and keyboard handling
    jigsaw/
      geometry.ts    bezier edge generation, clip-path strings (pure)
      view.ts        piece elements, snapping, grouping
    daily.ts         Ethiopian-calendar seeding, streaks
  art/
    canvas.ts        offscreen canvas setup, blob URL production
    harag.ts         interlace / manuscript border generator
    cross.ts         Ethiopian cross geometry
    weave.ts         tibeb band patterns
    architecture.ts  stelae, Bete Giyorgis
    icon.ts          flat-plane figurative compositions
    landscape.ts     highland / Danakil / coffee compositions
    registry.ts      the 12 artworks: id, seed, generator, title key, caption key
  core/
    anim.ts          shared easings, durations, WAAPI sequence helpers
    rng.ts           seeded PRNG (mulberry32 or similar) — never Math.random
    storage.ts       versioned localStorage wrapper
    geez.ts          toGeez / fromGeez numerals
    ethiopic-date.ts calendar conversion
    audio.ts         Web Audio synthesis
  i18n/am.ts         every user-visible string
  styles/
    tokens.css       design tokens from DESIGN_SPEC
    board.css        the well, tiles, motion
    <screen>.css     one per screen
tests/
scripts/shots.ts     Playwright screenshot capture
```

## Hard rules

- **The board is never a canvas.** Not now, not as an optimization later. If
  something seems to need one, the implementation is wrong — say so and stop
  rather than switching rendering strategies.
- **No user-visible string outside `src/i18n/am.ts`.** Not in HTML, not in an
  `aria-label`, not in a thrown error the player might see.
- **No `Math.random()` anywhere.** All randomness comes from `core/rng.ts` with an
  explicit seed, so art and puzzles are reproducible.
- **Animate only `transform` and `opacity`.** Never `width`, `height`, `top`,
  `left`, `margin`, `padding`, `border-radius`, `filter` or `box-shadow` in a
  transition or keyframe. If a design seems to need one, achieve it with a scaled
  or faded overlay element instead.
- **`will-change: transform` is applied on drag start and removed on drag end.**
  Never left on permanently — it costs memory per element.
- **No layout reads inside a pointer handler.** No `getBoundingClientRect`,
  `offsetWidth`, or `getComputedStyle` during a drag. Measure once on
  resize, cache it, and only write during the gesture.
- **Pointer Events only.** No `mousedown`/`touchstart` pairs. Call
  `setPointerCapture` on drag start.
- `strict: true`, `noUncheckedIndexedAccess: true`. No `any`. No non-null `!`
  without a comment explaining why it holds.
- Never commit generated art as image files. Art is code.

## Style

- Named exports. No default exports.
- **Model / view / input stay separated.** Files in `game/*/model.ts`,
  `game/*/geometry.ts`, and everything in `art/` and `core/` are pure — they take
  state and return state or geometry, and never touch the DOM. Only `view.ts` and
  `input.ts` files touch elements. This is what makes the game logic testable.
- Comments explain *why*, never *what*. Delete a comment rather than let it
  describe the obvious.
- CSS: custom properties for every value that appears twice. `contain: layout
  paint` on the board container. One class per element, BEM-ish naming, no
  utility-class soup, no `!important`.
- Files stay under ~250 lines. Split when they grow past it.
- No barrel `index.ts` files.

## Testing

**Vitest** for logic. Unit tests are required for: Ge'ez numeral conversion (both
directions, 1–100 plus the century boundary), Ethiopian calendar conversion
(including ጳጉሜ and leap years), puzzle solvability, move legality, win detection,
jigsaw edge complementarity, and the storage schema migration path.

**Playwright** for eyes. `scripts/shots.ts` captures each screen at 375×667,
768×1024 and 1440×900, in both themes, into `shots/`. Run it and *look at the
images* — do not report a phase complete on the basis of tests alone.

## Verification before you call a phase done

```
npx tsc --noEmit
npm run test
npm run build
npm run shots
```

Then open the screenshots and inspect them. A phase is not done until you have
looked at it.

## Amharic correctness

- `<html lang="am">`.
- Ge'ez numerals for all in-game counts, scores, times and dates. Arabic digits
  only where a Ge'ez numeral would be genuinely unreadable (e.g. milliseconds).
- Amharic sentence punctuation is `።` (arat netib), not `.`. The comma is `፣`.
- Do not insert `፡` between words; modern Amharic uses spaces.
- Ethiopic has no case. Never `text-transform`. Never `letter-spacing`.
- If you are unsure whether a phrase is idiomatic, flag it in your summary rather
  than guessing. Wrong-but-confident Amharic is worse than a flagged question.
