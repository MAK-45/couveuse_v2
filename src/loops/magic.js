// « Magie » : it rises over a turning circle of runes, eyes shut in concentration, light spiralling up, pulses. A figure
// raises its arms over the circle; on its legs it stays standing on its floor.
import { rng, hex, TAU, WHITE } from "../../pixelfx/src/core/index.js";
import { hsl, fromHsl } from "../shared/_color.js";
import { loop, phase, whole, gnd, ring } from "./_loop.js";

// the palette turned round the colour wheel by hue degrees
const shifted = (C, hue) => (hue ? C.map((c) => { const [h, s, l] = hsl(c); return hex(fromHsl((((h + hue) % 360) + 360) % 360, s, l)); }) : C);
// the row its feet stand on (in a new form), where the circle lies
const under = (st) => (st.floor != null ? st.floor - 1 : Math.max(...st.feet.map((f) => f[1])) + 3);
const spark = (p, C, x, y, a = 1) => { p.px(x, y, WHITE); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.dot(x + dx, y + dy, C[6], a); p.glow(x, y, 4, C[5], 0.35 * a); };
// tiny pixel runes riding the circle
const RUNES = [["01110", "10001", "10101", "10001", "01110"], ["00100", "01110", "10101", "00100", "00100"], ["10001", "01010", "00100", "01010", "10001"],
  ["11111", "00100", "01110", "00100", "11111"], ["01010", "11111", "01010", "11111", "01010"], ["00100", "01010", "10001", "01010", "00100"]];
function glyph(p, rows, x, y, c, a = 1, k = 1) {
  const h = rows.length * k, w = rows[0].length * k;
  x = Math.round(x - w / 2); y = Math.round(y - h / 2);
  rows.forEach((r, j) => [...r].forEach((b, i) => {
    if (b !== "1") return;
    for (let v = 0; v < k; v++) for (let u = 0; u < k; u++) (a >= 1 ? p.px(x + i * k + u + 0.5, y + j * k + v + 0.5, c) : p.dot(x + i * k + u + 0.5, y + j * k + v + 0.5, c, a));
  }));
}

export const fiche = loop({
  id: "magic", name: "Magie", desc: "cercle de runes, lumière",
  options: {
    magicEyes: ["closed", "Yeux", { select: [["closed", "Fermés, concentré"], ["open", "Ouverts"], ["happy", "Plissés"]] }],
    magicCircle: [34, "Taille du cercle", 10, 90, 1, " px"],
    magicTurns: [1, "Tours du cercle par boucle", 0, 4, 1],
    magicRunes: [8, "Runes", 0, 16, 1],
    magicPulses: [2, "Pulsations par boucle", 1, 8, 1],
    magicSparkles: [24, "Étincelles", 0, 80, 1],
    magicRise: [8, "Lévitation", 0, 40, 0.5, " px", { forms: ["blob", "human"] }],
    magicHue: [0, "Teinte de la magie", 0, 360, 1, "°"],
  },
  play: (o) => ({
    mods(t) {
      const ph = phase(o, t), pu = Math.max(0, Math.sin(TAU * whole(o.magicPulses) * ph)) ** 3;
      return { dy: gnd(o) ? 0 : -o.magicRise + Math.sin(TAU * 2 * ph) * 1.5, glow: 0.08 + 0.3 * pu, halo: 1.3 + 0.8 * pu, shut: o.magicEyes === "closed" ? 1 : 0, happy: o.magicEyes === "happy" ? 1 : 0, quiet: 1,
        armUp: 0.55 + 0.35 * pu, armOpen: 0.4 * (1 - pu) };
    },
    // the circle: its half behind the creature drawn behind it, its half in front drawn in front
    circle(p, C0, t, st, front) {
      const C = shifted(C0, o.magicHue), ph = phase(o, t), R = o.magicCircle, cy = st.feet ? under(st) + (gnd(o) ? 0 : o.magicRise * 0.3) : st.y - this.mods(t).dy + o.size * 1.25 + o.magicRise * 0.3, cx = st.x;
      const rot = TAU * whole(o.magicTurns, 0) * ph, pu = Math.max(0, Math.sin(TAU * whole(o.magicPulses) * ph)) ** 3;
      const side = (th) => (Math.sin(th) >= 0) === front;
      if (!front) { p.glow(cx, cy, R * 1.3, C[4], 0.3 + 0.25 * pu); p.glow(cx, cy, R * 0.6, C[6], 0.15 + 0.2 * pu); }
      ring(p, cx, cy, R, R * 0.32, C[6], 1, side);
      ring(p, cx, cy, R * 0.78, R * 0.25, C[5], 0.8, side);
      // ticks between the two rings, turning
      for (let i = 0; i < 24; i++) {
        const th = rot + (i / 24) * TAU;
        if (!side(th)) continue;
        p.px(cx + Math.cos(th) * R * 0.89, cy + Math.sin(th) * R * 0.285, i % 3 ? C[5] : WHITE);
      }
      // runes riding the ring
      const n = whole(o.magicRunes, 0);
      for (let i = 0; i < n; i++) {
        const th = -rot * 0.5 + (i / n) * TAU;
        if (!side(th)) continue;
        glyph(p, RUNES[i % RUNES.length], cx + Math.cos(th) * R * 1.18, cy + Math.sin(th) * R * 0.38 - 3, front ? WHITE : C[6]);
        p.glow(cx + Math.cos(th) * R * 1.18, cy + Math.sin(th) * R * 0.38 - 3, 5, C[5], 0.3);
      }
      if (front) {
        // light spiralling up from the circle round the blob
        const m = whole(o.magicSparkles, 0), g = rng(o.seed, 909);
        for (let i = 0; i < m; i++) {
          const k = (((ph * 2 + g.range(0, 1)) % 1)), th = g.range(0, TAU) + k * TAU, r = R * (0.9 - 0.6 * k);
          const x = cx + Math.cos(th) * r, y = cy - k * (o.size * 3 + R * 0.5) + Math.sin(th) * r * 0.3;
          spark(p, C, x, y, Math.sin(Math.PI * k));
        }
        if (pu > 0.6) p.glow(st.x, st.y, o.size * 2.4, WHITE, 0.25 * (pu - 0.6) * 2.5);
      }
    },
    back(p, C, t, st) { this.circle(p, C, t, st, false); },
    front(p, C, t, st) { this.circle(p, C, t, st, true); },
  }),
});
export const { meta, drawBack, draw } = fiche;
