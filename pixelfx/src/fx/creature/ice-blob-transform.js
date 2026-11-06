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
const leadOut = (o, T) => 1 - Math.max(o.lead, Math.min(0.45, 1.7 / T));
const prog = (o, t) => { const T = total(o); return seg((((t / T) % 1) + 1) % 1, o.lead, leadOut(o, T)); };
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
const BOTTOM = { spirit: 1.92, legs: 1.98, lotus: 0.85 };
const bottomOf = (o) => (grounded(o) ? 2.02 : BOTTOM[o.huLegs]);
function human(o, st, h, P, g) {
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
    const a1 = ap[0] + sw * w1 + vyk * 0.1 - sd * vxk * 0.06, a2 = ap[1] + sw * w2 * 1.2 + vyk * 0.16 - sd * vxk * 0.1, a3 = a2 + ap[2] + sw * w2 * 0.6;
    const x0 = sd * shX, y0 = shY, rs = lerp(0.6, 1, clamp(ga));
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
    const a1 = lerp(f1, p1 + swing, gv) + X.lift * 0.8 + X.kick * 0.3, a2 = lerp(f2, p2 + swing * 1.4, gv) + X.lift * 1.2 + X.kick * 0.55, a3 = lerp(f3, p3 + swing * 1.4, gv) + X.lift * 0.5 + X.kick * 0.45;
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
  const gl = Math.max(0, g.legs), nT = whole(o.huTailTurns, 1), tsw = o.huTailSway, tips = [];
  if (gl > 0.02) for (const sd of [1, -1]) {
    const rs = lerp(0.6, 1, clamp(gl)), hjx = sd * Lw.hw, hjy = hips + 0.02 * U - sd * X.pel, T1 = Lw.T1 * gl, T2 = Lw.T2 * gl;
    let ax, ay, tx, ty2;
    if (X.feet) {
      [ax, ay] = X.feet[sd > 0 ? 0 : 1];
      const px = ax + sd * Math.sin(Lw.a0) * Lw.toe, py = ay + Math.cos(Lw.a0) * Lw.toe;
      tx = lerp(px, ax + sd * 0.05 * U, X.flat); ty2 = lerp(py, X.fy - 0.045 * U, X.flat);
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
    const fl = X.feet ? X.flat : 0;
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
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const q of [...L, ...Hl]) { x0 = Math.min(x0, q.x0); x1 = Math.max(x1, q.x1); y0 = Math.min(y0, q.y0); y1 = Math.max(y1, q.y1); }
  const heart = [-0.05 * U + Math.cos(TAU * u) * 0.03 * U + lean * 0.6, chest + 0.06 * U + Math.sin(TAU * u * 2) * 0.02 * U];
  return { L, Hl, U, head, hands, tips, heart, chest, hips, box: [x0, y0, x1, y1] };
}
// where gravity puts the figure: its origin (ox, oy) on the screen and what it does to the pose
function grounding(o, st, G, fsy, tilt) {
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
  let sup = -Infinity;
  for (const sd of [1, -1]) { const dx = sd * (Lw.fw - Lw.hw) - sx; sup = Math.max(sup, FY - 0.09 * U + sd * pel - Math.sqrt(Math.max(0, Ls * Ls - dx * dx))); }
  const ox = sx, oy = lerp(cY, sup, G.gl) + G.crouch - hips;
  Object.assign(X, { sx, pel, feet: [[Lw.fw - ox, aY - oy], [-Lw.fw - ox, aY - oy]], fy: FY - oy });
  return { ox, oy, X };
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
function build(o, t) {
  const P = livePeriod(o), ph = phaseOf(o, t), style = styleOf(o), cf = formOf(o, ph.c), ch = chore(o, cf, style), M = modsOf(o);
  const st = state(o, t, M), S = o.size, G = grounded(o) ? gravityAt(o, ph.c) : null;
  const F = { ph, cf, ch, st, M, style, P, G, blob: ch.kb <= 0 };
  if (F.blob) return F;
  const m = st.m, k = ch.kb, spiral = ch.front !== null;
  // the figure's own squash: a little of the idle's breath and bounce, and the change's size
  const bsx = st.sx / (m.sx * m.grow), bsy = st.sy / (m.sy * m.grow);
  let fsx = (1 + (bsx - 1) * 0.3) * ch.scale, fsy = (1 + (bsy - 1) * 0.3) * ch.scale, tilt = (st.tilt - m.rot) * o.huTilt, ox = st.x, oy = st.y, X = null;
  if (G) {
    // gravity takes over from the blob's float: no more sway, tilt or squash; it falls and stands
    fsx = lerp(fsx, ch.scale, G.gm); fsy = lerp(fsy, ch.scale, G.gm); tilt *= 1 - G.gm;
    ({ ox, oy, X } = grounding(o, st, G, fsy, tilt));
  }
  const fig = G ? stander(o, st, ph.h, P, ch.g, X) : human(o, st, ph.h, P, ch.g), U = fig.U;
  const cs = Math.cos(tilt), sn = Math.sin(tilt), cb = Math.cos(-st.tilt), sb = Math.sin(-st.tilt);
  const toScreen = (fx, fy) => { const x = fx * fsx, y = fy * fsy; return [ox + x * cs - y * sn, oy + x * sn + y * cs]; };
  Object.assign(F, { fig, U, fsx, fsy, tilt, toScreen, ox, oy });
  // where the field lives: the blob's reach while some of it is left, the figure's box, and the halo around them
  const hm = lerp(S * 0.55, U * 0.3, k) * Math.max(0.01, o.shell), far = hm + 2;
  let X0 = Infinity, X1 = -Infinity, Y0 = Infinity, Y1 = -Infinity;
  const grow = (x, y) => { X0 = Math.min(X0, x); X1 = Math.max(X1, x); Y0 = Math.min(Y0, y); Y1 = Math.max(Y1, y); };
  const [bx0, by0, bx1, by1] = fig.box;
  for (const [x, y] of [[bx0, by0], [bx1, by0], [bx0, by1], [bx1, by1]]) grow(...toScreen(x, y));
  const blobPart = k < 1 || spiral, rad = blobPart ? shapeOf(o, st.u, m) : null;
  if (blobPart) { const R = S * 1.9 * Math.max(st.sx, st.sy); grow(st.x - R, st.y - R); grow(st.x + R, st.y + R); }
  X0 = Math.floor(X0 - far - 1); Y0 = Math.floor(Y0 - far - 1); X1 = Math.ceil(X1 + far + 1); Y1 = Math.ceil(Y1 + far + 1);
  const W = X1 - X0 + 1, H = Y1 - Y0 + 1, N = W * H;
  const Gs = new Float32Array(N), Gw = new Float32Array(N), Qx = new Float32Array(N), Qy = new Float32Array(N), Gk = new Float32Array(N), Gl = spiral ? new Uint8Array(N) : null, Hs = fig.Hl.length ? new Float32Array(N).fill(99) : null;
  const band = U * 0.45, yF = spiral ? lerp(bottomOf(o) * U + U * 0.5, fig.box[1] - U * 0.3, ch.front) : 0, fsc = Math.min(fsx, fsy);
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const px = X0 + i + 0.5, py = Y0 + j + 0.5, dx = px - st.x, dy = py - st.y, n = j * W + i, ex = px - ox, ey = py - oy;
      // the figure's side, in its own space
      const rx = (ex * cs + ey * sn) / fsx, ry = (-ex * sn + ey * cs) / fsy;
      let kk = k, s = 0, w = 1, qx = rx, qy = ry;
      if (spiral) {
        // the spiral cuts clean: the new form below the ribbons' line, the blob above it, a line of light between
        const ux = dx * cb - dy * sb, uy = dx * sb + dy * cb, bx = ux / st.sx, by = uy / st.sy, r = Math.hypot(bx, by), pd = (ry - yF) * fsc;
        field(fig.L, rx, ry, far / fsc);
        const below = Math.max(SD * fsc, -pd), above = Math.max(r - rad(Math.atan2(by, bx)), pd);
        kk = below <= above ? 1 : 0; s = Math.min(below, above);
        w = kk ? SW * fsc : rad(Math.atan2(by, bx)); qx = kk ? rx : bx; qy = kk ? ry : by;
        if (Hs) { field(fig.Hl, rx, ry, far / fsc); Hs[n] = Math.max(SD * fsc, -pd); }
        if (Math.abs(pd) < 1) Gl[n] = 1;
        Gs[n] = s; Gw[n] = Math.max(0.5, w); Qx[n] = qx; Qy[n] = qy; Gk[n] = kk;
        continue;
      }
      if (kk > 0) { field(fig.L, rx, ry, far / fsc); s = SD * fsc; w = SW * fsc; if (Hs && kk > 0.5) { field(fig.Hl, rx, ry, far / fsc); Hs[n] = SD * fsc; } }
      if (kk < 1) {
        // the blob's side, in its body space (its squash and tilt)
        const ux = dx * cb - dy * sb, uy = dx * sb + dy * cb, bx = ux / st.sx, by = uy / st.sy, r = Math.hypot(bx, by), e = rad(Math.atan2(by, bx));
        s = kk > 0 ? lerp(r - e, s, kk) : r - e; w = kk > 0 ? lerp(e, w, kk) : e;
        qx = lerp(bx, rx, kk); qy = lerp(by, ry, kk);
      }
      Gs[n] = s; Gw[n] = Math.max(0.5, w); Qx[n] = qx; Qy[n] = qy; Gk[n] = kk;
    }
  // where the eyes, the heart of light and the highlight are: on the blob, then on the figure's head and chest
  const ke = spiral ? clamp((fig.head.y - yF) / band + 0.5) : clamp(ch.g.head) * k, kn = spiral ? clamp((fig.heart[1] - yF) / band + 0.5) : k;
  const [hX, hY] = toScreen(fig.head.x, fig.head.y), bn = [Math.cos(TAU * st.u) * S * 0.1 - S * 0.12, Math.sin(TAU * st.u * 2) * S * 0.06 + S * 0.15];
  const bnS = [st.x + (bn[0] * st.sx) * Math.cos(st.tilt) - (bn[1] * st.sy) * Math.sin(st.tilt), st.y + (bn[0] * st.sx) * Math.sin(st.tilt) + (bn[1] * st.sy) * Math.cos(st.tilt)];
  const hn = toScreen(...fig.heart);
  // how much of the figure there is at a height of its own space (the spiral remakes it from below)
  const kAt = (fy) => (spiral ? clamp((fy - yF) / (U * 0.15) + 0.5) : k);
  Object.assign(F, { X0, Y0, W, H, Gs, Gw, Qx, Qy, Gk, Gl, Hs, hm, rad, blobPart, yF, band, ke, kn, kAt,
    headS: [lerp(st.x, hX, ke), lerp(st.y, hY, ke)], headR: lerp(S, fig.head.rx * fsc, ke),
    nucS: [lerp(bnS[0], hn[0], kn), lerp(bnS[1], hn[1], kn)], nucR: lerp(S, U * 0.6, kn) * m.grow });
  return F;
}

// ---- drawing the blended body like the blob's: 1 px rim lit top-left, ramp steps inside, currents, heart of light
function body(p, C, o, F) {
  const { X0, Y0, W, H, Gs, Gw, Qx, Qy, Gk, Gl, st, ch } = F, la = (o.lightAngle * Math.PI) / 180, lx = Math.cos(la), ly = Math.sin(la);
  // the figure's limbs are thin: on top of each limb's own roundness it is lit as one body, top-left to bottom-right,
  // so it keeps the blob's big glassy gradient; its currents are a little stronger, so the bands still show
  const Rg = 1.5 * F.U, cy0 = lerp(F.fig.head.y, F.fig.hips, 0.45), Hs = F.Hs, boost = ch.glow, white = ch.white, u = st.u;
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
// the halo against the skin and the aura, as for the blob, around whatever shape it has now
function aura(p, C, o, F) {
  const { X0, Y0, W, H, Gs, st, ch, hm, fig } = F, S = o.size * st.m.grow, U = F.U * ch.scale, k = ch.kb, m = st.m, Hh = o.halo * m.halo * lerp(1, o.huHalo, k);
  const [cx, cy] = F.toScreen(0, lerp(0, (fig.chest + fig.hips) / 2, k));
  p.glow(cx, cy, lerp(S * 3.2, U * 3.4, k), C[2], 0.3 * Hh);
  p.glow(cx, cy, lerp(S * 2, U * 2.2, k), C[4], 0.22 * Hh + 0.3 * (ch.glow + ch.white));
  if (k > 0.3) { const [hx, hy] = F.headS; p.glow(hx, hy, U * 1.2, C[4], 0.12 * Hh * k); }
  if (o.ground > 0) {
    const gyB = o.size * o.groundDist + o.hover + Math.max(0, m.dy), gyH = bottomOf(o) * F.U + o.size * (o.groundDist - 1) * 0.5 + o.hover;
    const by = lerp(st.y, st.y + bottomOf(o) * F.U - o.size, k), G = F.G;
    let gy = lerp(gyB, gyH, k), near = clamp(1 - (gy - by) / (gy + o.hover + 1) + 0.5);
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
        const s = F.Hs ? Math.min(Gs[j * W + i], F.Hs[j * W + i]) : Gs[j * W + i], d = s / hm;
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
  drawEyes(p, C, oe, se, () => hr * lerp(1, 1.05, ke));
}
// drops of light falling from its lowest points (tail tip, toes), and light rising from its palms
function dropsAndHands(p, C, t, o, F) {
  const { ph, P, fig } = F, n = whole(o.huDrops) * whole(o.liveLoops, 1), T = total(o), outAt = T * leadOut(o, T);
  // a drop shows if the form was whole and at rest when it fell (the frames it chains with have the same drops)
  const shown = (t0) => o.mode === "live" || (o.mode === "transform" ? t0 >= outAt : t0 <= T * o.lead);
  if (F.G) {
    // on the ground they drip from its fingertips, fall to the floor and splash
    const G1 = gravityAt(o, 1), FY = F.G.FY;
    if (n) cycle(ph.h, P, n, o.seed + 77, (g) => g.range(1, 1.6), (age, life, r, i) => {
      const t0 = t - age;
      if (!shown(t0)) return;
      const s0 = state(o, t0, null), { ox, oy, X } = grounding(o, s0, G1, 1, 0), f0 = stander(o, s0, ph.h - age, P, G1g, X), hd = f0.hands[i % f0.hands.length];
      if (!hd) return;
      const x = ox + hd[0] + Math.sin(i * 2.3) * 0.6, y0 = oy + hd[1] + 2, hit = Math.sqrt(Math.max(0, FY - 0.5 - y0) / 46);
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
    const s0 = state(o, t0, null), f0 = human(o, s0, ph.h - age, P, G1), tip = f0.tips[i % f0.tips.length];
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
function floorFx(p, C, o, F) {
  const G = F.G;
  if (!G || G.fl <= 0) return;
  const room = roomOf(o), FY = G.FY, U = G.Lw.U, x0 = Math.floor(room[0]), x1 = Math.ceil(room[2]) - 1, W = Math.max(1, x1 - x0 + 1);
  if (FY > room[3]) return;
  const reach = G.fl * (Math.max(-room[0], room[2]) + 6), grow = G.fl < 1, Lt = o.grLight, ice = o.grLook !== "line", y1 = Math.ceil(room[3]);
  const lumAt = (px) => { const d = Math.abs(px), edge = clamp(Math.min(px - room[0], room[2] - px) / (W * 0.14)); return Lt * (0.28 + 0.72 * Math.exp(-d / (U * 2.4))) * (0.3 + 0.7 * edge); };
  // the reflection: the body seen upside down in the ice, darker, in lines that thin out with depth
  const refl = o.grReflect > 0 && F.Gs ? Math.round(U * 2.6 * o.grReflect) : 0;
  const sh = new Uint8Array(W);
  if (refl) {
    const { X0, Y0, W: GW, H: GH, Gs, Hs } = F;
    for (let d = 1; d <= refl && FY + d < y1; d++) {
      const f = d / refl;
      if (f > 0.35 && f <= 0.7 ? d % 2 : f > 0.7 ? d % 3 : 0) continue;
      const j = FY - d - Y0;
      if (j < 1 || j >= GH - 1) continue;
      for (let i = 1; i < GW - 1; i++) {
        const px = X0 + i + 0.5;
        if (Math.abs(px) > reach || px < room[0] || px > room[2]) continue;
        const n = j * GW + i, s = Gs[n], hs = Hs ? Hs[n] : 1;
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
  for (let x = x0; x <= x1; x++) {
    const px = x + 0.5, d = Math.abs(px);
    if (d > reach) continue;
    const lum = lumAt(px), ci = clamp(Math.round(1 + lum * 5.2), 1, 6), head = grow && reach - d < 2.5;
    p.px(px, FY + 0.5, head ? WHITE : C[ci]);
    if (!sh[x - x0] && ci > 2) p.px(px, FY + 1.5, C[ci - 2]);
    // the nearer lines (lower down) catch its light wider: the floor comes toward us
    if (ice) for (const [dd, kk] of FLOOR_LINES) {
      const yy = FY + 1 + Math.round(dd * U);
      if (yy >= y1) break;
      const edge = clamp(Math.min(px - room[0], room[2] - px) / (W * 0.14)), ll = Lt * (0.28 + 0.72 * Math.exp(-d / (U * 2.4 * (1 + dd * 1.4)))) * (0.3 + 0.7 * edge);
      const cl = Math.round(ll * kk * 4.2);
      if (cl >= 1 && (cl > 1 || (x + yy) % 2 === 0)) p.px(px, yy + 0.5, C[Math.min(cl, 3)]);
    }
  }
  // its light on the floor, and under its feet once it stands on it
  p.glow(0, FY, U * 2.2, C[4], 0.16 * Lt * G.fl);
  if (grow) p.glow(reach, FY, 5, WHITE, 0.4 * G.fl), p.glow(-reach, FY, 5, WHITE, 0.4 * G.fl);
  if (G.plant && F.fig) for (const [tx, ty] of F.fig.tips) { const [x, y] = F.toScreen(tx, ty); p.glow(x, FY, U * 0.45, C[6], 0.3 * Lt * clamp(1 - (FY - y) / (U * 0.3))); }
  // glints running on the ice
  const n = whole(o.grGlints) * whole(o.liveLoops, 1);
  if (n) cycle(F.ph.h, F.P, n, o.seed + 313, (g) => g.range(0.45, 0.9), (age, life, r) => {
    const k = age / life, x = Math.floor(lerp(room[0] + 3, room[2] - 3, r.range(0, 1))) + 0.5, a = Math.sin(Math.PI * k) * G.fl;
    if (Math.abs(x) > reach || a < 0.3) return;
    star(p, C, x, FY + 0.5, a > 0.75 ? 2 : 1);
    p.glow(x, FY, 4, C[6], 0.35 * a * Lt);
  });
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
  const { st, ch, fig } = F, k = ch.kb, [x, y] = F.toScreen(0, lerp(0, fig.hips - 0.1 * F.U, k));
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
