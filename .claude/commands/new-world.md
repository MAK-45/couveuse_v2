Add a new kind of world (seen through portals, the creature goes there in its life): $ARGUMENTS

Two families: worlds of space (`ice-worlds.js`, page Monde) and planet surfaces seen from the ground (`ice-surface.js`, page
Surface de planète). A world is a backdrop: it loops on itself over a whole number of the blob's loops (`wLoops`), still or
moving, and never needs an entry or an exit. Everything else (portals, crossing, life there, things linked to it) works by
itself once it is registered.

1. Read docs/ARCHITECTURE.md (`renderWorld`, `renderSurface`) and docs/SEAMLESS.md (« Worlds »). Load the `pixelfx` skill.
2. Ask the author what it looks like, what moves in it, its moods (presets), in French, and wait.
3. A **planet surface**: in `ice-surface.js` add its defaults (every key starts with `w`) to `SURFACE_DEFAULTS` and draw it in
   `renderSurface()` by depth layers like `plain` (sizes in % of the scene's height, every hash reading `wrap(lx, T)`, wind and
   ripples in whole turns, birds on `cycle`); give `groundDepthAt()` its ground and support `split` (what stands nearer than a
   figure's feet, for a figure on its legs there).
   A **world of space**: in `ice-worlds.js` add its type to `WORLD_TYPES` / `DEFAULTS` and draw it in `renderWorld()` (layers
   scrolling by whole tiles a loop, warps on a circle of time).
4. In `app/main.js`: its French name in `worldTypeName()`, its settings rows in `worldGroups()` for that type, presets like
   `PLAIN_PRESETS` / `WORLD_PRESETS`; `tabOfType()` sends surfaces to the Surface page by itself (`SURFACE_TYPES`).
5. Tests (`tests/seams.mjs`): the world alone (still and moving: frame at t == t + P), a portal onto it, a crossing, and a life
   scenario going there and back (`{ id: "go", place: <its id> }`) with a thing linked to it.
6. `npm run build && npm test` ("all seams exact"), look at it in the page (Vivre › Mondes: pick it, « Aller dans ce monde »;
   « ⚙ Régler ce monde »), update docs (VISION « Ce qui existe », CLAUDE.md layout), publish the artifact and give the link.
