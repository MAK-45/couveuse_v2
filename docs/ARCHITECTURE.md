# Architecture

How the page, the life engine and the effects fit together, and where to add things. Why every join is exact is in
SEAMLESS.md; the words are in GLOSSARY.md.

## Two halves

**Effects** (`src/<concept>/`) are pixelfx effects: `meta` (name, size, duration, `options`) plus `drawBack(p, t, o)` and
`draw(p, t, o)`, drawing with a pixelfx painter placed at the creature's spot (local px, y down). They are pure functions
of (t, options): they run in Node (tests, `npm run render`) and in the browser, and import the pixelfx core from
`pixelfx/` (never edited; `tools/fxdir.mjs` points pixelfx's own render and check tools at `src/`).

**The page** (`app/main.js`) holds the settings, builds the controls, makes the creature live (Vivre, through
`life/life.js`), previews each animation on its settings page and exports it. `app/build.mjs` bundles `app/entry.js` (the
effects, as the global `PFX`) and inlines everything into `dist/couveuse.html`.

## Fiches and catalogues (actions, loops)

An action or a loop is a **fiche**, one file: its id, its kind, its card (French name and description), its options
(default, row on its page, unit, how the page sets it: `shared/_fiche.js`), `formFit` (the forms that can't play it, and
why) and `play`. Its host builds everything else:

- `actions/_action.js`: `action(def)` gives it its length (whole blob loops, or what its way takes for kind "move"), its
  progress `prog(t)` (a lead-in of at least 0.12 s, a lead-out of at least 1.7 s), the rest when its form can't play it,
  and makes the fiche a pixelfx effect. `family(list)` is the actions page's effect, playing the fiche `o.action` names.
- `loops/_loop.js`: `loop(def)` gives it its period and its three parts (`o.part` "enter" / "loop" / "exit": the
  activity's intensity from `phases()` draws its modifiers back to rest with `settle()` and fades its drawing; a pose
  is taken little by little with it, `poseK`, the figure going part by part from its rest pose to the activity's), and the rest when its form can't play it. `family(list)` is the loops page's effect
  (`o.loop`). `loops/_gait.js` gives walking and running their own entry and exit (a quarter turn, steps on a
  `gaitLine`).
- `shared/_creature.js`: the one adapter that draws the creature for every page: its body in its form (`bodyBack` /
  `bodyFront` / `bodyAmbient`, forms.js) moved by the animation's modifiers, the motes round it, then the animation's own
  drawing behind and in front (`st`: where its body, hands, head and feet are).

The **catalogue** is the list in `actions/index.js` and `loops/index.js`. The page reads it (Vivre's cards, the settings
pages, their rows, units and defaults), the life reads it (`CATALOG`), the tests walk it. The clock and the objects are
pages of their own that draw the creature through the same adapter.

## The life (page Vivre)

`life/life.js` keeps a **score**: segments laid end to end; a frame is a pure function of (t, score).

- A **hub** is a rest `{ form, pos, since, look }`: its form, where it stands (`pos`, whole px from its home spot), when this
  rest began, its look (its eight tones and its eyes, `shared/_look.js`). Its beats are `since + n · R` (R: the blob's loop, or the figure's live loop). The rest is drawn by the
  objects page's live scene with nothing in it.
- A **segment** `{ at, len, kind, mod, o, hub0, hub1, label }` plays one page's animation with that page's options:
  "once" (actions, clock), "move" (« Se déplacer »: the hub after it has the new `pos`), "enter" / "loop" (repeated until
  something else is asked) / "exit", "transform" / "revert", "appear" / "remove". It starts on a beat of hub0.
- `want(L, req, now)` closes a loop going on after its turn, then `plan()` lists the steps the request needs (revert,
  transform…) and `segment()` builds each one from the next beat after `now + MARGIN`. `can()` says why not (in French),
  `status()` what it does and what follows, `snapshot()` what to keep, `trim()` and `clearQueue()` forget.
- **Things** (objects) `{ id, ob, born, dying }` stay where they were made. The engine draws them after the module's back
  and front layers; during "appear" and "remove" the objects page draws them all.
- **Looks**: an action of kind `look` (« Changer de couleur ») and a `recolour` step (asked by the blob's page when its
  colours are set by hand, once nothing else is asked) end at a rest with another look. `lookAt()` glides the tones from
  one look to the next in the segment's window; the creature glides its own body (`creature()` in `_action.js`), a
  recolour glides the rest it draws, and things glide with them. Pages draw the look they are given (`withLook`).
- **Options**: `cfg.optsFor(tab, pick, hub)`. The page's is `optsAs()`: that page's own `effOpts()` for that spot, so a
  life plays exactly what each page shows. The tests and the render tool use `plainOpts()` (each module's defaults).

## The forms

`forms/forms.js` is the Transformation page (`transform` → `live` → `revert`, styles `grow` / `flash` / `spiral`) and the
form engine of every page. `FORMS` lists them: "blob", "human" (levitating) and "grounded" (on its legs on a floor of ice,
with gravity: it falls, lands and stands). The body is a distance field: the blob's outline blended with the figure's
round cones and ovals (`human()`, `stander()`), lit like the blob; `chore(o, c, style)` is the change at c (0 blob, 1 the
new form), neutral at both ends.

- `bodyBack` / `bodyFront(p, t, o, M, C, T)` draw the creature in `o.form` with an animation's modifiers `M`: the blob's
  own drawing, or the figure, its clock nudged by `figClock` so a T-long animation ends on its live loop. They return
  `st` (the middle of the body, `hands`, `head`, `feet`, `floor`…).
- Modifiers for every form: `dx, dy, ax, ay, rot, sx, sy, grow, morph, shut, happy, halo, glow, lookX, lookY, quiet,
  eyeScale`; for figures: `armUp, armOpen, hold, reach + reachK, legs, arms, seat`. On its legs `dx` becomes steps,
  `dy < 0` a jump, `dy > 0` bent knees, `rot` a lean.
- Walking and running (`m.gait`): side on (`strider()`), a person's gait at that speed (`gaitK()`, `gaitSolve()`,
  `gaitPose()`), prints of light on the floor (`gaitFx()`); `gaitPlan()` gives a loop whole strides and whole tiles of
  floor; a pace that changes follows a `gaitLine` (every foot stays where it came down); turning side on (`m.turn`)
  blends the figure facing us with the one side on.

## Modules

| File | Page | What it holds |
|---|---|---|
| src/shared/_time.js | — | `prog`, `leadIn` / `leadOut` (`LEAD_MIN`, `DROP_LIFE`), `settle`, `phases` |
| src/shared/_fiche.js | — | `options(spec)`: a fiche's defaults, page defaults and rows; `merged(list)` |
| src/shared/_creature.js | — | `creature(frame)`: the creature drawn by an animation, the same way in every page |
| src/shared/_color.js | — | `hsl`, `fromHsl`, `mixHex` |
| src/shared/_look.js | — | the creature's look (eight tones, two eyes): `lookOf`, `withLook`, `lookFor`, `mixLook`, `glide` |
| src/shared/_floor.js | — | rings on the floor, the runes standing on them, the motes rising off them (ground effects) |
| src/actions/ | Actions | `index.js` (the catalogue), `_action.js` (host), `move.js`, `aura.js`, `couleur.js`, `_template.js` |
| src/loops/ | Boucles | `index.js`, `_loop.js` (host), `_gait.js`, `sleep.js`, `magic.js`, `walk.js`, `run.js`, `_template.js` |
| src/forms/forms.js | Transformation | the forms and the form engine (above) |
| src/blob/blob.js | Blob né | the blob at rest: `blobBack`, `blobFront`, `state`, `ambient`, eyes, sparks, drips |
| src/clock/clock.js | Heure | a 5×7 font laid out in cells, the ways it shows and hides the time |
| src/objects/objects.js | Objets | the solids (`SOLIDS`), `drawObject`, the appear and remove styles |
| src/birth/birth.js | Naissance | the birth, drawn in its own square zone (not part of the life) |
| src/life/life.js | Vivre | the life engine (above) |

## The page (app/main.js)

No tab bar: the page opens on **Vivre** (`S.anim = "life"`); every other page is a **settings page**, opened from Vivre
(`openPage(anim, pick)`: a card's ⚙, or a « Régler … » link) and left with « Revenir à la vie » or Escape
(`backToLife()`). Its sections, in order (search for `// ----`): constants and shared settings; `ANIMS` (one entry per
page); the catalogue (`FAMILIES`, `ficheOf`, `pageDef`, `sceneUnits`); each page's groups and rows; the state `S` (saved
in `localStorage`, `sanitize()`), its flat view `V` and `setV()`; the controls (`buildControls()`, `lifeControls()`);
rendering (`effOpts()`, `renderScene()`); dragging; the life (`optsAs`, `lifeAsk`, `lifeTick`); the exports (`makeGif()`
with one palette per frame, `makePng()`, `makeJson()`), saved through `window.claude.use("downloads")` on claude.ai.

## Extension points

- **An action, a loop**: a fiche made from `_template.js`, listed in its catalogue (skills `new-action`, `new-loop`). Its
  card, settings page, life and tests follow.
- **A form** (`new-form`): its figure in forms.js, its id in `FORMS`, its names in the page; every fiche plays it or says
  why in `formFit`; the tests and the life take it from `FORMS`.
- **A thing** (`new-thing`): an object shape is a solid in `SOLIDS` and a name in `SHAPE_LIST`; a companion is a new kind
  of thing with its own module, drawn by `thingsOn()`, planned by `plan()` / `segment()`, saved by `snapshot()`.
- **An animation that ends elsewhere** (like the move): kind "move", `moveOf` and `length` in its fiche; its last frames
  are its rest drawn there (`ax` / `ay`, a pure translation), and `segment()` gives the hub after it the new `pos`.
- **An action that changes the look** (kind `look`, like « Changer de couleur »): `look: { to(o), window: [a, b] }` in its
  fiche; its rest after it is that look (`to(o)`), and the life glides the tones in the window. Its test checks its last
  frame against the rest drawn in that look.
- **A new kind of step in the life** (a state such as sitting, holding a thing): a hub field if it is a rest of its own
  (its drawing in `rest()`, its beats in `restLen()`), its steps in `plan()` and `segment()`, its reasons in French, its
  requests in the tests' lives. Keep every join on a beat and the drawing order (module back, things back, module front,
  things front).
- **A new settings page**: its effect in `src/<concept>/`, exported in `app/entry.js`; in main.js its `ANIMS` entry, its
  keys and defaults, its groups, `PAGE_NAMES` / `PAGE_INTRO` and its way in from Vivre; its checks in the tests.
