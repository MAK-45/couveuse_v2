---
paths:
  - "src/**"
---
# Writing effects (src/)

- An action or a loop is a **fiche**: one file (`src/actions/<id>.js`, `src/loops/<id>.js`) built by its host
  (`_action.js`, `_loop.js`) and listed in its catalogue (`index.js`). Start from `_template.js`. The options syntax is in
  `src/shared/_fiche.js`; a name the blob or the host already has throws.
- Pure functions of `(t, options)`: no state between frames, no `Math.random()` (use `rng(seed, …)`), no wall clock.
- Counts that drive motion are whole (`whole()`, `Math.round`); noise is read on a circle of time; particles use
  `cycle(t, period, …)` with the loop's period; one-shot effects end before progress 1.
- The creature is drawn by the host through `bodyBack` / `bodyFront` / `bodyAmbient` (forms.js), never `blobBack` /
  `blobFront`. A fiche gives `mods(t)` (they move and light it in every form) and `back` / `front` hooks that get `st`:
  `x, y` the middle of its body, `sx, sy` its size against the blob's, `hands`, `head`, `headR`, `feet`, `top`, `floor`, `U`.
- Figure-only modifiers (the blob ignores them): `armUp`, `armOpen`, `hold`, `reach` + `reachK`; poses `legs`, `arms`,
  `seat` (taken little by little by the loop host: `poseK`, the body going part by part to the pose); `gait`, `turn` (walking, running). On its legs `dx`
  is steps, `dy < 0` a jump, `dy > 0` bent knees: set `dy: 0` where the blob only floats up.
- `ax`, `ay` carry all of it as a pure translation: a dither on the floor reads its column from `room[0]`.
- Painter: `p.disc(x, y, r, c, a)` needs `a`; colours are numbers (`hex(fromHsl(...))`, `fit(...)`), strings fail
  silently; `p.px` for crisp pixels, `p.dot` dithers with its alpha, `p.blend` for true translucency, `p.glow` for light.
- Pixel art: hard ramp steps of `fit(o.palette, 8)`, 1-px rims lit top-left, glow only in the light buffer, no
  anti-aliasing. Eyes only (no mouth or nose); objects look solid and float.
- `pixelfx/` is never edited (a hook refuses it): import its core from `../../pixelfx/src/core/index.js`.
- After a change: `npm test` prints « all seams exact »; look at `npm run render -- <dir>/<id>`.
