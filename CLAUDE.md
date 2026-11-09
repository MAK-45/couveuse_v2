# Couveuse

Pixel-art creature of ice-light (a "blob") that **lives** in a web page (page **Vivre**: it plays all its animations one
after the other, live, without ever a jump), and the settings pages, opened from Vivre with ⚙, that tune each animation,
show it in a loop and export it as **seamless** GIF / PNG sprite sheets / JSON. The UI is in **French**; code and comments
are in English.

**Start here**: docs/GUIDE.md explains the project in plain French (what to ask, what to check, what is left to do);
docs/VISION.md says what the author wants; docs/ARCHITECTURE.md (« Extension points ») and docs/SEAMLESS.md say how it is
built and why it never jumps; the recipes in .claude/commands/ (« Adding things » below) give the steps for each kind of
addition. Keep all of them up to date with every change.

## Always ask first: once, or a loop?

The creature lives: every animation starts from its rest and comes back to it, so it can be played at any time of its
life (page Vivre) with no jump. Before building **any new animation** (a new tab, action, loop, effect or animation
inside a tab), **ask the author** which kind they want, and wait for the answer — never pick for them:
- **Once** (une fois): rest → the animation → rest in one piece, like Actions and Heure: its first and last frames are
  exactly the rest's (the Blob né's, or a new form's live loop). Test it against the rest's frames.
- **A loop** (en boucle): an **entry** from rest, a **loop** that repeats until something else is asked, an **exit** back to
  rest, like Boucles (`o.part` "enter" / "loop" / "exit"). Write the loop; its entry and exit come from its intensity
  (`phases()` + `settle()` in ice-time.js, the drawing faded by `p.fade`), unless the art needs its own (walking and
  running have their first and last steps). Test frame t against t + T, and the joins rest → entry → loop → exit → rest.

Ask in French, e.g. « Tu la veux une seule fois (elle part du repos et y revient), ou en boucle (elle s’y met, continue
autant que tu veux, puis s’arrête et revient au repos) ? »
An animation can also take it **somewhere else** (the action « Se déplacer »): its first frame is its rest where it was,
its last its rest where it went (`hub.pos` in the life), and everything after is drawn there.

**Every new animation must be made for every form**, not only for the blob: today the levitating human form and the
human form on its legs, and every form added later to the Transformation tab. Draw the creature with
`bodyBack`/`bodyFront`/`bodyAmbient`, give the figure arm poses that fit, keep it on its floor on its legs, render and
look at it in each form, add it to the seam tests in each form, and when it really can't be done in a form list it in the
module's `FORM_FIT` with the reason in French. The other way round too: **a new form must play every existing animation**
(or say in `FORM_FIT` why it can't). See « The new forms in every tab » below.

**Every new animation must live in Vivre.** An action or a loop added to its module's list (`ACTIONS`, `LOOPS`) and to the
page's list (`ACTION_LIST`, `LOOP_LIST`) is in Vivre by itself (`CATALOG` in ice-life.js is made from those lists, its
options from that tab's own `effOpts()` via `optsAs()`). A new kind of thing (a new tab, a new state) needs its step in
ice-life.js (`plan()`, `segment()`) and a scenario in the life block of `tests/seams.mjs`.

## Use the pixelfx skill for every effect

Whenever you create or change an effect, animation or anything drawn (new tab, action, loop, object, style),
**load the `pixelfx` skill first** (Skill tool, `anthropic-skills:pixelfx`) and follow its draft → render → look →
refine loop: render contact sheets (`npm run render`), look at them, and fix what looks wrong before handing over.
The pixelfx library is vendored in `pixelfx/`: our reference library, **never edited**; the skill is the authority on how
to use it and how to make effects look hand-animated.

## After every change: give the author the live artifact

Every time you change something the author can see (an effect, the UI, a setting), finish by publishing the page so
they can test it live: `npm run build && npm test`, then publish `dist/couveuse.html` with the Artifact tool and give
the link in the reply. Keep the same artifact (same file path in this session; from a new session pass
`url: https://claude.ai/artifact/NfMJMDMQnxW8QfGSfXU21B`, read it first) so the link never changes, and keep the
`downloads` capability declared (the exports save through it). Say what to try in it.

## What the author wants (full version: docs/VISION.md — read it before adding a feature)

Bring a little creature of ice-light to life: it **lives in a web page** (tab Vivre), on and on, doing what it is asked,
and every animation is made and tuned from **one web interface**, as **perfect loops**.
- **Never a jump**: life comes first. It may wait (even a minute) before doing what it is asked, but it never jumps:
  everything it does starts and ends exactly at its rest; a loop has an entry and an exit.
- **Its scene grows**: what it makes stays in its scene until it is asked to take it away; other characters and pets will come.
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
npm run render -- creature/ice-blob-loops --max 16 --zoom 2   # contact sheet in records/
```

Open `dist/couveuse.html` directly in a browser to try it. There is no dev server.
After any change to an effect or to `app/`, run `npm run build && npm test`.
To look at the page yourself, Playwright and Chromium are installed (`require("playwright")`, `chromium.launch()`): load
`file://<repo>/dist/couveuse.html` (it opens on Vivre), click a card (`.lifecard .act`; its ⚙ is `.gear`), `#toLife` goes back,
`#lifeNow` says what it does; listen to `pageerror`, take screenshots and look at them. Keep such scripts out of the repo.

## Layout

In the code and in these docs a "tab" (`S.anim`, `ANIMS`) is a page of the UI: Vivre ("life") or the settings page of one
thing (the page has no tab bar). "Tab Actions" = the settings page of an action, and so on.

- `pixelfx/` the pixelfx library (MIT, see `pixelfx/LICENSE`), kept exactly as it is: **never edit it**. Core in `pixelfx/src/core/`.
- `src/` our effects (`tools/fxdir.mjs` points pixelfx's render and check tools at it):
  - `src/spawn/ice-spirit-gestation.js` — tab **Naissance** (birth, box-drawn; not part of the life)
  - `src/creature/ice-life.js` — tab **Vivre**, the life engine: a score of segments laid end to end, each one a tab's
    animation played with that tab's options (`cfg.optsFor(tab, pick, hub)`, the page's `optsAs()`), starting on a beat of
    the rest it leaves (a hub: `form`, `pos` where it stands in the scene, whole px from its home spot) and lasting whole
    loops; at a `pos` every module draws with the painter moved there and its options worked out from there (`optsAs`
    shifts `placement()` by `posShift`; `plainOpts` shifts `room`), things stay pinned to the scene. `want(L, req, now)`
    plans the steps it needs (revert, transform... then the animation; a loop's `enter` → `loop` (rep ∞ until asked
    otherwise) → `exit`; the move, `{ id: "actions:move", to: [x, y] }`, a step of kind "move" whose hub after has the new
    `pos`), `can()` (why not), `status()`, `clearQueue()`, `trim()`, `snapshot()` (hub + things to keep), `plainOpts()`
    (tests, render tool, `--opts '{"script":[...]}'`). Things: `{ id, ob, born, dying }`, drawn by the engine except while
    the objects tab makes or takes one away.
  - `src/creature/ice-time.js` — the time every animation shares: `prog(o, t, T)`, `settle(m, k)` (modifiers back to rest
    by an intensity), `phases(part, T, lead, pose)` (an entry's or exit's timetable: k, the melt into light when the pose
    changes, `swap`, `s` for the anchor)
  - `src/creature/ice-blob-idle.js` — tab **Blob né** (reached from Vivre › Forme); the blob itself (exports `blobBack`,
    `blobFront`, `state`, `ambient`, `shapeOf`, eyes/sparks/drips; modifiers `ax`, `ay` move the whole creature, its light
    on the ground included: drawn there at rest it is its rest drawn there)
  - `src/creature/ice-blob-actions.js` — tab **Actions** (`move`, `aura`; exports `hsl`, `fromHsl`, `total(o)`, `moveOf(o)`).
    `move` (« Se déplacer »): it goes to `moveTo` (a life's) or `moveX`/`moveY` and stays (its progress doesn't wrap round:
    `{ ax, ay }` after it arrives); the blob glides there on an arc (`moveArc`, hops `moveHops`), the levitating figure flies
    there, the figure on its legs walks or runs there (`walkTo()`: a quarter turn `turn`, a `gaitLine` up to its pace and
    down, the body carried by `ax`, prints left on the ground, a quarter turn back); `moveOf()` keeps its whole body in
    `o.room`, only x on its legs; its length is what its way takes (`moveLoops()`, `total()`). `aura` (« Halo de lumière »):
    it charges with light, rays and rings, and is back at rest.
  - `src/creature/ice-scene-objects.js` — tab **Objets** (solids, appear/remove; exports `drawObject`)
  - `src/creature/ice-blob-loops.js` — tab **Boucles** (`sleep`, `magic`, `walk`, `run`; `walk`/`run` = `gaitLoop()`: the
    figure on its legs walks or runs on the spot, its floor of ice going by under its feet like a treadmill). Each loop has
    three parts (`o.part`: "loop", "enter" from rest, "exit" back to rest; `inLoops` / `outLoops`, `meltTime`; `total(o)` is
    the part's length, `loopLen` the activity's period): `planOf()` / `modsOf()` / `layer()` at the end of the file.
    Walking and running have their own (`gaitParts()`, `gaitTimes()`): a quarter turn from facing us to side on (`m.turn`),
    the steps growing to the loop's pace on a `gaitLine` joined to the loop's clock (`cs`), long enough at its pace that its
    prints are the loop's; on the way out it slows down, stops and turns back; their entry and exit take the loops they need
    (`gaitLoops()`)
  - `src/creature/ice-blob-clock.js` — tab **Heure** (shows the time)
  - `src/creature/ice-blob-transform.js` — tab **Transformation** (« Formes humaines »; the blob changes shape; `form:
    "human"`, a levitating human figure of the same ice-light, or `form: "grounded"`, the same figure on its legs on a floor
    of ice with gravity: it takes shape in the air (the change over c ∈ [0, 0.56], `formOf()`), the floor spreads, it falls
    for as long as the height takes under `grGravity`, lands knees bent and stands (`gravityAt()` gives every phase,
    `grounding()` where it stands, `stander()` the figure with its legs solved from the planted feet up (`ik()`), the body
    resting on the straighter leg); the way back plays the landing backwards as a jump; the floor (`floorFx()`: line, depth
    lines, reflection, glints) spans `o.room`, `grFloor` is px below the spot (the UI stores % of the scene's height); keys
    start with `gr`. Both forms: `transform` from rest → `live` (the new form's loop, `liveLoops` blob loops) → `revert` back
    to rest; styles `grow`/`flash`/`spiral` (`tfStyle` there, `rvStyle` back), poses `huLegs` spirit/legs/lotus and `huArms`
    float/open/down; the body is a signed distance field: the blob's `r - rad(angle)` blended with the figure's smooth union
    of round cones/ovals (`human()`), lit by one shader like the blob's body (`body()`), hair as its own field behind it;
    `chore(o, c, style)` gives the change at c (0 blob .. 1 new form), exactly neutral at both ends; the figure's clock is
    `t - T` in `transform`; reuses the idle's eyes, sparks and drops via `drawEyes`/`drawSparks`/`drawDrips`; keys start
    with `tf`, `rv`, `hu`.
    It is also the **form engine** of every other tab: `bodyBack`/`bodyFront`/`bodyAmbient` draw the creature in `o.form`
    (`build(o, t, ext)` with c = 1 and the tab's modifiers), `walking()` for the legs, `FORM_DEFAULTS`, `formExtent`,
    `formAnchor`; `ax`/`ay` carry the whole figure (on its legs along its floor, feet and light on the floor included).
    **Walking and running** (`m.gait = { kind, ph, cyc, S, v, rate, N, dir, ...settings }`): `strider()` turns the figure
    side on; `gaitK()` holds a person's gait at v m/s; `gaitSolve()` (cached) rolls the foot back at the stride's speed and
    works out where it lands so the hips ride smoothly from leg to leg; `gaitPose()` solves the legs, the swinging foot on a
    Hermite path between toe-off and landing. Near leg in the body field, near arm in front (`As`), far arm and leg behind
    and darker (`Fs`, `limbs()`), three-quarter eyes; `gaitFx()` lays prints of light carried back by the ground; the ice
    floor's glints go by with it. `gaitPlan()` gives whole strides and whole tiles of floor a loop. **A gait whose pace
    changes** (it sets off, slows down, stops): `m.gait.line` = `gaitLine({ S, rate, pieces, cs, csInv })` and `m.gait.t`: its
    pace s(t) in eased pieces, its cadence slowing to `alpha` as it stops, the strides c(t), the way gone d(t), each step's
    length `rho`; every foot stays where it came down (`step()` / `down()` in `gaitPose()`), the floor goes back by d(t) (or
    the figure is carried by `ax`), arms, lean and hair follow the pace; a gait at its own pace makes its own line
    (`lineOf()`). `gaitFree()` a gait going somewhere (no loop to fit). **Turning** (`m.turn` 0 facing us .. 1 side on, with
    `m.gait`): the figure facing us, narrowed (`narrow()`), and the one side on (`moveFig()` into its space) are both built
    and their fields blend: it turns as one body, never melting)
- `archive/ice-spirit-birth.js` the first birth, kept aside for later: not loaded, not tested.
- `app/main.js` the whole UI (state, controls, render pipeline, GIF encoder, export). `app/index.template.html` HTML + CSS.
  **No tab bar**: the page opens on Vivre (`S.anim = "life"`); every other tab is a **settings page** opened from Vivre (⚙ on
  a card, or a « Régler … » link: `openPage(anim, pick)`), with « Revenir à la vie » in the header (or Escape: `backToLife()`).
  In the code they are still tabs (`S.anim`, `ANIMS`); `PAGE_NAMES` / `PAGE_INTRO` name and introduce each page, a picker grid
  is a one-line select there (`COMPACT_PICK`), the scene's format and the render settings come last, closed; the exports
  (GIF, PNG, JSON) are on the settings pages only. A new animation needs no new page: its card and ⚙ come from its list.
  Vivre's groups: Maintenant, Actions, En boucle, Heure, Forme (with « Régler le blob né » and « Régler les formes
  humaines »), Objets, Naissance, Place dans la scène, then Scène and Rendu.
  The Vivre tab is its own section (« the life tab »): `optsAs(tab, pick, hub)` builds any tab's options as that tab does,
  `lifeTick()` draws the life live (time-based, `lifeNow()`), `lifeControls()` the buttons (greyed with `can()`'s reason),
  `S.life` keeps its settings, where it is and what it made.
  `app/entry.js` lists what the page imports (global `PFX`). `app/build.mjs` inlines it all.
- `tools/fxdir.mjs` lets pixelfx's own render/check tools find `src/` without editing pixelfx (`npm run render`, `npm run check:fx`).
- `tests/seams.mjs` seam tests.
- `docs/GUIDE.md` the project for the author, in French (how it holds, how to ask for something new, how to check it,
  what is left). `docs/VISION.md` the goals and requirements. `docs/ARCHITECTURE.md` how the UI, the life engine and the
  effects fit together, and the extension points. `docs/SEAMLESS.md` the loop and join rules in detail.

Read the relevant doc before a non-trivial change; don't load every file.

## The rules that must never break (see docs/SEAMLESS.md)

1. Every periodic motion runs a **whole number of turns per loop** (`Math.round` the counts). Noise is read on a
   circle of time (`ln(x, y, u, seed, r)` with `u = t / D`), never on a line.
2. Actions, clock, object appear/remove, transformation: every modifier is **exactly neutral at progress 0 and 1**
   (envelopes from `seg`/`bump`, integer rotations). Their length is a **whole number of idle loops** and the frame
   count is `loops * round(D * fps)`, so their first/last frames equal the idle's.
3. The **lead-out** of an action is never shorter than a light drop's life (1.7 s): `prog()` does this. Drops born
   while an action is active are hidden with `quiet: 1`.
4. Particles use `cycle(t, period, …)` with the loop's period; one-shot effects end before progress 1.
5. GIFs get **one palette per frame** computed from that frame only: identical frames encode identically, so
   chained GIFs join exactly. Don't go back to a global palette.
6. Walking/running: whole strides a loop and whole tiles of the floor under its feet a loop (`gaitPlan()`), the stance foot
   going back at exactly that speed; prints and sparks are aged in strides since each landing. When its pace changes it follows
   a `gaitLine`: a foot down never slides (it stays where it came down, the floor or the figure moving by d(t)); joined to a
   loop, the line is the loop's own clock wherever it goes at its pace, and the entry stays at its pace for as long as a print
   lives, the exit starts slowing only once the steps on their way are set down.
7. In a **new form** "rest" is the Transformation's `live` loop: a tab passes its length `T` to `bodyBack`/`bodyFront`, and
   `figClock` nudges the figure's own clock (period `liveLoops · D`) mid-way so it lands back on that loop at the end, slope 1
   near both ends (drops). Every form modifier is applied as `x * 1` / `x + 0` at rest, so at rest a tab draws exactly the
   `live` frame; never compute the rest pose another way.
8. **Loops in three parts**: the entry's activity clock is `t - T` (0 on its last frame, where the loop starts), the exit's
   goes on from the loop's end; the intensity never wraps (before an entry it is 0, after it 1); k = 1 for the last 1.7 s of
   an entry and the last 1.7 s of an exit are rest (drops). A **pose** (sitting, legs crossed, arms down) can't be faded: the
   figure melts into light (`morph` exactly 1 on a plateau), the pose switches while nothing of it shows, on its legs its
   frame gathering at `anchor`. Never switch a pose while any of the figure shows. Turning side on to walk is not a melt: the
   two figures blend continuously (`m.turn`), so the human form never turns back into a ball of light.
9. **The life (Vivre)**: a segment starts on a beat of the rest it leaves (`since + n · R`: the blob's loop, the figure's live
   loop) and lasts whole loops; nothing new starts sooner than `now + MARGIN`, so the frame on screen never changes. Drawing
   order, the same in every segment: [module back] [things back] [module front] [things front]. Where it stands (`pos`,
   whole px) moves the painter for the module's layers only; an action that takes it elsewhere ends on its rest drawn there
   (`ax`/`ay` = the painter moved: every drawing of the creature must stay a pure translation of itself, e.g. dithers on the
   floor read the column from `room[0]`).

If `npm test` reports a FAIL, fix the effect — never loosen the test.

## Gotchas learned the hard way

- `p.disc(x, y, r, c, a)` needs the alpha `a` (no default) or nothing is drawn.
- Colours given to the painter must be numbers: after a hue shift wrap with `hex(fromHsl(...))`, or pass the
  strings through `fit(...)`. Strings fail silently.
- `p.dot` dithers with its alpha; for crisp pixel art prefer `p.px` with full colours, use `p.blend` for true translucency.
- Bodies are drawn pixel by pixel in body space (`toBody`/`toScreen`); keep loops bounded to the body's extent.
- UI: `setV(k, v)` routes a key to the right store (`S.life`, `S.shared`, `S.blob`, `S.actions`, `S.objects`, `S.loops`,
  `S.clock`, `S.transform`) per tab; add new keys to the tab's `*_KEYS` set or they land in `S.blob`.
- UI: controls may be missing on some tabs — wire them with `on(id, event, fn)`, never `$(id).onclick =` directly.
- UI: distances the user sets in **% of the scene** are converted to effect pixels in `effOpts()`.
- `localStorage` key is `couveuse-v3`; `sanitize()` keeps each store's known keys over the new defaults (what disappeared is
  ignored); add a check there for any new choice list.

## The new forms in every tab

- Tabs Actions, Objets, Boucles, Heure draw the creature with `bodyBack(p, t, o, M, C, T)`, `bodyFront(p, t, o, M, C, T)`,
  `bodyAmbient(...)` from `ice-blob-transform.js`, never `blobBack`/`blobFront` directly. With `o.form` "blob" they are the
  idle's own; with "human" / "grounded" they draw the figure with the Transformation tab's settings (`FORM_DEFAULTS` fill
  what's missing) and return an `st` whose `x, y` is the middle of its body, plus `hands`, `head`, `headR`, `feet`, `top`,
  `floor`, `U`: emit light from the nearest hand, put things in its hands, effects over its head.
- The same modifiers as the blob move the figure. On its legs (`walking()`): `dx` = steps along the floor (leading foot
  first, a pure function of `dx`), `dy < 0` = a jump (legs leave the floor and hang), `dy > 0` or `sy < 1` = it bends its
  knees, `rot` = a lean over its hips (a flip in the air), `grow` round the floor under it. A tab sets `dy: 0` where the blob
  only floats up (aura, magic...). Extra modifiers for figures (ignored by the blob): `armUp`, `armOpen`, `hold` (0..1),
  `reach: [x, y]` + `reachK` (one arm points at a local point), `legs`/`arms` (pose override, e.g. "lotus"/"down"), `seat`
  (on its legs: sits cross-legged on its floor), `gait` (on its legs: walks or runs side on, on the spot).
- What a form can't do: each module exports `FORM_FIT = { form: { name: "raison en français" } }` and `fitsForm(o)`; the
  effect then just rests, the UI greys the button and lists the reasons (today: only the figure on its legs walks and runs).
- Seam tests: the "in a new form" block of `tests/seams.mjs` checks every tab in both forms against `live`'s frames.
- UI: the form is `S.shared.bodyForm` ("blob", "human", "grounded"), picked in each `FORM_TABS` settings page's « Forme » group
  (`formMarkup`, `setBodyForm`); picking a human form there sets `S.transform.form`, and the Transformation tab's form choice
  carries over while a human form is in use. `effOpts()` merges the figure settings from `S.transform` (floor % → px, `room`).
  `fixFit()` moves a choice a form can't do. `GROUNDED_IDLE` hides settings a figure on its legs has no use for,
  `GROUNDED_ONLY` / `BLOB_ONLY` those only it (or only the blob) uses (`rowShown()`).
- UI, Vivre: a click in the scene places the cross (`spotX`/`spotY`); the next object appears there and « Se déplacer » goes
  there (`lifeCross()`, px from the home spot). Where it stands is `S.life.hub.pos`, kept for next time and back to [0, 0] when
  its home spot or the scene changes (`placeSig`). Lengths that depend on the options (a move, walking's entry and exit) come
  from the module's `total()` in `loopsOf()`.

## Conventions

- Pixel art: hard ramp steps from the 8-colour palette (`fit(palette, 8)`), 1 px rims lit top-left, glow via
  `p.glow` (light buffer), no anti-aliasing.
- French UI text uses typographic punctuation: ’ for apostrophes, « » for quotes. Keep straight quotes in code.
- New effect options need a default in `meta.options`, and in the UI a row in the tab's params list.
- Keep effects pure functions of `(t, options)`: no state between frames, no `Math.random()` (use `rng(seed, …)`).
- Small, focused changes; run the seam tests after each one.

## Matt Pocock's skills (in .claude/skills/, see its README)

Two skills the author calls by name, **only when asked** (they have `disable-model-invocation`):
- `/grill-me` (or « grille-moi », « cuisine-moi sur ce plan ») → `grilling`: before building something, interview the author
  in rounds until the plan is shared. Ask **in French**, with your recommended answer for each question. The project's own
  questions come first in the tree: once or a loop, every form, its place in Vivre, its settings.
- `/improve-codebase-architecture` (or « améliore l’architecture ») → `codebase-design` + `domain-modeling` + `grilling`:
  scan for deepening opportunities (hot spots from `git log`: the modules in `src/creature/`, `app/main.js`).
  Here the HTML report is not opened with `xdg-open`: write it in the scratchpad and publish it with the Artifact tool (a new
  artifact, not the couveuse one), cards and labels in French. `GLOSSARY.md` (domain words: blob, repos, forme, vie, boucle...)
  and `docs/adr/` are created lazily at the root. No refactor may break a rule of docs/SEAMLESS.md: `npm test` must still
  print "all seams exact".

## Adding things (recipes in .claude/commands/)

First ask: once, or a loop? (see « Always ask first » above). Load the `pixelfx` skill. Make it for every form, and
check it lives in Vivre (its button there, the joins in the seam tests). When done: build, test, publish the artifact and
give the link.

- `/new-anim` any new animation: asks once or loop, then follows the right recipe.
- `/new-action` an action played once, from rest back to rest.
- `/new-loop` an activity in a loop, with its entry and exit.
- `/new-form` a new form of the creature (or a new posture of a form), played in every page and in its life.
- `/new-thing` a new kind of object, or a companion, that stays in its scene.
- `/check` build + seam tests + fx checks, then report.

Whatever is added, update the docs in the same change: VISION « Ce qui existe » (and « Directions » when something planned is
done), GUIDE « Ce qui reste à faire », ARCHITECTURE (modules table, extension points), this file's layout, the recipes.
