// A creature of ice-light still being born: one body, no limbs, its outline lumpy and never quite settled, buds
// swelling out of it and sinking back, patches of its skin not yet solid. Frost streams and loose fragments of
// itself drift in and merge, it beats inside a luminous cocoon. Every knob is an option; every motion runs at a
// whole number of turns a loop, so whatever the settings the loop never seams.
import { fit, cycle, clamp, lerp, seg, ease, noise2, rng, TAU, WHITE } from "../../pixelfx/src/core/index.js";

export const meta = {
  name: "Ice spirit gestation",
  desc: "A limbless creature of ice-light still forming: a lumpy, shifting body with unfinished skin, fed by frost and drifting fragments, beating inside a luminous halo.",
  tags: ["spawn", "birth", "ice", "spirit", "creature", "light", "blob", "loop"],
  size: [160, 160],
  origin: [80, 80],
  duration: 4,
  loop: true,
  fps: 30,
  bg: "black",
  options: {
    palette: ["#081026", "#102654", "#1a4a90", "#2c7ccc", "#58b6ee", "#9fe0ff", "#dcf8ff", "#ffffff"],
    seed: 7,
    duration: 4, // seconds a loop (the effect's own clock; keep meta.duration in step when you change it)
    // body
    size: 24, lumps: 1, detail: 6, drift: 1, buds: 4, budSize: 1, squash: 0.08, squashAngle: -23,
    // life
    beats: 2, beatPower: 1, breath: 1,
    // skin and inside
    unformed: 0.38, flicker: 1, currents: 1, nucleus: 1, nucleusDrift: 1, lightAngle: 233, glint: 1,
    // halo
    halo: 1, shell: 1, cocoon: 1, cocoonWobble: 1, cocoonOpacity: 1,
    // feeding
    streams: 34, streamReach: 1, streamSpeed: 1, fragments: 6, motes: 26,
  },
};

const ln = (x, y, u, s, r = 1.2) => noise2(x + Math.cos(TAU * u) * r, y + Math.sin(TAU * u) * r, s);
const turns = (v) => Math.round(v); // whole turns a loop keep it seamless

function beat(u, o) {
  const n = Math.max(0, turns(o.beats));
  if (!n) return 0;
  const f = (u * n) % 1;
  return ease.outQuart(seg(f, 0, 0.08)) * (1 - ease.inOutSine(seg(f, 0.08, 0.6)));
}

// the outline as a lookup table over angle, built once a frame
const TABLE = 720;
function shapeOf(o, u) {
  const R = rng(o.seed, 5), harm = [], dr = turns(o.drift);
  for (let k = 2; k <= 1 + Math.max(1, turns(o.detail)); k++)
    harm.push([k, R.range(0, TAU), (o.lumps * R.range(0.05, 0.13)) / Math.sqrt(k - 1), R.pick([-2, -1, 1, 2]) * dr]);
  const buds = [], nb = Math.max(0, turns(o.buds));
  for (let i = 0; i < nb; i++) {
    const g = rng(o.seed, 77, i), t0 = (i / nb + g.range(0, 0.15)) % 1, life = g.range(0.45, 0.7);
    const age = (((u - t0) % 1) + 1) % 1, a0 = g.range(0, TAU), sw = g.range(-0.8, 0.8), h = g.range(0.18, 0.32), wd = g.range(0.35, 0.6);
    if (age < life) buds.push([a0 + age * sw, Math.sin((Math.PI * age) / life) ** 1.5 * h * o.budSize, wd]);
  }
  const b = beat(u, o), size = o.size * (1 + 0.07 * b * o.beatPower + 0.025 * o.breath * Math.sin(TAU * u * 3));
  const sq = (o.squashAngle * Math.PI) / 180, tab = new Float32Array(TABLE + 1);
  for (let j = 0; j <= TABLE; j++) {
    const th = (j / TABLE) * TAU - Math.PI;
    let r = 1;
    for (const [k, ph, a, w] of harm) r += a * Math.sin(k * th + ph + TAU * u * w);
    for (const [a0, h, wd] of buds) {
      let d = th - a0;
      d -= Math.round(d / TAU) * TAU;
      r += h * Math.exp(-(d * d) / (wd * wd));
    }
    tab[j] = Math.max(1, size * r * (1 + o.squash * Math.cos(2 * th + sq)));
  }
  return (th) => {
    const f = ((th + Math.PI) / TAU) * TABLE, i = Math.max(0, Math.min(TABLE - 1, Math.floor(f))), k = f - i;
    return tab[i] + (tab[i + 1] - tab[i]) * k;
  };
}

function halo(p, C, u, o, rad) {
  const b = beat(u, o), S = o.size, H = o.halo;
  p.glow(0, 0, S * 3.4, C[2], (0.28 + 0.1 * b) * H);
  p.glow(0, 0, S * 2.2, C[4], (0.22 + 0.14 * b) * H);
  // a cocoon of light round it, translucent, wobbling on its own, its rim a thin shimmering line
  if (o.cocoon > 0 && o.cocoonOpacity > 0) {
    const cw = 1.5 * o.cocoonWobble, R0 = 1 + 0.32 * o.cocoon, R1 = 0.22 * o.cocoon, E = S * (2.6 + o.cocoon);
    const M = (th) => rad(th) * R0 + S * R1 + Math.sin(3 * th - TAU * u * 2) * cw + b * 2 * o.beatPower;
    for (let y = Math.floor(-E); y <= Math.ceil(E); y++)
      for (let x = Math.floor(-E); x <= Math.ceil(E); x++) {
        const px = x + 0.5, py = y + 0.5, th = Math.atan2(py, px), r = Math.hypot(px, py), e = rad(th), m = M(th);
        if (r > m || r < e) continue;
        const f = (r - e) / (m - e || 1);
        if (m - r < 1) {
          const sh = ln(th * 3, 0, u, o.seed + 61, 1.5);
          p.blend(px, py, sh > 0.55 ? C[6] : C[5], Math.min(1, (0.35 + 0.5 * sh) * o.cocoonOpacity));
        } else p.blend(px, py, C[3], (0.1 + 0.12 * (1 - f)) * o.cocoonOpacity);
      }
  }
  // a soft shell of light just outside the skin, thicker on the lumps
  if (o.shell > 0) {
    const E = S * 2.2;
    p.shade(-E, -E, E, E, (x, y, out) => {
      const th = Math.atan2(y, x), r = Math.hypot(x, y), e = rad(th), d = (r - e) / (S * (0.5 + 0.12 * b));
      if (d < 0 || d > 1) return;
      const shimmer = ln(th * 2.2, d * 2, u, o.seed + 3, 1.6);
      out.c = 0;
      out.l = d < 0.18 ? C[6] : d < 0.5 ? C[5] : C[4];
      out.k = (1 - d) ** 2 * (0.2 + 0.25 * shimmer + 0.2 * b) * o.shell;
    });
  }
}

function body(p, C, u, o, rad) {
  const S = o.size, nd = o.nucleusDrift, nx = Math.cos(TAU * u) * S * 0.12 * nd - 2, ny = Math.sin(TAU * u * 2) * S * 0.08 * nd - 2;
  const la = (o.lightAngle * Math.PI) / 180, lx = Math.cos(la), ly = Math.sin(la), thr = 1 - o.unformed, E = S * 2.4;
  for (let y = Math.floor(-E); y <= Math.ceil(E); y++)
    for (let x = Math.floor(-E); x <= Math.ceil(E); x++) {
      const px = x + 0.5, py = y + 0.5, th = Math.atan2(py, px), r = Math.hypot(px, py), e = rad(th);
      if (r > e) continue;
      const d = r / e, ux = px / e, uy = py / e, edge = d > 0.86;
      if (edge && o.unformed > 0) {
        const unformed = ln(Math.cos(th) * 2.5, Math.sin(th) * 2.5, u, o.seed + 11, 0.9);
        if (unformed > thr) {
          const fl = o.flicker > 0 ? Math.sin(TAU * (u * turns(4 * o.flicker || 1)) + th * 5 + r) ** 2 : 0.5;
          if ((x + y) % 2 === 0) p.px(px, py, fl > 0.5 ? C[6] : C[4]);
          else p.blend(px, py, C[5], 0.25 + 0.3 * fl);
          continue;
        }
      }
      if (edge) {
        const lit = ux * lx + uy * ly;
        p.px(px, py, lit > 0.35 ? WHITE : lit > -0.2 ? C[6] : C[4]);
        continue;
      }
      const cur = o.currents > 0 ? ln(px * 0.09, py * 0.09, u, o.seed + 23, 1.4) : 0.5;
      const dn = Math.hypot(px - nx, py - ny) / S;
      const lit = 0.5 + (ux * lx + uy * ly) * 0.37 + (1 - d) * 0.25 + (cur - 0.5) * 0.3 * o.currents + Math.max(0, 0.45 - dn) * 1.6 * o.nucleus;
      const i = clamp(Math.round(1.5 + lit * 5), 2, 7);
      p.px(px, py, i === 7 ? WHITE : C[i]);
    }
  const b = beat(u, o);
  if (o.nucleus > 0) {
    p.glow(nx, ny, S * 0.9, C[6], (0.3 + 0.3 * b) * o.nucleus);
    p.glow(nx, ny, S * 0.35, WHITE, (0.25 + 0.35 * b) * o.nucleus);
  }
  if (o.glint > 0) {
    const g = (u * 2 + 0.3) % 1;
    if (g < 0.15) {
      const th = la + Math.PI * 0.05 + (g - 0.075) * 3, e = rad(th) - 1.5, k = Math.sin((g / 0.15) * Math.PI);
      p.px(Math.cos(th) * e, Math.sin(th) * e, WHITE);
      p.glow(Math.cos(th) * e, Math.sin(th) * e, 6, C[6], 0.5 * k * o.glint);
    }
  }
}

function streams(p, C, t, o, rad, front) {
  const D = o.duration, sp = Math.max(0.1, o.streamSpeed), reach = o.streamReach;
  cycle(t, D, Math.round(o.streams), o.seed + 31, (g) => Math.min(D * 0.95, g.range(0.7, 1.3) / sp), (age, life, r, i) => {
    if ((i % 3 === 0) !== !front) return;
    const k = age / life, a0 = r.range(0, TAU), R0 = r.range(50, 74) * reach, tw = r.range(0.5, 1.2) * (i % 2 ? 1 : -1);
    const e = ease.inQuad(k), a = a0 + tw * e, end = rad(a) * 0.95, R = lerp(R0, end, e), tail = 2 + 8 * e;
    const x = Math.cos(a) * R, y = Math.sin(a) * R, x1 = Math.cos(a - tw * 0.06) * (R + tail), y1 = Math.sin(a - tw * 0.06) * (R + tail);
    const al = Math.min(1, k * 5) * (k > 0.9 ? (1 - k) * 10 : 1) * (front ? 1 : 0.55);
    if (al < 0.2) return;
    p.line(x1, y1, x, y, (v) => (v > 0.7 ? (front ? WHITE : C[6]) : v > 0.35 ? C[5] : C[3]));
    p.glow(x, y, 3, C[5], 0.3 * al);
  });
}

function fragments(p, C, t, o, rad) {
  const D = o.duration;
  cycle(t, D, Math.round(o.fragments), o.seed + 53, (g) => Math.min(D * 0.95, g.range(1.4, 2.2)), (age, life, r, i) => {
    const k = age / life, a0 = r.range(0, TAU) + k * r.range(-1, 1), s = r.range(2.2, 4) * (o.size / 24);
    const R = lerp(rad(a0) + r.range(12, 20) * (o.size / 24), rad(a0) - 1, ease.inCubic(k));
    const x = Math.cos(a0) * R, y = Math.sin(a0) * R + Math.sin(age * 5 + i) * 1.2, grow = Math.min(1, k * 4), n = Math.ceil(s * 1.4);
    for (let yy = -n; yy <= n; yy++)
      for (let xx = -n; xx <= n; xx++) {
        const th = Math.atan2(yy, xx), e = s * grow * (1 + 0.25 * Math.sin(3 * th + i + age * 3)), dd = Math.hypot(xx, yy);
        if (dd > e) continue;
        p.px(x + xx, y + yy, dd > e - 1 ? (xx + yy < 0 ? WHITE : C[4]) : C[5]);
      }
    p.glow(x, y, 7, C[5], 0.3 * grow);
    if (k > 0.92) p.glow(Math.cos(a0) * rad(a0), Math.sin(a0) * rad(a0), 10, WHITE, (k - 0.92) * 6);
  });
}

function motes(p, C, t, o, front) {
  const D = o.duration;
  cycle(t, D, Math.round(o.motes), o.seed + 99, (g) => Math.min(D * 0.95, g.range(1.5, 3)), (age, life, r, i) => {
    if ((i % 2 === 0) !== front) return;
    const k = age / life, a0 = r.range(0, TAU), R = r.range(o.size * 1.2, 66 * o.streamReach);
    const x = Math.cos(a0) * R + Math.sin(age * r.range(1, 2)) * 2.5, y = Math.sin(a0) * R * 0.85 - age * r.range(4, 9);
    const a = Math.sin(Math.PI * k);
    if (a < 0.25) return;
    p.px(x, y, i % 4 === 0 ? WHITE : front ? C[6] : C[4]);
    if (i % 4 === 0) p.glow(x, y, 4, C[5], 0.25 * a);
  });
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), u = (t / o.duration) % 1, rad = shapeOf(o, u);
  halo(p, C, u, o, rad);
  motes(p, C, t, o, false);
  streams(p, C, t, o, rad, false);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), u = (t / o.duration) % 1, rad = shapeOf(o, u);
  body(p, C, u, o, rad);
  fragments(p, C, t, o, rad);
  streams(p, C, t, o, rad, true);
  motes(p, C, t, o, true);
}
