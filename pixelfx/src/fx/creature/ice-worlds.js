// Other worlds: backdrops of the places the blob's portals open onto. A world is seen only through a portal
// (tab Portail) or alone, to be made and tuned (tab Mondes). The first one is deep space: far stars in three
// layers, bright stars with spikes, a nebula that slowly churns, shooting stars and drifting star dust.
//
// A world has two states. Still (wState "still"): it lives in place, stars twinkle, the nebula churns, shooting
// stars cross it, but nothing travels: the blob is just there. Moving ("moving"): it also travels by, at a speed
// you set (wDrift), as when the blob flies through it. It is drawn in layers, each at its own depth, shifted by
// that voyage and by a camera, so the near stars slide by faster than the far ones (parallax).
//
// It loops on its own period, a whole number of the blob's loops (wLoops x duration): layers scroll by whole
// tiles of the world, the nebula's warp turns round a circle of time, twinkles and shooting stars run whole
// cycles. The world is anchored to the scene (o.room), not to the blob, so it stays put when the blob moves.
import { clamp, mix, hex, red, green, blue, rng, cycle, hash, TAU, WHITE } from "../../core/index.js";

export const WORLD_TYPES = ["space"];

// every setting of a world starts with w, so it never clashes with the blob's own when they sit side by side
export const SPACE = {
  wType: "space", wSeed: 11, wLoops: 3,
  // sky and nebula
  wSky: "#000000", wNebA: "#1a3f9a", wNebB: "#6a35c8", wNebCore: "#9fe0ff",
  wNeb: 1.3, wNebCover: 0.6, wNebScale: 90, wNebSteps: 5, wNebDither: 1, wNebWarp: 1, wNebMorph: 1, wNebMix: 0.5, wNebGlow: 1,
  // stars
  wStarCol: "#dcf8ff", wStarTint: "#9fe0ff",
  wFar: 160, wMid: 55, wNear: 14, wBright: 4, wSpikes: 1, wTwinkle: 2, wStarGlow: 1,
  // motion: shooting stars, star dust, the voyage and the camera
  wShoot: 2, wShootLen: 1, wDust: 24,
  wState: "still", wDrift: 2, wDir: "left", wParallax: 1, wCamX: 0, wCamY: 0,
};
export const DEFAULTS = { space: SPACE };
const DIRS = { none: [0, 0], left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1], upleft: [-1, -1], upright: [1, -1], downleft: [-1, 1], downright: [1, 1] };

export const meta = {
  name: "Ice worlds",
  desc: "Worlds behind the ice blob's portals: deep space with layered stars, spiked bright stars, a churning pixel nebula, shooting stars and dust, ready for a moving camera.",
  tags: ["background", "world", "space", "stars", "nebula", "loop", "parallax"],
  size: [320, 180],
  origin: [160, 90],
  duration: 12,
  loop: true,
  fps: 30,
  bg: "black",
  options: { palette: ["#081026", "#102654", "#1a4a90", "#2c7ccc", "#58b6ee", "#9fe0ff", "#dcf8ff", "#ffffff"], seed: 7, duration: 4, ...SPACE },
};

/** A world's settings, filled in from its type's defaults. */
export const worldOf = (w) => ({ ...(DEFAULTS[(w && w.wType) || "space"] || SPACE), ...(w || {}) });
/** How long a world takes to loop: a whole number of the blob's loops. */
export const worldPeriod = (D, w) => D * Math.max(1, Math.round(w.wLoops || 1));
/** The side of the square tile every layer wraps on: the scene's longer side, so it never repeats on screen. */
export const worldTile = (room) => Math.max(16, Math.ceil(Math.max(room[2] - room[0], room[3] - room[1])));

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];
const wrap = (x, m) => ((x % m) + m) % m;
const whole = (v, lo = 0) => Math.max(lo, Math.round(v));

// tileable gradient noise (about -1..1): no square plateaus like value noise, so clouds have no straight edges.
// Its lattice repeats every px x py cells; whole octaves keep the repeat.
const GX = [], GY = [];
for (let i = 0; i < 16; i++) { GX.push(Math.cos((i / 16) * TAU)); GY.push(Math.sin((i / 16) * TAU)); }
function tileGrad(x, y, px, py, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const x0 = wrap(ix, px), x1 = wrap(ix + 1, px), y0 = wrap(iy, py), y1 = wrap(iy + 1, py);
  const g = (cx, cy, dx, dy) => { const h = hash(cx, cy, seed) & 15; return GX[h] * dx + GY[h] * dy; };
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10), uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = g(x0, y0, fx, fy), b = g(x1, y0, fx - 1, fy), c = g(x0, y1, fx, fy - 1), d = g(x1, y1, fx - 1, fy - 1);
  return (a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy) * 1.4;
}
function tileGradFbm(x, y, px, py, seed, oct) {
  let s = 0, a = 0.5, n = 0, k = 1;
  for (let o = 0; o < oct; o++) { s += tileGrad(x * k, y * k, px * k, py * k, seed + o * 101) * a; n += a; a *= 0.5; k *= 2; }
  return s / n;
}

// stars of each layer, scattered over the tile once and kept
const starCache = new Map();
function starsOf(w, T) {
  const key = [w.wSeed, T, whole(w.wFar), whole(w.wMid), whole(w.wNear), whole(w.wBright), whole(w.wDust)].join();
  if (starCache.has(key)) return starCache.get(key);
  const make = (n, salt, fn) => Array.from({ length: n }, (_, i) => { const g = rng(w.wSeed, salt, i); return { x: g.range(0, T), y: g.range(0, T), b: g.next(), ph: g.next(), k: g.next(), tint: g.next(), ...(fn ? fn(g) : {}) }; });
  const s = {
    far: make(whole(w.wFar), 1), mid: make(whole(w.wMid), 2), near: make(whole(w.wNear), 3),
    bright: make(whole(w.wBright), 4, (g) => ({ len: g.range(2.5, 5.5) })), dust: make(whole(w.wDust), 5),
  };
  if (starCache.size > 24) starCache.clear();
  starCache.set(key, s);
  return s;
}

// a ramp along colour stops, f in 0..1
function along(stops, f) {
  const x = clamp(f) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x));
  return mix(stops[i], stops[i + 1], x - i);
}

/**
 * The world seen through a window of the scene: bw x bh cells whose top-left is scene cell (X0, Y0).
 * wt is the world's own clock (seconds, periodic over P), cam the camera's offset in scene cells.
 * Returns { col: Uint32Array of opaque colours, lit: Float32Array of added light (r, g, b per cell) }.
 */
export function renderWorld(w0, wt, P, T, X0, Y0, bw, bh, cam = [0, 0]) {
  const w = worldOf(w0), n = bw * bh, col = new Uint32Array(n), lit = new Float32Array(n * 3);
  const u = (((wt / P) % 1) + 1) % 1, sky = hex(w.wSky), dir = DIRS[w.wDir] || DIRS.none, par = Math.max(0, w.wParallax);
  col.fill(sky);
  // a layer's shift on screen: whole tiles of voyage a loop (more for the nearer layers), plus the camera
  const shift = (depth) => {
    const tiles = w.wState === "moving" ? whole(w.wDrift * depth) : 0, d = depth * par;
    return [Math.round(u * tiles * T) * dir[0] - Math.round(cam[0] * d), Math.round(u * tiles * T) * dir[1] - Math.round(cam[1] * d)];
  };
  const addLight = (x, y, c, k) => {
    if (x < 0 || y < 0 || x >= bw || y >= bh || k <= 0) return;
    const j = (y * bw + x) * 3;
    lit[j] += red(c) * k; lit[j + 1] += green(c) * k; lit[j + 2] += blue(c) * k;
  };
  const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < bw && y < bh) col[y * bw + x] = c; };
  const glowAt = (x, y, r, c, k) => {
    if (k <= 0.004) return;
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++)
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
        const d = Math.hypot(dx, dy) / r;
        if (d < 1) addLight(x + dx, y + dy, c, (1 - d) * (1 - d) * k);
      }
  };

  // ---- the nebula: tiled fractal noise, warped by a field that turns round a circle of time
  if (w.wNeb > 0) {
    const per = Math.max(2, 2 * Math.round(T / Math.max(8, w.wNebScale) / 2)), cs = T / per, steps = Math.max(2, whole(w.wNebSteps, 2));
    const A = hex(w.wNebA), B = hex(w.wNebB), core = hex(w.wNebCore), seed = w.wSeed * 7 + 3;
    const rampA = [sky, mix(sky, A, 0.3), mix(sky, A, 0.62), A, mix(A, core, 0.6), core], rampB = [sky, mix(sky, B, 0.3), mix(sky, B, 0.62), B, mix(B, core, 0.5), core];
    const colsA = [], colsB = [];
    for (let L = 0; L <= steps; L++) { colsA.push(along(rampA, L / steps)); colsB.push(along(rampB, L / steps)); }
    const m = whole(w.wNebMorph), a = TAU * u * m, R = 0.2, ca = Math.cos(a) * R, sa = Math.sin(a) * R, W = 0.8 * w.wNebWarp;
    const [sx, sy] = shift(0.08), cover = clamp(w.wNebCover, 0, 1), dith = clamp(w.wNebDither, 0, 1.5), glow = 0.1 * w.wNebGlow;
    const lo = 0.6 - cover * 0.28, gain = 2.4 * w.wNeb, mixAt = 1 - clamp(w.wNebMix, 0, 1);
    // the warp and the colour field are slow: read them every other cell
    const gw = Math.ceil(bw / 2) + 1, gh = Math.ceil(bh / 2) + 1, WX = new Float32Array(gw * gh), WY = new Float32Array(gw * gh), HM = new Float32Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
      const xn = (X0 + gx * 2 - sx) / cs, yn = (Y0 + gy * 2 - sy) / cs, i = gy * gw + gx;
      WX[i] = tileGrad(xn + ca, yn + sa, per, per, seed + 31); WY[i] = tileGrad(xn + 5.3 - sa, yn + 1.7 + ca, per, per, seed + 37);
      HM[i] = tileGrad(xn * 0.5 + 9.1, yn * 0.5 + 3.3, per / 2, per / 2, seed + 53) * 0.5 + 0.5;
    }
    for (let y = 0; y < bh; y++) {
      const ly = Y0 + y - sy, yn = ly / cs, gy = (y >> 1) * gw;
      for (let x = 0; x < bw; x++) {
        const lx = X0 + x - sx, xn = lx / cs, gi = gy + (x >> 1);
        const d = tileGradFbm(xn + W * WX[gi], yn + W * WY[gi], per, per, seed, 4);
        let v = (d * 0.5 + 0.5 - lo) * gain;
        if (v <= 0.02) continue;
        v = Math.min(1.1, v ** 1.35);
        const b = bayer(wrap(Math.floor(lx), 4), wrap(Math.floor(ly), 4)) - 0.5;
        const L = clamp(Math.floor(v * steps * 0.999 + b * dith), 0, steps);
        const useB = HM[gi] + b * 0.3 * dith > mixAt;
        if (L > 0) col[y * bw + x] = (useB ? colsB : colsA)[L];
        if (glow > 0 && v > 0.3) { const j = (y * bw + x) * 3, k = (v - 0.3) * (v - 0.3) * glow, c = useB ? B : A; lit[j] += red(c) * k; lit[j + 1] += green(c) * k; lit[j + 2] += blue(c) * k; }
      }
    }
  }

  const st = starsOf(w, T), starCol = hex(w.wStarCol), tint = hex(w.wStarTint), tw = whole(w.wTwinkle);
  const twinkle = (s) => (tw ? 0.5 + 0.5 * Math.sin(TAU * (u * Math.max(1, Math.round(tw * (0.5 + s.k))) + s.ph)) : 0.75);
  // every copy of a layer point that lands in the window
  const each = (list, depth, fn) => {
    const [ox, oy] = shift(depth);
    for (const s of list) {
      const x0 = wrap(Math.floor(s.x) + ox - X0, T), y0 = wrap(Math.floor(s.y) + oy - Y0, T);
      for (let x = x0 - T; x < bw + 6; x += T) if (x > -7) for (let y = y0 - T; y < bh + 6; y += T) if (y > -7) fn(s, x, y);
    }
  };
  const dimOf = (c, k) => mix(sky, c, k);
  // star dust: the nearest layer, faint specks that slide by fastest
  each(st.dust, 1.3, (s, x, y) => put(x, y, dimOf(s.tint > 0.5 ? hex(w.wNebA) : starCol, 0.25 + 0.2 * s.b)));
  // far stars: single pixels in three hard steps, a few tinted
  each(st.far, 0.18, (s, x, y) => {
    const v = s.b * 0.65 + 0.35 * twinkle(s), c = s.tint > 0.78 ? tint : starCol;
    put(x, y, dimOf(c, v > 0.8 ? 0.85 : v > 0.5 ? 0.55 : 0.3));
  });
  // middle stars: brighter, a tiny cross when they flare
  each(st.mid, 0.45, (s, x, y) => {
    const v = s.b * 0.5 + 0.5 * twinkle(s), c = s.tint > 0.7 ? tint : starCol;
    put(x, y, v > 0.82 ? WHITE : dimOf(c, v > 0.45 ? 0.9 : 0.55));
    if (v > 0.82) { const d = dimOf(c, 0.45); put(x - 1, y, d); put(x + 1, y, d); put(x, y - 1, d); put(x, y + 1, d); }
    addLight(x, y, c, 0.25 * v * w.wStarGlow);
  });
  // near stars: a white core and a cross of their colour
  each(st.near, 1, (s, x, y) => {
    const v = 0.55 + 0.45 * twinkle(s), c = s.tint > 0.6 ? tint : starCol, d = dimOf(c, 0.7 * v);
    put(x, y, WHITE); put(x - 1, y, d); put(x + 1, y, d); put(x, y - 1, d); put(x, y + 1, d);
    glowAt(x, y, 3, c, 0.35 * v * w.wStarGlow);
  });
  // bright stars: four spikes that breathe with the twinkle
  each(st.bright, 0.3, (s, x, y) => {
    const v = 0.6 + 0.4 * twinkle(s), len = Math.round(s.len * v * w.wSpikes), c = s.tint > 0.5 ? tint : starCol;
    put(x, y, WHITE);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      put(x + dx, y + dy, WHITE);
      for (let i = 2; i <= len; i++) put(x + dx * i, y + dy * i, dimOf(c, i < len * 0.6 ? 0.9 : 0.5));
    }
    for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) put(x + dx, y + dy, dimOf(c, 0.4));
    glowAt(x, y, 4 + len, c, 0.4 * v * w.wStarGlow);
  });
  // shooting stars, a few a loop, crossing the far sky
  if (w.wShoot > 0) {
    const [ox, oy] = shift(0.18);
    cycle(wt, P, whole(w.wShoot), w.wSeed * 13 + 1, (g) => g.range(0.5, 0.9), (age, life, g) => {
      const sx0 = g.range(0, T), sy0 = g.range(0, T), ang = g.range(2.2, 2.7), Ls = g.range(30, 70) * w.wShootLen;
      const k = age / life, head = 1 - (1 - k) * (1 - k), trail = Math.min(head * Ls, Ls * 0.45) + 2, al = 1 - k * k;
      const hx = sx0 + Math.cos(ang) * Ls * head, hy = sy0 + Math.sin(ang) * Ls * head;
      const bx = wrap(Math.floor(hx) + ox - X0, T), by = wrap(Math.floor(hy) + oy - Y0, T);
      for (let cx = bx - T; cx < bw + T; cx += T) for (let cy = by - T; cy < bh + T; cy += T) {
        if (cx < -Ls - 4 || cy < -Ls - 4 || cx > bw + Ls + 4 || cy > bh + Ls + 4) continue;
        for (let i = 0, nn = Math.ceil(trail); i <= nn; i++) {
          const f = i / nn, px = Math.round(cx - Math.cos(ang) * i), py = Math.round(cy - Math.sin(ang) * i);
          if (f > al) continue;
          put(px, py, f < 0.12 ? WHITE : dimOf(f < 0.45 ? tint : starCol, f < 0.45 ? 0.85 : 0.45));
        }
        glowAt(cx, cy, 4, tint, 0.45 * al * w.wStarGlow);
      }
    });
  }
  return { col, lit };
}

// ---- the world on its own, filling the scene (tab Mondes)
const roomOf = (o) => (Array.isArray(o.room) ? o.room : [-meta.origin[0], -meta.origin[1], meta.size[0] - meta.origin[0], meta.size[1] - meta.origin[1]]);
/** Paint a world over the whole scene (room, local pixels), its view shifted by view (scene cells). */
export function paintWorld(p, w, wt, P, room, view = [0, 0]) {
  const bw = Math.ceil(room[2] - room[0]), bh = Math.ceil(room[3] - room[1]);
  const { col, lit } = renderWorld(w, wt, P, worldTile(room), Math.round(view[0]), Math.round(view[1]), bw, bh, [w.wCamX || 0, w.wCamY || 0]);
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) {
      const i = y * bw + x, lx = room[0] + x + 0.5, ly = room[1] + y + 0.5;
      p.px(lx, ly, col[i] || 0xff000000);
      const j = i * 3;
      if (lit[j] + lit[j + 1] + lit[j + 2] > 1) p.light(lx, ly, (255 << 24) | (Math.min(255, lit[j + 2]) << 16) | (Math.min(255, lit[j + 1]) << 8) | Math.min(255, lit[j]), 1);
    }
}
export function drawBack(p, t, o) {
  const w = worldOf(o.world || o);
  paintWorld(p, w, t, worldPeriod(o.duration, w), roomOf(o));
}
export function draw() {}
