Add a new animation to the creature: $ARGUMENTS

1. Ask the author, in French, and wait for the answer: once, or a loop?
   « Tu la veux une seule fois (elle part du repos et y revient), ou en boucle (elle s’y met, continue autant que tu
   veux, puis s’arrête et revient au repos) ? »
2. Load the `pixelfx` skill (`anthropic-skills:pixelfx`) and use its render → look → refine loop.
3. Once → follow `.claude/commands/new-action.md`.
   A loop → follow `.claude/commands/new-loop.md`.
   A new form or posture → `new-form.md`; a new object shape or a companion → `new-thing.md`.
   Something else (a new kind of thing the creature does, a new state, a new settings page): read docs/ARCHITECTURE.md
   « The life » and « Extension points », give its module a `total(o)` and neutral ends, add its step to `plan()` / `segment()`
   in `ice-life.js`, its cards in `lifeControls()` (app/main.js) with a ⚙ to its settings page, and a scenario to the life
   block of `tests/seams.mjs`.
4. Make it for every form (blob, levitating human, human on its legs, and any later form), or list in `FORM_FIT` why not.
5. Check it lives: in Vivre its card plays it from rest back to rest, in every form; `npm run build && npm test`
   (every line ok, "all seams exact").
6. Publish `dist/couveuse.html` as the artifact (same link, `downloads` capability) and give the author the link, saying
   what to try in Vivre and on its settings page (its ⚙).
7. Update the docs: VISION « Ce qui existe », GUIDE « Ce qui reste à faire » if it was planned, ARCHITECTURE if a module changed.
