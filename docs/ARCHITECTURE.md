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

## The new forms (the creature in every tab)

Every tab that draws the creature (actions, objects, loops, clock, electricity, portal, world actions) calls
`bodyBack(p, t, o, M, C, T, part)` / `bodyFront(p, t, o, M, C, T)` / `bodyAmbient(...)` from `ice-blob-transform.js`
instead of the idle's functions. With `o.form` "human" (levitating) or "grounded" (on its legs, on its floor of ice) they
draw the Transformation's figure, fully formed (c = 1), through the same `build()` as that tab's `live` loop:

- `formFrame(o, t, M, T)`: the idle state with the tab's modifiers, the figure's clock `figClock(o, t, T)` (nudged so a
  T-long animation lands back on the live loop), the walking speed; cached for back, front and copies.
- the modifiers act on the figure: levitating, it moves, squashes (60 %), turns and scales as the blob; on its legs
  `grounding(..., xm)` + `walking()` turn `dx` into steps, `dy < 0` into a jump (feet leave the floor, `X.air`), `dy > 0`
  and squash into bent knees, `rot` into a lean of the upper body (`X.lean`, `turnParts`) or a flip in the air, `grow`
  into a scale round the floor under it; `morph`/`shape` blend the figure into the blob's shape (`k = 1 - morph`).
- figure-only modifiers: `armUp`, `armOpen`, `hold`, `reach` + `reachK` (arm angles blended in `posed()`), `legs` / `arms`
  (pose overrides), `seat` (on its legs: sits cross-legged on its floor), `gait` (on its legs: walks or runs, see below).
- **walking and running** (`m.gait`): `strider()` draws the figure side on, posed by `gaitPose()`: a person's gait at that speed
  (`gaitK()`: stance share, knee bend over the stance, foot pitch, swing lift, lean, arm swing), the foot rolling heel → flat →
  ball while the ground carries it back at the stride's speed, where it lands worked out by `gaitSolve()` so the hips ride
  smoothly from leg to leg (and fly between the steps when running), the legs solved from the hips, the swinging foot on a smooth
  path that clears the ground. The near arm is a layer in front of the body (`As`), the far arm and leg one behind it (`Fs`),
  drawn by `limbs()`; `gaitFx()` lays prints of light on the ground. `gaitPlan(o, kind, P, T, kmh, stride)` gives a tab whole
  strides and whole tiles of ground a loop. `o.grNoFloor` (a planet's ground under its feet) leaves out the floor of ice.
- `bodyFront` returns the state with `x, y` at the middle of the body and `hands`, `head`, `headR`, `feet`, `top`, `floor`,
  `U`, so a tab's effects come from its hands or sit on its head; `formExtent`, `formCentre`, `formMask` (afterimages),
  `floorFor` help tabs and the page.
- each module's `FORM_FIT[form][name]` says, in French, what can't be done in a form and why (the effect then rests).

In the page, the form is `S.shared.bodyForm`, picked in a « Forme » group at the top of those tabs; the figure's settings
always come from `S.transform` (merged in `effOpts()`).

## Effect modules

| File | Tab | Shape of an entry |
|---|---|---|
| ice-blob-actions.js | Actions | `A.name = (o) => ({ mods(t), back?(p,C,t,st), front?(p,C,t,st), copies?(t), palette?(t) })` |
| ice-blob-loops.js | Boucles | `L.name = (o) => ({ mods(t), back?, front? })`, phase via `phase(o, t)`; `walk`/`run` (`gaitLoop`) pass `m.gait` from `gaitPlan()` with the scene's tile, on the spot |
| ice-scene-objects.js | Objets | `objects[]` list; `mode` live / appear / remove; `appearing()` / `removing()` per style |
| ice-blob-electric.js | Électricité | `L.name = (o) => ({ mods(t), charge(t), back?(p,C,V,t,st), front? })`; `V` = electricity colours, `charge` tints the blob; bolts via `zap()` reseeded `flick()` times a loop. Runs as an action: time is `prog()`, `presence()` fades it in/out and `settle()` brings every modifier back to neutral |
| ice-blob-portal.js | Portail | `mode` open / live / close / cross / beyond / reopen / beyondOpen / return (`wayOf()` gives the way in and out, so the crossing runs both ways); `crossing()` + `crossMods()` + `reflect()` (the mirror image, drawn into a scratch frame and copied flipped inside the portal) for the way through; `opening()`/`closing()` give the portal's shape over progress, `drawPortal()` draws the world inside (via `renderWorld`), the inner lip, the rim and its flames, `castFx()` the ray and flashes. `total(o)`: live = the world's period |
| ice-blob-explore.js | Action monde | `X.name = (o) => ({ mods(t), world(t) → { w, wt }, calm, back(p,C,Cf,t,st,M), front(...) })` (`world` gives the world and its clock for that frame: camera moves go in `wCamX/wCamY`, periodic; `calm` shows the idle's motes); actions move, look, swim, turns, collect, walk, run (`Cf` = palette shifted by `exHue`); walk and run (`gaitAct`, figure on its legs only) move the world at the speed of its steps (`gaitPlan`, `groundDepth`: the meadow under its feet goes by at the stride's speed), and on a planet's surface what stands nearer to us than its feet is painted after it (`paintWorld(..., split)`). Free loop over `loops` blob loops; the world from `worldFor(o)` (moving at `exSpeed × exDrift` scenes a blob loop, against `exDir`), its clock warped by `pace(o,t).x` for the surges; `pace(o,t).k` = how much the body shows the speed |
| ice-blob-transform.js | Transformation | `mode` transform / live / revert, `form` human (levitating) or grounded (on its legs on a floor, with gravity: `gravityAt(o, c)` gives the timeline — shape taken in the air over `formOf()`, floor, fall, landing — `grounding()` where gravity puts it, `stander()` the figure with legs solved from the feet up, `floorFx()` / `landFx()` the floor and the landing; `o.room` = the scene for the floor). The body is a distance field: the blob's outline (`r - rad(th)`) blended (`kb`) with the figure's (`human(o, st, h, P, g)`: round cones and ovals, smooth union, posed at the form's clock `h`, parts grown out by `g`); `build()` fills the field over the pixels it covers, `body()` lights it like the blob (rim, ramp steps, currents, heart of light, plus a body-wide gradient for the thin limbs), the hair is a second field drawn behind. `chore(o, c, style)` is the change at c (0 blob, 1 new form) for `grow` / `flash` / `spiral` (the spiral cuts at a rising line instead of blending); at c = 0 the idle's own `blobBack/blobFront` draw it. `total(o)`: live = `liveLoops` blob loops |
| ice-worlds.js | Mondes | `renderWorld(w, wt, P, T, X0, Y0, bw, bh, cam, dims, split)` → `{ col, lit }` for a window of scene cells; layers at depths shifted by voyage + camera (parallax); `WORLD_TYPES`, `DEFAULTS`, `worldOf()`, `worldPeriod()`, `isSurface()`, `groundDepth()`; `paintWorld(p, w, wt, P, room, view, split)` |
| ice-surface.js | Surface planète | `renderSurface(w, wt, P, T, X0, Y0, bw, bh, cam, dims)` → `{ col, lit }`, called by `renderWorld` for surface types (`plain`); `dims` = the scene's size in cells (horizon, sun, sizes in % of its height). Layers back to front: sky, stars, sun/moon, birds, clouds (wind = whole tiles a loop), mountains (0.12), hills (0.3), meadows (0.45, 0.7, 1) with their lake/ponds/flowers/rocks/trees, tall grass (1.35), motes. Only the sideways part of a heading moves it. `split` (someone standing at a row): "back" leaves out what stands up nearer to us (only its shadow), "front" draws only that on transparency; `groundDepthAt()` |
| ice-blob-clock.js | Heure | 5x7 font, cells laid out by `layout()`, styles in `drawCells()`, timetable in `phases()` |

`prog(o, t)` (actions, objects, clock) maps time to the action's progress 0..1 inside the lead-in/lead-out.
`total(o) = duration * loops`.

## The page (app/main.js)

Sections, in order (search for `// ----`):

1. Constants: palettes, ratios, `SHARED_DEF` (scene/export settings shared by all tabs), `PER_DEF`.
2. `ANIMS` registry: `{ name, fx, file, id, mode: "box" | "scene", groups }`. Tabs: birth, blob, actions,
   objects, loops, clock, elec, portal, explore, transform, worlds, surface (the worlds of `S.worlds` whose type is a planet surface). `mode: "box"` = drawn in its own square zone and blitted (birth only);
   `"scene"` = drawn across the whole scene at `1/scale` resolution and upscaled.
3. Per-tab UI tables: `ACTION_LIST/ACTION_PARAMS`, `LOOP_LIST/LOOP_PARAMS`, `OBJ_ROWS`, `clockGroups()`…
   A row is `[key, label, min, max, step, unit]` (slider) or `[key, label, { select | color | button }]`.
   Units with special read-outs: `" % pos x"`, `" % pos y"`, `" % de la scène"`, `" % de la largeur"`,
   `" % de la hauteur"`, `" part"`, `" % (sol)"`.
4. State `S = { anim, shared, birth, blob, actions, objects, loops, clock, elec, portal, worlds }`
   (`worlds = { list: [{ id, name, wType, w… }], sel, nextId }`; the portal picks one with `pWorld`) saved in `localStorage`
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
