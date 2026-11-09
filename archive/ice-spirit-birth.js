// An ice-light spirit forever being born: a faint seed of cold light in the void, streaks of frost spiralling in,
// rings collapsing onto it as it beats faster, a white ignition, then a crystalline body, halo and wings of light
// unfolding out of the flash. It holds, breathes, and sheds itself into drifting frost motes until only the seed
// is left, and the gathering starts again. Pure function of time: the loop never seams.
import { fit, sparkle, flare, band, cycle, burst, clamp, lerp, seg, bump, ease, loopNoise, mix, TAU, WHITE } from "../pixelfx/src/core/index.js";

export const meta = {
  name: "Ice spirit birth",
  desc: "A seed of cold light gathers frost, ignites white, and a glassy ice spirit with a halo and wings of light unfolds, breathes, then sheds into frost motes back to the seed.",
  tags: ["spawn", "birth", "ice", "spirit", "light", "summon", "magic", "loop"],
  size: [160, 160],
  origin: [80, 84],
  duration: 4.8,
  loop: true,
  fps: 30,
  bg: "black",
  options: { palette: ["#081026", "#102654", "#1a4a90", "#2c7ccc", "#58b6ee", "#9fe0ff", "#dcf8ff", "#ffffff"], seed: 7 },
};

const D = meta.duration;
// the choreography, in fractions of the loop
const IGNITE = 0.42, FORMED = 0.6, SHED = 0.76, GONE = 0.97;

function phases(u) {
  const form = ease.outCubic(seg(u, IGNITE, FORMED));
  const shed = ease.inOutSine(seg(u, SHED, GONE));
  const A = form * (1 - shed) * (1 + 0.035 * Math.sin(TAU * u * 4) * form); // how much of the body exists, breathing
  // the seed: faint, then beating faster and brighter as it gathers, swallowed by the body, left behind again
  const gather = seg(u, 0.04, IGNITE);
  const beatF = lerp(1.2, 7, gather * gather);
  const beat = Math.max(0, Math.sin(TAU * (u * D) * beatF * 0.5)) ** 6;
  const seed = 0.18 + gather * 0.55 + beat * gather * 0.5;
  const flash = bump(u, IGNITE - 0.012, IGNITE + 0.05);
  return { form, shed, A, gather, seed, flash, beat };
}

// streaks of frost spiralling in toward the seed, arriving before the ignition
function streaks(p, C, u, o, front) {
  burst(46, o.seed * 31 + 3, (r, i) => {
    const arrive = r.range(0.12, IGNITE + 0.01), dur = r.range(0.12, 0.24), k = seg(u, arrive - dur, arrive);
    if (k <= 0 || k >= 1) return;
    const a0 = r.range(0, TAU), R0 = r.range(44, 74), twist = r.range(0.6, 1.4) * (i % 2 ? 1 : -1);
    const depth = Math.sin(a0 + twist);
    if (depth >= 0 !== front) return;
    const e = ease.inQuad(k), R = R0 * (1 - e), a = a0 + twist * e, tail = 2 + 10 * e;
    const pt = (rr, aa) => [Math.cos(aa) * rr, Math.sin(aa) * rr * 0.82];
    const [x, y] = pt(R, a), [x1, y1] = pt(R + tail, a - twist * 0.08);
    const al = Math.min(1, k * 4) * (front ? 1 : 0.6);
    p.line(x1, y1, x, y, (v) => (v > 0.75 ? WHITE : v > 0.4 ? C[6] : C[4]), (v) => al * (0.25 + 0.75 * v));
    p.glow(x, y, 4, C[5], 0.25 * al);
  });
}

// rings of light collapsing onto the seed
function implosion(p, C, u) {
  for (const [t0, t1, R0] of [[0.16, 0.3, 46], [0.24, 0.37, 38], [0.31, 0.42, 30]]) {
    const k = seg(u, t0, t1);
    if (k <= 0 || k >= 1) continue;
    const r = R0 * (1 - ease.inCubic(k)), a = Math.sin(Math.PI * k);
    if (r < 1.5) continue;
    band(p, 0, 0, r, 0.82, 1, 0.55 * a, C.slice(3), () => true, k > 0.75);
    p.glowRing(0, 0, r, 4, C[4], 0.16 * a);
  }
}

// the shockwave and ray flare at the ignition
function ignition(p, C, u, ph) {
  const k = seg(u, IGNITE, IGNITE + 0.14);
  if (k > 0 && k < 1) {
    const r = 6 + 58 * ease.outExpo(k), a = (1 - k) ** 1.5;
    band(p, 0, 0, r, 0.82, 2.5 * (1 - k) + 1, a, C.slice(2), () => true, k < 0.25);
    p.glowRing(0, 0, r, 8, C[5], 0.35 * a);
  }
  if (ph.flash > 0) {
    flare(p, 0, 0, 28 * ph.flash, 0.6, C);
    p.circle(0, 0, 3 + 7 * ph.flash, WHITE);
    p.glow(0, 0, 70, C[5], 0.6 * ph.flash);
    p.glow(0, 0, 22, WHITE, 0.7 * ph.flash);
  }
}

// the body: a glassy spirit of light, a round head over a flame-like torso that tapers to a wavering tail,
// translucent inside, a hard 1 px rim (white on the lit upper left), lit from the top left
function body(p, C, u, A, Y) {
  if (A <= 0.02) return;
  const HR = 7 * A, HY = Y - 22 * A, RX = 14 * A, T0 = Y - 16 * A, T1 = Y + 30 * A;
  const tw = (y) => {
    const v = (y - T0) / (T1 - T0); // 0 shoulders .. 1 tail tip
    if (v < 0 || v > 1) return 0;
    return RX * (v < 0.22 ? Math.sqrt(1 - ((0.22 - v) / 0.24) ** 2) * 0.96 + 0.04 : Math.pow(1 - (v - 0.22) / 0.78, 1.35));
  };
  const sway = (y) => Math.sin(TAU * u * 2 - (y - Y) * 0.16) * 2.2 * A * seg(y, Y - 4 * A, T1);
  const inside = (x, y) => {
    const hd = Math.hypot(x - sway(HY) * 0.2, (y - HY) * 1.05) / HR;
    if (hd <= 1) return { d: hd, dx: (x - sway(HY) * 0.2) / HR, v: -1 };
    const w = tw(y);
    if (w > 0.4) { const dx = (x - sway(y)) / w; if (Math.abs(dx) <= 1) return { d: Math.abs(dx), dx, v: (y - T0) / (T1 - T0) }; }
    return null;
  };
  const a = clamp(A * 1.5);
  for (let y = Math.floor(HY - HR - 1); y <= Math.ceil(T1 + 1); y++)
    for (let x = Math.floor(-RX - 5); x <= Math.ceil(RX + 5); x++) {
      const px = x + 0.5, py = y + 0.5, q = inside(px, py);
      if (!q) continue;
      // the rim: any neighbour outside
      const rim = !inside(px - 1, py) || !inside(px + 1, py) || !inside(px, py - 1) || !inside(px, py + 1);
      const tail = q.v > 0.55 ? 1 - (q.v - 0.55) / 0.45 : 1;
      if (rim) {
        const lit = q.dx < -0.1 && q.v < 0.5;
        p.dot(px, py, lit ? WHITE : q.dx < 0.3 ? C[6] : C[4], a * (0.35 + 0.65 * tail));
        continue;
      }
      // inside: glassy, brighter toward the upper left, a cold core band down the middle
      const lit = 0.55 - q.dx * 0.3 - Math.max(0, q.v) * 0.35 + (1 - q.d) * 0.3;
      const c = C[clamp(Math.round(2 + lit * 4.4), 2, 6)];
      p.blend(px, py, c, a * (0.5 + 0.35 * (1 - q.d)) * tail);
    }
  // facets: a ridge down the torso and two chevrons, like a crystal seen through the light
  const fa = clamp(A * 1.8 - 0.6);
  if (fa > 0) {
    p.line(-1, T0 + 2, sway(Y + 18 * A) - 1, Y + 18 * A, C[6], 0.6 * fa);
    for (const s of [-1, 1]) p.line(s * RX * 0.8, T0 + 6 * A, sway(Y), Y + 4 * A, s < 0 ? C[7] : C[4], 0.5 * fa);
  }
  // its eyes: two pale slits that open once it's whole
  const eye = clamp((A - 0.75) * 4) * (1 - bump((u * 3.3) % 1, 0.0, 0.05));
  if (eye > 0.5) for (const s of [-1, 1]) { p.px(s * 2.5 - 0.5, HY + 0.5, C[2]); p.px(s * 2.5 - 0.5, HY + 1.5, C[3]); }
  p.glow(0, Y - 4, 34 * A + 6, C[4], 0.3 * A);
  p.glow(-2, HY, 12 * A + 2, C[6], 0.25 * A);
}

// its heart: a small faceted crystal turning, beating with light
function heart(p, C, u, ph, Y, S) {
  if (S < 0.6) {
    p.px(0, Y, WHITE);
    p.glow(0, Y, 6 + 6 * ph.seed, C[5], 0.35 * ph.seed);
    if (ph.seed > 0.4) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.dot(dx, Y + dy, C[6], ph.seed - 0.3);
    return;
  }
  const turn = Math.cos(TAU * u * 2), hw = S * (0.55 + 0.35 * Math.abs(turn)), hh = S * 1.5;
  const mid = turn * hw * 0.4;
  p.poly([[0, Y - hh], [-hw, Y], [mid, Y + hh * 0.75]], C[7]);
  p.poly([[0, Y - hh], [hw, Y], [mid, Y + hh * 0.75]], C[5]);
  p.line(0, Y - hh, mid, Y + hh * 0.75, WHITE);
  p.glow(0, Y, 10 + S * 3, C[6], 0.35 + 0.25 * ph.beat);
  sparkle(p, 0, Y, Math.round(1 + S * 0.5 + ph.beat * 2), C[6], C[4], 0.3);
}

// a halo: a tilted ring over the head, its far half behind the body
function halo(p, C, u, A, Y, back) {
  const k = ease.outBack(seg(u, IGNITE + 0.08, FORMED + 0.06)) * (1 - ease.inSine(seg(u, SHED, SHED + 0.12)));
  if (k <= 0.05) return;
  const cy = Y - 22 * A - 11 + Math.sin(TAU * u * 2) * 0.8;
  band(p, 0, cy, 8 * k, 0.3, 1.5, (back ? 0.55 : 1) * clamp(k), C.slice(2), back ? (g) => Math.sin(g) < 0 : (g) => Math.sin(g) >= 0, !back);
  if (!back) p.glow(0, cy, 14 * k, C[5], 0.25 * k);
}

// wings: five feathers of light a side fanning up from the shoulders, unfurling and rippling, solid 1 px lines
// whose color cools from a white tip to a deep root
function wings(p, C, u, A, Y) {
  const k = ease.outBack(seg(u, IGNITE + 0.06, FORMED + 0.08), 1.1) * (1 - ease.inQuad(seg(u, SHED - 0.02, SHED + 0.14)));
  if (k <= 0.02) return;
  const SY = Y - 12 * Math.max(A, 0.4);
  for (const s of [-1, 1])
    for (let f = 4; f >= 0; f--) {
      const L = [42, 39, 34, 28, 21][f] * k, a0 = 1.05 - f * 0.24, pts = [];
      const n = Math.max(2, Math.round(L / 2.5));
      for (let i = 0; i <= n; i++) {
        const v = i / n, wave = Math.sin(TAU * u * 2 - v * 3 - f * 0.6) * 2 * v * k;
        const ang = a0 - v * (0.75 - f * 0.05);
        pts.push([s * (5 + Math.cos(ang) * L * v), SY + f * 2 - Math.sin(ang) * L * v + wave]);
      }
      // the back feathers are dimmer: depth, not alpha
      const top = [7, 7, 6, 6, 5][f], mid = [6, 5, 5, 4, 4][f], root = [4, 4, 3, 3, 2][f];
      for (let i = 1; i < pts.length; i++) {
        const v = i / (pts.length - 1), c = v > 0.85 ? (top === 7 ? WHITE : C[top]) : v > 0.4 ? C[mid] : C[root];
        p.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], c);
      }
      const [tx, ty] = pts[pts.length - 1];
      p.glowLine(pts[1][0], pts[1][1], tx, ty, 5, C[4], 0.1 * k);
      if (f === 0) sparkle(p, tx, ty, Math.round(1 + 2 * k), C[6], C[4], 0.3);
      else p.glow(tx, ty, 3, C[6], 0.25 * k);
    }
}

// small ice shards orbiting the spirit while it's whole
function shards(p, C, u, A, Y, front) {
  if (A <= 0.1) return;
  for (let i = 0; i < 4; i++) {
    const th = TAU * (u * 2 + i / 4), d = Math.sin(th);
    if (d >= 0 !== front) continue;
    const x = Math.cos(th) * 24 * A, y = Y + 4 + d * 7 * A - Math.cos(th * 2) * 2, s = 1.5 + A * 1.5;
    const a = clamp(A * 1.3) * (front ? 1 : 0.55);
    if (a < 0.3) continue;
    p.poly([[x, y - s * 1.6], [x - s, y], [x, y + s * 1.6]], front ? C[6] : C[4]);
    p.poly([[x, y - s * 1.6], [x + s, y], [x, y + s * 1.6]], front ? C[4] : C[3]);
    p.px(x - 0.5, y - s * 0.6, front ? WHITE : C[5]);
    p.glow(x, y, 6, C[5], 0.2 * a);
  }
}

// the shedding: the body comes apart into frost motes that drift up and away and fade, before the loop ends
function shedding(p, C, u, o, Y, front) {
  burst(70, o.seed * 17 + 5, (r, i) => {
    const born = r.range(SHED - 0.02, GONE - 0.08), life = r.range(0.1, Math.min(0.24, 0.995 - born)), k = seg(u, born, born + life);
    if (k <= 0 || k >= 1) return;
    if ((i % 3 === 0) !== !front) return;
    const v = r.range(-0.9, 1), x0 = r.range(-1, 1) * 11 * (1 - Math.abs(v) * 0.4), y0 = Y + v * 20;
    const ang = Math.atan2(y0 - Y, x0) + r.range(-0.6, 0.6), sp = r.range(20, 60);
    const e = 1 - Math.exp(-3 * k);
    const x = x0 + Math.cos(ang) * sp * e * 0.6, y = y0 + Math.sin(ang) * sp * e * 0.5 - k * r.range(8, 22);
    const a = (1 - k) ** 1.2 * (front ? 1 : 0.5), big = i % 5 === 0;
    p.dot(x, y, k < 0.3 ? WHITE : big ? C[6] : C[5], a);
    if (big) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.dot(x + dx, y + dy, C[4], a * 0.8);
    p.glow(x, y, big ? 5 : 3, C[5], 0.22 * a);
  });
}

// faint frost drifting in the void all the time, so the dark never goes dead
function ambient(p, C, t, o, front) {
  cycle(t, D, 22, o.seed + 99, (g) => g.range(1.8, 3.2), (age, life, r, i) => {
    if ((i % 2 === 0) !== front) return;
    const k = age / life, a0 = r.range(0, TAU), R = r.range(18, 66);
    const x = Math.cos(a0) * R + Math.sin(age * r.range(1, 2)) * 3, y = Math.sin(a0) * R * 0.8 - age * r.range(3, 8);
    const a = Math.sin(Math.PI * k) * (front ? 0.7 : 0.4);
    p.dot(x, y, i % 4 === 0 ? C[6] : C[4], a);
    if (i % 4 === 0) p.glow(x, y, 3, C[5], 0.15 * a);
  });
}

// while it's whole, frost motes lift off its wings and body, and a soft cold mist breathes round it
function aura(p, C, t, o, A, Y, front) {
  if (A <= 0.05) return;
  cycle(t, D, 30, o.seed + 41, (g) => g.range(0.7, 1.3), (age, life, r, i) => {
    if ((i % 3 === 0) !== !front) return;
    const k = age / life, x0 = r.range(-36, 36) * A, y0 = Y - 14 * A + Math.abs(x0) * -0.35 + r.range(-4, 18) * A;
    const x = x0 + Math.sin(age * 4 + i) * 1.5, y = y0 - age * r.range(10, 22);
    const a = Math.sin(Math.PI * k) * A * (front ? 1 : 0.5);
    if (a < 0.15) return;
    p.px(x, y, k < 0.3 ? WHITE : i % 2 ? C[6] : C[5]);
    p.glow(x, y, 3, C[5], 0.25 * a);
  });
  if (!front)
    for (let i = 0; i < 5; i++) {
      const th = TAU * (t / D + i / 5), x = Math.cos(th) * 14 * A, y = Y + 2 + Math.sin(th) * 9 * A;
      p.disc(x, y, 10 * A, C[3], (d) => 0.1 * A * (1 - d));
    }
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), u = t / D, ph = phases(u), Y = Math.sin(TAU * u * 2) * 1.2 * ph.A;
  // a deep cold pool of light that swells with the spirit
  p.glow(0, 0, 60, C[2], 0.12 + 0.25 * ph.A + 0.15 * ph.gather * (1 - ph.form));
  ambient(p, C, t, o, false);
  streaks(p, C, u, o, false);
  shards(p, C, u, ph.A, Y, false);
  halo(p, C, u, ph.A, Y, true);
  aura(p, C, t, o, ph.A, Y, false);
  wings(p, C, u, ph.A, Y);
  shedding(p, C, u, o, Y, false);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), u = t / D, ph = phases(u), Y = Math.sin(TAU * u * 2) * 1.2 * ph.A;
  implosion(p, C, u);
  body(p, C, u, ph.A, Y);
  heart(p, C, u, ph, Y - 6 * ph.A, ph.A * 4);
  halo(p, C, u, ph.A, Y, false);
  shards(p, C, u, ph.A, Y, true);
  streaks(p, C, u, o, true);
  shedding(p, C, u, o, Y, true);
  aura(p, C, t, o, ph.A, Y, true);
  ignition(p, C, u, ph);
  ambient(p, C, t, o, true);
}
