// Walking and running on the spot (the figure on its legs), shared by the fiches walk.js and run.js. Side on, it walks or
// runs where it is and its floor of ice goes by under its feet like a treadmill (glints and prints carried back at the
// speed of its steps): whole strides a loop, and the floor goes by whole tiles a loop (gaitPlan), the speed asked rounded
// so the loop is seamless.
// Its own entry and exit, the first steps and the last. Entry: it stands facing us (its rest) and turns side on, its body
// turning as one (the figure facing us and the one side on blend: it never melts), then sets off, its steps growing to the
// loop's over a stride and a half (two running) as its floor starts to go by under it; then it goes at the loop's own pace
// long enough that its steps and prints are the loop's, frame for frame. Exit: it slows down, its steps shortening, stops
// and turns back to face us, at rest. Its steps follow a line (gaitLine, forms.js): every foot stays where it came down
// while the floor goes back under it by exactly as much as it goes, whatever its pace, so nothing slides.
import { seg, ease } from "../../pixelfx/src/core/index.js";
import { gaitPlan, gaitLine } from "../forms/forms.js";
import { DROP_LIFE, LEAD_MIN } from "../shared/_time.js";
import { loopLen } from "./_loop.js";

export const GAIT_DIRS = [["right", "Vers la droite"], ["left", "Vers la gauche"]];
const E = ease.inOutSine;
const GAIT_RAMP = { walk: 1.5, run: 2 }; // strides from standing to its own pace, and back
const PRINT_LIFE = { walk: 2.6, run: 1.7 }; // how many strides a print lasts (gaitFx)
const TURN = 0.55; // (s) a quarter turn

/** What a walking or running fiche adds to loop(): its play, and the loops its entry and exit take. */
export const gait = (kind) => ({ gait: true, play: gaitLoop(kind), partLoops: (o, part, n) => gaitLoops(o, kind, part, n) });

const PLANNED = new WeakMap();
function gaitPlanOf(o, kind) {
  let pl = PLANNED.get(o);
  if (!pl) {
    const r = Array.isArray(o.room) ? o.room : [-160, -100, 160, 80];
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
  const gaitAt = (line, t) => { const c = line.c(t); return { ...W0, ph: c - Math.floor(c), cyc: c, line, t }; };
  const own = gaitLine({ S: plan.S, rate: plan.rate, cs, csInv });
  return {
    plan,
    mods(t) { return { gait: gaitAt(own, t), quiet: 1 }; },
    // its entry and its exit (o.part): the line of its first steps, or of its last, and what they make of the figure
    parts(part, T) { return gaitParts(o, kind, part, T, plan, (line) => (t) => gaitAt(line, t), cs, csInv); },
  };
};
function gaitTimes(o, kind, part, T, rate) {
  const R = GAIT_RAMP[kind] / rate, a0 = Math.max(LEAD_MIN, (o.lead ?? 0.08) * T);
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
function gaitLoops(o, kind, part, n) {
  const key = part + n;
  let m = PART_LOOPS.get(o);
  if (!m) { m = {}; PART_LOOPS.set(o, m); }
  if (m[key]) return m[key];
  const rate = gaitPlanOf(o, kind).rate;
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
