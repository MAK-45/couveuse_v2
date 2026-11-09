// The blob and electricity: it finds a stray spark and gets a jolt, bristles with static, holds a ball of
// plasma, charges up and lets it all go, carries the current between two poles, throws a bolt that chains through
// floating crystals, catches the lightning from a little storm cloud, spins electrons round itself like an atom.
// Each one is an action: it starts on the rested blob's frame (tab Blob né), the electricity rises, plays, dies
// away, and the blob is back exactly at rest on the last frame, so GIFs chain: rest -> electricity -> rest...
// The length is a whole number of the blob's own loops; the electricity fades in and out with presence(), every
// modifier is settled to neutral by it, and the lead-out is never shorter than a drop of light lives.
// The electricity has its own three colours (core, arc, glow), apart from the blob's palette.
// In one of the transformation's new forms (o.form "human" or "grounded") the figure plays with it: the current
// comes to and leaves from its hands, it holds the plasma ball, reaches for the spark, throws the chain bolt.
import { fit, clamp, lerp, seg, bump, ease, noise2, rng, cycle, TAU, WHITE, hex, mix, bolt, forks } from "../../pixelfx/src/core/index.js";
import { meta as idleMeta } from "./ice-blob-idle.js";
import { prog as progAt, presence as presenceAt, settle as settleBy } from "./ice-time.js";
import { bodyBack, bodyFront, bodyAmbient } from "./ice-blob-transform.js";
import { drawObject } from "./ice-scene-objects.js";

export const ELEC = ["discover", "static", "ball", "charge", "poles", "chain", "storm", "atom"];

export const meta = {
  name: "Ice blob electricity",
  desc: "The ice blob plays with electricity, from rest back to rest: a stray spark, static, a plasma ball, charge and discharge, two poles, a chain bolt, a storm cloud, an atom.",
  tags: ["creature", "blob", "loop", "electric", "lightning", "spark", "ice", "light"],
  size: [320, 180],
  origin: [160, 100],
  duration: 8,
  loop: true,
  fps: 30,
  bg: "black",
  options: {
    ...idleMeta.options,
    form: "blob", elec: "discover", loops: 3, lead: 0.06, elRamp: 0.12,
    // the electricity itself, shared by every animation
    elCore: "#ffffff", elColor: "#8ff0ff", elGlow: "#3c78ff",
    elFlicker: 12, elJag: 0.28, elThick: 2, elGlowAmt: 1, elBranches: 1, elTint: 0.6, elSparks: 1,
    // finding a spark
    discCount: 2, discDist: 52, discSide: "alternate", discJolt: 1, discMood: "amused", discSize: 1,
    // static
    statArcs: 4, statLen: 0.8, statGround: 3, statPuff: 1, statBristle: 1,
    // a ball of plasma
    ballPos: "above", ballSize: 12, ballHeight: 18, ballTendrils: 6, ballPulses: 2, ballSpin: 1, ballArc: 1,
    // charge and discharge
    chgCount: 2, chgBolts: 7, chgReach: 56, chgShake: 1, chgFlash: 1, chgCrouch: 1,
    // two poles
    polesShape: "crystal", polesDist: 72, polesSize: 9, polesSway: 2, polesFlow: 4, polesHeight: 0,
    // chain lightning
    chainShape: "cycle", chainCount: 4, chainRounds: 2, chainRadius: 62, chainSize: 7, chainHold: 0.25,
    // the storm
    stormMood: "catch", stormStrikes: 3, stormHeight: 36, stormCloud: 26, stormRain: 30,
    // the atom
    atomRings: 3, atomTurns: 2, atomRadius: 50, atomTrail: 1, atomArcs: 1, atomRise: 6,
  },
};

const E = ease.inOutSine;
const total = (o) => o.duration * Math.max(1, Math.round(o.loops));
// the action's progress, 0..1: 0 during the lead-in, 1 after the lead-out (never shorter than a drop's life, 1.7 s)
const prog = (o, t) => progAt(o, t, total(o));
// every animation reads its time through this: the action's progress
const phase = prog;
// how present the electricity is: 0 at rest (start and end), rising and dying away over elRamp of the action
const presence = (o, t) => presenceAt(prog(o, t), clamp(o.elRamp ?? 0.12, 0.02, 0.45));
// an animation's modifiers, drawn back to exactly neutral as the electricity leaves
// (drops hidden while it plays)
const settle = (m, e, a) => ({ quiet: a > 0 && a < 1 ? 1 : 0, ...settleBy(m, e) });
// a figure's hand nearest a point (null for the blob, which has none)
const handNear = (st, x, y) => (st.hands && st.hands.length ? st.hands.reduce((b, h) => (Math.hypot(h[0] - x, h[1] - y) < Math.hypot(b[0] - x, b[1] - y) ? h : b)) : null);
const wrap = (x) => ((x % 1) + 1) % 1;
const whole = (v, lo = 1) => Math.max(lo, Math.round(v));
const ln = (x, y, u, s, r = 1) => noise2(x + Math.cos(TAU * u) * r, y + Math.sin(TAU * u) * r, s);
// the n-th part of the loop we are in, and how far into it (0..1)
const part = (ph, n) => { const f = ph * n, i = Math.floor(f); return { i: ((i % n) + n) % n, k: f - i }; };

// ---- the electricity's own colours
const BLACK = hex("#000000");
function volts(o) {
  const core = hex(o.elCore), main = hex(o.elColor), glow = hex(o.elGlow);
  return { core, main, glow, mid: mix(main, glow, 0.5), dim: mix(glow, BLACK, 0.5) };
}
// the blob's ramp drawn toward the electricity's, k = 0 is its own palette exactly
function tinted(C, V, k) {
  const to = [V.dim, V.dim, V.glow, V.glow, V.mid, V.main, mix(V.main, V.core, 0.5), V.core];
  return C.map((c, i) => mix(c, to[i], k * (i < 2 ? 0.5 : 1)));
}

// bolts change shape a whole number of times a loop: this is which shape we are on
const flick = (o, t) => { const F = whole(o.elFlicker * total(o)); return Math.floor(phase(o, t) * F) % F; };
const R = (o, t, ...ids) => rng(o.seed, 4242, flick(o, t), ...ids);
// a fast shake that is still a whole number of turns a loop
const jitter = (o, t, k = 1) => Math.sin(TAU * whole(o.elFlicker * total(o) * 1.5) * phase(o, t) * k);

/** A bolt from (x0, y0) to (x1, y1): glow, arc colour, a core, a few forks and sparks at the end. */
function zap(p, V, o, r, x0, y0, x1, y1, a = 1, opt = {}) {
  if (a <= 0.03) return;
  const L = Math.hypot(x1 - x0, y1 - y0);
  if (L < 1.5) return;
  const depth = clamp(Math.ceil(Math.log2(L / 3 + 1)), 1, 6), jag = (opt.jag ?? 1) * o.elJag;
  const path = bolt(r, x0, y0, x1, y1, { jag, depth });
  const nb = opt.branches ?? Math.round(o.elBranches * clamp(L / 28, 0, 3));
  const fk = nb > 0 ? forks(r, path, { count: nb, len: L * 0.32, jag: jag + 0.08, spread: 0.9 }) : [];
  const th = clamp(Math.round(opt.thick ?? o.elThick), 1, 3), k = o.elGlowAmt * Math.min(1, a) * (opt.glow ?? 1);
  for (let i = 0; i < path.length; i += 2) p.glow(path[i][0], path[i][1], 6 + th * 2, V.glow, 0.13 * k);
  for (const f of fk) {
    p.polyline(f, V.mid, a * 0.9);
    for (let i = 1; i < f.length; i += 3) p.glow(f[i][0], f[i][1], 4, V.glow, 0.1 * k);
  }
  if (th >= 3) for (const [dx, dy] of [[-1, 0], [0, -1]]) p.polyline(path.map(([x, y]) => [x + dx, y + dy]), V.glow, a);
  if (th >= 2) for (const [dx, dy] of [[1, 0], [0, 1]]) p.polyline(path.map(([x, y]) => [x + dx, y + dy]), V.main, a);
  p.polyline(path, th >= 2 ? V.core : V.main, a);
  if (th === 1) for (let i = 2; i < path.length; i += 4) p.dot(path[i][0], path[i][1], V.core, a);
  if (opt.end !== false) {
    p.glow(x1, y1, 7 + th * 2, V.main, 0.28 * k);
    const n = Math.round(3 * o.elSparks);
    for (let i = 0; i < n; i++) p.dot(x1 + r.range(-4, 4), y1 + r.range(-4, 4), i % 2 ? V.main : V.core, a);
  }
}
/** A point of electricity crackling on its own: a hot core and a few tiny arcs about it. */
function crackle(p, V, o, r, x, y, s, a = 1) {
  if (a <= 0.03) return;
  p.glow(x, y, s * 3.2, V.glow, 0.35 * o.elGlowAmt * a);
  p.glow(x, y, s * 1.4, V.main, 0.4 * o.elGlowAmt * a);
  const n = 3 + Math.round(s / 3);
  for (let i = 0; i < n; i++) {
    const th = r.range(0, TAU), l = s * r.range(0.8, 1.7);
    zap(p, V, o, r, x, y, x + Math.cos(th) * l, y + Math.sin(th) * l, a, { thick: 1, branches: 0, end: false, glow: 0.4 });
  }
  p.disc(x, y, Math.max(1, s * 0.35), V.main, a);
  p.px(x, y, V.core);
}
// a point on the blob's skin at angle th (body roughly an ellipse round its centre)
const skin = (o, st, th, out = 1) => [st.x + Math.cos(th) * o.size * st.sx * out, st.y + Math.sin(th) * o.size * st.sy * out];
/** Little arcs crawling over its skin, hopping place with every flicker. */
function crawl(p, V, o, t, st, n, a, len = 0.8, id = 0) {
  if (a <= 0.03) return;
  for (let i = 0; i < n; i++) {
    const r = R(o, t, 31, id, i), th = r.range(0, TAU), w = r.range(0.35, 0.8) * len;
    const [x0, y0] = skin(o, st, th, 0.98), [x1, y1] = skin(o, st, th + w, 0.98);
    zap(p, V, o, r, x0, y0, x1, y1, a, { thick: 1, branches: 0, jag: 1.6, end: false, glow: 0.6 });
  }
}
// a dotted ellipse
const ring = (p, x, y, rx, ry, c, a, filter) => { for (let j = 0, m = Math.ceil(Math.max(rx, ry) * 6); j < m; j++) { const th = (j / m) * TAU; if (!filter || filter(th)) p.dot(x + Math.cos(th) * rx, y + Math.sin(th) * ry, c, a); } };

const L = {};

// ---- finding a spark: a stray spark crackles near it; it looks, creeps closer, touches... zap! jumps back,
// then laughs it off (or stays wide-eyed), and the spark darts away. A few times a loop, one side or both.
L.discover = (o) => {
  const side = (i) => (o.discSide === "left" ? -1 : o.discSide === "right" ? 1 : i % 2 ? -1 : 1);
  const scared = o.discMood === "scared";
  const env = (t) => {
    const { i, k } = part(phase(o, t), whole(o.discCount)), s = side(i);
    const notice = E(seg(k, 0.08, 0.3)) * (1 - E(seg(k, 0.5, 0.56)));
    const reach = E(seg(k, 0.34, 0.52)) * (1 - E(seg(k, 0.6, 0.7)));
    const shock = seg(k, 0.52, 0.54) * (1 - seg(k, 0.62, 0.64));
    const recoil = bump(k, 0.6, 0.88), after = k < 0.6 ? 0 : 1 - seg(k, 0.6, 0.9);
    return { i, k, s, notice, reach, shock, recoil, after };
  };
  const sparkAt = (t, e) => {
    const D = o.discDist, dart = E(seg(e.k, 0.7, 0.92));
    return [e.s * (D + Math.sin(e.k * TAU * 3) * 2 + dart * 30), -o.size * 0.2 + Math.cos(e.k * TAU * 2) * 2 - dart * 34 - e.reach * 2];
  };
  return {
    charge(t) { const e = env(t); return Math.max(e.shock, e.after * 0.9); },
    mods(t) {
      const e = env(t), J = o.discJolt, gap = Math.max(0, o.discDist - o.size * 1.25 - 5);
      const sh = e.shock * jitter(o, t) * 2.5 * J;
      const m = {
        dx: e.s * (e.notice * 3 + e.reach * gap - e.recoil * 12 * J) + sh, dy: e.shock * jitter(o, t, 1.3) * 1.5 * J,
        sy: 1 + 0.14 * e.shock * J - 0.1 * bump(e.k, 0.62, 0.74) * J, sx: 1 - 0.06 * e.shock * J + 0.08 * bump(e.k, 0.62, 0.74) * J,
        rot: -e.s * 0.12 * e.reach + e.s * 0.15 * e.recoil * J,
        lookX: e.s * 1.6 * Math.max(e.notice, e.reach, e.after), lookY: -1.2 * seg(e.k, 0.7, 0.9) * e.after,
        eyeScale: 1 + 0.15 * e.notice + 0.5 * e.shock * J + (scared ? 0.35 * e.recoil : 0), glow: 0.4 * e.shock, halo: 1 + 0.8 * e.shock, quiet: 1,
      };
      if (!scared) { m.happy = e.k > 0.68 && e.k < 0.94 ? 1 : 0; m.dy -= 7 * bump(e.k, 0.72, 0.9); }
      else m.dy += 4 * e.recoil;
      // a figure reaches for it with a finger, and snatches its hand back
      m.reach = sparkAt(t, e); m.reachK = Math.max(e.reach, 0.35 * e.notice) * (1 - e.recoil); m.hold = 0.8 * e.recoil;
      return m;
    },
    front(p, C, V, t, st) {
      const e = env(t), a = seg(e.k, 0.02, 0.12) * (1 - seg(e.k, 0.84, 0.94));
      const [sx, sy] = sparkAt(t, e), r = R(o, t, 1);
      const size = (3 + 3 * e.shock + 1.5 * e.notice) * o.discSize;
      crackle(p, V, o, r, sx, sy, size, a);
      // feelers reaching out from the spark as it comes near
      const near = handNear(st, sx, sy) || [st.x + e.s * o.size * st.sx * 0.95, st.y - o.size * 0.05];
      if (e.reach > 0.3 && e.shock <= 0 && r.chance(0.55)) {
        const l = 0.35 + 0.4 * e.reach;
        zap(p, V, o, r, sx, sy, lerp(sx, near[0], l), lerp(sy, near[1], l), 0.8 * a, { thick: 1, branches: 0, end: false });
      }
      if (e.shock > 0) {
        zap(p, V, o, r, sx, sy, near[0], near[1], e.shock);
        zap(p, V, o, R(o, t, 2), sx, sy, near[0], near[1] + o.size * 0.3, e.shock * 0.8, { thick: 1 });
      }
      crawl(p, V, o, t, st, 3, e.shock + e.after * 0.7, 0.9, 1);
    },
  };
};

// ---- static: charged all over, it bristles, little arcs crawl over its skin and now and then one jumps to the
// ground with a snap that makes it start
L.static = (o) => {
  const times = () => { const n = whole(o.statGround, 0), g = rng(o.seed, 616); return Array.from({ length: n }, (_, i) => (i + g.range(0.15, 0.75)) / n); };
  const strike = (ph) => { let best = 9, idx = 0; times().forEach((c, i) => { const d = wrap(ph - c); if (d < best) { best = d; idx = i; } }); return { d: best, i: idx }; };
  return {
    charge(t) { const { d } = strike(phase(o, t)); return 0.45 + 0.55 * (d < 0.12 ? 1 - d / 0.12 : 0); },
    mods(t) {
      const ph = phase(o, t), { d } = strike(ph), snap = d < 0.05 ? Math.sin(Math.PI * (d / 0.05)) : 0;
      const puff = 1 + 0.05 * o.statPuff * (0.6 + 0.4 * Math.sin(TAU * 2 * ph));
      return { grow: puff, dy: -4 * snap, dx: jitter(o, t) * 0.8 * o.statPuff, eyeScale: 1 + 0.4 * (d < 0.1 ? 1 - d / 0.1 : 0), shut: d > 0.1 && d < 0.13 ? 1 : 0,
        lookX: (ln(2.2, 5.1, ph, o.seed + 70) - 0.5) * 3, lookY: 0.4 + (ln(7.2, 1.1, ph, o.seed + 71) - 0.5) * 1.5, glow: 0.12, quiet: 1, armOpen: 0.3 + 0.5 * snap };
    },
    back(p, C, V, t, st) {
      // its hair of light standing on end
      const nb = Math.round(16 * o.statBristle), r = R(o, t, 5);
      for (let i = 0; i < nb; i++) {
        const th = (i / nb) * TAU + 0.2, l = 2 + r.range(0, 4) * o.statBristle, [x0, y0] = skin(o, st, th, 1.02), [x1, y1] = skin(o, st, th, 1.02 + l / o.size);
        p.line(x0, y0, x1, y1, i % 3 ? V.main : V.core, 0.85);
        p.glow(x1, y1, 3, V.glow, 0.15 * o.elGlowAmt);
      }
    },
    front(p, C, V, t, st) {
      const ph = phase(o, t), { d, i } = strike(ph);
      crawl(p, V, o, t, st, whole(o.statArcs, 0), 0.95, o.statLen, 2);
      if (d < 0.06) {
        // a snap down to the ground under it
        const gy = o.size * o.groundDist + o.hover, g = rng(o.seed, 617, i), gx = st.x + g.range(-1, 1) * o.size * 1.2;
        const a = 1 - d / 0.06, [bx, by] = skin(o, st, Math.PI / 2 + g.range(-0.6, 0.6), 0.95);
        zap(p, V, o, R(o, t, 6), bx, by, gx, gy, a);
        p.glow(gx, gy, 14, V.main, 0.5 * a * o.elGlowAmt);
        for (let j = 0; j < 6; j++) p.dot(gx + (j - 2.5) * 2, gy - g.range(0, 3) - (1 - a) * 4, V.core, a);
      }
      // a few sparks lifting off it
      cycle(t, total(o), Math.round(10 * o.elSparks), o.seed + 618, (g) => g.range(0.4, 0.9), (age, life, r) => {
        const k = age / life, th = r.range(-Math.PI, 0), [x, y] = skin(o, st, th, 1.05);
        p.dot(x + Math.cos(th) * k * 10, y + Math.sin(th) * k * 10 - k * 6, k < 0.4 ? V.core : V.main, 1 - k);
      });
    },
  };
};

// ---- a ball of plasma: it holds a crackling globe of light, tendrils dancing inside, a thread of current
// between them; the globe swells a few times a loop and it beams at it
L.ball = (o) => {
  const where = (st, t) => {
    const ph = phase(o, t), h = o.ballHeight, S = o.size, side = o.ballPos === "left" ? -1 : 1;
    const [ox, oy] = o.ballPos === "above" ? [0, -(S * 1.05 + h + o.ballSize)] : [side * (S * 1.1 + h + o.ballSize), -S * 0.25];
    return [st.x - st.m.dx * 0.4 + ox + Math.sin(TAU * ph * 2) * 2, st.y + oy + Math.sin(TAU * ph * 3) * 2];
  };
  const pulse = (t) => Math.max(0, Math.sin(TAU * whole(o.ballPulses) * phase(o, t))) ** 2;
  return {
    charge(t) { return 0.3 + 0.4 * pulse(t); },
    mods(t) {
      const ph = phase(o, t), pu = pulse(t), up = o.ballPos === "above";
      const s = o.ballPos === "left" ? -1 : 1;
      // (a figure holds it up over its head, or out on its hand)
      const S = o.size, h = o.ballHeight;
      return { lookX: up ? Math.sin(TAU * ph * 2) * 0.3 : s * 1.6, lookY: up ? -1.5 : -0.3, happy: pu > 0.6 ? 1 : 0, dy: -2 * pu, rot: up ? 0 : s * 0.1,
        sy: 1 + 0.05 * pu, glow: 0.12 * pu, quiet: 1, ...(up ? { armUp: 0.85 } : { reach: [s * (S * 1.1 + h + o.ballSize), -S * 0.25], reachK: 1 }) };
    },
    front(p, C, V, t, st) {
      const [bx, by] = where(st, t), pu = pulse(t), Rr = o.ballSize * (1 + 0.25 * pu), ph = phase(o, t), r = R(o, t, 7);
      p.glow(bx, by, Rr * 2.6, V.glow, (0.3 + 0.2 * pu) * o.elGlowAmt);
      p.glow(bx, by, Rr * 1.2, V.main, (0.2 + 0.2 * pu) * o.elGlowAmt);
      // the thread of current that holds it
      if (o.ballArc > 0) {
        const up = o.ballPos === "above", side = o.ballPos === "left" ? -1 : 1;
        const [hx, hy] = handNear(st, bx, by) || (up ? skin(o, st, -Math.PI / 2, 0.95) : skin(o, st, side > 0 ? -0.25 : Math.PI + 0.25, 0.95));
        const th = Math.atan2(hy - by, hx - bx);
        zap(p, V, o, r, bx + Math.cos(th) * Rr, by + Math.sin(th) * Rr, hx, hy, Math.min(1, o.ballArc), { branches: 0, thick: pu > 0.5 ? 2 : 1 });
      }
      // tendrils from the core to the glass, turning
      const n = whole(o.ballTendrils, 0), spin = TAU * Math.round(o.ballSpin) * ph;
      for (let i = 0; i < n; i++) {
        const th = spin + (i / n) * TAU + (ln(i * 3.1, 1.7, ph, o.seed + 80 + i, 1.2) - 0.5) * 2.2, rr = Rr * 0.96;
        const ex = bx + Math.cos(th) * rr, ey = by + Math.sin(th) * rr;
        zap(p, V, o, R(o, t, 8, i), bx, by, ex, ey, 1, { thick: 1, branches: 0, jag: 1.3, end: false, glow: 0.5 });
        p.px(ex, ey, V.core);
        p.glow(ex, ey, 4, V.main, 0.35 * o.elGlowAmt);
      }
      // the glass: a dotted rim, lit top left
      ring(p, bx, by, Rr, Rr, V.mid, 0.55);
      for (let j = 0; j < 7; j++) { const th = -2.5 + j * 0.13; p.px(bx + Math.cos(th) * (Rr - 1), by + Math.sin(th) * (Rr - 1), WHITE); }
      p.disc(bx, by, 2 + pu, V.main, 1);
      p.disc(bx, by, 1 + pu * 0.5, V.core, 1);
    },
  };
};

// ---- charge and discharge: it crouches and gathers the charge, sparks streaming in, shaking harder, then lets
// it all go in a burst of bolts and a flash, and floats back up pleased
L.charge = (o) => {
  const env = (t) => {
    const { i, k } = part(phase(o, t), whole(o.chgCount));
    const build = k < 0.7 ? E(seg(k, 0.04, 0.68)) : 0, burst = E(seg(k, 0.68, 0.72)), fade = k < 0.68 ? 0 : 1 - seg(k, 0.74, 0.84);
    const after = k < 0.7 ? 0 : 1 - seg(k, 0.72, 0.98);
    return { i, k, build, burst, fade, after };
  };
  return {
    charge(t) { const e = env(t); return Math.max(e.build, e.after); },
    mods(t) {
      const e = env(t), c = o.chgCrouch, sh = e.build * e.build * o.chgShake;
      return { sy: 1 - 0.13 * e.build * c + 0.16 * e.fade, sx: 1 + 0.09 * e.build * c - 0.08 * e.fade, dy: 5 * e.build * c - 8 * bump(e.k, 0.68, 0.88),
        dx: jitter(o, t) * 1.8 * sh, rot: jitter(o, t, 0.7) * 0.05 * sh, shut: e.k < 0.68 ? seg(e.k, 0.35, 0.55) : 0, eyeScale: 1 + 0.45 * e.fade,
        happy: e.k > 0.8 && e.k < 0.97 ? 1 : 0, glow: 0.3 * e.build + 0.5 * e.fade, halo: 1 + e.build + e.fade, quiet: 1, hold: 0.9 * e.build, armOpen: e.fade, armUp: 0.4 * e.fade };
    },
    back(p, C, V, t, st) {
      const e = env(t);
      if (e.fade > 0) {
        const Rr = o.size + o.chgReach * e.burst;
        p.glowRing(st.x, st.y, Rr, 6, V.glow, 0.4 * e.fade * o.elGlowAmt);
        ring(p, st.x, st.y, Rr, Rr * 0.9, V.main, e.fade * 0.8);
      }
    },
    front(p, C, V, t, st) {
      const e = env(t);
      if (e.build > 0) {
        // sparks streaming in
        const m = 22, g = rng(o.seed, 707, e.i);
        for (let j = 0; j < m; j++) {
          const th = g.range(0, TAU), q = wrap(e.k * 3 + g.range(0, 1)), r0 = o.size * (1.2 + 2.2 * (1 - q)), r1 = r0 + 3 + 3 * e.build;
          if (q > 0.95) continue;
          p.line(st.x + Math.cos(th) * r0, st.y + Math.sin(th) * r0 * 0.9, st.x + Math.cos(th) * r1, st.y + Math.sin(th) * r1 * 0.9, q > 0.6 ? V.core : V.main, e.build);
        }
        crawl(p, V, o, t, st, Math.round(1 + 4 * e.build), e.build, 0.9, 3);
        p.glow(st.x, st.y, o.size * 2.2, V.glow, 0.3 * e.build * o.elGlowAmt);
      }
      if (e.fade > 0) {
        const n = whole(o.chgBolts, 0), g = rng(o.seed, 708, e.i);
        for (let j = 0; j < n; j++) {
          const th = (j / n) * TAU + g.range(-0.3, 0.3), l = o.chgReach * e.burst * g.range(0.7, 1.15);
          const [x0, y0] = skin(o, st, th, 0.9);
          zap(p, V, o, R(o, t, 9, j), x0, y0, x0 + Math.cos(th) * l, y0 + Math.sin(th) * l, e.fade);
        }
        const fl = o.chgFlash * (1 - seg(e.k, 0.68, 0.76));
        if (fl > 0) { p.glow(st.x, st.y, o.chgReach * 1.6, V.core, 0.5 * fl); p.glow(st.x, st.y, o.size * 2, WHITE, 0.6 * fl); }
      }
      if (e.after > 0) crawl(p, V, o, t, st, 2, e.after * 0.8, 0.7, 4);
    },
  };
};

// ---- between two poles: two floating crystals, the current runs from one through it to the other; it sways
// between them and pulses of light travel through it, lighting it up as they pass
L.poles = (o) => {
  const SH = ["crystal", "sphere", "cube", "pyramid", "column", "gem"];
  const poleAt = (t, j) => { const ph = phase(o, t), s = j ? 1 : -1; return [s * o.polesDist, -o.polesHeight + Math.sin(TAU * (2 * ph + j * 0.5)) * 2.5]; };
  const flow = (t) => wrap(phase(o, t) * whole(o.polesFlow));
  const through = (t) => { const q = flow(t); return Math.max(0, 1 - Math.abs(q - 0.5) / 0.12); };
  return {
    charge(t) { return 0.35 + 0.6 * through(t); },
    mods(t) {
      const ph = phase(o, t), sw = Math.sin(TAU * whole(o.polesSway, 0) * ph), q = flow(t), th = through(t);
      return { dx: sw * o.polesDist * 0.3, lookX: (q - 0.5) * 3.2, lookY: -0.2, eyeScale: 1 + 0.25 * th, happy: th > 0.7 ? 1 : 0, sy: 1 + 0.06 * th, glow: 0.25 * th, quiet: 1, armOpen: 0.85 };
    },
    poles(p, V, t, front) {
      for (let j = 0; j < 2; j++) {
        const [x, y] = poleAt(t, j), q = flow(t), lit = Math.max(0, 1 - Math.abs(q - (j ? 1 : 0)) / 0.15, 1 - Math.abs(q - (j ? 0 : 1)) / 0.15);
        const shape = SH.includes(o.polesShape) ? o.polesShape : "crystal";
        if (!front) drawObject(p, o, { shape, x, y, size: o.polesSize, spinY: j ? -1 : 1, spinX: 0, tilt: 0.3, float: 0, floatTurns: 0, hue: 0, glow: 1, ph: j * 0.5 }, phase(o, t) * total(o), { tint: 0.35 + 0.5 * lit });
        else p.glow(x, y, o.polesSize * 2.2, V.main, (0.25 + 0.4 * lit) * o.elGlowAmt);
      }
    },
    back(p, C, V, t, st) { this.poles(p, V, t, false); },
    front(p, C, V, t, st) {
      this.poles(p, V, t, true);
      const [ax, ay] = poleAt(t, 0), [bx, by] = poleAt(t, 1), th = through(t);
      // (a figure carries it from one hand to the other)
      const [lx, ly] = handNear(st, ax, ay) || skin(o, st, Math.PI, 0.95), [rx, ry] = handNear(st, bx, by) || skin(o, st, 0, 0.95);
      zap(p, V, o, R(o, t, 10), ax + o.polesSize * 0.6, ay, lx, ly, 1, { thick: th > 0.3 ? 2 : 1 });
      zap(p, V, o, R(o, t, 11), bx - o.polesSize * 0.6, by, rx, ry, 1, { thick: th > 0.3 ? 2 : 1 });
      crawl(p, V, o, t, st, 1 + Math.round(3 * th), 0.4 + 0.6 * th, 0.8, 5);
      // the pulse travelling along: pole A -> its body -> pole B
      const q = flow(t), [px, py] = q < 0.5 ? [lerp(ax, lx, q * 2), lerp(ay, ly, q * 2)] : [lerp(rx, bx, q * 2 - 1), lerp(ry, by, q * 2 - 1)];
      if (Math.abs(q - 0.5) > 0.03) { p.disc(px, py, 2, V.main, 1); p.px(px, py, V.core); p.glow(px, py, 10, V.main, 0.5 * o.elGlowAmt); }
      else p.glow(st.x, st.y, o.size * 2, V.core, 0.4 * o.elGlowAmt);
    },
  };
};

// ---- chain lightning: crystals float round it; it gathers itself and throws a bolt that leaps from one to the
// next, lighting each, held a moment, then it lets go; the next round runs the other way
L.chain = (o) => {
  const SH = ["sphere", "cube", "gem", "crystal", "pyramid", "column"];
  const n = () => whole(o.chainCount, 2);
  const objAt = (t, j) => {
    const N = n(), th = lerp(-Math.PI * 0.92, -Math.PI * 0.08, N === 1 ? 0.5 : j / (N - 1)), ph = phase(o, t);
    return [Math.cos(th) * o.chainRadius, Math.sin(th) * o.chainRadius * 0.72 + Math.sin(TAU * (2 * ph + j / N)) * 2.5 - 4];
  };
  const env = (t) => {
    const { i, k } = part(phase(o, t), whole(o.chainRounds)), N = n(), step = 0.07, t0 = 0.16, hold = o.chainHold;
    const end = t0 + N * step + hold, off = 1 - seg(k, end, end + 0.06);
    const order = Array.from({ length: N }, (_, j) => (i % 2 ? N - 1 - j : j));
    const reached = (j) => (k < t0 ? 0 : seg(k, t0 + j * step, t0 + j * step + 0.03)) * off;
    return { i, k, N, order, reached, build: E(seg(k, 0.02, t0)) * (k < t0 + 0.04 ? 1 : 0), off, end, t0 };
  };
  return {
    charge(t) { const e = env(t); return Math.max(e.build, e.reached(0) * 0.8); },
    mods(t) {
      const e = env(t), first = objAt(t, e.order[0]), go = e.reached(0), d = Math.hypot(...first) || 1;
      return { sy: 1 - 0.08 * e.build + 0.1 * go, sx: 1 + 0.06 * e.build - 0.05 * go, dx: (first[0] / d) * 4 * go + jitter(o, t) * e.build * 1.2, dy: 3 * e.build - 2 * go,
        lookX: (first[0] / d) * 1.5 * Math.max(e.build, go), lookY: -1, shut: e.build > 0.6 ? 0.6 : 0, happy: e.k > e.end && e.k < e.end + 0.2 ? 1 : 0, glow: 0.2 * go, quiet: 1,
        hold: 0.8 * e.build, reach: first, reachK: go };
    },
    objs(p, V, t, st, front) {
      const e = env(t);
      e.order.forEach((j, idx) => {
        const [x, y] = objAt(t, j), lit = e.reached(idx), shape = o.chainShape === "cycle" ? SH[j % SH.length] : o.chainShape;
        if (!front) drawObject(p, o, { shape, x: x + jitter(o, t, 1 + j * 0.1) * lit, y, size: o.chainSize, spinY: 1, spinX: j % 2, tilt: 0.35, float: 0, floatTurns: 0, hue: o.chainShape === "cycle" ? j * 60 : 0, glow: 1, ph: j / e.N }, phase(o, t) * total(o), { tint: 0.85 * lit });
        else if (lit > 0) p.glow(x, y, o.chainSize * 2.4, V.main, 0.5 * lit * o.elGlowAmt);
      });
    },
    back(p, C, V, t, st) { this.objs(p, V, t, st, false); },
    front(p, C, V, t, st) {
      const e = env(t);
      this.objs(p, V, t, st, true);
      if (e.build > 0) crawl(p, V, o, t, st, 3, e.build, 0.8, 6);
      const f0 = objAt(t, e.order[0]);
      let [px, py] = handNear(st, f0[0], f0[1]) || skin(o, st, Math.atan2(...f0.slice().reverse()), 0.95);
      e.order.forEach((j, idx) => {
        const a = e.reached(idx), [x, y] = objAt(t, j);
        if (a > 0) zap(p, V, o, R(o, t, 12, idx), px, py, x, y, a);
        [px, py] = [x, y];
      });
    },
  };
};

// ---- the storm: a little cloud over its head rumbles and flashes; the lightning strikes and it catches it,
// lighting up delighted (or the bolt hits beside it and it hops out of the way)
L.storm = (o) => {
  const dodge = o.stormMood === "dodge";
  const times = () => { const n = whole(o.stormStrikes), g = rng(o.seed, 808); return Array.from({ length: n }, (_, i) => (i + g.range(0.2, 0.7)) / n); };
  const near = (ph) => { let best = 9, idx = 0, pre = 9; times().forEach((c, i) => { const d = wrap(ph - c); if (d < best) { best = d; idx = i; } pre = Math.min(pre, wrap(c - ph)); }); return { d: best, i: idx, pre }; };
  const sideOf = (i) => (rng(o.seed, 809, i).chance(0.5) ? 1 : -1);
  const cloud = (st, t) => { const ph = phase(o, t); return [st.x - st.m.dx + Math.sin(TAU * ph) * 4, st.y - st.m.dy - o.size - o.stormHeight + Math.sin(TAU * 2 * ph) * 1.5]; };
  return {
    charge(t) { if (dodge) return 0; const { d } = near(phase(o, t)); return d < 0.25 ? 1 - d / 0.25 : 0; },
    mods(t) {
      const ph = phase(o, t), { d, i, pre } = near(ph), hit = d < 0.04 ? 1 : 0, wait = pre < 0.06 ? 1 - pre / 0.06 : 0;
      if (dodge) {
        const s = sideOf(i), hop = bump(d, 0, 0.14);
        return { dx: -s * 14 * hop, dy: -9 * hop, rot: -s * 0.25 * hop, eyeScale: 1 + 0.45 * (d < 0.18 ? 1 - d / 0.18 : 0) + 0.15 * wait, lookY: -1.4 * wait - 0.4, lookX: s * 1.2 * hop, sy: 1 - 0.08 * wait, quiet: 1, hold: 0.7 * Math.max(wait, hop) };
      }
      const glowK = d < 0.25 ? 1 - d / 0.25 : 0;
      return { sy: 1 + 0.18 * hit - 0.06 * wait, sx: 1 - 0.1 * hit, dx: jitter(o, t) * 2 * (d < 0.05 ? 1 : 0), dy: -3 * bump(d, 0.02, 0.2), happy: d > 0.04 && d < 0.3 ? 1 : 0,
        eyeScale: 1 + 0.3 * hit + 0.1 * wait, lookY: -1.5 + d * 2, glow: 0.4 * glowK, halo: 1 + glowK, quiet: 1, armUp: Math.max(0.6 * wait, d < 0.3 ? 1 - d / 0.3 : 0) };
    },
    back(p, C, V, t, st) {
      // rain falling from it
      const [cx, cy] = cloud(st, t), W = o.stormCloud;
      cycle(t, total(o), Math.round(o.stormRain), o.seed + 810, (g) => g.range(0.45, 0.7), (age, life, r) => {
        const x = cx + r.range(-W, W), k = age / life, y = lerp(cy + 4, st.y + o.size * 2.4, k);
        if (Math.abs(x - st.x) < o.size * 0.8 && y > st.y - o.size * 0.9 && y < st.y + o.size) return;
        p.px(x, y, C[5]); p.dot(x, y - 1, C[4], 0.6);
      });
    },
    front(p, C, V, t, st) {
      const ph = phase(o, t), { d, i, pre } = near(ph), [cx, cy] = cloud(st, t), W = o.stormCloud, g = rng(o.seed, 811);
      const flash = d < 0.05 ? 1 - d / 0.05 : pre < 0.04 && R(o, t, 13).chance(0.5) ? 0.4 : 0;
      p.glow(cx, cy, W * 1.6, V.glow, (0.15 + 0.5 * flash) * o.elGlowAmt);
      // the cloud: dark, its edges lit by the flashes
      const dark = mix(C[1], V.dim, 0.5), mid = mix(C[2], V.glow, 0.3 + 0.5 * flash);
      for (let j = 0; j < 7; j++) {
        const x = cx + lerp(-W * 0.8, W * 0.8, j / 6) + g.range(-2, 2), y = cy - Math.sin((j / 6) * Math.PI) * W * 0.25 + g.range(-1, 1), r = W * g.range(0.25, 0.38);
        p.disc(x, y, r + 1, mid, 1); p.disc(x, y + 1, r, dark, 1);
      }
      for (let j = 0; j < 7; j++) { const x = cx + lerp(-W * 0.8, W * 0.8, j / 6) - 1, y = cy - W * 0.2 - Math.sin((j / 6) * Math.PI) * W * 0.25; p.px(x, y, flash > 0.3 ? V.core : C[5]); }
      if (d < 0.05) {
        const a = 1 - d / 0.05, r = R(o, t, 14);
        const bx = cx + r.range(-W * 0.3, W * 0.3), by = cy + W * 0.25;
        if (dodge) {
          const s = sideOf(i), gx = st.x - st.m.dx + s * o.size * 0.6, gy = st.floor != null ? st.floor : o.size * o.groundDist + o.hover;
          zap(p, V, o, r, bx, by, gx, gy, a);
          p.glow(gx, gy, 18, V.main, 0.6 * a * o.elGlowAmt);
          for (let j = 0; j < 8; j++) p.dot(gx + (j - 3.5) * 2.5, gy - rng(o.seed, 812, j).range(0, 4) - (1 - a) * 6, V.core, a);
        } else {
          const [hx, hy] = handNear(st, bx, by) || skin(o, st, -Math.PI / 2, 0.9);
          zap(p, V, o, r, bx, by, hx, hy, a);
        }
        p.glow(cx, cy + W, W * 3, V.core, 0.25 * a);
      }
      if (!dodge) crawl(p, V, o, t, st, 3, d < 0.25 ? 1 - d / 0.25 : 0, 0.8, 7);
    },
  };
};

// ---- the atom: it floats, eyes closed, at the heart of electrons spinning round it on tilted rings, a crackle
// jumping from one now and then down to it
L.atom = (o) => {
  const rings = () => whole(o.atomRings);
  const electron = (t, j) => {
    const m = rings(), ph = phase(o, t), th = TAU * (whole(o.atomTurns) * (j % 2 ? -1 : 1) * ph + j / m), psi = (j / m) * Math.PI + 0.35;
    const a = o.atomRadius, b = a * 0.3, x = Math.cos(th) * a, y = Math.sin(th) * b;
    return { x: x * Math.cos(psi) - y * Math.sin(psi), y: x * Math.sin(psi) + y * Math.cos(psi), front: Math.sin(th) >= 0, th, psi };
  };
  return {
    charge(t) { return 0.3 + 0.15 * Math.sin(TAU * 4 * phase(o, t)); },
    mods(t) { const ph = phase(o, t); return { dy: o.form === "grounded" ? 0 : -o.atomRise + Math.sin(TAU * 2 * ph) * 1.5, shut: 0.85, glow: 0.1, halo: 1.3, quiet: 1, armOpen: 0.55 }; },
    draw(p, V, t, st, front) {
      const m = rings(), cx = st.x, cy = st.y;
      for (let j = 0; j < m; j++) {
        const psi = (j / m) * Math.PI + 0.35, a = o.atomRadius, b = a * 0.3;
        // the ring's faint path
        for (let s = 0, M = Math.ceil(a * 5); s < M; s++) {
          const th = (s / M) * TAU;
          if ((Math.sin(th) >= 0) !== front || s % 3) continue;
          const x = Math.cos(th) * a, y = Math.sin(th) * b;
          p.dot(cx + x * Math.cos(psi) - y * Math.sin(psi), cy + x * Math.sin(psi) + y * Math.cos(psi), V.glow, 0.45);
        }
        const e = electron(t, j);
        // its trail
        if (o.atomTrail > 0) for (let s = 1; s < 12; s++) {
          const dir = j % 2 ? 1 : -1, th = e.th + dir * s * 0.07 * o.atomTrail;
          if ((Math.sin(th) >= 0) !== front) continue;
          const x = Math.cos(th) * a, y = Math.sin(th) * b;
          p.dot(cx + x * Math.cos(psi) - y * Math.sin(psi), cy + x * Math.sin(psi) + y * Math.cos(psi), s < 4 ? V.main : V.mid, 1 - s / 12);
        }
        if (e.front !== front) continue;
        const X = cx + e.x, Y = cy + e.y;
        p.disc(X, Y, 2, V.main, 1); p.px(X - 0.5, Y - 0.5, V.core); p.px(X + 0.5, Y - 0.5, V.core);
        p.glow(X, Y, 9, V.main, 0.6 * o.elGlowAmt); p.glow(X, Y, 18, V.glow, 0.25 * o.elGlowAmt);
        if (front && o.atomArcs > 0 && R(o, t, 15, j).chance(0.18 * o.atomArcs)) {
          const [sx, sy] = skin(o, st, Math.atan2(e.y, e.x), 0.95);
          zap(p, V, o, R(o, t, 16, j), X, Y, sx, sy, 0.9, { thick: 1 });
        }
      }
    },
    back(p, C, V, t, st) { this.draw(p, V, t, st, false); },
    front(p, C, V, t, st) { this.draw(p, V, t, st, true); },
  };
};

function actOf(o) { return (L[o.elec] || L.discover)(o); }

function layer(p, t, o, front) {
  const C = fit(o.palette, 8), V = volts(o), act = actOf(o), M = (tt) => settle(act.mods(tt), presence(o, tt), prog(o, tt));
  const e = presence(o, t), ch = clamp((act.charge && e > 0 ? act.charge(t) : 0) * o.elTint * e), Cb = ch > 0.002 ? tinted(C, V, ch) : C;
  const st = front ? bodyFront(p, t, o, M, Cb, total(o)) : bodyBack(p, t, o, M, Cb, total(o));
  bodyAmbient(p, t, o, front, C);
  const hook = front ? act.front : act.back;
  if (!hook || e <= 0) return;
  // everything the electricity draws fades with it (dithered, so it stays crisp pixel art)
  const f0 = p.fade;
  p.fade = f0 * e;
  hook.call(act, p, C, V, t, st);
  p.fade = f0;
}

export function drawBack(p, t, o) { layer(p, t, o, false); }
export function draw(p, t, o) { layer(p, t, o, true); }
