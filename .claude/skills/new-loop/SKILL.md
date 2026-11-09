---
name: new-loop
description: Add an activity the creature keeps up in a loop, with its entry from rest and its exit back to rest, as a fiche in src/loops/ made from the template. Use once the author has chosen « en boucle ».
argument-hint: <l’activité>
---
Add an activity in a loop: $ARGUMENTS

If the author hasn't chosen « une fois » or « en boucle » yet, ask first (skill `new-anim`).

1. Load the `pixelfx` skill (`anthropic-skills:pixelfx`) and work in its draft → render → look → refine loop.
2. Copy `src/loops/_template.js` to `src/loops/<id>.js` (the id in camelCase is the file's name) and follow its numbered
   comments: its card, its period, its options (syntax in `src/shared/_fiche.js`), `formFit` only for what truly can't be
   done in a form, and `play(o)`: the loop alone, time read through `phase(o, t)`, every count through `whole()`,
   particles with `cycle(t, loopLen(o), …)`.
3. Its entry and exit come by themselves (`_loop.js`: its intensity draws the modifiers back to rest, its drawing fades).
   A pose (`seat`, `legs`, `arms`) switches under a melt into light by itself. Only if the art needs its own entry and
   exit, give `play` a `parts(part, T)` like walking and running (`_gait.js`).
4. Make it for every form: figures use their arms, effects come from `st.hands` / `st.head`, on its legs it stays on its
   floor (`dy: 0` when `o.form === "grounded"`).
5. List it in `src/loops/index.js` (the order of the cards in Vivre). Nothing else to edit.
6. Look at it: `npm run render -- loops/<id>`, with `--opts '{"part":"enter"}'`, `'{"part":"exit"}'` and in each form.
7. `npm run build && npm test` → « all seams exact » (its loop, entry and exit, at its defaults and extremes, in every
   form and in lives).
8. In the page: Vivre › En boucle, start it, stop it, in each form; its ⚙ opens its settings page; no `pageerror`.
9. Update docs/VISION.md « Ce qui existe », commit, push, publish the artifact and tell the author what to try.
