---
name: new-form
description: Add a new form the creature can take (Transformation: it turns into it from the blob, lives in it, comes back), or a new posture of a form. Every animation must then be played in it. Use when the author asks for a new shape or body for the creature.
argument-hint: <la forme>
---
Add a new form (or a new posture of a form): $ARGUMENTS

A form is a rest of its own: the creature turns into it from the blob (`transform`), lives in it (`live`, its rest loop)
and comes back (`revert`). Every animation must be played by it, or its fiche says in `formFit` why not.

1. Ask the author what it looks like, how it moves at rest, how it takes shape and goes back (in French), and wait.
   Load the `pixelfx` skill. Read docs/ARCHITECTURE.md « The forms » and docs/SEAMLESS.md (rules 2 and 7).
2. In `src/forms/forms.js`: its id in `FORMS` (and in `isForm()`); its settings in `meta.options` under a prefix of its
   own (in `FORM_DEFAULTS`' filter if not `hu`/`gr`); a figure builder like `human()` / `stander()`, posed at its own clock
   (whole turns of its live loop), its parts grown by `g` so `chore()` grows it out of the blob, chosen in `build()`; what
   the shared modifiers mean for it. At rest every modifier enters as `x * 1` / `x + 0`.
   A **posture** is a pose parameter of its builder going continuously from 0 to 1 (loops then blend to it, no melt).
3. Every fiche, the clock and the objects: render each in the new form; adapt what must be; list in a fiche's `formFit`
   what truly can't be done, the reason in French.
4. In `app/main.js`: its names in `TF_FORMS`, `BODY_FORMS`, `FORM_NAMES`; its settings rows in `transformGroups()`; its
   floor or room conversions in `effOpts()` if it stands on something.
5. `npm test` plays every fiche and a life in it by itself (`FORM_CASES` comes from `FORMS`); add a variant case there if
   its loop length or a pose needs one, and a transformation case in `TF_CASES`. → « all seams exact ».
6. Update docs (VISION « Ce qui existe », ARCHITECTURE), commit, push, publish the artifact and tell the author what to
   try (Vivre › Forme, « Régler les formes humaines »).
