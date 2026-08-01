# ጥበብ — design specification

The source of truth for every visual decision. Where this document and the build
prompt disagree, this document wins.

## The idea in one line

An illuminated Ge'ez manuscript that you can play — parchment, ink, gold leaf and
interlace, rendered with modern restraint and modern motion.

## What we are not doing

Not the flag palette. Not tourism-poster green-yellow-red. Not "ethnic pattern"
as decoration sprinkled on a generic mobile-game chassis. Not skeuomorphic leather
and stitching. The reference is a 15th-century manuscript leaf and a well-made
museum catalogue, not a casino app.

## Color

All values below become CSS custom properties in `styles/tokens.css`.

Light theme — the parchment ground:

| Token | Value | Use |
|---|---|---|
| `--ground` | `#EFE6D3` | page background, the parchment |
| `--ground-deep` | `#E2D4B7` | recessed panels, the board well |
| `--ink` | `#231A12` | primary text, contour lines |
| `--ink-soft` | `#5C4B39` | secondary text, captions |
| `--madder` | `#A6302A` | primary accent — the manuscript red |
| `--indigo` | `#1F3A5F` | secondary accent, cool counterweight |
| `--gold` | `#C89440` | highlights, mastery markers, gilding |
| `--verdigris` | `#4B6B54` | tertiary, foliage in harag |
| `--tile` | `#F6EFE0` | tile face |
| `--tile-edge` | `#CBB68F` | tile bevel and seam |

Dark theme — the same manuscript by lamplight. Switched by
`[data-theme="dark"]` on `<html>`, defaulting from
`prefers-color-scheme`. Do not simply invert:

| Token | Value |
|---|---|
| `--ground` | `#17120C` |
| `--ground-deep` | `#0F0B07` |
| `--ink` | `#EDE2CC` |
| `--ink-soft` | `#A08F76` |
| `--madder` | `#C8493F` |
| `--indigo` | `#5B7FB0` |
| `--gold` | `#DDAE5C` |
| `--verdigris` | `#6E8F76` |
| `--tile` | `#241B12` |
| `--tile-edge` | `#3D2E1E` |

Rules:

- Body text against `--ground` must clear 7:1 contrast. Interactive elements 4.5:1
  minimum, and never rely on color alone to carry state.
- **Gold is scarce.** It marks completion, mastery and the current selection —
  nothing else. The moment gold appears on ordinary buttons it stops meaning
  anything.
- Madder and indigo never sit adjacent at full saturation. One leads, the other
  supports at reduced area.
- The parchment ground is not flat. Overlay a generated grain — an SVG
  `feTurbulence` layer as a fixed background, ≤3% opacity — so it reads as
  material rather than as `#EFE6D3`.

## Typography

Fonts, self-hosted as woff2 subsets in `public/fonts/`, not loaded from a CDN.
Subset to the Ethiopic block plus Latin digits and basic punctuation.

- **Display / titles:** Noto Serif Ethiopic — 700 for titles, 600 for screen
  headers. The serif carries the manuscript reference.
- **UI / body:** Noto Sans Ethiopic — 400 body, 500 emphasis, 600 buttons.
- **Ge'ez numerals on tiles:** Noto Serif Ethiopic 700. Numerals want the weight.

Fallback stack: `'Noto Sans Ethiopic', 'Abyssinica SIL', 'Kefa', 'Nyala', sans-serif`.
Test every screen with the webfont blocked — no boxes, no layout shift.

Scale (rem, 16px root):

| Role | Size | Line height | Weight |
|---|---|---|---|
| Display | 2.5 | 1.35 | 700 |
| Screen header | 1.75 | 1.4 | 600 |
| Section | 1.25 | 1.5 | 600 |
| Body | 1.0 | 1.7 | 400 |
| Caption | 0.875 | 1.65 | 400 |
| Tile numeral | `calc(var(--tile-size) * 0.28)` | 1 | 700 |

Ethiopic-specific:

- Line height never below 1.35, and 1.7 for running text. Fidel has tall
  ascenders and descending marks; tight leading collides them.
- Never `letter-spacing`. Never `text-transform`. Ethiopic is unicameral.
- Optical alignment: Ethiopic sits differently in its em box than Latin. Check
  vertical centering in buttons and tiles by eye and correct with padding, not by
  trusting `line-height` alone.
- Amharic punctuation: `።` ends a sentence, `፣` separates a clause.

## Space and shape

- 8px base unit. All spacing is a multiple: 4 8 12 16 24 32 48 64.
- Radii: 4px on chips and inputs, 10px on tiles, 16px on cards and modals, full
  round only on icon buttons.
- Minimum touch target 44×44 CSS px, with 8px of clear space around it.
- Screen gutter 20px, plus `env(safe-area-inset-*)`.

## The board

### Structure

```
.board-well            position: relative; contain: layout paint;
  .board-grain         the parchment texture layer
  .board-ghost         the artwork at 12% opacity, visible through the gap
  .board-frame         the harag border, as an SVG border-image
  .board-tile          absolutely positioned <button>, one per tile
```

The board container is a perfect square sized in CSS:

```css
--board-size: min(100vw - 40px, 100vh - var(--hud-h) - var(--safe) - 120px);
--grid: 4;                       /* set per puzzle */
--gap: 3px;
--tile-size: calc((var(--board-size) - (var(--grid) - 1) * var(--gap)) / var(--grid));
```

Tiles never change `width`/`height` or `top`/`left`. Every tile is placed once at
origin and moved entirely by transform:

```css
.board-tile {
  position: absolute;
  width: var(--tile-size);
  height: var(--tile-size);
  transform: translate3d(
    calc(var(--col) * (var(--tile-size) + var(--gap))),
    calc(var(--row) * (var(--tile-size) + var(--gap))),
    0
  );
  transition: transform var(--dur-slide) var(--ease-slide);
}
```

A move is then one line of JS: set `--col` and `--row` on the element. The
transition does the rest. During a drag, set `transition: none` and write the
transform directly from the pointer position; restore the transition on release.

**Register the numeric custom properties with `@property`.** Untyped custom
properties are strings and cannot be transitioned or interpolated — the seam-close
beat of the completion sequence will silently do nothing without this:

```css
@property --gap  { syntax: '<length>'; initial-value: 3px; inherits: true; }
@property --col  { syntax: '<number>'; initial-value: 0;   inherits: false; }
@property --row  { syntax: '<number>'; initial-value: 0;   inherits: false; }
```

### Image slicing

One artwork, one blob URL, sixteen windows onto it:

```css
.board-tile--image {
  background-image: var(--artwork);
  background-size: var(--board-size) var(--board-size);
  background-position:
    calc(var(--home-col) * -1 * (var(--tile-size) + var(--gap)))
    calc(var(--home-row) * -1 * (var(--tile-size) + var(--gap)));
}
```

Note `--home-col`/`--home-row` (where the tile belongs in the picture) is distinct
from `--col`/`--row` (where it currently sits). Never generate separate images per
tile.

### Surface treatment

- The **well** is a `--ground-deep` recess: 1px `--tile-edge` inner edge plus a
  soft inset shadow. Static — never animated.
- The well is framed by a **harag border**, a generated interlace band 12–16px
  wide, produced once as an SVG data URL and applied with `border-image`. It must
  tile seamlessly; mitre the corners properly rather than rotating a strip and
  hoping.
- **Tiles** are `--tile` with a 1px `--tile-edge` stroke and a 1px inner highlight
  at the top edge. That is the entire depth treatment. No gradients, no drop
  shadows on tiles at rest.
- Only the tile being dragged gets elevation: `filter: drop-shadow(...)` applied
  as a static class on drag start, not transitioned.
- The **gap** shows `.board-ghost` — the whole artwork at 12% opacity — so a hint
  of the finished picture glows through the hole.

## Motion

Defined once in `styles/tokens.css` and mirrored in `core/anim.ts`:

| Token | Curve | Duration | Use |
|---|---|---|---|
| `--ease-slide` / `--dur-slide` | `cubic-bezier(.22,1,.36,1)` | 180ms | tile sliding into the gap |
| `--ease-settle` / `--dur-settle` | `linear()` spring, ~0.72 damping | 260ms | jigsaw piece snapping home |
| `--ease-spring` / `--dur-spring` | `cubic-bezier(.34,1.56,.64,1)` | 220ms | rejected drag returning |
| `--ease-rise` / `--dur-rise` | `cubic-bezier(.16,1,.3,1)` | 320ms | modals, cards, sheets |
| `--ease-fade` / `--dur-fade` | `cubic-bezier(.4,0,.2,1)` | 160ms | opacity only |

Rules:

- **A dragged tile follows the pointer 1:1** with no smoothing, no lerp and no
  transition. Smoothing a direct-manipulation drag always feels broken.
- On release, distance and velocity decide: past the midpoint or moving fast
  enough → slide forward with `--ease-slide`; otherwise return with
  `--ease-spring`.
- Multi-tile slides stagger by 0ms — the whole row moves as one body, not as a
  ripple. Ripples look decorative and feel wrong on a rigid grid.
- Staggered *entrances* (menu cards, gallery items) step by 24ms, and the whole
  stagger completes within 400ms regardless of item count. Compress the step for
  long lists rather than making the player wait.
- Nothing animates longer than 400ms except the completion sequence.
- `prefers-reduced-motion: reduce` sets every `--dur-*` to `0ms` except
  `--dur-fade` at `100ms`. State still changes; it just arrives instead of
  travelling. The completion sequence collapses to a single fade.

## The completion sequence

Roughly six seconds, orchestrated with the Web Animations API in one function in
`core/anim.ts`. It is the most important six seconds in the game:

1. **0.0s** Final tile slides home with `--ease-slide`.
2. **0.2s** A gold hairline traces the perimeter of the grid — an SVG overlay
   `rect` with `stroke-dasharray` set to its own length, animating
   `stroke-dashoffset` to zero over 600ms.
3. **0.5s** Seams close: `--gap` transitions to `0px` over 500ms. Because tile
   positions are computed from `--gap`, every tile converges automatically and the
   image becomes whole.
4. **1.0s** The board scales `1 → 1.02 → 1` over 900ms. One slow breath.
5. **1.6s** The harag frame blooms: a duplicate frame layer at `--gold` fades in
   and out with a masked sweep travelling once around it.
6. **2.2s** Stats card rises from below with `--ease-rise` — artwork title, time,
   moves, best, and the mastery marker if earned.
7. Ambient: a single soft struck tone at step 2, a low resolving chord at step 5.

Tapping anywhere skips to the end state immediately. The sequence never blocks
input.

## Sound

Synthesized with the Web Audio API — no audio files. Warm, wooden, quiet.

- **Tile slide:** short filtered noise burst with a fast decay, pitch varying ±3%
  per move so repetition doesn't grate.
- **Invalid move:** a dull, damped thud. Quiet. Not a buzzer.
- **Snap home:** a soft struck tone, pitch rising as the puzzle nears completion.
- **Completion:** struck tone plus a low resolving chord.
- Master volume default 60%, mute toggle in settings, persisted. The audio context
  is created on first user gesture, never on load.

## Screens

**Splash** — parchment ground. A harag ornament draws itself on over 900ms via
animated `stroke-dashoffset`, title `ጥበብ` fades up beneath it. Auto-advances at
1.6s, or on tap.

**Home** — title, then three large mode cards stacked vertically, each with a
small generated ornament, the mode name and a one-line Amharic description. Below:
continue-last-game if one exists, gallery, settings. Streak count in the top corner
once the daily has been played.

**Select** — artwork chooser as a vertical scroller of large cards. Each card shows
the artwork (blurred and desaturated if locked), Amharic title, best time and
moves. Grid size as a three-way segmented control beneath.

**Board** — the HUD is one thin row: back, elapsed time, move count, pause.
Nothing else competes with the board. Hint and shuffle live behind the pause sheet.

**Gallery** — a designed room, not a thumbnail grid. Unlocked artworks presented
large, one per screen on mobile, in a horizontal `scroll-snap` scroller, each with
its Amharic title and caption set as a proper caption block. Locked slots show only
the harag frame, empty.

**Settings** — theme (light / dark / system), sound, reduced-motion override, reset
progress with confirmation.

## Responsive

- **≤ 480px:** portrait single column, board fills the width, jigsaw tray below.
- **481–899px:** wider gutters, larger board, layout otherwise unchanged.
- **≥ 900px:** two columns — board left, HUD and tray in a right rail. Board caps
  at 640px so it never becomes a wall.
- **Landscape phone:** board sized by height, HUD moves to a left rail.

All four handled by adjusting the `--board-size` and `--gutter` custom properties
in media queries. The tile positioning math never changes.

## Accessibility

- Visible focus ring: 2px `--indigo` (light) / `--gold` (dark), 2px offset, via
  `:focus-visible`.
- The board is a keyboard-operable grid: arrow keys move the gap, `Enter` confirms
  in menus, `Escape` pauses.
- `aria-live="polite"` region announcing each move and completion, in Amharic.
- Every tile is a `<button>` with an `aria-label` giving its Ge'ez numeral and grid
  position, and `aria-disabled` when it cannot legally move.
- Locked/unlocked and correct/incorrect states are never signalled by color alone
  — always also by shape, position or a mark.
