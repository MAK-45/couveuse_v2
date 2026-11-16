---
name: new-thing
description: Add something that lives in the creature's scene and stays there until taken away — a new kind of object (a shape) or a companion such as a pet. Use when the author asks for a new object or a character beside the creature.
argument-hint: <l’objet ou le compagnon>
---
Add something to the creature's scene: $ARGUMENTS

Things stay in the scene until they are taken away; the life engine (`src/life/life.js`) keeps them, draws them in every
segment and saves them (`snapshot()`).

1. Ask the author what it looks like and does (in French), and wait. A companion's own animations follow the creature's
   rule: once, or a loop with an entry and an exit. Load the `pixelfx` skill.
2. **A new object shape**: its solid in `SOLIDS` (`src/objects/objects.js`: vertices y up, faces), its French name in
   `SHAPE_LIST` (`app/main.js`). It floats and turns by whole turns of the blob's loop by itself. Done.
3. **A companion** (a new kind of thing): a module `src/<name>/<name>.js` drawing it at rest (its own rest loop, a whole
   number of the blob's loops) and its animations from rest back to rest (`total(o)`, neutral ends, lead-out ≥ 1.7 s);
   in `life/life.js` a `kind` for things, drawn by `thingsOn()`, its steps in `plan()` / `segment()`, kept by
   `snapshot()`; in `app/main.js` its cards in `lifeControls()` and its settings page (`ANIMS`, `PAGE_NAMES`,
   `PAGE_INTRO`, `openPage()`), `S.life.things` sanitized with its kind.
4. Tests: its requests in the lives of `tests/seams.mjs` (it comes, does its animations, the creature moves about, it is
   sent away). `npm run build && npm test` → « all seams exact ».
5. Look at it in Vivre, update docs (VISION, ARCHITECTURE, GUIDE), commit, push, publish the artifact.
