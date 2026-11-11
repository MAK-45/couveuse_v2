// The time every animation of the creature shares: how far along an animation is, and how what it changes goes back
// to rest. Pure helpers, nothing is drawn here.
//
// An animation lasts a whole number of the blob's loops (its length T). prog() is its progress: 0 during the
// lead-in, 1 after the lead-out, the lead-out never shorter than a drop of light lives, so its first and last frames
// are the rest's. An animation in three parts (an entry from rest, a loop, an exit back to rest) has an intensity k
// instead: 0 at rest, 1 in full; settle() draws its modifiers back to rest by k, the same way for every animation, and
// the drawing it adds fades with k (the painter's fade, dithered).
import { seg, ease } from "../../pixelfx/src/core/index.js";

const E = ease.inOutSine;
/** How long a drop of light lives (s): every lead-out outlasts it, so the drops on a last frame fell from the body at rest. */
export const DROP_LIFE = 1.7;
/** x wrapped into 0..1. */
const wrap = (x) => ((x % 1) + 1) % 1;
/** The shortest lead-in (s): a frame reads the body's speed a moment either side of it, so nothing may move sooner. */
export const LEAD_MIN = 0.12;
/** Where the lead-in ends, as a part of the length T: o.lead, never shorter than LEAD_MIN. */
export const leadIn = (o, T) => Math.max(o.lead, LEAD_MIN / T);
/** Where the lead-out starts, as a part of the length T. */
export const leadOut = (o, T) => 1 - Math.max(o.lead, Math.min(0.45, DROP_LIFE / T));
/** An animation's progress at t (periodic over its length T): 0 in the lead-in, 1 after the lead-out. */
export const prog = (o, t, T) => seg(wrap(t / T), leadIn(o, T), leadOut(o, T));

/** The modifiers that go back to rest by an amount, and their value at rest. The others (poses, happy eyes) switch. */
const NEUTRAL = Object.freeze({ dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, grow: 1, shut: 0, halo: 1, glow: 0, lookX: 0, lookY: 0, eyeScale: 1, armUp: 0, armOpen: 0, hold: 0, reachK: 0 });
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
 * loops): the intensity k (no wrapping: before the part it is what came before, after it what comes next). A pose the
 * activity needs (a figure sitting down...) is taken as far as k too.
 *   part "enter": rest -> in full. k rises after the lead-in, and is 1 for the last DROP_LIFE.
 *   part "exit":  in full -> rest. k falls, and the last DROP_LIFE is rest.
 */
export function phases(part, T, lead = 0.08) {
  const a0 = Math.max(LEAD_MIN, lead * T), full = T - DROP_LIFE;
  if (part === "enter") {
    const r1 = Math.max(a0 + 0.3, full);
    return (t) => ({ k: t <= a0 ? 0 : t >= r1 ? 1 : E((t - a0) / (r1 - a0)) });
  }
  const f1 = Math.max(0.6, full), f0 = Math.min(a0, f1 - 0.3);
  return (t) => ({ k: t <= f0 ? 1 : t >= f1 ? 0 : 1 - E((t - f0) / (f1 - f0)) });
}
