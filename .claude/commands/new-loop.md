Add a new endless activity to the **Boucles** tab: $ARGUMENTS

Before anything: ask the author whether they want it to start and end on the Blob né's rest (chains, like Actions)
or to be a free endless loop (like Boucles), and wait for the answer. Ask in French.
Then load the `pixelfx` skill (`anthropic-skills:pixelfx`) and use its render → look → refine loop.

1. Read docs/SEAMLESS.md and two entries in `pixelfx/src/fx/creature/ice-blob-loops.js` (e.g. `L.sing`, `L.firefly`).
2. Add `L.<id> = (o) => ({ mods(t), back?, front? })`; time only through `phase(o, t)`, every count through `whole()`; particles with `cycle(t, total(o), …)`.
3. Options with defaults in `meta.options`; id in `LOOPS`.
4. In `app/main.js`: entry in `LOOP_LIST`, rows in `LOOP_PARAMS`, default duration in `LOOP_LOOPS` if not 2.
4b. Make it work in the new forms too (levitating human, human on its legs): give the figure arm poses in its modifiers
   (`armUp`, `armOpen`, `hold`, `reach` + `reachK`), take effects from `st.hands` / `st.head` when they exist, keep it on its
   floor when `o.form === "grounded"` (no floating up: `dy: 0`), or, if it truly can't be done in a form, add it to `FORM_FIT`
   with the reason in French. Render it with `--opts '{"form":"human"}'` and `'{"form":"grounded"}'` and look.
5. `npm run build && npm test`.

Last step: publish `dist/couveuse.html` as the artifact (same link, `downloads` capability) and give the author the link to test it live.
