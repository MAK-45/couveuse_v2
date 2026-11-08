// The born blob doing something: strolling, jumping, powering up a halo, changing shape, spinning, splitting,
// bursting into frost, teleporting, napping, swelling. Each action runs over a whole number of the idle's loops
// with the idle going on underneath, and every change it makes is zero at both ends: the first and last frames
// are the idle's first frame, so an idle GIF and any action GIF chain end to end.
// In one of the transformation's new forms (o.form "human", levitating, or "grounded", on its legs with gravity) the
// same actions are done by that figure (bodyBack/bodyFront from ice-blob-transform.js) and start and end on its
// "live" loop; on its legs they keep to the floor (strolls along it, jumps, crouches) and a few can't be done at all
// (FORM_FIT says which and why).
import { fit, clamp, lerp, seg, bump, ease, noise2, rng, TAU, WHITE, hex, toHex } from "../../core/index.js";
import { meta as idleMeta, state as idleState } from "./ice-blob-idle.js";
import { prog as progAt, leadOut, DROP_LIFE } from "./ice-time.js";
import { bodyBack, bodyFront, bodyAmbient, formExtent, gaitFree, gaitLine } from "./ice-blob-transform.js";

export const ACTIONS = ["move", "walk", "jump", "aura", "morph", "spin", "split", "burst", "teleport", "nap", "inflate", "dance", "scared", "freeze", "drop", "rainbow", "comet", "melt", "curious", "portal"];
/** What a new form can't do, and why (the page shows it; the effect then just rests). */
export const FORM_FIT = {
  grounded: {
    spin: "Il tourne sur lui-même en l’air, comme une roue : debout sur ses jambes, la gravité l’en empêche.",
    drop: "Il tombe jusqu’au sol et rebondit : sur ses jambes, il y est déjà.",
    comet: "Il file en grandes boucles dans le ciel : au sol, il ne peut pas voler.",
    portal: "Il vole d’un portail à l’autre à travers la scène : au sol, il ne peut pas voler.",
  },
};
export const fitsForm = (o, name = o.action) => !(FORM_FIT[o.form] && FORM_FIT[o.form][name]);

export const meta = {
  name: "Ice blob actions",
  desc: "The born ice blob performs an action (stroll, jump, halo, morph, spin, split, frost burst, teleport, nap, swell) and ends exactly where and how it began.",
  tags: ["creature", "blob", "action", "ice", "light", "loop"],
  size: [320, 180],
  origin: [160, 100],
  duration: 8,
  loop: true,
  fps: 30,
  bg: "black",
  options: {
    ...idleMeta.options,
    form: "blob", action: "walk", loops: 2, lead: 0.08,
    // the move: where it goes (offsets from its spot, in its own pixels; moveTo overrides them: a life asks for a place) and
    // stays; how fast it glides there (its sizes a second), the arc, little hops, looking ahead; on its legs it walks or runs
    moveX: 110, moveY: -25, moveSpeed: 2.6, moveArc: 0.35, moveHops: 0, moveHop: 5, moveLook: 1, moveGait: "walk", moveWalk: 4.5, moveRun: 10,
    // the stroll: stops picked at random inside a zone (offsets from its spot, in its own pixels)
    walkStops: 4, walkRoute: 1, walkMinX: -140, walkMaxX: 140, walkMinY: -50, walkMaxY: 50, walkPause: 0.35, walkCurve: 0.5,
    walkHops: 2, walkHop: 4, walkSquash: 1, walkLook: 1, walkJoy: 0.5,
    jumpCount: 1, jumpHeight: 40, jumpFlips: 1, jumpAir: 0.55, jumpSquash: 1,
    auraPower: 1, auraRadius: 1.6, auraPulses: 3, auraRays: 12, auraRise: 10, auraEyes: "closed",
    morphShape: "star", morphAmount: 1, morphHold: 0.4, morphSpin: 0, morphFlash: 1,
    spinTurns: 3, spinRise: 12, spinStretch: 0.35, spinShrink: 0.15, spinTrail: 1,
    splitCount: 3, splitDistance: 34, splitOrbit: 1, splitShrink: 0.35,
    burstShards: 40, burstRadius: 60, burstCharge: 1, burstRing: 1,
    tpX: 90, tpY: -20, tpHold: 0.3, tpFlash: 1,
    napSink: 8, napBreath: 1, napBubbles: 5, napDim: 0.5,
    inflateSize: 1.8, inflateHold: 0.2, inflateJiggle: 1,
    danceBeats: 8, danceAmp: 10, danceBounce: 5, danceWiggle: 18, danceSparkles: 1,
    scareRetreat: 40, scareSide: "left", scareShake: 1, scareShrink: 0.25, scareDrops: 1,
    freezeSpikes: 12, freezeLength: 0.7, freezeHold: 0.35, freezeShatter: 1, freezeTint: 0.6,
    dropFloor: 70, dropBounces: 3, dropBounce: 0.5, dropSquash: 1, dropDust: 1,
    rainbowTurns: 1, rainbowSat: 1, rainbowGlow: 0.5, rainbowSparkles: 1,
    cometLoops: 1, cometRadius: 70, cometSide: "right", cometTrail: 1, cometSpin: 1,
    meltDrop: 16, meltWidth: 2.1, meltHold: 0.35, meltRipples: 3, meltEyes: "open",
    curiousGlances: 4, curiousLean: 0.35, curiousPeek: 18, curiousEyes: 1.3,
    // portals: a blue one and an orange one (offsets from its spot, in its own pixels; angle = where a portal faces, y down)
    portalMode: "back", portalAX: -70, portalAY: 50, portalAAngle: "270", portalBX: 120, portalBY: -30, portalBAngle: "180",
    portalColorA: "#2f8cff", portalColorB: "#ff8a1c", portalSize: 1.5, portalDepth: 0.3, portalShots: 1, portalHold: 0.25,
    portalExit: 2.2, portalLook: 1, portalArc: 2.5, portalLoops: 3, portalSwirl: 1, portalSparks: 1, portalGlow: 1, portalSplash: 1,
  },
};

const E = ease.inOutSine, TOWARD = (a, b, k) => a + (b - a) * k;
/** How long an action lasts: a whole number of the blob's loops (a move: at least what its way takes). */
export const total = (o) => o.duration * (o.action === "move" && fitsForm(o) ? moveLoops(o) : Math.max(1, Math.round(o.loops)));
// the action's own progress: 0 before the lead-in, 1 after the lead-out, eased edges belong to each action
// the lead-out is never shorter than a drop of light lives (1.7 s): every drop alive on the last frame was
// shed by the resting blob, as on the idle's frames, so the seam between GIFs is exact
const prog = (o, t) => progAt(o, t, total(o));
// rise, hold, fall: 0 at both ends
const plateau = (a, hold) => {
  const r = (1 - hold) / 2;
  return a < r ? E(a / r) : a > 1 - r ? E((1 - a) / r) : 1;
};

// ---- shapes for the morph, as radius by angle (screen angle, y down), about 1
const poly = (n, up = true) => (th) => {
  const s = TAU / n, a = (((th + (up ? Math.PI / 2 : 0)) % s) + s) % s;
  return Math.min(1.35, Math.cos(Math.PI / n) / Math.cos(a - Math.PI / n)) * 1.02;
};
let heartTab = null;
function heart(th) {
  if (!heartTab) {
    heartTab = new Float32Array(257);
    for (let j = 0; j <= 256; j++) {
      const a = (j / 256) * TAU - Math.PI, c = Math.cos(a), s = -Math.sin(a); // y up for the classic curve
      let lo = 0, hi = 2;
      for (let k = 0; k < 30; k++) {
        const r = (lo + hi) / 2, x = c * r, y = s * r + 0.15, f = (x * x + y * y - 1) ** 3 - x * x * y ** 3;
        if (f < 0) lo = r; else hi = r;
      }
      heartTab[j] = lo * 0.95;
    }
  }
  const f = (((th + Math.PI) % TAU) + TAU) % TAU / TAU * 256, i = Math.min(255, Math.floor(f));
  return heartTab[i] + (heartTab[i + 1] - heartTab[i]) * (f - i);
}
const SHAPES = {
  star: (th) => 0.72 + 0.62 * ((Math.cos(5 * (th + Math.PI / 2)) + 1) / 2) ** 3,
  square: (th) => Math.min(1.3, 0.9 / Math.max(Math.abs(Math.cos(th)), Math.abs(Math.sin(th)))),
  triangle: poly(3),
  hexagon: poly(6, false),
  heart,
  flat: (th) => 1 / Math.sqrt((Math.cos(th) / 1.55) ** 2 + (Math.sin(th) / 0.55) ** 2),
  tall: (th) => 1 / Math.sqrt((Math.cos(th) / 0.62) ** 2 + (Math.sin(th) / 1.5) ** 2),
  crystal: (th) => 0.82 + 0.7 * Math.max(0, Math.cos(6 * th)) ** 12,
  drop: (th) => 0.92 + 0.75 * Math.max(0, -Math.sin(th)) ** 5,
};

// ---- the actions: each gives modifiers M(t) and may draw its own light, behind (back) and in front
const A = {};

// the stroll: it sets off, goes from stop to stop around the scene at an easy pace, pauses at each to look
// about (sometimes a little hop of joy), and comes home. Stops are seeded, inside the zone it's given.
A.walk = (o) => {
  // on its legs it strolls along the floor: the stops keep only their x
  const gr = o.form === "grounded", n = Math.max(1, Math.min(10, Math.round(o.walkStops))), R = rng(o.seed, 313, Math.round(o.walkRoute));
  const pts = [[0, 0]], X0 = Math.min(o.walkMinX, o.walkMaxX), X1 = Math.max(o.walkMinX, o.walkMaxX), Y0 = Math.min(o.walkMinY, o.walkMaxY), Y1 = Math.max(o.walkMinY, o.walkMaxY);
  const span = Math.hypot(X1 - X0, Y1 - Y0) || 1;
  for (let i = 0; i < n; i++) {
    // a few tries for a stop far enough from the last one, so it really goes places
    let best = null, bd = -1;
    for (let k = 0; k < 8; k++) {
      const c = [R.range(X0, X1), R.range(Y0, Y1)];
      if (gr) c[1] = 0;
      const d = Math.hypot(c[0] - pts[i][0], c[1] - pts[i][1]);
      if (d > bd) { bd = d; best = c; }
      if (d > span * 0.35) break;
    }
    pts.push(best);
  }
  pts.push([0, 0]);
  const legs = [];
  for (let i = 0; i < pts.length - 1; i++) legs.push({ a: pts[i], b: pts[i + 1], d: Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) || 1, side: i % 2 ? 1 : -1 });
  const sum = legs.reduce((q, l) => q + l.d, 0), pause = clamp(o.walkPause, 0, 0.8), stop = pause / n, avg = sum / legs.length;
  // the timetable: leg, stop, leg, stop ... leg home
  const plan = [];
  let at = 0;
  legs.forEach((l, i) => {
    const len = (1 - pause) * (l.d / sum);
    plan.push({ kind: "leg", l, t0: at, t1: at + len, hops: o.walkHops > 0 ? Math.max(1, Math.round((o.walkHops * l.d) / avg)) : 0 });
    at += len;
    if (i < legs.length - 1) { plan.push({ kind: "stop", p: l.b, t0: at, t1: at + stop, i }); at += stop; }
  });
  return {
    pts, plan,
    mods(t) {
      const a = prog(o, t);
      if (a <= 0 || a >= 1) return {};
      const seg0 = plan.find((q) => a <= q.t1) || plan[plan.length - 1], k = clamp((a - seg0.t0) / (seg0.t1 - seg0.t0 || 1));
      if (seg0.kind === "stop") {
        // looking about, and now and then a little hop of joy
        const joy = rng(o.seed, 99, seg0.i).chance(o.walkJoy) ? bump(k, 0.35, 0.75) : 0;
        return { dx: seg0.p[0], dy: seg0.p[1] - joy * 7, lookX: Math.sin(TAU * k) * o.walkLook * 1.2, lookY: -0.3 * o.walkLook * Math.sin(Math.PI * k),
          happy: joy > 0.1 ? 1 : 0, sy: 1 - joy * 0.1 + bump(k, 0.75, 0.95) * 0.06, quiet: 1 };
      }
      const { l } = seg0, s = ease.inOutSine(k), nx = -(l.b[1] - l.a[1]) / l.d, ny = (l.b[0] - l.a[0]) / l.d;
      const bend = gr ? 0 : Math.sin(Math.PI * s) * o.walkCurve * l.d * 0.22 * l.side;
      const hop = seg0.hops && !gr ? Math.abs(Math.sin(Math.PI * seg0.hops * k)) : 0, w = Math.sin(Math.PI * k) ** 0.5, land = 1 - hop;
      const sq = (land > 0.85 ? ((land - 0.85) / 0.15) * 0.18 : -hop * 0.06) * o.walkSquash * w;
      return { dx: lerp(l.a[0], l.b[0], s) + nx * bend, dy: lerp(l.a[1], l.b[1], s) + ny * bend - o.walkHop * hop * w, sy: 1 - sq, sx: 1 + sq * 0.8, quiet: 1 };
    },
  };
};

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

A.jump = (o) => ({
  mods(t) {
    const a = prog(o, t), n = Math.max(1, Math.round(o.jumpCount)), f = (a * n) % 1, air = clamp(o.jumpAir, 0.2, 0.9);
    if (a <= 0 || a >= 1) return {};
    const r0 = (1 - air) * 0.55, r1 = r0 + air, q = o.jumpSquash;
    if (f < r0) { const c = Math.sin((f / r0) * Math.PI * 0.5); return { sy: 1 - 0.3 * q * c, sx: 1 + 0.22 * q * c, dy: 2 * c, quiet: 1 }; }
    if (f < r1) {
      const g = (f - r0) / air, h = 4 * g * (1 - g), v = 1 - h;
      return { dy: -o.jumpHeight * h, sy: 1 + 0.25 * q * v * (g < 0.5 ? 1 : 0.6), sx: 1 - 0.15 * q * v, rot: TAU * Math.round(o.jumpFlips) * ease.inOutQuad(g), quiet: 1, happy: g > 0.2 && g < 0.8 ? 1 : 0,
        armUp: 0.75 * Math.sin(Math.PI * g) * (Math.round(o.jumpFlips) ? 0.4 : 1) };
    }
    const g = (f - r1) / (1 - r1), c = Math.sin(Math.PI * g) * (1 - g * 0.3);
    return { sy: 1 - 0.32 * q * c, sx: 1 + 0.25 * q * c, quiet: 1 };
  },
});

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

A.morph = (o) => ({
  env(t) { const a = prog(o, t); return a <= 0 || a >= 1 ? 0 : plateau(a, clamp(o.morphHold, 0, 0.9)); },
  mods(t) {
    const a = prog(o, t), e = this.env(t), sh = SHAPES[o.morphShape] || SHAPES.star;
    return { morph: o.morphAmount * e, shape: sh, rot: TAU * Math.round(o.morphSpin) * E(a), glow: 0.25 * o.morphFlash * bump(e, 0.2, 0.8), quiet: a > 0 && a < 1 ? 1 : 0, armOpen: 0.7 * e };
  },
  front(p, C, t, st) {
    const e = this.env(t), f = bump(e, 0.15, 0.85) * o.morphFlash;
    if (f <= 0.02) return;
    p.glow(st.x, st.y, o.size * 2.2, WHITE, 0.25 * f);
    const g = rng(o.seed, 808), a = prog(o, t);
    for (let i = 0; i < 10; i++) {
      const th = g.range(0, TAU) + a * 3, r = o.size * (1.1 + g.range(0, 0.8));
      const x = st.x + Math.cos(th) * r, y = st.y + Math.sin(th) * r;
      p.px(x, y, WHITE);
      p.dot(x + 1, y, C[6], f); p.dot(x - 1, y, C[6], f); p.dot(x, y + 1, C[6], f); p.dot(x, y - 1, C[6], f);
    }
  },
});

A.spin = (o) => ({
  env(t) { const a = prog(o, t); return a <= 0 || a >= 1 ? 0 : Math.sin(Math.PI * a) ** 2; },
  mods(t) {
    const a = prog(o, t), e = this.env(t);
    return { rot: TAU * Math.max(1, Math.round(o.spinTurns)) * ease.inOutCubic(a), dy: -o.spinRise * e, sx: 1 + o.spinStretch * e, sy: 1 - o.spinStretch * 0.45 * e, grow: 1 - o.spinShrink * e, quiet: a > 0 && a < 1 ? 1 : 0, armOpen: e };
  },
  back(p, C, t, st) { this.trail(p, C, t, st, false); },
  front(p, C, t, st) { this.trail(p, C, t, st, true); },
  trail(p, C, t, st, front) {
    const e = this.env(t);
    if (e <= 0.02 || o.spinTrail <= 0) return;
    // two arms of light wound round it, following the spin
    for (let arm = 0; arm < 2; arm++)
      for (let i = 0; i < 18; i++) {
        const th = st.tilt + arm * Math.PI - i * 0.16, d = Math.sin(th);
        if (d >= 0 !== front) continue;
        const r = o.size * (1.25 + i * 0.03) * (1 + o.spinStretch * e), x = st.x + Math.cos(th) * r, y = st.y + d * r * 0.35;
        const al = (1 - i / 18) * e * o.spinTrail;
        p.dot(x, y, i < 3 ? WHITE : C[6], clamp(al));
        p.glow(x, y, 4, C[5], 0.18 * al);
      }
  },
});

A.split = (o) => {
  const n = () => Math.max(2, Math.min(5, Math.round(o.splitCount)));
  const env = (t) => { const a = prog(o, t); return a <= 0 || a >= 1 ? 0 : plateau(a, 0.4); };
  const copy = (i) => (t) => {
    const a = prog(o, t), e = env(t), th = (i / n()) * TAU + TAU * o.splitOrbit * E(a) - Math.PI / 2, r = o.splitDistance * e;
    // on its legs the copies line up along the floor, every one on its own feet
    if (o.form === "grounded") { const k = i ? Math.ceil(i / 2) * (i % 2 ? 1 : -1) : 0; return { dx: k * r * 1.1, grow: 1 - o.splitShrink * e, halo: i ? e : 1, quiet: a > 0 && a < 1 ? 1 : 0 }; }
    return { dx: Math.cos(th) * r, dy: Math.sin(th) * r * 0.55, grow: 1 - o.splitShrink * e, halo: i ? e : 1, quiet: a > 0 && a < 1 ? 1 : 0 };
  };
  return {
    // only one body at rest: the others exist while it's split
    copies: (t) => (env(t) > 0 ? Array.from({ length: n() }, (_, i) => copy(i)) : [copy(0)]),
    mods: copy(0),
    front(p, C, t, st) {
      const a = prog(o, t), f = bump(a, 0.02, 0.14) + bump(a, 0.86, 0.98);
      if (f > 0.02) { p.glow(st.x, st.y, o.size * 2, WHITE, 0.35 * f); p.glow(st.x, st.y, o.size, WHITE, 0.4 * f); }
    },
  };
};

A.burst = (o) => {
  const CH = 0.3, OUT = 0.32, BACK0 = 0.6, BACK1 = 0.82;
  return {
    mods(t) {
      const a = prog(o, t);
      if (a <= 0 || a >= 1) return {};
      if (a < CH) {
        const k = a / CH, sh = k * k * 2.2 * o.burstCharge;
        return { grow: 1 - 0.28 * E(k), dx: (noise2(t * 40, 1, o.seed) - 0.5) * sh, dy: (noise2(1, t * 40, o.seed) - 0.5) * sh, glow: 0.8 * k, shut: 0.8, quiet: 1, hold: E(k) };
      }
      if (a < BACK1) return { vis: 0, grow: 0, quiet: 1 };
      const k = (a - BACK1) / (1 - BACK1);
      return { grow: ease.outBack(k, 2.2), glow: 0.6 * (1 - k), quiet: 1, happy: k < 0.7 ? 1 : 0, armOpen: bump(k, 0, 1) };
    },
    front(p, C, t, st) {
      const a = prog(o, t);
      if (a <= CH * 0.95 || a >= 1) return;
      // the flash and the ring when it breaks
      const fk = seg(a, CH, OUT + 0.1);
      if (fk > 0 && fk < 1) {
        p.glow(st.x, st.y, o.size * 3 * (0.5 + fk), WHITE, 0.6 * (1 - fk));
        if (o.burstRing > 0) {
          const r = o.size * (0.8 + 3 * ease.outExpo(fk)), al = (1 - fk) ** 1.3 * o.burstRing;
          for (let j = 0, m = Math.ceil(r * 5); j < m; j++) { const th = (j / m) * TAU; p.dot(st.x + Math.cos(th) * r, st.y + Math.sin(th) * r * 0.85, fk < 0.3 ? WHITE : C[5], clamp(al)); }
          p.glowRing(st.x, st.y, r, 6, C[5], 0.35 * clamp(al));
        }
      }
      // the shards: fly out, hang, come home and become it again
      const g = rng(o.seed, 909), n = Math.round(o.burstShards);
      for (let i = 0; i < n; i++) {
        const th = g.range(0, TAU), R = o.burstRadius * g.range(0.4, 1), sp = g.range(-1.5, 1.5), big = i % 4 === 0;
        let r;
        if (a < BACK0) r = R * ease.outExpo(seg(a, CH, BACK0 - 0.05)) + Math.sin(a * 20 + i) * 1.5 * seg(a, OUT, BACK0);
        else r = R * (1 - ease.inCubic(seg(a, BACK0, BACK1 + 0.01)));
        if (a > BACK1 + 0.04) continue;
        const ang = th + sp * seg(a, CH, BACK1), x = st.x + Math.cos(ang) * r, y = st.y + Math.sin(ang) * r * 0.85 + seg(a, OUT, BACK0) * 4 * (1 - seg(a, BACK0, BACK1));
        p.px(x, y, a < OUT + 0.05 || a > BACK1 - 0.05 ? WHITE : big ? C[6] : C[5]);
        if (big) { p.px(x + 1, y, C[5]); p.px(x, y + 1, C[4]); }
        p.glow(x, y, big ? 5 : 3, C[5], 0.3);
      }
      const re = bump(a, BACK1 - 0.04, BACK1 + 0.08);
      if (re > 0) p.glow(st.x, st.y, o.size * 2, WHITE, 0.5 * re);
    },
  };
};

A.teleport = (o) => {
  const hold = clamp(o.tpHold, 0, 0.6), q = (1 - hold) / 4; // out, in (there), out, in (home)
  const k1 = q, k2 = 2 * q, k3 = 2 * q + hold, k4 = 3 * q + hold;
  const scaleAt = (a) => {
    if (a <= 0 || a >= 1) return 1;
    if (a < k1) return 1 - E(seg(a, 0, k1 * 0.8));
    if (a < k2) return ease.outBack(seg(a, k1 + q * 0.2, k2), 1.8);
    if (a < k3) return 1;
    if (a < k4) return 1 - E(seg(a, k3, k4 - q * 0.2));
    return ease.outBack(seg(a, k4 + q * 0.2, 1), 1.8);
  };
  const there = (a) => a > (k1 + k1 * 0.8) / 2 + q * 0.1 && a < (k3 + k4 - q * 0.2) / 2 + q * 0.1;
  return {
    mods(t) {
      const a = prog(o, t), g = scaleAt(a), at = there(a);
      // (on its legs it lands on the floor wherever it goes)
      return { dx: at ? o.tpX : 0, dy: at && o.form !== "grounded" ? o.tpY : 0, still: 1, grow: g, vis: g > 0.03 ? 1 : 0, sy: 1 + (1 - g) * 1.4, sx: 1 - (1 - g) * 0.5, quiet: a > 0 && a < 1 ? 1 : 0, armUp: 1 - g };
    },
    front(p, C, t, st) {
      const a = prog(o, t);
      if (a <= 0 || a >= 1) return;
      const g = scaleAt(a), f = (1 - g) * o.tpFlash;
      if (f <= 0.02) return;
      // a column of light where it goes and comes
      const x = st.x, y = st.y, H = o.size * 2.4 * f;
      p.glowLine(x, y - H, x, y + H * 0.6, 8, C[5], 0.35 * f);
      p.line(x, y - H, x, y + H * 0.6, (v) => (Math.abs(v - 0.6) < 0.25 ? WHITE : C[6]), (v) => f * Math.sin(Math.PI * v));
      p.glow(x, y, o.size * 1.6, WHITE, 0.4 * f);
      const r = rng(o.seed, 515);
      for (let i = 0; i < 8; i++) {
        const th = r.range(0, TAU) + a * 6, rr = o.size * (0.6 + 1.2 * (1 - f) + r.range(0, 0.4));
        p.px(x + Math.cos(th) * rr, y + Math.sin(th) * rr * 0.6, WHITE);
      }
    },
  };
};

A.nap = (o) => ({
  env(t) { const a = prog(o, t); return a <= 0 || a >= 1 ? 0 : plateau(a, 0.55); },
  mods(t) {
    const a = prog(o, t), e = this.env(t), wake = bump(a, 0.86, 0.97);
    const br = Math.sin(TAU * 3 * a) * 0.07 * o.napBreath * e;
    return { dy: o.napSink * e - wake * 8, sy: 1 + br - wake * 0.05, sx: 1 - br * 0.6 + wake * 0.05, shut: clamp(e * 1.4), glow: -0.25 * o.napDim * e, halo: 1 - 0.6 * o.napDim * e, lookY: 0.5 * e, quiet: a > 0 && a < 1 ? 1 : 0,
      hold: 0.8 * e, armUp: 0.8 * wake };
  },
  front(p, C, t, st) {
    const a = prog(o, t), e = this.env(t), n = Math.round(o.napBubbles);
    if (e < 0.5) return;
    // little bubbles of light drifting up off its head and popping
    for (let i = 0; i < n; i++) {
      const k = (((a - 0.25) * 2.2 + i / n) % 1 + 1) % 1, s = 1 + (i % 3);
      const x = st.x + o.size * 0.5 + Math.sin(k * 6 + i) * 3 + k * 8, y = st.y - o.size * 0.9 - k * o.size * 1.8;
      const al = Math.sin(Math.PI * k) * clamp((e - 0.5) * 3);
      if (al < 0.2) continue;
      for (let j = 0; j < 8 * s; j++) { const th = (j / (8 * s)) * TAU; p.dot(x + Math.cos(th) * s, y + Math.sin(th) * s, C[6], al); }
      p.dot(x - s * 0.4, y - s * 0.4, WHITE, al);
    }
  },
});

A.inflate = (o) => {
  const UP = 0.35, POP = UP + clamp(o.inflateHold, 0, 0.4);
  return {
    mods(t) {
      const a = prog(o, t);
      if (a <= 0 || a >= 1) return {};
      const big = o.inflateSize - 1;
      let g, j = 0;
      if (a < UP) g = 1 + big * ease.inOutQuad(a / UP);
      else if (a < POP) g = 1 + big + Math.sin((a - UP) * 60) * 0.015 * big;
      else {
        const k = seg(a, POP, POP + 0.06);
        g = 1 + big * (1 - ease.inQuad(k));
        const d = seg(a, POP + 0.06, 1);
        j = Math.sin(d * Math.PI * 7) * Math.exp(-d * 4) * (1 - d) * 0.35 * o.inflateJiggle * (k >= 1 ? 1 : 0);
      }
      return { grow: g, sx: 1 + j, sy: 1 - j, happy: a > UP * 0.6 && a < POP ? 1 : 0, glow: 0.2 * (g - 1), quiet: 1, armOpen: clamp((g - 1) / Math.max(0.01, big)) };
    },
    front(p, C, t, st) {
      const a = prog(o, t), f = bump(a, POP - 0.01, POP + 0.12);
      if (f <= 0.02) return;
      const r = o.size * o.inflateSize * (1 + seg(a, POP, POP + 0.12));
      for (let j = 0, m = Math.ceil(r * 4); j < m; j++) { const th = (j / m) * TAU; p.dot(st.x + Math.cos(th) * r, st.y + Math.sin(th) * r * 0.9, WHITE, f); }
      p.glowRing(st.x, st.y, r, 6, C[5], 0.3 * f);
    },
  };
};

// a dance: side to side on the beat, bouncing, wiggling, eyes squeezed happy, sparks popping on the beats
A.dance = (o) => {
  const n = () => Math.max(2, Math.round(o.danceBeats));
  const env = (t) => { const a = prog(o, t); return a <= 0 || a >= 1 ? 0 : plateau(a, 0.8); };
  return {
    mods(t) {
      const a = prog(o, t), e = env(t), b = Math.sin(Math.PI * n() * a), up = Math.abs(b);
      return { dx: o.danceAmp * b * e, dy: -o.danceBounce * up * e, rot: ((o.danceWiggle * Math.PI) / 180) * b * e, sy: 1 - 0.12 * (1 - up) * e, sx: 1 + 0.1 * (1 - up) * e, happy: e > 0.3 ? 1 : 0, quiet: a > 0 && a < 1 ? 1 : 0,
        armUp: e * (0.45 + 0.4 * up), armOpen: 0.3 * e * (1 - up) };
    },
    front(p, C, t, st) {
      const a = prog(o, t), e = env(t);
      if (e < 0.2 || o.danceSparkles <= 0) return;
      const f = (a * n()) % 1, beat = Math.floor(a * n()), side = beat % 2 ? 1 : -1, k = seg(f, 0, 0.5);
      if (k <= 0 || k >= 1) return;
      for (let i = 0; i < 3; i++) {
        const x = st.x + side * o.size * (1.3 + i * 0.25) + side * k * 6, y = st.y - o.size * (0.6 + i * 0.4) - k * 8;
        p.px(x, y, WHITE);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.dot(x + dx, y + dy, C[6], (1 - k) * o.danceSparkles);
        p.glow(x, y, 5, C[5], 0.4 * (1 - k) * o.danceSparkles);
      }
    },
  };
};

// a fright: a start with wide eyes, a scuttle back, trembling and small, then calming and coming back
A.scared = (o) => {
  const dir = o.scareSide === "right" ? 1 : -1;
  const shape = (a) => {
    if (a <= 0 || a >= 1) return { start: 0, back: 0, shake: 0 };
    return { start: bump(a, 0, 0.14), back: plateau(seg(a, 0.06, 0.94), 0.5), shake: plateau(seg(a, 0.15, 0.75), 0.6) };
  };
  return {
    mods(t) {
      const a = prog(o, t), k = shape(a), sh = k.shake * 2.2 * o.scareShake;
      return { dx: dir * o.scareRetreat * E(k.back) + (noise2(t * 35, 3, o.seed) - 0.5) * sh, dy: -k.start * 10 + (noise2(4, t * 35, o.seed) - 0.5) * sh * 0.6,
        grow: 1 - o.scareShrink * k.back, sy: 1 + k.start * 0.25, sx: 1 - k.start * 0.15, eyeScale: 1 + 0.45 * Math.max(k.start * 1.5, k.back * 0.8), lookX: -dir * k.back * 1.2, quiet: a > 0 && a < 1 ? 1 : 0,
        armUp: 0.8 * k.start, hold: 0.85 * k.back * (1 - k.start) };
    },
    front(p, C, t, st) {
      const a = prog(o, t), k = shape(a);
      if (k.shake < 0.3 || o.scareDrops <= 0) return;
      // cold sweat: drops flicked off its head
      for (let i = 0; i < 3; i++) {
        const f = ((a * 6 + i / 3) % 1), side = i % 2 ? 1 : -1;
        const x = st.x + side * (o.size * 0.7 + f * 10), y = st.y - o.size * 0.7 + f * f * 22 - f * 10;
        p.px(x, y, WHITE); p.dot(x, y + 1, C[5], o.scareDrops * (1 - f));
        p.glow(x, y, 3, C[5], 0.3 * (1 - f));
      }
    },
  };
};

// frozen: frost runs over it, its own time stops, ice spikes grow out of it; then they crack and fall
A.freeze = (o) => {
  const hold = clamp(o.freezeHold, 0, 0.7), r = (1 - hold) / 2, IN = r * 0.8, OUT0 = r + hold, SH = OUT0 + r * 0.45;
  const fz = (a) => (a <= 0 || a >= 1 ? 0 : a < IN ? E(a / IN) : a < OUT0 ? 1 : a < SH ? 1 : 1 - E(seg(a, SH, 1)));
  const spikes = (st) => {
    const g = rng(o.seed, 616), n = Math.round(o.freezeSpikes), out = [];
    for (let i = 0; i < n; i++) out.push({ th: g.range(0, TAU), len: g.range(0.6, 1.2), w: g.range(1.5, 3), fall: g.range(-1, 1) });
    return out;
  };
  return {
    mods(t) {
      const a = prog(o, t), f = fz(a), T = total(o), t0 = (o.lead + IN * 0.3 * (1 - 2 * o.lead)) * T;
      // its own clock slows to a stop, and runs on again where it left off
      const tw = a <= 0 || a >= 1 ? t : t0 + (t - t0) * (1 - f);
      const shake = bump(a, SH - 0.04, SH + 0.08);
      return { tw, glow: o.freezeTint * f * 0.7, halo: 1 + f * 0.5, dx: (noise2(t * 50, 7, o.seed) - 0.5) * 4 * shake, quiet: a > 0 && a < 1 ? 1 : 0 };
    },
    front(p, C, t, st) {
      const a = prog(o, t);
      if (a <= 0 || a >= 1 || o.freezeSpikes <= 0) return;
      const grow = E(seg(a, IN * 0.4, r)), broken = seg(a, SH - 0.02, 1);
      for (const s of spikes(st)) {
        const L = o.size * o.freezeLength * s.len * grow, base = o.size * 0.85, c = Math.cos(s.th), si = Math.sin(s.th);
        let bx = st.x + c * base, by = st.y + si * base;
        if (broken > 0) { bx += s.fall * broken * 20; by += broken * broken * 60; }
        const tip = [bx + c * L, by + si * L], al = 1 - broken;
        if (al <= 0.05 || L < 1) continue;
        const nx = -si * s.w, ny = c * s.w;
        p.poly([[bx + nx, by + ny], tip, [bx - nx, by - ny]], al > 0.5 ? C[6] : C[4], al);
        p.line(bx, by, tip[0], tip[1], WHITE, al);
        p.glow(tip[0], tip[1], 4, C[5], 0.3 * al);
      }
      // frost glinting over the skin
      const f = fz(a);
      if (f > 0.2 && broken === 0) {
        const g = rng(o.seed, 717);
        for (let i = 0; i < 12; i++) {
          const th = g.range(0, TAU), rr = g.range(0.2, 0.85) * o.size, tw = Math.sin(a * 40 + i * 2) > 0.6;
          if (tw) p.px(st.x + Math.cos(th) * rr, st.y + Math.sin(th) * rr, WHITE);
        }
      }
      if (o.freezeShatter > 0) {
        const k = seg(a, SH - 0.02, SH + 0.12);
        if (k > 0 && k < 1) p.glow(st.x, st.y, o.size * 2.4, WHITE, 0.5 * (1 - k) * o.freezeShatter);
      }
    },
  };
};

// a fall: it drops to the ground, bounces less and less, rests a moment, then floats back up to its spot
A.drop = (o) => {
  const n = Math.max(1, Math.round(o.dropBounces)), e = clamp(o.dropBounce, 0.1, 0.9);
  const FALL = 0.2, BOUNCE = 0.62, REST = 0.68;
  // bounce i: height H*e^(2i), time proportional to its square root
  const hs = Array.from({ length: n }, (_, i) => e ** (2 * (i + 1))), ts = hs.map((h) => Math.sqrt(h)), tsum = ts.reduce((a, b) => a + b, 0);
  const impactAt = [FALL];
  { let acc = FALL; ts.forEach((tt) => { acc += ((BOUNCE - FALL) * tt) / tsum; impactAt.push(acc); }); }
  const yAt = (a, H) => {
    if (a <= 0 || a >= 1) return { y: 0, imp: 0 };
    if (a < FALL) return { y: H * (a / FALL) ** 2, imp: 0 };
    if (a < BOUNCE) {
      for (let i = 0; i < n; i++) if (a < impactAt[i + 1]) { const g = (a - impactAt[i]) / (impactAt[i + 1] - impactAt[i]); return { y: H - H * hs[i] * 4 * g * (1 - g), imp: Math.max(0, 1 - g * 8) + Math.max(0, 1 - (1 - g) * 8) }; }
    }
    if (a < REST) return { y: H, imp: Math.max(0, 1 - (a - BOUNCE) * 40) };
    return { y: H * (1 - E(seg(a, REST, 1))), imp: 0 };
  };
  return {
    mods(t) {
      const a = prog(o, t), H = Math.max(0, o.dropFloor), k = yAt(a, H), q = k.imp * 0.35 * o.dropSquash;
      const rise = a > REST && a < 1 ? Math.sin(Math.PI * seg(a, REST, 1)) : 0;
      return { dy: k.y, sy: 1 - q + rise * 0.08, sx: 1 + q * 0.9 - rise * 0.04, shut: a > FALL && a < REST ? 0.0 : 0, happy: a > REST - 0.06 && a < REST + 0.1 ? 1 : 0, eyeScale: a > 0 && a < FALL ? 1.3 : 1, quiet: a > 0 && a < 1 ? 1 : 0,
        armUp: 0.9 * bump(a, 0, FALL + 0.04), armOpen: 0.6 * rise };
    },
    front(p, C, t, st) {
      const a = prog(o, t);
      if (a <= 0 || a >= 1 || o.dropDust <= 0) return;
      // a puff of light on each landing
      impactAt.forEach((ia, i) => {
        const k = seg(a, ia, ia + 0.06);
        if (k <= 0 || k >= 1) return;
        const strength = (i === 0 ? 1 : hs[i - 1] ** 0.5) * o.dropDust, gy = st.y + o.size * 0.9;
        for (let j = 0; j < 8; j++) {
          const side = j % 2 ? 1 : -1, sp = 0.4 + (j >> 1) * 0.25, x = st.x + side * (o.size * 0.6 + k * 26 * sp), y = gy - Math.sin(Math.PI * k) * 6 * sp;
          p.dot(x, y, k < 0.3 ? WHITE : C[5], (1 - k) * strength);
          p.glow(x, y, 4, C[5], 0.3 * (1 - k) * strength);
        }
        p.glow(st.x, gy, o.size * 1.5, C[6], 0.35 * (1 - k) * strength);
      });
    },
  };
};

// colours: its light runs round the colour wheel, then comes home to its own colours
A.rainbow = (o) => {
  const base = o.palette.map(hsl);
  const env = (t) => { const a = prog(o, t); return a <= 0 || a >= 1 ? 0 : plateau(a, 0.7); };
  return {
    palette(t) {
      const a = prog(o, t);
      if (a <= 0 || a >= 1) return o.palette;
      const sh = 360 * Math.max(1, Math.round(o.rainbowTurns)) * E(a), e = env(t);
      return base.map(([h, s, l]) => fromHsl((((h + sh) % 360) + 360) % 360, clamp(s * (1 + (o.rainbowSat - 1) * e) + 0.35 * o.rainbowSat * e * (1 - s)), l));
    },
    mods(t) { const a = prog(o, t), e = env(t); return { glow: 0.3 * o.rainbowGlow * e, halo: 1 + o.rainbowGlow * e, happy: e > 0.5 ? 1 : 0, quiet: a > 0 && a < 1 ? 1 : 0, armOpen: 0.8 * e }; },
    front(p, C, t, st) {
      const e = env(t), a = prog(o, t);
      if (e < 0.1 || o.rainbowSparkles <= 0) return;
      for (let i = 0; i < 10; i++) {
        const th = TAU * (i / 10 + a * 2), r = o.size * (1.5 + 0.25 * Math.sin(a * 20 + i)), x = st.x + Math.cos(th) * r, y = st.y + Math.sin(th) * r * 0.8;
        p.px(x, y, C[(i % 3) + 4]);
        p.glow(x, y, 4, C[5 + (i % 2)], 0.35 * e * o.rainbowSparkles);
      }
    },
  };
};

// a comet: it shoots off round one or more great loops in the sky, a tail of light behind it, and back
A.comet = (o) => {
  const dir = o.cometSide === "left" ? -1 : 1, n = () => Math.max(1, Math.round(o.cometLoops));
  const at = (a) => {
    if (a <= 0 || a >= 1) return [0, 0, 0];
    const th = TAU * n() * ease.inOutCubic(a), R = o.cometRadius;
    // a circle through its spot, out to the side: wide scenes have more room that way
    return [dir * R * (1 - Math.cos(th)), -R * Math.sin(th), th];
  };
  return {
    mods(t) {
      const a = prog(o, t), [dx, dy, th] = at(a), sp = Math.sin(Math.PI * a);
      return { dx, dy, rot: o.cometSpin > 0 ? dir * th : 0, sx: 1 + 0.2 * sp, sy: 1 - 0.12 * sp, glow: 0.3 * sp, quiet: a > 0 && a < 1 ? 1 : 0, still: 0 };
    },
    back(p, C, t, st) {
      const a = prog(o, t);
      if (a <= 0 || a >= 1 || o.cometTrail <= 0) return;
      const T = total(o), dt = 0.016 * T * Math.max(0.3, o.cometTrail), base = [st.x - this.mods(t).dx, st.y - this.mods(t).dy];
      for (let i = 1; i <= 16; i++) {
        const aa = prog(o, t - i * dt * 0.25);
        if (aa <= 0) break;
        const [dx, dy] = at(aa), k = 1 - i / 17, x = base[0] + dx, y = base[1] + dy;
        p.glow(x, y, o.size * (0.9 * k + 0.2), C[5], 0.4 * k * o.cometTrail * Math.sin(Math.PI * a) ** 0.5);
        if (k > 0.3) p.px(x + Math.sin(i * 7) * o.size * 0.3, y + Math.cos(i * 5) * o.size * 0.3, k > 0.5 ? WHITE : C[6]);
      }
    },
  };
};

// melting: it sinks into a puddle of light on the ground, rippling, then gathers itself back up
A.melt = (o) => {
  const env = (t) => { const a = prog(o, t); return a <= 0 || a >= 1 ? 0 : plateau(a, clamp(o.meltHold, 0, 0.8)); };
  return {
    mods(t) {
      const a = prog(o, t), e = env(t), back = a > 0.5 ? Math.sin(Math.PI * seg(a, 0.55, 1)) : 0;
      // (a figure pours itself into the puddle; on its legs the puddle lies on its floor)
      const w = o.meltWidth, fm = o.form === "human" || o.form === "grounded";
      return { dy: o.meltDrop * E(e), sx: 1 + (w - 1) * E(e) - back * 0.12, sy: 1 - 0.72 * E(e) + back * 0.25, shut: o.meltEyes === "closed" ? e : 0, happy: o.meltEyes === "happy" && e > 0.5 ? 1 : 0,
        morph: (fm ? 0.9 : 0.5) * e, shape: (th) => 1 / Math.sqrt((Math.cos(th) / 1.1) ** 2 + (Math.sin(th) / 0.9) ** 2) * (1 + 0.35 * Math.max(0, Math.sin(th)) ** 2), quiet: a > 0 && a < 1 ? 1 : 0 };
    },
    back(p, C, t, st) {
      const e = env(t), a = prog(o, t), n = Math.round(o.meltRipples);
      if (e < 0.4 || !n) return;
      // rings spreading over the puddle
      for (let i = 0; i < n; i++) {
        const k = ((a * 3 + i / n) % 1), r = o.size * (o.meltWidth * 0.8 + k * 1.6), al = (1 - k) * clamp((e - 0.4) * 2);
        for (let j = 0, m = Math.ceil(r * 4); j < m; j++) { const th = (j / m) * TAU; p.dot(st.x + Math.cos(th) * r, st.y + o.size * 0.25 + Math.sin(th) * r * 0.22, C[5], al * 0.8); }
      }
    },
  };
};

// curious: it glances about, leans and peeks one way then the other, eyes wide, edging forward a little
A.curious = (o) => {
  const n = () => Math.max(1, Math.round(o.curiousGlances));
  const env = (t) => { const a = prog(o, t); return a <= 0 || a >= 1 ? 0 : plateau(a, 0.75); };
  return {
    mods(t) {
      const a = prog(o, t), e = env(t), g = Math.sin(Math.PI * n() * a), lean = Math.sign(g) * Math.abs(g) ** 0.6;
      const peek = bump(((a * n()) % 1), 0.25, 0.75);
      return { dx: o.curiousPeek * lean * e, dy: -3 * peek * e, rot: o.curiousLean * lean * e, lookX: 1.4 * lean * e, lookY: -0.4 * peek * e, eyeScale: 1 + (o.curiousEyes - 1) * peek * e, quiet: a > 0 && a < 1 ? 1 : 0,
        hold: 0.5 * e * (1 - peek) };
    },
  };
};

// portals: it shoots a blue portal and an orange one into the scene, dives into the first and comes out of the
// second. While it goes through, half of it is at each portal: the part behind a portal's plane is cut away and
// shown coming out of the other one, turned the way that portal faces. Then it comes home (back through the
// portals, flying, or falling through them again and again first) and the portals close.
const RAMPS = new Map();
function portalRamp(c) {
  const key = String(c);
  if (!RAMPS.has(key)) {
    const [h, s] = hsl(c), sat = Math.max(0.55, s);
    RAMPS.set(key, [0.12, 0.26, 0.45, 0.62, 0.8, 0.93].map((l) => hex(fromHsl(h, sat, l))));
  }
  return RAMPS.get(key);
}
// draw only what isn't behind the given portals (local space): the blob going into a portal. A plane hides what
// lies behind it across the portal's width only (half), so a body passing beside a portal stays whole.
function clipped(p, planes, fn) {
  if (!planes || !planes.length) return fn();
  const ok = (sx, sy) => {
    const x = p.fromX(sx + 0.5, sy + 0.5), y = p.fromY(sx + 0.5, sy + 0.5);
    for (const q of planes) {
      if ((x - q.x) * q.nx + (y - q.y) * q.ny >= 0) continue;
      if (q.half == null || Math.abs((x - q.x) * q.tx + (y - q.y) * q.ty) <= q.half) return false;
    }
    return true;
  };
  const keep = {};
  for (const k of ["put", "add", "blendPx"]) {
    keep[k] = Object.prototype.hasOwnProperty.call(p, k) ? p[k] : undefined;
    const f = p[k];
    p[k] = function (sx, sy, ...r) { if (ok(sx, sy)) f.call(this, sx, sy, ...r); };
  }
  try { return fn(); } finally { for (const k in keep) { if (keep[k]) p[k] = keep[k]; else delete p[k]; } }
}

A.portal = (o) => {
  const S = o.size, h = 2 * S, L = S * Math.max(0.6, o.portalSize), W = Math.max(1.5, L * clamp(o.portalDepth, 0.05, 1));
  const mk = (x, y, deg, col, id) => { const a = ((+deg || 0) * Math.PI) / 180; return { id, x, y, a, nx: Math.cos(a), ny: Math.sin(a), tx: -Math.sin(a), ty: Math.cos(a), ramp: portalRamp(col) }; };
  const PA = mk(o.portalAX, o.portalAY, o.portalAAngle, o.portalColorA, 0), PB = mk(o.portalBX, o.portalBY, o.portalBAngle, o.portalColorB, 1);
  const other = (P) => (P === PA ? PB : PA);
  const wrap = (v) => v - TAU * Math.round(v / TAU);
  // the turn from going into pi to coming out of po
  const phi = (pi, po) => wrap(po.a - pi.a - Math.PI);
  const through = (pi, po, x, y) => {
    const f = phi(pi, po), c = Math.cos(f), s = Math.sin(f), dx = x - pi.x, dy = y - pi.y;
    return [po.x + dx * c - dy * s, po.y + dx * s + dy * c];
  };
  const plane = (P) => ({ x: P.x, y: P.y, nx: P.nx, ny: P.ny, tx: P.tx, ty: P.ty, half: L + S * 0.6 });
  // a leg of the trip: a curve from p0 to p3, leaving along d0 and arriving along d3 (travel directions, scaled to
  // the handle h) when given. Legs that meet share the junction's direction and handle, so the speed carries
  // through: out of a portal along its normal, into one against it, and through a waypoint along its heading.
  const leg = (p0, d0, p3, d3, from = null, to = null, lift = 0) => {
    const a = d0 ? [p0[0] + d0[0], p0[1] + d0[1]] : null, b = d3 ? [p3[0] - d3[0], p3[1] - d3[1]] : null;
    const p1 = a || [lerp(p0[0], (b || p3)[0], 1 / 3), lerp(p0[1], (b || p3)[1], 1 / 3) - lift];
    const p2 = b || [lerp(p3[0], (a || p0)[0], 1 / 3), lerp(p3[1], (a || p0)[1], 1 / 3) - lift];
    return { P: [p0, p1, p2, p3], from, to, R0: from ? phi(other(from), from) : 0 };
  };
  const out = (P) => [P.nx * h, P.ny * h], into = (P) => [-P.nx * h, -P.ny * h];
  const unit = (x, y, k = h) => { const d = Math.hypot(x, y) || 1; return [(x / d) * k, (y / d) * k]; };
  // a portal only lets it in from the side it opens on: from behind or beside, it goes round its edge first
  const behind = (X, P) => (X[0] - P.x) * P.nx + (X[1] - P.y) * P.ny < S * 0.5;
  const roundEdge = (X, P) => {
    const side = Math.sign((X[0] - P.x) * P.tx + (X[1] - P.y) * P.ty) || 1, w = L + S * 2.5;
    return [P.x + P.tx * side * w + P.nx * S * 2, P.y + P.ty * side * w + P.ny * S * 2, side];
  };
  const pathTo = (X, P) => {
    if (!behind(X, P)) return [leg(X, null, [P.x, P.y], into(P), null, P)];
    const [wx, wy, side] = roundEdge(X, P), d = unit(P.nx * 0.8 - P.tx * side * 0.6, P.ny * 0.8 - P.ty * side * 0.6);
    return [leg(X, null, [wx, wy], d), leg([wx, wy], d, [P.x, P.y], into(P), null, P)];
  };
  const pathFrom = (P, X) => {
    if (!behind(X, P)) return [leg([P.x, P.y], out(P), X, null, P)];
    const [wx, wy, side] = roundEdge(X, P), d = unit(-P.nx * 0.8 + P.tx * side * 0.6, -P.ny * 0.8 + P.ty * side * 0.6);
    return [leg([P.x, P.y], out(P), [wx, wy], d, P), leg([wx, wy], d, X, null)];
  };
  const bez = (P, u) => {
    const v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
    return [a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0], a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1]];
  };
  const H = [0, 0], Ac = [PA.x, PA.y], Bc = [PB.x, PB.y], Q = [PB.x + PB.nx * o.portalExit * S, PB.y + PB.ny * o.portalExit * S];
  // where it stops out of the orange portal stays inside the scene when the scene is known (and in front of the portal)
  if (Array.isArray(o.portalRoom)) {
    // no room straight out: lean the way out towards the scene, then come closer, until it fits
    const [x0, y0, x1, y1] = o.portalRoom, m = S * 1.3, fits = (x, y) => x >= x0 + m && x <= x1 - m && y >= y0 + m && y <= y1 - m;
    let found = fits(Q[0], Q[1]);
    for (let d = Math.max(o.portalExit, 1.7) * S; !found && d >= S * 1.7; d -= S * 0.25)
      for (const deg of [15, -15, 30, -30, 45, -45, 60, -60, 75, -75]) {
        const r = (deg * Math.PI) / 180, c = Math.cos(r), sn = Math.sin(r), x = PB.x + (PB.nx * c - PB.ny * sn) * d, y = PB.y + (PB.nx * sn + PB.ny * c) * d;
        if (fits(x, y)) { Q[0] = x; Q[1] = y; found = true; break; }
      }
  }
  const mode = o.portalMode === "fly" || o.portalMode === "loop" ? o.portalMode : "back";
  // the timetable, in the action's progress
  const shots = o.portalShots > 0, OA = [0.02, 0.11], OB = [0.11, 0.2], MV = [0.22, 0.86], CL = [0.88, 0.98];
  const openAt = (w) => (shots ? w[0] + (w[1] - w[0]) * 0.55 : w[0]);
  const runs = [];
  let holdW = null;
  if (mode === "loop") {
    const n = Math.max(1, Math.min(8, Math.round(o.portalLoops)));
    const legs = [...pathTo(H, PA)];
    for (let i = 1; i < n; i++) legs.push(leg(Bc, out(PB), Ac, into(PA), PB, PA));
    legs.push(...pathFrom(PB, H));
    runs.push({ t0: MV[0], t1: MV[1], legs });
  } else {
    const span = MV[1] - MV[0], hold = clamp(o.portalHold, 0, 0.6) * span, r = (span - hold) / 2;
    runs.push({ t0: MV[0], t1: MV[0] + r, legs: [...pathTo(H, PA), ...pathFrom(PB, Q)] });
    holdW = [MV[0] + r, MV[0] + r + hold];
    runs.push({ t0: MV[0] + r + hold, t1: MV[1], legs: mode === "fly" ? [leg(Q, null, H, null, null, null, o.portalArc * S)] : [...pathTo(Q, PB), ...pathFrom(PA, H)] });
  }
  // how open each portal is (0 shut .. 1 open), and its shot
  const openOf = (P, a) => {
    if (a <= 0 || a >= 1) return 0;
    const w = P === PA ? OA : OB;
    return Math.min(seg(a, openAt(w), w[1]), 1 - seg(a, CL[0], CL[1]));
  };
  // where it is (local space, idle included), how it's turned, which leg
  const core = (t) => {
    const a = prog(o, t);
    if (a <= 0 || a >= 1) return null;
    const id = idleState(o, t, null), ix = id.x, iy = id.y;
    const out = { a, ix, iy, x: ix, y: iy, rot: 0, leg: null, ex: {} };
    for (const P of [PA, PB]) {
      // a little kick back as it fires, eyes on where it aims
      const w = P === PA ? OA : OB, k = bump(a, w[0], w[1]);
      if (k > 0) {
        const dx = P.x - ix, dy = P.y - iy, d = Math.hypot(dx, dy) || 1;
        out.x -= (dx / d) * 3 * bump(a, w[0], openAt(w) + 0.02) * (shots ? 1 : 0);
        out.y -= (dy / d) * 3 * bump(a, w[0], openAt(w) + 0.02) * (shots ? 1 : 0);
        out.ex.lookX = (dx / d) * 1.3 * k; out.ex.lookY = (dy / d) * 0.9 * k;
        out.ex.reach = [P.x, P.y]; out.ex.reachK = k;
      }
    }
    for (const r of runs) {
      if (a < r.t0 || a > r.t1) continue;
      const s = E(seg(a, r.t0, r.t1)), n = r.legs.length, j = Math.min(n - 1, Math.floor(s * n)), u = s * n - j, lg = r.legs[j];
      const [px, py] = bez(lg.P, u), c = Math.min(E(clamp(s * n)), E(clamp((1 - s) * n)));
      out.x = px + (1 - c) * ix; out.y = py + (1 - c) * iy;
      out.rot = lg.R0 * (1 - E(u)); out.leg = lg;
      return out;
    }
    if (holdW && a >= holdW[0] && a <= holdW[1]) {
      // out the other side: it looks about, a little hop of joy
      const k = seg(a, holdW[0], holdW[1]), hop = bump(k, 0.2, 0.5) * o.portalLook;
      out.x = Q[0] + ix; out.y = Q[1] + iy - hop * 7;
      out.ex = { lookX: Math.sin(TAU * k) * 1.3 * o.portalLook, lookY: -0.3 * Math.sin(Math.PI * k) * o.portalLook, happy: hop > 0.2 ? 1 : 0, sy: 1 + bump(k, 0.5, 0.65) * -0.1 * o.portalLook };
      return out;
    }
    return out;
  };
  const e = 0.004;
  const tiltOf = (vx) => clamp(-vx / 60, -0.4, 0.4) * o.tilt;
  const stretchOf = (vy, u) => 1 + Math.abs(clamp(vy / 40, -1, 1) * o.stretch) * 0.12 - 0.04 * o.stretch * Math.cos(TAU * u * Math.max(0, Math.round(o.hoverTurns)) * 2);
  const mainM = (t) => {
    const C = core(t);
    if (!C) return {};
    return { ...C.ex, dx: C.x - C.ix, dy: C.y - C.iy, rot: C.rot, quiet: 1 };
  };
  // the same blob seen through a portal: placed and turned by the portal pair, and its own tilt and stretch
  // (which come from how it moves on screen) set to match the main one's, so both halves join
  const copyM = (pi, po) => (t) => {
    const C = core(t);
    if (!C) return {};
    const D = o.duration, C0 = core(t - e * D) || C, C1 = core(t + e * D) || C;
    const vx = (C1.x - C0.x) / (2 * e * D), vy = (C1.y - C0.y) / (2 * e * D), f = phi(pi, po), c = Math.cos(f), s = Math.sin(f);
    const wx = vx * c - vy * s, wy = vx * s + vy * c, u = (((t / D) % 1) + 1) % 1;
    const [x, y] = through(pi, po, C.x, C.y), k = stretchOf(vy, u) / stretchOf(wy, u);
    return { ...C.ex, dx: x - C.ix, dy: y - C.iy, rot: wrap(C.rot + tiltOf(vx) + f - tiltOf(wx)), sy: (C.ex.sy || 1) * k, sx: 1 / Math.sqrt(k), quiet: 1 };
  };
  // going through: close to the portal and inside its width
  const near = (C, P) => Math.hypot(C.x - P.x, C.y - P.y) < L + 3 * S && Math.abs((C.x - P.x) * P.tx + (C.y - P.y) * P.ty) < L + S * 0.3;
  const portalAt = (p, C, t, P, front) => {
    const a = prog(o, t), g = openOf(P, a);
    if (g <= 0.005) return;
    const R = P.ramp, Lg = L * ease.outBack(g, 1.4), Wg = Math.max(1, W * Math.min(1, g * 1.4)), gl = o.portalGlow;
    if (!front) {
      p.glow(P.x, P.y, Lg * 1.5, R[2], 0.28 * g * gl);
      p.glowLine(P.x - P.tx * Lg, P.y - P.ty * Lg, P.x + P.tx * Lg, P.y + P.ty * Lg, Wg + 5, R[3], 0.22 * g * gl);
    }
    const E2 = Math.ceil(Math.max(Lg, Wg)) + 1, x0 = Math.floor(P.x - E2), y0 = Math.floor(P.y - E2);
    const inside = (x, y) => { const dx = x - P.x, dy = y - P.y, u = (dx * P.tx + dy * P.ty) / Lg, v = (dx * P.nx + dy * P.ny) / Wg; return u * u + v * v <= 1; };
    const turn = a * TAU * 3 * o.portalSwirl;
    for (let y = y0; y <= y0 + 2 * E2; y++)
      for (let x = x0; x <= x0 + 2 * E2; x++) {
        const px = x + 0.5, py = y + 0.5;
        if (!inside(px, py)) continue;
        const dx = px - P.x, dy = py - P.y, u = (dx * P.tx + dy * P.ty) / Lg, v = (dx * P.nx + dy * P.ny) / Wg, th = Math.atan2(v, u);
        const rim = !inside(px - 1, py) || !inside(px + 1, py) || !inside(px, py - 1) || !inside(px, py + 1);
        if (rim) {
          // the near half of the rim (the side it goes into) passes in front of the blob
          if ((v < 0) !== front) continue;
          const spark = Math.sin(th * 4 - turn * 2 + P.id * 2) > 0.86;
          p.px(px, py, spark ? WHITE : v >= 0 ? R[5] : R[4]);
          continue;
        }
        if (front) continue;
        // inside: a swirl of its colour, deeper towards the middle
        const rr = Math.hypot(u, v), sw = Math.sin(th * 2 + rr * 7 * o.portalSwirl - turn) + (noise2(u * 2.5 + Math.cos(turn) * 0.6, v * 2.5 + Math.sin(turn) * 0.6, o.seed + 77 + P.id) - 0.5) * 1.4;
        let i = rr > 0.8 ? 4 : rr > 0.55 ? 3 : rr > 0.3 ? 2 : 1;
        if (o.portalSwirl > 0 && sw > 0.55) i = Math.min(5, i + 1);
        p.dot(px, py, R[i], clamp(g * 2.5));
      }
    if (front) {
      // the flash and splash of light when it opens
      const sk = a < 0.5 ? g : 0;
      if (sk > 0 && sk < 1 && o.portalSplash > 0) {
        const r = Lg * (1 + 0.8 * ease.outCubic(sk)), al = (1 - sk) * o.portalSplash;
        for (let j = 0, m = Math.ceil(r * 3); j < m; j++) {
          const th = (j / m) * TAU, x = P.x + P.tx * Math.cos(th) * r + P.nx * Math.sin(th) * Wg * (1 + sk), y = P.y + P.ty * Math.cos(th) * r + P.ny * Math.sin(th) * Wg * (1 + sk);
          p.dot(x, y, sk < 0.3 ? WHITE : R[4], clamp(al));
        }
        p.glow(P.x, P.y, Lg * 1.2, WHITE, 0.4 * clamp(al));
      }
      // sparks drifting out of its face
      const n = Math.round(10 * o.portalSparks);
      for (let i = 0; i < n; i++) {
        const q = rng(o.seed, 811 + P.id * 97, i), k = (a * 7 * q.range(0.6, 1.4) + q.range(0, 1)) % 1, side = q.range(-0.85, 0.85);
        const out = k * S * q.range(0.8, 1.8), x = P.x + P.tx * side * Lg + P.nx * (out + 1) + Math.sin(k * 9 + i) * 1.5 * P.tx, y = P.y + P.ty * side * Lg + P.ny * (out + 1) + Math.sin(k * 9 + i) * 1.5 * P.ty;
        const al = (1 - k) * g;
        if (al < 0.15) continue;
        p.dot(x, y, k < 0.25 ? WHITE : R[i % 2 ? 4 : 5], clamp(al * 1.5));
        if (i % 3 === 0) p.glow(x, y, 4, R[3], 0.3 * al);
      }
    }
  };
  return {
    pts: [Ac, Bc],
    mods: mainM,
    copies(t) {
      const C = core(t), main = (tt) => mainM(tt);
      main.clip = [];
      const list = [main];
      if (C && C.leg) {
        for (const P of [C.leg.to, C.leg.from]) {
          if (!P || !near(C, P)) continue;
          main.clip.push(plane(P));
          const cp = copyM(P, other(P));
          // what's seen through the other portal never shows behind it, beside it included
          cp.clip = [{ ...plane(other(P)), half: null }];
          list.push(cp);
        }
      }
      return list;
    },
    back(p, C, t) {
      const c = core(t);
      if (!c) return;
      portalAt(p, c, t, PA, false); portalAt(p, c, t, PB, false);
    },
    front(p, C, t, st) {
      const c = core(t);
      if (!c) return;
      portalAt(p, c, t, PA, true); portalAt(p, c, t, PB, true);
      if (!shots) return;
      // the shots: a bolt of each portal's colour from the blob to where the portal opens
      for (const P of [PA, PB]) {
        const w = P === PA ? OA : OB, k = seg(c.a, w[0], openAt(w));
        if (k <= 0 || k >= 1) continue;
        // (from its hand, when it has hands)
        const R = P.ramp, hd = st.hands ? st.hands.reduce((b, h) => (Math.hypot(h[0] - P.x, h[1] - P.y) < Math.hypot(b[0] - P.x, b[1] - P.y) ? h : b)) : null, fx = hd ? hd[0] : st.x, fy = hd ? hd[1] : st.y;
        const at = (q) => { const kk = ease.inQuad(clamp(q)); return [lerp(fx, P.x, kk), lerp(fy, P.y, kk)]; };
        const [hx, hy] = at(k), [ex, ey] = at(k - 0.22);
        // a streak of its colour, a bright head
        p.line(ex, ey, hx, hy, (v) => (v > 0.8 ? WHITE : v > 0.45 ? R[5] : R[4]), (v) => v);
        p.glowLine(ex, ey, hx, hy, 4, R[3], 0.4);
        p.disc(hx, hy, 2.2, R[4], 1);
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) p.px(hx + dx, hy + dy, dx || dy ? R[5] : WHITE);
        p.glow(hx, hy, 12, R[3], 0.7);
        p.glow(hx, hy, 5, WHITE, 0.4);
        p.glow(fx, fy, S * 1.4, R[3], 0.4 * bump(k, 0, 0.5));
      }
    },
  };
};

// the motes around it follow where it goes (not when it blinks out and in)
function drift(act, t) {
  if (act.copies) return [0, 0];
  const m = act.mods(t);
  // (ax, ay: it went somewhere else, all of it)
  return m.still ? [0, 0] : [(m.dx || 0) + (m.ax || 0), Math.min(0, m.dy || 0) * 0.5 + Math.max(0, m.dy || 0) + (m.ay || 0)];
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

// an action its form can't do: it just rests in that form
const REST = { mods: () => ({}) };
function actionOf(o) {
  return fitsForm(o) ? (A[o.action] || A.walk)(o) : REST;
}

export function drawBack(p, t, o) {
  const C0 = actionOf(o), C = fit(C0.palette ? C0.palette(t) : o.palette, 8), act = actionOf(o), list = act.copies ? act.copies(t) : [(tt) => act.mods(tt)], T = total(o);
  let st = null;
  // (on a floor: the first draws it, the copies only their reflection in it)
  list.forEach((M, i) => { const s = clipped(p, M.clip, () => bodyBack(p, t, o, M, C, T, i ? 1 : 0)); if (i === 0) st = s; });
  bodyAmbient(p, t, o, false, C, drift(act, t));
  if (act.back) act.back(p, C, t, st);
}

export function draw(p, t, o) {
  const C0 = actionOf(o), C = fit(C0.palette ? C0.palette(t) : o.palette, 8), act = actionOf(o), list = act.copies ? act.copies(t) : [(tt) => act.mods(tt)], T = total(o);
  let st = null;
  // copies drawn back to front by height, so the lower ones cover the higher
  const order = list.map((M, i) => [M, M(t).dy || 0, i]).sort((x, y) => x[1] - y[1]);
  for (const [M, , i] of order) { const s = clipped(p, M.clip, () => bodyFront(p, t, o, M, C, T)); if (i === 0) st = s; }
  bodyAmbient(p, t, o, true, C, drift(act, t));
  if (act.front) act.front(p, C, t, st);
}

/** The stroll's stops, as offsets from its spot in its own pixels (first and last are home). */
export function walkRoute(o) { return A.walk(o).pts; }
/** Where the two portals are, as offsets from its spot in its own pixels: [blue, orange]. */
export function portalSpots(o) { return A.portal(o).pts; }
