Add a new activity in a loop, with its entry from rest and its exit back to rest (a card in Vivre › En boucle, its ⚙ the loop's settings page): $ARGUMENTS

Before anything: ask the author whether they want it once (from rest back to rest, like Actions) or as a loop with an
entry and an exit (like Boucles), and wait for the answer. Ask in French. Once: follow new-action.md instead.
Then load the `pixelfx` skill (`anthropic-skills:pixelfx`) and use its render → look → refine loop.

1. Read docs/SEAMLESS.md and two entries in `pixelfx/src/fx/creature/ice-blob-loops.js` (e.g. `L.sing`, `L.firefly`).
2. Add `L.<id> = (o) => ({ mods(t), back?, front? })`; time only through `phase(o, t)`, every count through `whole()`; particles with `cycle(t, total(o), …)`.
3. Options with defaults in `meta.options`; id in `LOOPS`.
4. In `app/main.js`: entry in `LOOP_LIST`, rows in `LOOP_PARAMS`, default duration in `LOOP_LOOPS` if not 2.
4b. Make it for every transformation, not only the blob (levitating human, human on its legs, and any later form): give the figure arm poses in its modifiers
   (`armUp`, `armOpen`, `hold`, `reach` + `reachK`), take effects from `st.hands` / `st.head` when they exist, keep it on its
   floor when `o.form === "grounded"` (no floating up: `dy: 0`), or, if it truly can't be done in a form, add it to `FORM_FIT`
   with the reason in French. Render it with `--opts '{"form":"human"}'` and `'{"form":"grounded"}'` and look.
4c. Its entry and exit come from its intensity by themselves (`settle()`, the drawing faded): look at them (`--opts
   '{"part":"enter"}'`, `'{"part":"exit"}'`, in every form). A pose (`seat`, `legs`, `arms`) switches under a melt into
   light by itself. If the art needs its own entry or exit, give the activity `enter` / `exit` drawing that uses the
   intensity (and keep the joins exact). If it truly can't have one yet, list it in `PART_FIT` with the reason in French. A loop whose pose or speed must build
   up (walking, running) can give its own `partMods()` (see `gaitLoop()` and `gaitTimes()`).
5. `npm run build && npm test` (its loop, entry and exit joins are tested from `LOOPS` in every form). It is in
   Vivre by itself (its card and its ⚙ come from `LOOP_LIST`): try it there, stop it, in every form.

Last step: publish `dist/couveuse.html` as the artifact (same link, `downloads` capability) and give the author the link to test it live.
