Add a new action (played once, from rest back to rest; a card in Vivre › Actions, its ⚙ the action's settings page): $ARGUMENTS

Before anything: ask the author whether they want it once (from rest back to rest, like Actions) or as a loop with an
entry and an exit (like Boucles), and wait for the answer. Ask in French. A loop: follow new-loop.md instead.
Then load the `pixelfx` skill (`anthropic-skills:pixelfx`) and use its render → look → refine loop.

The blob leaves its rest, does the action, and is back at rest exactly (first/last frames = the idle's).
(An action that takes it somewhere else and leaves it there, like `A.move`, is the one exception: its last frames are its rest
drawn there, `{ ax, ay }` whole pixels, its progress doesn't wrap, its CATALOG kind is "move" and the life's hub after it gets
the new `pos`; see docs/ARCHITECTURE.md « Extension points ». Test its last frame against the rest drawn there.)

1. Read docs/SEAMLESS.md and look at the existing entries in `src/creature/ice-blob-actions.js` (`A.aura`; `A.move` for one that ends elsewhere).
2. Add `A.<id> = (o) => ({ mods(t), back?, front? })` using `prog(o, t)`; all modifiers neutral at 0 and 1; set `quiet: 1` while active.
3. Add its options with defaults in `meta.options` and its id to `ACTIONS`.
4. In `app/main.js`: an entry in `ACTION_LIST` (French name + short description), its rows in `ACTION_PARAMS`, a default duration in `LOOPS_DEF` if not 2; scene-relative lengths go in `SCENE_LENGTHS` / `SCENE_ACTION_DEF`.
4b. Make it for every transformation, not only the blob (levitating human, human on its legs, and any later form): give the figure arm poses in its modifiers
   (`armUp`, `armOpen`, `hold`, `reach` + `reachK`), take effects from `st.hands` / `st.head` when they exist, keep it on its
   floor when `o.form === "grounded"` (no floating up: `dy: 0`), or, if it truly can't be done in a form, add it to `FORM_FIT`
   with the reason in French. Render it with `--opts '{"form":"human"}'` and `'{"form":"grounded"}'` and look.
5. `npm run build && npm test` (the action test runs automatically from `ACTIONS`). It is in Vivre by itself (its card and
   its ⚙ come from `ACTION_LIST`): try it there, in every form, and after a move elsewhere in the scene. Render a contact sheet with `npm run render -- creature/ice-blob-actions` after setting the default action if you want to look at it.

Last step: publish `dist/couveuse.html` as the artifact (same link, `downloads` capability) and give the author the link to test it live.
