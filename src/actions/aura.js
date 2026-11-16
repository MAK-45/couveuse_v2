// « Halo de lumière » : it charges with light (it rises, unless on its legs, and opens its arms), rays turn round it, rings
// of light push out on each pulse, motes spiral up; then it is back at rest exactly.
import { clamp, seg, ease, rng, TAU, WHITE } from "../../pixelfx/src/core/index.js";
import { action } from "./_action.js";

const E = ease.inOutSine;

export const fiche = action({
  id: "aura", name: "Halo de lumière", desc: "se charge de lumière",
  options: {
    auraPower: [1, "Puissance", 0, 2.5, 0.05],
    auraRadius: [1.6, "Rayon du halo", 0.5, 3.5, 0.05],
    auraPulses: [3, "Ondes de lumière", 1, 8, 1],
    auraRays: [12, "Rayons", 0, 36, 1],
    auraRise: [10, "Élévation", 0, 60, 0.5, " % de la scène", { scene: 5, forms: ["blob", "human"] }],
    auraEyes: ["closed", "Yeux pendant le halo", { select: [["closed", "Fermés, concentré"], ["open", "Ouverts"], ["happy", "Plissés, heureux"]] }],
  },
  play: (o, { prog }) => ({
    env: (t) => { const a = prog(t); return a <= 0 || a >= 1 ? 0 : Math.sin(Math.PI * a) ** 2; },
    mods(t) {
      const a = prog(t), e = this.env(t);
      // (on its legs it stays on the floor and spreads its arms)
      return { dy: o.form === "grounded" ? 0 : -o.auraRise * e, glow: 0.6 * o.auraPower * e, halo: 1 + 1.8 * o.auraPower * e, shut: o.auraEyes === "closed" ? clamp(e * 1.6) : 0, happy: o.auraEyes === "happy" && e > 0.3 ? 1 : 0, quiet: a > 0 && a < 1 ? 1 : 0,
        armOpen: E(clamp(e * 1.4)), armUp: 0.35 * e * e };
    },
    back(p, C, t, st) {
      const a = prog(t), e = this.env(t);
      if (e <= 0.001) return;
      const R = o.size * o.auraRadius * (0.6 + 0.4 * e) * 2, P = o.auraPower;
      p.glow(st.x, st.y, R * 1.6, C[3], 0.35 * e * P);
      p.glow(st.x, st.y, R, C[5], 0.4 * e * P);
      // rays turning slowly, breathing in length
      const n = Math.round(o.auraRays);
      for (let i = 0; i < n; i++) {
        const th = (i / n) * TAU + a * 1.5, L = R * (0.7 + 0.3 * Math.sin(i * 2.3 + a * TAU * 2)) * e, r0 = o.size * 1.1;
        const x0 = st.x + Math.cos(th) * r0, y0 = st.y + Math.sin(th) * r0, x1 = st.x + Math.cos(th) * (r0 + L), y1 = st.y + Math.sin(th) * (r0 + L);
        p.line(x0, y0, x1, y1, (v) => (v < 0.3 ? WHITE : v < 0.7 ? C[6] : C[4]), (v) => e * (1 - v * 0.8));
        p.glowLine(x0, y0, x1, y1, 5, C[5], 0.12 * e * P);
      }
    },
    front(p, C, t, st) {
      const a = prog(t);
      if (a <= 0 || a >= 1) return;
      // rings of light pushed out on each pulse
      const n = Math.max(1, Math.round(o.auraPulses));
      for (let i = 0; i < n; i++) {
        const k = seg(a, 0.12 + (i / n) * 0.62, 0.12 + (i / n) * 0.62 + 0.28);
        if (k <= 0 || k >= 1) continue;
        const r = o.size * (1.1 + o.auraRadius * 1.6 * ease.outCubic(k)), al = (1 - k) ** 1.4;
        for (let j = 0, m = Math.ceil(r * 5); j < m; j++) {
          const th = (j / m) * TAU;
          p.dot(st.x + Math.cos(th) * r, st.y + Math.sin(th) * r * 0.9, k < 0.3 ? WHITE : C[6], al);
        }
        p.glowRing(st.x, st.y, r, 5, C[5], 0.3 * al * o.auraPower);
      }
      // motes spiralling up around it
      const e = this.env(t), g = rng(o.seed, 707);
      for (let i = 0; i < 14; i++) {
        const ph = g.range(0, 1), th = TAU * (ph + a * 2), rr = o.size * (1.2 + 0.4 * Math.sin(i)), y = st.y + o.size - ((a * 3 + ph) % 1) * o.size * 2.6;
        const x = st.x + Math.cos(th) * rr;
        if (e > 0.15) p.px(x, y, Math.sin(th) > 0 ? WHITE : C[5]), p.glow(x, y, 3, C[5], 0.3 * e);
      }
    },
  }),
});
export const { meta, drawBack, draw } = fiche;
