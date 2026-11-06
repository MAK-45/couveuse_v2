// The blob explores the world it has reached (tab Action monde). First action: it travels. In truth it stays on
// its spot and the world scrolls past behind it, layer by layer (the near stars faster than the far ones), while
// the blob shows its speed: it leans into it, stretches into a drop whose tail streams behind, its eyes look ahead,
// and a speed effect wraps it (a shooting star of light, afterimages, a bow shock, ice flames, wind).
// One speed drives everything: the faster it goes, the faster the world scrolls and the more the blob deforms.
//
// A free endless loop (like the Boucles tab): it starts where the blob rests but needn't come back to the Blob né's
// frame. It loops over a whole number of the blob's loops (P): the world scrolls whole tiles a loop (ice-worlds.js),
// the speed surges a whole number of times a loop (the world's clock is warped by a sine that integrates to zero over
// the loop, so the distance stays whole tiles), every ripple runs whole turns and every particle is on cycle(t, P).
import { fit, clamp, lerp, ease, tileNoise, tileFbm, rng, cycle, TAU, WHITE, hex } from "../../core/index.js";
import { meta as idleMeta, blobBack, blobFront, ambient, state, shapeOf } from "./ice-blob-idle.js";
import { hsl, fromHsl } from "./ice-blob-actions.js";
import { worldOf, worldTile, paintWorld } from "./ice-worlds.js";

export const EXPLORE = ["move"];
export const STYLES = ["comet", "stretch", "ghosts", "shock", "flame"];
// travel directions (degrees, y down) and the way the world scrolls for each
export const HEADINGS = { right: 0, downright: 45, down: 90, downleft: 135, left: 180, upleft: 225, up: 270, upright: 315 };
const OPP = { right: "left", left: "right", up: "down", down: "up", upright: "downleft", upleft: "downright", downright: "upleft", downleft: "upright" };

export const meta = {
  name: "Ice blob explore",
  desc: "The ice blob flies through another world: the world scrolls past in parallax layers while it stretches into a drop wrapped in a speed effect.",
  tags: ["creature", "blob", "travel", "speed", "world", "space", "ice", "light", "loop"],
  size: [320, 180],
  origin: [160, 100],
  duration: 8,
  loop: true,
  fps: 30,
  bg: "black",
  options: {
    ...idleMeta.options,
    // the world it travels through (null: deep space with its defaults) and the scene's bounds in local pixels
    world: null, room: null,
    explore: "move", loops: 2,
    // speed: one knob for the world and the body; how much each follows it; surges of speed a loop
    exSpeed: 3, exDir: "right", exDrift: 1, exDeform: 1, exSurge: 0.35, exSurges: 1,
    // the body at speed: stretch, tail, lean, ripples, eyes ahead, pushed back by the speed
    exStretch: 1, exTail: 1, exLean: 1, exRipple: 1, exLook: 1, exBack: 0.5,
    // the speed effect: style, strength, length, hue shift, sparks shed, wind streaks, afterimages, light body
    exStyle: "comet", exPower: 1, exLength: 1, exHue: 0, exParticles: 24, exLines: 14, exEchoes: 4, exLight: 1,
    // its light on a ground below (none in space by default)
    exGround: 0,
  },
};

const whole = (v, lo = 0) => Math.max(lo, Math.round(v));
const total = (o) => o.duration * whole(o.loops, 1);
const phase = (o, t) => (((t / total(o)) % 1) + 1) % 1;
const roomOf = (o) => (Array.isArray(o.room) ? o.room : [-meta.origin[0], -meta.origin[1], meta.size[0] - meta.origin[0], meta.size[1] - meta.origin[1]]);
const shifted = (C, hue) => (hue ? C.map((c) => { const [h, s, l] = hsl(c); return hex(fromHsl((((h + hue) % 360) + 360) % 360, s, l)); }) : C);
const headingOf = (o) => ((HEADINGS[o.exDir] ?? 0) * Math.PI) / 180;

/**
 * The pace at time t: f the speed relative to the mean (surges), x the distance travelled (in seconds at the mean
 * speed: x(P) = P, so the world still scrolls whole tiles a loop), v the speed now and k how much the body shows it.
 */
export function pace(o, t) {
  const P = total(o), n = whole(o.exSurges), a = n ? clamp(o.exSurge, 0, 0.9) : 0, ph = (TAU * n * t) / P;
  const f = 1 + a * Math.cos(ph), x = t + (n ? ((a * P) / (TAU * n)) * Math.sin(ph) : 0), v = Math.max(0, o.exSpeed) * f;
  return { f, x, v, k: clamp((1 - Math.exp(-v / 3.5)) * Math.max(0, o.exDeform), 0, 1.5) };
}

/** The world it travels through: moving at the speed (scenes a blob loop for the nearest stars), against its way. */
export function worldFor(o) {
  const w = worldOf(o.world), L = whole(o.loops, 1), v = Math.max(0, o.exSpeed) * Math.max(0, o.exDrift);
  return { ...w, wLoops: L, wState: v > 0 ? "moving" : "still", wDrift: v * L, wDir: OPP[o.exDir] || "left", wAllMove: 1 };
}

// body space, as in the idle (squash then tilt round the body's centre)
const toBody = (st, dx, dy) => {
  const c = Math.cos(-st.tilt), s = Math.sin(-st.tilt), x = dx * c - dy * s, y = dx * s + dy * c;
  return [x / st.sx, y / st.sy];
};

const X = {};

// ---- moving: it flies through the world
X.move = (o) => {
  const P = total(o), a = headingOf(o), c = Math.cos(a), s = Math.sin(a), style = o.exStyle;
  const room = roomOf(o), T = worldTile(room);
  // how fast the near stars slide by (px a second at the mean speed): whole tiles a loop, as the world draws them
  const nearTiles = o.exSpeed > 0 && o.exDrift > 0 ? Math.max(1, whole(o.exSpeed * o.exDrift * whole(o.loops, 1))) : 0, vNear = (nearTiles * T) / P;
  const vFlow = Math.max(vNear, 40 * Math.min(1, o.exSpeed)); // the speed of what streams off it, even if the world is still
  const mods = (t) => {
    const pc = pace(o, t), k = pc.k, u = phase(o, t), rip = whole(o.loops * 3, 1);
    const boost = style === "stretch" ? 1.35 : 1, lean = c * 0.32 * k * o.exLean, ab = a - lean, ax = c * c - s * s, str = 0.26 * k * o.exStretch * boost;
    const light = style === "comet" ? clamp(k * 1.2) * o.exLight : 0;
    // a drop: round in front, narrower on the sides, a tail streaming behind with waves running down it
    const shape = (th) => {
      let ph = th - ab;
      ph -= TAU * Math.round(ph / TAU);
      const d = Math.cos(ph), tail = Math.max(0, -d), side = 1 - d * d;
      let r = 1 - 0.16 * k * side - 0.06 * k * Math.max(0, d) ** 2;
      const A = 1.3 * (1 - Math.exp(-1.6 * k * boost)) * o.exTail;
      r += 0.35 * k * boost * o.exTail * tail ** 2 + A * tail ** (5 + 6 * k);
      r += 0.08 * k * o.exRipple * tail * Math.sin(6 * Math.abs(ph) - TAU * u * rip);
      return Math.min(2.4, r); // (the body is drawn within 2.6 sizes of its centre)
    };
    const look = o.exLook * clamp(k * 2.5) * 2;
    return {
      sx: 1 + str * ax, sy: 1 - str * ax * 0.8, rot: lean, morph: clamp(k * 1.4, 0, 0.92), shape,
      dx: -c * o.size * 0.4 * k * o.exBack, dy: -s * o.size * 0.4 * k * o.exBack,
      lookX: c * look, lookY: s * look * 0.7, glow: 0.12 * k * o.exPower + 0.55 * light, halo: 1 + 0.45 * k * o.exPower + 0.4 * light,
      grow: 1 - 0.12 * light, quiet: o.exSpeed > 0 ? 1 : 0,
    };
  };

  // ---- streaks of wind sliding past the whole scene, against the way it goes
  const lines = (p, C, t, st, k, front) => {
    const n = whole(o.exLines);
    if (!n || o.exSpeed <= 0) return;
    const vl = vFlow * 1.8, len = clamp((vl / 30) * 1.1, 3, 70) * Math.max(0.2, o.exLength) * (0.4 + 0.6 * Math.min(1, k * 1.6));
    const W = room[2] - room[0], H = room[3] - room[1];
    cycle(t, P, n, o.seed * 7 + 5, (g) => g.range(0.35, 0.8), (age, life, g, i) => {
      if ((i % 3 === 0) !== front) return;
      const x0 = room[0] + g.range(-0.1, 1.1) * W, y0 = room[1] + g.range(-0.1, 1.1) * H, sp = vl * g.range(0.7, 1.3), d = sp * (age - life / 2);
      const x = x0 - c * d, y = y0 - s * d, q = age / life, L = len * g.range(0.5, 1.2) * Math.sin(Math.PI * q) ** 0.5;
      if (front && Math.hypot(x - st.x, y - st.y) < o.size * 2.2) return;
      for (let j = 0, m = Math.ceil(L); j <= m; j++) {
        const f = j / Math.max(1, m), px = x + c * j, py = y + s * j;
        p.px(px, py, f > 0.85 && front ? WHITE : f > 0.55 ? C[6] : f > 0.25 ? C[5] : C[3]);
      }
      if (front) p.glow(x + c * L, y + s * L, 3, C[5], 0.25);
    });
  };

  // ---- sparks of light peeling off its back and carried away
  const shed = (p, C, t, M, k, count) => {
    const n = whole(count);
    if (!n || o.exSpeed <= 0) return;
    cycle(t, P, n, o.seed * 11 + 3, (g) => g.range(0.35, 0.9), (age, life, g, i) => {
      const t0 = t - age, s0 = state(o, t0, M), sp = g.range(-0.9, 0.9), back = a + Math.PI + sp;
      const R = o.size * g.range(0.6, 0.95), x0 = s0.x + Math.cos(back) * R, y0 = s0.y + Math.sin(back) * R;
      const v = vFlow * g.range(0.35, 1) * (0.5 + k), dr = g.range(-12, 12), q = age / life;
      const x = x0 - c * v * age - s * dr * age, y = y0 - s * v * age + c * dr * age;
      if (q > 0.85 && (i + Math.floor(age * 20)) % 2) return;
      const big = q < 0.3 && i % 3 === 0;
      p.px(x, y, q < 0.25 ? WHITE : q < 0.6 ? C[6] : C[4]);
      if (big) for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + ddx, y + ddy, C[5]);
      if (q < 0.6) p.glow(x, y, big ? 5 : 3, C[5], 0.3 * (1 - q) * o.exPower);
    });
  };

  // ---- a shooting star: a long tongue of light streaming from it, flickering, swaying a little
  const comet = (p, C, t, st, k) => {
    if (k <= 0.01) return;
    const u = phase(o, t), Lt = o.size * (1.2 + 6 * k) * o.exLength, w0 = o.size * 0.95 * st.grow, n1 = whole(o.loops * 2, 1);
    const K = 12 * whole(1 + o.exSpeed / 3, 1), amp = o.size * 0.18 * o.exRipple;
    const xs = [st.x, st.x - c * Lt], ys = [st.y, st.y - s * Lt];
    const x0 = Math.floor(Math.min(...xs) - w0 - 2), x1 = Math.ceil(Math.max(...xs) + w0 + 2), y0 = Math.floor(Math.min(...ys) - w0 - 2), y1 = Math.ceil(Math.max(...ys) + w0 + 2);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - st.x, dy = y + 0.5 - st.y, along = -(dx * c + dy * s);
        if (along < -w0 * 0.3 || along > Lt) continue;
        const q = Math.max(0, along) / Lt, across = -dx * s + dy * c - Math.sin(along * 0.07 - TAU * u * n1) * amp * q;
        const hw = along < 0 ? Math.sqrt(Math.max(0, w0 * w0 - along * along)) : w0 * (1 - q) ** 0.85;
        const e = Math.abs(across) / Math.max(0.5, hw);
        if (e > 1) continue;
        const nz = tileNoise(across * 0.42 + 9, along * 0.05 - u * K, 0, K, o.seed + 77);
        const I = (1 - q) ** 0.9 * (1 - 0.7 * e * e) * (0.8 + 0.25 * k) + nz * 0.2 * (0.4 + q);
        if (I < 0.07) continue;
        if (I < 0.15) { p.dot(x + 0.5, y + 0.5, C[2], 0.6); continue; }
        p.px(x + 0.5, y + 0.5, I > 0.8 ? WHITE : I > 0.6 ? C[7] : I > 0.44 ? C[6] : I > 0.3 ? C[5] : I > 0.21 ? C[4] : C[3]);
        if (I > 0.3) p.light(x + 0.5, y + 0.5, C[5], (I - 0.3) * 0.35 * o.exPower);
      }
    for (let i = 0; i < 5; i++) { const q = i / 5; p.glow(st.x - c * Lt * q, st.y - s * Lt * q, w0 * (1.6 - q), C[5], 0.22 * (1 - q) * o.exPower * k); }
    p.glow(st.x + c * o.size * 0.4, st.y + s * o.size * 0.4, o.size * 1.5, C[6], 0.3 * k * o.exPower);
  };

  // ---- wind curling round it: dashes that run from its nose along its sides and peel away behind
  const wind = (p, C, t, st, k) => {
    if (k <= 0.02) return;
    const u = phase(o, t), R = o.size * Math.max(st.sx, st.sy) * 1.05, m = 14, n = whole(o.loops * 4, 1), Lb = R * (2 + 3 * k) * o.exLength;
    for (let i = 0; i < m; i++) {
      const side = i % 2 ? 1 : -1, g = rng(o.seed, 131, i), off = R * g.range(1.05, 1.5);
      const q = (((u * n + g.next()) % 1) + 1) % 1, dash = 3 + 6 * k * g.range(0.6, 1.2);
      // a streamline: from in front of it, round its side, then trailing behind
      const at = (al) => {
        const acr = al > 0 ? off * Math.sqrt(Math.max(0, 1 - (al / (R * 1.25)) ** 2)) : off * (1 - 0.12 * Math.min(1, -al / Lb));
        return [st.x + c * al - s * acr * side, st.y + s * al + c * acr * side];
      };
      const head = R * 1.25 - q * (R * 1.25 + Lb);
      for (let j = 0; j < dash; j++) {
        const al = head + j, f = j / dash, [px, py] = at(al);
        if (al > R * 1.25) continue;
        const fade = q > 0.8 ? 1 - (q - 0.8) / 0.2 : 1;
        const al2 = Math.min(1, k * 2.5) * fade, col = f > 0.6 ? WHITE : f > 0.3 ? C[6] : C[5];
        if (al2 >= 0.7) p.px(px, py, col); else p.dot(px, py, col, al2);
      }
    }
  };

  // ---- afterimages: earlier copies of it left behind, translucent, fading
  const ghosts = (p, C, t, M, k) => {
    const n = whole(o.exEchoes);
    if (!n || k <= 0.02) return;
    const gap = o.size * (0.35 + 0.9 * k) * o.exLength;
    for (let i = n; i >= 1; i--) {
      const st = state(o, t - i * 0.07, M), rad = shapeOf(o, st.u, st.m), ox = -c * gap * i, oy = -s * gap * i;
      const cx = st.x + ox, cy = st.y + oy, E = o.size * 2.6 * Math.max(st.sx, st.sy), al = 0.6 * (1 - i / (n + 1)) * clamp(k * 2.2) * Math.min(1.4, o.exPower);
      const Ci = shifted(C, o.exHue * i);
      const inside = (x, y) => { const [bx, by] = toBody(st, x - cx, y - cy); return Math.hypot(bx, by) <= rad(Math.atan2(by, bx)); };
      for (let y = Math.floor(cy - E); y <= Math.ceil(cy + E); y++)
        for (let x = Math.floor(cx - E); x <= Math.ceil(cx + E); x++) {
          const px = x + 0.5, py = y + 0.5;
          if (!inside(px, py)) continue;
          const rim = !inside(px - 1, py) || !inside(px + 1, py) || !inside(px, py - 1) || !inside(px, py + 1);
          p.blend(px, py, rim ? Ci[6] : Ci[5], rim ? Math.min(1, al * 1.6) : al * 0.8);
          if (rim) p.light(px, py, Ci[5], 0.3 * al);
        }
      p.glow(cx, cy, o.size * 1.4, Ci[5], 0.25 * al);
    }
  };

  // ---- a bow shock: an arc of light pushed ahead of it, its arms trailing back; a ring of sound at each surge
  const shock = (p, C, t, st, k, front) => {
    if (k <= 0.02) return;
    const u = phase(o, t), R0 = o.size * (1.25 + 0.15 * k), Wd = o.size * (1.6 + 1.2 * k) * o.exLength, back = o.size * (1.5 + 2.5 * k) * o.exLength;
    const beta = (R0 + back) / (Wd * Wd), n = whole(o.loops * 3, 1);
    if (front) {
      for (const lay of [0, 1]) {
        const R = R0 - lay * 3;
        for (let acr = -Wd; acr <= Wd; acr += 0.5) {
          const al = R - beta * acr * acr * (1 + lay * 0.2), e = Math.abs(acr) / Wd, x = st.x + c * al - s * acr, y = st.y + s * al + c * acr;
          const sh = 0.5 + 0.5 * Math.sin(Math.abs(acr) * 0.45 - TAU * u * n), I = (1 - e) ** 0.7 * (0.65 + 0.35 * sh) * Math.min(1, k * 2) * (lay ? 0.55 : 1);
          if (I < 0.12) continue;
          if (I < 0.3) { p.dot(x, y, C[4], I * 2.5); continue; }
          p.px(x, y, I > 0.75 ? WHITE : I > 0.5 ? C[6] : C[5]);
        }
      }
      p.glow(st.x + c * R0, st.y + s * R0, o.size * 0.8, WHITE, 0.3 * k * o.exPower);
      p.glow(st.x + c * R0 * 0.6, st.y + s * R0 * 0.6, o.size * 1.8, C[5], 0.25 * k * o.exPower);
      return;
    }
    // rings left behind at each surge (or a few a loop at a steady speed)
    const nr = whole(o.exSurges) || whole(o.loops, 1), per = P / nr, life = Math.min(per * 0.9, 0.9);
    const tau = ((((t - (whole(o.exSurges) ? 0 : per / 2)) % per) + per) % per);
    if (tau < life) {
      const q = tau / life, r = o.size * (1.1 + 3.2 * ease.outCubic(q)), cx = st.x - c * vFlow * 0.6 * tau, cy = st.y - s * vFlow * 0.6 * tau, m = Math.ceil(r * 6);
      for (let j = 0; j < m; j++) {
        const th = (j / m) * TAU, x = cx + Math.cos(th) * r * (1 - 0.35 * Math.abs(Math.cos(th - a))), y = cy + Math.sin(th) * r * (1 - 0.35 * Math.abs(Math.cos(th - a)));
        p.dot(x, y, q < 0.3 ? WHITE : C[6], (1 - q) * Math.min(1, k * 2));
      }
      p.glow(cx, cy, r, C[5], 0.25 * (1 - q) * o.exPower);
    }
  };

  // ---- ice flames: cold fire streaming off its back, tongues scrolling away
  const flame = (p, C, t, st, k) => {
    if (k <= 0.01) return;
    const u = phase(o, t), Lf = o.size * (1.1 + 3.6 * k) * o.exLength, w0 = o.size * 0.95 * st.grow, K = 16 * whole(1 + o.exSpeed / 2, 1);
    const xs = [st.x, st.x - c * Lf], ys = [st.y, st.y - s * Lf];
    const x0 = Math.floor(Math.min(...xs) - w0 * 1.3 - 2), x1 = Math.ceil(Math.max(...xs) + w0 * 1.3 + 2), y0 = Math.floor(Math.min(...ys) - w0 * 1.3 - 2), y1 = Math.ceil(Math.max(...ys) + w0 * 1.3 + 2);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - st.x, dy = y + 0.5 - st.y, along = -(dx * c + dy * s), across = -dx * s + dy * c;
        if (along < -w0 * 1.1 || along > Lf) continue;
        const q = Math.max(0, along) / Lf, hw = along < 0 ? Math.sqrt(Math.max(0, (w0 * 1.25) ** 2 - along * along)) + 1 : w0 * 1.25 * (1 - q) ** 0.55 + 1;
        const nz = tileFbm(across * 0.16 + 3, along * 0.11 - u * K, 0, K, o.seed + 91, 3);
        const F = (1 - q) * 1.25 - (Math.abs(across) / hw) * 0.95 + nz * 0.75 * (0.6 + 0.4 * q) + 0.1 * k - Math.max(0, -along / w0) * 0.9;
        if (F < 0.1) continue;
        p.px(x + 0.5, y + 0.5, F > 0.95 ? WHITE : F > 0.7 ? C[6] : F > 0.48 ? C[5] : F > 0.28 ? C[4] : C[2]);
        if (F > 0.4) p.light(x + 0.5, y + 0.5, C[5], (F - 0.4) * 0.3 * o.exPower);
      }
    p.glow(st.x - c * Lf * 0.3, st.y - s * Lf * 0.3, w0 * 1.8, C[5], 0.3 * k * o.exPower);
  };

  return {
    mods,
    back(p, C, Cf, t, st, M) {
      const k = pace(o, t).k;
      lines(p, Cf, t, st, k, false);
      if (style === "comet") comet(p, Cf, t, st, k);
      if (style === "ghosts") ghosts(p, Cf, t, M, k);
      if (style === "shock") shock(p, Cf, t, st, k, false);
      if (style === "flame") flame(p, Cf, t, st, k);
      if (style === "stretch") wind(p, Cf, t, st, k);
    },
    front(p, C, Cf, t, st, M) {
      const k = pace(o, t).k;
      if (style === "shock") shock(p, Cf, t, st, k, true);
      shed(p, Cf, t, M, k, o.exParticles * (style === "comet" || style === "flame" ? 1.5 : 1));
      lines(p, Cf, t, st, k, true);
    },
  };
};

const cache = new WeakMap();
const actOf = (o) => {
  let x = cache.get(o);
  if (!x) { x = (X[o.explore] || X.move)(o); cache.set(o, x); }
  return x;
};
// the blob's own look, its light on the ground only if asked
const bodyOf = (o) => ({ ...o, ground: o.ground * clamp(o.exGround, 0, 2) });

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), Cf = shifted(C, o.exHue || 0), act = actOf(o), ob = bodyOf(o), M = (tt) => act.mods(tt), P = total(o);
  const w = worldFor(o), wt = ((pace(o, t).x % P) + P) % P;
  paintWorld(p, w, wt, P, roomOf(o));
  const st = state(ob, t, M);
  act.back(p, C, Cf, t, st, M);
  blobBack(p, t, ob, M, C);
  if (o.exSpeed <= 0) ambient(p, t, ob, false, C);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), Cf = shifted(C, o.exHue || 0), act = actOf(o), ob = bodyOf(o), M = (tt) => act.mods(tt);
  const st = blobFront(p, t, ob, M, C);
  if (o.exSpeed <= 0) ambient(p, t, ob, true, C);
  act.front(p, C, Cf, t, st, M);
}
