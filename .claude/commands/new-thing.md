Add something that lives in the creature's scene: a new kind of object, or a companion (a pet...): $ARGUMENTS

Things stay in the scene until they are taken away, each with its `place` (the world it was made in) and `linked` (it stays
in that world when the creature leaves, or follows it from world to world). The life engine (`ice-life.js`) keeps them, draws
them in every segment, fades them while the creature crosses to another world, and saves them (`snapshot()`).

1. Read docs/ARCHITECTURE.md (« The life », « Extension points ») and docs/SEAMLESS.md (« The life »). Load the `pixelfx` skill.
2. Ask the author what it looks like and does, and whether it is linked to its world by default or follows the creature, in
   French, and wait. A companion's own animations follow the same rule as the creature's: once, or a loop with an entry and an exit.
3. **A new object shape**: in `ice-scene-objects.js` add its solid (`SOLIDS`: vertices y up, faces) and its id to `SHAPES`; in
   `app/main.js` its French name in `SHAPE_OPTS`. Its float and turn are whole turns of the blob's loop (`pose()`). Done: it can
   be made in Vivre › Objets and in the objects page.
4. **A companion** (a new kind of thing):
   - a module `src/creature/ice-<name>.js` drawing it at rest (`drawThing(p, o, th, t)`: its own rest loop, a whole
     number of the blob's loops, every count whole, noise on a circle of time) and its own animations from rest back to rest
     (`total(o)`, neutral ends, lead-out ≥ 1.7 s), like the creature's modules;
   - in `ice-life.js`: things get a `kind` ("object" by default); `thingsOn()` draws each kind with its module; `plan()` and
     `segment()` get its steps (call it in / send it away, its animations), its rest moves on the blob's beats; `snapshot()` keeps
     `kind`; a thing follows the creature through portals when not `linked` (decide where it stands then, the same in every
     segment, so nothing jumps);
   - in `app/main.js`: a « Compagnons » section in `lifeControls()` (cards with ⚙, the « lié au monde / le suit » choice), its
     settings page (`ANIMS`, `PAGE_NAMES`, `PAGE_INTRO`, `openPage()`), `S.life.things` sanitized with its kind.
5. Tests (`tests/seams.mjs`, life block): a scenario where it comes, does its animations, the creature goes to another world
   and back (linked and following), and it is sent away; every join exact. `npm run build && npm test` → "all seams exact".
6. Look at it in the page (Vivre), update docs (VISION, ARCHITECTURE, GUIDE, CLAUDE.md), publish the artifact and give the link.
