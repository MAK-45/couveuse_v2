# Architecture

## Two halves

**Effects** (`src/...`) are pure pixelfx effects: `meta` (name, size, duration, `options`) plus
`drawBack(p, t, o)` and `draw(p, t, o)` drawing with a pixelfx Painter `p` placed at the creature's spot
(local coords, y down). They run in Node (tests, `npm run render`) and in the browser.

**The page** (`app/main.js`) holds the settings, builds the controls, makes the creature live (page Vivre, through the
life engine `ice-life.js`), previews each animation on its settings page and exports it. `app/build.mjs` bundles `app/entry.js` (the effects + core helpers) into a global `PFX`
and inlines everything into `dist/couveuse.html`.

## The life (tab Vivre)

`ice-life.js` makes the creature live: a **score** of segments laid end to end, a frame being a pure function of (t, score).

- A **hub** is a rest: `{ form, place, portal, pos, since, wt0 }` — its form (blob, human, grounded), where it is ("home" or a
  world's id), the portal open there (null; at home the world it opens onto; in another world "home"), where it stands in the
  scene (`pos`: whole px from its home spot, the same in every world), when this rest began and when it arrived in that world.
  At a `pos` the engine moves the painter for the module's layers (`at()`), and the options are worked out from there
  (the page's `optsAs` shifts `placement()` by `posShift`, so `room`, portals, floors and targets are the scene seen from
  there; `plainOpts` shifts `room`); worlds behind, things and the objects tab's objects stay where they are in the scene. Its rest is drawn by the objects tab's live scene with nothing in it (the form's own
  rest: `loops` = the live loop's length), or by the portal's "live" / "beyondOpen" while a portal is open. Its beats are
  `since + n · R` (R: the blob's loop, the figure's live loop, the world's loop).
- A **segment** `{ at, len, kind, mod, o, hub0, hub1, label }` plays one tab's animation with that tab's options:
  "once" (actions, electricity, clock), "move" (the action « Se déplacer »: from its rest here to its rest at `to`, the hub
  after it with the new `pos`), "enter" / "loop" (rep ∞ until something else is asked) / "exit" (loops),
  "transform" / "revert", "open" / "close" / "cross" / "reopen" / "return" (portal), "appear" / "remove" (objects).
  It starts on a beat of hub0 and ends on hub1's first beat.
- `want(L, req, now)`: a loop going on is closed after its current turn (its exit appended), then `plan()` lists the steps
  the request needs from the last hub (close a portal, revert then transform, reopen then return, open then cross...) and
  `segment()` builds each one, from the next beat after `now + MARGIN`. `can()` says why something can't be done (in
  French), `status()` what it does and what follows, `snapshot()` what to keep (the last hub, the things), `trim()`
  forgets what ended long ago.
- `CATALOG` is made from the modules' own lists (`ACTIONS`, `LOOPS`, `ELEC`, the clock); `whyNot()` reads their `FORM_FIT`
  and the loops' `PART_FIT`. Adding an action or a loop to its module puts it in Vivre.
- **Things** (objects; companions later): `{ id, ob, place, linked, born, dying }`. Present from the end of their "appear" to
  the start of their "remove", seen where the creature is if `linked` to that place, everywhere if not. The engine draws
  them after the module's back and front layers (`drawObject`), fading those of the world it leaves and of the one it
  reaches while it crosses; during "appear" / "remove" the objects tab draws them all (same order: by id).
- **Worlds**: in another world the engine paints the world behind (clock `t - wt0`, the portal tab's world and view) and its
  near part last (a figure on its legs on a planet: `grNoFloor`, trees and tall grass in front); the portal's own modes
  paint theirs (`frontLater` leaves the near part to the engine, `wClock0` starts "reopen" where the world is).
- **Options**: `cfg.optsFor(tab, pick, hub)`. The page's is `optsAs()`: it switches the page to that tab for a moment
  (`S.anim`, `V` with `pick`, the form in `S.shared.bodyForm`) and calls the tab's own `effOpts()`, so a life plays
  exactly what each tab shows. Tests and the render tool use `plainOpts()` (each module's defaults).

The page has no tab bar: it opens on Vivre, and every other tab is the **settings page** of one thing, opened from Vivre (the
⚙ on a card, or a « Régler … » link: `openPage(anim, pick)` selects the thing in that tab and shows it in the form the
creature is in), with « Revenir à la vie » in the header or Escape (`backToLife()`). A settings page shows that thing in a loop
in the preview, its settings, and the exports.

In the page, `lifeTick()` draws the frame of the time it is (`lifeNow()`: real time × speed, paused with Pause), the
buttons call `lifeAsk(req)`, `lifeStatus()` shows what it does and greys what it can't do, `lifeAuto()` lets it choose by
itself, `S.life` keeps the settings, the last hub and the things.

## Shared time (ice-time.js)

`prog(o, t, T)` (an animation's progress with its lead-in and a lead-out never shorter than a drop of light lives),
`presence(a, r)`, `NEUTRAL` + `settle(m, k)` (modifiers drawn back to rest by an intensity), and `phases(part, T, lead, pose)`:
the timetable of a loop's entry or exit (intensity k, and when the pose must change, a melt into light with `swap` at its
middle and `s` for where the light gathers; `meltAt` the melt itself).

## Loops in three parts (ice-blob-loops.js)

`o.part` "loop" (the activity itself), "enter" (from rest; the activity's clock is `t - T`, 0 on its last frame) or "exit"
(back to rest; its clock goes on from the loop's end). `modsOf()` lays the activity's modifiers over rest by k (`settle`),
adds its pose keys (`legs`, `arms`, `seat`) once `swap`, and while the pose changes sets `morph` (the melt) and, on its
legs, `anchor` (`formAnchor()`: where the frame and the middle of the body are in each pose) so the light doesn't jump;
`layer()` fades the activity's drawing by k. In the figure (`build()`), `m.anchor` gathers the frame and the blob's part as
it melts, and the light under its feet goes with its feet (`F.k`); the side-on limbs and the hair thin away as it melts.
Walking and running bring their own parts (`act.parts()` → `gaitParts()`): no melt but a quarter turn (`m.turn`), and their
steps on a `gaitLine` from standing still to the loop's pace (entry) or back (exit); `gaitLoops()` gives their entry and exit
the loops they need.

## The blob and its modifiers

`ice-blob-idle.js` draws the blob from `state(o, t, M)`:
- its rest motion (bob, sway, noise wander), squash/stretch from its velocity, breath;
- an optional **modifier function** `M(t)` returning overrides, merged over `NONE`:
  `dx, dy, ax, ay, rot, sx, sy, grow, morph, shape, shut, happy, vis, halo, glow, lookX, lookY, quiet, eyeScale, tw`
  (`tw` = the blob's own clock, used by the freeze action; `quiet` hides drops born at that time; `ax, ay` move the whole
  creature, its light on the ground, drops and motes included: at rest there it is its rest drawn there, pixel for pixel).

Every module that draws the creature supplies only `M` plus its own extra drawing (`back`/`front` hooks) and draws it
through `bodyBack` / `bodyFront` / `bodyAmbient` (ice-blob-transform.js), which are the idle's `blobBack` / `blobFront` /
`ambient` for the blob form and the figure for the human forms (see below). `ambient()` draws the floating motes.

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
- **a gait whose pace changes** (`m.gait.line`, `m.gait.t`): `gaitLine()` gives its pace s(t) in eased pieces, its cadence
  (slowing to `alpha` as it stops, so steps shorten as well as slow), strides c(t), the way gone d(t), and each step's length
  (`rho`); in `gaitPose()` every foot lands ahead of the hips by as much as its step and then stays where it came down (`step()`,
  `down()`), the hips held by the leg(s) down, the swinging foot lifted by how far it goes; arms, lean (into a start, back as it
  stops) and hair follow the pace. Joined to a loop (`cs`, `csInv`) the line is that loop's clock wherever it goes at its pace.
  On the spot the floor goes back by d(t); carried by `ax` along its floor (the move) the floor stays and the prints stay on it.
- **turning** (`m.turn` with `m.gait`): the figure facing us (narrowed as it turns away, `narrow()`) and the one side on
  (`moveFig()` into its space) are both built and their fields blend (`tb`), the side-on limbs growing out of the body, the eyes
  sliding round, the floor's glints and prints dimmed at the half-way switch of its footing: a quarter turn, never a melt.
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
| ice-blob-actions.js | Actions | `A.name = (o) => ({ mods(t), back?(p,C,t,st), front?(p,C,t,st), copies?(t), palette?(t) })`; `total(o)`; `move` ends elsewhere (`moveOf(o)`: where, inside `o.room`; `{ ax, ay }` once there; on its legs `walkTo()`: turn, `gaitLine`, turn back) |
| ice-life.js | Vivre | the life engine (see « The life »): `createLife(cfg)`, `want`, `can`, `status`, `snapshot`, `CATALOG`, `plainOpts`; `drawBack/draw` with `o.life` (or `o.script`) |
| ice-blob-loops.js | Boucles | `L.name = (o) => ({ mods(t), back?, front?, parts?(part, T) })`, phase via `phase(o, t)` (the activity's period `loopLen`); `o.part` loop / enter / exit, `total(o)` the part's length; `walk`/`run` (`gaitLoop`) pass `m.gait` from `gaitPlan()` with the scene's tile, on the spot, with a `gaitLine` (their own clock), and their own entry and exit (`parts`) |
| ice-scene-objects.js | Objets | `objects[]` list; `mode` live / appear / remove; `appearing()` / `removing()` per style |
| ice-blob-electric.js | Électricité | `L.name = (o) => ({ mods(t), charge(t), back?(p,C,V,t,st), front? })`; `V` = electricity colours, `charge` tints the blob; bolts via `zap()` reseeded `flick()` times a loop. Runs as an action: time is `prog()`, `presence()` fades it in/out and `settle()` brings every modifier back to neutral |
| ice-blob-portal.js | Portail | `mode` open / live / close / cross / beyond / reopen / beyondOpen / return (`wayOf()` gives the way in and out, so the crossing runs both ways); `crossing()` + `crossMods()` + `reflect()` (the mirror image, drawn into a scratch frame and copied flipped inside the portal) for the way through; `opening()`/`closing()` give the portal's shape over progress, `drawPortal()` draws the world inside (via `renderWorld`), the inner lip, the rim and its flames, `castFx()` the ray and flashes. `total(o)`: live = the world's period |
| ice-blob-explore.js | Action monde | `X.name = (o) => ({ mods(t), world(t) → { w, wt }, calm, back(p,C,Cf,t,st,M), front(...) })` (`world` gives the world and its clock for that frame: camera moves go in `wCamX/wCamY`, periodic; `calm` shows the idle's motes); actions move, look, swim, turns, collect, walk, run (`Cf` = palette shifted by `exHue`); walk and run (`gaitAct`, figure on its legs only) move the world at the speed of its steps (`gaitPlan`, `groundDepth`: the meadow under its feet goes by at the stride's speed), and on a planet's surface what stands nearer to us than its feet is painted after it (`paintWorld(..., split)`). Free loop over `loops` blob loops; the world from `worldFor(o)` (moving at `exSpeed × exDrift` scenes a blob loop, against `exDir`), its clock warped by `pace(o,t).x` for the surges; `pace(o,t).k` = how much the body shows the speed |
| ice-blob-transform.js | Transformation | `mode` transform / live / revert, `form` human (levitating) or grounded (on its legs on a floor, with gravity: `gravityAt(o, c)` gives the timeline — shape taken in the air over `formOf()`, floor, fall, landing — `grounding()` where gravity puts it, `stander()` the figure with legs solved from the feet up, `floorFx()` / `landFx()` the floor and the landing; `o.room` = the scene for the floor). The body is a distance field: the blob's outline (`r - rad(th)`) blended (`kb`) with the figure's (`human(o, st, h, P, g)`: round cones and ovals, smooth union, posed at the form's clock `h`, parts grown out by `g`); `build()` fills the field over the pixels it covers, `body()` lights it like the blob (rim, ramp steps, currents, heart of light, plus a body-wide gradient for the thin limbs), the hair is a second field drawn behind. `chore(o, c, style)` is the change at c (0 blob, 1 new form) for `grow` / `flash` / `spiral` (the spiral cuts at a rising line instead of blending); at c = 0 the idle's own `blobBack/blobFront` draw it. `total(o)`: live = `liveLoops` blob loops |
| ice-worlds.js | Mondes | `renderWorld(w, wt, P, T, X0, Y0, bw, bh, cam, dims, split)` → `{ col, lit }` for a window of scene cells; layers at depths shifted by voyage + camera (parallax); `WORLD_TYPES`, `DEFAULTS`, `worldOf()`, `worldPeriod()`, `isSurface()`, `groundDepth()`; `paintWorld(p, w, wt, P, room, view, split)` |
| ice-surface.js | Surface planète | `renderSurface(w, wt, P, T, X0, Y0, bw, bh, cam, dims)` → `{ col, lit }`, called by `renderWorld` for surface types (`plain`); `dims` = the scene's size in cells (horizon, sun, sizes in % of its height). Layers back to front: sky, stars, sun/moon, birds, clouds (wind = whole tiles a loop), mountains (0.12), hills (0.3), meadows (0.45, 0.7, 1) with their lake/ponds/flowers/rocks/trees, tall grass (1.35), motes. Only the sideways part of a heading moves it. `split` (someone standing at a row): "back" leaves out what stands up nearer to us (only its shadow), "front" draws only that on transparency; `groundDepthAt()` |
| ice-blob-clock.js | Heure | 5x7 font, cells laid out by `layout()`, styles in `drawCells()`, timetable in `phases()` |

`prog(o, t)` in each module maps time to the action's progress 0..1 inside the lead-in/lead-out (the shared
`prog(o, t, T)` of ice-time.js); `total(o)` is the animation's length, a whole number of the blob's loops (`duration * loops`,
or the part's length for loops, the live loop or the world's loop for the looping modes).

## The page (app/main.js)

There is no tab bar. The page opens on **Vivre** (`S.anim = "life"`); every other "tab" of the code is a **settings page**,
opened from Vivre (`openPage(anim, pick)`: the ⚙ of a card, or a « Régler … » link) and left with « Revenir à la vie » in the
header or Escape (`backToLife()`). `PAGE_NAMES` / `PAGE_INTRO` name and introduce each page; on a page a picker grid becomes
a one-line select (`COMPACT_PICK`); `settingsGroups()` builds the page's own groups (the « Forme » group first for the pages
that draw the creature, the place in the scene only on Apparence and Naissance), then `sceneGroup()` and `renderGroup()`,
closed. The exports (GIF, PNG, JSON) are on the settings pages only.

Sections, in order (search for `// ----`):

1. Constants: palettes, ratios, `SHARED_DEF` (scene/export settings shared by all tabs), `PER_DEF`.
2. `ANIMS` registry: `{ name, fx, file, id, mode: "box" | "scene", groups }`. Tabs: life (Vivre), birth, blob, actions,
   objects, loops, clock, elec, portal, explore, transform, worlds, surface (the worlds of `S.worlds` whose type is a planet surface). `mode: "box"` = drawn in its own square zone and blitted (birth only);
   `"scene"` = drawn across the whole scene at `1/scale` resolution and upscaled.
3. Per-tab UI tables: `ACTION_LIST/ACTION_PARAMS`, `LOOP_LIST/LOOP_PARAMS`, `OBJ_ROWS`, `clockGroups()`…
   A row is `[key, label, min, max, step, unit]` (slider) or `[key, label, { select | color | button }]`.
   Units with special read-outs: `" % pos x"`, `" % pos y"`, `" % de la scène"`, `" % de la largeur"`,
   `" % de la hauteur"`, `" part"`, `" % (sol)"`.
4. State `S = { anim, life, shared, birth, blob, actions, objects, loops, clock, elec, portal, explore, transform, worlds }`
   (`life`: Vivre's settings, the hub it is in and the things it made, kept for next time)
   (`worlds = { list: [{ id, name, wType, w… }], sel, nextId }`; the portal picks one with `pWorld`) saved in `localStorage`
   (`couveuse-v3`), merged by `sanitize()`. `V` is the flat view the current tab reads (`refreshV()`);
   `setV()` writes back to the right store. Actions/objects/loops/clock borrow the blob's look from `S.blob`.
5. Controls: `buildControls()` → Vivre's `lifeControls()`, or a settings page (`settingsGroups()`); then `sceneGroup()`,
   `renderGroup()`; `group()` + `rowFor()` make the rows; `wire()` hooks shared controls (guarded by `on()`).
6. Rendering: `effOpts()` builds the effect's options from `V` (converts % of scene to effect pixels, clamps
   paths into the scene). `renderScene(anim, o, t, bg)` → RGBA scene buffer; `getScene(i)` caches frames.
   Placement grid (`grid()`) keeps the creature centre on the same scene pixel in every tab, so tabs chain.
7. Guides (preview only), dragging (creature, action targets, objects; in Vivre a click places the next object), the life
   section (`optsAs`, `lifeStart`, `lifeAsk`, `lifeStatus`, `lifeAuto`, `lifeTick`, `lifeControls`), the navigation
   (`openPage`, `backToLife`), playback (`tick()`: Vivre draws its live time, a settings page its cached loop).
8. Export: `allFrames()`, `makePng()` (sprite sheet), `makeJson()` (Aseprite-style + `meta.pixelfx` with scene,
   placement, chain info, settings), `makeGif()` (own encoder: median cut + LZW, **local palette per frame**).
   Saving goes through `window.claude.use("downloads")` when hosted on claude.ai, else a plain download link.

## Adding an animation

An action, a loop or an electric animation: add it to its module (and its list) and to the page's list with its settings
(see .claude/commands): it plays in its tab and in Vivre, in every form, with no other change.

## Adding a settings page (a new kind of thing to tune)

1. Effect file in `src/creature/`, export it in `app/entry.js` (and add it to `check:fx` in package.json).
2. In `main.js`: `ANIMS.x = {...}`, a `X_KEYS` set + `xDef()`, add to `fresh()`/`sanitize()`, routing in
   `refreshV()`/`setV()`, a `xGroups()` builder, branches in `settingsGroups()`, `loopsOf()`, `effOpts()`, `base()`;
   `PAGE_NAMES.x` and `PAGE_INTRO.x`; its way in from Vivre (a section or a « Régler … » link in `lifeControls()` calling
   `openPage("x", pick)`). There is no tab button any more.
3. Seam test in `tests/seams.mjs`.
4. For Vivre: its step(s) in `ice-life.js` (`plan()`, `segment()`), its buttons in `lifeControls()`, a scenario in the life
   block of the seam tests.

## Extension points

- **An action, a loop, an electric animation**: its module and list, the page's list and params (`.claude/commands/new-action.md`,
  `new-loop.md`). It is in Vivre and on its settings page by itself.
- **A form** (`new-form.md`): `FORMS`, a figure builder chosen in `build()`, `isForm()`, `FORM_FIT` in every module, `FORMS` in
  ice-life.js, `TF_FORMS` / `BODY_FORMS` in the page. A **posture** of a form (a real sit) is a continuous pose parameter in its
  builder; loops then blend to it instead of melting through light (`POSE_KEYS`, `poseChange()` in ice-blob-loops.js).
- **A world** (`new-world.md`): `SURFACE_DEFAULTS` + `renderSurface()`, or `WORLD_TYPES` / `DEFAULTS` + `renderWorld()`; the page's
  `worldTypeName()` and `worldGroups()`. Portals, crossing and the life there need nothing more.
- **A thing** (`new-thing.md`): an object shape is a solid in `SOLIDS` + `SHAPES` (+ `SHAPE_OPTS`); a companion is a new `kind` of
  thing with its own module (rest loop, its animations from rest back to rest), drawn by `thingsOn()`, planned by `plan()` /
  `segment()`, saved by `snapshot()`, with the same `place` / `linked` rule.
- **An animation that ends somewhere else** (like the move): its module says where (`moveOf`) and how long (`total`), its last
  frames are its rest drawn there (`ax`/`ay`, a pure translation), its CATALOG kind is "move" and `segment()` gives the hub after
  it the new `pos`. Anything drawn of the creature must stay a pure translation of itself (no dither or hash reading an absolute
  column: read it from `room[0]`).
- **A new kind of step in the life** (a state such as sitting, holding a thing, a portal kept open...): a hub field if it is a
  rest of its own (with its rest drawing in `rest()` and its beats in `restLen()`), its transitions in `plan()` (the steps that
  reach it) and `segment()` (which module plays them, the hub after), `whyNot()` / `can()` reasons in French, a scenario in the
  tests. Keep every join on a beat and the drawing order (world, module back, things back, module front, things front, world's near part).
- **Exports of a stretch of life**: a frame is a pure function of (t, score), so any time window of a life can be rendered with
  `renderScene("life", { life }, t, bg)` and encoded like a settings page's frames.
