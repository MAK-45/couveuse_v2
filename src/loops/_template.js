// TEMPLATE of a loop (an activity it keeps up until something else is asked). Not in the catalogue, but tested like one.
// To make a new loop: ask the author first « une seule fois, ou en boucle ? »; copy this file to src/loops/<id>.js, give
// it its id and its art, list it in src/loops/index.js, then `npm run render -- loops/<id>` and `npm test`.
// Write only the loop: its entry from rest and its exit back to rest come by themselves (_loop.js), the drawing faded in
// and out with it. Its card in Vivre, its settings page and its place in every form come from this file alone.
//
// « Lumière qui respire » : its light breathes in and out, slowly; motes of light twinkle round it on each breath.
import { rng, TAU, WHITE } from "../../pixelfx/src/core/index.js";
import { loop, phase, whole } from "./_loop.js";

export const fiche = loop({
  // 1. Its id (also its file's name), its card in Vivre (in French), its period by default in loops of the blob.
  id: "pulse", name: "Lumière qui respire", desc: "sa lumière va et vient", loops: 2,

  // 2. Its settings, each a row on its page (shared/_fiche.js says them all). Names are new: not the blob's or the host's.
  options: {
    pulseBreaths: [2, "Respirations par boucle", 1, 6, 1], // counts that drive motion are whole numbers
    pulseLight: [1, "Intensité", 0, 2, 0.05],
    pulseMotes: [8, "Éclats de lumière", 0, 24, 1],
  },

  // 3. The forms that can't play it, and why, in French (see walk.js). Every form not listed must play it.
  formFit: {},

  // 4. The loop itself, at its own clock t: read time through phase(o, t) (0..1 over its period), and make every motion
  //    turn a whole number of times a period, so frame t is frame t + period (npm test checks it, and its entry and exit).
  play: (o) => {
    const breath = (t) => (1 - Math.cos(TAU * whole(o.pulseBreaths) * phase(o, t))) / 2; // 0 breathed out .. 1 in
    return {
      // the modifiers of its body in every form (forms.js); quiet: 1 hides the drops of light while it is busy
      mods: (t) => { const b = breath(t); return { glow: 0.35 * o.pulseLight * b, halo: 1 + 0.6 * o.pulseLight * b, armOpen: 0.25 * b, quiet: 1 }; },
      // drawn in front of its body (back(p, C, t, st) draws behind); st: where its body is, its size, hands, head...
      front(p, C, t, st) {
        const b = breath(t), g = rng(o.seed, 404), n = whole(o.pulseMotes, 0);
        for (let i = 0; i < n; i++) {
          // each mote twinkles once a breath, at its own moment, somewhere round the body (an ellipse that holds it)
          const th = g.range(0, TAU), r = g.range(1.1, 1.5), at = g.range(0, 1);
          const tw = Math.sin(TAU * (whole(o.pulseBreaths) * phase(o, t) - at)), a = tw * b * o.pulseLight;
          if (a < 0.35) continue;
          const x = st.x + Math.cos(th) * o.size * Math.max(1, st.sx) * r, y = st.y + Math.sin(th) * o.size * st.sy * r;
          p.px(x, y, a > 0.7 ? WHITE : C[6]);
          if (a > 0.7) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + dx, y + dy, C[5]); // a little cross at its brightest
          p.glow(x, y, 4, C[5], 0.45 * a);
        }
      },
    };
  },
});
// 5. The fiche is also a pixelfx effect playing only this loop.
export const { meta, drawBack, draw } = fiche;
