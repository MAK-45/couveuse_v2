Add a new action to the **Actions** tab: $ARGUMENTS

The blob leaves its rest, does the action, and is back at rest exactly (first/last frames = the idle's).

1. Read docs/SEAMLESS.md and look at two existing entries in `pixelfx/src/fx/creature/ice-blob-actions.js` (e.g. `A.jump`, `A.freeze`).
2. Add `A.<id> = (o) => ({ mods(t), back?, front? })` using `prog(o, t)`; all modifiers neutral at 0 and 1; set `quiet: 1` while active.
3. Add its options with defaults in `meta.options` and its id to `ACTIONS`.
4. In `app/main.js`: an entry in `ACTION_LIST` (French name + short description), its rows in `ACTION_PARAMS`, a default duration in `LOOPS_DEF` if not 2; scene-relative lengths go in `SCENE_LENGTHS` / `SCENE_ACTION_DEF`.
5. `npm run build && npm test` (the action test runs automatically from `ACTIONS`). Render a contact sheet with `npm run render -- creature/ice-blob-actions` after setting the default action if you want to look at it.
