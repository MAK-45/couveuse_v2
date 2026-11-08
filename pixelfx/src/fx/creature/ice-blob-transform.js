// The blob changes shape. It keeps its stuff: the same ice-light, rim lit top-left, currents inside, a heart of
// light, halo, orbiting sparks, falling drops and motes; only the shape it pours itself into changes. Two new forms:
//   human     a human figure made for levitation (nothing rests on its feet: a tail of light, legs hanging toes down,
//             or sitting cross-legged in the air)
//   grounded  the same figure on its legs, with gravity: it takes shape in the air, a floor of ice spreads under it,
//             it falls, lands (knees bending, arms and hair swinging, a burst of light on the floor) and stands there,
//             feet planted, shifting its weight and breathing; on the way back it jumps off the floor and hangs in the
//             air while the floor goes out, then flows back into the blob. The legs are solved from the feet up (two
//             bones, the knee bending outward), the body rests on the straighter leg
// Three animations chain frame for frame:
//   transform  from the Blob né's rest: it gathers its light, shuts its eyes and flows into the new form, which opens
//              its eyes; the last frame is the new form's loop
//   live       the new form levitating, a perfect loop of `liveLoops` of the blob's loops
//   revert     from that loop, the form flows back into the blob: the last frame is the Blob né's rest
// So: rest -> transform -> live (as often as you like) -> revert -> rest.
//
// How: the body is a signed distance field. The blob's outline is one (r - rad(angle)), the figure another (a smooth
// union of round cones and ovals, posed every frame); the change blends the two fields, so the body flows from one
// shape into the other, and one pixel shader lights both like the blob's body. At the ends the blob is drawn by the
// idle's own code, so the first frame of "transform" and the last of "revert" are the idle's, pixel for pixel. The
// figure's own clock h runs on the live loop; in "transform" it is set back by the animation's length, so the last
// frame is the live loop's last frame. Everything the change adds is zero at both ends (seg, bump, ease).
import { fit, clamp, lerp, seg, bump, ease, noise2, rng, cycle, TAU, WHITE } from "../../core/index.js";
import { meta as idleMeta, blobBack, blobFront, ambient, state, shapeOf, drawEyes, drawSparks, drawDrips } from "./ice-blob-idle.js";
import { prog as progAt, leadOut } from "./ice-time.js";

export const FORMS = ["human", "grounded"];
export const MODES = ["transform", "live", "revert"];
export const STYLES = ["grow", "flash", "spiral"];
export const LEGS = ["spirit", "legs", "lotus"];
export const ARMS = ["float", "open", "down"];
export const GR_ARMS = ["relaxed", "hips", "wave"];
export const GR_LOOKS = ["ice", "line"];

export const meta = {
  name: "Ice blob transformation",
  desc: "The ice blob flows into a human figure of its ice-light (levitating, or standing on a floor of ice under gravity), lives in it as a loop and flows back to rest; all chain.",
  tags: ["creature", "blob", "transformation", "morph", "human", "gravity", "floor", "ice", "light", "loop"],
  size: [320, 200],
  origin: [160, 110],
  duration: 8,
  loop: true,
  fps: 30,
  bg: "black",
  options: {
    ...idleMeta.options,
    form: "human", mode: "transform", loops: 2, liveLoops: 2, lead: 0.08,
    // the change: its style there and back, its light, the particles, the flash, the ring, the swirl
    tfStyle: "grow", rvStyle: "grow", tfPower: 1, tfParticles: 36, tfFlash: 1, tfRing: 1, tfSpin: 1,
    // the human form: height (x the blob's size), head, shoulders, waist, what holds it in the air, its arms
    huHeight: 1, huHead: 1, huBuild: 1, huWaist: 1, huLegs: "spirit", huArms: "float",
    huArmSway: 1, huArmTurns: 1, huTailSway: 1, huTailTurns: 1, huHair: 1, huHairStrands: 4, huHairFlow: 1,
    huEyes: 1, huTilt: 0.6, huHands: 1, huDrops: 3, huHalo: 1,
    // the grounded form: the floor (how far below the blob's spot, in px), gravity, the landing, the stance and its
    // moves on the ground, the floor's look; room = the scene's bounds in the effect's pixels (the floor spans it)
    grFloor: 76, grGravity: 1, grLand: 1, grDust: 1, grStance: 1, grSway: 1, grSwayTurns: 1, grArms: "relaxed", grWaves: 3,
    grHairSway: 1, grLook: "ice", grLight: 1, grReflect: 1, grGlints: 3, room: null,
  },
};

const E = ease.inOutSine;
const whole = (v, lo = 0) => Math.max(lo, Math.round(v));
/** The live loop's length: a whole number of the blob's loops. */
export const livePeriod = (o) => o.duration * whole(o.liveLoops, 1);
/** How long the animation lasts: the live loop, or a whole number of the blob's loops. */
export const total = (o) => (o.mode === "live" ? livePeriod(o) : o.duration * whole(o.loops, 1));
// as for the actions: the lead-out outlasts a drop of light, so every drop alive on the last frame fell from the
// resting form, as on the frames it chains with
const prog = (o, t) => progAt(o, t, total(o));
// c: how far the change has gone (0 the blob, 1 the new form); h: the new form's own clock
function phaseOf(o, t) {
  if (o.mode === "live") return { c: 1, h: t };
  const a = prog(o, t);
  return o.mode === "revert" ? { c: 1 - a, h: t } : { c: a, h: t - total(o) };
}
const styleOf = (o) => (o.mode === "revert" ? o.rvStyle : o.tfStyle);
const ln = (x, y, u, s, r = 1.2) => noise2(x + Math.cos(TAU * u) * r, y + Math.sin(TAU * u) * r, s);

// ---- the grounded form: the same figure on its legs, with gravity. Its timeline in c: it takes shape in the air (the
// change, over [0, A]), a floor of ice spreads under it (FL0..FL1), it falls (F0..F1: as long as that height takes under
// gravity), lands and straightens up (F1..L1); after L1 it is its own loop. Every part is exactly neutral at c = 1,
// and on the way back (c = 1 - progress) the landing played backwards is a jump: it sinks into its knees, springs off
// and slows to a stop in the air, weightless again
const GR = { A: 0.56, FL0: 0.42, FL1: 0.58, F0: 0.62 };
const grounded = (o) => o.form === "grounded";
const roomOf = (o) => (Array.isArray(o.room) ? o.room : [-meta.origin[0], -meta.origin[1], meta.size[0] - meta.origin[0], meta.size[1] - meta.origin[1]]);
/** The change's own progress: the grounded form takes shape over the first part of c, then gravity has it. */
const formOf = (o, c) => (grounded(o) ? Math.min(1, c / GR.A) : c);
// its legs: thigh, shin, the pointed foot, the hip joints; feet planted at +-fw (a0: the hanging legs' spread)
function legsOf(o) {
  const U = o.size * o.huHeight, T1 = 0.76 * U, T2 = 0.72 * U, Lg = T1 + T2, toe = 0.17 * U, hw = 0.15 * U * o.huWaist;
  const fw = hw + U * 0.08 * o.grStance, a0 = Math.asin(clamp((fw - hw) / Lg, -0.8, 0.8));
  return { U, T1, T2, Lg, toe, hw, fw, a0 };
}
/** The floor's top edge in px below the blob's spot (a whole pixel), never above its hanging feet. */
export const floorOf = (o) => Math.round(Math.max(o.grFloor, o.size * o.huHeight * 2.25 + 3));
// where its hips are when its hanging toes touch the floor
const contactOf = (Lw, FY) => FY - 0.02 * Lw.U - (Lw.Lg + Lw.toe) * Math.cos(Lw.a0);
function gravityAt(o, c) {
  const T = o.duration * whole(o.loops, 1), act = T * Math.max(0.05, leadOut(o, T) - o.lead), Lw = legsOf(o), FY = floorOf(o);
  // the fall lasts what that height takes under gravity, the landing a little more than half a second
  const fallH = Math.max(1, contactOf(Lw, FY) - 0.3 * Lw.U);
  let df = Math.sqrt((2 * fallH) / (520 * Math.max(0.1, o.grGravity))) / act, dl = 0.75 / act;
  const left = 0.96 - GR.F0;
  if (df + dl > left) { const k = left / (df + dl); df *= k; dl *= k; }
  const F0 = GR.F0, F1 = F0 + df, L1 = F1 + dl, q = seg(c, F0, F1), kL = seg(c, F1, L1);
  return { Lw, FY, F0, F1, L1, dl, act, q, kL,
    fl: E(seg(c, GR.FL0, GR.FL1)), // the floor
    gm: E(q), // the blob's sway, tilt and squash give way to gravity
    grav: E(seg(c, F0 - 0.03, F1 + dl * 0.3)), // arms and hair, from floating to hanging
    gl: E(kL), // its moves on the ground
    lift: c < F1 ? q * q : (1 - seg(c, F1, F1 + dl * 0.22)) ** 2, // the air of the fall in its arms
    // its hair: a fall is weightless, so it floats on until the landing, lifted a little by the air, and falls then
    hairUp: c < F1 ? q : (1 - seg(c, F1, F1 + dl * 0.16)) ** 2, hairGrav: c < F1 ? 0 : E(seg(c, F1, F1 + dl * 0.35)),
    kick: Math.sin(3 * Math.PI * kL) * (1 - kL) ** 2, // the swing after the landing
    crouch: 6.75 * kL * (1 - kL) ** 2 * 0.32 * Lw.U * o.grLand, // its knees take the landing
    plant: c >= F1, flat: E(seg(c, F1, F1 + dl * 0.18)),
    shut: 0.6 * bump(c, F1 - 0.005, F1 + dl * 0.4), wide: bump(c, F0 - 0.04, F1), look: bump(c, GR.FL0, F1 + 0.02) };
}

// ---- the change, as a function of c: how much of the field is the figure (kb), how far each part has grown out
// (g), the light (glow, boost, white), the eyes (shut), the blob's squash and size, and the moments for the bursts
const G0 = { torso: 0, head: 0, arms: 0, legs: 0, hair: 0 }, G1 = { torso: 1, head: 1, arms: 1, legs: 1, hair: 1 };
function chore(o, c, style) {
  const out = { kb: 0, g: G0, glow: 0, white: 0, shut: 0, sx: 1, sy: 1, scale: 1, rot: 0, front: null, flash: 0, ring: 0, done: 0.62, tings: null };
  if (c <= 0) return out;
  if (c >= 1) return { ...out, kb: 1, g: G1 };
  const P = o.tfPower;
  if (style === "flash") {
    // it curls into a ball of light, spins, turns white; the new form comes out of the flash and cools down
    const gather = E(seg(c, 0.04, 0.3)), kb = E(seg(c, 0.34, 0.4)), gg = E(seg(c, 0.35, 0.42));
    return { ...out, kb, g: { torso: gg, head: gg, arms: gg, legs: gg, hair: ease.outCubic(seg(c, 0.4, 0.62)) },
      scale: 1 - 0.42 * gather + 0.42 * ease.outBack(seg(c, 0.37, 0.56), 1.5), rot: TAU * whole(o.tfSpin) * ease.inCubic(seg(c, 0.06, 0.37)),
      white: seg(c, 0.22, 0.34) * (1 - E(seg(c, 0.44, 0.74))), flash: bump(c, 0.32, 0.52) * o.tfFlash,
      glow: P * seg(c, 0.04, 0.32) * (1 - E(seg(c, 0.5, 0.9))), shut: seg(c, 0.04, 0.14) * (1 - seg(c, 0.74, 0.84)), ring: seg(c, 0.36, 0.68), done: 0.38 };
  }
  if (style === "spiral") {
    // ribbons of light wind up around it from below; under them the body is already the new form
    const fr = E(seg(c, 0.16, 0.76));
    return { ...out, kb: fr, g: G1, front: fr, glow: P * 0.7 * seg(c, 0.02, 0.18) * (1 - E(seg(c, 0.72, 0.95))),
      shut: seg(c, 0.03, 0.12) * (1 - seg(c, 0.78, 0.88)), ring: seg(c, 0.74, 0.94), done: 0.76 };
  }
  // grow: it squashes, springs up, and the parts flow out of it one after the other
  const wind = E(seg(c, 0.02, 0.2)) * (1 - ease.inQuad(seg(c, 0.2, 0.3))), pop = bump(c, 0.2, 0.44);
  return { ...out, kb: E(seg(c, 0.22, 0.38)),
    g: { torso: E(seg(c, 0.24, 0.46)), legs: ease.outCubic(seg(c, 0.3, 0.58)), head: ease.outBack(seg(c, 0.34, 0.54), 1.8),
      arms: ease.outBack(seg(c, 0.42, 0.64), 1.5), hair: ease.outCubic(seg(c, 0.5, 0.74)) },
    sx: 1 + 0.14 * wind - 0.1 * pop, sy: 1 - 0.2 * wind + 0.22 * pop,
    glow: P * 0.8 * seg(c, 0.04, 0.36) * (1 - E(seg(c, 0.64, 0.94))), shut: seg(c, 0.04, 0.12) * (1 - seg(c, 0.72, 0.82)),
    ring: seg(c, 0.6, 0.86), done: 0.62, tings: { head: 0.54, arms: 0.64, legs: 0.58 } };
}
// what the change lays over the blob while it is still a blob (neutral outside the change)
function modsOf(o) {
  const style = styleOf(o);
  return (tt) => {
    const c = formOf(o, phaseOf(o, tt).c);
    if (c <= 0 || c >= 1) return {};
    const ch = chore(o, c, style);
    return { sx: ch.sx, sy: ch.sy, grow: ch.scale, rot: ch.rot, glow: ch.glow + ch.white, halo: 1 + 1.4 * ch.glow, shut: ch.shut, quiet: 1 };
  };
}

// ---- distance fields: round cones and ovals, each with its own thickness (w) for the lighting
function cone(L, ax, ay, ra, bx, by, rb, k) {
  const m = Math.max(ra, rb);
  L.push({ t: 0, ax, ay, ra, bx, by, rb, k, dx: bx - ax, dy: by - ay, l2: (bx - ax) ** 2 + (by - ay) ** 2, x0: Math.min(ax, bx) - m, x1: Math.max(ax, bx) + m, y0: Math.min(ay, by) - m, y1: Math.max(ay, by) + m });
}
function oval(L, cx, cy, rx, ry, k) { L.push({ t: 1, cx, cy, rx, ry, k, r: Math.min(rx, ry), x0: cx - rx, x1: cx + rx, y0: cy - ry, y1: cy + ry }); }
let SD = 0, SW = 1;
// the field at (x, y): smooth union of the parts, nothing farther than `far`
function field(L, x, y, far) {
  let s = far + 1, w = 1;
  for (let i = 0; i < L.length; i++) {
    const q = L[i];
    if (x < q.x0 - far || x > q.x1 + far || y < q.y0 - far || y > q.y1 + far) continue;
    let d, r;
    if (q.t === 0) {
      const h = q.l2 > 0 ? clamp(((x - q.ax) * q.dx + (y - q.ay) * q.dy) / q.l2) : 0, qx = x - q.ax - q.dx * h, qy = y - q.ay - q.dy * h;
      r = q.ra + (q.rb - q.ra) * h;
      d = Math.sqrt(qx * qx + qy * qy) - r;
    } else {
      const ex = (x - q.cx) / q.rx, ey = (y - q.cy) / q.ry;
      r = q.r;
      d = (Math.sqrt(ex * ex + ey * ey) - 1) * r;
    }
    if (q.k > 0) {
      const h = clamp(0.5 + (0.5 * (s - d)) / q.k);
      s = s + (d - s) * h - q.k * h * (1 - h);
      w = w + (r - w) * h;
    } else if (d < s) { s = d; w = r; }
  }
  SD = s; SW = w;
}

// ---- the human figure, in its own pixels (y down, origin on the blob's centre), posed at clock h.
// g: how far each part has grown out of the body (0 tucked in, 1 full, a little over in a pop)
const ARM_POSE = { float: [0.5, 0.95, 0.3], open: [1.2, 1.5, 0.15], down: [0.16, 0.08, 0.02] };
// what another tab can ask of its arms (angles of the upper arm, forearm and hand, 0 = straight down, > 0 outward):
// both raised over its head, spread wide, holding something before its chest; and one arm reaching for a point
const ARM_UP = [2.62, 2.86, 2.95], ARM_WIDE = [1.42, 1.56, 1.62], ARM_HOLD = [0.3, -1.95, -2.1];
function posed(a1, a2, a3, sd, x0, y0, Q) {
  if (!Q) return [a1, a2, a3];
  const to = (k, b) => { if (k > 0) { a1 = lerp(a1, b[0], k); a2 = lerp(a2, b[1], k); a3 = lerp(a3, b[2], k); } };
  to(Q.open, ARM_WIDE); to(Q.up, ARM_UP); to(Q.hold, ARM_HOLD);
  if (Q.rk > 0 && Q.rsd === sd) { const a = Math.atan2(sd * (Q.reach[0] - x0), Q.reach[1] - y0); to(Q.rk, [a - 0.14, a + 0.06, a + 0.1]); }
  return [a1, a2, a3];
}
const BOTTOM = { spirit: 1.92, legs: 1.98, lotus: 0.85 };
const bottomOf = (o) => (grounded(o) ? 2.02 : BOTTOM[o.huLegs]);
function human(o, st, h, P, g, Q = null) {
  const U = o.size * o.huHeight, u = st.u, v = (((h / P) % 1) + 1) % 1, L = [], J = U * 0.08;
  const bw = o.huBuild, ww = o.huWaist, gt = clamp(g.torso, 0, 1.2);
  // the torso from a squat lump to its height: positions pulled toward the lump's centre, radii swollen
  const ty = (y) => lerp(-0.15 * U, y, lerp(0.3, 1, gt)), tr = (r) => r * lerp(1.75, 1, clamp(gt));
  const vxk = clamp(st.vx / 30, -1, 1), vyk = clamp(st.vy / 40, -1, 1);
  const shY = ty(-0.68 * U), shX = 0.4 * U * bw * lerp(0.6, 1, clamp(gt));
  const chest = ty(-0.5 * U), waist = ty(0.02 * U), hips = ty(0.3 * U);
  cone(L, -shX * 0.8, shY + 0.02 * U, tr(0.15 * U), shX * 0.8, shY + 0.02 * U, tr(0.15 * U), J);
  for (const sd of [1, -1]) oval(L, sd * shX * 0.92, shY + 0.04 * U, tr(0.13 * U) * bw, tr(0.12 * U), J * 0.8);
  cone(L, 0, chest, tr(0.33 * U * bw), 0, waist, tr(0.2 * U * ww), J);
  cone(L, 0, waist, tr(0.2 * U * ww), 0, hips, tr(0.26 * U * ww), J);
  // neck and head: the head rises out of the shoulders
  const gh = Math.max(0, g.head), hr = o.huHead * lerp(0.45, 1, clamp(gh));
  const neck = ty(-0.8 * U), hx = U * 0.035 * Math.sin(TAU * v + 1) - vxk * U * 0.02, hy = neck - 0.47 * U * gh + U * 0.015 * Math.sin(TAU * u * 2);
  const head = { x: hx, y: hy, rx: 0.36 * U * hr, ry: 0.41 * U * hr };
  if (gh > 0.02) {
    cone(L, 0, neck + 0.08 * U, 0.12 * U, hx * 0.6, hy + head.ry * 0.55, 0.1 * U * hr, J * 0.8);
    oval(L, hx, hy, head.rx, head.ry, J * 0.7);
  }
  // arms: they float, drifting slowly, the hands trailing when it rises or sinks
  const ga = Math.max(0, g.arms), ap = ARM_POSE[o.huArms] || ARM_POSE.float, nA = whole(o.huArmTurns, 1), hands = [];
  if (ga > 0.02) for (const sd of [1, -1]) {
    const ph = sd > 0 ? 0 : 0.37, sw = o.huArmSway * 0.13, w1 = Math.sin(TAU * (v * nA + ph)), w2 = Math.sin(TAU * (v * nA + ph) - 0.9);
    const x0 = sd * shX, y0 = shY, rs = lerp(0.6, 1, clamp(ga)), b2 = ap[1] + sw * w2 * 1.2 + vyk * 0.16 - sd * vxk * 0.1;
    const [a1, a2, a3] = posed(ap[0] + sw * w1 + vyk * 0.1 - sd * vxk * 0.06, b2, b2 + ap[2] + sw * w2 * 0.6, sd, x0, y0, Q);
    const x1 = x0 + sd * Math.sin(a1) * 0.58 * U * ga, y1 = y0 + Math.cos(a1) * 0.58 * U * ga;
    const x2 = x1 + sd * Math.sin(a2) * 0.5 * U * ga, y2 = y1 + Math.cos(a2) * 0.5 * U * ga;
    const x3 = x2 + sd * Math.sin(a3) * 0.2 * U * ga, y3 = y2 + Math.cos(a3) * 0.2 * U * ga;
    cone(L, x0, y0, 0.105 * U * rs, x1, y1, 0.08 * U * rs, J * 0.6);
    cone(L, x1, y1, 0.08 * U * rs, x2, y2, 0.052 * U * rs, J * 0.5);
    cone(L, x2 + (x3 - x2) * 0.15, y2 + (y3 - y2) * 0.15, 0.06 * U * rs, x3, y3, 0.05 * U * rs, J * 0.3);
    hands.push([(x2 + x3) / 2, (y2 + y3) / 2]);
  }
  // what keeps it in the air: a tail of light, legs hanging toes down, or sitting cross-legged
  const gl = Math.max(0, g.legs), nT = whole(o.huTailTurns, 1), tsw = o.huTailSway, tips = [];
  if (o.huLegs === "legs") {
    // legs apart, hanging toes down; one straight, the other bent at the knee, its foot tucked by the other's ankle
    if (gl > 0.02) for (const sd of [1, -1]) {
      const bent = sd < 0, sw = 0.05 * tsw * Math.sin(TAU * u * nT + (bent ? 1.4 : 0)) - vxk * 0.08;
      const hx0 = sd * 0.15 * U * ww, hy0 = hips + 0.02 * U, rs = lerp(0.6, 1, clamp(gl));
      const a1 = (bent ? 0.16 : 0.09) + sw * sd, a2 = (bent ? -0.3 : 0.02) + sw * sd * 1.6, a3 = a2 * 0.5 + sw * sd;
      const k1 = 0.72 * U * gl, k2 = (bent ? 0.52 : 0.66) * U * gl, k3 = 0.17 * U * gl;
      const x1 = hx0 + sd * Math.sin(a1) * k1, y1 = hy0 + Math.cos(a1) * k1, x2 = x1 + sd * Math.sin(a2) * k2, y2 = y1 + Math.cos(a2) * k2;
      const x3 = x2 + sd * Math.sin(a3) * k3, y3 = y2 + Math.cos(a3) * k3;
      cone(L, hx0, hy0, 0.13 * U * rs, x1, y1, 0.085 * U * rs, J * 0.45);
      cone(L, x1, y1, 0.08 * U * rs, x2, y2, 0.048 * U * rs, J * 0.3);
      cone(L, x2, y2, 0.05 * U * rs, x3, y3, 0.026 * U * rs, J * 0.2);
      tips.push([x3, y3]);
    }
  } else if (o.huLegs === "lotus") {
    if (gl > 0.02) for (const sd of [1, -1]) {
      const bob = 0.03 * U * tsw * Math.sin(TAU * u * nT + (sd > 0 ? 0 : 1.7)), rs = lerp(0.6, 1, clamp(gl));
      const hx0 = sd * 0.14 * U * ww, hy0 = hips, kx = hx0 + sd * 0.58 * U * gl, ky = hy0 + (0.2 * U + bob) * gl;
      const ax = lerp(hx0, -sd * 0.16 * U, gl), ay = hy0 + (0.36 * U + bob * 0.5) * gl;
      cone(L, hx0, hy0, 0.16 * U * rs, kx, ky, 0.12 * U * rs, J * 0.7);
      cone(L, kx, ky, 0.115 * U * rs, ax, ay, 0.07 * U * rs, J * 0.5);
      oval(L, ax - sd * 0.06 * U * gl, ay + 0.02 * U, 0.1 * U * rs, 0.055 * U * rs, J * 0.3);
      tips.push([kx, ky + 0.1 * U], [ax, ay + 0.05 * U]);
    }
  } else if (gl > 0.02) {
    // a tail of light that waves, slower at the root, flicking at the tip, lagging behind its moves
    const ys = [0.3, 0.78, 1.22, 1.6, 1.92], rs = [0.26 * ww, 0.2, 0.135, 0.07, 0.03];
    let px = 0, py = hips;
    for (let i = 1; i < ys.length; i++) {
      const f = i / 4;
      const x = U * (0.22 * tsw * f ** 1.4 * Math.sin(TAU * u * nT - i * 0.8) + 0.05 * tsw * f * Math.sin(TAU * u * nT * 3 - i * 1.3) - 0.14 * vxk * f);
      const y = hips + (ys[i] - 0.3) * U * gl;
      cone(L, px, py, rs[i - 1] * U * (i === 1 ? 1 : lerp(1.4, 1, clamp(gl))), x, y, rs[i] * U * lerp(1.6, 1, clamp(gl)), J);
      px = x; py = y;
    }
    tips.push([px, py]);
  }
  // hair of light, weightless, behind the body: a cap over the crown, and long locks that frame the face, fall past
  // the shoulders and float out and up at the tips, waving like weed in water
  const gH = Math.max(0, g.hair), n = whole(o.huHairStrands), Lh = U * 0.29 * o.huHair * gH, nH = whole(o.huTailTurns, 1), Hl = [];
  if (n && Lh > 0.6 && gh > 0.3) {
    const gs = lerp(0.5, 1, clamp(gH)) * hr;
    oval(Hl, hx, hy - head.ry * 0.1, head.rx * lerp(1, 1.13, clamp(gH)), head.ry * lerp(0.95, 1.02, clamp(gH)), 0);
    for (let j = 0; j < n; j++) {
      const sd = j % 2 ? -1 : 1, kq = Math.floor(j / 2), phi = -Math.PI / 2 + sd * (0.95 + 0.32 * kq);
      let x = hx + Math.cos(phi) * head.rx * 0.92, y = hy + Math.sin(phi) * head.ry * 0.92, th = Math.PI / 2 - sd * (0.08 + 0.14 * kq);
      const R = [0.13, 0.12, 0.1, 0.078, 0.052, 0.026].map((r) => r * U * gs * (1 - 0.12 * kq));
      for (let i = 1; i <= 5; i++) {
        th += -sd * (0.1 + 0.04 * kq) * (i > 2 ? 1.6 : 0.4) + 0.3 * o.huHairFlow * Math.sin(TAU * u * nH + kq * 1.7 + (sd > 0 ? 0 : 2.2) - i * 0.8) * (i / 5) + vxk * 0.12 * (i / 5);
        const len = Lh * (1 - 0.06 * i) * (1 - 0.1 * kq), nx = x + Math.cos(th) * len, ny = y + Math.sin(th) * len;
        cone(Hl, x, y, R[i - 1], nx, ny, R[i], J * 0.5);
        x = nx; y = ny;
      }
    }
  }
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const q of [...L, ...Hl]) { x0 = Math.min(x0, q.x0); x1 = Math.max(x1, q.x1); y0 = Math.min(y0, q.y0); y1 = Math.max(y1, q.y1); }
  const heart = [-0.05 * U + Math.cos(TAU * u) * 0.03 * U, chest + 0.06 * U + Math.sin(TAU * u * 2) * 0.02 * U];
  return { L, Hl, U, head, hands, tips, heart, chest, hips, box: [x0, y0, x1, y1] };
}

// ---- the grounded figure, in its own pixels (y down, origin a hip-height above its hips), posed at clock h. X: what
// gravity does to it (from grounding()): gm, grav, lift, kick, crouch, the hips' shift sx and the pelvis' tip pel, and
// once it stands, its ankles planted on the floor (feet), the soles flat (flat) and the floor's line (fy)
function armsOn(o, sd, U, x0, y0, hips, u) {
  // the pose on the ground, as the angles of the upper arm, forearm and hand (0 = straight down, > 0 outward)
  if (o.grArms === "hips") {
    // fists on the hips, elbows out: two bones from the shoulder to the hip, the elbow out
    const hx = sd * (0.27 * U * o.huWaist + 0.06 * U), hy = hips - 0.06 * U, [ex, ey] = ik(x0, y0, hx, hy, 0.58 * U, 0.5 * U, sd, 1);
    const a1 = Math.atan2(sd * (ex - x0), ey - y0), a2 = Math.atan2(sd * (hx - ex), hy - ey);
    return [a1, a2, a2 - 1.25];
  }
  if (o.grArms === "wave" && sd > 0) { const w = 0.26 * Math.sin(TAU * u * whole(o.grWaves, 1)); return [1.95, 2.8 + w, 2.92 + w * 1.3]; }
  return [0.2, 0.1, 0.16];
}
// two bones from (ax, ay) to (bx, by): the joint, pushed out on side sd (k: how much of the bend shows from the front)
function ik(ax, ay, bx, by, l1, l2, sd, k) {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1e-6, nx = dx / d, ny = dy / d;
  if (d >= l1 + l2) return [ax + nx * l1, ay + ny * l1, 0];
  const a = (d * d + l1 * l1 - l2 * l2) / (2 * d), hg = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  return [ax + nx * a + sd * ny * hg * k, ay + ny * a - sd * nx * hg * k, hg / l1];
}
function stander(o, st, h, P, g, X) {
  const Lw = legsOf(o), U = Lw.U, u = st.u, v = (((h / P) % 1) + 1) % 1, L = [], J = U * 0.08;
  const bw = o.huBuild, ww = o.huWaist, gt = clamp(g.torso, 0, 1.2), air = 1 - X.gm, gv = X.grav;
  const ty = (y) => lerp(-0.15 * U, y, lerp(0.3, 1, gt)), tr = (r) => r * lerp(1.75, 1, clamp(gt));
  const vxk = clamp(st.vx / 30, -1, 1) * air, vyk = clamp(st.vy / 40, -1, 1) * air, ws = TAU * u * whole(o.grSwayTurns, 1);
  // on the ground the breath lifts its chest, its shoulders lean against the hips' shift and tip the other way from
  // the pelvis, and the landing hunches it a little
  const br = 0.016 * U * o.breath * Math.sin(TAU * u * whole(o.breathTurns)) * gv, lean = -0.4 * X.sx, hunch = X.crouch * 0.3, shT = X.pel * 0.5;
  const shY = ty(-0.68 * U) - br + hunch, shX = 0.4 * U * bw * lerp(0.6, 1, clamp(gt));
  const chest = ty(-0.5 * U) - br * 0.6 + hunch * 0.8, waist = ty(0.02 * U) + hunch * 0.3, hips = ty(0.3 * U);
  cone(L, -shX * 0.8 + lean, shY + 0.02 * U - shT, tr(0.15 * U), shX * 0.8 + lean, shY + 0.02 * U + shT, tr(0.15 * U), J);
  for (const sd of [1, -1]) oval(L, sd * shX * 0.92 + lean, shY + 0.04 * U + sd * shT, tr(0.13 * U) * bw, tr(0.12 * U), J * 0.8);
  cone(L, lean * 0.8, chest, tr(0.33 * U * bw), lean * 0.3, waist, tr(0.2 * U * ww), J);
  cone(L, lean * 0.3, waist, tr(0.2 * U * ww), 0, hips, tr(0.26 * U * ww), J);
  // neck and head: it sways a little behind the body, dips when it lands
  const gh = Math.max(0, g.head), hr = o.huHead * lerp(0.45, 1, clamp(gh)), neck = ty(-0.8 * U) - br + hunch;
  const hx = lean * 1.25 + air * U * 0.035 * Math.sin(TAU * v + 1) - vxk * U * 0.02 + gv * U * 0.022 * Math.sin(ws - 0.7) * o.grSway;
  const hy = neck - 0.47 * U * gh + air * U * 0.015 * Math.sin(TAU * u * 2) + hunch * 0.4;
  const head = { x: hx, y: hy, rx: 0.36 * U * hr, ry: 0.41 * U * hr };
  if (gh > 0.02) {
    cone(L, lean, neck + 0.08 * U, 0.12 * U, hx * 0.6 + lean * 0.4, hy + head.ry * 0.55, 0.1 * U * hr, J * 0.8);
    oval(L, hx, hy, head.rx, head.ry, J * 0.7);
  }
  // arms: floating while it floats, then hanging (or the pose asked for); the fall's air lifts them, the landing swings them
  const ga = Math.max(0, g.arms), ap = ARM_POSE.float, nA = whole(o.huArmTurns, 1), hands = [];
  if (ga > 0.02) for (const sd of [1, -1]) {
    const x0 = sd * shX + lean, y0 = shY + sd * shT, rs = lerp(0.6, 1, clamp(ga));
    const ph = sd > 0 ? 0 : 0.37, sw = o.huArmSway * 0.13, w1 = Math.sin(TAU * (v * nA + ph)), w2 = Math.sin(TAU * (v * nA + ph) - 0.9);
    const f1 = ap[0] + sw * w1 + vyk * 0.1 - sd * vxk * 0.06, f2 = ap[1] + sw * w2 * 1.2 + vyk * 0.16 - sd * vxk * 0.1, f3 = f2 + ap[2] + sw * w2 * 0.6;
    const [p1, p2, p3] = armsOn(o, sd, U, x0, y0, hips, u), swing = -sd * 0.07 * o.grSway * Math.sin(ws - 0.9) * X.gl;
    const [a1, a2, a3] = posed(lerp(f1, p1 + swing, gv) + X.lift * 0.8 + X.kick * 0.3, lerp(f2, p2 + swing * 1.4, gv) + X.lift * 1.2 + X.kick * 0.55, lerp(f3, p3 + swing * 1.4, gv) + X.lift * 0.5 + X.kick * 0.45, sd, x0, y0, X.Q);
    const x1 = x0 + sd * Math.sin(a1) * 0.58 * U * ga, y1 = y0 + Math.cos(a1) * 0.58 * U * ga;
    const x2 = x1 + sd * Math.sin(a2) * 0.5 * U * ga, y2 = y1 + Math.cos(a2) * 0.5 * U * ga;
    const x3 = x2 + sd * Math.sin(a3) * 0.2 * U * ga, y3 = y2 + Math.cos(a3) * 0.2 * U * ga;
    cone(L, x0, y0, 0.105 * U * rs, x1, y1, 0.08 * U * rs, J * 0.6);
    cone(L, x1, y1, 0.08 * U * rs, x2, y2, 0.052 * U * rs, J * 0.5);
    cone(L, x2 + (x3 - x2) * 0.15, y2 + (y3 - y2) * 0.15, 0.06 * U * rs, x3, y3, 0.05 * U * rs, J * 0.3);
    hands.push([(x2 + x3) / 2, (y2 + y3) / 2]);
  }
  // legs: hanging toes down while it floats; once it stands, from the planted feet up (two bones, the knee comes
  // toward us, so from the front it only shows a little outward and a little bigger)
  // (another tab may bend its upper body over its hips: everything drawn so far turns round them)
  const iUp = L.length;
  const gl = Math.max(0, g.legs), nT = whole(o.huTailTurns, 1), tsw = o.huTailSway, tips = [];
  if (gl > 0.02) for (const sd of [1, -1]) {
    const rs = lerp(0.6, 1, clamp(gl)), hjx = sd * Lw.hw, hjy = hips + 0.02 * U - sd * X.pel, T1 = Lw.T1 * gl, T2 = Lw.T2 * gl, fi = sd > 0 ? 0 : 1;
    let ax, ay, tx, ty2;
    if (X.feet) {
      [ax, ay] = X.feet[fi];
      const px = ax + sd * Math.sin(Lw.a0) * Lw.toe, py = ay + Math.cos(Lw.a0) * Lw.toe, ff = X.step ? X.step.flat[fi] : X.flat;
      // a stepping foot leaves the floor toes first; up in the air (a jump) the legs hang, knees a little bent
      tx = lerp(px, ax + sd * 0.05 * U, ff); ty2 = X.step ? lerp(py, X.fy - 0.045 * U - X.step.up[fi], ff) : lerp(py, X.fy - 0.045 * U, X.flat);
      if (X.air > 0) {
        const a = sd * Lw.a0 * 1.7, len = (T1 + T2) * 0.88, hx = hjx + Math.sin(a) * len, hy = hjy + Math.cos(a) * len;
        ax = lerp(ax, hx, X.air); ay = lerp(ay, hy, X.air);
        tx = lerp(tx, hx + Math.sin(a) * Lw.toe * gl, X.air); ty2 = lerp(ty2, hy + Math.cos(a) * Lw.toe * gl, X.air);
      }
    } else {
      const a = sd * Lw.a0 + air * (0.05 * tsw * Math.sin(TAU * u * nT + (sd > 0 ? 0 : 1.4)) - vxk * 0.08);
      ax = hjx + Math.sin(a) * (T1 + T2); ay = hjy + Math.cos(a) * (T1 + T2);
      tx = ax + Math.sin(a) * Lw.toe * gl; ty2 = ay + Math.cos(a) * Lw.toe * gl;
    }
    let [kx, ky, bend] = ik(hjx, hjy, ax, ay, T1, T2, sd, 0.45);
    if (Math.hypot(ax - hjx, ay - hjy) > T1 + T2) {
      // out of reach: the foot leaves the floor
      const d = Math.hypot(ax - hjx, ay - hjy), k = (T1 + T2) / d, nx = hjx + (ax - hjx) * k, ny = hjy + (ay - hjy) * k;
      tx += nx - ax; ty2 += ny - ay; ax = nx; ay = ny;
    }
    const fl = X.feet ? (X.step ? X.step.flat[fi] : X.flat) * (1 - (X.air || 0)) : 0;
    cone(L, hjx, hjy, 0.13 * U * rs, kx, ky, 0.085 * U * rs * (1 + 0.2 * bend), J * 0.45);
    cone(L, kx, ky, 0.08 * U * rs * (1 + 0.15 * bend), ax, ay, 0.048 * U * rs, J * 0.3);
    cone(L, ax, ay, 0.05 * U * rs, tx, ty2, lerp(0.026, 0.04, fl) * U * rs, J * 0.2);
    if (fl > 0) oval(L, tx - sd * 0.01 * U, ty2, lerp(0.03, 0.095, fl) * U, lerp(0.03, 0.045, fl) * U, J * 0.2);
    tips.push([tx, ty2]);
  }
  // hair of light: weightless while it floats (as the levitating form), then falling to its shoulders and swaying
  // behind its moves; the fall's air streams it up, the landing whips it
  const gH = Math.max(0, g.hair), n = whole(o.huHairStrands), Lh = U * 0.29 * o.huHair * gH, nH = whole(o.huTailTurns, 1), Hl = [];
  if (n && Lh > 0.6 && gh > 0.3) {
    const gs = lerp(0.5, 1, clamp(gH)) * hr;
    oval(Hl, hx, hy - head.ry * 0.1, head.rx * lerp(1, 1.13, clamp(gH)), head.ry * lerp(0.95, 1.02, clamp(gH)), 0);
    for (let j = 0; j < n; j++) {
      const sd = j % 2 ? -1 : 1, kq = Math.floor(j / 2), phi = -Math.PI / 2 + sd * (0.95 + 0.32 * kq);
      let x = hx + Math.cos(phi) * head.rx * 0.92, y = hy + Math.sin(phi) * head.ry * 0.92, thF = Math.PI / 2 - sd * (0.08 + 0.14 * kq);
      const R = [0.13, 0.12, 0.1, 0.078, 0.052, 0.026].map((r) => r * U * gs * (1 - 0.12 * kq));
      for (let i = 1; i <= 5; i++) {
        thF += -sd * (0.1 + 0.04 * kq) * (i > 2 ? 1.6 : 0.4) + 0.3 * o.huHairFlow * Math.sin(TAU * u * nH + kq * 1.7 + (sd > 0 ? 0 : 2.2) - i * 0.8) * (i / 5) + vxk * 0.12 * (i / 5);
        const thH = Math.PI / 2 - sd * (0.34 - 0.07 * i + 0.06 * kq) + 0.1 * o.grHairSway * (i / 5) * (Math.sin(ws - 1.3 - i * 0.45) * o.grSway + 0.4 * Math.sin(TAU * u * nH * 2 + kq * 1.7 + (sd > 0 ? 0 : 2.2) - i * 0.7));
        const th = lerp(thF - sd * 0.45 * X.hairUp * (i / 5), thH, X.hairGrav) + sd * X.kick * 0.55 * (i / 5);
        const len = Lh * (1 - 0.06 * i) * (1 - 0.1 * kq), nx = x + Math.cos(th) * len, ny = y + Math.sin(th) * len;
        cone(Hl, x, y, R[i - 1], nx, ny, R[i], J * 0.5);
        x = nx; y = ny;
      }
    }
  }
  let heart = [-0.05 * U + Math.cos(TAU * u) * 0.03 * U + lean * 0.6, chest + 0.06 * U + Math.sin(TAU * u * 2) * 0.02 * U], hd = head;
  if (X.lean) {
    const tn = turner(X.lean, 0, hips);
    turnParts(L, 0, iUp, tn); turnParts(Hl, 0, Hl.length, tn);
    const [nx, ny] = tn(head.x, head.y);
    hd = { ...head, x: nx, y: ny }; heart = tn(...heart);
    for (let i = 0; i < hands.length; i++) hands[i] = tn(...hands[i]);
  }
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const q of [...L, ...Hl]) { x0 = Math.min(x0, q.x0); x1 = Math.max(x1, q.x1); y0 = Math.min(y0, q.y0); y1 = Math.max(y1, q.y1); }
  return { L, Hl, U, head: hd, hands, tips, heart, chest, hips, box: [x0, y0, x1, y1] };
}
// a figure facing us seen as it turns away: everything but its head (and hair) drawn closer to its middle, by q
function narrow(fg, q) {
  const hd = fg.head;
  for (const p of fg.L) {
    if (p.t === 1 && p.cx === hd.x && p.cy === hd.y) continue;
    if (p.t === 0) {
      const ax = p.ax * q, bx = p.bx * q, mm = Math.max(p.ra, p.rb);
      Object.assign(p, { ax, bx, dx: bx - ax, l2: (bx - ax) ** 2 + p.dy ** 2, x0: Math.min(ax, bx) - mm, x1: Math.max(ax, bx) + mm });
    } else { const cx = p.cx * q; Object.assign(p, { cx, x0: cx - p.rx, x1: cx + p.rx }); }
  }
  fg.hands = fg.hands.map(([x, y]) => [x * q, y]); fg.tips = fg.tips.map(([x, y]) => [x * q, y]); fg.heart = [fg.heart[0] * q, fg.heart[1]];
  return fg;
}
// a whole figure carried into another space: tf maps its points, k scales its radii
function moveFig(fg, tf, k) {
  for (const Ls of [fg.L, fg.Al, fg.Fl, fg.Hl]) if (Ls) for (const q of Ls) {
    if (q.t === 0) {
      const [ax, ay] = tf(q.ax, q.ay), [bx, by] = tf(q.bx, q.by), ra = q.ra * k, rb = q.rb * k, mm = Math.max(ra, rb);
      Object.assign(q, { ax, ay, bx, by, ra, rb, k: q.k * k, dx: bx - ax, dy: by - ay, l2: (bx - ax) ** 2 + (by - ay) ** 2, x0: Math.min(ax, bx) - mm, x1: Math.max(ax, bx) + mm, y0: Math.min(ay, by) - mm, y1: Math.max(ay, by) + mm });
    } else {
      const [cx, cy] = tf(q.cx, q.cy), rx = q.rx * k, ry = q.ry * k;
      Object.assign(q, { cx, cy, rx, ry, r: Math.min(rx, ry), k: q.k * k, x0: cx - rx, x1: cx + rx, y0: cy - ry, y1: cy + ry });
    }
  }
  const [hx, hy] = tf(fg.head.x, fg.head.y);
  fg.head = { ...fg.head, x: hx, y: hy, rx: fg.head.rx * k, ry: fg.head.ry * k };
  fg.hands = fg.hands.map(([x, y]) => tf(x, y)); fg.tips = fg.tips.map(([x, y]) => tf(x, y)); fg.heart = tf(...fg.heart);
  fg.chest = tf(0, fg.chest)[1]; fg.hips = tf(0, fg.hips)[1];
  const a = tf(fg.box[0], fg.box[1]), b = tf(fg.box[2], fg.box[3]);
  fg.box = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
  fg.U *= k;
  return fg;
}
// turning parts of a figure round a point (a lean over the hips)
const turner = (a, px, py) => { const c = Math.cos(a), s = Math.sin(a); return (x, y) => [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c]; };
function turnParts(L, i0, i1, tn) {
  for (let i = i0; i < i1; i++) {
    const q = L[i];
    if (q.t === 0) {
      const [ax, ay] = tn(q.ax, q.ay), [bx, by] = tn(q.bx, q.by), m = Math.max(q.ra, q.rb);
      Object.assign(q, { ax, ay, bx, by, dx: bx - ax, dy: by - ay, l2: (bx - ax) ** 2 + (by - ay) ** 2, x0: Math.min(ax, bx) - m, x1: Math.max(ax, bx) + m, y0: Math.min(ay, by) - m, y1: Math.max(ay, by) + m });
    } else {
      const [cx, cy] = tn(q.cx, q.cy);
      Object.assign(q, { cx, cy, x0: cx - q.rx, x1: cx + q.rx, y0: cy - q.ry, y1: cy + q.ry });
    }
  }
}
// where gravity puts the figure: its origin (ox, oy) on the screen and what it does to the pose. xm: another tab's
// moves (its modifiers m, and how fast they carry it sideways, vx): steps along the floor, a jump, a crouch, a lean
function grounding(o, st, G, fsy, tilt, xm = null) {
  const Lw = G.Lw, U = Lw.U, hips = 0.3 * U, FY = G.FY;
  const X = { gm: G.gm, grav: G.grav, lift: G.lift, hairUp: G.hairUp, hairGrav: G.hairGrav, kick: G.kick, crouch: G.crouch, gl: G.gl, flat: G.flat, sx: 0, pel: 0, feet: null, fy: 0 };
  if (G.q <= 0) return { ox: st.x, oy: st.y, X };
  const cs = Math.cos(tilt), sn = Math.sin(tilt), cY = contactOf(Lw, FY);
  if (!G.plant) {
    // falling, faster and faster, from where it floats to where its toes touch the floor
    const rx = lerp(st.x - sn * hips * fsy, 0, G.gm), ry = lerp(st.y + cs * hips * fsy, cY, G.q * G.q);
    return { ox: rx + sn * hips * fsy, oy: ry - cs * hips * fsy, X };
  }
  // standing: the hips shift over one foot, that side of the pelvis up, and the straighter leg holds it up; the
  // landing first sinks it into its knees
  const sx = o.grSway * 0.1 * U * Math.sin(TAU * st.u * whole(o.grSwayTurns, 1)) * G.gl, pel = sx * 0.3, Ls = 0.985 * Lw.Lg;
  const aY = FY - lerp(Lw.toe * Math.cos(Lw.a0), 0.07 * U, G.flat);
  const W = xm ? walking(Lw, xm) : null, wx = W ? W.wx : 0, fR = W ? W.feet[0] : 0, fL = W ? W.feet[1] : 0, uR = W ? W.up[0] : 0, uL = W ? W.up[1] : 0;
  // (ax: another tab moves the whole of it along the floor, feet and all)
  const ax = xm ? xm.m.ax || 0 : 0;
  let sup = -Infinity;
  for (const sd of [1, -1]) { const dx = sd * (Lw.fw - Lw.hw) - sx + ((sd > 0 ? fR : fL) - wx); sup = Math.max(sup, FY - 0.09 * U + sd * pel - Math.sqrt(Math.max(0, Ls * Ls - dx * dx)) - (sd > 0 ? uR : uL) * 2.5); }
  const ox = sx + wx + ax, oy = lerp(cY, sup, G.gl) + G.crouch - hips + (W ? W.rise : 0);
  Object.assign(X, { sx, pel, feet: [[Lw.fw + fR + ax - ox, aY - uR - oy], [-Lw.fw + fL + ax - ox, aY - uL - oy]], fy: FY - oy });
  if (W) Object.assign(X, { step: W.step, air: W.air, lean: W.lean, crouch: X.crouch + W.squat });
  return { ox, oy, X };
}
// another tab's moves for the figure on its legs. Sideways (dx): within a little it only shifts its weight over its
// feet, farther the feet step after it, the leading foot first (each foot swings during its half of a stride, so the
// steps are a function of where it is: a pure function of time, and none at rest). Up (dy < 0): it rises off the
// floor, a jump, the legs leaving it and hanging. Down (dy > 0) and squashed (sy < 1): it bends its knees. A turn (rot)
// leans its upper body over its hips while it stands, and flips the whole of it in the air (in build()).
function walking(Lw, xm) {
  const m = xm.m, U = Lw.U, L = 0.62 * U, dz = 0.2 * U, d = m.dx, ad = Math.abs(d), c = ad > dz ? (Math.sign(d) * (ad - dz)) / L : 0;
  const mv = clamp(Math.abs(xm.vx) / (1.2 * U)), fr = (q) => q - Math.floor(q), S = (q) => Math.floor(q) + E(clamp(fr(q) * 2));
  const swing = (q) => (fr(q) < 0.5 ? Math.sin(Math.PI * clamp(fr(q) * 2)) : 0), sR = swing(c), sL = swing(c - 0.5);
  // a foot only lifts while it is going somewhere: stopped mid-stride, it simply lands where it is
  const up = [0.17 * U * sR * mv, 0.17 * U * sL * mv];
  const lift = Math.max(0, -m.dy), maxC = 0.42 * Lw.Lg, squat = maxC * Math.tanh((Math.max(0, m.dy) + Math.max(0, 1 - m.sy) * U * 1.3) / maxC);
  const air = E(clamp((lift - 0.06 * U) / (0.42 * U))), wrapPi = (a) => a - TAU * Math.round(a / TAU);
  const lean = clamp(wrapPi(m.rot), -0.55, 0.55) * (1 - air) + clamp(xm.vx / 160, -0.18, 0.18);
  return { wx: d, feet: [L * S(c), L * S(c - 0.5)], up, step: { up, flat: [1 - 0.75 * sR * mv, 1 - 0.75 * sL * mv] }, rise: squat - lift, squat, air, lean };
}

// ---- walking and running, seen from the side. Another tab asks for it with m.gait = { kind: "walk" | "run", ph: the
// stride's phase (0..1: the near foot lands at 0, the far one at 0.5), cyc: the same, unwrapped (strides so far), S: the
// stride (px), v: the speed (m/s, for how it moves), rate: strides a second, dir: 1 to the right / -1 to the left, and its
// settings (arms, lean, bounce, heel, knee, hair, prints, sparks; 1 = as it comes). The figure turns side on and moves as
// a person does. Its feet roll: walking, the heel strikes (toes up), the foot lowers flat, the heel lifts and the toes push
// off; running, it lands on the ball of the foot, the heel touches down and lifts again. While a foot is down it goes back
// at exactly the stride's speed (S a stride), so a world going by at that speed keeps it planted. Each leg on the ground
// holds the hips as high as its rolling foot and its knee allow (the knee's bend over the stance follows a person's), so
// they rise over the foot and dip as the weight passes to the other leg when walking, and give under the weight, push off
// and fly when running; where the foot lands is worked out so the hips ride smoothly from one leg to the next. The legs are
// solved from the hips down (two bones, the knee forward), the swinging foot follows a smooth path from its toe-off to its
// landing, lifted (the heel kicked up when running); the arms swing against the legs, the upper body leans into the pace,
// the head stays level, the hair streams back and bounces with every step.
export const GAITS = ["walk", "run"];
const frac = (x) => x - Math.floor(x);
const herm = (p0, m0, p1, m1, s) => { const s2 = s * s, s3 = s2 * s; return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * m0 + (3 * s2 - 2 * s3) * p1 + (s3 - s2) * m1; };
// the foot's frame turned by its pitch a (toes up > 0), y down
const pitchOf = (x, y, a) => [x * Math.cos(a) + y * Math.sin(a), -x * Math.sin(a) + y * Math.cos(a)];
// a bump from 0 to 0, flat at both ends, 1 at s = at
const bumpAt = (s, at, n = 5) => { if (s <= 0 || s >= 1) return 0; const a = n * at, b = n * (1 - at); return (s ** a * (1 - s) ** b) / (at ** a * (1 - at) ** b); };
// a smooth curve through keys [[x, y], ...] (Catmull-Rom, the ends carried on straight)
function curve(keys, x) {
  const n = keys.length;
  if (x <= keys[0][0]) return keys[0][1];
  if (x >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0;
  while (x > keys[i + 1][0]) i++;
  const [x1, y1] = keys[i], [x2, y2] = keys[i + 1], y0 = i > 0 ? keys[i - 1][1] : 2 * y1 - y2, y3 = i + 2 < n ? keys[i + 2][1] : 2 * y2 - y1;
  const x0 = i > 0 ? keys[i - 1][0] : 2 * x1 - x2, x3 = i + 2 < n ? keys[i + 2][0] : 2 * x2 - x1;
  return herm(y1, ((y2 - y0) / (x2 - x0)) * (x2 - x1), y2, ((y3 - y1) / (x3 - x1)) * (x2 - x1), (x - x1) / (x2 - x1));
}
// the foot side on (x U): the ankle above the sole, the heel behind it, the ball of the foot and the toes ahead of it, and
// the radii of the heel, the ball and the toe tip
const FOOT = { ha: 0.08, hb: 0.09, fb: 0.235, tb: 0.1, rH: 0.052, rB: 0.038, rT: 0.026 };
// how a person moves at v m/s. A leg's cycle starts as its foot lands (q = 0): it is down until beta (rolling on its heel,
// or walking on its ball, until q1, flat until q2, then the heel lifts to the pitch ato as the toes leave); knee: its
// bend while down; lift / drive: how high the swinging foot is lifted behind / carried forward (x U) and when; lean: the
// upper body (rad); arms: swing (rad), its middle, the elbow's bend and how much more it bends forward, the hand
function gaitK(W) {
  const v = Math.max(0.3, W.v || (W.kind === "run" ? 3.3 : 1.4)), set = (k) => (Number.isFinite(W[k]) ? Math.max(0, W[k]) : 1);
  if (W.kind === "run") {
    const beta = clamp(0.47 - 0.028 * v, 0.27, 0.42), b = Math.min(2, set("bounce"));
    // the knee: lands a little bent, gives under the weight, straightens to push off
    const knee = [[0, 0.3], [0.2 * beta, 0.3 + 0.32 * b], [0.45 * beta, 0.3 + 0.55 * b], [0.8 * beta, 0.28 + 0.14 * b], [beta, 0.12]];
    return { run: 1, v, beta, q1: 0.18 * beta, q2: 0.45 * beta, ahs: -0.16, ato: -1.05, knee, lift: (0.22 + 0.06 * v) * set("heel"), liftAt: 0.42,
      drive: 0.12 * set("knee"), driveAt: 0.7, lean: (0.1 + 0.03 * v) * set("lean"), armA: (0.4 + 0.05 * v) * set("arms"), armB: -0.12, elbow: 1.4, elbowF: 0.45, hand: 0.35, lag: 0.03 };
  }
  const beta = clamp(0.66 - 0.03 * v, 0.56, 0.64);
  // the knee: nearly straight as the heel strikes, gives a little as it takes the weight, straight again over the
  // foot, then folds as the heel lifts and the toes push off
  const knee = [[0, 0.07], [0.12, 0.3], [0.3, 0.1], [0.46, 0.12], [beta, 0.64]];
  return { run: 0, v, beta, q1: 0.1, q2: 0.34, ahs: 0.34, ato: -1.15, knee, lift: 0.1, liftAt: 0.26, drive: 0, driveAt: 0.6,
    lean: (0.03 + 0.02 * v) * set("lean"), armA: (0.18 + 0.14 * v) * set("arms"), armB: 0.03, elbow: 0.22, elbowF: 0.34, hand: 0.12, lag: 0.05 };
}
const prOf = (K, U, q) => 0.03 * U * Math.cos(TAU * q) * (K.run ? 0.6 : 1);
// standing still side on: the knee nearly straight
const KNEE0 = 0.06;
// what a pace between standing (0) and its own (1) makes of a value
const toward = (rest, full, k) => (k >= 1 ? full : rest + (full - rest) * k);
// one stride's geometry (cached): the rolling foot, the hips' height held by a leg down at q, where the ball lands so the
// hips ride smoothly from one leg to the next (walking: as high on the trailing leg as on the landing one when the heel
// strikes; running: as high as the foot lands as when it leaves). footAt / heldAt do the same for a step of any length
// (rho: its length as a part of the stride's, 0 a foot set down where it stands)
const SOLVED = new Map();
function gaitSolve(Lw, W) {
  const key = [W.kind, W.S, W.v, W.bounce, W.heel, W.knee, W.lean, W.arms, Lw.U, Lw.T1, Lw.T2].join();
  let sol = SOLVED.get(key);
  if (sol) return sol;
  const U = Lw.U, K = gaitK(W), S = Math.max(1, W.S || U), T1 = Lw.T1, T2 = Lw.T2, beta = K.beta;
  const ha = FOOT.ha * U, hb = FOOT.hb * U, fb = FOOT.fb * U, rH = FOOT.rH * U, rB = FOOT.rB * U;
  const dK = (k) => Math.sqrt(T1 * T1 + T2 * T2 + 2 * T1 * T2 * Math.cos(k));
  // the foot down at stance phase q, its ball on the ground at `ball` (hip-relative): the ankle (x, height above the
  // ground), pitch, toes' pitch. It rocks round the heel's round (walking, as it lands) and round the ball of the foot,
  // where the toes bend (as the heel lifts, and running as it lands): those stay where they are on the ground, so nothing
  // of it sinks into it. A shorter step (rho < 1) rolls the foot less
  const footAt = (ball, q, rho = 1) => {
    if (q < K.q1) {
      const a = rho * K.ahs * (1 - ease.outQuad(q / K.q1));
      if (K.run) { const [rx, ry] = pitchOf(fb, ha - rB, a); return { x: ball - rx, h: rB + ry, a, toe: 0 }; }
      const [rx, ry] = pitchOf(-hb, ha - rH, a);
      return { x: ball - hb - fb - rx, h: rH + ry, a, toe: a };
    }
    if (q < K.q2) return { x: ball - fb, h: ha, a: 0, toe: 0 };
    const k = (q - K.q2) / (beta - K.q2), a = rho * K.ato * (K.run ? ease.inQuad(k) : k * k * (0.55 + 0.45 * k)), [rx, ry] = pitchOf(fb, ha - rB, a);
    return { x: ball - rx, h: rB + ry, a, toe: 0 };
  };
  // how high a leg down holds the hips (its knee bends less on a shorter step; the pelvis turns: the hip of the leg ahead
  // is a little ahead, prOf, less as it slows down: sig its pace)
  const heldAt = (f, q, rho = 1, sig = 1) => { const d = dK(toward(KNEE0, curve(K.knee, q), rho)), x = f.x - prOf(K, U, q) * sig; return f.h + Math.sqrt(Math.max(0, d * d - x * x)); };
  const held = (b0, q) => heldAt(footAt(b0 - S * q, q), q);
  const gap = (b0) => (K.run ? held(b0, 0) - held(b0, beta) : held(b0, 0) - held(b0, 0.5));
  let lo = -0.5 * S, hi = 1.5 * S;
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (gap(m) > 0) lo = m; else hi = m; }
  const b0 = (lo + hi) / 2;
  sol = { K, S, b0, fb, footAt, heldAt };
  if (SOLVED.size > 40) SOLVED.clear();
  SOLVED.set(key, sol);
  return sol;
}
// ---- the line a gait follows in time. A gait at its own pace is a stride every 1 / rate seconds; one that sets off,
// slows down or stops has a pace s (0 standing still .. 1 its own) given in pieces, each eased from one pace to the next.
// From it: its cadence slows to `alpha` of its own as it stops, so its steps get shorter as well as slower; c(t) the
// strides it has done (each foot lands on whole ones, the far one half a stride later), d(t) how far it has gone (px), and
// for each moment the length of a step set down then (rho: 1 the stride's own, 0 none). While it goes at its own pace and
// a loop's clock is given (cs: its strides at t, csInv the inverse), c and d are that loop's exactly, so they join frame
// for frame; otherwise c(at) = c0 and d(at) = 0.
const ALPHA = 0.55;
export function gaitLine({ S, rate, pieces = [], alpha = ALPHA, cs = null, csInv = null, at = 0, c0 = 0 }) {
  const P = pieces.filter((q) => q.t1 > q.t0).sort((a, b) => a.t0 - b.t0), n = P.length, V = S * rate;
  const T0 = n ? P[0].t0 : 0, T1 = n ? P[n - 1].t1 : 0, sF = n ? P[0].s0 : 1, sL = n ? P[n - 1].s1 : 1;
  const cum = [0];
  for (const q of P) cum.push(cum[cum.length - 1] + ((q.s0 + q.s1) / 2) * (q.t1 - q.t0));
  const find = (t) => { let i = 0; while (i < n - 1 && t > P[i].t1) i++; return i; };
  const sAt = (t) => {
    if (!n) return 1;
    if (t <= T0) return sF;
    if (t >= T1) return sL;
    const q = P[find(t)], x = (t - q.t0) / (q.t1 - q.t0);
    return q.s0 === q.s1 ? q.s0 : q.s0 + (q.s1 - q.s0) * E(x);
  };
  // the pace summed from the first piece's start: before it and after the last the pace stays as it was
  const F = (t) => {
    if (!n) return t;
    if (t <= T0) return sF * (t - T0);
    if (t >= T1) return cum[n] + sL * (t - T1);
    const i = find(t), q = P[i], R = q.t1 - q.t0, x = (t - q.t0) / R;
    return cum[i] + q.s0 * (t - q.t0) + (q.s1 - q.s0) * R * (x / 2 - Math.sin(Math.PI * x) / (2 * Math.PI));
  };
  const Fa = F(at), ca = cs ? cs(at) : c0, da = cs ? S * cs(at) : 0, own = (t) => !!cs && sAt(t) === 1;
  const c = (t) => (own(t) ? cs(t) : ca + rate * (alpha * (t - at) + (1 - alpha) * (F(t) - Fa)));
  const d = (t) => (own(t) ? S * cs(t) : da + V * (F(t) - Fa));
  const tOf = (cc) => {
    if (cs && csInv) { const t = csInv(cc); if (own(t)) return t; }
    // c grows at least alpha * rate and at most rate a second
    let lo, hi;
    if (cc >= ca) { lo = at + (cc - ca) / rate; hi = at + (cc - ca) / (alpha * rate); } else { lo = at - (ca - cc) / (alpha * rate); hi = at - (ca - cc) / rate; }
    for (let i = 0; i < 48; i++) { const m = (lo + hi) / 2; if (c(m) < cc) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
  const rho = (t) => { const s = sAt(t); return s >= 1 ? 1 : s <= 0 ? 0 : s / (alpha + (1 - alpha) * s); };
  // how fast its pace changes (px a second, a second): it leans into a start, back as it stops
  const acc = (t) => {
    if (!n || t <= T0 || t >= T1) return 0;
    const q = P[find(t)], R = q.t1 - q.t0;
    return V * (q.s1 - q.s0) * (Math.PI / 2) * Math.sin((Math.PI * (t - q.t0)) / R) / R;
  };
  return { c, d, s: sAt, rho, acc, tOf, V, rate, S, alpha };
}
// the line of a gait at its own pace, from what it says of now (t = 0: now)
const LINES = new Map();
function lineOf(W, S) {
  if (W.line) return { L: W.line, t: W.t || 0 };
  const c0 = W.cyc ?? W.ph ?? 0, r = W.rate || 1, key = [c0, r, S].join();
  let L = LINES.get(key);
  if (!L) {
    L = { c: (t) => c0 + r * t, d: (t) => S * (c0 + r * t), s: () => 1, rho: () => 1, acc: () => 0, tOf: (cc) => (cc - c0) / r, V: S * r, rate: r, S };
    if (LINES.size > 60) LINES.clear();
    LINES.set(key, L);
  }
  return { L, t: 0 };
}
/** How far a gait has gone (px, the way it goes) at the moment it gives (the floor goes back by as much). */
export const gaitDist = (Lw, W) => { const S = gaitSolve(Lw, W).S, { L, t } = lineOf(W, S); return L.d(t); };
// the legs at that moment: for each leg (near first) its hip, knee, ankle, the foot's and the toes' pitch, whether it is
// down; the hips' height; its pace. Each foot stays where it came down on the ground (it lands ahead of the hips by as
// much as the step it takes, which the pace then gives it) while the ground goes back under it by as much as it goes:
// whatever its pace, a foot down never slides. FY: the ground (local px)
function gaitPose(Lw, W, FY) {
  const sol = gaitSolve(Lw, W), U = Lw.U, K = sol.K, T1 = Lw.T1, T2 = Lw.T2, beta = K.beta, S = sol.S, fb = sol.fb, e = 1e-4;
  const { L: Ln, t } = lineOf(W, S), c = Ln.c(t), sg = Ln.s(t);
  // a step: the foot landed at stride count cj; how long a step that was (rho) and where its ball came down (G, px along
  // the way it goes)
  const step = (cj) => { const tj = Ln.tOf(cj), rho = Ln.rho(tj); return { cj, rho, G: Ln.d(tj) + fb + (sol.b0 - fb) * rho }; };
  // that foot down at stride count cc (stance phase cc - cj), as the hips see it, and how high it holds them
  const down = (sp, cc, tc = Ln.tOf(cc)) => { const f = sol.footAt(sp.G - Ln.d(tc), cc - sp.cj, sp.rho); return { x: f.x, h: f.h, y: FY - f.h, a: f.a, toe: f.toe, tc }; };
  const heldBy = (sp, cc, tc) => { const f = down(sp, cc, tc); return sol.heldAt(f, cc - sp.cj, sp.rho, Ln.s(f.tc)); };
  const steps = [step(Math.floor(c)), step(Math.floor(c - 0.5) + 0.5)];
  // the hips: held by the leg that came down last; walking, passing from the other one to it while both are down;
  // running, in the air between the toe-off of the one and the landing of the other
  const [ld, tr] = c - steps[0].cj < 0.5 ? steps : [steps[1], steps[0]], q = c - ld.cj;
  let hipH;
  if (K.run) {
    if (q <= beta) hipH = heldBy(ld, c, t);
    else {
      const c0 = ld.cj + beta, c1 = ld.cj + 0.5, nx = step(c1), Lf = 0.5 - beta;
      const h0 = heldBy(ld, c0), h0b = heldBy(ld, c0 - e), h1 = heldBy(nx, c1), h1b = heldBy(nx, c1 + e);
      hipH = herm(h0, ((h0 - h0b) / e) * Lf, h1, ((h1b - h1) / e) * Lf, (c - c0) / Lf);
    }
  } else {
    const dbl = beta - 0.5;
    if (q >= dbl) hipH = heldBy(ld, c, t);
    else { const w = ease.inOutSine(q / dbl); hipH = heldBy(tr, c, t) * (1 - w) + heldBy(ld, c, t) * w; }
  }
  const hipY = FY - hipH, legs = [];
  for (const [side, sp] of [[1, steps[0]], [-1, steps[1]]]) {
    const qq = c - sp.cj;
    if (qq < beta) { const f = down(sp, c, t); legs.push({ side, q: qq, A: [f.x, f.y], a: f.a, toe: f.toe, down: true }); continue; }
    // in the air: from the toe-off to the next landing, a smooth path leaving and arriving at the speeds of both, lifted
    // (less for a short step, not at all for a foot set down where it was)
    const s = (qq - beta) / (1 - beta), k = 1 - beta, nx = step(sp.cj + 1), lk = Math.sqrt(clamp((nx.G - sp.G) / (0.55 * S)));
    const p0 = down(sp, sp.cj + beta - e), p0b = down(sp, sp.cj + beta - 2 * e), p1 = down(nx, nx.cj), p1b = down(nx, nx.cj + e);
    const x = herm(p0.x, ((p0.x - p0b.x) / e) * k, p1.x, ((p1b.x - p1.x) / e) * k, s);
    const y = herm(p0.y, ((p0.y - p0b.y) / e) * k, p1.y, ((p1b.y - p1.y) / e) * k, s) - (K.lift * U * bumpAt(s, K.liftAt) + K.drive * U * bumpAt(s, K.driveAt)) * lk;
    legs.push({ side, q: qq, s, A: [x, y], a: null, a0: p0.a, a1: p1.a, down: false, lk });
  }
  for (const L of legs) {
    // two bones from the hip to the ankle, the knee forward (the pelvis turns: the hip of the leg ahead is a little ahead)
    const hx = prOf(K, U, L.q) * sg, hy = hipY;
    let [ax, ay] = L.A, dx = ax - hx, dy = ay - hy, d = Math.hypot(dx, dy);
    const R = T1 + T2 - 1e-3;
    if (d > R) { ax = hx + (dx / d) * R; ay = hy + (dy / d) * R; dx = ax - hx; dy = ay - hy; d = R; L.A = [ax, ay]; }
    d = Math.max(d, Math.abs(T1 - T2) + 1e-3);
    const nx = dx / d, ny = dy / d, a = (d * d + T1 * T1 - T2 * T2) / (2 * d), hg = Math.sqrt(Math.max(0, T1 * T1 - a * a));
    L.hip = [hx, hy]; L.knee = [hx + nx * a + ny * hg, hy + ny * a - nx * hg]; L.bend = hg / T1;
    if (L.a === null) {
      // in the air the foot hangs off the shin, relaxed (toes dropped a little), turning from its toe-off pitch to its landing one
      const sx = L.A[0] - L.knee[0], sy = L.A[1] - L.knee[1], sl = Math.hypot(sx, sy) || 1, rel = Math.atan2(sx / sl, sy / sl) - 0.28;
      const w = Math.sin(Math.PI * L.s) ** 0.8 * L.lk;
      L.a = (1 - w) * (L.a0 + (L.a1 - L.a0) * L.s) + w * rel;
      // ... but as it passes over the ground the ankle lifts the toes just enough to clear it (they would scrape it)
      const fb = FOOT.fb * U, hb = FOOT.hb * U, ha = FOOT.ha * U, rH = FOOT.rH * U, rB = FOOT.rB * U, rT = FOOT.rT * U, tb = FOOT.tb * U;
      const low = (a) => { const [, h2] = pitchOf(-hb, ha - rH, a), [, b2] = pitchOf(fb, ha - rB, a), [, t2] = pitchOf(tb, rB - rT, a); return L.A[1] + Math.max(h2 + rH, b2 + rB, b2 + t2 + rT); };
      const lim = FY - 0.9 * Math.sin(Math.PI * L.s) ** 0.5 * L.lk;
      if (low(L.a) > lim) {
        let best = L.a, bv = low(L.a);
        for (let k = 1; k <= 24 && bv > lim; k++) { const a = L.a + k * 0.05, v = low(a); if (v < bv) { best = a; bv = v; } }
        L.a = best;
      }
      L.toe = L.a;
    }
  }
  return { hipY, legs, K, sol, sg, acc: Ln.acc(t), V: Ln.V };
}
/**
 * A gait for another tab: how fast it really goes and how many strides a loop of P seconds takes, so its feet stay planted
 * on a ground going by at whole tiles (T px) a loop. Its legs are a person's (hips to soles = 0.92 m): speed (km/h) and
 * stride (x a person's at that speed) become { tiles, N strides, S px a stride, v m/s, kmh, rate strides a second }.
 */
export function gaitPlan(o, kind, P, T, kmh, stride = 1) {
  const f = withForm(o), Lw = legsOf(f), pxm = (Lw.Lg + FOOT.ha * Lw.U) / 0.92;
  const tiles = Math.max(1, Math.round(((Math.max(0.5, kmh) / 3.6) * pxm * P) / Math.max(1, T))), vpx = (tiles * T) / P, v = vpx / pxm;
  // a person's cadence at that speed (strides a second)
  const f0 = kind === "run" ? (2.67 + 0.145 * (v - 3)) / 2 : (1.58 + 0.56 * (v - 1)) / 2, N = Math.max(1, Math.round((clamp(f0, 0.45, 2) / Math.max(0.5, stride)) * P));
  return { tiles, N, S: (vpx * P) / N, v, kmh: v * 3.6, rate: N / P, vpx };
}
/** A gait going somewhere (no loop to fit): the speed asked (km/h) and a person's cadence at it, { S, v, kmh, rate, vpx }. */
export function gaitFree(o, kind, kmh, stride = 1) {
  const f = withForm(o), Lw = legsOf(f), pxm = (Lw.Lg + FOOT.ha * Lw.U) / 0.92, v = Math.max(0.5, kmh) / 3.6, vpx = v * pxm;
  const f0 = kind === "run" ? (2.67 + 0.145 * (v - 3)) / 2 : (1.58 + 0.56 * (v - 1)) / 2, rate = clamp(f0, 0.45, 2) / Math.max(0.5, stride);
  return { S: vpx / rate, v, kmh: v * 3.6, rate, vpx };
}
// the figure side on, walking or running (W = m.gait), in local px (y down, the ground at FY): the same parts as when it
// stands, turned in profile. The near leg is part of the body (L), the near arm swings in front of it (Al), the far arm
// and leg behind it (Fl, drawn darker), the hair behind the head (Hl)
function strider(o, st, h, P, W, FY) {
  const Lw = legsOf(o), U = Lw.U, J = U * 0.08, bw = o.huBuild, ww = o.huWaist, dir = W.dir < 0 ? -1 : 1, ph = frac(W.ph || 0), u = st.u;
  const pose = gaitPose(Lw, W, FY), K = pose.K, L = [], Al = [], Fl = [], Hl = [], hands = [], tips = [];
  const X = (x) => dir * x, cn = (Ls, ax, ay, ra, bx, by, rb, k) => cone(Ls, X(ax), ay, ra, X(bx), by, rb, k), ov = (Ls, cx, cy, rx, ry, k) => oval(Ls, X(cx), cy, rx, ry, k);
  const hy = pose.hipY, psi = frac(2 * ph), sg = pose.sg, pxm = (Lw.Lg + FOOT.ha * U) / 0.92;
  // the upper body leans into the pace (a little more as each push starts, running), turned round the hips; as it sets
  // off it leans into the start, as it stops it leans back (sg: its pace, 0 standing still .. 1 its own)
  const lean = toward(0, K.lean + (K.run ? 0.03 * Math.cos(TAU * (psi - 0.15)) : 0.01 * Math.cos(TAU * psi)), sg) + clamp((0.8 * pose.acc) / pxm / 9.8, -0.18, 0.22);
  const up = turner(lean, 0, hy), T = (x, y) => up(x * U, hy + y * U), br = 0.012 * o.breath * Math.sin(TAU * u * whole(o.breathTurns));
  const [pvx, pvy] = T(-0.04, -0.03), [blx, bly] = T(-0.01, -0.16), [wsx, wsy] = T(0.01, -0.4), [chx, chy] = T(0.045, -0.74 - br), [shx, shy] = T(-0.02, -0.93 - br);
  ov(L, pvx, pvy, 0.21 * U * ww, 0.2 * U, J);
  cn(L, blx, bly, 0.2 * U * ww, wsx, wsy, 0.165 * U * ww, J);
  cn(L, wsx, wsy, 0.165 * U * ww, chx, chy, 0.25 * U * bw, J);
  ov(L, shx, shy, 0.17 * U * bw, 0.14 * U, J * 0.8);
  // neck and head; the head stays level (it does not follow the lean) and rides a little behind the body's bounce
  const hr = o.huHead, [nkx, nky] = T(0.05, -1.04 - br), [nhx, nhy] = T(0.085, -1.2 - br), [hcx, hcy] = T(0.1, -1.56 - br);
  const head = { x: X(hcx), y: hcy, rx: 0.37 * U * hr, ry: 0.41 * U * hr };
  cn(L, nkx, nky, 0.11 * U, nhx, nhy, 0.095 * U, J * 0.8);
  oval(L, head.x, head.y, head.rx, head.ry, J * 0.7);
  // legs: the near one with the body, the far one behind it; thigh, shin, calf, heel, sole and toes
  for (const lg of pose.legs) {
    const Ls = lg.side > 0 ? L : Fl, [hx, hy2] = lg.hip, [kx, ky] = lg.knee, [ax, ay] = lg.A, b = lg.bend;
    cn(Ls, hx, hy2 + 0.02 * U, 0.13 * U, kx, ky, 0.085 * U * (1 + 0.2 * b), J * 0.45);
    cn(Ls, kx, ky, 0.08 * U * (1 + 0.15 * b), ax, ay, 0.048 * U, J * 0.3);
    const sx = ax - kx, sy = ay - ky, sl = Math.hypot(sx, sy) || 1, bx = -sy / sl, by = sx / sl; // behind the shin
    cn(Ls, kx + sx * 0.14 + bx * 0.03 * U, ky + sy * 0.14 + by * 0.03 * U, 0.062 * U, kx + sx * 0.5 + bx * 0.012 * U, ky + sy * 0.5 + by * 0.012 * U, 0.044 * U, J * 0.3);
    const [h1, h2] = pitchOf(-FOOT.hb * U, (FOOT.ha - FOOT.rH) * U, lg.a), [b1, b2] = pitchOf(FOOT.fb * U, (FOOT.ha - FOOT.rB) * U, lg.a), [t1, t2] = pitchOf(FOOT.tb * U, (FOOT.rB - FOOT.rT) * U, lg.toe);
    cn(Ls, ax, ay, 0.056 * U, ax + h1, ay + h2, FOOT.rH * U, J * 0.2);
    cn(Ls, ax + h1, ay + h2, FOOT.rH * U, ax + b1, ay + b2, FOOT.rB * U, J * 0.2);
    cn(Ls, ax + b1, ay + b2, FOOT.rB * U, ax + b1 + t1, ay + b2 + t2, FOOT.rT * U, J * 0.15);
    tips.push([X(ax + b1 + t1), ay + b2 + t2]);
  }
  // arms: swinging against the legs (the near arm with the far leg), the elbow bending as the arm comes forward; bent
  // at the elbow and pumping when running, the hands loose fists
  const [sx0, sy0] = T(-0.03, -0.93 - br);
  for (const side of [1, -1]) {
    const Ls = side > 0 ? Al : Fl, aph = side > 0 ? ph : ph + 0.5, c = Math.cos(TAU * (aph - K.lag)), fw = (1 - c) / 2;
    const a1 = (K.armB - K.armA * c) * sg + lean * 0.6, a2 = a1 + toward(0.12, K.elbow, sg) + K.elbowF * fw * sg, a3 = a2 + toward(0.1, K.hand, sg);
    const ex = sx0 + Math.sin(a1) * 0.58 * U, ey = sy0 + Math.cos(a1) * 0.58 * U, wx = ex + Math.sin(a2) * 0.5 * U, wy = ey + Math.cos(a2) * 0.5 * U;
    const hx2 = wx + Math.sin(a3) * 0.2 * U, hy3 = wy + Math.cos(a3) * 0.2 * U;
    cn(Ls, sx0, sy0, 0.1 * U, ex, ey, 0.076 * U, J * 0.6);
    cn(Ls, ex, ey, 0.076 * U, wx, wy, 0.05 * U, J * 0.5);
    if (K.run) ov(Ls, (wx + hx2) / 2, (wy + hy3) / 2, 0.065 * U, 0.06 * U, J * 0.3);
    else cn(Ls, wx + (hx2 - wx) * 0.15, wy + (hy3 - wy) * 0.15, 0.058 * U, hx2, hy3, 0.046 * U, J * 0.3);
    hands.push([X((wx + hx2) / 2), (wy + hy3) / 2]);
  }
  // hair of light behind the head: a cap, and locks from the back of the head that fall to the shoulders, stream back
  // with the speed and bounce with every step (lagging behind the body's rise and fall, more toward the tips)
  const n = whole(o.huHairStrands), Lh = U * 0.29 * o.huHair, wind = clamp((K.v * sg - 0.6) / 5.5) * (0.6 + 0.4 * clamp(W.hair ?? 1, 0, 2)), hs = 0.22 * clamp(W.hair ?? 1, 0, 3) * (K.run ? 1.4 : 1) * sg;
  if (n && Lh > 0.6) {
    oval(Hl, X(hcx - 0.06 * U), hcy - 0.05 * U, head.rx * 1.08, head.ry * 1.03, 0);
    for (let j = 0; j < n; j++) {
      const kq = Math.floor(j / 2), f = n > 1 ? j / (n - 1) : 0.5, rho = -1.72 - 1.55 * f;
      let x = hcx + Math.cos(rho) * head.rx * 0.92, y = hcy + Math.sin(rho) * head.ry * 0.92, th = rho - Math.PI / 2 + TAU;
      const R = [0.13, 0.12, 0.1, 0.078, 0.052, 0.026].map((r) => r * U * hr * (1 - 0.08 * kq));
      for (let i = 1; i <= 5; i++) {
        const k = i / 5, aim = Math.PI / 2 + wind * (Math.PI / 2) * (0.25 + 0.75 * k);
        th += (aim - th) * 0.42 - hs * k * Math.sin(TAU * (2 * ph - 0.12 - 0.07 * i) + j * 0.6) + 0.06 * o.huHairFlow * k * Math.sin(TAU * u * whole(o.huTailTurns, 1) + j * 1.7 - i * 0.8);
        const len = Lh * (1 - 0.06 * i) * (1 - 0.08 * kq), nx = x + Math.cos(th) * len, ny = y + Math.sin(th) * len;
        cn(Hl, x, y, R[i - 1], nx, ny, R[i], J * 0.5);
        x = nx; y = ny;
      }
    }
  }
  const [hx0, hy0] = T(0.06, -0.62 - br);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const q of [...L, ...Al, ...Fl, ...Hl]) { x0 = Math.min(x0, q.x0); x1 = Math.max(x1, q.x1); y0 = Math.min(y0, q.y0); y1 = Math.max(y1, q.y1); }
  return { L, Al, Fl, Hl, U, head, hands, tips, heart: [X(hx0), hy0], chest: chy, hips: hy, box: [x0, y0, x1, y1], side: dir, pose };
}

// ---- one frame: the change, the blob's state, the figure and the field over the pixels it covers.
// drawBack and draw are called one after the other with the same (t, o): keep the last one
let memo = null;
function frameAt(o, t) {
  if (memo && memo.o === o && memo.t === t) return memo.F;
  const F = build(o, t);
  memo = { o, t, F };
  return F;
}
// ext: another tab drawing the creature in its new form ({ M: its modifiers, st: the state they give, h: the figure's
// clock }): the change is done (c = 1) and the modifiers move, squash, turn, light and pose the figure itself. Every
// one of them is exactly neutral at rest (x * 1, x + 0), so at rest it is the "live" loop pixel for pixel
function build(o, t, ext = null) {
  const P = livePeriod(o), ph = ext ? { c: 1, h: ext.h } : phaseOf(o, t), style = ext ? "grow" : styleOf(o), cf = formOf(o, ph.c), ch = chore(o, cf, style), M = ext ? ext.M : modsOf(o);
  const st = ext ? ext.st : state(o, t, M), S = o.size, G = grounded(o) ? gravityAt(o, ph.c) : null;
  const F = { ph, cf, ch, st, M, style, P, G, ext: !!ext, blob: ch.kb <= 0 };
  if (F.blob) return F;
  const m = st.m, k = ext ? ch.kb * (1 - m.morph) : ch.kb, spiral = ch.front !== null;
  // the figure's own squash: a little of the idle's breath and bounce, and the change's size
  const bsx = st.sx / (m.sx * m.grow), bsy = st.sy / (m.sy * m.grow);
  let fsx = (1 + (bsx - 1) * 0.3) * ch.scale, fsy = (1 + (bsy - 1) * 0.3) * ch.scale, tilt = (st.tilt - m.rot) * o.huTilt, ox = st.x, oy = st.y, X = null;
  // another tab's squash, size and turn (the change's own are undone above: they were the blob's)
  if (ext && !G) { fsx *= m.grow * (1 + (m.sx - 1) * 0.6); fsy *= m.grow * (1 + (m.sy - 1) * 0.6); tilt += m.rot; }
  // another tab may change its pose for a while: its legs (lotus...) and arms (down...), or, on the floor, sit down
  // cross-legged on it (seat)
  const fo = ext && (m.legs || m.arms) ? { ...o, huLegs: m.legs || o.huLegs, huArms: m.arms || o.huArms } : o, seat = !!(ext && G && m.seat > 0.5);
  // walking or running (m.gait, on its legs): it turns side on and works out its own pose, on the spot (the world goes by).
  // m.turn (0 facing us .. 1 side on) while it turns to set off or after it has stopped: the figure facing us and the one
  // side on are both posed and their fields blend, so it turns as one body, never melting nor jumping (at 0 it is the
  // figure facing us exactly, at 1 the one side on)
  const gaitM = ext && G && !seat && m.gait ? m.gait : null, tw = gaitM ? (m.turn == null ? 1 : clamp(m.turn)) : 0;
  const gait = tw >= 1 ? gaitM : null, turning = tw > 0 && tw < 1;
  if (seat) {
    const g = m.grow;
    fsx = g; fsy = g; tilt = clamp(m.rot, -0.5, 0.5); ox = m.dx + m.ax; oy = G.FY - (BOTTOM.lotus + 0.06) * G.Lw.U * g;
  } else if (gait) {
    // (on the spot, the world going by, or carried along the floor by ax as it goes)
    fsx = ch.scale; fsy = ch.scale; tilt = 0; ox = m.ax; oy = 0;
    X = { gm: 1, grav: 1, lift: 0, hairUp: 0, hairGrav: 1, kick: 0, crouch: 0, gl: 1, flat: 1, sx: 0, pel: 0, feet: null, fy: G.FY, gait };
  } else if (G) {
    // gravity takes over from the blob's float: no more sway, tilt or squash; it falls and stands
    fsx = lerp(fsx, ch.scale, G.gm); fsy = lerp(fsy, ch.scale, G.gm); tilt *= 1 - G.gm;
    ({ ox, oy, X } = grounding(o, st, G, fsy, tilt, ext ? { m, vx: ext.vx } : null));
    if (ext) {
      // its size round the floor under it (it stays standing on it), round its middle up in the air; there a turn is a flip
      const g = m.grow;
      if (g !== 1) { const ay = lerp(G.FY, oy, X.air); oy = ay + (oy - ay) * g; fsx *= g; fsy *= g; }
      tilt += (m.rot - TAU * Math.round(m.rot / TAU)) * X.air;
    }
  }
  // a pose another tab changes under a melt into light (m.anchor = [x, y] of the frame, [x, y] of the middle, see
  // ice-blob-loops.js): the frame gathers to that point as it melts, so neither the pose it leaves nor the one it takes
  // shows while it switches (at morph 1 nothing of the figure is left)
  if (ext && G && m.anchor && m.morph > 0) { ox = lerp(ox, m.anchor[0], m.morph); oy = lerp(oy, m.anchor[1], m.morph); }
  // its arms, as another tab asks (raised, spread, holding, one reaching for a point given in the scene)
  let Q = null;
  if (ext && (m.armUp > 0 || m.armOpen > 0 || m.hold > 0 || (m.reach && m.reachK > 0))) {
    Q = { up: m.armUp || 0, open: m.armOpen || 0, hold: m.hold || 0, rk: 0 };
    if (m.reach && m.reachK > 0) {
      const ex = m.reach[0] - ox, ey = m.reach[1] - oy, c0 = Math.cos(tilt), s0 = Math.sin(tilt), rx = (ex * c0 + ey * s0) / fsx, ry = (-ex * s0 + ey * c0) / fsy;
      Object.assign(Q, { rk: m.reachK, reach: [rx, ry], rsd: m.reachSide || (rx >= 0 ? 1 : -1) });
    }
    if (X) X.Q = Q;
  }
  let fig = gait ? strider(o, st, ph.h, P, gait, G.FY) : G && !seat ? stander(o, st, ph.h, P, ch.g, X) : human(seat ? { ...fo, huLegs: "lotus" } : fo, st, ph.h, P, ch.g, Q);
  // turning: the figure side on too, brought into the space of the one facing us (both stand upright on the floor; its frame
  // is at (ax, 0)), and what the drawing needs of the figure (head, hands, feet, heart) taken between the two
  let figB = null, turnWx = null;
  if (turning) {
    // (seen turning away, its shoulders, hips, arms and feet come closer together, as a body's width does, not its head:
    // by half way they are where the figure side on has them, so the two bodies blend into one)
    narrow(fig, 1 - 0.62 * E(clamp(tw / 0.55)));
    figB = strider(o, st, ph.h, P, gaitM, G.FY);
    const kx = 1 / fsx, ky = 1 / fsy;
    moveFig(figB, (x, y) => [(x + m.ax - ox) * kx, (y - oy) * ky], Math.min(kx, ky));
    const mx = (a, b) => [lerp(a[0], b[0], tw), lerp(a[1], b[1], tw)];
    turnWx = lerp(ox - X.sx, m.ax, tw);
    fig = { ...fig, Al: figB.Al, Fl: figB.Fl, side: figB.side, turnK: tw, B: figB,
      head: { x: lerp(fig.head.x, figB.head.x, tw), y: lerp(fig.head.y, figB.head.y, tw), rx: lerp(fig.head.rx, figB.head.rx, tw), ry: lerp(fig.head.ry, figB.head.ry, tw) },
      hands: fig.hands.map((h, i) => mx(h, figB.hands[i] || h)), tips: fig.tips.map((q, i) => mx(q, figB.tips[i] || q)), heart: mx(fig.heart, figB.heart),
      chest: lerp(fig.chest, figB.chest, tw), hips: lerp(fig.hips, figB.hips, tw),
      box: [Math.min(fig.box[0], figB.box[0]), Math.min(fig.box[1], figB.box[1]), Math.max(fig.box[2], figB.box[2]), Math.max(fig.box[3], figB.box[3])] };
    // (past half way it stands on the floor as the figure side on does: its prints, the floor's glints)
    if (tw >= 0.5) X = { gm: 1, grav: 1, lift: 0, hairUp: 0, hairGrav: 1, kick: 0, crouch: 0, gl: 1, flat: 1, sx: 0, pel: 0, feet: null, fy: G.FY, gait: gaitM };
  }
  const U = fig.U, cs = Math.cos(tilt), sn = Math.sin(tilt);
  const toScreen = (fx, fy) => { const x = fx * fsx, y = fy * fsy; return [ox + x * cs - y * sn, oy + x * sn + y * cs]; };
  // the blob's side (while some of it is left): where the blob is; on the floor it pours itself from the figure's
  // middle, its bottom never under the floor
  let bs = st;
  if (ext && G && k < 1) {
    let [mx, my] = toScreen(0, (fig.chest + fig.hips) / 2);
    my += Math.max(0, m.dy);
    if (m.anchor && m.morph > 0) { mx = lerp(mx, m.anchor[2], m.morph); my = lerp(my, m.anchor[3], m.morph); }
    bs = { ...st, x: mx, y: Math.min(my, G.FY - S * st.sy * 0.98), tilt: m.rot };
  }
  const cb = Math.cos(-bs.tilt), sb = Math.sin(-bs.tilt);
  Object.assign(F, { fig, U, fsx, fsy, tilt, toScreen, ox, oy, X, bs, turn: turning ? tw : null, turnWx });
  // where the field lives: the blob's reach while some of it is left, the figure's box, and the halo around them
  const hm = lerp(S * 0.55, U * 0.3, k) * Math.max(0.01, o.shell), far = hm + 2;
  let X0 = Infinity, X1 = -Infinity, Y0 = Infinity, Y1 = -Infinity;
  const grow = (x, y) => { X0 = Math.min(X0, x); X1 = Math.max(X1, x); Y0 = Math.min(Y0, y); Y1 = Math.max(Y1, y); };
  const [bx0, by0, bx1, by1] = fig.box;
  for (const [x, y] of [[bx0, by0], [bx1, by0], [bx0, by1], [bx1, by1]]) grow(...toScreen(x, y));
  const blobPart = k < 1 || spiral, rad = blobPart ? shapeOf(o, st.u, m) : null;
  if (blobPart) { const R = S * 1.9 * Math.max(bs.sx, bs.sy); grow(bs.x - R, bs.y - R); grow(bs.x + R, bs.y + R); }
  X0 = Math.floor(X0 - far - 1); Y0 = Math.floor(Y0 - far - 1); X1 = Math.ceil(X1 + far + 1); Y1 = Math.ceil(Y1 + far + 1);
  const W = X1 - X0 + 1, H = Y1 - Y0 + 1, N = W * H;
  const Gs = new Float32Array(N), Gw = new Float32Array(N), Qx = new Float32Array(N), Qy = new Float32Array(N), Gk = new Float32Array(N), Gl = spiral ? new Uint8Array(N) : null, Hs = fig.Hl.length ? new Float32Array(N).fill(99) : null;
  // side on (walking, running): the near arm in front of the body (As) and the far limbs behind it (Fs), each with its thickness
  const As = fig.Al ? new Float32Array(N).fill(99) : null, Aw = As ? new Float32Array(N).fill(1) : null, Fs = fig.Fl ? new Float32Array(N).fill(99) : null, Fw = Fs ? new Float32Array(N).fill(1) : null;
  // (as it melts into light, those limbs thin out and are gone into the body long before the body itself is light; as it
  // turns side on they grow out of it)
  const lim = (1 - k) * U * 0.6 + (figB ? (1 - tw) * U * 0.6 : 0), hlim = (1 - k) * U * 0.9, tb = E(seg(tw, 0.3, 0.75));
  const band = U * 0.45, yF = spiral ? lerp(bottomOf(o) * U + U * 0.5, fig.box[1] - U * 0.3, ch.front) : 0, fsc = Math.min(fsx, fsy);
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const px = X0 + i + 0.5, py = Y0 + j + 0.5, dx = px - bs.x, dy = py - bs.y, n = j * W + i, ex = px - ox, ey = py - oy;
      // the figure's side, in its own space
      const rx = (ex * cs + ey * sn) / fsx, ry = (-ex * sn + ey * cs) / fsy;
      let kk = k, s = 0, w = 1, qx = rx, qy = ry;
      if (spiral) {
        // the spiral cuts clean: the new form below the ribbons' line, the blob above it, a line of light between
        const ux = dx * cb - dy * sb, uy = dx * sb + dy * cb, bx = ux / bs.sx, by = uy / bs.sy, r = Math.hypot(bx, by), pd = (ry - yF) * fsc;
        field(fig.L, rx, ry, far / fsc);
        const below = Math.max(SD * fsc, -pd), above = Math.max(r - rad(Math.atan2(by, bx)), pd);
        kk = below <= above ? 1 : 0; s = Math.min(below, above);
        w = kk ? SW * fsc : rad(Math.atan2(by, bx)); qx = kk ? rx : bx; qy = kk ? ry : by;
        if (Hs) { field(fig.Hl, rx, ry, far / fsc); Hs[n] = Math.max(SD * fsc, -pd); }
        if (Math.abs(pd) < 1) Gl[n] = 1;
        Gs[n] = s; Gw[n] = Math.max(0.5, w); Qx[n] = qx; Qy[n] = qy; Gk[n] = kk;
        continue;
      }
      // (its hair thins away as it melts into light, and grows back as it takes shape)
      if (kk > 0) {
        field(fig.L, rx, ry, far / fsc); s = SD * fsc; w = SW * fsc;
        if (figB) { field(figB.L, rx, ry, far / fsc); s = lerp(s, SD * fsc, tb); w = lerp(w, SW * fsc, tb); }
        if (Hs && kk > 0.5) {
          field(fig.Hl, rx, ry, far / fsc); let hs = SD * fsc;
          if (figB) { field(figB.Hl, rx, ry, far / fsc); hs = lerp(hs, SD * fsc, tb); }
          Hs[n] = hs + hlim;
        }
      }
      if (As) { field(fig.Al, rx, ry, far / fsc); As[n] = SD * fsc + lim; Aw[n] = Math.max(0.5, SW * fsc); }
      if (Fs) { field(fig.Fl, rx, ry, far / fsc); Fs[n] = SD * fsc + lim; Fw[n] = Math.max(0.5, SW * fsc); }
      if (kk < 1) {
        // the blob's side, in its body space (its squash and tilt)
        const ux = dx * cb - dy * sb, uy = dx * sb + dy * cb, bx = ux / bs.sx, by = uy / bs.sy, r = Math.hypot(bx, by), e = rad(Math.atan2(by, bx));
        s = kk > 0 ? lerp(r - e, s, kk) : r - e; w = kk > 0 ? lerp(e, w, kk) : e;
        qx = lerp(bx, rx, kk); qy = lerp(by, ry, kk);
      }
      Gs[n] = s; Gw[n] = Math.max(0.5, w); Qx[n] = qx; Qy[n] = qy; Gk[n] = kk;
    }
  // where the eyes, the heart of light and the highlight are: on the blob, then on the figure's head and chest
  const ke = spiral ? clamp((fig.head.y - yF) / band + 0.5) : clamp(ch.g.head) * k, kn = spiral ? clamp((fig.heart[1] - yF) / band + 0.5) : k;
  const [hX, hY] = toScreen(fig.head.x, fig.head.y), bn = [Math.cos(TAU * st.u) * S * 0.1 - S * 0.12, Math.sin(TAU * st.u * 2) * S * 0.06 + S * 0.15];
  const bnS = [bs.x + (bn[0] * bs.sx) * Math.cos(bs.tilt) - (bn[1] * bs.sy) * Math.sin(bs.tilt), bs.y + (bn[0] * bs.sx) * Math.sin(bs.tilt) + (bn[1] * bs.sy) * Math.cos(bs.tilt)];
  const hn = toScreen(...fig.heart);
  // how much of the figure there is at a height of its own space (the spiral remakes it from below)
  const kAt = (fy) => (spiral ? clamp((fy - yF) / (U * 0.15) + 0.5) : k);
  Object.assign(F, { X0, Y0, W, H, Gs, Gw, Qx, Qy, Gk, Gl, Hs, As, Aw, Fs, Fw, hm, rad, blobPart, yF, band, ke, kn, kAt, k,
    headS: [lerp(bs.x, hX, ke), lerp(bs.y, hY, ke)], headR: lerp(S, fig.head.rx * fsc, ke),
    nucS: [lerp(bnS[0], hn[0], kn), lerp(bnS[1], hn[1], kn)], nucR: lerp(S, U * 0.6, kn) * m.grow });
  return F;
}

// ---- drawing the blended body like the blob's: 1 px rim lit top-left, ramp steps inside, currents, heart of light
function body(p, C, o, F) {
  const { X0, Y0, W, H, Gs, Gw, Qx, Qy, Gk, Gl, st, ch } = F, la = (o.lightAngle * Math.PI) / 180, lx = Math.cos(la), ly = Math.sin(la);
  // the figure's limbs are thin: on top of each limb's own roundness it is lit as one body, top-left to bottom-right,
  // so it keeps the blob's big glassy gradient; its currents are a little stronger, so the bands still show
  const Rg = 1.5 * F.U, cy0 = lerp(F.fig.head.y, F.fig.hips, 0.45), Hs = F.Hs, boost = ch.glow + (F.ext ? st.m.glow : 0), white = ch.white, u = st.u;
  // side on: the far arm and leg first, behind everything, a step darker (the hair and the body cover them)
  if (F.Fs) limbs(p, C, o, F, F.Fs, F.Fw, true, Rg, cy0, boost);
  if (Hs && white < 0.9) for (let j = 1; j < H - 1; j++)
    for (let i = 1; i < W - 1; i++) {
      const n = j * W + i, s = Hs[n];
      if (s > 0 || Gs[n] <= 0) continue;
      const px = X0 + i + 0.5, py = Y0 + j + 0.5;
      let gx = Hs[n + 1] - Hs[n - 1], gy = Hs[n + W] - Hs[n - W];
      const gl = Math.hypot(gx, gy) || 1, lit0 = (gx * lx + gy * ly) / gl;
      if (Hs[n - 1] > 0 || Hs[n + 1] > 0 || Hs[n - W] > 0 || Hs[n + W] > 0) { p.px(px, py, lit0 > 0.3 && o.rim > 0 ? C[6] : lit0 > -0.3 ? C[5] : C[3]); continue; }
      const cur = o.currents > 0 ? ln(Qx[n] * 0.14, Qy[n] * 0.05, u, o.seed + 29, 1.4) : 0.5;
      const lit = 0.3 + boost * 0.45 + white * 2 + ((Qx[n] * lx + (Qy[n] - cy0) * ly) / Rg) * 0.3 * o.rim + lit0 * 0.12 + (cur - 0.5) * 0.5 * o.currents;
      const ci = clamp(Math.round(1.5 + lit * 5), 2, 6);
      p.px(px, py, C[ci]);
    }
  const [ncx, ncy] = F.nucS, nR = F.nucR;
  for (let j = 1; j < H - 1; j++)
    for (let i = 1; i < W - 1; i++) {
      const n = j * W + i, s = Gs[n];
      if (s > 0) continue;
      const px = X0 + i + 0.5, py = Y0 + j + 0.5;
      if (Gl && Gl[n]) { p.px(px, py, WHITE); continue; }
      let gx = Gs[n + 1] - Gs[n - 1], gy = Gs[n + W] - Gs[n - W];
      const gl = Math.hypot(gx, gy) || 1;
      gx /= gl; gy /= gl;
      const d = clamp(1 + s / Gw[n]), ux = gx * d, uy = gy * d;
      if (Gs[n - 1] > 0 || Gs[n + 1] > 0 || Gs[n - W] > 0 || Gs[n + W] > 0) {
        const lit = ux * lx + uy * ly;
        p.px(px, py, white > 0.5 ? (lit > -0.25 ? WHITE : C[6]) : lit > 0.35 && o.rim > 0 ? WHITE : lit > -0.25 ? C[6] : C[4]);
        continue;
      }
      const cur = o.currents > 0 ? ln(Qx[n] * 0.09, Qy[n] * 0.09, u, o.seed + 23, 1.4) : 0.5;
      const dn = Math.hypot(px - ncx, py - ncy) / nR;
      const kk = Gk[n], own = (ux * lx + uy * ly) * lerp(0.38, 0.2, kk), whole = kk > 0 ? ((Qx[n] * lx + (Qy[n] - cy0) * ly) / Rg) * 0.34 * kk : 0;
      const lit = 0.48 + boost * 0.45 + white * 2 + (own + whole) * o.rim + (1 - d) * lerp(0.22, 0.12, kk) + (cur - 0.5) * lerp(0.32, 0.46, kk) * o.currents + Math.max(0, 0.42 - dn) * 1.3 * o.nucleus;
      const ci = clamp(Math.round(1.5 + lit * 5), 2, 7);
      p.px(px, py, ci === 7 ? WHITE : C[ci]);
    }
  // side on: the near arm last, in front of the body, outlined where it crosses it
  if (F.As) limbs(p, C, o, F, F.As, F.Aw, false, Rg, cy0, boost);
  if (o.nucleus > 0) p.glow(ncx, ncy, nR * 0.8, C[6], 0.3 * o.nucleus + 0.4 * boost);
  // highlights on the lit side of the head, and of the shoulder once it has one
  if (o.rim > 0 && white < 0.5) {
    const sl = la, hr = F.headR * st.grow, [hx, hy] = F.headS, e = hr * 0.62;
    if (st.grow > 0.35 && hr > 3) {
      p.disc(hx + Math.cos(sl) * e, hy + Math.sin(sl) * e * (F.ke > 0.5 ? 1.15 : 1), Math.max(1, hr * 0.12), WHITE, 0.85 * Math.min(1, o.rim));
      p.px(hx + Math.cos(sl) * e + Math.cos(sl + 1.7) * hr * 0.22, hy + Math.sin(sl) * e + Math.sin(sl + 1.7) * hr * 0.22, WHITE);
    }
  }
}
// a limb drawn as a layer of its own (side on): lit like the body, its rim lit top-left. far: the far arm and leg, behind
// the body, a step darker; otherwise the near arm in front of it, its shaded edge dark where it crosses the body so it
// stands out from it
function limbs(p, C, o, F, Ls, Lw2, far, Rg, cy0, boost) {
  const { X0, Y0, W, H, Gs, st } = F, la = (o.lightAngle * Math.PI) / 180, lx = Math.cos(la), ly = Math.sin(la), u = st.u;
  for (let j = 1; j < H - 1; j++)
    for (let i = 1; i < W - 1; i++) {
      const n = j * W + i, s = Ls[n];
      if (s > 0) continue;
      const px = X0 + i + 0.5, py = Y0 + j + 0.5;
      let gx = Ls[n + 1] - Ls[n - 1], gy = Ls[n + W] - Ls[n - W];
      const gl = Math.hypot(gx, gy) || 1;
      gx /= gl; gy /= gl;
      const d = clamp(1 + s / Lw2[n]), litN = gx * lx + gy * ly;
      if (Ls[n - 1] > 0 || Ls[n + 1] > 0 || Ls[n - W] > 0 || Ls[n + W] > 0) {
        if (far) p.px(px, py, litN > 0.35 && o.rim > 0 ? C[5] : litN > -0.25 ? C[4] : C[2]);
        else p.px(px, py, litN > 0.35 && o.rim > 0 ? WHITE : litN > -0.25 ? C[6] : Gs[n] <= 0 ? C[2] : C[4]);
        continue;
      }
      const qx = px - F.ox, qy = py - F.oy, cur = o.currents > 0 ? ln(qx * 0.09, qy * 0.09, u, o.seed + 23, 1.4) : 0.5;
      const lit = (far ? 0.2 : 0.5) + boost * 0.45 + ((gx * d * lx + gy * d * ly) * 0.22 + ((qx * lx + (qy - cy0) * ly) / Rg) * 0.34) * o.rim + (1 - d) * 0.12 + (cur - 0.5) * 0.46 * o.currents;
      const ci = clamp(Math.round(1.5 + lit * 5), far ? 1 : 2, far ? 4 : 7);
      p.px(px, py, ci === 7 ? WHITE : C[ci]);
    }
  if (far) return;
  // the near arm casts a thin shadow on the body beside it, on the side away from the light
  for (let j = 1; j < H - 1; j++)
    for (let i = 1; i < W - 1; i++) {
      const n = j * W + i, s = Ls[n];
      if (s <= 0 || s > 1.4 || Gs[n] > 0 || Gs[n - 1] > 0 || Gs[n + 1] > 0 || Gs[n - W] > 0 || Gs[n + W] > 0) continue;
      const gx = Ls[n + 1] - Ls[n - 1], gy = Ls[n + W] - Ls[n - W], gl = Math.hypot(gx, gy) || 1;
      if ((gx * lx + gy * ly) / gl < -0.2) p.px(X0 + i + 0.5, Y0 + j + 0.5, C[3]);
    }
}
// the halo against the skin and the aura, as for the blob, around whatever shape it has now
function aura(p, C, o, F) {
  const { X0, Y0, W, H, Gs, st, ch, hm, fig } = F, S = o.size * st.m.grow, U = F.U * ch.scale, k = F.k, m = st.m, Hh = o.halo * m.halo * m.vis * lerp(1, o.huHalo, k), xg = F.ext ? m.glow : 0;
  const [cx, cy] = F.toScreen(0, lerp(0, (fig.chest + fig.hips) / 2, k));
  p.glow(cx, cy, lerp(S * 3.2, U * 3.4, k), C[2], 0.3 * Hh);
  p.glow(cx, cy, lerp(S * 2, U * 2.2, k), C[4], 0.22 * Hh + 0.3 * (ch.glow + ch.white + xg));
  if (k > 0.3) { const [hx, hy] = F.headS; p.glow(hx, hy, U * 1.2, C[4], 0.12 * Hh * k); }
  if (o.ground > 0) {
    const gyB = o.size * o.groundDist + o.hover + Math.max(0, m.dy), gyH = bottomOf(o) * F.U + o.size * (o.groundDist - 1) * 0.5 + o.hover;
    const by = lerp(st.y, st.y + bottomOf(o) * F.U - o.size, k), G = F.G, ay = F.ext ? m.ay : 0;
    // (moved elsewhere by another tab, ay, its ground goes with it)
    let gy = lerp(gyB, gyH, k) + ay, near = clamp(1 - (gy - by) / (gy - ay + o.hover + 1) + 0.5);
    // the grounded form: its pool of light lands on the floor, brightest when its feet touch it
    if (G && G.fl > 0) { const fb = F.toScreen(0, F.fig.box[3])[1]; gy = lerp(gy, G.FY, G.fl); near = lerp(near, clamp(1 - (gy - fb) / (F.U * 2.2)), G.fl); }
    const R = lerp(S, U * 0.9, k);
    for (let i = 0; i < 3; i++) p.glow(st.x, gy, R * (1.2 - i * 0.3), C[4 + i], 0.18 * o.ground * near);
    p.shade(st.x - R * 1.6, gy - 3, st.x + R * 1.6, gy + 3, (x, y, out) => {
      const d = Math.hypot((x - st.x) / (R * (1.3 - 0.3 * near)), (y - gy) / 2.4);
      if (d > 1) return;
      out.c = 0; out.l = C[5]; out.k = (1 - d) ** 2 * 0.35 * o.ground * near;
    });
  }
  if (o.shell > 0) {
    const kk = 0.32 * o.shell + 0.4 * (ch.glow + ch.white);
    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++) {
        const q = j * W + i, s = Math.min(Gs[q], F.Hs ? F.Hs[q] : 99, F.As ? F.As[q] : 99, F.Fs ? F.Fs[q] : 99), d = s / hm;
        if (d <= 0 || d > 1) continue;
        p.light(X0 + i + 0.5, Y0 + j + 0.5, d < 0.2 ? C[6] : d < 0.5 ? C[5] : C[4], (1 - d) ** 2 * kk);
      }
  }
}
// its eyes, on the blob's face and then on the head (the blob's own eyes, blinks and looks, made to fit the head)
function eyesOf(p, C, o, F) {
  const { st, ch } = F, ke = F.ke, hr = F.headR;
  if (ch.white > 0.6) return;
  const oe = { ...o, size: hr, eyeSize: lerp(o.eyeSize, o.eyeSize * ((F.fig.head.rx * Math.min(F.fsx, F.fsy)) / o.size) * 1.35 * o.huEyes, ke),
    eyeSpacing: lerp(o.eyeSpacing, o.eyeSpacing * 1.12, ke), eyeHeight: lerp(o.eyeHeight, o.eyeHeight * 0.4 - 0.02, ke) };
  const se = { ...st, x: F.headS[0], y: F.headS[1], sx: lerp(st.sx, F.fsx, ke), sy: lerp(st.sy, F.fsy, ke), tilt: lerp(st.tilt, F.tilt, ke), m: { ...st.m, shut: Math.max(st.m.shut, ch.shut) } };
  // the grounded form looks down at the floor coming, opens its eyes wide as it falls, squints as it lands, and no
  // longer follows the blob's float
  const G = F.G;
  if (G) Object.assign(se, { vx: st.vx * (1 - G.gm), vy: st.vy * (1 - G.gm), m: { ...se.m, shut: Math.max(se.m.shut, G.shut), lookY: st.m.lookY + 0.9 * G.look, eyeScale: st.m.eyeScale * (1 + 0.22 * G.wide) } });
  if (F.fig.side) {
    // side on, its face is turned three-quarters toward the way it goes: both eyes slid forward and closer, looking ahead
    // (turning, tk of the way)
    const sd = F.fig.side, tk = F.fig.turnK ?? 1;
    Object.assign(oe, { eyeSpacing: oe.eyeSpacing * toward(1, 0.86, tk) });
    Object.assign(se, { x: se.x + sd * hr * 0.24 * tk, vx: tk >= 1 ? 0 : se.vx * (1 - tk), vy: tk >= 1 ? 0 : se.vy * (1 - tk),
      m: { ...se.m, lookX: toward(se.m.lookX, sd * 0.85 + st.m.lookX * 0.3, tk), lookY: toward(se.m.lookY, 0.1, tk) } });
    const er = toward(lerp(1, 1.05, ke), 1.02, tk);
    drawEyes(p, C, oe, se, () => hr * er);
    return;
  }
  drawEyes(p, C, oe, se, () => hr * lerp(1, 1.05, ke));
}
// drops of light falling from its lowest points (tail tip, toes), and light rising from its palms
function dropsAndHands(p, C, t, o, F) {
  const { ph, P, fig } = F, n = whole(o.huDrops) * whole(o.liveLoops, 1), T = total(o), outAt = T * leadOut(o, T);
  // a drop shows if the form was whole and at rest when it fell (the frames it chains with have the same drops)
  // (in another tab: unless that tab was busy when it fell, as for the blob's own drops)
  const shown = F.ext ? (t0) => !(F.M && (F.M(t0).quiet || 0) > 0) : (t0) => o.mode === "live" || (o.mode === "transform" ? t0 >= outAt : t0 <= T * o.lead);
  if (F.G) {
    // on the ground they drip from its fingertips, fall to the floor and splash
    const G1 = gravityAt(o, 1), FY = F.G.FY;
    if (n) cycle(ph.h, P, n, o.seed + 77, (g) => g.range(1, 1.6), (age, life, r, i) => {
      const t0 = t - age;
      if (!shown(t0)) return;
      const s0 = state(o, t0, null), { ox, oy, X } = grounding(o, s0, G1, 1, 0), f0 = stander(o, s0, ph.h - age, P, G1g, X), hd = f0.hands[i % f0.hands.length];
      if (!hd) return;
      // (from where another tab had moved it to when it fell, ax)
      const ax0 = F.ext && F.M ? F.M(t0).ax || 0 : 0;
      const x = ox + ax0 + hd[0] + Math.sin(i * 2.3) * 0.6, y0 = oy + hd[1] + 2, hit = Math.sqrt(Math.max(0, FY - 0.5 - y0) / 46);
      if (age < hit) {
        const y = y0 + age * age * 46, k = age / hit;
        p.px(x, y, k < 0.25 ? WHITE : C[6]);
        if (k > 0.3) p.px(x, y - 1, C[5]);
        p.glow(x, y, 4, C[5], 0.3);
        return;
      }
      const k = (age - hit) / 0.32;
      if (k >= 1) return;
      for (const sd of [-1, 1]) p.px(x + sd * (1 + k * 4), FY - 1 - Math.sin(Math.PI * k) * 2.5, k < 0.4 ? WHITE : C[6]);
      if (k < 0.5) p.px(x, FY - 1, WHITE);
      p.glow(x, FY, 5, C[6], 0.35 * (1 - k));
    });
  } else if (n && fig.tips.length) cycle(ph.h, P, n, o.seed + 77, (g) => g.range(0.9, 1.6), (age, life, r, i) => {
    const t0 = t - age;
    if (!shown(t0)) return;
    const s0 = state(o, t0, F.ext ? F.M : null), f0 = human(o, s0, ph.h - age, P, G1), tip = f0.tips[i % f0.tips.length];
    const c0 = Math.cos((s0.tilt) * o.huTilt), s0n = Math.sin(s0.tilt * o.huTilt);
    const bsx = 1 + (s0.sx - 1) * 0.3, bsy = 1 + (s0.sy - 1) * 0.3, x0 = tip[0] * bsx, y0 = tip[1] * bsy;
    const k = age / life, x = s0.x + x0 * c0 - y0 * s0n + Math.sin(age * 3 + i) * 0.8, y = s0.y + x0 * s0n + y0 * c0 + 2 + age * age * 22;
    if (1 - k < 0.2) return;
    p.px(x, y, k < 0.2 ? WHITE : C[6]);
    if (k < 0.5) p.px(x, y - 1, C[5]);
    p.glow(x, y, 4, C[5], 0.3 * (1 - k));
  });
  if (o.huHands > 0 && F.ch.kb > 0.01) {
    fig.hands.forEach(([hx, hy], idx) => {
      const [x, y] = F.toScreen(hx, hy), kh = F.kAt(hy) * clamp(F.ch.g.arms);
      if (kh <= 0.01) return;
      p.glow(x, y, F.U * 0.45, C[6], 0.22 * o.huHands * kh);
      p.glow(x, y, F.U * 0.2, WHITE, 0.15 * o.huHands * kh);
      cycle(ph.h, P, whole(2 * o.huHands * whole(o.liveLoops, 1)), o.seed + 131 + idx, (g) => g.range(0.8, 1.5), (age, life, r) => {
        const k = age / life, a = Math.sin(Math.PI * k);
        if (a * kh < 0.3) return;
        const mx = x + r.range(-2, 2) + Math.sin(age * r.range(2, 4)) * 1.5, my = y - 1 - age * r.range(6, 11);
        p.px(mx, my, k < 0.3 ? WHITE : C[6]);
        p.glow(mx, my, 3, C[5], 0.25 * a * kh);
      });
    });
  }
}
const G1g = { torso: 1, head: 1, arms: 1, legs: 1, hair: 1 };

// ---- the floor of the grounded form: a line of ice across the scene, lit by the figure (hard steps, fading toward
// the edges), the ice below it (faint lines nearer and nearer apart... farther apart as they come toward us), the
// figure's reflection in it, glints; it spreads from under the figure (and goes back there on the way back)
const FLOOR_LINES = [[0.2, 0.6], [0.46, 0.5], [0.8, 0.4], [1.25, 0.32], [1.85, 0.25]];
function floorFx(p, C, o, F, part = 0) {
  // part: 0 the floor and the figure's reflection, 1 only the reflection (another copy of it on the same floor)
  const G = F.G;
  if (!G || G.fl <= 0) return;
  const room = roomOf(o), FY = G.FY, U = G.Lw.U, x0 = Math.floor(room[0]), x1 = Math.ceil(room[2]) - 1, W = Math.max(1, x1 - x0 + 1);
  if (FY > room[3]) return;
  const reach = G.fl * (Math.max(-room[0], room[2]) + 6), grow = G.fl < 1, Lt = o.grLight, ice = o.grLook !== "line", y1 = Math.ceil(room[3]);
  // (lit round the figure: where it stands, or where another tab's steps or moves took it)
  const wx = F.turnWx != null ? F.turnWx : F.X && F.X.step ? F.ox - F.X.sx : F.X && F.X.gait ? F.ox : 0, lumAt = (px) => { const d = Math.abs(px - wx), edge = clamp(Math.min(px - room[0], room[2] - px) / (W * 0.14)); return Lt * (0.28 + 0.72 * Math.exp(-d / (U * 2.4))) * (0.3 + 0.7 * edge); };
  if (o.grNoFloor) {
    // on a planet's ground (another tab's world): no floor of ice to lay, only its light on the ground round its feet
    if (part) return;
    p.glow(wx, FY, U * 2.2, C[4], 0.12 * Lt * G.fl);
    if (G.plant && F.fig && !F.hidden) for (const [tx, ty] of F.fig.tips) { const [x, y] = F.toScreen(tx, ty); p.glow(x, FY, U * 0.45, C[6], 0.3 * Lt * clamp(1 - (FY - y) / (U * 0.3)) * (F.k ?? 1)); }
    return;
  }
  // the reflection: the body seen upside down in the ice, darker, in lines that thin out with depth
  const refl = o.grReflect > 0 && F.Gs && !F.hidden ? Math.round(U * 2.6 * o.grReflect) : 0;
  const sh = new Uint8Array(W);
  if (refl) {
    const { X0, Y0, W: GW, H: GH, Gs, Hs, As, Fs } = F;
    for (let d = 1; d <= refl && FY + d < y1; d++) {
      const f = d / refl;
      if (f > 0.35 && f <= 0.7 ? d % 2 : f > 0.7 ? d % 3 : 0) continue;
      const j = FY - d - Y0;
      if (j < 1 || j >= GH - 1) continue;
      for (let i = 1; i < GW - 1; i++) {
        const px = X0 + i + 0.5;
        if (Math.abs(px) > reach || px < room[0] || px > room[2]) continue;
        const n = j * GW + i, s = Math.min(Gs[n], As ? As[n] : 1), hs = Math.min(Hs ? Hs[n] : 1, Fs ? Fs[n] : 1);
        if (s > 0 && hs > 0) continue;
        const rim = s <= 0 && (Gs[n - 1] > 0 || Gs[n + 1] > 0 || Gs[n - GW] > 0 || Gs[n + GW] > 0);
        const ci = clamp((s <= 0 ? (rim ? 4 : 3) : 2) - (f > 0.5 ? 1 : 0) + (Lt > 1.4 ? 1 : 0), 1, 5);
        p.px(px, FY + d + 0.5, C[ci]);
        if (d === 1) sh[X0 + i - x0] = 1;
      }
    }
    const [hx, hy] = F.nucS;
    p.glow(hx, 2 * FY - hy, F.nucR * 0.7, C[5], 0.12 * o.grReflect * G.fl);
  }
  if (part) return;
  for (let x = x0; x <= x1; x++) {
    const px = x + 0.5, d = Math.abs(px - wx);
    if (Math.abs(px) > reach) continue;
    const lum = lumAt(px), ci = clamp(Math.round(1 + lum * 5.2), 1, 6), head = grow && reach - Math.abs(px) < 2.5;
    p.px(px, FY + 0.5, head ? WHITE : C[ci]);
    if (!sh[x - x0] && ci > 2) p.px(px, FY + 1.5, C[ci - 2]);
    // the nearer lines (lower down) catch its light wider: the floor comes toward us
    if (ice) for (const [dd, kk] of FLOOR_LINES) {
      const yy = FY + 1 + Math.round(dd * U);
      if (yy >= y1) break;
      const edge = clamp(Math.min(px - room[0], room[2] - px) / (W * 0.14)), ll = Lt * (0.28 + 0.72 * Math.exp(-d / (U * 2.4 * (1 + dd * 1.4)))) * (0.3 + 0.7 * edge);
      const cl = Math.round(ll * kk * 4.2);
      if (cl >= 1 && (cl > 1 || (x - x0 + yy) % 2 === 0)) p.px(px, yy + 0.5, C[Math.min(cl, 3)]);
    }
  }
  // its light on the floor, and under its feet once it stands on it
  p.glow(wx, FY, U * 2.2, C[4], 0.16 * Lt * G.fl);
  if (grow) p.glow(reach, FY, 5, WHITE, 0.4 * G.fl), p.glow(-reach, FY, 5, WHITE, 0.4 * G.fl);
  if (G.plant && F.fig) for (const [tx, ty] of F.fig.tips) { const [x, y] = F.toScreen(tx, ty); p.glow(x, FY, U * 0.45, C[6], 0.3 * Lt * clamp(1 - (FY - y) / (U * 0.3)) * (F.k ?? 1)); }
  // glints running on the ice (carried back with the floor while it walks or runs over it on the spot: a whole number of
  // tiles a loop; still when it walks along it). They dim as the figure melts into light, so they don't jump when it turns
  const n = whole(o.grGlints) * whole(o.liveLoops, 1), Wk = F.X && F.X.gait, Tt = Math.max(16, Math.ceil(Math.max(room[2] - room[0], room[3] - room[1])));
  const slide = Wk ? (Wk.dir < 0 ? -1 : 1) * gaitDist(G.Lw, Wk) - (F.ext ? F.st.m.ax : 0) : 0, lit = (F.ext ? 1 - (F.st.m.morph || 0) : 1) * (F.turn != null ? Math.abs(1 - 2 * F.turn) : 1);
  if (n) cycle(F.ph.h, F.P, n, o.seed + 313, (g) => g.range(0.45, 0.9), (age, life, r) => {
    const k = age / life, r0 = r.range(0, 1), x = Wk ? Math.floor(room[0] + (((r0 * Tt - slide) % Tt) + Tt) % Tt) + 0.5 : Math.floor(lerp(room[0] + 3, room[2] - 3, r0)) + 0.5, a = Math.sin(Math.PI * k) * G.fl * lit;
    if (Wk && (x < room[0] + 3 || x > room[2] - 3)) return;
    if (Math.abs(x) > reach || a < 0.3) return;
    star(p, C, x, FY + 0.5, a > 0.75 ? 2 : 1);
    p.glow(x, FY, 4, C[6], 0.35 * a * Lt);
  });
}
// walking or running: where each foot came down it leaves a print of light on the ground, carried back with the ground
// and fading; a little flash as it lands; running, light kicked up behind as the toes push off. Ages are counted in
// strides since each landing (whole strides a loop, so the prints loop with it)
function gaitFx(p, C, o, F) {
  const Wk = F.X && F.X.gait;
  if (!Wk || F.hidden || !F.G) return;
  const Lw = F.G.Lw, sol = gaitSolve(Lw, Wk), K = sol.K, U = Lw.U, FY = F.G.FY, sd = Wk.dir < 0 ? -1 : 1, S = sol.S, { L: Ln, t } = lineOf(Wk, S), c = Ln.c(t), dn = Ln.d(t);
  const N = Math.max(1, Math.round(Wk.N || 1)), pr = Math.max(0, Wk.prints ?? 1), sp = Math.max(0, Wk.sparks ?? 1), life = K.run ? 1.7 : 2.6;
  const fb = FOOT.fb * U, hb = FOOT.hb * U, tb = FOOT.tb * U, room = roomOf(o), Lt = o.grLight;
  // (ox: where another tab carries it along the floor; lit: the prints dim as it melts into light, to turn)
  const ox = F.ext ? F.st.m.ax : 0, lit = (F.ext ? 1 - (F.st.m.morph || 0) : 1) * (F.turn != null ? clamp(2 * F.turn - 1) : 1), X = (v) => ox + sd * v;
  for (const [side, off] of [[1, 0], [-1, 0.5]]) {
    for (let k = 0; k <= Math.ceil(life) + 1; k++) {
      const j = Math.floor(c - off) - k, a = c - off - j;
      if (a < 0 || a > life) continue;
      // that landing: how long a step it was (a foot set down where it stood leaves nothing) and where its ball came down
      const cj = j + off, rho = Ln.rho(Ln.tOf(cj)), w = rho * lit;
      if (w <= 0.02) continue;
      const r = rng(o.seed, 717 + (side > 0 ? 0 : 1), ((j % N) + N) % N), G = Ln.d(Ln.tOf(cj)) + fb + (sol.b0 - fb) * rho, ball = G - dn;
      // the print: the sole's length (running, mostly the ball of the foot), a dash of light on the ground
      const x0 = ball - (K.run ? fb * 0.7 : fb + hb), x1 = ball + tb * 0.8, fade = (1 - a / life) ** 1.4 * pr * w;
      if (fade > 0.06 && a > 0.04) for (let x = Math.floor(Math.min(X(x0), X(x1))); x <= Math.ceil(Math.max(X(x0), X(x1))); x++) {
        const px = x + 0.5;
        if (px < room[0] || px > room[2]) continue;
        const e = Math.abs(px - X((x0 + x1) / 2)) / ((x1 - x0) / 2 + 0.5), v = fade * (1 - 0.45 * e * e) * (0.85 + 0.3 * r.next());
        if (v < 0.12 || (v < 0.3 && (x + Math.floor(a * 7)) % 2)) continue;
        p.px(px, FY + 0.5, v > 0.75 ? C[6] : v > 0.45 ? C[5] : v > 0.25 ? C[4] : C[3]);
        if (v > 0.5) p.px(px, FY + 1.5, C[3]);
      }
      if (fade > 0.1 && a > 0.04) p.glow(X((x0 + x1) / 2), FY, U * 0.35, C[5], 0.25 * fade * Lt);
      // the landing: a short flash where it touches down, and a few grains of light springing from it
      const fl = 1 - a / 0.12;
      if (fl > 0 && pr > 0) {
        const cx = X(K.run ? ball : ball - fb - hb);
        p.glow(cx, FY, U * 0.5, C[6], 0.45 * fl * Math.min(1.5, pr) * Lt * w);
        if (w > 0.25) for (let i = 0, m = K.run ? 4 : 2; i < m; i++) {
          const g = rng(o.seed, 727, ((j % N) + N) % N, i, side > 0 ? 0 : 1), h = a / 0.12, vx = g.range(0.3, 1) * (i % 2 ? 1 : -1);
          p.px(cx + sd * vx * h * U * 0.5, FY - 0.5 - Math.sin(Math.PI * h) * U * g.range(0.08, 0.2) * w, h < 0.4 ? WHITE : C[6]);
        }
      }
      // running: light kicked up behind as the toes leave the ground, carried back and falling
      if (K.run && sp > 0) {
        const b = a - K.beta, Lk = 0.42;
        if (b > 0 && b < Lk) {
          const tOff = Ln.tOf(cj + K.beta), dOff = Ln.d(tOff), toe = G - dOff + tb;
          for (let i = 0, m = Math.round(5 * sp * w); i < m; i++) {
            const g = rng(o.seed, 737, ((j % N) + N) % N, i, side > 0 ? 0 : 1), h = b / g.range(0.6 * Lk, Lk);
            if (h >= 1) continue;
            const x = X(toe - (dn - dOff) * g.range(1.1, 1.6) - g.range(0, 0.15) * U), y = FY - 0.5 - (g.range(0.15, 0.45) * U * Math.sin(Math.PI * Math.min(1, h * 1.15)));
            p.px(x, y, h < 0.3 ? WHITE : h < 0.65 ? C[6] : C[4]);
            if (h < 0.5) p.glow(x, y, 3, C[5], 0.3 * (1 - h) * sp);
          }
        }
      }
    }
  }
}
// the landing (and the jump on the way back), in time: a ripple of light runs along the floor both ways, light
// splashes up from its feet and falls back to the floor
function landFx(p, C, t, o, F, front) {
  const G = F.G;
  if (!G || o.mode === "live" || o.grDust <= 0) return;
  const a = prog(o, t), aI = o.mode === "revert" ? 1 - G.F1 : G.F1, dur = Math.min(0.7 / G.act, 0.98 - aI), k = seg(a, aI, aI + dur);
  if (k <= 0 || k >= 1) return;
  const FY = G.FY, U = G.Lw.U, fw = G.Lw.fw, tt = k * 0.7, D = o.grDust;
  if (!front) {
    for (const sd of [-1, 1]) {
      const x = sd * (fw + ease.outCubic(k) * U * 5), al = (1 - k) * D;
      p.px(x, FY + 0.5, k < 0.5 ? WHITE : C[6]);
      for (let i = 1; i <= 4; i++) p.px(x - sd * i, FY + 0.5, i < 2 ? C[6] : C[5]);
      p.glow(x, FY, 6, C[6], 0.45 * al);
    }
    p.glow(0, FY, U * 1.8, C[6], 0.4 * (1 - k) ** 2 * D);
    return;
  }
  for (let i = 0, m = Math.round(16 * D); i < m; i++) {
    const r = rng(o.seed, 515, i), sd = i % 2 ? 1 : -1, vx = sd * r.range(12, 55), vy = -r.range(18, 70), life = r.range(0.4, 0.7);
    if (tt > life) continue;
    const x = sd * fw * r.range(0.6, 1.2) + vx * tt, y = Math.min(FY - 0.5, FY - 1 + vy * tt + 160 * tt * tt), kk = tt / life;
    p.px(x, y, kk < 0.35 ? WHITE : C[6]);
    p.glow(x, y, 3, C[5], 0.3 * (1 - kk));
  }
}

// sparks orbit the blob, and then the figure's waist
function sparksOf(p, C, o, F, front) {
  const { st, fig } = F, k = F.k, [x, y] = F.toScreen(0, lerp(0, fig.hips - 0.1 * F.U, k));
  drawSparks(p, C, { ...o, size: lerp(o.size, F.U * 0.95, k) }, { ...st, x, y }, front);
}

// ---- the change's own light: streams gathering, a ring, sparkles bursting, a flash, ribbons for the spiral
function changeFx(p, C, o, F, front) {
  const { ch, st } = F, c = F.cf, S = o.size, U = o.size * o.huHeight;
  if (c <= 0 || c >= 1) return;
  const style = F.style, cx = st.x, cy = st.y, ctr = F.toScreen ? F.toScreen(0, lerp(0, -0.3 * U, ch.kb)) : [cx, cy];
  const n = whole(o.tfParticles);
  // light gathering into it, spiralling in (out again on the way back)
  if (style !== "spiral" && front) for (let i = 0; i < n; i++) {
    const r = rng(o.seed, 707, i), a0 = r.range(0.03, 0.22), L = r.range(0.1, 0.2), k = seg(c, a0, a0 + L);
    if (k <= 0 || k >= 1) continue;
    const th0 = r.range(0, TAU), R0 = r.range(2, 3.4) * U, spin = (i % 2 ? 1 : -1) * 1.6;
    const at = (kk) => { const R = lerp(R0, S * 0.3, ease.inCubic(kk)), th = th0 + spin * kk; return [ctr[0] + Math.cos(th) * R, ctr[1] + Math.sin(th) * R * 0.8]; };
    const [x, y] = at(k), [x1, y1] = at(Math.max(0, k - 0.05)), [x2, y2] = at(Math.max(0, k - 0.1));
    p.px(x2, y2, C[4]); p.px(x1, y1, C[6]); p.px(x, y, k > 0.1 ? WHITE : C[6]);
    p.glow(x, y, 4, C[5], 0.3 * Math.sin(Math.PI * k) * o.tfPower);
  }
  // the flash: all of it turns to light for a moment
  if (ch.flash > 0.01) {
    p.glow(ctr[0], ctr[1], U * 3.6, C[6], 0.5 * ch.flash * o.tfPower);
    p.glow(ctr[0], ctr[1], U * 1.6, WHITE, 0.6 * ch.flash * o.tfPower);
  }
  if (ch.glow > 0.01 && !front) p.glow(ctr[0], ctr[1], U * 2.4, C[5], 0.25 * ch.glow);
  // a ring of light spreads around its waist when the form is done
  if (o.tfRing > 0 && ch.ring > 0 && ch.ring < 1 && F.fig) {
    const k = ch.ring, [rx0, ry0] = F.toScreen(0, lerp(F.fig.hips, F.fig.chest, 0.3)), R = U * (0.7 + 2.3 * ease.outCubic(k)), al = (1 - k) ** 1.4;
    for (let j = 0, m = Math.ceil(R * 6); j < m; j++) {
      const th = (j / m) * TAU, sy = Math.sin(th);
      if ((sy > 0) !== front) continue;
      p.dot(rx0 + Math.cos(th) * R, ry0 + sy * R * 0.28, k < 0.3 ? WHITE : C[6], al * o.tfRing);
    }
    if (front) p.glowRing(rx0, ry0, R * 0.9, 6, C[5], 0.25 * al * o.tfRing * o.tfPower);
  }
  // sparkles burst from the new body when it is whole
  if (front) for (let i = 0, m = Math.round(n * 0.7); i < m; i++) {
    const r = rng(o.seed, 808, i), c0 = ch.done + r.range(-0.02, 0.05), L = r.range(0.12, 0.26), k = seg(c, c0, c0 + L);
    if (k <= 0 || k >= 1) continue;
    const th = r.range(0, TAU), d0 = r.range(0.3, 1), d1 = d0 + r.range(0.6, 1.6) * ease.outCubic(k);
    const x = ctr[0] + Math.cos(th) * d1 * U, y = ctr[1] + Math.sin(th) * d1 * U * 1.5 - k * 6, al = 1 - k;
    if (r.chance(0.3) && k < 0.6) { star(p, C, x, y, 1 + (k < 0.3 ? 1 : 0)); p.glow(x, y, 5, C[5], 0.4 * al); }
    else { p.dot(x, y, k < 0.4 ? WHITE : C[6], al * 1.3); p.glow(x, y, 3, C[5], 0.2 * al); }
  }
  // little stars where each part finishes growing (head, hands, tail)
  if (front && ch.tings && F.fig) {
    const tg = [["head", [[F.fig.head.x, F.fig.head.y - F.fig.head.ry]]], ["arms", F.fig.hands], ["legs", F.fig.tips]];
    for (const [part, pts] of tg) {
      const k = seg(c, ch.tings[part] - 0.02, ch.tings[part] + 0.07);
      if (k <= 0 || k >= 1) continue;
      for (const [x, y] of pts) { const [sx, sy] = F.toScreen(x, y); star(p, C, sx, sy, Math.round(3 * Math.sin(Math.PI * k))); p.glow(sx, sy, 7, C[6], 0.4 * Math.sin(Math.PI * k)); }
    }
  }
  // the spiral: two ribbons wind up around it, the new form below them
  if (style === "spiral" && F.fig && c > 0.12 && c < 0.82) {
    const env = seg(c, 0.12, 0.2) * (1 - seg(c, 0.74, 0.82)), turnsU = 0.55;
    for (let rb = 0; rb < 2; rb++)
      for (let j = 0; j < 70; j++) {
        const yy = F.yF + j * U * 0.03, fade = 1 - j / 70;
        if (fade * env < 0.15) continue;
        const phi = TAU * (yy / U) * turnsU + rb * Math.PI + c * TAU * 3 * o.tfSpin, dep = Math.sin(phi);
        if ((dep > 0) !== front) continue;
        const R = U * (0.75 + 0.15 * Math.sin(yy / U * 2)), [x, y] = F.toScreen(Math.cos(phi) * R, yy + dep * U * 0.12);
        const al = fade * env * 1.4, col = j < 8 ? WHITE : j < 30 ? C[6] : C[5];
        if (al > 0.8) { p.px(x, y, col); if (j < 30) p.px(x, y + 1, j < 8 ? C[6] : C[5]); } else p.dot(x, y, col, al);
        if (j % 4 === 0) p.glow(x, y, 5, C[5], 0.2 * fade * env * o.tfPower);
      }
    if (front) for (let i = 0; i < n; i++) {
      const r = rng(o.seed, 909, i), c0 = r.range(0.16, 0.7), k = seg(c, c0, c0 + 0.08);
      if (k <= 0 || k >= 1) continue;
      const yy = lerp(F.fig.box[3] + U * 0.5, F.fig.box[1] - U * 0.3, E(seg(c0, 0.16, 0.76))), phi = r.range(0, TAU), R = U * (0.8 + k * 0.8);
      const [x, y] = F.toScreen(Math.cos(phi) * R, yy - k * U * 0.5);
      p.dot(x, y, k < 0.4 ? WHITE : C[6], 1 - k);
    }
  }
}
// a four-point twinkle
function star(p, C, x, y, n) {
  p.px(x, y, WHITE);
  for (let i = 1; i <= n; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + dx * i, y + dy * i, i === n ? C[5] : C[6]);
}

// the motes float round the figure: once it stands, round where it stands
const motesAt = (o, F) => (F.G ? [0, F.G.gm * (F.G.FY - 1.85 * F.G.Lw.U)] : [0, 0]);

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), F = frameAt(o, t);
  if (F.blob) blobBack(p, t, o, F.M, C);
  else { aura(p, C, o, F); sparksOf(p, C, o, F, false); floorFx(p, C, o, F); }
  ambient(p, t, o, false, C, motesAt(o, F));
  changeFx(p, C, o, F, false);
  landFx(p, C, t, o, F, false);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), F = frameAt(o, t);
  if (F.blob) blobFront(p, t, o, F.M, C);
  else {
    if (F.blobPart) drawDrips(p, C, t, o, F.st, F.rad, F.M);
    dropsAndHands(p, C, t, o, F);
    body(p, C, o, F);
    eyesOf(p, C, o, F);
    sparksOf(p, C, o, F, true);
  }
  ambient(p, t, o, true, C, motesAt(o, F));
  changeFx(p, C, o, F, true);
  landFx(p, C, t, o, F, true);
}

// ---- the new forms, for the other tabs. bodyBack / bodyFront / bodyAmbient replace the idle's blobBack / blobFront /
// ambient: with o.form "human" (levitating) or "grounded" (on its legs, on its floor of ice) they draw the creature in
// that form, with this tab's settings (FORM_DEFAULTS fill what a tab doesn't give); anything else is the blob. A tab
// hands over its modifiers M as for the blob: they move, squash, turn, light and pose the figure (and on the floor
// become steps, jumps, crouches and leans, see walking()), plus a few of its own for the arms (armUp, armOpen, hold,
// reach + reachK). At rest it is the "live" loop pixel for pixel, so "from rest" in a new form means from that loop.
// T is the tab's length: the figure's own clock runs on the live loop's period, so over T it is nudged (a little
// faster mid-way, never near the ends) to come back on that loop's frame (figClock).
export const FORM_DEFAULTS = Object.freeze(Object.fromEntries(Object.entries(meta.options).filter(([k]) => /^(hu|gr)[A-Z]/.test(k) || k === "liveLoops")));
export const isForm = (o) => !!o && (o.form === "human" || o.form === "grounded");
const FORMED = new WeakMap();
function withForm(o) {
  let f = FORMED.get(o);
  if (!f) { f = { ...FORM_DEFAULTS, ...o, lead: Number.isFinite(o.lead) ? o.lead : 0.08, loops: Number.isFinite(o.loops) ? o.loops : 1 }; FORMED.set(o, f); }
  return f;
}
/** The figure's clock at time t of an animation T long: t at both ends, nudged in between to end on a whole loop. */
export function figClock(o, t, T) {
  const P = livePeriod(o);
  if (!(T > 0)) return t;
  const r = T / P, sh = (Math.ceil(r - 1e-9) - r) * P;
  if (sh < 1e-6) return t;
  const n = Math.floor(t / T), f = t / T - n, a1 = Math.max(0.2, 1 - 1.75 / T);
  return t + sh * (n + E(seg(f, 0.04, a1)));
}
// back and front ask for the same frame (and copies for theirs): keep a few
const EXT = [];
const keyOf = (m) => JSON.stringify(m, (k, v) => (typeof v === "function" ? undefined : v));
function formFrame(o, t, M, T) {
  const st = state(o, t, M), m = st.m, h = figClock(o, m.tw ?? t, T);
  let vx = 0;
  if (M && grounded(o)) { const e = 0.004 * o.duration; vx = ((M(t + e).dx || 0) - (M(t - e).dx || 0)) / (2 * e); }
  const key = [t, h, vx, st.x, st.y, st.vx, st.vy, st.sx, st.sy, st.tilt, keyOf(m)].join();
  for (const e of EXT) if (e.o === o && e.key === key) return e.F;
  const F = build(o, t, { M, st, h, vx });
  F.hidden = m.vis <= 0.02 || m.grow < 0.03;
  EXT.unshift({ o, key, F });
  if (EXT.length > 10) EXT.pop();
  return F;
}
// what the tab gets back, as the blob's state: x, y the middle of its body, sx/sy its size against the blob's (so an
// ellipse of o.size * sx by o.size * sy holds its body), and where its hands, head and feet are
function stOf(o, F) {
  const { st, fig } = F, sc = Math.min(F.fsx, F.fsy), [x, y] = F.toScreen(0, (fig.chest + fig.hips) / 2), at = ([a, b]) => F.toScreen(a, b);
  return { ...st, x, y, sx: ((0.5 * F.U) / o.size) * F.fsx, sy: (F.U / o.size) * F.fsy, tilt: F.tilt, form: o.form, U: F.U * sc,
    hands: fig.hands.map(at), head: F.toScreen(fig.head.x, fig.head.y), headR: fig.head.rx * sc, feet: fig.tips.map(at), top: F.toScreen(fig.head.x, fig.box[1]),
    floor: F.G ? F.G.FY : null };
}
/** The creature's back layer in its form (part: 0 alone or the first, 1 another copy on the same floor, 2 its body only). */
export function bodyBack(p, t, o, M = null, C = fit(o.palette, 8), T = 0, part = 0) {
  if (!isForm(o)) return blobBack(p, t, o, M, C);
  const f = withForm(o), F = formFrame(f, t, M, T);
  aura(p, C, f, F); sparksOf(p, C, f, F, false);
  if (part < 2) floorFx(p, C, f, F, part);
  if (part === 0) gaitFx(p, C, f, F);
  return stOf(f, F);
}
/** The creature's front layer in its form. */
export function bodyFront(p, t, o, M = null, C = fit(o.palette, 8), T = 0) {
  if (!isForm(o)) return blobFront(p, t, o, M, C);
  const f = withForm(o), F = formFrame(f, t, M, T);
  if (!F.hidden) {
    if (F.blobPart) drawDrips(p, C, t, f, F.st, F.rad, F.M);
    dropsAndHands(p, C, t, f, F);
    body(p, C, f, F);
    eyesOf(p, C, f, F);
  }
  sparksOf(p, C, f, F, true);
  return stOf(f, F);
}
/** The motes round it (on its legs, round where it stands). */
export function bodyAmbient(p, t, o, front, C = fit(o.palette, 8), off = [0, 0]) {
  if (!isForm(o) || o.form !== "grounded") return ambient(p, t, o, front, C, off);
  const G = gravityAt(withForm(o), 1);
  return ambient(p, t, o, front, C, [off[0] + 0, off[1] + G.gm * (G.FY - 1.85 * G.Lw.U)]);
}
/** The floor's top edge in local px for a tab in the grounded form (null otherwise). */
export const floorFor = (o) => (isForm(o) && o.form === "grounded" ? floorOf(withForm(o)) : null);
/** Its silhouette at t (body and hair), for afterimages: { X0, Y0, W, H, inside(i, j) } over the pixels it covers. */
export function formMask(o, t, M = null, T = 0) {
  const F = formFrame(withForm(o), t, M, T), { X0, Y0, W, H, Gs, Hs, As, Fs } = F;
  return { X0, Y0, W, H, inside: (i, j) => i >= 0 && j >= 0 && i < W && j < H && (Gs[j * W + i] <= 0 || (Hs ? Hs[j * W + i] <= 0 : false) || (As ? As[j * W + i] <= 0 : false) || (Fs ? Fs[j * W + i] <= 0 : false)) };
}
/** The middle of its body at rest, in local px (where a tab's st.x, st.y are when nothing moves it). */
export function formCentre(o) {
  if (!isForm(o)) return [0, 0];
  const F = formFrame(withForm(o), 0, null, 0);
  return F.toScreen(0, (F.fig.chest + F.fig.hips) / 2);
}
/** Where its frame is and where the middle of its body is, at rest or posed by M: [x, y, middle x, middle y] in local px. */
export function formAnchor(o, M = null) {
  if (!isForm(o)) return [0, 0, 0, 0];
  const F = formFrame(withForm(o), 0, M, 0);
  if (F.blob) return [F.st.x, F.st.y, F.st.x, F.st.y];
  const [mx, my] = F.toScreen(0, (F.fig.chest + F.fig.hips) / 2);
  return [F.ox, F.oy, mx, my];
}
/** Where its body reaches at rest, in local px round its spot: [left, top, right, bottom] (the blob's for the blob). */
export function formExtent(o) {
  if (!isForm(o)) { const S = o.size; return [-S * 1.05, -S * 1.05, S * 1.05, S * (1.05 + (o.drip || 0))]; }
  const f = withForm(o), F = formFrame(f, 0, null, 0), [x0, y0, x1, y1] = F.fig.box, a = F.toScreen(x0, y0), b = F.toScreen(x1, y1);
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
}
