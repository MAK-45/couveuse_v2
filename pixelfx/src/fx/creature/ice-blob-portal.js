// The blob opens a portal onto another world. Through it, and only through it, you see that world (a backdrop
// from ice-worlds.js: deep space for now), alive on its own clock. Three animations chain frame for frame:
//   open   from the Blob né's rest: it turns to the spot, sends a ray of light, the portal tears open, and it is
//          back at rest with the portal there
//   live   the blob's rest with the portal open, for as long as the world takes to loop
//   close  from that, the blob closes the portal and is back at plain rest
//   cross  from "live", the blob goes through: it dives into the portal while its mirror image comes to meet it
//          from the other side, they merge, the portal swells until the other world fills the scene, and the blob
//          comes out of the portal seen from behind (set mirror-wise, on the other side of its spot), back to rest
//   beyond the blob's rest in the other world: the world fills the scene (still or moving, as the world is set),
//          no portal (a crossing that keeps its portal open ends on "beyondOpen" instead)
//   reopen     from "beyond", the blob opens a portal home (our dark world inside it), where it came out
//   beyondOpen its rest in the other world with that portal open
//   return     from "beyondOpen", the way back: the same crossing the other way, out of the first portal at home,
//              which closes behind it (back on the Blob né's rest) or stays open (back on "live")
// So: rest -> open -> live (as often as you like) -> close -> rest, or ... -> live -> cross -> beyond (looping)
//     -> reopen -> beyondOpen (looping) -> return -> rest (or live).
//
// The world runs on its own clock, periodic over a whole number of the blob's loops (P). In "open" that clock is
// set back by the animation's length, so it reaches 0 exactly on the last frame, where "live" starts; "close"
// starts on it at 0. The blob's part goes neutral at both ends (prog/castMods, as for the objects).
import { fit, clamp, lerp, seg, bump, ease, noise2, rng, cycle, TAU, WHITE, hex, mix, createFrame, clearFrame, painterFor } from "../../core/index.js";
import { meta as idleMeta, state } from "./ice-blob-idle.js";
import { prog as progAt } from "./ice-time.js";
import { bodyBack, bodyFront, bodyAmbient, floorFor } from "./ice-blob-transform.js";
import { hsl, fromHsl } from "./ice-blob-actions.js";
import { renderWorld, worldOf, worldPeriod, worldTile, paintWorld, isSurface } from "./ice-worlds.js";

export const MODES = ["open", "live", "close", "cross", "beyond", "reopen", "beyondOpen", "return"];
export const OPEN = ["tear", "spiral", "bloom"];
export const CLOSE = ["seal", "implode", "fade"];
export const SHAPES = ["oval", "circle", "arch", "rift", "diamond"];

export const meta = {
  name: "Ice blob portal",
  desc: "The ice blob tears open a portal onto another world (deep space, seen only through it), keeps it open on its rest loop and closes it; each animation chains with the next.",
  tags: ["creature", "blob", "portal", "world", "space", "ice", "light", "loop"],
  size: [320, 180],
  origin: [160, 100],
  duration: 8,
  loop: true,
  fps: 30,
  bg: "black",
  options: {
    ...idleMeta.options,
    // the world seen through it (null: deep space with its defaults) and the scene's bounds in local pixels
    world: null, room: null,
    form: "blob", mode: "open", loops: 2, lead: 0.08, castLean: 1,
    // the portal: centre (offset from the blob's spot), height, width / height, shape, plane
    pX: 92, pY: -16, pH: 84, pRatio: 0.62, pShape: "oval", pLayer: "back",
    // its look: rim hue shift, rim thickness, glow, swirls a world loop, sparks, what leaks out, edge wobble, lens
    pHue: 0, pRim: 3, pGlow: 1, pSwirl: 2, pFlames: 1, pSparks: 12, pLeak: 10, pWobble: 1, pLens: 0.5, pLip: 1,
    // which part of the world shows through it (a shift of the view, own pixels)
    pViewX: 0, pViewY: 0,
    openStyle: "tear", openPower: 1, openParticles: 24, openBeam: 1,
    closeStyle: "seal", closePower: 1, closeParticles: 24,
    // going through: the portal stays open behind it on the other side, its mirror image, the wind-up, the leap
    crossKeep: 0, returnKeep: 0, crossMirror: 1, crossSquash: 1, crossArc: 1, crossFlash: 1, crossLook: 1,
  },
};

const E = ease.inOutSine;
const roomOf = (o) => (Array.isArray(o.room) ? o.room : [-meta.origin[0], -meta.origin[1], meta.size[0] - meta.origin[0], meta.size[1] - meta.origin[1]]);
const worldIn = (o) => worldOf(o.world);
/** How long the animation lasts: "live" lasts the world's loop, the others a whole number of the blob's loops. */
const LOOPING = new Set(["live", "beyond", "beyondOpen"]);
export const total = (o) => (LOOPING.has(o.mode) ? worldPeriod(o.duration, worldIn(o)) : o.duration * Math.max(1, Math.round(o.loops)));
// as for the actions: the lead-out outlasts a drop of light, so the last frame is the rest's
const prog = (o, t) => progAt(o, t, total(o));
// the world's clock: in "open" it reaches 0 on the last frame, where "live" begins. In "cross" it starts at 0 (from
// "live") and must be back at 0 at the end (where "beyond" begins): it runs a little faster or slower in the middle
// of the animation, by the smallest shift that does it, and at its own pace near both ends
function clockOf(o, t, P) {
  let x = t;
  if (o.mode === "open") x = t - total(o);
  if (o.mode === "cross" || o.mode === "return" || o.mode === "reopen") {
    const T = total(o), r = ((T % P) + P) % P, shift = r > P / 2 ? r - P : r;
    x = t - shift * E(seg(((t / T) % 1 + 1) % 1, 0.1, 0.9));
  }
  return ((x % P) + P) % P;
}
const ln = (x, y, u, s, r = 1) => noise2(x + Math.cos(TAU * u) * r, y + Math.sin(TAU * u) * r, s);
const hash = (x, y, s) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
const whole = (v, lo = 0) => Math.max(lo, Math.round(v));

const palCache = new Map();
function paletteFor(o, hue) {
  if (!hue) return fit(o.palette, 8);
  const key = o.palette.join() + "|" + hue;
  if (!palCache.has(key)) palCache.set(key, fit(o.palette.map((c) => { const [h, s, l] = hsl(c); return fromHsl((((h + hue) % 360) + 360) % 360, s, l); }), 8));
  return palCache.get(key);
}

// ---- shapes, as a distance where 1 is the edge (u, v: across and down, -1..1 at the edge)
function shapeR(shape, u, v) {
  switch (shape) {
    case "arch": return v < 0 ? Math.hypot(u, v) : Math.max(Math.abs(u), v);
    case "rift": { const k = 1 - v * v; return k <= 0.02 ? 9 : Math.max(Math.abs(v), Math.abs(u) / Math.pow(k, 0.9)); }
    case "diamond": return Math.abs(u) + Math.abs(v);
    default: return Math.hypot(u, v);
  }
}
// a point on the edge at angle th (body space of the shape, before rotation)
function edgeAt(shape, th) {
  const c = Math.cos(th), s = Math.sin(th);
  const r = shapeR(shape, c, s);
  return [c / r, s / r];
}

// ---- how open the portal is, and the light of its making: { sx, sy, rot, reveal, hot, open, show }
const FULL = { sx: 1, sy: 1, rot: 0, reveal: 1, hot: 0, open: 1, show: true, rimVis: 1 };
function opening(o, a, rx) {
  if (a <= 0) return null;
  if (a >= 1) return FULL;
  const slit = Math.min(1, 1.1 / Math.max(1, rx));
  switch (o.openStyle) {
    case "spiral": {
      const k = seg(a, 0.42, 0.62), s = ease.outBack(k, 1.6);
      return { sx: s, sy: s, rot: (1 - k) * (1 - k) * TAU * 1.25, reveal: 1, hot: 1 - seg(a, 0.5, 0.7), open: k, show: k > 0, rimVis: 1 };
    }
    case "bloom": {
      const k1 = seg(a, 0.3, 0.45), k2 = seg(a, 0.45, 0.62), s = k2 > 0 ? lerp(1.3, 1, E(k2)) : 1.3 * ease.outCubic(k1);
      return { sx: s, sy: s, rot: 0, reveal: seg(a, 0.38, 0.62), hot: 1 - seg(a, 0.45, 0.68), open: seg(a, 0.3, 0.62), show: k1 > 0, rimVis: 1 };
    }
    default: { // tear: a point of light, a slit that runs up and down, then it parts
      const k1 = seg(a, 0.3, 0.42), k2 = seg(a, 0.42, 0.6);
      return { sx: k2 > 0 ? slit + (1 - slit) * ease.outBack(k2, 1.3) : slit, sy: ease.outCubic(k1), rot: 0, reveal: 1, hot: 1 - seg(a, 0.48, 0.7), open: k2, show: k1 > 0, rimVis: 1 };
    }
  }
}
function closing(o, a, rx) {
  if (a <= 0) return FULL;
  if (a >= 1) return null;
  const slit = Math.min(1, 1.1 / Math.max(1, rx));
  switch (o.closeStyle) {
    case "implode": {
      const k = seg(a, 0.3, 0.56), s = 1 - ease.inBack(k, 1.4);
      return { sx: s, sy: s, rot: ease.inCubic(k) * TAU * 2, reveal: 1, hot: seg(a, 0.22, 0.45), open: 1 - k, show: k < 1, rimVis: 1 };
    }
    case "fade": {
      const k = seg(a, 0.3, 0.55), r = seg(a, 0.45, 0.66);
      return { sx: 1, sy: 1, rot: 0, reveal: 1 - k, hot: seg(a, 0.25, 0.45) * 0.6, open: 1 - r, show: r < 1, rimVis: 1 - r };
    }
    default: { // seal: it pinches to a slit, the slit shrinks to a point, a spark
      const k1 = seg(a, 0.3, 0.46), k2 = seg(a, 0.46, 0.58);
      return { sx: 1 - (1 - slit) * ease.inCubic(k1), sy: 1 - ease.inCubic(k2), rot: 0, reveal: 1, hot: seg(a, 0.24, 0.42), open: 1 - k1, show: k2 < 1, rimVis: 1 };
    }
  }
}

// ---- the portal itself: the world inside, the inner lip, the rim of light, the halo
function drawPortal(p, o, C, g, wt, P, room) {
  if (!g || !g.show) return;
  const W = worldIn(o), Hh = o.pH / 2, Wh = o.pShape === "circle" ? Hh : Hh * o.pRatio;
  const rx = Math.max(0.5, Wh * g.sx), ry = Math.max(0.5, Hh * g.sy), cx = g.cx ?? o.pX, cy = g.cy ?? o.pY, voidIn = g.inner === "void", lensK = g.lens ?? 1;
  const rimW = Math.max(1, Math.round(o.pRim)), lip = Math.max(0, Math.round(o.pLip)), wob = o.pWobble * Math.min(1, Math.min(rx, ry) / 6);
  const small = Math.min(1, Math.min(rx, ry) / 3), glowR = (4 + 3 * o.pGlow) * small, flameL = 4 * Math.max(0, o.pFlames) * Math.min(1, Math.min(rx, ry) / 8);
  const m = Math.ceil(rimW + wob * 1.6 + Math.max(glowR, flameL) + 2);
  const cr = Math.cos(-g.rot), sr = Math.sin(-g.rot), la = (o.lightAngle * Math.PI) / 180, lx = Math.cos(la), ly = Math.sin(la);
  const kT = Math.max(1, Math.round(P / o.duration)), uw = wt / P, swirl = TAU * whole(o.pSwirl) * uw, seed = o.seed + 61;
  const x0 = Math.max(Math.floor(room[0]), Math.floor(cx - Math.max(rx, ry) - m)), x1 = Math.min(Math.ceil(room[2]) - 1, Math.ceil(cx + Math.max(rx, ry) + m));
  const y0 = Math.max(Math.floor(room[1]), Math.floor(cy - Math.max(rx, ry) - m)), y1 = Math.min(Math.ceil(room[3]) - 1, Math.ceil(cy + Math.max(rx, ry) + m));
  if (x1 < x0 || y1 < y0) return;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, X0 = Math.round(x0 - room[0]), Y0 = Math.round(y0 - room[1]);
  // the world behind the portal, for the box it covers
  const wv = g.reveal > 0 && !voidIn ? renderWorld(W, wt, P, worldTile(room), X0 + Math.round(o.pViewX || 0), Y0 + Math.round(o.pViewY || 0), bw, bh, [W.wCamX || 0, W.wCamY || 0], [Math.ceil(room[2] - room[0]), Math.ceil(room[3] - room[1])]) : null;
  const hot = clamp(g.hot), black = hex("#000000");
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5, dx = px - cx, dy = py - cy, bx = dx * cr - dy * sr, by = dx * sr + dy * cr;
      const u = bx / rx, v = by / ry, r = shapeR(o.pShape, u, v), rho = Math.hypot(bx, by);
      const th = Math.atan2(v, u);
      const wn = wob > 0 ? ln(Math.cos(th) * 1.3, Math.sin(th) * 1.3, uw * kT, seed, 0.9) * 1.6 * wob : 0;
      const d = (r > 1e-6 ? rho * (1 / r - 1) : 99) + wn;
      if (d < -Math.max(glowR, flameL)) continue;
      const sth = Math.atan2(dy, dx), lit = Math.cos(sth) * lx + Math.sin(sth) * ly;
      if (d < 0) { // outside: tongues of energy licking off the rim, turning with it, and the halo
        if (flameL > 0 && g.rimVis > 0.5) {
          const fa = th - swirl * 0.5, fn = ln(Math.cos(fa) * 4.5, Math.sin(fa) * 4.5, uw * kT * 2, seed + 9, 0.8), h = Math.max(0, fn - 0.1) * 2.2 * flameL;
          if (-d < h) { p.px(px, py, -d > h * 0.6 ? C[3] : -d > h * 0.25 ? C[4] : C[5]); p.light(px, py, C[5], 0.15); continue; }
        }
        if (d >= -glowR) { const f = 1 + d / glowR; p.light(px, py, C[5], f * f * 0.35 * o.pGlow * g.rimVis); }
        continue;
      }
      if (d < rimW) { // the rim: a tube of ice light, bright outside, deeper inside, streaks turning round it
        if (g.rimVis < 1 && hash(x, y, 7) > g.rimVis) continue;
        const s = Math.sin(th * 3 + d * 0.9 - swirl) + ln(Math.cos(th) * 2, Math.sin(th) * 2, uw * kT, seed + 3, 0.7) * 1.2;
        const depth = d / rimW;
        let i;
        if (d < 1) i = lit > 0.3 ? 7 : lit > -0.35 ? 6 : 5;
        else i = (depth < 0.67 ? 5 : 4) + (s > 0.4 ? 1 : 0) + (s > 1.1 ? 1 : 0) + (lit > 0.5 ? 1 : 0) - (lit < -0.5 ? 1 : 0);
        i = Math.max(3, Math.min(7, i + Math.round(hot * 2.4)));
        p.px(px, py, i >= 7 ? WHITE : C[i]);
        if (s > 1.1 || hot > 0.3) p.light(px, py, C[6], 0.12 + 0.3 * hot);
        continue;
      }
      if (d < rimW + lip) { // the inner lip: the far side of the opening catches the light
        p.px(px, py, lit < -0.3 ? C[3] : C[1]);
        continue;
      }
      // the world, seen as through thick glass near the edge
      if (!wv || (g.reveal < 1 && hash(x, y, 3) > g.reveal)) { p.px(px, py, black); continue; }
      const lens = 1 + o.pLens * lensK * 0.45 * Math.pow(Math.min(1, r), 4);
      const sx = clamp(Math.floor(cx + dx * lens) - x0, 0, bw - 1), sy = clamp(Math.floor(cy + dy * lens) - y0, 0, bh - 1), j = sy * bw + sx;
      p.px(px, py, wv.col[j]);
      const L = wv.lit, q = j * 3;
      if (L[q] + L[q + 1] + L[q + 2] > 1) p.light(px, py, (255 << 24) | (Math.min(255, L[q + 2]) << 16) | (Math.min(255, L[q + 1]) << 8) | Math.min(255, L[q]), 1);
      if (hot > 0) p.light(px, py, WHITE, hot * 0.35 * (1 - Math.min(1, d / (rimW + 6))));
    }
  // sparks running round the rim, and bits of the other world drifting out of it
  const sc = g.open * g.rimVis;
  if (sc <= 0.02) return;
  const at = (th, out) => { const [ex, ey] = edgeAt(o.pShape, th), X = ex * rx + Math.cos(th) * out, Y = ey * ry + Math.sin(th) * out; return [cx + X * Math.cos(g.rot) - Y * Math.sin(g.rot), cy + X * Math.sin(g.rot) + Y * Math.cos(g.rot)]; };
  cycle(wt, P, whole(o.pSparks), o.seed + 71, (q) => q.range(0.9, 1.8), (age, life, q) => {
    const th0 = q.range(0, TAU), dir = q.next() < 0.5 ? -1 : 1, k = age / life, [sx, sy] = at(th0 + dir * k * q.range(1.2, 2.6), rimW * 0.5 + 1.5 * Math.sin(Math.PI * k));
    const al = Math.sin(Math.PI * k) * sc;
    p.dot(sx, sy, k < 0.6 ? WHITE : C[6], al);
    p.glow(sx, sy, 3, C[5], 0.3 * al * o.pGlow);
  });
  // (a portal seen from the other world lets out our own light)
  const surf = W.wType !== "space", nebA = voidIn ? C[5] : hex(surf ? W.wLeafLight : W.wNebA), nebB = voidIn ? C[4] : hex(surf ? W.wFlowerA : W.wNebB), star = voidIn ? C[6] : hex(surf ? W.wMoteCol : W.wStarCol);
  cycle(wt, P, whole(o.pLeak), o.seed + 83, (q) => q.range(1.8, 3.4), (age, life, q) => {
    const th = q.range(0, TAU), r0 = q.range(0.15, 0.85), k = age / life, out = ease.outQuad(k) * q.range(1.1, 2.2);
    const [ex, ey] = edgeAt(o.pShape, th), rr = r0 + out, X = ex * rx * rr + Math.sin(k * 5 + th * 3) * 1.5, Y = ey * ry * rr - k * 4;
    const x = cx + X * Math.cos(g.rot) - Y * Math.sin(g.rot), y = cy + X * Math.sin(g.rot) + Y * Math.cos(g.rot);
    const al = Math.sin(Math.PI * k) * sc, c = q.next() < 0.35 ? star : q.next() < 0.5 ? nebA : nebB;
    p.dot(x, y, mix(c, WHITE, 0.25), al);
    p.glow(x, y, 3, c, 0.35 * al * o.pGlow);
  });
}

// ---- the blob turns toward the portal, lights up, sends the ray, is pleased
function castMods(o, t, target) {
  const a = prog(o, t);
  if (a <= 0 || a >= 1) return { quiet: 0 };
  const env = E(seg(a, 0, 0.2)) * (1 - E(seg(a, 0.7, 0.95)));
  const st = state(o, t, null), d = Math.hypot(target[0] - st.x, target[1] - st.y) || 1, dx = (target[0] - st.x) / d, dy = (target[1] - st.y) / d;
  // (a figure holds out its hand to the portal)
  return { dx: dx * 5 * env * o.castLean, dy: dy * 3 * env * o.castLean, lookX: dx * 1.6 * env, lookY: dy * 1.1 * env, rot: dx * 0.15 * env * o.castLean,
    glow: 0.4 * bump(a, 0.08, 0.4), sy: 1 - 0.06 * bump(a, 0.08, 0.2) * o.castLean, happy: a > 0.72 && a < 0.92 ? 1 : 0, quiet: 1, reach: target, reachK: 0.95 * env * (1 - seg(a, 0.55, 0.75)) };
}

const spark = (p, C, x, y, a = 1) => { p.px(x, y, WHITE); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.dot(x + dx, y + dy, C[6], a); p.glow(x, y, 4, C[5], 0.35 * a); };
function plotLine(p, x0, y0, x1, y1, c, a = 1) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) {
    const x = Math.floor(x0 + ((x1 - x0) * i) / n) + 0.5, y = Math.floor(y0 + ((y1 - y0) * i) / n) + 0.5;
    a >= 1 ? p.px(x, y, c) : p.dot(x, y, c, a);
  }
}

// the light of the making and the unmaking, drawn over everything
function castFx(p, o, C, t, a, from, rx, ry) {
  if (a <= 0 || a >= 1) return;
  const cx = o.pX, cy = o.pY, open = o.mode === "open", P = open ? o.openPower : o.closePower, n = whole(open ? o.openParticles : o.closeParticles), g = rng(o.seed, open ? 606 : 707);
  // the ray: from the blob to the spot, the head racing ahead, then it fades
  if (open && o.openBeam > 0) {
    const reach = ease.outCubic(seg(a, 0.12, 0.26)), al = reach > 0 ? 1 - seg(a, 0.3, 0.38) : 0;
    if (al > 0) {
      const hx = lerp(from[0], cx, reach), hy = lerp(from[1], cy, reach);
      p.glowLine(from[0], from[1], hx, hy, 5, C[5], 0.4 * al * P);
      plotLine(p, from[0], from[1], hx, hy, al > 0.6 ? C[6] : C[5], al);
      spark(p, C, hx, hy, al);
      p.glow(hx, hy, 8, WHITE, 0.5 * al * P);
    }
  }
  const style = open ? o.openStyle : o.closeStyle;
  // a flash at the spot when it tears (or snaps shut)
  const fl = open ? 0.7 * bump(a, 0.27, 0.4) + 0.5 * bump(a, 0.42, 0.56) : bump(a, style === "fade" ? 0.55 : 0.54, 0.68);
  if (fl > 0) { p.glow(cx, cy, Math.max(10, Math.max(rx, ry) * 1.4), WHITE, 0.45 * fl * P); p.glow(cx, cy, 5, WHITE, 0.8 * fl * P); }
  if (open && style === "tear") {
    const k = seg(a, 0.3, 0.6);
    if (k > 0 && k < 1) for (let i = 0; i < Math.min(n, 18); i++) {
      const yy = cy + (hash(i, Math.floor(a * 80), 4) - 0.5) * ry * 2 * ease.outCubic(seg(a, 0.3, 0.42)), side = i % 2 ? 1 : -1;
      spark(p, C, cx + side * (rx * Math.min(1, ease.outBack(seg(a, 0.42, 0.6), 1.3)) + 1 + hash(i, 2, Math.floor(a * 60)) * 3), yy, 0.8 * (1 - k));
    }
  }
  if (open && style === "spiral") {
    const k = seg(a, 0.16, 0.46);
    if (k > 0 && k < 1) for (let i = 0; i < n; i++) {
      const th = g.range(0, TAU) + k * 5, R = Math.max(rx, ry) * g.range(1.4, 2.8) * (1 - ease.inQuad(k));
      spark(p, C, cx + Math.cos(th) * R, cy + Math.sin(th) * R * 0.9, 0.5 + 0.5 * k);
    }
  }
  if (open && style === "bloom") {
    const k = seg(a, 0.3, 0.55);
    if (k > 0 && k < 1) { const R = Math.max(rx, ry) * (0.4 + 1.6 * ease.outCubic(k)); p.glowRing(cx, cy, R, 6, C[5], 0.45 * (1 - k) * P); p.glowRing(cx, cy, R, 2, WHITE, 0.5 * (1 - k) * P); }
    const k2 = seg(a, 0.34, 0.6);
    if (k2 > 0 && k2 < 1) for (let i = 0; i < n; i++) { const th = g.range(0, TAU), R = Math.max(rx, ry) * (1 + g.range(0.2, 1.4) * ease.outCubic(k2)); spark(p, C, cx + Math.cos(th) * R, cy + Math.sin(th) * R, 1 - k2); }
  }
  if (!open) {
    const k = seg(a, 0.28, 0.56), k2 = seg(a, 0.54, 0.8);
    if (style === "implode" && k > 0 && k < 1) for (let i = 0; i < n; i++) {
      const th = g.range(0, TAU) - k * 6, R = Math.max(rx, ry) * g.range(1.3, 2.6) * (1 - k);
      spark(p, C, cx + Math.cos(th) * R, cy + Math.sin(th) * R, k);
    }
    if (style === "fade" && k > 0) for (let i = 0; i < n; i++) {
      const born = g.range(0, 1), age = (seg(a, 0.3, 0.75) - born * 0.6) * 2.2, th = g.range(0, TAU);
      if (age <= 0 || age >= 1) continue;
      const [ex, ey] = edgeAt(o.pShape, th);
      spark(p, C, cx + ex * rx + Math.sin(age * 6 + i) * 2, cy + ey * ry - age * 18, 1 - age);
    }
    if (k2 > 0 && k2 < 1) for (let i = 0; i < Math.min(n, 14); i++) { // the last spark scatters
      const th = g.range(0, TAU), R = g.range(4, 16) * ease.outCubic(k2);
      p.dot(cx + Math.cos(th) * R, cy + Math.sin(th) * R, i % 3 ? C[6] : WHITE, 1 - k2);
    }
  }
}

// ---- going through
// where the portal is on the other side: mirror-wise across the blob's spot, kept inside the scene
function mirrorSpot(o, room) {
  const Hh = o.pH / 2, Wh = o.pShape === "circle" ? Hh : Hh * o.pRatio, m = Wh + 6;
  return [clamp(-o.pX, room[0] + m, Math.max(room[0] + m, room[2] - m)), o.pY];
}
// how far the portal must swell, from its centre, to cover the whole scene
function coverScale(o, room, [cx, cy]) {
  const Hh = o.pH / 2, Wh = o.pShape === "circle" ? Hh : Hh * o.pRatio;
  const far = Math.max(...[[room[0], room[1]], [room[2], room[1]], [room[0], room[3]], [room[2], room[3]]].map(([x, y]) => Math.max(Math.abs(x - cx) / Wh, Math.abs(y - cy) / Hh)));
  return far * (o.pShape === "oval" || o.pShape === "circle" || o.pShape === "arch" ? 1.5 : 2.2) + 1;
}
// the timetable of the crossing (progress a): wind-up, the leap, the merge, the swell, out on the other side
const X = { lean: [0.04, 0.22], leap: [0.2, 0.44], shrink: [0.36, 0.47], merge: [0.41, 0.53], swell: [0.46, 0.6], open2: [0.58, 0.7], out: [0.64, 0.86], close2: [0.86, 0.96] };
// a way through: in at one portal, out of the other (there: in at the portal, out of its mirror; back: the reverse)
function wayOf(o, room) {
  const mp = mirrorSpot(o, room), home = [o.pX, o.pY];
  return o.mode === "return" ? { in: mp, out: home, inVoid: true, keep: o.returnKeep > 0 } : { in: home, out: mp, inVoid: false, keep: o.crossKeep > 0 };
}
function crossMods(o, t, way) {
  const mp = way.out;
  const a = prog(o, t);
  if (a <= 0 || a >= 1) return { quiet: 0 };
  const st = state(o, t, null), tx = way.in[0] - st.x, ty = way.in[1] - st.y, d = Math.hypot(tx, ty) || 1, ux = tx / d, uy = ty / d, S = o.size;
  const m = { quiet: 1, glow: 0.45 * bump(a, 0.08, 0.46) };
  if (a < 0.5) {
    // it gathers itself (backs off a little, squashes), looks at the portal, then leaps in and shrinks into it
    const w = bump(a, X.lean[0], X.lean[1]) * o.crossSquash, f = seg(a, X.leap[0], X.leap[1]), fe = ease.inOutCubic(f), fly = bump(f, 0, 1);
    const look = E(seg(a, 0, 0.12)) * (1 - seg(a, 0.4, 0.46));
    m.dx = -ux * 6 * w + tx * fe;
    m.dy = -uy * 4 * w + ty * fe - Math.sin(Math.PI * f) * S * 1.2 * o.crossArc;
    m.sy = (1 - 0.2 * w) * (1 + 0.22 * fly); m.sx = (1 + 0.14 * w) * (1 - 0.12 * fly);
    m.rot = ux * 0.25 * fly;
    m.lookX = ux * 1.7 * look; m.lookY = uy * 1.2 * look;
    m.grow = 1 - 0.95 * ease.inCubic(seg(a, X.shrink[0], X.shrink[1]));
    // (a figure dives in arms first)
    m.armUp = 0.9 * E(seg(a, X.lean[1] - 0.04, X.leap[0] + 0.08)); m.hold = 0.7 * w * (1 - m.armUp);
    if (a >= X.shrink[1]) m.vis = 0;
    return m;
  }
  if (a < X.out[0]) return { ...m, vis: 0, grow: 0.05 };
  // out of the portal on the other side, back to its spot, a look round its new world, pleased
  const g = seg(a, X.out[0], X.out[1]), ge = ease.outCubic(g), bx = mp[0] - st.x, by = mp[1] - st.y;
  const lk = seg(a, 0.84, 0.98);
  m.dx = bx * (1 - ge); m.dy = by * (1 - ge) - Math.sin(Math.PI * g) * S * 0.8 * o.crossArc;
  m.grow = 0.05 + 0.95 * ease.outBack(seg(a, X.out[0], 0.76), 1.6);
  m.rot = -Math.sign(bx || 1) * 0.2 * bump(g, 0, 0.7);
  m.lookX = Math.sin(TAU * lk) * 1.5 * o.crossLook; m.lookY = -0.4 * Math.sin(Math.PI * lk) * o.crossLook;
  m.happy = a > 0.8 && a < 0.94 ? 1 : 0;
  m.armOpen = 0.8 * bump(g, 0, 0.8);
  return m;
}
// both portals while it goes through: the first (worlds inside) and the one it comes out of (our void inside)
function crossing(o, a, room, way) {
  const Hh = o.pH / 2, Wh = o.pShape === "circle" ? Hh : Hh * o.pRatio, slit = Math.min(1, 1.1 / Math.max(1, Wh)), mp = way.out;
  let main = null, back = null;
  const z = seg(a, X.swell[0], X.swell[1]);
  // there: the world fills the scene once the portal has swollen over it; back: it does until then
  const full = way.inVoid ? z < 1 : z >= 1;
  if (z < 1) { const k = 1 + (coverScale(o, room, way.in) - 1) * ease.inCubic(z); main = { ...FULL, cx: way.in[0], cy: way.in[1], inner: way.inVoid ? "void" : undefined, sx: k, sy: k, lens: 1 - z, hot: 0.8 * bump(a, X.merge[0], X.merge[1]) }; }
  if (a > X.open2[0]) {
    const k1 = seg(a, X.open2[0], 0.64), k2 = seg(a, 0.62, X.open2[1]), c1 = seg(a, X.close2[0], 0.92), c2 = seg(a, 0.92, X.close2[1]);
    back = { ...FULL, cx: mp[0], cy: mp[1], inner: way.inVoid ? undefined : "void", sx: k2 > 0 ? slit + (1 - slit) * ease.outBack(k2, 1.3) : slit, sy: ease.outCubic(k1), hot: 1 - seg(a, 0.64, 0.8), open: k2 };
    if (!way.keep && c1 > 0) { back.sx = 1 - (1 - slit) * ease.inCubic(c1); back.sy = 1 - ease.inCubic(c2); back.hot = c1; back.open = 1 - c1; back.show = c2 < 1; }
  }
  return { main, back, full, mp };
}

// the blob's mirror image in the portal: the same blob, drawn aside and flipped across the portal's middle,
// darker, only where the portal's inside is, dissolving in as it starts (none on the first frame)
const scratch = new Map();
function reflect(p, o, t, M, C, k, room, [cx, cy]) {
  if (k <= 0) return;
  const f = p.frame, key = f.w + "x" + f.h + "x" + f.ox + "x" + f.oy;
  if (!scratch.has(key)) { if (scratch.size > 4) scratch.clear(); scratch.set(key, createFrame(f.w, f.h, f.ox, f.oy)); }
  const tf = clearFrame(scratch.get(key)), tp = painterFor(tf);
  tp.place(p.tx, p.ty);
  bodyBack(tp, t, o, M, C, total(o), 2); bodyFront(tp, t, o, M, C, total(o));
  const Hh = o.pH / 2, Wh = o.pShape === "circle" ? Hh : Hh * o.pRatio, inner = Math.max(1, Math.round(o.pRim)) + Math.max(0, Math.round(o.pLip));
  const x0 = Math.max(Math.floor(room[0]), Math.floor(cx - Wh)), x1 = Math.min(Math.ceil(room[2]) - 1, Math.ceil(cx + Wh)), y0 = Math.max(Math.floor(room[1]), Math.floor(cy - Hh)), y1 = Math.min(Math.ceil(room[3]) - 1, Math.ceil(cy + Hh));
  const dark = C[1], amt = clamp(0.45 - 0.2 * o.crossMirror, 0.1, 0.6);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5, dx = px - cx, dy = py - cy, r = shapeR(o.pShape, dx / Wh, dy / Hh), rho = Math.hypot(dx, dy);
      if (r >= 1 || (r > 1e-6 && rho * (1 / r - 1) < inner + 1)) continue;
      if (hash(x, y, 11) > k) continue;
      const c = tp.get(2 * cx - px, py);
      if (!c || c >>> 24 < 128) continue;
      p.px(px, py, mix(c, dark, amt + 0.12 * (((x + y) & 1) ? 1 : 0)));
    }
}

// the light of going through: the merge, the ripple, the way out, the last spark
function crossFx(p, o, C, a, way) {
  const mp = way.out, [ix, iy] = way.in;
  if (a <= 0 || a >= 1) return;
  const Pw = o.crossFlash, g = rng(o.seed, 808), Hh = o.pH / 2, Wh = o.pShape === "circle" ? Hh : Hh * o.pRatio;
  const fl = bump(a, X.merge[0], X.merge[1]);
  if (fl > 0) { p.glow(ix, iy, Math.max(Wh, Hh) * 1.3, WHITE, 0.5 * fl * Pw); p.glow(ix, iy, 6, WHITE, 0.9 * fl * Pw); }
  const rk = seg(a, 0.44, 0.56);
  if (rk > 0 && rk < 1) { const R = Math.max(Wh, Hh) * (0.2 + 0.9 * ease.outCubic(rk)); p.glowRing(ix, iy, R, 4, C[5], 0.45 * (1 - rk) * Pw); }
  const fo = bump(a, 0.6, 0.72);
  if (fo > 0) { p.glow(mp[0], mp[1], Math.max(Wh, Hh) * 1.2, WHITE, 0.4 * fo * Pw); p.glow(mp[0], mp[1], 5, WHITE, 0.8 * fo * Pw); }
  const sk = seg(a, X.out[0], 0.8);
  if (sk > 0 && sk < 1) for (let i = 0; i < 18; i++) {
    const th = g.range(0, TAU), R = g.range(4, 26) * ease.outCubic(sk);
    p.dot(mp[0] + Math.cos(th) * R, mp[1] + Math.sin(th) * R * 0.8, i % 3 ? C[6] : WHITE, 1 - sk);
    if (i % 4 === 0) p.glow(mp[0] + Math.cos(th) * R, mp[1] + Math.sin(th) * R * 0.8, 3, C[5], 0.3 * (1 - sk) * Pw);
  }
  const fc = way.keep ? 0 : bump(a, 0.93, 0.99);
  if (fc > 0) { p.glow(mp[0], mp[1], 10, WHITE, 0.5 * fc * Pw); spark(p, C, mp[0], mp[1], fc); }
}

function plan(o, t) {
  const W = worldIn(o), P = worldPeriod(o.duration, W), wt = clockOf(o, t, P), room = roomOf(o), mode = o.mode;
  const a = LOOPING.has(mode) ? 0 : prog(o, t), Hh = o.pH / 2, Wh = o.pShape === "circle" ? Hh : Hh * o.pRatio;
  const view = [Math.round(o.pViewX || 0), Math.round(o.pViewY || 0)], base = { P, wt, room, a, view, Wh, Hh };
  if (mode === "cross" || mode === "return") {
    const way = wayOf(o, room), cr = crossing(o, a, room, way);
    return { ...base, way, g: cr.main, back: cr.back, full: cr.full, M: (tt) => crossMods(o, tt, way) };
  }
  const mp = mirrorSpot(o, room), home = { ...FULL, cx: mp[0], cy: mp[1], inner: "void" };
  if (mode === "beyond" || mode === "beyondOpen") return { ...base, g: null, back: mode === "beyondOpen" ? home : null, full: true, M: null };
  if (mode === "reopen") {
    // in the other world it opens the way home where it came out: the same making, our dark world inside
    const g = opening(o, a, Wh);
    return { ...base, g: null, back: g && { ...g, cx: mp[0], cy: mp[1], inner: "void" }, full: true, mp, M: (tt) => castMods(o, tt, mp) };
  }
  const g = mode === "open" ? opening(o, a, Wh) : mode === "close" ? closing(o, a, Wh) : FULL;
  const M = mode === "live" ? null : (tt) => castMods(o, tt, [o.pX, o.pY]);
  return { ...base, g, M, back: null, full: false };
}

const crossy = (o) => o.mode === "cross" || o.mode === "return";
// in the other world, when it is a planet's surface, a figure on its legs stands on the ground there: no floor of ice,
// and what stands up nearer to us than its feet (trees, rocks, tall grass) passes in front of it
const cutIn = (o, pl) => (pl.full && o.form === "grounded" && isSurface(worldIn(o)) ? floorFor(o) : null);
const SOIL = new WeakMap();
const bodyIn = (o, pl) => {
  if (!pl.full || !isSurface(worldIn(o))) return o;
  let b = SOIL.get(o);
  if (!b) { b = { ...o, grNoFloor: 1 }; SOIL.set(o, b); }
  return b;
};
export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), pl = plan(o, t), Cp = paletteFor(o, o.pHue || 0), front = o.pLayer === "front" && !crossy(o);
  const cut = cutIn(o, pl);
  if (pl.full) paintWorld(p, worldIn(o), pl.wt, pl.P, pl.room, pl.view, cut === null ? null : { part: "back", y: cut });
  if (!front) drawPortal(p, o, Cp, pl.g, pl.wt, pl.P, pl.room);
  if (crossy(o) && pl.a > 0 && pl.a < X.shrink[1] && o.crossMirror > 0) reflect(p, o, t, pl.M, C, seg(pl.a, 0.03, 0.18), pl.room, pl.way.in);
  // (back home, a portal kept open sits on its own plane, as in "live")
  const backFront = o.mode === "return" && o.pLayer === "front";
  if (!backFront) drawPortal(p, o, Cp, pl.back, pl.wt, pl.P, pl.room);
  bodyBack(p, t, bodyIn(o, pl), pl.M, C, total(o));
  bodyAmbient(p, t, o, false, C);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), pl = plan(o, t), Cp = paletteFor(o, o.pHue || 0), front = o.pLayer === "front" && !crossy(o);
  const st = bodyFront(p, t, bodyIn(o, pl), pl.M, C, total(o));
  bodyAmbient(p, t, o, true, C);
  const cut = cutIn(o, pl);
  if (cut !== null) paintWorld(p, worldIn(o), pl.wt, pl.P, pl.room, pl.view, { part: "front", y: cut });
  if (front) drawPortal(p, o, Cp, pl.g, pl.wt, pl.P, pl.room);
  if (o.mode === "return" && o.pLayer === "front") drawPortal(p, o, Cp, pl.back, pl.wt, pl.P, pl.room);
  // (the light comes from a figure's hand)
  const from = (x, y) => (st.hands && st.hands.length ? st.hands.reduce((b, h) => (Math.hypot(h[0] - x, h[1] - y) < Math.hypot(b[0] - x, b[1] - y) ? h : b)) : [st.x, st.y]);
  if (o.mode === "open" || o.mode === "close") castFx(p, o, Cp, t, pl.a, from(o.pX, o.pY), Math.max(2, pl.Wh), Math.max(2, pl.Hh));
  if (o.mode === "reopen" && pl.mp) castFx(p, { ...o, mode: "open", pX: pl.mp[0], pY: pl.mp[1] }, Cp, t, pl.a, from(pl.mp[0], pl.mp[1]), Math.max(2, pl.Wh), Math.max(2, pl.Hh));
  if (crossy(o)) crossFx(p, o, Cp, pl.a, pl.way);
}
