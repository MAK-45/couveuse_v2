// The blob busy with something, forever: sleeping, casting magic, conjuring objects that come and go, juggling,
// meditating, dancing, bouncing, flying a round, singing, blowing bubbles of light. Each runs over a whole number
// of the blob's own loops with its rest going on underneath, every rhythm a whole number of beats a loop, every
// particle on the loop's clock: the GIF loops with no seam.
// Each also has an entry from the Blob né's rest and an exit back to it (o.part "enter" / "exit"), so it can be lived:
// rest -> entry -> the loop, as many times as you like -> exit -> rest, every join exact (see the end of this file).
// In one of the transformation's new forms (o.form "human" or "grounded") the figure does them, with its arms (raised
// for magic, holding the book, on the rope of the swing...); on its legs it keeps to its floor (it sits down
// cross-legged to sleep or meditate) and the two that need flying can't be done (FORM_FIT).
import { fit, clamp, lerp, seg, bump, ease, noise2, rng, cycle, TAU, WHITE, hex } from "../../pixelfx/src/core/index.js";
import { meta as idleMeta } from "./ice-blob-idle.js";
import { bodyBack, bodyFront, bodyAmbient, formCentre, formAnchor, gaitPlan, gaitLine, isForm, FORM_DEFAULTS } from "./ice-blob-transform.js";
import { phases, settle, DROP_LIFE } from "./ice-time.js";
import { drawObject } from "./ice-scene-objects.js";
import { hsl, fromHsl } from "./ice-blob-actions.js";

export const LOOPS = ["sleep", "magic", "conjure", "juggle", "meditate", "dance", "bounce", "orbit", "sing", "bubbles", "read", "draw", "rain", "stars", "hiccup", "top", "swing", "firefly", "walk", "run"];
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
  grounded: {
    orbit: "Il fait le tour de la scène en volant : au sol, il ne peut pas voler.",
    top: "Il tournoie sur lui-même comme une toupie, à plat : debout sur ses jambes, la gravité l’en empêche.",
  },
};
export const fitsForm = (o, name = o.loop) => !(FORM_FIT[o.form] && FORM_FIT[o.form][name]);
/** The three parts of a loop: the loop itself, its entry from rest, its exit back to rest. */
export const PARTS = ["loop", "enter", "exit"];
/** Loops that can't have an entry and an exit yet, and why (they play as a loop only). None now: walking and running
 * start with their first steps and stop with their last (see gaitParts at the end of this file). */
export const PART_FIT = {};
export const hasParts = (name) => !PART_FIT[name];

export const meta = {
  name: "Ice blob loops",
  desc: "The ice blob busy forever: sleeping, casting magic, conjuring objects, juggling, meditating, dancing, bouncing, flying a round, singing, blowing light bubbles.",
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
    conjureCount: 3, conjureShape: "cycle", conjureRadius: 50, conjureSize: 10, conjureStyle: "halo", conjureHold: 0.55,
    juggleCount: 3, juggleThrows: 4, juggleHeight: 58, juggleWidth: 26, juggleShape: "sphere", juggleSize: 7,
    medRise: 14, medRings: 2, medOrbs: 5, medOrbit: 1.8, medSpin: 0, medGlow: 1,
    danceBeats: 8, danceAmp: 12, danceBounce: 6, danceWiggle: 20, danceSparkles: 1,
    bounceCount: 4, bounceHeight: 30, bounceFlips: 0, bounceSquash: 1, bounceDust: 1,
    orbitPath: "circle", orbitRX: 90, orbitRY: 40, orbitTurns: 1, orbitSide: "right", orbitTrail: 1, orbitBank: 1,
    singBeats: 8, singNotes: 8, singSway: 6, singHue: 40, singBounce: 3, singNoteSize: 2,
    bubbleCount: 6, bubbleSize: 5, bubbleSide: "right", bubbleDrift: 70, bubblePop: 1,
    readPages: 3, readSize: 30, readGlow: 1, readHue: 0, readNod: 1,
    drawShape: "heart", drawSize: 18, drawCount: 2, drawSide: "right", drawHold: 0.3, drawHue: 0,
    rainDrops: 60, rainCloud: 22, rainHeight: 34, rainMood: "happy", rainSplash: 1, rainHue: 0,
    starsCount: 40, starsShoot: 3, starsTrail: 1, starsArea: 140, starsWonder: 1,
    hicCount: 3, hicStrength: 10, hicBubble: 1, hicSurprise: 1,
    topTurns: 4, topWobble: 0.25, topStretch: 0.3, topTrail: 1, topDrift: 6,
    swingAngle: 35, swingCount: 2, swingLength: 60, swingRope: 1,
    flyCount: 1, flyTurns: 2, flyRadius: 34, flyHue: 60, flyGlow: 1, flyFollow: 1,
    // walk and run on the spot (on its legs): as in Action monde, its floor of ice going by under its feet
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
// in a new form: where its head is (bubbles of sleep, notes, hiccups come from it) and what is under it
const formed = (o) => o.form === "human" || o.form === "grounded", gnd = (o) => o.form === "grounded";
const headAt = (st, o, x, y) => (st.head ? [st.head[0] + st.headR * 0.8 + (x - st.x - o.size * 0.55) * 0.6, st.head[1] - st.headR * 0.9 + (y - st.y + o.size * 0.85)] : [x, y]);
const under = (st) => (st.floor != null ? st.floor - 1 : Math.max(...st.feet.map((f) => f[1])) + 3);
const spark = (p, C, x, y, a = 1) => { p.px(x, y, WHITE); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.dot(x + dx, y + dy, C[6], a); p.glow(x, y, 4, C[5], 0.35 * a); };
const ring = (p, x, y, rx, ry, c, a, filter) => { for (let j = 0, m = Math.ceil(Math.max(rx, ry) * 6); j < m; j++) { const th = (j / m) * TAU; if (!filter || filter(th)) p.dot(x + Math.cos(th) * rx, y + Math.sin(th) * ry, c, a); } };
// tiny pixel glyphs: runes for the magic, notes for the song
const GLYPHS = {
  runes: [["01110", "10001", "10101", "10001", "01110"], ["00100", "01110", "10101", "00100", "00100"], ["10001", "01010", "00100", "01010", "10001"],
    ["11111", "00100", "01110", "00100", "11111"], ["01010", "11111", "01010", "11111", "01010"], ["00100", "01010", "10001", "01010", "00100"]],
  notes: [["0011", "0010", "0010", "1110", "1110"], ["011111", "010001", "010001", "110011", "110011"], ["0110", "0101", "0100", "1100", "1100"]],
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

// ---- conjuring: objects pop into the air round it one after another, turn a while, and vanish
L.conjure = (o) => {
  const SH = ["cube", "sphere", "pyramid", "crystal", "column", "gem"];
  const slot = (o, t) => { const n = whole(o.conjureCount), ph = phase(o, t), i = Math.floor(ph * n) % n; return { n, i, k: ph * n - Math.floor(ph * n) }; };
  // spots round its head, one side then the other: above left, above right, high, lower left...
  const SPOTS = [-2.35, -0.8, -1.57, -2.8, -0.35, -1.95, -1.2];
  const where = (o, i, n) => { const th = SPOTS[i % SPOTS.length]; return [Math.cos(th) * o.conjureRadius, Math.sin(th) * o.conjureRadius * 0.75]; };
  const hold = clamp(o.conjureHold, 0.1, 0.8), IN = (1 - hold) * 0.45, OUT = IN + hold;
  const obAt = (o, i, n) => { const [x, y] = where(o, i, n); return { shape: o.conjureShape === "cycle" ? SH[i % SH.length] : o.conjureShape, x, y, size: o.conjureSize, spinY: 1, spinX: i % 3 === 2 ? 1 : 0, tilt: 0.4, float: 2, floatTurns: 1, hue: o.conjureShape === "cycle" ? (i * 47) % 360 : 0, glow: 1, ph: i * 0.37 }; };
  return {
    mods(t) {
      const { n, i, k } = slot(o, t), [x, y] = where(o, i, n), cast = bump(k, 0, IN + 0.05), d = Math.hypot(x, y) || 1;
      return { lookX: (x / d) * 1.5, lookY: (y / d) * 1.1, dx: (x / d) * 3 * cast, dy: (y / d) * 2 * cast, glow: 0.35 * cast, happy: k > OUT - 0.05 && k < OUT + 0.15 ? 1 : 0, quiet: 1,
        reach: [x, y], reachK: bump(k, 0, IN + 0.15) };
    },
    front(p, C, t, st) {
      const { n, i, k } = slot(o, t), ob = obAt(o, i, n), [ox, oy] = [ob.x, ob.y];
      const grow = seg(k, IN * 0.5, IN), gone = seg(k, OUT, OUT + (1 - OUT) * 0.7);
      // the light gathering, the pop, the object, its going
      if (k < IN) { const g = seg(k, 0, IN); p.glow(ox, oy, o.conjureSize * (1 + 2 * g), C[5], 0.5 * g); for (let j = 0; j < 8; j++) { const th = (j / 8) * TAU + k * 8, r = o.conjureSize * 3 * (1 - g); spark(p, C, ox + Math.cos(th) * r, oy + Math.sin(th) * r, g); } }
      if (grow > 0 && gone < 1) {
        const style = o.conjureStyle, sc = grow < 1 ? ease.outBack(grow, 1.8) : style === "implode" ? 1 - ease.inBack(gone, 1.5) : 1;
        if (style === "sparkle" && gone > 0) drawObject(p, o, ob, t, { clip: (x, y) => { const v = Math.sin(Math.floor(x) * 127.1 + Math.floor(y) * 311.7) * 43758.5; return v - Math.floor(v) > gone; } });
        else drawObject(p, o, ob, t, { scale: sc * (style === "halo" ? 1 + gone * 0.4 : 1), tint: style === "halo" ? Math.max(1 - grow, gone) : 1 - grow });
      }
      const fl = bump(k, IN - 0.03, IN + 0.1) + (o.conjureStyle !== "sparkle" ? bump(k, OUT + (1 - OUT) * 0.55, OUT + (1 - OUT) * 0.85) : 0);
      if (fl > 0) p.glow(ox, oy, o.conjureSize * 3, WHITE, 0.5 * fl);
      if (o.conjureStyle === "sparkle" && gone > 0 && gone < 1) for (let j = 0; j < 8; j++) spark(p, C, ox + Math.sin(j * 2.1) * o.conjureSize, oy - gone * o.conjureSize * 2 + Math.cos(j * 1.7) * 4, 1 - gone);
    },
  };
};

// ---- juggling: little solids thrown up from one side, caught on the other, round and round
L.juggle = (o) => {
  const n = whole(o.juggleCount, 2), c = whole(o.juggleThrows);
  const posOf = (ph, i) => {
    const s = (((ph * c + i / n) % 1) + 1) % 1, W = o.juggleWidth, base = -o.size * 0.2;
    if (s < 0.7) { const g = s / 0.7; return [lerp(-W, W, g), base - o.juggleHeight * 4 * g * (1 - g), true]; }
    const g = (s - 0.7) / 0.3; return [lerp(W, -W, g), base + 6 * Math.sin(Math.PI * g) - 2, false];
  };
  return {
    mods(t) {
      const ph = phase(o, t), thr = (ph * c * n) % 1, kick = bump(thr, 0, 0.2);
      let hi = [0, -1];
      for (let i = 0; i < n; i++) { const [x, y] = posOf(ph, i); if (y < hi[1] * 50) hi = [x, y / 50]; }
      return { dy: kick * 2.5, sy: 1 - 0.07 * kick, sx: 1 + 0.05 * kick, lookX: clamp(hi[0] / (o.juggleWidth || 1)) * 1.1, lookY: -0.9, happy: 0, quiet: 1, hold: 0.55, armOpen: 0.25 + 0.1 * kick };
    },
    draw(p, C, t, st, front) {
      // (a figure throws them from its hands)
      const ph = phase(o, t), hy = st.hands && st.hands.length ? (st.hands[0][1] + st.hands[st.hands.length - 1][1]) / 2 - st.y + o.size * 0.2 - 3 : 0;
      for (let i = 0; i < n; i++) {
        const [x, y0, up] = posOf(ph, i), y = y0 + hy;
        if (up !== !front && !front) continue;
        if (front && up) {
          drawObject(p, o, { shape: o.juggleShape === "cycle" ? ["sphere", "cube", "gem", "crystal", "pyramid"][i % 5] : o.juggleShape, x: st.x + x, y: st.y + y, size: o.juggleSize, spinY: 2, spinX: 1, tilt: 0.3, float: 0, floatTurns: 0, hue: o.juggleShape === "cycle" ? i * 70 : 0, glow: 1, ph: i / n }, t);
        } else if (!front && !up) {
          drawObject(p, o, { shape: o.juggleShape === "cycle" ? ["sphere", "cube", "gem", "crystal", "pyramid"][i % 5] : o.juggleShape, x: st.x + x, y: st.y + y, size: o.juggleSize, spinY: 2, spinX: 1, tilt: 0.3, float: 0, floatTurns: 0, hue: o.juggleShape === "cycle" ? i * 70 : 0, glow: 1, ph: i / n }, t);
        }
      }
    },
    back(p, C, t, st) { this.draw(p, C, t, st, false); },
    front(p, C, t, st) { this.draw(p, C, t, st, true); },
  };
};

// ---- meditation: risen, eyes shut, turning slowly perhaps, orbs of light circling it, rings breathing out
L.meditate = (o) => ({
  mods(t) {
    const ph = phase(o, t);
    // (a figure sits cross-legged in the air, hands down; on its legs it sits so on its floor)
    return { dy: -o.medRise + Math.sin(TAU * 2 * ph) * 2.5, shut: 1, glow: 0.2 * o.medGlow, halo: 1 + 0.6 * o.medGlow, rot: TAU * Math.round(o.medSpin) * ph, sy: 1 + 0.03 * Math.sin(TAU * 2 * ph), quiet: 1,
      legs: "lotus", arms: "down", ...(gnd(o) ? { seat: 1, rot: 0 } : {}) };
  },
  orbs(p, C, t, st, front) {
    const ph = phase(o, t), n = whole(o.medOrbs, 0), R = o.size * o.medOrbit;
    for (let i = 0; i < n; i++) {
      const th = TAU * (ph * 2 + i / n), d = Math.sin(th);
      if ((d >= 0) !== front) continue;
      const x = st.x + Math.cos(th) * R, y = st.y + d * R * 0.3 + Math.sin(th * 2 + i) * 2;
      p.disc(x, y, front ? 2 : 1.5, front ? WHITE : C[6], 1);
      p.glow(x, y, 6, C[5], front ? 0.45 : 0.25);
    }
  },
  back(p, C, t, st) {
    const ph = phase(o, t), n = whole(o.medRings, 0);
    for (let i = 0; i < n; i++) {
      const k = (((ph * n - i / n) % 1) + 1) % 1 % 1, r = o.size * (1.2 + 2.6 * ease.outCubic(k));
      ring(p, st.x, st.y, r, r * 0.9, k < 0.2 ? WHITE : C[5], (1 - k) * 0.8);
      p.glowRing(st.x, st.y, r, 4, C[5], 0.2 * (1 - k) * o.medGlow);
    }
    p.glowLine(st.x, st.y - o.size * 4, st.x, st.y + o.size * 2, o.size * 0.8, C[4], 0.08 * o.medGlow);
    this.orbs(p, C, t, st, false);
  },
  front(p, C, t, st) { this.orbs(p, C, t, st, true); },
});

// ---- dancing, for ever
L.dance = (o) => {
  const n = () => whole(o.danceBeats, 2) * 2;
  return {
    mods(t) {
      const ph = phase(o, t), b = Math.sin(Math.PI * n() * ph), up = Math.abs(b);
      return { dx: o.danceAmp * b, dy: -o.danceBounce * up, rot: ((o.danceWiggle * Math.PI) / 180) * b, sy: 1 - 0.12 * (1 - up), sx: 1 + 0.1 * (1 - up), happy: 1, quiet: 1, armUp: 0.45 + 0.4 * up, armOpen: 0.3 * (1 - up) };
    },
    front(p, C, t, st) {
      if (o.danceSparkles <= 0) return;
      const ph = phase(o, t), f = (ph * n()) % 1, beat = Math.floor(ph * n()), side = beat % 2 ? 1 : -1, k = seg(f, 0, 0.6);
      if (k <= 0 || k >= 1) return;
      for (let i = 0; i < 3; i++) spark(p, C, st.x + side * o.size * (1.3 + i * 0.25) + side * k * 6, st.y - o.size * (0.6 + i * 0.4) - k * 8, (1 - k) * o.danceSparkles);
    },
  };
};

// ---- bouncing in place like a ball, flips if it likes
L.bounce = (o) => {
  const n = () => whole(o.bounceCount);
  const at = (ph) => { const f = (ph * n()) % 1, air = 0.72, r0 = (1 - air) / 2; return { f, air, r0, g: seg(f, r0, r0 + air) }; };
  return {
    mods(t) {
      const ph = phase(o, t), { f, r0, air, g } = at(ph), q = o.bounceSquash;
      if (f < r0) { const c = Math.sin((f / r0) * Math.PI * 0.5); return { sy: 1 - 0.28 * q * c, sx: 1 + 0.2 * q * c, dy: 2 * c, quiet: 1 }; }
      if (f < r0 + air) { const h = 4 * g * (1 - g); return { dy: -o.bounceHeight * h, sy: 1 + 0.2 * q * (1 - h), sx: 1 - 0.12 * q * (1 - h), rot: TAU * Math.round(o.bounceFlips) * ease.inOutQuad(g), happy: g > 0.25 && g < 0.75 ? 1 : 0, quiet: 1, armUp: 0.7 * Math.sin(Math.PI * g) }; }
      const c = Math.sin(((f - r0 - air) / (1 - r0 - air)) * Math.PI * 0.5 + Math.PI * 0.5);
      return { sy: 1 - 0.28 * q * c, sx: 1 + 0.2 * q * c, dy: 2 * c, quiet: 1 };
    },
    front(p, C, t, st) {
      if (o.bounceDust <= 0) return;
      const ph = phase(o, t), { f, r0, air } = at(ph), k = f > r0 + air ? (f - r0 - air) / (1 - r0 - air) : f < r0 ? 1 + f / r0 : 2;
      const kk = k <= 1 ? k * 0.5 : k < 2 ? 0.5 + (k - 1) * 0.5 : 2;
      if (kk >= 1) return;
      const gy = st.feet ? under(st) : st.y + o.size * 0.95;
      for (let j = 0; j < 8; j++) { const side = j % 2 ? 1 : -1, sp = 0.4 + (j >> 1) * 0.25; p.dot(st.x + side * (o.size * 0.6 + kk * 24 * sp), gy - Math.sin(Math.PI * kk) * 5 * sp, C[5], (1 - kk) * o.bounceDust); }
      p.glow(st.x, gy, o.size * 1.4, C[6], 0.3 * (1 - kk) * o.bounceDust);
    },
  };
};

// ---- a round: it flies a loop through its spot (a circle, an eight, an infinity), a trail of light behind
L.orbit = (o) => {
  const dir = o.orbitSide === "left" ? -1 : 1;
  const at = (ph) => {
    const th = TAU * whole(o.orbitTurns) * ph, X = o.orbitRX, Y = o.orbitRY;
    if (o.orbitPath === "eight") return [dir * X * Math.sin(th), -Y * Math.sin(2 * th) * 0.5];
    if (o.orbitPath === "infinity") return [dir * X * Math.sin(th) / (1 + Math.cos(th) ** 2) * 1.2, -Y * Math.sin(th) * Math.cos(th) / (1 + Math.cos(th) ** 2) * 1.6];
    return [dir * X * Math.sin(th), -Y * (1 - Math.cos(th))];
  };
  return {
    at,
    mods(t) {
      const ph = phase(o, t), [x, y] = at(ph), [x1, y1] = at(ph + 0.002), vx = x1 - x;
      return { dx: x, dy: y, rot: clamp(vx * 0.5, -0.5, 0.5) * o.orbitBank, sx: 1 + Math.min(0.15, Math.abs(vx) * 0.04), quiet: 1, still: 0, armOpen: 0.7 };
    },
    back(p, C, t, st) {
      if (o.orbitTrail <= 0) return;
      const ph = phase(o, t), [x0, y0] = at(ph), bx = st.x - x0, by = st.y - y0;
      for (let i = 1; i <= 18; i++) {
        const [x, y] = at(ph - i * 0.006 * o.orbitTrail), k = 1 - i / 19;
        p.glow(bx + x, by + y, o.size * (0.8 * k + 0.2), C[5], 0.3 * k);
        if (i % 3 === 0) p.px(bx + x + Math.sin(i * 7) * 3, by + y + Math.cos(i * 5) * 3, k > 0.5 ? WHITE : C[6]);
      }
    },
  };
};

// ---- singing: swaying to the beat, eyes squeezed happy, notes of light floating off it
L.sing = (o) => {
  const n = () => whole(o.singBeats, 2);
  return {
    mods(t) {
      const ph = phase(o, t), b = Math.sin(TAU * n() * ph * 0.5), beat = Math.abs(Math.sin(Math.PI * n() * ph));
      return { dx: o.singSway * b, rot: 0.18 * b, dy: -o.singBounce * beat, sy: 1 + 0.06 * beat, sx: 1 - 0.04 * beat, happy: 1, quiet: 1, hold: 0.5 * (1 - beat), armOpen: 0.55 * beat };
    },
    front(p, C0, t, st) {
      const C = shifted(C0, o.singHue), ph = phase(o, t), m = whole(o.singNotes, 0);
      for (let i = 0; i < m; i++) {
        const k = (((ph - i / m) % 1) + 1) % 1 / 0.5;
        if (k >= 1) continue;
        const side = i % 2 ? 1 : -1, x = (st.head ? st.head[0] : st.x) + side * (o.size * 0.9 + k * 22) + Math.sin(k * 9 + i) * 3, y = (st.head ? st.head[1] + o.size * 0.3 : st.y) - o.size * 0.6 - k * o.size * 2.2;
        const a = Math.sin(Math.PI * Math.min(1, k * 1.1));
        glyph(p, GLYPHS.notes[i % GLYPHS.notes.length], x, y, k < 0.5 ? WHITE : C[6], a, Math.max(1, Math.round(o.singNoteSize)));
        p.glow(x, y, 6, C[5], 0.35 * a);
      }
    },
  };
};

// ---- bubbles: it puffs out bubbles of light that wobble away and pop
L.bubbles = (o) => {
  const dir = o.bubbleSide === "left" ? -1 : o.bubbleSide === "up" ? 0 : 1, n = () => whole(o.bubbleCount);
  return {
    mods(t) {
      const ph = phase(o, t), f = (ph * n()) % 1, puff = bump(f, 0, 0.18);
      return { sx: 1 - 0.1 * puff, sy: 1 + 0.08 * puff, dx: -dir * puff * 2, lookX: dir * 0.8, happy: f > 0.2 && f < 0.5 ? 1 : 0, quiet: 1, hold: 0.3 + 0.4 * puff };
    },
    front(p, C, t, st) {
      const ph = phase(o, t), m = n(), g = rng(o.seed, 333);
      for (let i = 0; i < m; i++) {
        const born = i / m, k = (((ph - born) % 1) + 1) % 1 / 0.6, s = o.bubbleSize * g.range(0.7, 1.3), up = g.range(0.4, 1);
        if (k >= 1) continue;
        // (a figure blows them from its mouth)
        const D = o.bubbleDrift, [bx, by] = st.head ? [st.head[0] - (dir ? dir * (o.size * 0.9 - st.headR * 0.8) : 0), st.head[1] + st.headR * 0.45 + o.size * 0.1] : [st.x, st.y];
        const x = bx + (dir ? dir * (o.size * 0.9 + k * D) : Math.sin(k * 6 + i) * 6) + Math.sin(k * 10 + i) * 2;
        const y = by - o.size * 0.1 - k * D * (dir ? 0.6 * up : 1.1);
        const r = s * Math.min(1, k * 6);
        if (k < 0.9) {
          ring(p, x, y, r * (1 + 0.08 * Math.sin(k * 30)), r * (1 - 0.08 * Math.sin(k * 30)), C[6], 0.95);
          p.dot(x - r * 0.45, y - r * 0.45, WHITE, 1);
          p.glow(x, y, r + 3, C[5], 0.2);
        } else if (o.bubblePop > 0) {
          const q = (k - 0.9) / 0.1;
          for (let j = 0; j < 6; j++) { const th = (j / 6) * TAU; spark(p, C, x + Math.cos(th) * (r + q * 5), y + Math.sin(th) * (r + q * 5), (1 - q) * o.bubblePop); }
        }
      }
    },
  };
};


// ---- reading: a book of light open under its nose, pages turning, its eyes running along the lines
L.read = (o) => {
  const n = () => whole(o.readPages);
  // (a figure holds it in its hands)
  const book = (st, t) => { const ph = phase(o, t), h = st.hands && st.hands.length === 2 ? st.hands : null; return h ? { x: (h[0][0] + h[1][0]) / 2, y: (h[0][1] + h[1][1]) / 2 + o.readSize * 0.3 + Math.sin(TAU * 2 * ph) * 0.8 } : { x: st.x, y: st.y + o.size * 0.95 + Math.sin(TAU * 2 * ph) * 0.8 }; };
  return {
    mods(t) {
      const ph = phase(o, t), f = (ph * n()) % 1, line = (f * 4) % 1, nod = Math.sin(TAU * n() * ph) * o.readNod;
      return { lookX: lerp(-1, 1, Math.min(1, line * 1.15)) * 0.9, lookY: 0.9, rot: 0.05 * nod, dy: 1.5 * nod, quiet: 1, hold: 1 };
    },
    front(p, C0, t, st) {
      const C = shifted(C0, o.readHue), ph = phase(o, t), { x, y } = book(st, t), W = o.readSize / 2, H = o.readSize * 0.32;
      const page = (side) => [[x, y - H * 0.95], [x + side * W, y - H * 0.75], [x + side * W, y + H * 0.85], [x, y + H]];
      p.glow(x, y - H, o.readSize * 0.9, C[5], 0.3 * o.readGlow);
      // the cover, the two pages, lines of light on them
      p.poly([[x - W - 1.5, y - H * 0.75 + 1], [x, y - H * 0.95 + 2], [x + W + 1.5, y - H * 0.75 + 1], [x + W + 1.5, y + H * 0.85 + 2], [x, y + H + 2], [x - W - 1.5, y + H * 0.85 + 2]], C[2]);
      for (const sd of [-1, 1]) {
        p.poly(page(sd), sd < 0 ? C[6] : WHITE);
        for (let r = 0; r < 4; r++) {
          const yy = y - H * 0.55 + r * H * 0.4, len = W * (r === 3 ? 0.5 : 0.75);
          for (let i = 2; i < len; i += 1) p.px(x + sd * i, yy + (sd < 0 ? -0.1 : 0.1) * i * 0.3, C[3 + (r % 2)]);
        }
      }
      p.line(x, y - H * 0.95, x, y + H, C[3]);
      // the page turning over
      const f = (ph * n()) % 1, k = seg(f, 0.7, 0.95);
      if (k > 0 && k < 1) {
        const cx = Math.cos(Math.PI * k), lift = Math.sin(Math.PI * k) * H * 0.9;
        p.poly([[x, y - H * 0.95], [x + cx * W, y - H * 0.75 - lift], [x + cx * W, y + H * 0.85 - lift], [x, y + H]], cx > 0 ? C[6] : WHITE);
        p.line(x + cx * W, y - H * 0.75 - lift, x + cx * W, y + H * 0.85 - lift, C[4]);
      }
      p.glow(x, y, o.readSize * 0.5, WHITE, 0.15 * o.readGlow);
    },
  };
};

// ---- drawing in the air: a point of light traces a shape beside it, the drawing glows, then fades
L.draw = (o) => {
  const n = () => whole(o.drawCount);
  const path = (s) => {
    const sh = o.drawShape;
    if (sh === "heart") { const a = TAU * s; return [Math.sin(a) ** 3, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16]; }
    if (sh === "star") { const k = s * 5, i = Math.floor(k) % 5, f = k - Math.floor(k), P = (j) => { const a = -Math.PI / 2 + ((j * 2) % 5) * (TAU / 5); return [Math.cos(a), Math.sin(a)]; }; const A = P(i), B = P(i + 1); return [lerp(A[0], B[0], f), lerp(A[1], B[1], f)]; }
    if (sh === "spiral") { const a = TAU * 3 * s, r = s; return [Math.cos(a) * r, Math.sin(a) * r]; }
    if (sh === "infinity") { const a = TAU * s, d = 1 + Math.sin(a) ** 2; return [Math.cos(a) / d, (Math.sin(a) * Math.cos(a)) / d * 1.4]; }
    const a = TAU * s - Math.PI / 2; return [Math.cos(a), Math.sin(a)];
  };
  const centre = (st) => { const d = o.drawSide === "left" ? -1 : o.drawSide === "up" ? 0 : 1; return [st.x + d * (o.size + o.drawSize * 1.2), st.y - (d ? o.size * 0.3 : o.size + o.drawSize * 1.3)]; };
  const timing = (t) => { const f = (phase(o, t) * n()) % 1, hold = clamp(o.drawHold, 0, 0.5); return { draw: E(seg(f, 0, 0.6)), glow: bump(f, 0.6, 0.6 + hold), fade: seg(f, 0.6 + hold * 0.5, 1) }; };
  return {
    mods(t) {
      const { draw } = timing(t), [px, py] = path(draw), d = o.drawSide === "left" ? -1 : o.drawSide === "up" ? 0 : 1;
      const lx = d * 0.9 + px * 0.4, ly = (d ? -0.2 : -1) + py * 0.4, [cx, cy] = centre({ x: 0, y: 0 }), [fx, fy] = formCentre(o);
      // (a figure draws with its finger)
      return { lookX: lx, lookY: ly, dx: d * 2, rot: d * 0.08, happy: timing(t).glow > 0.5 ? 1 : 0, quiet: 1, reach: [fx + cx + px * o.drawSize, fy + cy + py * o.drawSize], reachK: 0.9 * (1 - timing(t).fade) };
    },
    front(p, C0, t, st) {
      const C = shifted(C0, o.drawHue), { draw, glow, fade } = timing(t), [cx, cy] = centre(st), R = o.drawSize, al = 1 - fade;
      if (al <= 0.02) return;
      const m = Math.ceil(R * 7 * draw);
      let last = null;
      for (let i = 0; i <= m; i++) {
        const [x, y] = path((i / Math.max(1, m)) * draw), X = cx + x * R, Y = cy + y * R;
        if (last) p.line(last[0], last[1], X, Y, glow > 0.3 ? WHITE : C[6], al);
        last = [X, Y];
      }
      if (last) {
        if (draw < 1) { spark(p, C, last[0], last[1], 1); p.glow(last[0], last[1], 8, WHITE, 0.4); p.glowLine(st.x, st.y, last[0], last[1], 2, C[5], 0.12); }
        p.glow(cx, cy, R * 1.3, C[5], (0.15 + 0.35 * glow) * al);
      }
    },
  };
};

// ---- rain: a little cloud of light rains on it; it likes it, or sulks
L.rain = (o) => {
  const happy = o.rainMood === "happy";
  return {
    mods(t) {
      const ph = phase(o, t), sw = Math.sin(TAU * 4 * ph);
      return happy ? { happy: 1, rot: 0.08 * sw, dx: 2 * sw, lookY: -0.6, quiet: 1, armOpen: 0.75, armUp: 0.2 + 0.1 * sw } : { shut: 0.55, dy: 4, sy: 0.95, sx: 1.04, lookY: 0.6, glow: -0.1, quiet: 1, hold: 0.8 };
    },
    cloud(st, t) { const ph = phase(o, t); return [st.x - st.m.dx * 0.5 + Math.sin(TAU * ph) * 3, st.y - o.size - o.rainHeight + Math.sin(TAU * 2 * ph) * 1.5]; },
    back(p, C0, t, st) {
      // the drops behind it, and the ones that miss
      this.drops(p, shifted(C0, o.rainHue), t, st);
    },
    drops(p, C, t, st) {
      const [cx, cy] = this.cloud(st, t), W = o.rainCloud;
      cycle(t, loopLen(o), Math.round(o.rainDrops), o.seed + 71, (g) => g.range(0.45, 0.7), (age, life, r) => {
        // (on a figure, the drops land on its head and its arms)
        const x = cx + r.range(-W, W), k = age / life, y0 = cy + 3, top = st.top ? st.top[1] + Math.abs(x - st.top[0]) * 0.5 : st.y - o.size * 0.85, hit = st.top ? Math.abs(x - st.top[0]) < st.U * 0.45 : Math.abs(x - st.x) < o.size * 0.75;
        const yEnd = hit ? top : st.feet ? under(st) : st.y + o.size * 2.5, y = lerp(y0, yEnd, k);
        if (k < 0.97) { p.px(x, y, C[6]); p.px(x, y - 1, C[5]); p.dot(x, y - 2, C[4], 0.6); }
        else if (o.rainSplash > 0) for (const sd of [-1, 1]) p.dot(x + sd * 2, yEnd - 1, WHITE, o.rainSplash);
      });
    },
    front(p, C0, t, st) {
      const C = shifted(C0, o.rainHue), [cx, cy] = this.cloud(st, t), W = o.rainCloud, g = rng(o.seed, 77);
      p.glow(cx, cy, W * 1.4, C[4], 0.25);
      for (let i = 0; i < 7; i++) {
        const x = cx + lerp(-W * 0.8, W * 0.8, i / 6) + g.range(-2, 2), y = cy - Math.sin((i / 6) * Math.PI) * W * 0.25 + g.range(-1, 1), r = W * g.range(0.25, 0.38);
        p.disc(x, y, r, i % 2 ? C[5] : C[6], 1);
      }
      for (let i = 0; i < 7; i++) { const x = cx + lerp(-W * 0.8, W * 0.8, i / 6) - 1, y = cy - W * 0.18 - Math.sin((i / 6) * Math.PI) * W * 0.25; p.px(x, y, WHITE); }
      p.line(cx - W * 0.9, cy + W * 0.22, cx + W * 0.9, cy + W * 0.22, C[4]);
    },
  };
};

// ---- stargazing: it looks up at a sky full of twinkles; shooting stars cross, and each one amazes it
L.stars = (o) => {
  const n = () => whole(o.starsShoot, 0);
  const shot = (ph, i) => { const g = rng(o.seed, 123, i), c = (i + 0.3) / n(), k = seg((((ph - c) % 1) + 1) % 1, 0, 0.12); return { k, g, dir: g.chance(0.5) ? 1 : -1, y: g.range(-1.6, -0.9), x0: g.range(-0.6, 0.2) }; };
  return {
    mods(t) {
      const ph = phase(o, t);
      let lx = 0, wow = 0;
      for (let i = 0; i < n(); i++) { const s = shot(ph, i); if (s.k > 0 && s.k < 1) { lx = s.dir * lerp(-1, 1, s.k); wow = Math.max(wow, Math.sin(Math.PI * s.k)); } const after = shot(ph - 0.04, i); if (after.k > 0.6 && after.k < 1) wow = Math.max(wow, 0.6); }
      return { lookY: -1.3, lookX: lx * 1.2 + Math.sin(TAU * ph) * 0.3, eyeScale: 1 + 0.35 * wow * o.starsWonder, dy: -4 * wow * o.starsWonder, happy: 0, quiet: 1, hold: 0.35 * (1 - wow), armOpen: 0.5 * wow };
    },
    back(p, C, t, st) {
      const ph = phase(o, t), g = rng(o.seed, 321), A = o.starsArea;
      for (let i = 0; i < Math.round(o.starsCount); i++) {
        const x = g.range(-A, A), y = g.range(-A * 0.75, -o.size * 1.2), tw = Math.sin(TAU * (ph * whole(g.range(1, 4)) + g.range(0, 1)));
        if (tw > 0.2) p.px(x, y, tw > 0.85 ? WHITE : C[5]);
        if (tw > 0.85) { p.dot(x + 1, y, C[5], 0.6); p.dot(x - 1, y, C[5], 0.6); p.dot(x, y + 1, C[5], 0.6); p.dot(x, y - 1, C[5], 0.6); }
      }
      for (let i = 0; i < n(); i++) {
        const s = shot(ph, i);
        if (s.k <= 0 || s.k >= 1) continue;
        const x = s.dir * lerp(-A * 0.9, A * 0.9, s.k), y = -A * 0.5 + s.y * o.size * 0.4 + s.k * A * 0.22, L = 26 * o.starsTrail;
        for (let j = 0; j < L; j++) { const q = j / L; p.dot(x - s.dir * j * 1.6, y - j * 0.4, q < 0.15 ? WHITE : C[6], clamp((1 - q) * 1.4 * Math.sin(Math.PI * s.k) ** 0.5)); }
        p.glow(x, y, 6, WHITE, 0.5 * Math.sin(Math.PI * s.k));
      }
    },
  };
};

// ---- hiccups: a jolt up out of nowhere, eyes wide, a little pop of light, then on as if nothing happened
L.hiccup = (o) => {
  const times = () => { const n = whole(o.hicCount), g = rng(o.seed, 515); return Array.from({ length: n }, (_, i) => (i + g.range(0.15, 0.7)) / n); };
  const at = (ph) => { let best = 9; for (const c of times()) { let d = ph - c; d -= Math.floor(d); if (d < best) best = d; } return best; };
  return {
    mods(t) {
      const d = at(phase(o, t)), k = d / 0.08, jolt = k < 1 ? Math.sin(Math.PI * Math.min(1, k * 1.6)) * (1 - k * 0.3) : 0, wide = d < 0.12 ? 1 - d / 0.12 : 0;
      return { dy: -o.hicStrength * jolt, sy: 1 + 0.18 * jolt, sx: 1 - 0.12 * jolt, eyeScale: 1 + 0.4 * wide * o.hicSurprise, shut: d > 0.12 && d < 0.15 ? 1 : 0, quiet: 1, armOpen: 0.6 * jolt };
    },
    front(p, C, t, st) {
      if (o.hicBubble <= 0) return;
      const d = at(phase(o, t)), k = seg(d, 0.02, 0.12);
      if (k <= 0 || k >= 1) return;
      const [x, y] = st.head ? [st.head[0] + st.headR + 3 + k * 6, st.head[1] - k * 10] : [st.x + o.size * 0.9 + k * 6, st.y - o.size * 0.9 - k * 10], r = 2 + k * 3;
      if (k < 0.7) { ring(p, x, y, r, r, C[6], o.hicBubble); p.dot(x - r * 0.4, y - r * 0.4, WHITE, 1); }
      else for (let j = 0; j < 6; j++) { const th = (j / 6) * TAU; spark(p, C, x + Math.cos(th) * (r + 3), y + Math.sin(th) * (r + 3), (1 - k) * 3 * o.hicBubble); }
    },
  };
};

// ---- a spinning top: whirling round and round, wobbling as it goes, a blur of light about it
L.top = (o) => ({
  mods(t) {
    const ph = phase(o, t), wob = Math.sin(TAU * 2 * ph) * o.topWobble, dr = o.topDrift;
    return { rot: TAU * whole(o.topTurns) * ph + wob, sx: 1 + o.topStretch, sy: 1 - o.topStretch * 0.4, dx: Math.sin(TAU * ph) * dr, dy: (1 - Math.cos(TAU * ph)) * dr * 0.25 - 2, happy: 1, quiet: 1, armOpen: 1 };
  },
  blur(p, C, t, st, front) {
    if (o.topTrail <= 0) return;
    for (let arc = 0; arc < 3; arc++)
      for (let i = 0; i < 14; i++) {
        const th = st.tilt * 1.3 + arc * (TAU / 3) - i * 0.12, d = Math.sin(th);
        if ((d >= 0) !== front) continue;
        const R = o.size * (1 + o.topStretch) * 1.2, x = st.x + Math.cos(th) * R, y = st.y + d * R * 0.28 + o.size * 0.2;
        p.dot(x, y, i < 2 ? WHITE : C[5], (1 - i / 14) * o.topTrail);
      }
    if (!front) p.glow(st.x, st.y + o.size, o.size * 1.4, C[5], 0.25 * o.topTrail);
  },
  back(p, C, t, st) { this.blur(p, C, t, st, false); },
  front(p, C, t, st) { this.blur(p, C, t, st, true); },
});

// ---- on a swing: hanging from a thread of light, swinging to and fro, delighted at the top of each swing
L.swing = (o) => {
  const ang = (ph) => ((o.swingAngle * Math.PI) / 180) * Math.sin(TAU * whole(o.swingCount) * ph);
  return {
    mods(t) {
      const th = ang(phase(o, t)), Lr = o.swingLength, top = Math.abs(th) / Math.max(0.01, (o.swingAngle * Math.PI) / 180);
      // (a figure holds the ropes over its head; on its legs it hangs clear of its floor)
      const lift = gnd(o) ? o.size * (o.huHeight || 1) * 0.55 : 0;
      return { dx: Lr * Math.sin(th), dy: -Lr * (1 - Math.cos(th)) - lift, rot: -th * 0.9, happy: top > 0.8 ? 1 : 0, quiet: 1, armUp: 1 };
    },
    back(p, C, t, st) {
      if (o.swingRope <= 0) return;
      const ax = st.x - st.m.dx, ay = st.y - st.m.dy - o.swingLength - o.size * 0.9, th = ang(phase(o, t));
      const tx = st.x + Math.sin(th) * o.size * 0.9 * 0, ty = st.y - o.size * 0.85;
      for (const off of [-o.size * 0.35, o.size * 0.35]) {
        const hd = st.hands && st.hands.length === 2 ? st.hands[off < 0 ? 1 : 0] : null, bx = hd ? hd[0] : tx + Math.cos(th) * off, by = hd ? hd[1] : ty + Math.sin(th) * off;
        p.line(ax + off * 0.3, ay, bx, by, C[5], 0.8 * Math.min(1, o.swingRope));
        p.glowLine(ax + off * 0.3, ay, bx, by, 3, C[5], 0.12 * o.swingRope);
      }
      spark(p, C, ax, ay, Math.min(1, o.swingRope));
    },
  };
};

// ---- a firefly friend: a little light flits round it; it follows it with its eyes, leaning after it
L.firefly = (o) => {
  const pos = (ph, i, n) => {
    const a = TAU * (whole(o.flyTurns) * ph + i / n), R = o.flyRadius;
    return [Math.sin(a) * R + Math.sin(3 * a + i) * R * 0.18, -o.size * 0.4 + Math.sin(2 * a) * R * 0.45 + Math.cos(5 * a) * 3];
  };
  return {
    mods(t) {
      const ph = phase(o, t), [x, y] = pos(ph, 0, whole(o.flyCount)), d = Math.hypot(x, y) || 1;
      const [fx, fy] = formCentre(o);
      return { lookX: (x / d) * 1.6, lookY: (y / d) * 1.2, dx: (x / d) * 3 * o.flyFollow, rot: (x / d) * 0.12 * o.flyFollow, happy: Math.abs(x) < o.size * 0.5 && y < 0 ? 1 : 0, quiet: 1, reach: [fx + x, fy + y], reachK: 0.45 };
    },
    fly(p, C0, t, st, front) {
      const C = shifted(C0, o.flyHue), ph = phase(o, t), n = whole(o.flyCount), bx = st.x - st.m.dx, by = st.y - st.m.dy;
      for (let i = 0; i < n; i++) {
        const [x, y] = pos(ph, i, n), behind = Math.cos(TAU * (whole(o.flyTurns) * ph + i / n)) < 0;
        if (behind === front) continue;
        for (let j = 1; j < 14; j++) { const [qx, qy] = pos(ph - j * 0.004, i, n); p.dot(bx + qx, by + qy, j < 4 ? C[6] : C[5], (1 - j / 14) * 0.9); }
        const pulse = 0.6 + 0.4 * Math.sin(TAU * ph * 12 + i), X = bx + x, Y = by + y;
        p.disc(X, Y, 2, C[6], 1); p.px(X - 0.5, Y - 0.5, WHITE); p.px(X + 0.5, Y - 0.5, WHITE);
        p.glow(X, Y, 10, C[6], 0.8 * pulse * o.flyGlow); p.glow(X, Y, 24, C[4], 0.35 * pulse * o.flyGlow);
      }
    },
    back(p, C, t, st) { this.fly(p, C, t, st, false); },
    front(p, C, t, st) { this.fly(p, C, t, st, true); },
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

// a loop its form can't do (or a part it doesn't have yet): it just rests in that form
function loopOf(o) { return fitsForm(o) && (partOf(o) === "loop" || hasParts(o.loop)) ? (L[o.loop] || L.sleep)(o) : { mods: () => ({}) }; }

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
