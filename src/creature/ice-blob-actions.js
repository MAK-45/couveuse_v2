// The born blob doing something once: going somewhere else in the scene (move), powering up a halo of light (aura).
// Each action runs over a whole number of the idle's loops with the idle going on underneath, and every change it
// makes is zero at both ends: the first and last frames are the idle's first frame, so an idle GIF and any action GIF
// chain end to end (a move ends on its rest drawn where it went).
// In one of the transformation's new forms (o.form "human", levitating, or "grounded", on its legs with gravity) the
// same actions are done by that figure (bodyBack/bodyFront from ice-blob-transform.js) and start and end on its
// "live" loop; on its legs they keep to the floor (FORM_FIT lists what a form can't do, and why).
import { fit, clamp, seg, bump, ease, rng, TAU, WHITE, hex } from "../../pixelfx/src/core/index.js";
import { meta as idleMeta } from "./ice-blob-idle.js";
import { prog as progAt, leadOut, DROP_LIFE } from "./ice-time.js";
import { bodyBack, bodyFront, bodyAmbient, formExtent, gaitFree, gaitLine } from "./ice-blob-transform.js";

export const ACTIONS = ["move", "aura"];
/** What a new form can't do, and why (the page shows it; the effect then just rests): { form: { action: "raison" } }. */
export const FORM_FIT = {};
export const fitsForm = (o, name = o.action) => !(FORM_FIT[o.form] && FORM_FIT[o.form][name]);

export const meta = {
  name: "Ice blob actions",
  desc: "The born ice blob performs an action (goes somewhere else in the scene, or powers up a halo of light) and ends exactly how it began.",
  tags: ["creature", "blob", "action", "ice", "light", "loop"],
  size: [320, 180],
  origin: [160, 100],
  duration: 8,
  loop: true,
  fps: 30,
  bg: "black",
  options: {
    ...idleMeta.options,
    form: "blob", action: "move", loops: 2, lead: 0.08,
    // the move: where it goes (offsets from its spot, in its own pixels; moveTo overrides them: a life asks for a place) and
    // stays; how fast it glides there (its sizes a second), the arc, little hops, looking ahead; on its legs it walks or runs
    moveX: 110, moveY: -25, moveSpeed: 2.6, moveArc: 0.35, moveHops: 0, moveHop: 5, moveLook: 1, moveGait: "walk", moveWalk: 4.5, moveRun: 10,
    auraPower: 1, auraRadius: 1.6, auraPulses: 3, auraRays: 12, auraRise: 10, auraEyes: "closed",
  },
};

const E = ease.inOutSine;
/** How long an action lasts: a whole number of the blob's loops (a move: at least what its way takes). */
export const total = (o) => o.duration * (o.action === "move" && fitsForm(o) ? moveLoops(o) : Math.max(1, Math.round(o.loops)));
// the action's own progress: 0 before the lead-in, 1 after the lead-out, eased edges belong to each action
// the lead-out is never shorter than a drop of light lives (1.7 s): every drop alive on the last frame was
// shed by the resting blob, as on the idle's frames, so the seam between GIFs is exact
const prog = (o, t) => progAt(o, t, total(o));

// ---- the actions: each gives modifiers M(t) and may draw its own light, behind (back) and in front
const A = {};

// ---- the move: it goes somewhere else in the scene and stays there (its rest is there now: this action's first frame is
// its rest where it was, its last its rest where it went, so another one, or a life, carries on from there). The blob and
// the levitating figure glide there along a gentle arc, leaning into it, looking where they go (the blob may hop along);
// the figure on its legs walks there (or runs) along its floor: it turns side on (a quarter turn, it stays itself), sets
// off, goes at its pace, slows down and stops, and turns back to face us, every foot staying where it came down. It moves as a
// whole (ax, ay: its body, its light on the ground, its drops and motes), so standing there it is its rest drawn there
const gnd = (o) => o.form === "grounded";
const GAIT_RAMP = { walk: 1.5, run: 2 };
/** Where the move takes it: [dx, dy] whole pixels from its spot, inside the scene (o.room) with all its body; on its legs only along its floor. */
export function moveOf(o) {
  const to = Array.isArray(o.moveTo) ? o.moveTo : [o.moveX, o.moveY];
  let dx = Math.round(to[0] || 0), dy = gnd(o) ? 0 : Math.round(to[1] || 0);
  if (Array.isArray(o.room)) {
    const [x0, y0, x1, y1] = formExtent(o), r = o.room, fit = (v, lo, hi) => (lo > hi ? Math.round((lo + hi) / 2) : Math.min(hi, Math.max(lo, v)));
    dx = fit(dx, Math.ceil(r[0] - x0 + 2), Math.floor(r[2] - x1 - 2));
    if (!gnd(o)) dy = fit(dy, Math.ceil(r[1] - y0 + 2), Math.floor(r[3] - y1 - 2));
  }
  return [dx, dy];
}
// on its legs: its walk there, in seconds of the action (T long): it turns side on, sets off, goes at its pace, slows
// down, stops and turns back to face us (a quarter turn each way: the two figures blend, it never melts); and its line
const TURN = 0.55;
function moveWalk(o, T) {
  const [dx] = moveOf(o), dist = Math.abs(dx), kind = o.moveGait === "run" ? "run" : "walk", g = gaitFree(o, kind, kind === "run" ? o.moveRun : o.moveWalk);
  const a0 = Math.max(0.12, o.lead * T), R = GAIT_RAMP[kind] / g.rate, V = g.S * g.rate;
  // up to its pace over R, at its pace for L, down over R: as far as it has to go (a short way: it never gets to its pace)
  const L = Math.max(0, dist / V - R), peak = L > 0 ? 1 : dist / (V * R), s1 = a0 + 0.75 * TURN, s2 = s1 + R, s3 = s2 + L, s4 = s3 + R, u0 = s4 - 0.2 * TURN;
  return { kind, g, dist, dir: dx < 0 ? -1 : 1, turn1: [a0, a0 + TURN], go: s1, stop: s4, turn2: [u0, u0 + TURN], need: u0 + TURN + DROP_LIFE,
    pieces: [{ t0: s1, t1: s2, s0: 0, s1: peak }, { t0: s2, t1: s3, s0: peak, s1: peak }, { t0: s3, t1: s4, s0: peak, s1: 0 }] };
}
// the blob, or the levitating figure: how long its glide takes
const glideTime = (o) => { const [dx, dy] = moveOf(o); return Math.max(0.9, Math.hypot(dx, dy) / Math.max(1, o.moveSpeed * o.size)); };
const MOVE_LOOPS = new WeakMap();
function moveLoops(o) {
  let n = MOVE_LOOPS.get(o);
  if (n) return n;
  n = Math.max(1, Math.round(o.loops));
  for (let k = 0; k < 12; k++, n++) {
    const T = o.duration * n;
    if (gnd(o) ? moveWalk(o, T).need <= T : (leadOut(o, T) - o.lead) * T >= glideTime(o)) break;
  }
  MOVE_LOOPS.set(o, n);
  return n;
}
A.move = (o) => {
  const [dx, dy] = moveOf(o), d = Math.hypot(dx, dy);
  if (!d) return { mods: () => ({}) };
  if (gnd(o)) return walkTo(o, dx);
  // the arc bulges upward (sideways for a move straight up or down)
  let nx = -dy / d, ny = dx / d;
  if (ny > 0 || (ny === 0 && nx < 0)) { nx = -nx; ny = -ny; }
  const bend = Math.min(1.5, o.moveArc) * d * 0.18, hops = Math.max(0, Math.round(o.moveHops)), ux = dx / d, uy = dy / d, T = total(o), out = leadOut(o, T);
  return {
    mods(t) {
      // (its progress does not wrap round: before it sets off it was here, after it arrives it is there, drops and all)
      const a = seg(t / T, o.lead, out);
      if (a <= 0) return {};
      if (a >= 1) return { ax: dx, ay: dy };
      const s = E(a), b = Math.sin(Math.PI * s) * bend, env = Math.sin(Math.PI * a);
      // a little crouch as it sets off, a squash as it arrives
      const sq = 0.1 * bump(a, 0, 0.16) + 0.08 * bump(a, 0.86, 1);
      const m = { ax: dx * s + nx * b, ay: dy * s + ny * b, sy: 1 - sq, sx: 1 + sq * 0.7, quiet: 1,
        lookX: ux * 1.3 * o.moveLook * Math.min(1, env * 2.5), lookY: uy * 0.8 * o.moveLook * Math.min(1, env * 2.5) };
      if (hops && o.form !== "human") {
        const h = Math.abs(Math.sin(Math.PI * hops * s)), land = 1 - h, w = env ** 0.5;
        m.dy = -o.moveHop * h * w;
        const k = (land > 0.85 ? ((land - 0.85) / 0.15) * 0.16 : -h * 0.05) * w;
        m.sy -= k; m.sx += k * 0.8;
      }
      return m;
    },
  };
};
// on its legs: it walks (or runs) there along its floor
function walkTo(o, dx) {
  const T = total(o), W = moveWalk(o, T), { g, dir } = W;
  const line = gaitLine({ S: g.S, rate: g.rate, pieces: W.pieces, at: W.go, c0: 0.55 });
  const base = { kind: W.kind, S: g.S, v: g.v, rate: g.rate, N: 64, dir, arms: 1, lean: 1, bounce: 1, heel: 1, knee: 1, hair: 1, prints: 1, sparks: 1 };
  const gaitAt = (t) => { const c = line.c(t); return { ...base, ph: c - Math.floor(c), cyc: c, line, t }; };
  const [a0, a1] = W.turn1, [u0, u1] = W.turn2;
  return {
    mods(t) {
      if (t >= u1) return { ax: dx };
      if (t <= a0) return {};
      // (once it has stopped it is there exactly)
      const w = t < a1 ? E(seg(t, a0, a1)) : t > u0 ? 1 - E(seg(t, u0, u1)) : 1, ax = t >= W.stop ? dx : dir * line.d(t);
      return w >= 1 ? { gait: gaitAt(t), ax, quiet: 1 } : { gait: gaitAt(t), turn: w, ax, quiet: 1 };
    },
  };
}

A.aura = (o) => ({
  env: (t) => { const a = prog(o, t); return a <= 0 || a >= 1 ? 0 : Math.sin(Math.PI * a) ** 2; },
  mods(t) {
    const a = prog(o, t), e = this.env(t);
    // (on its legs it stays on the floor and spreads its arms)
    return { dy: o.form === "grounded" ? 0 : -o.auraRise * e, glow: 0.6 * o.auraPower * e, halo: 1 + 1.8 * o.auraPower * e, shut: o.auraEyes === "closed" ? clamp(e * 1.6) : 0, happy: o.auraEyes === "happy" && e > 0.3 ? 1 : 0, quiet: a > 0 && a < 1 ? 1 : 0,
      armOpen: E(clamp(e * 1.4)), armUp: 0.35 * e * e };
  },
  back(p, C, t, st) {
    const a = prog(o, t), e = this.env(t);
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
    const a = prog(o, t);
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
});

// the motes around it follow where it goes
function drift(act, t) {
  const m = act.mods(t);
  // (ax, ay: it went somewhere else, all of it)
  return [(m.dx || 0) + (m.ax || 0), Math.min(0, m.dy || 0) * 0.5 + Math.max(0, m.dy || 0) + (m.ay || 0)];
}

export function hsl(c) {
  const v = hex(c), r = (v & 255) / 255, g = ((v >> 8) & 255) / 255, b = ((v >> 16) & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
export function fromHsl(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + [r, g, b].map((v) => Math.round(clamp(v + m) * 255).toString(16).padStart(2, "0")).join("");
}


// an action its form can't do (or an unknown one): it just rests
const REST = { mods: () => ({}) };
const actionOf = (o) => (fitsForm(o) && A[o.action] ? A[o.action](o) : REST);

export function drawBack(p, t, o) {
  const act = actionOf(o), C = fit(o.palette, 8);
  const st = bodyBack(p, t, o, (tt) => act.mods(tt), C, total(o));
  bodyAmbient(p, t, o, false, C, drift(act, t));
  if (act.back) act.back(p, C, t, st);
}

export function draw(p, t, o) {
  const act = actionOf(o), C = fit(o.palette, 8);
  const st = bodyFront(p, t, o, (tt) => act.mods(tt), C, total(o));
  bodyAmbient(p, t, o, true, C, drift(act, t));
  if (act.front) act.front(p, C, t, st);
}
