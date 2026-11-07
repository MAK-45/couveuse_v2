// The time every animation of the creature shares: how far along an animation is, how present it is, and how what
// it changes goes back to rest. Pure helpers, nothing is drawn here.
//
// An animation lasts a whole number of the blob's loops (its length T). prog() is its progress: 0 during the
// lead-in, 1 after the lead-out, the lead-out never shorter than a drop of light lives, so its first and last frames
// are the rest's. An animation in three parts (an entry from rest, a loop, an exit back to rest) has an intensity k
// instead: 0 at rest, 1 in full; settle() draws its modifiers back to rest by k, the same way for every animation, and
// the drawing it adds fades with k (the painter's fade, dithered).
import { seg, ease } from "../../core/index.js";

const E = ease.inOutSine;
/** How long a drop of light lives (s): every lead-out outlasts it, so the drops on a last frame fell from the body at rest. */
export const DROP_LIFE = 1.7;
/** Counts that drive motion are whole numbers. */
export const whole = (v, lo = 1) => Math.max(lo, Math.round(v));
/** x wrapped into 0..1. */
export const wrap = (x) => ((x % 1) + 1) % 1;
/** Where the lead-out starts, as a part of the length T. */
export const leadOut = (o, T) => 1 - Math.max(o.lead, Math.min(0.45, DROP_LIFE / T));
/** An animation's progress at t (periodic over its length T): 0 in the lead-in (o.lead of T), 1 after the lead-out. */
export const prog = (o, t, T) => seg(wrap(t / T), o.lead, leadOut(o, T));
/** How present something is over a progress a: 0 at both ends, rising over the first r and dying over the last r. */
export const presence = (a, r) => (a <= 0 || a >= 1 ? 0 : E(seg(a, 0, r)) * (1 - E(seg(a, 1 - r, 1))));

/** The modifiers that go back to rest by an amount, and their value at rest. The others (poses, happy eyes) switch. */
export const NEUTRAL = Object.freeze({ dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, grow: 1, shut: 0, halo: 1, glow: 0, lookX: 0, lookY: 0, eyeScale: 1, armUp: 0, armOpen: 0, hold: 0, reachK: 0 });
/** Modifiers m drawn toward rest by k (1: as they are, 0: nothing left). Happy eyes switch on past 0.6, a reached point stays. */
export function settle(m, k) {
  const out = {};
  if (!(k > 0)) return out;
  for (const key in NEUTRAL) if (key in m) out[key] = NEUTRAL[key] + (m[key] - NEUTRAL[key]) * k;
  if (m.happy && k > 0.6) out.happy = m.happy;
  if (m.reach) out.reach = m.reach;
  return out;
}

/**
 * The timetable of one part of a three-part animation, in seconds over its length T (a whole number of the blob's
 * loops): the intensity k (no wrapping: before the part it is what came before, after it what comes next), and, when
 * the body must change pose (a figure sitting down...), a melt into light around the moment the pose switches.
 *   part "enter": rest -> in full. k is 0 until the pose has switched, then rises, and is 1 for the last DROP_LIFE.
 *   part "exit":  in full -> rest. k falls, the pose switches back once k is 0, and the last DROP_LIFE is rest.
 * melt: 0..1 (1 exactly while the pose switches, so nothing of either pose shows), swap: the activity's pose is on,
 * s: 0..1 how far the melt has gone from the pose at rest to the activity's (for where the light gathers).
 */
export function phases(part, T, lead = 0.08, pose = false, meltLen = 1.1) {
  const L = pose ? Math.min(meltLen, T * 0.4) : 0, a0 = Math.max(0.12, lead * T), full = T - DROP_LIFE;
  if (part === "enter") {
    const m0 = a0, m1 = a0 + L / 2, m2 = a0 + L, r0 = pose ? m1 : a0, r1 = Math.max(r0 + 0.3, full);
    return (t) => ({ k: t <= r0 ? 0 : t >= r1 ? 1 : E((t - r0) / (r1 - r0)), melt: pose ? meltAt(t, m0, m2) : 0, swap: !pose || t >= m1, s: pose ? E(seg(t, m0, m2)) : 1 });
  }
  // exit: k falls over [f0, f1]; the pose switches back at f1 (k = 0 there), the melt around it; rest after
  const n2 = Math.max(0.6, full), n1 = n2 - L / 2, f1 = pose ? n1 : n2, f0 = Math.min(Math.max(0.12, lead * T), f1 - 0.3), n0 = n2 - L;
  return (t) => ({ k: t <= f0 ? 1 : t >= f1 ? 0 : 1 - E((t - f0) / (f1 - f0)), melt: pose ? meltAt(t, n0, n2) : 0, swap: !pose || t < n1, s: pose ? 1 - E(seg(t, n0, n2)) : 0 });
}
// a melt over [a, b]: up, a plateau at exactly 1 around the middle, down
function meltAt(t, a, b) {
  if (t <= a || t >= b) return 0;
  const v = Math.sin((Math.PI * (t - a)) / (b - a)) * 1.35;
  return v >= 1 ? 1 : E(v);
}
