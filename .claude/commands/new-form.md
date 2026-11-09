Add a new form the creature can take (Transformation), or a new posture of a form: $ARGUMENTS

A form is a rest of its own: the creature turns into it from the blob (`transform`), lives in it (`live`, its rest loop)
and comes back (`revert`). Every animation of every page must be played by it, or say in `FORM_FIT` why it can't.

1. Read docs/ARCHITECTURE.md (« The new forms », « Extension points ») and docs/SEAMLESS.md (« Transformation », « The new
   forms in the other tabs »). Load the `pixelfx` skill and use its render → look → refine loop.
2. Ask the author what it looks like, how it moves at rest, how it takes shape and goes back (in French), and wait.
3. In `src/creature/ice-blob-transform.js`:
   - add its id to `FORMS` and to `isForm()`; its settings to `meta.options` with a prefix of their own (and to
     `FORM_DEFAULTS`' filter if the prefix is not `hu`/`gr`);
   - a figure builder like `human()` / `stander()`: primitives (round cones, ovals) in its own space, returning
     `{ L, Hl, U, head, hands, tips, heart, chest, hips, box }`, posed at its own clock `h` (period `livePeriod(o)`, whole turns),
     its parts grown by `g` (so `chore()` can grow it out of the blob); choose it in `build()` for that form;
   - its rest motion only from whole turns of its live loop; every modifier applied as `x * 1` / `x + 0` at rest;
   - what the shared modifiers mean for it (`dx`, `dy`, `rot`, `grow`, `armUp`/`armOpen`/`hold`/`reach` if it has arms...).
   A new **posture** of an existing form (a real sit, knees bending) is a pose parameter in its builder that goes from 0 to 1
   continuously; then the loops that need it (`seat`) can blend to it instead of melting through light.
4. In every other module (`ice-blob-actions.js`, `ice-blob-loops.js`, `ice-blob-electric.js`, `ice-blob-clock.js`,
   `ice-scene-objects.js`, `ice-blob-portal.js`, `ice-blob-explore.js`): render each animation in the new form, adapt what must
   be (effects from its hands or head via `st`), and list in `FORM_FIT[newForm]` what truly can't be done, with the reason in French.
5. In `ice-life.js`: add it to `FORMS` (the life engine plans `revert` then `transform` to reach it).
6. In `app/main.js`: add it to `TF_FORMS` and `BODY_FORMS` (French name and description), its settings rows in
   `transformGroups()`, its floor or room conversions in `effOpts()` if it stands on something, `FORM_NAMES` in the life section.
7. Tests (`tests/seams.mjs`): add it to the transformation cases, to `formCases` (« in a new form »), to the loops-in-three-parts
   forms, and a life scenario (`{ id: "form", form: "<id>" }` then a few animations). `npm run build && npm test` → "all seams exact".
8. Render it in every animation (`npm run render -- creature/ice-blob-actions --opts '{"form":"<id>"}'`...) and look.
9. Update docs (CLAUDE.md layout, ARCHITECTURE, VISION « Ce qui existe »), publish the artifact (same link, `downloads`
   capability) and tell the author what to try in Vivre (section Forme) and in « Régler les formes ».
