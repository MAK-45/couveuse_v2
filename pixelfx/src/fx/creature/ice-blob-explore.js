// The blob explores the world it has reached (tab Action monde). First action: it travels. In truth it stays on
// its spot and the world scrolls past behind it, layer by layer (the near stars faster than the far ones), while
// the blob shows its speed: it leans into it, stretches into a drop whose tail streams behind, its eyes look ahead,
// and a speed effect wraps it (a shooting star of light, afterimages, a bow shock, ice flames, wind).
// One speed drives everything: the faster it goes, the faster the world scrolls and the more the blob deforms.
//
// Other actions: look (it floats in wonder while the camera glides round and stars bloom for it to stare at), swim
// (strokes: it gathers, kicks and glides, tail sweeping, fins flaring, a wake behind; the world lurches at each kick),
// turns (it slaloms through the world, the camera swaying with it, banking into each bend, a curved trail of light)
// and collect (stars come at it with the world, it darts to each one and swallows it in a burst of light).
//
// On its legs (the transformation's human form on the ground) it can also walk and run: side on, it walks or runs on the
// spot while the world goes by under its feet at exactly the speed of its steps (the foot on the ground stays planted on
// the meadow it stands on, or on its floor of ice in space); on a planet's surface it has no floor of ice: the ground is there.
//
// A free endless loop (like the Boucles tab): it starts where the blob rests but needn't come back to the Blob né's
// frame. It loops over a whole number of the blob's loops (P): the world scrolls whole tiles a loop (ice-worlds.js),
// the speed surges a whole number of times a loop (the world's clock is warped by a sine that integrates to zero over
// the loop, so the distance stays whole tiles), every ripple runs whole turns and every particle is on cycle(t, P).
import { fit, clamp, lerp, ease, tileNoise, tileFbm, rng, cycle, TAU, WHITE, hex } from "../../core/index.js";
import { meta as idleMeta, state, shapeOf } from "./ice-blob-idle.js";
import { bodyBack, bodyFront, bodyAmbient, isForm, formMask, gaitPlan, floorFor } from "./ice-blob-transform.js";
import { hsl, fromHsl } from "./ice-blob-actions.js";
import { worldOf, worldTile, paintWorld, isSurface, groundDepth } from "./ice-worlds.js";

export const EXPLORE = ["move", "look", "swim", "turns", "collect", "walk", "run"];
/** What a new form can't do, and why (the page shows it; the effect then just rests). In its levitating human form it
 * flies as the blob does (stretched a little, a comet's tail of light, arms reaching ahead); on its legs it can only
 * stand on its floor and look round the world. */
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
    move: "Il file à travers le monde en volant : sur ses jambes, avec la gravité, il ne peut pas voler.",
    swim: "Il nage dans le vide du monde : au sol, la gravité le retient.",
    turns: "Il vole en slalom à travers le monde : au sol, il ne peut pas voler.",
    collect: "Il fonce en volant sur les étoiles pour les avaler : au sol, il ne peut pas voler.",
  },
};
export const fitsForm = (o, name = o.explore) => !(FORM_FIT[o.form] && FORM_FIT[o.form][name]);
export const STYLES = ["comet", "stretch", "ghosts", "shock", "flame"];
// travel directions (degrees, y down) and the way the world scrolls for each
export const HEADINGS = { right: 0, downright: 45, down: 90, downleft: 135, left: 180, upleft: 225, up: 270, upright: 315 };
const OPP = { right: "left", left: "right", up: "down", down: "up", upright: "downleft", upleft: "downright", downright: "upleft", downleft: "upright" };

export const meta = {
  name: "Ice blob explore",
  desc: "The ice blob flies through another world: the world scrolls past in parallax layers while it stretches into a drop wrapped in a speed effect.",
  tags: ["creature", "blob", "travel", "speed", "world", "space", "ice", "light", "loop"],
  size: [320, 180],
  origin: [160, 100],
  duration: 8,
  loop: true,
  fps: 30,
  bg: "black",
  options: {
    ...idleMeta.options,
    // the world it travels through (null: deep space with its defaults) and the scene's bounds in local pixels
    world: null, room: null,
    form: "blob", explore: "move", loops: 2,
    // speed: one knob for the world and the body; how much each follows it; surges of speed a loop
    exSpeed: 3, exDir: "right", exDrift: 1, exDeform: 1, exSurge: 0.35, exSurges: 1,
    // the body at speed: stretch, tail, lean, ripples, eyes ahead, pushed back by the speed
    exStretch: 1, exTail: 1, exLean: 1, exRipple: 1, exLook: 1, exBack: 0.5,
    // the speed effect: style, strength, length, hue shift, sparks shed, wind streaks, afterimages, light body
    exStyle: "comet", exPower: 1, exLength: 1, exHue: 0, exParticles: 24, exLines: 14, exEchoes: 4, exLight: 1,
    // its light on a ground below (none in space by default)
    exGround: 0,
    // look around: camera glide (px, whole turns a loop), stars it notices a loop, their size, wonder, how it leans to them
    lkPan: 40, lkPanTurns: 1, lkSpots: 4, lkSpotSize: 9, lkWonder: 1, lkLean: 1,
    // swim: strokes a loop, kick, tail sweep, body wave, fins, wake, rings of light at each kick
    swStrokes: 4, swKick: 0.45, swSway: 1, swWave: 1, swFins: 0.6, swWake: 1, swBubbles: 1,
    // turns: slaloms a loop, their width (px), depth (nearer, farther), banking, trail, how much the camera lags
    trTurns: 2, trAmp: 45, trDepth: 0.15, trBank: 1, trTrail: 1, trFollow: 0.5,
    // collect: stars a loop, how far to the side they come, their size, hue, the gulp, the burst
    clCount: 4, clSpread: 40, clSize: 8, clHue: 200, clGulp: 1, clBurst: 1,
    // walk and run (on its legs): speed (km/h, its legs a person's), its way, its strides (x a person's), the arms' swing,
    // the lean, the knees giving (bounce), the heels kicked up, the knees driven forward, the hair, prints, sparks
    gaWalk: 5, gaRun: 12, gaDir: "right", gaStride: 1, gaArms: 1, gaLean: 1, gaBounce: 1, gaHeel: 1, gaKnee: 1, gaHair: 1, gaPrints: 1, gaSparks: 1,
    // on its legs on a planet's surface: what stands nearer to us than its feet (trees, rocks, flowers, tall grass) passes in front of it
    exFront: 1,
  },
};

const whole = (v, lo = 0) => Math.max(lo, Math.round(v));
const total = (o) => o.duration * whole(o.loops, 1);
const phase = (o, t) => (((t / total(o)) % 1) + 1) % 1;
const roomOf = (o) => (Array.isArray(o.room) ? o.room : [-meta.origin[0], -meta.origin[1], meta.size[0] - meta.origin[0], meta.size[1] - meta.origin[1]]);
const shifted = (C, hue) => (hue ? C.map((c) => { const [h, s, l] = hsl(c); return hex(fromHsl((((h + hue) % 360) + 360) % 360, s, l)); }) : C);
const headingOf = (o) => ((HEADINGS[o.exDir] ?? 0) * Math.PI) / 180;

/**
 * The pace at time t: f the speed relative to the mean (surges), x the distance travelled (in seconds at the mean
 * speed: x(P) = P, so the world still scrolls whole tiles a loop), v the speed now and k how much the body shows it.
 */
export function pace(o, t) {
  const P = total(o), n = whole(o.exSurges), a = n ? clamp(o.exSurge, 0, 0.9) : 0, ph = (TAU * n * t) / P;
  const f = 1 + a * Math.cos(ph), x = t + (n ? ((a * P) / (TAU * n)) * Math.sin(ph) : 0), v = Math.max(0, o.exSpeed) * f;
  return { f, x, v, k: clamp((1 - Math.exp(-v / 3.5)) * Math.max(0, o.exDeform), 0, 1.5) };
}

/** The world it travels through: moving at the speed (scenes a blob loop for the nearest stars), against its way. */
export function worldFor(o) {
  const w = worldOf(o.world), L = whole(o.loops, 1), v = Math.max(0, o.exSpeed) * Math.max(0, o.exDrift);
  return { ...w, wLoops: L, wState: v > 0 ? "moving" : "still", wDrift: v * L, wDir: OPP[o.exDir] || "left", wAllMove: 1 };
}

// body space, as in the idle (squash then tilt round the body's centre)
const toBody = (st, dx, dy) => {
  const c = Math.cos(-st.tilt), s = Math.sin(-st.tilt), x = dx * c - dy * s, y = dx * s + dy * c;
  return [x / st.sx, y / st.sy];
};

// ---- shared by the travelling actions
// how fast things go: the near stars (whole tiles a loop, as the world draws them) and what streams off the blob
function travel(o, a = headingOf(o)) {
  const P = total(o), room = roomOf(o), T = worldTile(room);
  const nearTiles = o.exSpeed > 0 && o.exDrift > 0 ? Math.max(1, whole(o.exSpeed * o.exDrift * whole(o.loops, 1))) : 0, vNear = (nearTiles * T) / P;
  return { P, a, c: Math.cos(a), s: Math.sin(a), room, T, vNear, vFlow: Math.max(vNear, 40 * Math.min(1, o.exSpeed)) };
}
/**
 * The blob as a drop flying along `head` (radians), showing speed k: leaning in, stretched, a tail behind with waves
 * running down it. x: boost (more of it all), bank (extra lean), squash (shorter along the way), tail (the tail's
 * swing off straight behind), fins (side lobes), ripple turns a loop, look (gaze as [x, y]).
 */
function dropMods(o, k, head, u, x = {}) {
  const c = Math.cos(head), s = Math.sin(head), boost = x.boost || 1, lean = c * 0.32 * k * o.exLean + (x.bank || 0), ab = head - lean;
  const ax = c * c - s * s, str = 0.26 * k * o.exStretch * boost - (x.squash || 0), rip = x.ripple || whole(o.loops * 3, 1), tw = x.tail || 0, fin = x.fins || 0;
  const A = 1.3 * (1 - Math.exp(-1.6 * k * boost)) * o.exTail;
  const shape = (th) => {
    let ph = th - ab;
    ph -= TAU * Math.round(ph / TAU);
    const d = Math.cos(ph), side = 1 - d * d, tail = Math.max(0, -Math.cos(ph - tw));
    let r = 1 - 0.16 * k * side - 0.06 * k * Math.max(0, d) ** 2;
    r += 0.35 * k * boost * o.exTail * tail ** 2 + A * tail ** (5 + 6 * k);
    r += 0.08 * k * o.exRipple * (x.wave ?? 1) * tail * Math.sin(6 * Math.abs(ph) - TAU * u * rip);
    if (fin) { const e = Math.abs(ph) - 1.9; r += fin * Math.exp(-(e * e) / 0.06); }
    return Math.min(2.4, r);
  };
  const look = x.look || [c * o.exLook * clamp(k * 2.5) * 2, s * o.exLook * clamp(k * 2.5) * 1.4];
  // a figure keeps its shape (only a little of it streams into the drop) and reaches ahead with both arms
  // a figure also lies down along its way, head first, the faster the more (as one flies)
  const fig = isForm(o), lie = fig ? (head + Math.PI / 2 - TAU * Math.round((head + Math.PI / 2) / TAU)) * 0.85 * clamp(k * 2.5) : 0;
  return { sx: 1 + str * ax, sy: 1 - str * ax * 0.8, rot: lean + lie, morph: clamp(k * 1.4, 0, 0.92) * (fig ? 0.22 : 1), shape, lookX: look[0], lookY: look[1],
    glow: 0.12 * k * o.exPower, halo: 1 + 0.45 * k * o.exPower, quiet: 1, ...(fig ? { armUp: 0.9 * clamp(k * 2) } : {}) };
}
// streaks of wind sliding past the whole scene, against the way it goes (dir(t) gives the way as [c, s] if it changes)
function speedLines(p, C, t, st, k, front, o, tr, dir) {
  const n = whole(o.exLines);
  if (!n || o.exSpeed <= 0) return;
  const { P, room } = tr, vl = tr.vFlow * 1.8, len = clamp((vl / 30) * 1.1, 3, 70) * Math.max(0.2, o.exLength) * (0.4 + 0.6 * Math.min(1, k * 1.6));
  const W = room[2] - room[0], H = room[3] - room[1], [c, s] = dir ? dir(t) : [tr.c, tr.s];
  cycle(t, P, n, o.seed * 7 + 5, (g) => g.range(0.35, 0.8), (age, life, g, i) => {
    if ((i % 3 === 0) !== front) return;
    const x0 = room[0] + g.range(-0.1, 1.1) * W, y0 = room[1] + g.range(-0.1, 1.1) * H, sp = vl * g.range(0.7, 1.3), d = sp * (age - life / 2);
    const x = x0 - c * d, y = y0 - s * d, q = age / life, L = len * g.range(0.5, 1.2) * Math.sin(Math.PI * q) ** 0.5;
    if (front && Math.hypot(x - st.x, y - st.y) < o.size * 2.2) return;
    for (let j = 0, m = Math.ceil(L); j <= m; j++) {
      const f = j / Math.max(1, m);
      p.px(x + c * j, y + s * j, f > 0.85 && front ? WHITE : f > 0.55 ? C[6] : f > 0.25 ? C[5] : C[3]);
    }
    if (front) p.glow(x + c * L, y + s * L, 3, C[5], 0.25);
  });
}
// sparks of light peeling off its back and carried away (dir(t0) gives the way it went when each was born)
function shedSparks(p, C, t, M, k, count, o, tr, dir) {
  const n = whole(count);
  if (!n || o.exSpeed <= 0) return;
  cycle(t, tr.P, n, o.seed * 11 + 3, (g) => g.range(0.35, 0.9), (age, life, g, i) => {
    const t0 = t - age, s0 = state(o, t0, M), [c, s] = dir ? dir(t0) : [tr.c, tr.s], back = Math.atan2(s, c) + Math.PI + g.range(-0.9, 0.9);
    const R = o.size * g.range(0.6, 0.95), x0 = s0.x + Math.cos(back) * R, y0 = s0.y + Math.sin(back) * R;
    const v = tr.vFlow * g.range(0.35, 1) * (0.5 + k), dr = g.range(-12, 12), q = age / life;
    const x = x0 - c * v * age - s * dr * age, y = y0 - s * v * age + c * dr * age;
    if (q > 0.85 && (i + Math.floor(age * 20)) % 2) return;
    const big = q < 0.3 && i % 3 === 0;
    p.px(x, y, q < 0.25 ? WHITE : q < 0.6 ? C[6] : C[4]);
    if (big) for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.px(x + ddx, y + ddy, C[5]);
    if (q < 0.6) p.glow(x, y, big ? 5 : 3, C[5], 0.3 * (1 - q) * o.exPower);
  });
}
// a four-pointed star of light: arms of length L, turning a little, a white heart
function starBurst(p, C, x, y, L, a = 1, spin = 0) {
  if (L < 0.6 || a <= 0.05) return;
  const arms = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([dx, dy]) => [dx * Math.cos(spin) - dy * Math.sin(spin), dx * Math.sin(spin) + dy * Math.cos(spin)]);
  for (const [dx, dy] of arms) for (let i = 1; i <= Math.round(L); i++) { const f = i / L; (a >= 0.7 ? p.px : (xx, yy, cc) => p.dot(xx, yy, cc, a)).call(p, x + dx * i, y + dy * i, f < 0.35 ? WHITE : f < 0.7 ? C[6] : C[4]); }
  if (L > 2.5) for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) p.dot(x + dx, y + dy, C[6], a);
  p.px(x, y, WHITE);
  p.glow(x, y, L * 1.8 + 3, C[5], 0.45 * a);
  p.glow(x, y, L * 0.8 + 1, WHITE, 0.25 * a);
}
// a solid star to collect: a filled four-pointed gem (an astroid), lit top-left, white heart, glowing
function gemStar(p, C, x, y, R, spin = 0) {
  if (R < 1) return;
  const cs = Math.cos(spin), sn = Math.sin(spin), E = Math.ceil(R) + 1;
  for (let j = -E; j <= E; j++)
    for (let i = -E; i <= E; i++) {
      const lx = (i * cs + j * sn) / R, ly = (-i * sn + j * cs) / R, v = Math.sqrt(Math.abs(lx)) + Math.sqrt(Math.abs(ly));
      if (v > 1) continue;
      const lit = -(i + j) / (R * 1.4);
      p.px(x + i, y + j, v < 0.35 ? WHITE : v > 0.82 ? (lit > 0 ? C[6] : C[4]) : lit > 0.1 ? C[7] : C[5]);
    }
  p.glow(x, y, R * 2.2 + 3, C[5], 0.5);
  p.glow(x, y, R * 0.9 + 1, WHITE, 0.3);
}
// a time's distance to t0 on the loop's circle, in seconds (-P/2..P/2)
const around = (t, t0, P) => { let d = (t - t0) % P; if (d > P / 2) d -= P; if (d < -P / 2) d += P; return d; };

const X = {};

// ---- moving: it flies through the world
X.move = (o) => {
  const tr = travel(o), { P, a, c, s, vFlow } = tr, style = o.exStyle;
  const mods = (t) => {
    const k = pace(o, t).k, light = style === "comet" ? clamp(k * 1.2) * o.exLight : 0;
    const m = dropMods(o, k, a, phase(o, t), { boost: style === "stretch" ? 1.35 : 1 });
    return { ...m, dx: -c * o.size * 0.4 * k * o.exBack, dy: -s * o.size * 0.4 * k * o.exBack, glow: m.glow + 0.55 * light, halo: m.halo + 0.4 * light,
      grow: 1 - 0.12 * light, quiet: o.exSpeed > 0 ? 1 : 0 };
  };
  const lines = (p, C, t, st, k, front) => speedLines(p, C, t, st, k, front, o, tr);
  const shed = (p, C, t, M, k, count) => shedSparks(p, C, t, M, k, count, o, tr);

  // ---- a shooting star: a long tongue of light streaming from it, flickering, swaying a little
  const comet = (p, C, t, st, k) => {
    if (k <= 0.01) return;
    const u = phase(o, t), Lt = o.size * (1.2 + 6 * k) * o.exLength, w0 = o.size * 0.95 * st.grow, n1 = whole(o.loops * 2, 1);
    const K = 12 * whole(1 + o.exSpeed / 3, 1), amp = o.size * 0.18 * o.exRipple;
    const xs = [st.x, st.x - c * Lt], ys = [st.y, st.y - s * Lt];
    const x0 = Math.floor(Math.min(...xs) - w0 - 2), x1 = Math.ceil(Math.max(...xs) + w0 + 2), y0 = Math.floor(Math.min(...ys) - w0 - 2), y1 = Math.ceil(Math.max(...ys) + w0 + 2);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - st.x, dy = y + 0.5 - st.y, along = -(dx * c + dy * s);
        if (along < -w0 * 0.3 || along > Lt) continue;
        const q = Math.max(0, along) / Lt, across = -dx * s + dy * c - Math.sin(along * 0.07 - TAU * u * n1) * amp * q;
        const hw = along < 0 ? Math.sqrt(Math.max(0, w0 * w0 - along * along)) : w0 * (1 - q) ** 0.85;
        const e = Math.abs(across) / Math.max(0.5, hw);
        if (e > 1) continue;
        const nz = tileNoise(across * 0.42 + 9, along * 0.05 - u * K, 0, K, o.seed + 77);
        const I = (1 - q) ** 0.9 * (1 - 0.7 * e * e) * (0.8 + 0.25 * k) + nz * 0.2 * (0.4 + q);
        if (I < 0.07) continue;
        if (I < 0.15) { p.dot(x + 0.5, y + 0.5, C[2], 0.6); continue; }
        p.px(x + 0.5, y + 0.5, I > 0.8 ? WHITE : I > 0.6 ? C[7] : I > 0.44 ? C[6] : I > 0.3 ? C[5] : I > 0.21 ? C[4] : C[3]);
        if (I > 0.3) p.light(x + 0.5, y + 0.5, C[5], (I - 0.3) * 0.35 * o.exPower);
      }
    for (let i = 0; i < 5; i++) { const q = i / 5; p.glow(st.x - c * Lt * q, st.y - s * Lt * q, w0 * (1.6 - q), C[5], 0.22 * (1 - q) * o.exPower * k); }
    p.glow(st.x + c * o.size * 0.4, st.y + s * o.size * 0.4, o.size * 1.5, C[6], 0.3 * k * o.exPower);
  };

  // ---- wind curling round it: dashes that run from its nose along its sides and peel away behind
  const wind = (p, C, t, st, k) => {
    if (k <= 0.02) return;
    const u = phase(o, t), R = o.size * Math.max(st.sx, st.sy) * 1.05, m = 14, n = whole(o.loops * 4, 1), Lb = R * (2 + 3 * k) * o.exLength;
    for (let i = 0; i < m; i++) {
      const side = i % 2 ? 1 : -1, g = rng(o.seed, 131, i), off = R * g.range(1.05, 1.5);
      const q = (((u * n + g.next()) % 1) + 1) % 1, dash = 3 + 6 * k * g.range(0.6, 1.2);
      // a streamline: from in front of it, round its side, then trailing behind
      const at = (al) => {
        const acr = al > 0 ? off * Math.sqrt(Math.max(0, 1 - (al / (R * 1.25)) ** 2)) : off * (1 - 0.12 * Math.min(1, -al / Lb));
        return [st.x + c * al - s * acr * side, st.y + s * al + c * acr * side];
      };
      const head = R * 1.25 - q * (R * 1.25 + Lb);
      for (let j = 0; j < dash; j++) {
        const al = head + j, f = j / dash, [px, py] = at(al);
        if (al > R * 1.25) continue;
        const fade = q > 0.8 ? 1 - (q - 0.8) / 0.2 : 1;
        const al2 = Math.min(1, k * 2.5) * fade, col = f > 0.6 ? WHITE : f > 0.3 ? C[6] : C[5];
        if (al2 >= 0.7) p.px(px, py, col); else p.dot(px, py, col, al2);
      }
    }
  };

  // ---- afterimages: earlier copies of it left behind, translucent, fading
  const ghosts = (p, C, t, M, k) => {
    const n = whole(o.exEchoes);
    if (!n || k <= 0.02) return;
    const gap = o.size * (0.35 + 0.9 * k) * o.exLength;
    for (let i = n; i >= 1; i--) {
      if (isForm(o)) {
        // a figure leaves its own silhouette behind
        const mk = formMask(o, t - i * 0.07, M, P), ox = -c * gap * i, oy = -s * gap * i, al = 0.6 * (1 - i / (n + 1)) * clamp(k * 2.2) * Math.min(1.4, o.exPower), Ci = shifted(C, o.exHue * i);
        for (let j = 0; j < mk.H; j++)
          for (let q = 0; q < mk.W; q++) {
            if (!mk.inside(q, j)) continue;
            const px = mk.X0 + q + 0.5 + ox, py = mk.Y0 + j + 0.5 + oy, rim = !mk.inside(q - 1, j) || !mk.inside(q + 1, j) || !mk.inside(q, j - 1) || !mk.inside(q, j + 1);
            p.blend(px, py, rim ? Ci[6] : Ci[5], rim ? Math.min(1, al * 1.6) : al * 0.8);
            if (rim) p.light(px, py, Ci[5], 0.3 * al);
          }
        continue;
      }
      const st = state(o, t - i * 0.07, M), rad = shapeOf(o, st.u, st.m), ox = -c * gap * i, oy = -s * gap * i;
      const cx = st.x + ox, cy = st.y + oy, E = o.size * 2.6 * Math.max(st.sx, st.sy), al = 0.6 * (1 - i / (n + 1)) * clamp(k * 2.2) * Math.min(1.4, o.exPower);
      const Ci = shifted(C, o.exHue * i);
      const inside = (x, y) => { const [bx, by] = toBody(st, x - cx, y - cy); return Math.hypot(bx, by) <= rad(Math.atan2(by, bx)); };
      for (let y = Math.floor(cy - E); y <= Math.ceil(cy + E); y++)
        for (let x = Math.floor(cx - E); x <= Math.ceil(cx + E); x++) {
          const px = x + 0.5, py = y + 0.5;
          if (!inside(px, py)) continue;
          const rim = !inside(px - 1, py) || !inside(px + 1, py) || !inside(px, py - 1) || !inside(px, py + 1);
          p.blend(px, py, rim ? Ci[6] : Ci[5], rim ? Math.min(1, al * 1.6) : al * 0.8);
          if (rim) p.light(px, py, Ci[5], 0.3 * al);
        }
      p.glow(cx, cy, o.size * 1.4, Ci[5], 0.25 * al);
    }
  };

  // ---- a bow shock: an arc of light pushed ahead of it, its arms trailing back; a ring of sound at each surge
  const shock = (p, C, t, st, k, front) => {
    if (k <= 0.02) return;
    const u = phase(o, t), R0 = o.size * (1.25 + 0.15 * k), Wd = o.size * (1.6 + 1.2 * k) * o.exLength, back = o.size * (1.5 + 2.5 * k) * o.exLength;
    const beta = (R0 + back) / (Wd * Wd), n = whole(o.loops * 3, 1);
    if (front) {
      for (const lay of [0, 1]) {
        const R = R0 - lay * 3;
        for (let acr = -Wd; acr <= Wd; acr += 0.5) {
          const al = R - beta * acr * acr * (1 + lay * 0.2), e = Math.abs(acr) / Wd, x = st.x + c * al - s * acr, y = st.y + s * al + c * acr;
          const sh = 0.5 + 0.5 * Math.sin(Math.abs(acr) * 0.45 - TAU * u * n), I = (1 - e) ** 0.7 * (0.65 + 0.35 * sh) * Math.min(1, k * 2) * (lay ? 0.55 : 1);
          if (I < 0.12) continue;
          if (I < 0.3) { p.dot(x, y, C[4], I * 2.5); continue; }
          p.px(x, y, I > 0.75 ? WHITE : I > 0.5 ? C[6] : C[5]);
        }
      }
      p.glow(st.x + c * R0, st.y + s * R0, o.size * 0.8, WHITE, 0.3 * k * o.exPower);
      p.glow(st.x + c * R0 * 0.6, st.y + s * R0 * 0.6, o.size * 1.8, C[5], 0.25 * k * o.exPower);
      return;
    }
    // rings left behind at each surge (or a few a loop at a steady speed)
    const nr = whole(o.exSurges) || whole(o.loops, 1), per = P / nr, life = Math.min(per * 0.9, 0.9);
    const tau = ((((t - (whole(o.exSurges) ? 0 : per / 2)) % per) + per) % per);
    if (tau < life) {
      const q = tau / life, r = o.size * (1.1 + 3.2 * ease.outCubic(q)), cx = st.x - c * vFlow * 0.6 * tau, cy = st.y - s * vFlow * 0.6 * tau, m = Math.ceil(r * 6);
      for (let j = 0; j < m; j++) {
        const th = (j / m) * TAU, x = cx + Math.cos(th) * r * (1 - 0.35 * Math.abs(Math.cos(th - a))), y = cy + Math.sin(th) * r * (1 - 0.35 * Math.abs(Math.cos(th - a)));
        p.dot(x, y, q < 0.3 ? WHITE : C[6], (1 - q) * Math.min(1, k * 2));
      }
      p.glow(cx, cy, r, C[5], 0.25 * (1 - q) * o.exPower);
    }
  };

  // ---- ice flames: cold fire streaming off its back, tongues scrolling away
  const flame = (p, C, t, st, k) => {
    if (k <= 0.01) return;
    const u = phase(o, t), Lf = o.size * (1.1 + 3.6 * k) * o.exLength, w0 = o.size * 0.95 * st.grow, K = 16 * whole(1 + o.exSpeed / 2, 1);
    const xs = [st.x, st.x - c * Lf], ys = [st.y, st.y - s * Lf];
    const x0 = Math.floor(Math.min(...xs) - w0 * 1.3 - 2), x1 = Math.ceil(Math.max(...xs) + w0 * 1.3 + 2), y0 = Math.floor(Math.min(...ys) - w0 * 1.3 - 2), y1 = Math.ceil(Math.max(...ys) + w0 * 1.3 + 2);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - st.x, dy = y + 0.5 - st.y, along = -(dx * c + dy * s), across = -dx * s + dy * c;
        if (along < -w0 * 1.1 || along > Lf) continue;
        const q = Math.max(0, along) / Lf, hw = along < 0 ? Math.sqrt(Math.max(0, (w0 * 1.25) ** 2 - along * along)) + 1 : w0 * 1.25 * (1 - q) ** 0.55 + 1;
        const nz = tileFbm(across * 0.16 + 3, along * 0.11 - u * K, 0, K, o.seed + 91, 3);
        const F = (1 - q) * 1.25 - (Math.abs(across) / hw) * 0.95 + nz * 0.75 * (0.6 + 0.4 * q) + 0.1 * k - Math.max(0, -along / w0) * 0.9;
        if (F < 0.1) continue;
        p.px(x + 0.5, y + 0.5, F > 0.95 ? WHITE : F > 0.7 ? C[6] : F > 0.48 ? C[5] : F > 0.28 ? C[4] : C[2]);
        if (F > 0.4) p.light(x + 0.5, y + 0.5, C[5], (F - 0.4) * 0.3 * o.exPower);
      }
    p.glow(st.x - c * Lf * 0.3, st.y - s * Lf * 0.3, w0 * 1.8, C[5], 0.3 * k * o.exPower);
  };

  return {
    mods,
    world: (t) => ({ w: worldFor(o), wt: pace(o, t).x }),
    calm: o.exSpeed <= 0,
    back(p, C, Cf, t, st, M) {
      const k = pace(o, t).k;
      lines(p, Cf, t, st, k, false);
      if (style === "comet") comet(p, Cf, t, st, k);
      if (style === "ghosts") ghosts(p, Cf, t, M, k);
      if (style === "shock") shock(p, Cf, t, st, k, false);
      if (style === "flame") flame(p, Cf, t, st, k);
      if (style === "stretch") wind(p, Cf, t, st, k);
    },
    front(p, C, Cf, t, st, M) {
      const k = pace(o, t).k;
      if (style === "shock") shock(p, Cf, t, st, k, true);
      shed(p, Cf, t, M, k, o.exParticles * (style === "comet" || style === "flame" ? 1.5 : 1));
      lines(p, Cf, t, st, k, true);
    },
  };
};

// ---- looking around: it floats in wonder, the camera glides round (the near stars slide more than the far ones),
// and now and then a star blooms somewhere: it turns to stare at it, eyes wide, with a little hop
X.look = (o) => {
  const P = total(o), room = roomOf(o), W = room[2] - room[0], H = room[3] - room[1], n = whole(o.lkPanTurns), A = o.lkPan;
  // the camera: a figure of eight, whole turns a loop (0 at the start); its velocity, for where it looks between stars
  const cam = (t) => { const th = (TAU * n * t) / P; return [A * Math.sin(th), 0.4 * A * Math.sin(2 * th)]; };
  const camV = (t) => { const th = (TAU * n * t) / P, w = (TAU * n) / P; return [A * w * Math.cos(th), 0.8 * A * w * Math.cos(2 * th)]; };
  const N = whole(o.lkSpots), life = Math.min((P / Math.max(1, N)) * 0.92, 2.6), DEPTH = 0.45;
  const spots = Array.from({ length: N }, (_, i) => {
    const g = rng(o.seed, 171, i), at = ((i + g.range(0.05, 0.35)) / N) * P;
    // somewhere in the scene, clear of the blob
    let x = room[0] + g.range(0.1, 0.9) * W, y = room[1] + g.range(0.1, 0.75) * H;
    if (Math.hypot(x, y) < o.size * 2.6) { const th = g.range(0, TAU); x = Math.cos(th) * o.size * 3.2; y = Math.sin(th) * o.size * 2.2 - o.size; }
    return { at, x, y, spin: g.range(0, 1), kind: g.next() };
  });
  // a spot's presence (0..1) and how hard it is stared at
  const presence = (sp, t) => { const d = around(t, sp.at, P); return d < 0 || d > life ? 0 : d / life; };
  const where = (sp, t) => { const [cx, cy] = cam(t); return [sp.x - cx * DEPTH, sp.y - cy * DEPTH]; };
  const stare = (q) => (q <= 0 ? 0 : ease.inOutSine(clamp(q / 0.18)) * (1 - ease.inOutSine(seg2(q, 0.72, 1))));
  const mods = (t) => {
    const [vx, vy] = camV(t), vm = Math.hypot(vx, vy) || 1, idle = 0.6 * Math.min(1, vm / 30);
    let gx = (vx / vm) * idle, gy = (vy / vm) * idle * 0.6, wonder = 0, hop = 0, lean = 0, dxs = 0, at = null;
    for (const sp of spots) {
      const q = presence(sp, t), w = stare(q);
      if (w <= 0) continue;
      const [x, y] = where(sp, t), d = Math.hypot(x, y) || 1;
      gx = lerp(gx, (x / d) * 2, w); gy = lerp(gy, (y / d) * 1.5, w);
      if (w > wonder) at = [x, y];
      wonder = Math.max(wonder, w); hop = Math.max(hop, Math.sin(Math.PI * clamp(q / 0.22)) * (q < 0.22 ? 1 : 0));
      lean += (x / d) * w * 0.12 * o.lkLean; dxs += (x / d) * w * o.size * 0.18 * o.lkLean;
    }
    // (a figure points at the star it stares at)
    return { lookX: gx * o.exLook, lookY: gy * o.exLook, eyeScale: 1 + 0.2 * wonder * o.lkWonder, dy: -hop * 4 * o.lkWonder, rot: lean, dx: dxs,
      sy: 1 + 0.05 * hop * o.lkWonder, sx: 1 - 0.03 * hop * o.lkWonder, halo: 1 + 0.3 * wonder * o.lkWonder, glow: 0.12 * wonder * o.lkWonder, ...(at ? { reach: at, reachK: 0.85 * wonder } : {}) };
  };
  return {
    mods,
    calm: true,
    world: (t) => { const w = worldOf(o.world), [cx, cy] = cam(t); return { w: { ...w, wLoops: whole(o.loops, 1), wState: "still", wCamX: (w.wCamX || 0) + cx, wCamY: (w.wCamY || 0) + cy }, wt: t }; },
    back(p, C, Cf, t) {
      for (const sp of spots) {
        const q = presence(sp, t);
        if (q <= 0) continue;
        const [x, y] = where(sp, t), grow = ease.outBack(clamp(q / 0.2)) * (1 - ease.inCubic(seg2(q, 0.75, 1)));
        const tw = 0.85 + 0.15 * Math.sin(TAU * q * 6 + sp.spin * TAU), L = o.lkSpotSize * grow * tw;
        starBurst(p, Cf, x, y, L, Math.min(1, grow * 1.5), (sp.kind > 0.5 ? 1 : -1) * q * 0.8);
        // a ring of light as it opens
        if (q < 0.3) { const r = 2 + q * 55, al = 1 - q / 0.3, m = Math.ceil(r * 6); for (let j = 0; j < m; j++) { const th = (j / m) * TAU; p.dot(x + Math.cos(th) * r, y + Math.sin(th) * r, Cf[6], al * 0.8); } }
      }
    },
    front() {},
  };
};
const seg2 = (t, a, b) => clamp((t - a) / (b - a));

// ---- swimming: strokes. It gathers itself (shorter, wider), kicks (long, fast), then glides; the tail sweeps, the
// fins flare, the body waves, a wake trails behind and a ring of light marks each kick. The world lurches at each kick:
// its clock runs at 1 + a (cos + cos 2 / 2), two harmonics with no mean, so it still scrolls whole tiles a loop
X.swim = (o) => {
  const tr = travel(o), { P, a, c, s, vFlow } = tr, n = whole(o.swStrokes, 1), A = clamp(o.swKick, 0, 0.6);
  const stroke = (t) => {
    const th = (TAU * n * t) / P, f = 1 + A * (Math.cos(th) + 0.5 * Math.cos(2 * th));
    return { th, f, x: t + ((A * P) / (TAU * n)) * (Math.sin(th) + 0.25 * Math.sin(2 * th)), ph: ((th / TAU) % 1 + 1) % 1 };
  };
  const kOf = (f) => clamp((1 - Math.exp(-(Math.max(0, o.exSpeed) * f) / 3.5)) * Math.max(0, o.exDeform), 0, 1.5);
  const mods = (t) => {
    const sk = stroke(t), k = kOf(sk.f), gather = Math.sin(Math.PI * seg2(sk.ph, 0.55, 1)) ** 1.5 * Math.min(1, o.exSpeed);
    const m = dropMods(o, k, a, phase(o, t), { squash: 0.2 * gather, tail: 0.5 * o.swSway * Math.sin(sk.th), wave: 1 + o.swWave, ripple: n * 2,
      fins: 0.4 * o.swFins * (0.45 + 0.55 * Math.cos(sk.th)) * Math.min(1, o.exSpeed) });
    // (a figure swims with its arms: they gather, then pull wide)
    return { ...m, rot: m.rot + 0.12 * o.swSway * Math.sin(sk.th + 0.6) * Math.min(1, o.exSpeed), dx: c * gather * o.size * 0.12, dy: s * gather * o.size * 0.12, quiet: o.exSpeed > 0 ? 1 : 0,
      ...(isForm(o) ? { reachK: 0.4 * gather, armUp: 0.7 * gather, armOpen: 0.9 * (0.5 + 0.5 * Math.cos(sk.th)) * Math.min(1, o.exSpeed) } : {}) };
  };
  return {
    mods,
    calm: o.exSpeed <= 0,
    world: (t) => ({ w: worldFor(o), wt: stroke(t).x }),
    back(p, C, Cf, t, st, M) {
      const k = kOf(stroke(t).f);
      speedLines(p, Cf, t, st, k, false, o, tr);
      if (o.exSpeed <= 0) return;
      // the wake: a ribbon of light that keeps the tail's sweep and drifts back, thinning out
      const L = o.size * (3 + 3 * o.swWake) * o.exLength, v = Math.max(30, vFlow * 0.6);
      if (o.swWake > 0) for (let d = 0; d <= L; d += 1) {
        const tt = t - d / v, th = (TAU * n * tt) / P, sw = o.size * 0.5 * o.swSway * Math.sin(th) * Math.min(1, d / o.size);
        const q = d / L, x = st.x - c * (o.size * 0.6 + d) - s * sw, y = st.y - s * (o.size * 0.6 + d) + c * sw, r = o.size * 0.32 * Math.min(1, o.swWake) * (1 - q) ** 1.1;
        if (r >= 1.2) p.disc(x, y, r, (e) => (e < 0.3 && q < 0.35 ? WHITE : e < 0.65 ? Cf[6] : Cf[4]), (e) => (e < 0.65 ? 0.85 : 0.5) * (1 - q * 0.7));
        else p.dot(x, y, Cf[5], 0.8 * (1 - q));
        if (d % 8 === 0) p.glow(x, y, r * 2 + 3, Cf[5], 0.22 * (1 - q) * o.exPower);
      }
      // rings of light, one (or more) at each kick, carried away
      const per = P / n, nb = whole(o.swBubbles);
      for (let b = 0; b < nb; b++) {
        const age = (((t - b * 0.12) % per) + per) % per, lifeB = Math.min(per * 0.9, 1.1);
        if (age > lifeB) continue;
        const q = age / lifeB, s0 = state(o, t - age, M), r = 2 + 9 * ease.outCubic(q) * (1 - b * 0.25), back = o.size * 0.9 + v * 0.7 * age;
        const x = s0.x - c * back, y = s0.y - s * back, m = Math.ceil(r * 6);
        for (let j = 0; j < m; j++) { const th = (j / m) * TAU, e = 1 - 0.45 * Math.abs(Math.cos(th - a)); p.dot(x + Math.cos(th) * r * e, y + Math.sin(th) * r * e, q < 0.25 ? WHITE : Cf[6], (1 - q) * 0.9); }
        p.glow(x, y, r + 2, Cf[5], 0.25 * (1 - q) * o.exPower);
      }
    },
    front(p, C, Cf, t, st, M) {
      const k = kOf(stroke(t).f);
      shedSparks(p, Cf, t, M, k, o.exParticles * 0.6, o, tr);
      speedLines(p, Cf, t, st, k, true, o, tr);
    },
  };
};

// ---- turns: it slaloms through the world. It flies on at its speed while the camera sways across its way, a whole
// number of times a loop, so the world swings side to side (with parallax); it banks into each bend, comes nearer and
// goes farther (it grows and shrinks a little) and leaves a curved trail of light that drifts off with the world
X.turns = (o) => {
  const tr = travel(o), { P, a, c, s, vNear } = tr, n = whole(o.trTurns, 1), A = o.trAmp, px = -s, py = c, fol = clamp(o.trFollow, 0, 1);
  const th = (t) => (TAU * n * t) / P, w = (TAU * n) / P;
  // across its way: the camera does (1 - follow) of the swing, the blob on screen the rest
  const camOf = (t) => { const v = A * (1 - fol) * Math.sin(th(t)); return [px * v, py * v]; };
  const offOf = (t) => A * fol * Math.sin(th(t));
  // the way it really goes, relative to the world: on at its speed, plus the swing
  const dirOf = (t) => { const fwd = Math.max(vNear, 30), lat = A * w * Math.cos(th(t)), x = c * fwd + px * lat, y = s * fwd + py * lat, m = Math.hypot(x, y); return [x / m, y / m]; };
  const kAt = (t) => clamp((1 - Math.exp(-Math.max(0, o.exSpeed) / 3.5)) * Math.max(0, o.exDeform) * (1 + 0.25 * Math.abs(Math.cos(th(t)))), 0, 1.5);
  const mods = (t) => {
    const [dx, dy] = dirOf(t), head = Math.atan2(dy, dx), k = kAt(t);
    let turn = head - a; turn -= TAU * Math.round(turn / TAU);
    const m = dropMods(o, k, head, phase(o, t), { bank: turn * 0.9 * o.trBank });
    const off = offOf(t), depth = Math.cos(th(t) * 2 + Math.PI / 2);
    return { ...m, dx: px * off, dy: py * off, grow: 1 + o.trDepth * depth, quiet: 1 };
  };
  // where the blob was at t - tau, as the world has carried that spot since
  const trailAt = (t, tau, M) => {
    const s0 = state(o, t - tau, M), [c1x, c1y] = camOf(t), [c0x, c0y] = camOf(t - tau), fwd = Math.max(vNear, 30) * tau;
    return [s0.x - c * fwd - (c1x - c0x), s0.y - s * fwd - (c1y - c0y)];
  };
  return {
    mods,
    calm: false,
    world: (t) => { const w = worldFor(o), [cx, cy] = camOf(t); return { w: { ...w, wCamX: (w.wCamX || 0) + cx, wCamY: (w.wCamY || 0) + cy }, wt: t }; },
    back(p, C, Cf, t, st, M) {
      const k = kAt(t);
      speedLines(p, Cf, t, st, k, false, o, tr, dirOf);
      if (o.trTrail <= 0) return;
      // the trail: a ribbon of light thinning out behind, along the curve it flew
      const Tt = 0.7 * o.trTrail * o.exLength, steps = 40;
      let prev = null;
      for (let i = 0; i <= steps; i++) {
        const q = i / steps, [x, y] = trailAt(t, q * Tt, M), r = o.size * 0.55 * (1 - q) ** 1.2 * st.grow;
        if (prev) {
          const segs = Math.ceil(Math.hypot(x - prev[0], y - prev[1]) * 1.5);
          for (let j = 0; j < segs; j++) {
            const f = j / segs, xx = lerp(prev[0], x, f), yy = lerp(prev[1], y, f), rr = lerp(prev[2], r, f);
            if (rr >= 1.2) p.disc(xx, yy, rr, (d) => (d < 0.35 && q < 0.4 ? WHITE : d < 0.7 ? Cf[6] : Cf[4]), (d) => (d < 0.7 ? 0.9 : 0.55) * (1 - q * 0.6));
            else p.dot(xx, yy, Cf[5], 0.8 * (1 - q));
          }
        }
        if (i % 5 === 0) p.glow(x, y, r * 2 + 3, Cf[5], 0.25 * (1 - q) * o.exPower);
        if (prev && q < 0.7) p.line(prev[0], prev[1], x, y, q < 0.3 ? WHITE : Cf[7]);
        prev = [x, y, r];
      }
    },
    front(p, C, Cf, t, st, M) {
      const k = kAt(t);
      shedSparks(p, Cf, t, M, k, o.exParticles * 0.7, o, tr, dirOf);
      speedLines(p, Cf, t, st, k, true, o, tr, dirOf);
    },
  };
};

// ---- collecting stars: stars come at it with the world, each a little off its way; it darts across to meet each
// one, gulps it down (it swells, glows, its eyes smile) and a burst of light scatters behind it
X.collect = (o) => {
  const tr = travel(o), { P, a, c, s, vNear } = tr, px = -s, py = c, N = whole(o.clCount, 1);
  const v = Math.max(vNear * 0.9, 45), reach = 0.45; // how fast the stars come; how long (s) it takes to dart across
  const stars = Array.from({ length: N }, (_, i) => {
    const g = rng(o.seed, 191, i);
    return { at: ((i + g.range(0.25, 0.75)) / N) * P, side: (i % 2 ? 1 : -1) * g.range(0.35, 1) * o.clSpread, spin: g.range(0, TAU), tw: g.next() };
  });
  // how far across its way it is at t: it moves to meet the next star, smoothly, and drifts back in between
  const across = (t) => { let d = 0; for (const sr of stars) { const e = around(t, sr.at, P) / reach; d += sr.side * Math.exp(-e * e * 1.4); } return d; };
  const gulpOf = (t) => { let g = 0; for (const sr of stars) { const d = around(t, sr.at, P); if (d >= 0 && d < 0.9) g = Math.max(g, (1 - d / 0.9) ** 2 * Math.min(1, d / 0.06)); } return g; };
  const rush = (t) => { let r = 0; for (const sr of stars) { const d = -around(t, sr.at, P); if (d > 0 && d < 0.6) r = Math.max(r, Math.sin(Math.PI * d / 0.6)); } return r; };
  const kAt = (t) => clamp((1 - Math.exp(-Math.max(0, o.exSpeed) / 3.5)) * Math.max(0, o.exDeform) + 0.25 * rush(t), 0, 1.5);
  const mods = (t) => {
    const k = kAt(t), g = gulpOf(t) * o.clGulp, off = across(t), e = 0.004 * P, vl = (across(t + e) - across(t - e)) / (2 * e);
    const head = Math.atan2(s * Math.max(vNear, 30) + py * vl, c * Math.max(vNear, 30) + px * vl);
    const m = dropMods(o, k * (1 - 0.6 * g), head, phase(o, t));
    return { ...m, dx: px * off, dy: py * off, grow: 1 + 0.14 * g, glow: m.glow + 0.45 * g, halo: m.halo + 0.6 * g, happy: g > 0.35 ? 1 : 0, quiet: 1 };
  };
  const C2 = (C) => shifted(C, o.clHue);
  return {
    mods,
    calm: false,
    world: (t) => ({ w: worldFor(o), wt: t }),
    back(p, C, Cf, t, st, M) {
      speedLines(p, Cf, t, st, kAt(t), false, o, tr);
      const Cs = C2(C), home = state(o, t, null);
      // the stars, coming in with the world to where it will meet them
      for (const sr of stars) {
        const d = around(t, sr.at, P);
        if (d > 0.08) continue;
        const k0 = state(o, sr.at, M), x = k0.x + c * v * -d, y = k0.y + s * v * -d;
        const shrink = d > 0 ? 1 - d / 0.08 : 1, L = o.clSize * shrink * (0.85 + 0.15 * Math.sin(TAU * (phase(o, t) * whole(P * 1.5, 1) + sr.tw)));
        const gx = x - (d > 0 ? (x - st.x) * (d / 0.08) : 0), gy = y - (d > 0 ? (y - st.y) * (d / 0.08) : 0);
        gemStar(p, Cs, gx, gy, L, Math.sin(TAU * (t / P) * whole(o.loops, 1) * 2 + sr.spin) * 0.35);
        // its sparkle: a thin cross that flashes now and then
        const fl = Math.max(0, Math.sin(TAU * (phase(o, t) * whole(P * 0.9, 1) + sr.tw))) ** 6;
        if (fl > 0.2) starBurst(p, Cs, gx, gy, L * (1 + 0.8 * fl), fl, Math.PI / 4);
      }
      void home;
    },
    front(p, C, Cf, t, st, M) {
      const Cs = C2(C);
      // the burst: sparks thrown out from it, carried back by the speed
      for (const sr of stars) {
        const d = around(t, sr.at, P);
        if (d < 0 || d > 0.85 || o.clBurst <= 0) continue;
        const q = d / 0.85, s0 = state(o, sr.at, M), g = rng(o.seed, 197, Math.round(sr.at * 1000));
        if (q < 0.25) { const r = o.size * (0.9 + 2.2 * ease.outCubic(q / 0.25)), m = Math.ceil(r * 6); for (let j = 0; j < m; j++) { const th = (j / m) * TAU; p.dot(st.x + Math.cos(th) * r, st.y + Math.sin(th) * r, j % 3 ? Cs[6] : WHITE, 1 - q / 0.25); } }
        for (let j = 0, m = whole(14 * o.clBurst); j < m; j++) {
          const th = g.range(0, TAU), sp = g.range(30, 90), x = s0.x + Math.cos(th) * sp * d - c * Math.max(vNear, 20) * d * 0.8, y = s0.y + Math.sin(th) * sp * d - s * Math.max(vNear, 20) * d * 0.8;
          if (q > 0.7 && (j + Math.floor(d * 24)) % 2) continue;
          p.px(x, y, q < 0.3 ? WHITE : q < 0.6 ? Cs[6] : Cs[4]);
          if (j % 3 === 0) p.glow(x, y, 4, Cs[5], 0.35 * (1 - q) * o.exPower);
        }
        p.glow(st.x, st.y, o.size * (1.5 + q), Cs[6], 0.4 * (1 - q) * o.exPower);
      }
      shedSparks(p, Cf, t, M, kAt(t), o.exParticles * 0.5, o, tr);
      speedLines(p, Cf, t, st, kAt(t), true, o, tr);
    },
  };
};

// ---- walking and running (the human form on its legs): side on, it walks or runs on the spot while the world goes by
// under its feet at exactly the speed of its steps, so the foot on the ground stays planted on it: on a planet's surface the
// meadow it stands on (whichever of the three it is), in space its own floor of ice (with the near stars). Whole tiles of
// that ground a loop and whole strides a loop: the speed and the cadence are the nearest to the ones asked for that loop
const gaitAct = (kind) => (o) => {
  const P = total(o), room = roomOf(o), T = worldTile(room), L = whole(o.loops, 1), dir = o.gaDir === "left" ? -1 : 1, w = worldOf(o.world);
  const FY = floorFor(o) ?? 0, depth = groundDepth(w, FY - room[1], room[3] - room[1]);
  const plan = gaitPlan(o, kind, P, T, kind === "run" ? o.gaRun : o.gaWalk, o.gaStride), ph0 = 0.1;
  const gait = (t) => {
    const c = (plan.N * t) / P + ph0;
    return { kind, ph: c - Math.floor(c), cyc: c, S: plan.S, v: plan.v, rate: plan.rate, N: plan.N, dir, arms: o.gaArms, lean: o.gaLean,
      bounce: o.gaBounce, heel: o.gaHeel, knee: o.gaKnee, hair: o.gaHair, prints: o.gaPrints, sparks: o.gaSparks };
  };
  return {
    plan,
    mods: (t) => ({ gait: gait(t), quiet: 1 }),
    calm: true,
    // (far layers go by at whole tiles a loop too: those too far to make one stay where they are)
    world: (t) => ({ w: { ...w, wLoops: L, wState: "moving", wDrift: plan.tiles / depth, wDir: dir > 0 ? "left" : "right", wAllMove: 0 }, wt: t }),
    back() {},
    front() {},
  };
};
X.walk = gaitAct("walk");
X.run = gaitAct("run");
/** Walking or running: how fast it really goes and its strides, for the page (null for the other actions). */
export const gaitOf = (o) => (o.explore === "walk" || o.explore === "run") && fitsForm(o) ? actOf(o).plan : null;

const cache = new WeakMap();
// an action its form can't do: it just rests in that form, the world still round it
const REST = (o) => ({ mods: () => ({}), calm: true, world: (t) => ({ w: { ...worldOf(o.world), wLoops: whole(o.loops, 1), wState: "still" }, wt: t }), back() {}, front() {} });
const actOf = (o) => {
  let x = cache.get(o);
  if (!x) { x = fitsForm(o) ? (X[o.explore] || X.move)(o) : REST(o); cache.set(o, x); }
  return x;
};
// the blob's own look, its light on the ground only if asked; on a planet's surface, on its legs, it stands on the
// ground itself: no floor of ice under its feet
const BODY = new WeakMap(), bodyOf = (o) => { let b = BODY.get(o); if (!b) { b = { ...o, ground: o.ground * clamp(o.exGround, 0, 2), grNoFloor: isSurface(o.world) ? 1 : 0 }; BODY.set(o, b); } return b; };

// on its legs on a planet's surface it stands at a depth of the meadows: what stands up nearer to us than its feet
// passes in front of it (painted after it), the rest of the world behind it
const cutOf = (o) => (o.form === "grounded" && isSurface(o.world) && +o.exFront !== 0 ? floorFor(o) : null);
export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), Cf = shifted(C, o.exHue || 0), act = actOf(o), ob = bodyOf(o), M = (tt) => act.mods(tt), P = total(o), cut = cutOf(o);
  const { w, wt } = act.world(t);
  paintWorld(p, w, ((wt % P) + P) % P, P, roomOf(o), [0, 0], cut === null ? null : { part: "back", y: cut });
  const st = state(ob, t, M);
  act.back(p, C, Cf, t, st, M);
  bodyBack(p, t, ob, M, C, P);
  if (act.calm) bodyAmbient(p, t, ob, false, C);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), Cf = shifted(C, o.exHue || 0), act = actOf(o), ob = bodyOf(o), M = (tt) => act.mods(tt), P = total(o), cut = cutOf(o);
  const st = bodyFront(p, t, ob, M, C, P);
  if (act.calm) bodyAmbient(p, t, ob, true, C);
  if (cut !== null) { const { w, wt } = act.world(t); paintWorld(p, w, ((wt % P) + P) % P, P, roomOf(o), [0, 0], { part: "front", y: cut }); }
  act.front(p, C, Cf, t, st, M);
}
