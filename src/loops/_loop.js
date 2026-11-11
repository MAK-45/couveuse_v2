// The host of the loops: what every loop fiche gets without writing it. Its period (whole loops of the blob), its three
// parts (o.part: "loop" the activity itself, "enter" from rest, "exit" back to rest), the rest when its form can't do it,
// and its body drawn in every form (shared/_creature.js).
//
// The three parts. The entry starts on the rest's frame and the activity's own clock runs up to 0 on its last frame, where
// the loop starts; the exit starts where the loop ends (its clock goes on) and ends on the rest's frame. In between, the
// activity's intensity k (phases(), shared/_time.js) draws each of its modifiers back to rest (settle()) and fades what it
// draws; k = 1 for the last 1.7 s of the entry, so the drops of light alive at the join are the loop's. A pose the activity
// needs (sitting cross-legged on the floor, legs crossed, arms down) is taken with k too (poseK): the figure goes from its
// rest pose to the activity's part by part (forms.js), its hips going down, its knees opening, never melting nor jumping.
// A fiche may bring its own parts instead (act.parts(part, T), like walking and running: a quarter turn and their first
// and last steps).
import { TAU } from "../../pixelfx/src/core/index.js";
import { meta as idleMeta } from "../blob/blob.js";
import { isForm, FORM_DEFAULTS } from "../forms/forms.js";
import { phases, settle } from "../shared/_time.js";
import { creature } from "../shared/_creature.js";
import { options, merged } from "../shared/_fiche.js";

const REST = { mods: () => ({}) };
// the part, and its lengths in the blob's loops
const BASE = { form: "blob", loops: 2, part: "loop", inLoops: 1, outLoops: 1, lead: 0.08 };
const META = { tags: ["creature", "blob", "loop", "idle", "activity", "ice", "light"], size: [320, 180], origin: [160, 100], duration: 8, loop: true, fps: 30, bg: "black" };

/** The activity's period (o.loops of the blob's loops), and its phase 0..1 at any time (negative too). */
export const loopLen = (o) => o.duration * Math.max(1, Math.round(o.loops));
export const phase = (o, t) => (((t / loopLen(o)) % 1) + 1) % 1;
/** Counts that drive motion are whole numbers. */
export const whole = (v, lo = 1) => Math.max(lo, Math.round(v));
export const gnd = (o) => o.form === "grounded";
/** A dotted ellipse (filter(angle) keeps part of it: the half behind or in front of the creature). */
export const ring = (p, x, y, rx, ry, c, a, filter) => { for (let j = 0, m = Math.ceil(Math.max(rx, ry) * 6); j < m; j++) { const th = (j / m) * TAU; if (!filter || filter(th)) p.dot(x + Math.cos(th) * rx, y + Math.sin(th) * ry, c, a); } };
const partOf = (o) => (o.part === "enter" || o.part === "exit" ? o.part : "loop");
// the part's length: the loop, or its entry or exit (whole loops of the blob; a fiche's partLoops can ask for more)
const lengthOf = (f, o) => {
  const p = partOf(o);
  if (p === "loop") return loopLen(o);
  const n = Math.max(1, Math.round(p === "enter" ? o.inLoops : o.outLoops));
  return o.duration * (f && f.partLoops && f.fits(o) ? f.partLoops(o, p, n) : n);
};

/**
 * A loop fiche. def: { id, name, desc (its card in Vivre), loops (its default period), options (see shared/_fiche.js),
 * formFit ({ form: "pourquoi pas, en français" }), play(o) → { mods(t), back?(p, C, t, st), front?(p, C, t, st),
 * parts?(part, T) }: the activity itself, its modifiers and drawing at its own clock t (periodic over loopLen(o): read time
 * through phase(o, t)); its entry and exit come by themselves. gait / partLoops: walking and running (_gait.js) }.
 * The fiche is also a pixelfx effect playing only this loop (meta, drawBack, draw: npm run render -- loops/<id>).
 */
export function loop(def) {
  const f = { loops: 2, formFit: {}, ...def, kind: "loop", ...options(def.options, { ...idleMeta.options, ...BASE, loop: 0 }) };
  f.fits = (o) => !f.formFit[o.form];
  f.total = (o) => lengthOf(f, o);
  f.act = (o) => (f.fits(o) ? f.play(o) : REST);
  const own = { ...idleMeta.options, ...BASE, loop: f.id, loops: f.loops, ...f.defaults };
  return Object.assign(f, { meta: { ...META, name: f.name, desc: f.desc, options: own } }, creature(frame(() => f)));
}

/** The loops tab's effect over a catalogue: it plays the loop o.loop names, in the part o.part (an unknown one just rests). */
export function family(list) {
  const byId = new Map(list.map((f) => [f.id, f])), ficheOf = (o) => byId.get(o.loop);
  const options = { ...idleMeta.options, ...BASE, loop: list[0].id, ...merged(list) };
  return {
    meta: { ...META, name: "Ice blob loops", desc: "The ice blob busy forever with one of its activities, with an entry from rest and an exit back to it.", options },
    total: (o) => lengthOf(ficheOf(o), o),
    /** Walking or running: how fast it really goes and its strides, for the page (null for the other loops). */
    gaitOf: (o) => { const f = ficheOf(o); return f && f.gait && f.fits(o) ? f.act(o).plan : null; },
    ...creature(frame(ficheOf)),
  };
}

const POSE_KEYS = ["legs", "arms", "seat"];
function poseChange(o, m0) {
  if (!isForm(o)) return false;
  if (o.form === "grounded") return m0.seat > 0.5;
  return !!((m0.legs && m0.legs !== (o.huLegs ?? FORM_DEFAULTS.huLegs)) || (m0.arms && m0.arms !== (o.huArms ?? FORM_DEFAULTS.huArms)));
}
// the part played: the activity, its clock, and (entry, exit) its intensity's timetable or its own parts
const PLANS = new WeakMap();
function planOf(f, o) {
  let pl = PLANS.get(o);
  if (pl) return pl;
  const act = f ? f.act(o) : REST, part = partOf(o), T = lengthOf(f, o);
  pl = { act, part, T, clock: part === "enter" ? (t) => t - T : (t) => t };
  if (part !== "loop" && act.parts) {
    const g = act.parts(part, T);
    Object.assign(pl, { at: g.at, own: g.mods });
  } else if (part !== "loop") {
    pl.at = phases(part, T, o.lead ?? 0.08);
    pl.pose = poseChange(o, act.mods(0));
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
    if (a.k >= 1) return m;
    const out = settle(m, a.k);
    // (its pose, taken as far as k)
    if (pl.pose && a.k > 0) { for (const key of POSE_KEYS) if (key in m) out[key] = m[key]; out.poseK = a.k; }
    // drops of light falling while it does anything don't show (as for an action)
    out.quiet = a.k > 0 ? 1 : 0;
    return out;
  };
}
// what the creature adapter needs at t; what the activity draws fades in and out with it (dithered: crisp pixel art)
const frame = (ficheOf) => (o, t) => {
  const pl = planOf(ficheOf(o), o);
  return { M: modsOf(pl), T: pl.T, extra: (p, C, st, front) => {
    const hook = front ? pl.act.front : pl.act.back, k = pl.part === "loop" ? 1 : pl.at(t).k;
    if (!hook || k <= 0) return;
    const f0 = p.fade;
    p.fade = f0 * k;
    hook.call(pl.act, p, C, pl.clock(t), st);
    p.fade = f0;
  } };
};
