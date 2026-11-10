// « Changer de couleur » : a circle of runes turns on the floor under the creature, in the colour it is taking. Its light
// carries the change: the creature's tones glide to the palette it is given while the circle turns, its eyes take the
// two darkest tones of that palette, and at rest it stands in its new colour. The circle is pixelfx's « Rune circle »
// (arcane/rune-circle.js, MIT), redrawn here with settings of its own; it fades in with the entry and is gone before the end.
import { PAL, TAU, WHITE, fit, cycle, smooth, ease, sparkle } from "../../pixelfx/src/core/index.js";
import { action } from "./_action.js";
import { floorRing, glyph, mote } from "../shared/_floor.js";
import { lookFor } from "../shared/_look.js";

// the circle at its default size (px): radii, and the slant of the floor it lies on
const R0 = 46, RI0 = 23, RC0 = 7, RR0 = 39, SY = 0.3;
const count = (v) => Math.max(0, Math.round(v || 0));
// its strength over the action: it rises in the entry and is gone well before progress 1
const fade = (a) => smooth(0, 0.22, a) * (1 - smooth(0.8, 0.95, a));
// the angle between two angles, unsigned
const gap = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

export const fiche = action({
  id: "couleur",
  name: "Changer de couleur",
  desc: "cercle de runes, la lumière prend une autre teinte",
  kind: "look",
  loops: 2,

  options: {
    couleurPalette: [PAL.arcane, "Palette cible", { palette: true }],
    couleurCircle: [34, "Taille du cercle", 10, 90, 1, " px"],
    couleurTurns: [1, "Tours du cercle", 0, 4, 1],
    couleurRunes: [12, "Runes", 0, 16, 1],
    couleurSparkles: [24, "Étincelles", 0, 80, 1],
    couleurGlow: [1, "Lueur", 0, 2.5, 0.05],
  },

  formFit: {},

  // the look it ends with, and the window of its length in which its tones glide to it
  look: { to: (o) => lookFor(o.couleurPalette), window: [0.3, 0.7] },

  play: (o, { T, prog }) => {
    const k = o.couleurCircle / R0, S = (v) => v * k;
    const D = o.duration, turns = count(o.couleurTurns), n = count(o.couleurRunes), sparks = count(o.couleurSparkles), lueur = o.couleurGlow;
    // the circle is drawn in the colour it is taking (the body glides to it while the circle turns)
    const CT = fit(o.couleurPalette, 8);

    // the floor under the creature: under its feet when it has feet, under its body (where it floats) when it has none
    const floorAt = (st) => (st.feet ? (st.floor != null ? st.floor - 1 : Math.max(...st.feet.map((f) => f[1])) + 3) : st.y + o.size * 1.25);
    // a point of the circle at angle g and radius r (px), relative to its centre
    const rel = (g, r) => [Math.cos(g) * S(r), Math.sin(g) * S(r) * SY];

    // one half of the circle at (st.x, floor): the far half (behind the creature, far) or the near half (in front of it)
    function circle(p, t, st, far, a) {
      const cx = st.x, cy = floorAt(st), ph = t / D, spin = (TAU * turns * t) / T, chase = ph * TAU * 2;
      const lit = (g, w) => gap(g, chase) < w || gap(g, chase + Math.PI) < w;
      const tone = (g, hi, lo) => (Math.sin(g) < 0 ? lo : hi);
      const keep = far ? (g) => Math.sin(g) < 0 : (g) => Math.sin(g) >= 0;
      const at = (g, r) => { const [x, y] = rel(g, r); return [cx + x, cy + y]; };
      // the two rings, the light running round the outer one
      floorRing(p, cx, cy, S(R0), SY, (g) => (lit(g, 0.22) ? WHITE : lit(g, 0.5) ? CT[6] : tone(g, CT[6], CT[5])), a, keep);
      floorRing(p, cx, cy, S(RI0), SY, (g) => tone(g, CT[5], CT[4]), a, keep);
      floorRing(p, cx, cy, S(RC0), SY, (g) => tone(g, CT[6], CT[5]), a, keep);
      // studs round the outside, turning with the ring
      for (let j = 0; j < 16; j++) {
        const g = spin + ((j + 0.5) * TAU) / 16;
        if ((Math.sin(g) < 0) !== far) continue;
        const [x, y] = at(g, R0 + 3.5), hot = lit(g, 0.3);
        p.dot(x, y, hot ? WHITE : tone(g, j % 2 ? CT[5] : CT[6], CT[4]), a);
        if (j % 2 === 0) for (const [dx, dy] of [[1, 0], [-1, 0]]) p.dot(x + dx, y + dy, hot ? CT[6] : tone(g, CT[4], CT[3]), a);
      }
      // a square turning the other way inside the inner ring, its corners touching it
      const sq = [0, 1, 2, 3].map((q) => rel(-spin + (q * TAU) / 4 + Math.PI / 4, RI0));
      for (let q = 0; q < 4; q++) {
        let [ax, ay] = sq[q], [bx, by] = sq[(q + 1) % 4];
        if ((ay < 0) !== (by < 0)) {
          const u = ay / (ay - by), mx = ax + (bx - ax) * u;
          if ((ay < 0) === far) (bx = mx), (by = 0);
          else (ax = mx), (ay = 0);
        } else if ((ay < 0) !== far) continue;
        p.line(cx + ax, cy + ay, cx + bx, cy + by, far ? CT[4] : CT[5], a);
      }
      // the runes ride the outer band; bright at the front, dim behind, flaring as the light passes
      const gs = [];
      for (let q = 0; q < n; q++) {
        const g = spin + ((q + 0.5) * TAU) / n;
        if ((Math.sin(g) < 0) === far) gs.push([q, g]);
      }
      gs.sort((x, y) => Math.sin(x[1]) - Math.sin(y[1]));
      for (const [q, g] of gs) {
        const [x, y] = rel(g, RR0), hot = lit(g, 0.2), bob = Math.sin(ph * TAU * 4 + 4 * g) * 0.5;
        const X = cx + x, Y = cy + y - 1 + bob;
        glyph(p, [0, 3, 5][q % 3], X, Y, hot ? WHITE : far ? CT[5] : CT[6], a, hot ? CT[5] : far ? CT[2] : CT[3]);
        p.glow(X, Y - 3, hot ? 10 : 6, CT[5], (hot ? 0.5 : far ? 0.12 : 0.22) * a * lueur);
        p.glow(X, Y, 5, CT[4], 0.15 * a * lueur);
      }
    }

    // motes rising off the circle on a slow helix, and twinkles hanging over it (one half each, as the circle)
    function motes(p, t, st, far, a) {
      const cx = st.x, cy = floorAt(st);
      cycle(t, D, 3 * sparks, o.seed * 5 + 1, (g) => g.range(1.1, 1.9), (age, life, r) => {
        const g0 = r.range(0, TAU), r0 = S(r.pick([R0, R0, RR0, RR0, RI0])), q = age / life, g = g0 + q * r.range(0.6, 1.4);
        if ((Math.sin(g) < 0) !== far) return;
        const rr = r0 * (1 - 0.35 * q), h = 2 + ease.outQuad(q) * S(r.range(26, 52));
        const x = cx + Math.cos(g) * rr, y = cy + Math.sin(g) * rr * SY - h;
        const al = Math.min(1, q * 5) * (1 - smooth(0.65, 1, q)), big = r.chance(0.2);
        mote(p, x, y, -Math.sin(g) * rr * 0.8, -36 * (1 - q) - 10, r.chance(0.3) ? WHITE : r.chance(0.6) ? CT[6] : CT[5], big ? 1.1 : r.range(0.55, 0.9), al * a, big ? 0.5 : 0.3);
      });
      cycle(t, D, sparks, o.seed * 5 + 2, 0.45, (age, life, r) => {
        const g = r.range(0, TAU);
        if ((Math.sin(g) < 0) !== far) return;
        const rr = S(r.range(8, R0)), x = cx + Math.cos(g) * rr, y = cy + Math.sin(g) * rr * SY - r.range(6, 34);
        const kk = Math.sin((age / life) * Math.PI);
        sparkle(p, x, y, 1 + 2.4 * kk, CT[6], CT[5], 0.35 * kk * a);
      });
    }

    return {
      // what moves and lights the creature while it acts (its arms lift towards the circle on figures); quiet hides the drops
      mods(t) {
        const a = prog(t), e = fade(a);
        return { glow: 0.35 * e * lueur, halo: 1 + 0.6 * e, armUp: 0.3 * e, armOpen: 0.25 * e, quiet: a > 0 && a < 1 ? 1 : 0 };
      },
      // the far half of the circle, its glow on the floor, the column of light over it
      back(p, C, t, st) {
        const a = fade(prog(t));
        if (a <= 0.01) return;
        const cx = st.x, cy = floorAt(st), pulse = 0.85 + 0.15 * Math.sin((t / D) * TAU * 4);
        p.glow(cx, cy, S(R0) * 1.4, CT[4], 0.24 * pulse * a * lueur);
        for (const s of [-1, 1]) p.glow(cx + s * S(R0) * 0.55, cy + 1, S(R0) * 0.7, CT[5], 0.12 * pulse * a * lueur);
        for (let h = 0; h < 66; h += 6) p.glow(cx, cy - S(h), S(26), CT[4], 0.11 * pulse * a * lueur * (1 - h / 80));
        circle(p, t, st, true, a);
        motes(p, t, st, true, a);
      },
      // the near half of the circle, its motes, and two sparks of light running round the ring
      front(p, C, t, st) {
        const a = fade(prog(t));
        if (a <= 0.01) return;
        circle(p, t, st, false, a);
        motes(p, t, st, false, a);
        const cx = st.x, cy = floorAt(st), chase = (t / D) * TAU * 2;
        for (const g of [chase, chase + Math.PI]) {
          const [x, y] = rel(g, R0);
          sparkle(p, cx + x, cy + y, 2.5 + Math.sin(t * 30) * 0.8, CT[6], CT[5], 0.5 * a);
          p.glow(cx + x, cy + y, 14, CT[5], 0.4 * a * lueur);
        }
      },
    };
  },
});
// the fiche is also a pixelfx effect playing only this action
export const { meta, drawBack, draw } = fiche;
