// The blob busy with something, forever: sleeping, casting magic, walking or running on the spot. Each runs over a
// whole number of the blob's own loops with its rest going on underneath, every rhythm a whole number of beats a loop,
// every particle on the loop's clock: the GIF loops with no seam.
// Each also has an entry from the Blob né's rest and an exit back to it (o.part "enter" / "exit"), so it can be lived:
// rest -> entry -> the loop, as many times as you like -> exit -> rest, every join exact (see the end of this file).
// In one of the transformation's new forms (o.form "human" or "grounded") the figure does them, with its arms (raised
// for magic); on its legs it keeps to its floor (it sits down cross-legged to sleep), and only the figure on its legs
// can walk or run (FORM_FIT).
import { fit, lerp, seg, bump, ease, rng, TAU, WHITE, hex } from "../../pixelfx/src/core/index.js";
import { meta as idleMeta } from "./ice-blob-idle.js";
import { bodyBack, bodyFront, bodyAmbient, formAnchor, gaitPlan, gaitLine, isForm, FORM_DEFAULTS } from "./ice-blob-transform.js";
import { phases, settle, DROP_LIFE } from "./ice-time.js";
import { hsl, fromHsl } from "./ice-blob-actions.js";

export const LOOPS = ["sleep", "magic", "walk", "run"];
/** What a new form can't do, and why (the page shows it; the effect then just rests). */
export const FORM_FIT = {
  blob: {
    walk: "Il marche sur ses jambes : le blob né n’en a pas. Choisis la forme humaine au sol.",
    run: "Il court sur ses jambes : le blob né n’en a pas. Choisis la forme humaine au sol.",
  },
  human: {
    walk: "En lévitation, ses pieds ne touchent pas le sol : il ne peut pas marcher. Choisis la forme humaine au sol.",
    run: "En lévitation, ses pieds ne touchent pas le sol : il ne peut pas courir. Choisis la forme humaine au sol.",
  },
};
export const fitsForm = (o, name = o.loop) => !(FORM_FIT[o.form] && FORM_FIT[o.form][name]);

export const meta = {
  name: "Ice blob loops",
  desc: "The ice blob busy forever: sleeping, casting magic, walking or running on the spot.",
  tags: ["creature", "blob", "loop", "idle", "activity", "ice", "light"],
  size: [320, 180],
  origin: [160, 100],
  duration: 8,
  loop: true,
  fps: 30,
  bg: "black",
  options: {
    ...idleMeta.options,
    form: "blob", loop: "sleep", loops: 2,
    // the part: the loop, its entry from rest or its exit back to rest (each a whole number of the blob's loops), and how
    // long the figure takes to melt into light and out again when the loop needs another pose (sitting, legs crossed)
    part: "loop", inLoops: 1, outLoops: 1, lead: 0.08, meltTime: 1.1,
    sleepBreaths: 3, sleepDepth: 1, sleepSink: 8, sleepBubbles: 4, sleepDim: 0.5, sleepTwitch: 1,
    magicCircle: 34, magicTurns: 1, magicRunes: 8, magicPulses: 2, magicSparkles: 24, magicRise: 8, magicHue: 0, magicEyes: "closed",
    // walk and run on the spot (on its legs): its floor of ice going by under its feet
    gaWalk: 5, gaRun: 12, gaDir: "right", gaStride: 1, gaArms: 1, gaLean: 1, gaBounce: 1, gaHeel: 1, gaKnee: 1, gaHair: 1, gaPrints: 1, gaSparks: 1,
  },
};

const E = ease.inOutSine;
// the activity's own period, and the part being played
const loopLen = (o) => o.duration * Math.max(1, Math.round(o.loops));
const partOf = (o) => (o.part === "enter" || o.part === "exit" ? o.part : "loop");
/** How long the animation lasts: the loop, or its entry or exit (each a whole number of the blob's loops; walking and
 * running take at least what their first or last steps need). */
export const total = (o) => {
  const p = partOf(o);
  if (p === "loop") return loopLen(o);
  const n = Math.max(1, Math.round(p === "enter" ? o.inLoops : o.outLoops));
  return o.duration * (isGait(o) ? gaitLoops(o, p, n) : n);
};
// the loop's phase, 0..1, at any time (negative too)
const phase = (o, t) => (((t / loopLen(o)) % 1) + 1) % 1;
const whole = (v, lo = 1) => Math.max(lo, Math.round(v));
const shifted = (C, hue) => (hue ? C.map((c) => { const [h, s, l] = hsl(c); return hex(fromHsl((((h + hue) % 360) + 360) % 360, s, l)); }) : C);
// in a new form: where its head is (bubbles of sleep come from it) and what is under it
const gnd = (o) => o.form === "grounded";
const headAt = (st, o, x, y) => (st.head ? [st.head[0] + st.headR * 0.8 + (x - st.x - o.size * 0.55) * 0.6, st.head[1] - st.headR * 0.9 + (y - st.y + o.size * 0.85)] : [x, y]);
const under = (st) => (st.floor != null ? st.floor - 1 : Math.max(...st.feet.map((f) => f[1])) + 3);
const spark = (p, C, x, y, a = 1) => { p.px(x, y, WHITE); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.dot(x + dx, y + dy, C[6], a); p.glow(x, y, 4, C[5], 0.35 * a); };
const ring = (p, x, y, rx, ry, c, a, filter) => { for (let j = 0, m = Math.ceil(Math.max(rx, ry) * 6); j < m; j++) { const th = (j / m) * TAU; if (!filter || filter(th)) p.dot(x + Math.cos(th) * rx, y + Math.sin(th) * ry, c, a); } };
// tiny pixel glyphs: runes for the magic
const GLYPHS = {
  runes: [["01110", "10001", "10101", "10001", "01110"], ["00100", "01110", "10101", "00100", "00100"], ["10001", "01010", "00100", "01010", "10001"],
    ["11111", "00100", "01110", "00100", "11111"], ["01010", "11111", "01010", "11111", "01010"], ["00100", "01010", "10001", "01010", "00100"]],
};
function glyph(p, rows, x, y, c, a = 1, k = 1) {
  const h = rows.length * k, w = rows[0].length * k;
  x = Math.round(x - w / 2); y = Math.round(y - h / 2);
  rows.forEach((r, j) => [...r].forEach((b, i) => {
    if (b !== "1") return;
    for (let v = 0; v < k; v++) for (let u = 0; u < k; u++) (a >= 1 ? p.px(x + i * k + u + 0.5, y + j * k + v + 0.5, c) : p.dot(x + i * k + u + 0.5, y + j * k + v + 0.5, c, a));
  }));
}

const L = {};

// ---- sleeping: low and still, eyes shut, deep slow breaths, bubbles of sleep, now and then a twitch
L.sleep = (o) => ({
  mods(t) {
    const ph = phase(o, t), n = whole(o.sleepBreaths), b = Math.sin(TAU * n * ph), tw = o.sleepTwitch > 0 ? bump(ph, 0.7, 0.74) * o.sleepTwitch : 0;
    // (a figure curls up as it floats; on its legs it sits down cross-legged on its floor and nods off)
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
});

// ---- magic: it rises over a turning circle of runes, eyes shut in concentration, light spiralling up, pulses
L.magic = (o) => {
  const pal = (C) => shifted(C, o.magicHue);
  return {
    mods(t) {
      const ph = phase(o, t), pu = Math.max(0, Math.sin(TAU * whole(o.magicPulses) * ph)) ** 3;
      // (a figure raises its arms over the circle; on its legs it stays standing on the floor)
      return { dy: gnd(o) ? 0 : -o.magicRise + Math.sin(TAU * 2 * ph) * 1.5, glow: 0.08 + 0.3 * pu, halo: 1.3 + 0.8 * pu, shut: o.magicEyes === "closed" ? 1 : 0, happy: o.magicEyes === "happy" ? 1 : 0, quiet: 1,
        armUp: 0.55 + 0.35 * pu, armOpen: 0.4 * (1 - pu) };
    },
    circle(p, C0, t, st, front) {
      const C = pal(C0), ph = phase(o, t), R = o.magicCircle, cy = st.feet ? under(st) + (gnd(o) ? 0 : o.magicRise * 0.3) : st.y - this.mods(t).dy + o.size * 1.25 + o.magicRise * 0.3, cx = st.x;
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
        glyph(p, GLYPHS.runes[i % GLYPHS.runes.length], cx + Math.cos(th) * R * 1.18, cy + Math.sin(th) * R * 0.38 - 3, front ? WHITE : C[6]);
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
  };
};

// ---- walking and running on the spot (the human form on its legs): side on, it walks or runs where it is and its floor
// of ice goes by under its feet like a treadmill (glints and prints carried back at the speed of its steps). Whole strides
// a loop, and the floor goes by whole tiles a loop (gaitPlan): the speed asked, rounded so the loop is seamless
const isGait = (o) => (o.loop === "walk" || o.loop === "run") && fitsForm(o);
const PLANNED = new WeakMap();
function gaitPlanOf(o, kind) {
  let pl = PLANNED.get(o);
  if (!pl) {
    const r = Array.isArray(o.room) ? o.room : [-meta.origin[0], -meta.origin[1], meta.size[0] - meta.origin[0], meta.size[1] - meta.origin[1]];
    const T = Math.max(16, Math.ceil(Math.max(r[2] - r[0], r[3] - r[1])));
    pl = gaitPlan(o, kind, loopLen(o), T, kind === "run" ? o.gaRun : o.gaWalk, o.gaStride);
    PLANNED.set(o, pl);
  }
  return pl;
}
const gaitLoop = (kind) => (o) => {
  const P = loopLen(o), dir = o.gaDir === "left" ? -1 : 1, plan = gaitPlanOf(o, kind);
  // the loop's strides at its clock t, and the line its steps follow (at its own pace: the loop's clock itself)
  const cs = (t) => (plan.N * t) / P + 0.1, csInv = (c) => ((c - 0.1) * P) / plan.N;
  const W0 = { kind, S: plan.S, v: plan.v, rate: plan.rate, N: plan.N, dir, arms: o.gaArms, lean: o.gaLean,
    bounce: o.gaBounce, heel: o.gaHeel, knee: o.gaKnee, hair: o.gaHair, prints: o.gaPrints, sparks: o.gaSparks };
  const gait = (line, t) => { const c = line.c(t); return { ...W0, ph: c - Math.floor(c), cyc: c, line, t }; };
  const own = gaitLine({ S: plan.S, rate: plan.rate, cs, csInv });
  return {
    plan,
    mods(t) { return { gait: gait(own, t), quiet: 1 }; },
    // its entry and its exit (o.part): the line of its first steps, or of its last, and what they make of the figure
    parts(part, T) { return gaitParts(o, kind, part, T, plan, (line) => (t) => gait(line, t), cs, csInv); },
  };
};
L.walk = gaitLoop("walk");
L.run = gaitLoop("run");
/** Walking or running: how fast it really goes and its strides, for the page (null for the other loops). */
export const gaitOf = (o) => ((o.loop === "walk" || o.loop === "run") && fitsForm(o) ? loopOf(o).plan : null);

// a loop its form can't do (or an unknown one): it just rests in that form
function loopOf(o) { return fitsForm(o) && L[o.loop] ? L[o.loop](o) : { mods: () => ({}) }; }

// ---- walking and running in three parts, the first steps and the last. Entry: it stands facing us (its rest) and turns
// side on, its body turning as one (the figure facing us and the one side on blend: it never melts), then sets off, its
// steps growing to the loop's over a stride and a half (two running) as its floor of ice starts to go by under it, leaning
// into the start; then it goes at the loop's own pace long enough that its steps and its prints are the loop's, frame for
// frame. Exit: it slows down, its steps shortening, leans back, stops and turns back to face us, at rest. Its steps follow
// a line (gaitLine, ice-blob-transform.js): every foot stays where it came down while the floor goes back under it by
// exactly as much as it goes, whatever its pace, so nothing slides
const GAIT_RAMP = { walk: 1.5, run: 2 }; // strides from standing to its own pace, and back
const PRINT_LIFE = { walk: 2.6, run: 1.7 }; // how many strides a print lasts (gaitFx)
const TURN = 0.55; // (s) a quarter turn
function gaitTimes(o, kind, part, T, rate) {
  const R = GAIT_RAMP[kind] / rate, a0 = Math.max(0.12, (o.lead ?? 0.08) * T);
  if (part === "enter") {
    // (it sets off as it ends its turn; then at its own pace for as long as the prints of its first steps take to fade)
    const g0 = a0 + 0.75 * TURN, g1 = g0 + R;
    return { turn: [a0, a0 + TURN], go: [g0, g1], need: g1 + Math.max(DROP_LIFE, (PRINT_LIFE[kind] + 0.05) / rate) };
  }
  // (it slows down once the steps already on their way are set down: a foot in the air lands within 0.4 of a stride; it
  // turns back to face us as it stops, then rests)
  const f0 = Math.max(a0, 0.45 / rate), f1 = f0 + R, u0 = f1 - 0.2 * TURN;
  return { turn: [u0, u0 + TURN], go: [f0, f1], need: u0 + TURN + DROP_LIFE };
}
// how many of the blob's loops its entry or exit takes (at least n)
const PART_LOOPS = new WeakMap();
function gaitLoops(o, part, n) {
  const key = part + n;
  let m = PART_LOOPS.get(o);
  if (!m) { m = {}; PART_LOOPS.set(o, m); }
  if (m[key]) return m[key];
  const kind = o.loop, rate = gaitPlanOf(o, kind).rate;
  let k = n;
  while (k < n + 8 && gaitTimes(o, kind, part, o.duration * k, rate).need > o.duration * k) k++;
  return (m[key] = k);
}
function gaitParts(o, kind, part, T, plan, gaitOn, cs, csInv) {
  const tm = gaitTimes(o, kind, part, T, plan.rate), enter = part === "enter", clock = enter ? (t) => t - T : (t) => t;
  const line = gaitLine({ S: plan.S, rate: plan.rate, cs, csInv, at: clock(enter ? tm.go[1] : tm.go[0]),
    pieces: [{ t0: clock(tm.go[0]), t1: clock(tm.go[1]), s0: enter ? 0 : 1, s1: enter ? 1 : 0 }] });
  const gaitAt = gaitOn(line), [u0, u1] = tm.turn;
  // how far it has turned side on (0 facing us at rest, 1 side on)
  const turnAt = (tt) => (enter ? E(seg(tt, u0, u1)) : 1 - E(seg(tt, u0, u1)));
  const at = (tt) => ({ k: line.s(clock(tt)), turn: turnAt(tt) });
  const mods = (tt) => {
    const w = turnAt(tt);
    if (w <= 0) return {}; // facing us, at rest
    // side on: exactly the loop's at its own pace; turning, the two figures blended
    return w >= 1 ? { gait: gaitAt(clock(tt)), quiet: 1 } : { gait: gaitAt(clock(tt)), turn: w, quiet: 1 };
  };
  return { at, mods };
}

// ---- the three parts. The loop is the activity itself. Its entry starts on the rest's frame and the activity's own
// clock runs up to 0 on its last frame, where the loop starts; its exit starts where the loop ends (its clock goes on)
// and ends on the rest's frame. In between, the activity's intensity k (phases(), ice-time.js) draws each of its
// modifiers back to rest and fades what it draws; at k = 1 the modifiers are exactly the loop's, for the last 1.7 s of
// the entry, so the drops of light alive at the join are the same. A pose the activity needs (sitting cross-legged on
// the floor, legs crossed, arms down) can't be faded: the figure melts into light (morph 1), the pose switches while
// nothing of the figure shows, and it takes shape again in the new pose; on its legs its frame gathers meanwhile at a
// point that goes from where the one pose has it to where the other does (anchor), so the light it melts into doesn't jump.
const POSE_KEYS = ["legs", "arms", "seat"];
function poseChange(o, m0) {
  if (!isForm(o)) return false;
  if (o.form === "grounded") return m0.seat > 0.5;
  return !!((m0.legs && m0.legs !== (o.huLegs ?? FORM_DEFAULTS.huLegs)) || (m0.arms && m0.arms !== (o.huArms ?? FORM_DEFAULTS.huArms)));
}
const PLANS = new WeakMap();
function planOf(o) {
  let pl = PLANS.get(o);
  if (pl) return pl;
  const act = loopOf(o), part = partOf(o), T = total(o);
  pl = { act, part, T, clock: part === "enter" ? (t) => t - T : (t) => t };
  if (part !== "loop" && act.parts) {
    // walking, running: their own first and last steps
    const g = act.parts(part, T);
    Object.assign(pl, { at: g.at, own: g.mods });
  } else if (part !== "loop") {
    const m0 = act.mods(0), pose = poseChange(o, m0);
    pl.at = phases(part, T, o.lead ?? 0.08, pose, o.meltTime ?? 1.1);
    if (pose && o.form === "grounded") {
      const keep = {};
      for (const k of POSE_KEYS) if (k in m0) keep[k] = m0[k];
      pl.anchors = [formAnchor(o, null), formAnchor(o, () => keep)];
    }
  }
  PLANS.set(o, pl);
  return pl;
}
function modsOf(pl) {
  const { act } = pl;
  if (pl.part === "loop") return (tt) => act.mods(tt);
  if (pl.own) return pl.own;
  return (tt) => {
    const a = pl.at(tt), m = act.mods(pl.clock(tt));
    if (a.k >= 1 && a.swap && !(a.melt > 0)) return m;
    const out = settle(m, a.k);
    if (a.swap) for (const key of POSE_KEYS) if (key in m) out[key] = m[key];
    // drops of light falling while it does anything don't show (as for an action)
    out.quiet = a.k > 0 || a.melt > 0 ? 1 : 0;
    if (a.melt > 0) {
      out.morph = a.melt;
      if (pl.anchors) out.anchor = pl.anchors[0].map((v, i) => lerp(v, pl.anchors[1][i], a.s));
    }
    return out;
  };
}
function layer(p, t, o, front) {
  const C = fit(o.palette, 8), pl = planOf(o), M = modsOf(pl);
  const st = front ? bodyFront(p, t, o, M, C, pl.T) : bodyBack(p, t, o, M, C, pl.T);
  bodyAmbient(p, t, o, front, C);
  const hook = front ? pl.act.front : pl.act.back, k = pl.part === "loop" ? 1 : pl.at(t).k;
  if (!hook || k <= 0) return st;
  // what the activity draws fades in and out with it (dithered, so it stays crisp pixel art)
  const f0 = p.fade;
  p.fade = f0 * k;
  hook.call(pl.act, p, C, pl.clock(t), st);
  p.fade = f0;
  return st;
}

export function drawBack(p, t, o) { return layer(p, t, o, false); }
export function draw(p, t, o) { return layer(p, t, o, true); }
