---
name: new-action
description: Add an action to the creature, played once from its rest back to its rest (or ending at rest elsewhere, like « Se déplacer »), as a fiche in src/actions/ made from the template. Use once the author has chosen « une fois ».
argument-hint: <l’action>
---
Add an action (played once, from rest back to rest): $ARGUMENTS

If the author hasn't chosen « une fois » or « en boucle » yet, ask first (skill `new-anim`).

1. Load the `pixelfx` skill (`anthropic-skills:pixelfx`) and work in its draft → render → look → refine loop.
2. Copy `src/actions/_template.js` to `src/actions/<id>.js` (the id in camelCase is the file's name) and follow its
   numbered comments: its card (French name, short desc), its length, its options (syntax in `src/shared/_fiche.js`,
   good defaults, French labels), `formFit` only for what truly can't be done in a form (the reason in French), and
   `play(o, { prog })`: every change is an envelope of `prog(t)` that is 0 at both ends, `quiet: 1` while it acts.
   An action that ends somewhere else: `kind: "move"`, `moveOf`, `length` (see `move.js`).
3. Make it for every form: figures use their arms (`armUp`, `armOpen`, `hold`, `reach` + `reachK`), its effects come from
   `st.hands` / `st.head`, on its legs it stays on its floor (`dy: 0` when `o.form === "grounded"`).
4. List it in `src/actions/index.js` (the order of the cards in Vivre). Nothing else to edit: its card in Vivre, its
   settings page and its tests all come from the fiche.
5. Look at it: `npm run render -- actions/<id>`, and with `--opts '{"form":"human"}'`, `--opts '{"form":"grounded"}'`.
6. `npm run build && npm test` → « all seams exact » (it is tested with its defaults, every slider at its minimum and at
   its maximum, each choice of its lists, in every form, and in a life per form).
7. In the page (Playwright, see CLAUDE.md): Vivre › Actions, its card plays it from rest to rest in each form and after
   « Se déplacer »; its ⚙ opens its settings page; no `pageerror`.
8. Update docs/VISION.md « Ce qui existe » (and docs/GUIDE.md « Ce qui reste à faire » if it was planned), commit, push,
   publish the artifact and tell the author what to try.
