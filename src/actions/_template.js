// TEMPLATE of an action (played once: from its rest back to its rest). Not in the catalogue, but tested like one.
// To make a new action: ask the author first « une seule fois, ou en boucle ? »; copy this file to src/actions/<id>.js,
// give it its id and its art, list it in src/actions/index.js, then `npm run render -- actions/<id>` and `npm test`.
// Its card in Vivre, its settings page and its place in every form come from this file alone.
//
// « Lueur » : it lights up and rises a little, light swelling behind it, a ring of light pushed out at its brightest;
// then it is back at rest exactly.
import { seg, ease, WHITE, TAU } from "../../pixelfx/src/core/index.js";
import { action } from "./_action.js";

export const fiche = action({
  // 1. Its id (also its file's name), its card in Vivre (in French), its default length in loops of the blob.
  //    kind: "once" by default; "move" for an action that ends at rest somewhere else (see move.js).
  id: "glow", name: "Lueur", desc: "s’illumine un instant", loops: 2,

  // 2. Its settings, each a row on its page (shared/_fiche.js says them all). Names are new: not the blob's or the host's.
  options: {
    glowPower: [1, "Intensité", 0, 2.5, 0.05], //                      a slider: default, label, min, max, step
    glowRise: [8, "Élévation", 0, 30, 0.5, " px", { forms: ["blob", "human"] }], // a unit; shown in these forms only
    glowEyes: ["happy", "Yeux", { select: [["happy", "Plissés, heureux"], ["open", "Ouverts"]] }], // a list
  },

  // 3. The forms that can't play it, and why, in French (the page greys its card there), e.g.
  //    { grounded: "Sur ses jambes, il ne peut pas… Choisis le blob." }. Every form not listed must play it.
  formFit: {},

  // 4. What it does. prog(t) is its progress: 0 at rest before it, 1 at rest after it. Make every change of an envelope
  //    that is 0 at both ends, so its first and last frames are its rest's in every form (npm test checks it).
  play: (o, { prog }) => {
    const env = (t) => Math.sin(Math.PI * prog(t)) ** 2;
    return {
      // the modifiers that move and light its body, in every form (forms.js); quiet: 1 hides the drops of light born
      // while it acts. On its legs it stays on its floor (dy: 0).
      mods: (t) => {
        const e = env(t), a = prog(t);
        return { dy: o.form === "grounded" ? 0 : -o.glowRise * e, glow: 0.5 * o.glowPower * e, halo: 1 + o.glowPower * e,
          happy: o.glowEyes === "happy" && e > 0.3 ? 1 : 0, armOpen: 0.6 * e, armUp: 0.2 * e, quiet: a > 0 && a < 1 ? 1 : 0 };
      },
      // what it draws behind its body; st: where its body is (x, y, its size sx, sy), its hands, head, feet...
      back(p, C, t, st) {
        const e = env(t);
        if (e > 0.01) p.glow(st.x, st.y, o.size * (1.5 + st.sy) * (0.6 + 0.4 * e), C[5], 0.35 * e * o.glowPower);
      },
      // and in front: a ring of light pushed out at its brightest, gone well before the end
      front(p, C, t, st) {
        const k = seg(prog(t), 0.4, 0.75);
        if (k <= 0 || k >= 1) return;
        const r = o.size * (1.2 + 1.6 * ease.outCubic(k)), al = (1 - k) ** 1.5;
        for (let j = 0, m = Math.ceil(r * 5); j < m; j++) {
          const th = (j / m) * TAU;
          p.dot(st.x + Math.cos(th) * r * Math.max(1, st.sx), st.y + Math.sin(th) * r * 0.9, k < 0.3 ? WHITE : C[6], al);
        }
        p.glowRing(st.x, st.y, r, 4, C[5], 0.25 * al * o.glowPower);
      },
    };
  },
});
// 5. The fiche is also a pixelfx effect playing only this action.
export const { meta, drawBack, draw } = fiche;
