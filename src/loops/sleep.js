// « Sommeil » : low and still, eyes shut, deep slow breaths, bubbles of sleep, now and then a twitch. A figure curls up as
// it floats; on its legs it sits down cross-legged on its floor and nods off (a pose: it really sits down, its knees opening).
import { bump, TAU, WHITE } from "../../pixelfx/src/core/index.js";
import { loop, phase, whole, gnd, ring } from "./_loop.js";

// where the bubbles of sleep come from: by its head, in a new form
const headAt = (st, o, x, y) => (st.head ? [st.head[0] + st.headR * 0.8 + (x - st.x - o.size * 0.55) * 0.6, st.head[1] - st.headR * 0.9 + (y - st.y + o.size * 0.85)] : [x, y]);

export const fiche = loop({
  id: "sleep", name: "Sommeil", desc: "dort, respire, bulles",
  options: {
    sleepBreaths: [3, "Respirations par boucle", 1, 8, 1],
    sleepDepth: [1, "Profondeur du souffle", 0, 3, 0.05],
    sleepSink: [8, "Affaissement", 0, 30, 0.5, " px"],
    sleepBubbles: [4, "Bulles de sommeil", 0, 10, 1],
    sleepDim: [0.5, "Lumière qui baisse", 0, 1, 0.01],
    sleepTwitch: [1, "Petit sursaut dans son sommeil", 0, 2, 0.05],
  },
  play: (o) => ({
    mods(t) {
      const ph = phase(o, t), n = whole(o.sleepBreaths), b = Math.sin(TAU * n * ph), tw = o.sleepTwitch > 0 ? bump(ph, 0.7, 0.74) * o.sleepTwitch : 0;
      return { dy: o.sleepSink - b * 1.5, sy: 1 + 0.06 * o.sleepDepth * b, sx: 1 - 0.035 * o.sleepDepth * b, shut: 1 - tw * 0.6, halo: 1 - 0.55 * o.sleepDim, glow: -0.22 * o.sleepDim + 0.08 * (b + 1) * 0.5,
        dx: tw * Math.sin(t * 90) * 1.5, lookY: 0.5, quiet: 1, ...(gnd(o) ? { seat: 1, arms: "down", rot: 0.05 + 0.02 * b } : { hold: 0.75, legs: o.huLegs === "spirit" ? "spirit" : "lotus" }) };
    },
    front(p, C, t, st) {
      const ph = phase(o, t), n = whole(o.sleepBubbles, 0);
      for (let i = 0; i < n; i++) {
        const k = (((ph - i / n) % 1) + 1) % 1 / 0.45;
        if (k >= 1) continue;
        const s = 1 + Math.round(2.5 * Math.min(1, k * 1.4)), [x, y] = headAt(st, o, st.x + o.size * 0.55 + Math.sin(k * 7 + i) * 2.5 + k * 10, st.y - o.size * 0.85 - k * o.size * 1.9);
        if (k < 0.88) { ring(p, x, y, s, s, C[6], 0.9); p.dot(x - s * 0.45, y - s * 0.45, WHITE, 1); }
        else { const q = (k - 0.88) / 0.12; for (let j = 0; j < 6; j++) { const th = (j / 6) * TAU; p.dot(x + Math.cos(th) * (s + q * 4), y + Math.sin(th) * (s + q * 4), C[6], 1 - q); } }
      }
    },
  }),
});
export const { meta, drawBack, draw } = fiche;
