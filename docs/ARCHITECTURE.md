# Architecture

## Two halves

**Effects** (`pixelfx/src/fx/...`) are pure pixelfx effects: `meta` (name, size, duration, `options`) plus
`drawBack(p, t, o)` and `draw(p, t, o)` drawing with a pixelfx Painter `p` placed at the creature's spot
(local coords, y down). They run in Node (tests, `pixelfx/tools/render.mjs`) and in the browser.

**The page** (`app/main.js`) holds the settings, builds the controls, renders frames with the effects, previews
them and exports them. `app/build.mjs` bundles `app/entry.js` (the effects + core helpers) into a global `PFX`
and inlines everything into `dist/couveuse.html`.

## The blob and its modifiers

`ice-blob-idle.js` draws the blob from `state(o, t, M)`:
- its rest motion (bob, sway, noise wander), squash/stretch from its velocity, breath;
- an optional **modifier function** `M(t)` returning overrides, merged over `NONE`:
  `dx, dy, rot, sx, sy, grow, morph, shape, shut, happy, vis, halo, glow, lookX, lookY, quiet, eyeScale, tw`
  (`tw` = the blob's own clock, used by the freeze action; `quiet` hides drops born at that time).

Actions, objects, loops and clock all draw the same blob with `blobBack(p, t, o, M)` / `blobFront(p, t, o, M)`
and only supply `M` plus their own extra drawing (`back`/`front` hooks). `ambient()` draws the floating motes.

## Effect modules

| File | Tab | Shape of an entry |
|---|---|---|
| ice-blob-actions.js | Actions | `A.name = (o) => ({ mods(t), back?(p,C,t,st), front?(p,C,t,st), copies?(t), palette?(t) })` |
| ice-blob-loops.js | Boucles | `L.name = (o) => ({ mods(t), back?, front? })`, phase via `phase(o, t)` |
| ice-scene-objects.js | Objets | `objects[]` list; `mode` live / appear / remove; `appearing()` / `removing()` per style |
| ice-blob-clock.js | Heure | 5x7 font, cells laid out by `layout()`, styles in `drawCells()`, timetable in `phases()` |

`prog(o, t)` (actions, objects, clock) maps time to the action's progress 0..1 inside the lead-in/lead-out.
`total(o) = duration * loops`.

## The page (app/main.js)

Sections, in order (search for `// ----`):

1. Constants: palettes, ratios, `SHARED_DEF` (scene/export settings shared by all tabs), `PER_DEF`.
2. `ANIMS` registry: `{ name, fx, file, id, mode: "box" | "scene", groups }`. Tabs: birth, blob, actions,
   objects, loops, clock. `mode: "box"` = drawn in its own square zone and blitted (birth only);
   `"scene"` = drawn across the whole scene at `1/scale` resolution and upscaled.
3. Per-tab UI tables: `ACTION_LIST/ACTION_PARAMS`, `LOOP_LIST/LOOP_PARAMS`, `OBJ_ROWS`, `clockGroups()`…
   A row is `[key, label, min, max, step, unit]` (slider) or `[key, label, { select | color | button }]`.
   Units with special read-outs: `" % pos x"`, `" % pos y"`, `" % de la scène"`, `" % de la largeur"`,
   `" % de la hauteur"`, `" part"`, `" % (sol)"`.
4. State `S = { anim, shared, birth, blob, actions, objects, loops, clock }` saved in `localStorage`
   (`couveuse-v3`), merged by `sanitize()`. `V` is the flat view the current tab reads (`refreshV()`);
   `setV()` writes back to the right store. Actions/objects/loops/clock borrow the blob's look from `S.blob`.
5. Controls: `buildControls()` → `group()` + `rowFor()`; `wire()` hooks shared controls (guarded by `on()`).
6. Rendering: `effOpts()` builds the effect's options from `V` (converts % of scene to effect pixels, clamps
   paths into the scene). `renderScene(anim, o, t, bg)` → RGBA scene buffer; `getScene(i)` caches frames.
   Placement grid (`grid()`) keeps the creature centre on the same scene pixel in every tab, so tabs chain.
7. Guides (preview only), dragging (creature, action targets, objects), playback.
8. Export: `allFrames()`, `makePng()` (sprite sheet), `makeJson()` (Aseprite-style + `meta.pixelfx` with scene,
   placement, chain info, settings), `makeGif()` (own encoder: median cut + LZW, **local palette per frame**).
   Saving goes through `window.claude.use("downloads")` when hosted on claude.ai, else a plain download link.

## Adding a tab (outline)

1. Effect file in `pixelfx/src/fx/creature/`, export it in `app/entry.js`.
2. In `main.js`: `ANIMS.x = {...}`, a `X_KEYS` set + `xDef()`, add to `fresh()`/`sanitize()`, routing in
   `refreshV()`/`setV()`, a `xGroups()` builder, branches in `buildControls()`, `loopsOf()`, `effOpts()`, `base()`.
3. Tab button in `app/index.template.html`.
4. Seam test in `tests/seams.mjs`.
