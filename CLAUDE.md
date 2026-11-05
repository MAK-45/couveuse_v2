# Couveuse

Pixel-art creature of ice-light (a "blob") and a single-page web editor that tunes it and exports
**seamless** GIF / PNG sprite sheets / JSON. The UI is in **French**; code and comments are in English.

## What the author wants (full version: docs/VISION.md — read it before adding a feature)

Bring a little creature of ice-light to life in a scene and produce all its animations from **one web
interface**, as **perfect endless loops**, to reuse elsewhere (GIFs pasted end to end, sprite sheets + JSON).
- **Perfect loops, always**; and anything the blob *does* (actions, clock, objects appearing/disappearing)
  starts and ends exactly at its rest, so GIFs chain. Only the Boucles tab is free of the rest frame.
- **Everything is configurable**: every new action/effect comes with its own settings and good defaults.
- **One scene** (16:9 by default, any size), reused and growing; actions use the whole scene; exports keep
  scene size and placements for what comes next.
- **One style**: crisp pixel art, ice-coloured light on pure black, smooth motion; the blob has eyes only
  (no mouth or nose); objects look solid and float (no gravity).

## Commands

```bash
npm install          # once (esbuild)
npm run build        # -> dist/couveuse.html (self-contained page: engine bundled + UI inlined)
npm test             # seam tests, pixel-exact; must print "all seams exact"
npm run check:fx     # pixelfx contract checks on our effects (warnings about speed are fine)
npm run render -- creature/ice-blob-loops --max 16 --zoom 2   # contact sheet in pixelfx/records/
```

Open `dist/couveuse.html` directly in a browser to try it. There is no dev server.
After any change to an effect or to `app/`, run `npm run build && npm test`.

## Layout

- `pixelfx/` vendored pixelfx library (MIT, see `pixelfx/LICENSE`). Core in `pixelfx/src/core/`.
  Only our effects are ours:
  - `pixelfx/src/fx/spawn/ice-spirit-gestation.js` — tab **Naissance** (birth, box-drawn)
  - `pixelfx/src/fx/creature/ice-blob-idle.js` — tab **Blob né**; the blob itself (exports `blobBack`, `blobFront`, `state`, `ambient`, `NONE`)
  - `pixelfx/src/fx/creature/ice-blob-actions.js` — tab **Actions** (18 actions; exports `hsl`, `fromHsl`, `walkRoute`)
  - `pixelfx/src/fx/creature/ice-scene-objects.js` — tab **Objets** (solids, appear/remove; exports `drawObject`)
  - `pixelfx/src/fx/creature/ice-blob-loops.js` — tab **Boucles** (18 endless activities)
  - `pixelfx/src/fx/creature/ice-blob-clock.js` — tab **Heure** (shows the time)
  - `ice-spirit-birth.js` is the first, abandoned birth version; ignore it.
- `app/main.js` the whole UI (state, controls, render pipeline, GIF encoder, export). `app/index.template.html` HTML + CSS.
  `app/entry.js` lists what the page imports from pixelfx (global `PFX`). `app/build.mjs` inlines it all.
- `tests/seams.mjs` seam tests. `tests/browser_export.py` optional end-to-end export test (Playwright).
- `docs/VISION.md` the goals and requirements. `docs/ARCHITECTURE.md` how the UI and the effects fit together. `docs/SEAMLESS.md` the loop rules in detail.

Read the relevant doc before a non-trivial change; don't load every file.

## The rules that must never break (see docs/SEAMLESS.md)

1. Every periodic motion runs a **whole number of turns per loop** (`Math.round` the counts). Noise is read on a
   circle of time (`ln(x, y, u, seed, r)` with `u = t / D`), never on a line.
2. Actions, clock, object appear/remove: every modifier is **exactly neutral at progress 0 and 1**
   (envelopes from `seg`/`plateau`/`bump`, integer rotations). Their length is a **whole number of idle loops**
   and the frame count is `loops * round(D * fps)`, so their first/last frames equal the idle's.
3. The **lead-out** of an action is never shorter than a light drop's life (1.7 s): `prog()` does this. Drops born
   while an action is active are hidden with `quiet: 1`.
4. Particles use `cycle(t, period, …)` with the loop's period; one-shot effects end before progress 1.
5. GIFs get **one palette per frame** computed from that frame only: identical frames encode identically, so
   chained GIFs join exactly. Don't go back to a global palette.

If `npm test` reports a FAIL, fix the effect — never loosen the test.

## Gotchas learned the hard way

- `p.disc(x, y, r, c, a)` needs the alpha `a` (no default) or nothing is drawn.
- Colours given to the painter must be numbers: after a hue shift wrap with `hex(fromHsl(...))`, or pass the
  strings through `fit(...)`. Strings fail silently.
- `p.dot` dithers with its alpha; for crisp pixel art prefer `p.px` with full colours, use `p.blend` for true translucency.
- Bodies are drawn pixel by pixel in body space (`toBody`/`toScreen`); keep loops bounded to the body's extent.
- UI: `setV(k, v)` routes a key to the right store (`S.shared`, `S.blob`, `S.actions`, `S.objects`, `S.loops`, `S.clock`)
  per tab; add new keys to the tab's `*_KEYS` set or they land in `S.blob`.
- UI: controls may be missing on some tabs — wire them with `on(id, event, fn)`, never `$(id).onclick =` directly.
- UI: distances the user sets in **% of the scene** are converted to effect pixels in `effOpts()`.
- `localStorage` key is `couveuse-v3`; `sanitize()` must merge old saves with new defaults.

## Conventions

- Pixel art: hard ramp steps from the 8-colour palette (`fit(palette, 8)`), 1 px rims lit top-left, glow via
  `p.glow` (light buffer), no anti-aliasing.
- French UI text uses typographic punctuation: ’ for apostrophes, « » for quotes. Keep straight quotes in code.
- New effect options need a default in `meta.options`, and in the UI a row in the tab's params list.
- Keep effects pure functions of `(t, options)`: no state between frames, no `Math.random()` (use `rng(seed, …)`).
- Small, focused changes; run the seam tests after each one.

## Adding things (recipes in .claude/commands/)

- `/new-action` an action that leaves and comes back to rest.
- `/new-loop` an endless activity.
- `/check` build + seam tests + fx checks, then report.
