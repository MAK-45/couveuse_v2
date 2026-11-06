# Couveuse

Pixel-art creature of ice-light (a "blob") and a single-page web editor that tunes it and exports
**seamless** GIF / PNG sprite sheets / JSON. The UI is in **French**; code and comments are in English.

## Always ask first: from rest, or free loop?

Before building **any new animation** (a new tab, action, loop, effect or animation inside a tab), **ask the author**
which kind they want, and wait for the answer — never pick for them:
- **From the Blob né's rest and back** (chains): the first and last frames are exactly the Blob né's, like Actions,
  Heure and Électricité, so GIFs placed end to end chain (rest → animation → rest). Test it against the idle's frames.
- **Free endless loop**: it only has to loop on itself with no seam, like Boucles; it need not start or end on the
  Blob né's frame. Test frame t against t + T.

Ask in French, e.g. « Tu veux une boucle parfaite qui part du blob né et y revient (pour enchaîner les GIF), ou une
animation en boucle libre qui n’a pas besoin de partir du blob né ? »

## Use the pixelfx skill for every effect

Whenever you create or change an effect, animation or anything drawn (new tab, action, loop, object, style),
**load the `pixelfx` skill first** (Skill tool, `anthropic-skills:pixelfx`) and follow its draft → render → look →
refine loop: render contact sheets (`npm run render`), look at them, and fix what looks wrong before handing over.
The pixelfx core is vendored in `pixelfx/`; the skill is the authority on how to use it and how to make effects look
hand-animated.

## After every change: give the author the live artifact

Every time you change something the author can see (an effect, the UI, a setting), finish by publishing the page so
they can test it live: `npm run build && npm test`, then publish `dist/couveuse.html` with the Artifact tool and give
the link in the reply. Keep the same artifact (same file path in this session; from a new session pass
`url: https://claude.ai/artifact/5HNUpL3pxyw7Q51r4jnzWQ`, read it first) so the link never changes, and keep the
`downloads` capability declared (the exports save through it). Say what to try in it.

## What the author wants (full version: docs/VISION.md — read it before adding a feature)

Bring a little creature of ice-light to life in a scene and produce all its animations from **one web
interface**, as **perfect endless loops**, to reuse elsewhere (GIFs pasted end to end, sprite sheets + JSON).
- **Perfect loops, always**; and anything the blob *does* (actions, clock, objects appearing/disappearing)
  (electricity too) starts and ends exactly at its rest, so GIFs chain. Only the Boucles tab is free of the rest frame.
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
  - `pixelfx/src/fx/creature/ice-blob-actions.js` — tab **Actions** (19 actions; exports `hsl`, `fromHsl`, `walkRoute`, `portalSpots`)
  - `pixelfx/src/fx/creature/ice-scene-objects.js` — tab **Objets** (solids, appear/remove; exports `drawObject`)
  - `pixelfx/src/fx/creature/ice-blob-loops.js` — tab **Boucles** (18 endless activities)
  - `pixelfx/src/fx/creature/ice-blob-clock.js` — tab **Heure** (shows the time)
  - `pixelfx/src/fx/creature/ice-blob-electric.js` — tab **Électricité** (8 electric animations, rest → electricity → rest like actions; own colours `elCore`/`elColor`/`elGlow`)
  - `pixelfx/src/fx/creature/ice-blob-portal.js` — tab **Portail** (the blob opens a portal onto a world: `open` from rest, `live` portal open, `close` back to rest; `cross` from `live` through the portal, with its mirror image, out of a mirrored portal into `beyond` = its rest in the other world; then `reopen` (a portal home, our void inside) → `beyondOpen` (loop) → `return` back through to the Blob né's rest, or to `live` with `returnKeep`; 3 open + 3 close styles, 5 shapes)
  - `pixelfx/src/fx/creature/ice-blob-explore.js` — tab **Action monde** (the blob explores a world, free endless loop: `move` = it stays on its spot while the world scrolls past (`worldFor()`, wDrift from `exSpeed`, `wAllMove`), one speed drives the world and the blob's deformation (`pace()`: surges warp the world's clock by a sine that integrates to zero over the loop); 5 speed styles `comet`/`stretch`/`ghosts`/`shock`/`flame`; also `look` (still world, camera glides on a figure of eight, stars bloom for it to stare at), `swim` (strokes: the world's clock warped by two zero-mean harmonics), `turns` (slalom: the camera sways across its way, `trFollow` shares the swing with the blob, trail as the world carried it) and `collect` (stars come with the world, it darts across and gulps them); shared helpers `travel`/`dropMods`/`speedLines`/`shedSparks`; keys start with `ex`, `lk`, `sw`, `tr`, `cl`)
  - `pixelfx/src/fx/creature/ice-worlds.js` — tab **Mondes** (backdrops seen only through portals; `renderWorld()` draws a window of a world in depth layers with a camera; type `space` for now; two states, `wState` "still" (lives in place) or "moving" (travels at `wDrift`); every world key starts with `w`)
  - `pixelfx/src/fx/creature/ice-surface.js` — tab **Surface planète** (planet surfaces seen from the ground; type `plain` for now:
    banded sky, sun/moon, clouds, ridged mountains with snow, hills, three meadows at depths 0.45/0.7/1 with lake, ponds, trees,
    rocks, flowers, tall grass at 1.35 in front, motes, birds; `renderSurface()` has the same shape as `renderWorld()`, which
    dispatches to it for surface types; only sideways travel; sizes in % of the scene's height; every hash reads `wrap(lx, T)`)
  - `ice-spirit-birth.js` is the first, abandoned birth version; ignore it.
- `app/main.js` the whole UI (state, controls, render pipeline, GIF encoder, export). `app/index.template.html` HTML + CSS.
  `app/entry.js` lists what the page imports from pixelfx (global `PFX`). `app/build.mjs` inlines it all.
- `tests/seams.mjs` seam tests. `tests/browser_export.py` optional end-to-end export test (Playwright).
- `docs/VISION.md` the goals and requirements. `docs/ARCHITECTURE.md` how the UI and the effects fit together. `docs/SEAMLESS.md` the loop rules in detail.

Read the relevant doc before a non-trivial change; don't load every file.

## The rules that must never break (see docs/SEAMLESS.md)

1. Every periodic motion runs a **whole number of turns per loop** (`Math.round` the counts). Noise is read on a
   circle of time (`ln(x, y, u, seed, r)` with `u = t / D`), never on a line.
2. Actions, clock, electricity, object appear/remove: every modifier is **exactly neutral at progress 0 and 1**
   (envelopes from `seg`/`plateau`/`bump`, integer rotations). Their length is a **whole number of idle loops**
   and the frame count is `loops * round(D * fps)`, so their first/last frames equal the idle's.
3. The **lead-out** of an action is never shorter than a light drop's life (1.7 s): `prog()` does this. Drops born
   while an action is active are hidden with `quiet: 1`.
4. Particles use `cycle(t, period, …)` with the loop's period; one-shot effects end before progress 1.
5. A world loops over a whole number of the blob's loops (`wLoops`): layers scroll by whole tiles, the nebula's warp turns
   round a circle of time. In the portal's `open` its clock is set back by the animation's length so it hits 0 on the last
   frame, where `live` starts. In `cross` it runs a little faster or slower mid-way (smallest shift) so it is back at 0 at the end,
   where `beyond` starts. A still world never translates; only a moving one scrolls. The world is pinned to the scene (`o.room`).
6. GIFs get **one palette per frame** computed from that frame only: identical frames encode identically, so
   chained GIFs join exactly. Don't go back to a global palette.

If `npm test` reports a FAIL, fix the effect — never loosen the test.

## Gotchas learned the hard way

- `p.disc(x, y, r, c, a)` needs the alpha `a` (no default) or nothing is drawn.
- Colours given to the painter must be numbers: after a hue shift wrap with `hex(fromHsl(...))`, or pass the
  strings through `fit(...)`. Strings fail silently.
- `p.dot` dithers with its alpha; for crisp pixel art prefer `p.px` with full colours, use `p.blend` for true translucency.
- Bodies are drawn pixel by pixel in body space (`toBody`/`toScreen`); keep loops bounded to the body's extent.
- UI: tabs Mondes and Surface planète share `S.worlds.list` (portals and Action monde pick from all of it); each tab shows its
  own types (`tabOfType()`), has its own selection (`sel` / `selSurf`, via `selKey()`) and `isWorldTab()` covers both.
- UI: `setV(k, v)` routes a key to the right store (`S.shared`, `S.blob`, `S.actions`, `S.objects`, `S.loops`, `S.clock`, `S.elec`, `S.portal`, `S.explore`, the selected world of `S.worlds`)
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

First ask: from rest and back, or free loop? (see « Always ask first » above). Load the `pixelfx` skill.
When done: build, test, publish the artifact and give the link.

- `/new-action` an action that leaves and comes back to rest.
- `/new-loop` an endless activity.
- `/check` build + seam tests + fx checks, then report.
