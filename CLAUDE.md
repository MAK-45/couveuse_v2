# Couveuse

A pixel-art creature of ice-light (a « blob ») that **lives** in a web page (page **Vivre**: it plays its animations one
after the other, live, never with a jump), and a settings page per animation, opened from Vivre with ⚙, that tunes it,
shows it in a loop and exports it as seamless GIF / PNG sprite sheet / JSON. The UI is in **French**; code and comments
are in English.

**Start here**: docs/GUIDE.md (the project for the author, in French), docs/VISION.md (what the author wants: read it
before adding a feature), docs/ARCHITECTURE.md (how it fits, « Extension points »), docs/SEAMLESS.md (why it never
jumps), GLOSSARY.md (the words: fiche, catalogue, repos, boucle…). Rules for `src/`, `app/` and `tests/` load with their
files (.claude/rules/).

## Before any new animation

1. **Ask the author: once, or a loop?** Wait for the answer; never pick for them. In French: « Tu la veux une seule fois
   (elle part du repos et y revient), ou en boucle (elle s’y met, continue autant que tu veux, puis s’arrête et revient
   au repos) ? »
   - **Once**: rest → the animation → rest; its first and last frames are exactly the rest's (Actions, Heure). An action
     may also take it somewhere else (« Se déplacer »): its last frame is its rest drawn there.
   - **A loop**: an entry from rest, the loop until something else is asked, an exit back to rest (Boucles). Write the
     loop; its entry and exit come from its host.
2. **Load the `pixelfx` skill** (`anthropic-skills:pixelfx`) for anything drawn and follow its draft → render → look →
   refine loop: render contact sheets, look at them, fix what looks wrong before handing over.
3. **Every form**: the blob, the levitating human form, the human form on its legs, and every form added later. Draw it
   in each and look at it in each; what truly can't be done goes in the fiche's `formFit`, the reason in French. A new
   form must play every existing animation.
4. **It lives in Vivre**: an action or a loop listed in its catalogue gets its card, its settings page and its tests by
   itself. A new kind of thing needs its step in `src/life/life.js` and its requests in the lives of `tests/seams.mjs`.

Recipes, as skills (.claude/skills/): `new-anim`, `new-action`, `new-loop`, `new-form`, `new-thing`, `check`.

## After every change the author can see

`npm run build && npm test` (« all seams exact »), then publish `dist/couveuse.html` with the Artifact tool and give the
link, saying what to try. Always the same artifact: the same file path within a session; from a new session pass
`url: https://claude.ai/artifact/NfMJMDMQnxW8QfGSfXU21B` (read it first). Keep the `downloads` capability declared (the
exports save through it). Commit and push the work.

## What the author wants (in full: docs/VISION.md)

- **Never a jump**: life comes first. It may wait (even a minute) before doing what it's asked, but every animation
  starts and ends exactly at its rest, and a loop has an entry and an exit.
- **Everything is configurable**: each new animation comes with its settings (French labels) and good defaults.
- **One scene** (16:9 by default, any size), used whole; exports keep its size and the placements. What the creature
  makes stays in its scene until it's asked to take it away; companions will come.
- **One style**: crisp pixel art, ice-coloured light on pure black, smooth motion; the blob has eyes only (no mouth or
  nose); objects look solid and float (no gravity).

## Commands

```bash
npm install          # once (esbuild)
npm run build        # -> dist/couveuse.html (self-contained); open it in a browser, there is no dev server
npm test             # seam tests over the whole catalogue, pixel-exact: must print "all seams exact" (~15 s)
npm run check:fx     # pixelfx contract checks on our effects (warnings about speed or canvas size are fine)
npm run render -- actions/aura --max 16 --zoom 2   # a contact sheet in records/ (any src/<folder>/<file>)
```

To look at the page: Playwright and Chromium are installed (`require("playwright")`, `chromium.launch()`). Load
`file://<repo>/dist/couveuse.html` (it opens on Vivre); a card is `.lifecard .act`, its ⚙ `.gear`; `#toLife` goes back,
`#lifeNow` says what it does; listen to `pageerror`, take screenshots and look at them. Keep such scripts out of the repo.

## Layout

- `src/` our effects, one folder per concept (a file starting with `_` is a helper, not an effect):
  - `shared/`: `_time.js` (progress, lead-in and lead-out, `settle`, `phases`), `_fiche.js` (a fiche's options),
    `_creature.js` (the creature drawn in its form, for every page), `_color.js`, `_look.js` (the creature's tones and
    eyes, and their glide from one look to the next), `_floor.js` (rings, runes and motes on the floor)
  - `actions/`: `index.js` the catalogue, `_action.js` their host, one fiche per action (`move.js`, `aura.js`, `couleur.js`),
    `_template.js`
  - `loops/`: `index.js` the catalogue, `_loop.js` their host (entry, loop, exit), `_gait.js` (walking and running),
    `sleep.js`, `magic.js`, `walk.js`, `run.js`, `_template.js`
  - `forms/forms.js`: page Transformation, and the form engine of every page (`FORMS`, `bodyBack` / `bodyFront`, gaits)
  - `blob/blob.js` Blob né (the blob at rest) · `clock/clock.js` Heure · `objects/objects.js` Objets ·
    `birth/birth.js` Naissance (not part of the life) · `life/life.js` Vivre (the life engine)
- `app/`: `main.js` the page (state, controls, Vivre, preview, exports, GIF encoder), `index.template.html`, `entry.js`
  (what the page imports, global `PFX`), `build.mjs` (inlines it all).
- `tests/seams.mjs` the seam tests · `tools/fxdir.mjs` points pixelfx's render and check tools at `src/`.
- `pixelfx/` the pixelfx library (MIT, see `pixelfx/LICENSE`), our reference: **never edited** (a hook refuses it).
- `archive/ice-spirit-birth.js` the first birth, kept aside for later: not loaded, not tested.

## Rules that must never break (why: docs/SEAMLESS.md)

1. Every periodic motion turns a whole number of times a loop; noise is read on a circle of time.
2. Once: every modifier is exactly neutral at progress 0 and 1, and lengths are whole idle loops, so the first and last
   frames are the rest's. The lead-in lasts at least 0.12 s, the lead-out at least 1.7 s (a drop of light's life); drops
   born while it acts are hidden (`quiet: 1`).
3. Particles use `cycle(t, period, …)` with the loop's period; one-shot effects end before progress 1.
4. GIFs get one palette per frame, from that frame only: identical frames encode identically, so GIFs chain.
5. Walking and running: whole strides and whole tiles of floor a loop; a foot down never slides (`gaitLine`).
6. In a new form, rest is the Transformation's `live` loop: every modifier enters as `x * 1` / `x + 0` at rest.
7. Loops in three parts: the entry ends on the loop's last frame, the exit starts on its first; a pose (sitting down,
   legs crossed) is taken little by little, each part of the body going from the rest pose to the activity's.
8. The life: a segment starts on a beat of the rest it leaves and lasts whole loops; nothing starts sooner than
   `now + MARGIN`; where it stands (`pos`) is a pure translation of all it draws.

If `npm test` reports a FAIL, fix the effect — never loosen the test.

## Conventions

- Small, focused changes; `npm test` after each. Read the relevant doc before a non-trivial change; don't load every file.
- French UI text uses typographic punctuation (’ « »); keep straight quotes in code.
- Whatever is added, update in the same change: VISION « Ce qui existe », GUIDE « Ce qui reste à faire », ARCHITECTURE,
  this file's layout, the skills.

## Matt Pocock's skills (.claude/skills/README.md), only when the author asks

- `/grill-me` (« grille-moi sur ce plan ») → `grilling`: interview the author in rounds, in French, with your recommended
  answer to each question, until the plan is shared. The project's questions come first: once or a loop, every form, its
  place in Vivre, its settings.
- `/improve-codebase-architecture` (« améliore l’architecture ») → `codebase-design` + `domain-modeling` + `grilling`.
  Write its HTML report in the scratchpad and publish it with the Artifact tool (a new artifact, labels in French).
  `GLOSSARY.md` holds the domain words; `docs/adr/` is created when a decision needs recording. No refactor may break a
  rule above.
