// Planet surfaces, second version (tab Surface planète v2): a green valley in a richer, painted pixel-art style, made
// from a seed so a button can draw a whole new map. A bright banded sky with a haloed sun and shaded cumulus, two
// hazy mountain ranges, hills and a far line of woods at the horizon, then a ground seen in perspective: the meadow
// in patches of greens with grass strokes and flowers, a river that winds from the distance to our feet (the far bank
// in brown earth, ripples that flow towards us), a dirt path, a big oak, a pile of faceted rocks, bushes, stones and
// tall grass in front.
//
// The ground is one plane, not a few flat bands: each row of the screen is a depth (its scale s grows from the horizon
// to the bottom), and what lies on it is placed in world coordinates (gx along the row, z = 1 / s into the distance).
// So the river narrows into the distance and, when the world travels, every row slides at its own speed (the near
// grass faster than the far one, a true parallax that never tears).
//
// It loops like every world (wLoops blob loops): the ground repeats every Tw = 2 scenes of world, and travels a whole
// number k of them a loop (a row at scale s moves k * Tw * s pixels, exactly its own period); far layers scroll whole
// tiles as in the first surface; the river's ripples run a whole number of their period; gusts, sway and twinkles run
// whole turns; birds use cycle() on the period. Sizes are in % of the scene's height.
import { clamp, mix, hex, red, green, blue, rng, cycle, hash, TAU, WHITE } from "../../core/index.js";

export const VALLEY = {
  wType: "valley", wSeed: 7, wLoops: 3,
  // sky, sun or moon
  wSkyTop: "#2a7fe0", wSkyLow: "#c4ecfa", wSkySteps: 9, wSkyDither: 1, wStars: 0,
  wSun: "sun", wSunX: 66, wSunY: 11, wSunSize: 4, wSunCol: "#fffbe6", wSunGlow: 1, wHalo: 1,
  // clouds
  wClouds: 9, wCloudSize: 1, wCloudCol: "#ffffff", wCloudShade: "#a8c6e8", wCloudWind: 1, wCloudMorph: 1,
  // far away: mountains, hills, woods
  wHorizon: 42, wMount: 1, wMountCol: "#7a8cb8", wSnow: 0.12, wSnowCol: "#eef6ff", wHills: 1, wForest: 1, wForestCol: "#2f6e3a", wHaze: 0.5,
  // the meadow
  wGrassDark: "#2c7a1e", wGrassLight: "#86d23e", wPatches: 1, wGrassTex: 1, wFlowers: 1,
  wFlowerA: "#ffe14a", wFlowerB: "#ff6a5a", wFlowerC: "#7ab4ff",
  wBlades: 1, wGrassH: 9, wSway: 1, wGust: 2,
  // the river and the path
  wRiver: 1, wRiverW: 16, wMeander: 1, wWaterCol: "#2f92e6", wWaterLight: "#8ed8ff", wBankCol: "#8a5a30", wFlow: 1, wShimmer: 1,
  wPath: 1, wPathW: 7, wPathCol: "#c89c64",
  // trees, bushes, rocks
  wBigTree: 1, wTreeSize: 46, wTrees: 7, wBushes: 12, wLeafDark: "#1a4f1c", wLeafLight: "#6cbc36", wTrunk: "#6e4426",
  wRockPile: 1, wPileSize: 26, wRocks: 9, wRockCol: "#8f8678",
  // little lives
  wMotes: 8, wMoteCol: "#fffbd0", wBirds: 2,
  // the voyage and the camera
  wState: "still", wDrift: 2, wDir: "left", wParallax: 1, wCamX: 0, wCamY: 0,
};
export const SURFACE2_DEFAULTS = { valley: VALLEY };
export const SURFACE2_TYPES = Object.keys(SURFACE2_DEFAULTS);

export const meta = {
  name: "Ice planet surface v2",
  desc: "A green valley seen from the ground, generated from a seed: banded sky, haloed sun, cumulus, hazy ranges, a perspective meadow with a winding river, a path, a big oak, faceted rocks and bushes, still or in parallax.",
  tags: ["background", "world", "valley", "river", "trees", "rocks", "procedural", "loop", "parallax"],
  size: [480, 270],
  origin: [240, 135],
  duration: 12,
  loop: true,
  fps: 30,
  bg: "black",
  options: { palette: ["#081026", "#102654", "#1a4a90", "#2c7ccc", "#58b6ee", "#9fe0ff", "#dcf8ff", "#ffffff"], seed: 7, duration: 4, ...VALLEY },
};

const DIRS = { none: [0, 0], left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1], upleft: [-1, -1], upright: [1, -1], downleft: [-1, 1], downright: [1, 1] };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];
const wrap = (x, m) => ((x % m) + m) % m;
const wrapS = (x, m) => wrap(x + m / 2, m) - m / 2; // signed distance on a circle of length m
const whole = (v, lo = 0) => Math.max(lo, Math.round(v));
const h01 = (...n) => (hash(...n) >>> 0) / 4294967296;
const BLACK = hex("#000000");

// the ground's perspective: a row's scale grows from the horizon (f = 0) to the bottom of the scene (f = 1)
const S0 = 0.18, S1 = 1.1;
const scaleAt = (f) => S0 + S1 * f;
const fOfScale = (s) => (s - S0) / S1;
const RIVER_F0 = 0.15; // the river and the path start this far down the ground (their copies a tile away stay off screen)

// 1D gradient noise whose lattice repeats every `per` cells; fbm keeps the repeat
const g1 = (i, s) => (hash(i, s) & 1023) / 511.5 - 1;
function n1(x, per, s) {
  const i = Math.floor(x), f = x - i, a = g1(wrap(i, per), s), b = g1(wrap(i + 1, per), s), k = f * f * f * (f * (f * 6 - 15) + 10);
  return (a * f + (b * (f - 1) - a * f) * k) * 2;
}
function fbm1(x, T, size, s, oct = 3, ridged = false) {
  const per = Math.max(1, Math.round(T / Math.max(4, size)));
  let sum = 0, amp = 0.5, n = 0, k = 1;
  for (let o = 0; o < oct; o++) {
    let v = n1((x / T) * per * k, per * k, s + o * 131);
    if (ridged) v = 1 - Math.abs(v) * 1.6;
    sum += v * amp; n += amp; amp *= 0.5; k *= 2;
  }
  return sum / n;
}
// 2D gradient noise, x repeating every px cells (the ground's patches; z does not repeat)
const GX = [], GY = [];
for (let i = 0; i < 16; i++) { GX.push(Math.cos((i / 16) * TAU)); GY.push(Math.sin((i / 16) * TAU)); }
function grad2(x, y, px, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, x0 = wrap(ix, px), x1 = wrap(ix + 1, px);
  const g = (cx, cy, dx, dy) => { const h = hash(cx, cy, seed) & 15; return GX[h] * dx + GY[h] * dy; };
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10), uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = g(x0, iy, fx, fy), b = g(x1, iy, fx - 1, fy), c = g(x0, iy + 1, fx, fy - 1), d = g(x1, iy + 1, fx - 1, fy - 1);
  return (a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy) * 1.4;
}

// ---- the map: everything the seed decides, worked out once per layout and kept
const cache = new Map();
function mapOf(w, Tw, Wd, H) {
  const key = [w.wSeed, Tw, Wd, H, w.wHorizon, w.wRiver, w.wRiverW, w.wMeander, w.wPath, w.wPathW, w.wBigTree, w.wTreeSize, w.wTrees, w.wBushes, w.wRockPile, w.wPileSize, w.wRocks, w.wClouds, w.wCloudSize, w.wMotes, w.wStars].join();
  if (cache.has(key)) return cache.get(key);
  const S = w.wSeed, hY = (H * clamp(w.wHorizon, 20, 75)) / 100, Xc = Wd / 2, g = rng(S, 1);
  // world x of a screen point at depth f, seen with no camera and no voyage
  const gxOf = (xs, f) => Xc + (xs - Xc) / scaleAt(f);
  // a winding course (river or path), drawn on screen from (xF at fA) to (xB at the bottom), kept as world x per depth
  const course = (gg, xF, xB, fA, amp, turns) => {
    const p = gg.range(0, TAU), A = amp * Wd;
    const xs = (f) => { const k = clamp((f - fA) / (1 - fA)); return xF + (xB - xF) * k ** 1.3 + A * (0.18 + 0.82 * k) * Math.sin(TAU * turns * (1 - k) ** 1.35 + p) - A * 0.18 * Math.sin(p) * (1 - k); };
    return { xs, fA, gx: (f) => gxOf(xs(f), f) };
  };
  const side = g.sign(); // which side the river ends near us
  const river = whole(w.wRiver) ? course(rng(S, 2), Wd * g.range(0.4, 0.6), Xc + side * Wd * g.range(0.12, 0.3), RIVER_F0, 0.1 * clamp(w.wMeander, 0, 3), g.range(1.1, 1.9)) : null;
  const path = whole(w.wPath) ? (() => { const c = course(rng(S, 3), Xc - side * Wd * g.range(0.02, 0.18), Xc - side * Wd * g.range(0.3, 0.46), g.range(0.32, 0.52), 0.06, g.range(0.6, 1.1)); return c; })() : null;
  const riverHW = (H * clamp(w.wRiverW, 2, 40)) / 200, pathHW = (H * clamp(w.wPathW, 1, 20)) / 200; // half widths at scale 1
  // how far a spot (world x, depth f) is from the water and the path, in screen pixels, minus their half widths
  const clearOf = (gx, f) => {
    const s = scaleAt(f);
    let d = 1e9;
    if (river && f > river.fA - 0.03) d = Math.min(d, Math.abs(wrapS(gx - river.gx(f), Tw)) * s - riverHW * s);
    if (path && f > path.fA - 0.03) d = Math.min(d, Math.abs(wrapS(gx - path.gx(f), Tw)) * s - pathHW * s);
    return d;
  };
  const items = [];
  // place something: try spots until one is clear of water and path (in screen pixels at its depth)
  const place = (gg, kind, fLo, fHi, half, xLo = null, xHi = null, extra = {}) => {
    for (let tries = 0; tries < 30; tries++) {
      const f = gg.range(fLo, fHi), gx = xLo === null ? gg.range(0, Tw) : gxOf(gg.range(xLo, xHi), f);
      if (clearOf(gx, f) > half * scaleAt(f) + 2) { const it = { kind, gx: wrap(gx, Tw), f, seed: gg.int(0, 99999), ...extra }; items.push(it); return it; }
    }
    return null;
  };
  // the big oak, on the side away from where the river comes to us; the rock pile across from it
  if (whole(w.wBigTree)) {
    const gg = rng(S, 10), f = gg.range(0.33, 0.48), hs = (H * clamp(w.wTreeSize, 10, 90)) / 100;
    place(gg, "oak", f, f + 0.04, (hs * 0.45) / scaleAt(f), side > 0 ? Wd * 0.08 : Wd * 0.55, side > 0 ? Wd * 0.45 : Wd * 0.92, { size: hs / scaleAt(f), big: 1 });
  }
  if (whole(w.wRockPile)) {
    const gg = rng(S, 11), f = gg.range(0.36, 0.56), ps = (H * clamp(w.wPileSize, 5, 60)) / 100;
    place(gg, "pile", f, f + 0.04, (ps * 0.7) / scaleAt(f), side > 0 ? Wd * 0.62 : Wd * 0.04, side > 0 ? Wd * 0.96 : Wd * 0.38, { size: ps / scaleAt(f) });
  }
  // more trees, mostly far away; bushes, stones and tufts nearer
  for (let i = 0; i < whole(w.wTrees); i++) { const gg = rng(S, 20, i), f = gg.range(0.08, 0.42) ** 1.15 + 0.05, sz = H * gg.range(0.22, 0.36); place(gg, "oak", f, f, sz * 0.4, null, null, { size: sz }); }
  for (let i = 0; i < whole(w.wBushes); i++) { const gg = rng(S, 30, i), sz = H * gg.range(0.07, 0.12); place(gg, "bush", 0.2, 1.02, sz * 0.6, null, null, { size: sz }); }
  for (let i = 0; i < whole(w.wRocks); i++) { const gg = rng(S, 40, i), sz = H * gg.range(0.025, 0.06); place(gg, "stone", 0.25, 1.04, sz, null, null, { size: sz }); }
  for (let i = 0; i < 26; i++) { const gg = rng(S, 50, i), sz = H * gg.range(0.04, 0.08); place(gg, "tuft", 0.35, 1.04, sz * 0.4, null, null, { size: sz }); }
  // bushes and stones around the big ones, so they sit in the meadow
  for (const it of items.filter((q) => q.big || q.kind === "pile")) {
    const gg = rng(it.seed, 60), n = it.kind === "pile" ? 4 : 2;
    for (let j = 0; j < n; j++) {
      const s = scaleAt(it.f), dx = gg.range(-0.6, 0.6) * it.size, f = it.f + gg.range(0.005, 0.05), kind = j % 2 || it.kind !== "pile" ? "bush" : "stone";
      const gx = it.gx + dx, sz = kind === "bush" ? H * gg.range(0.06, 0.1) : H * gg.range(0.03, 0.05);
      if (clearOf(gx, f) > sz * 0.6 * scaleAt(f)) items.push({ kind, gx: wrap(gx, Tw), f, seed: gg.int(0, 99999), size: sz });
    }
  }
  for (const it of items) if (it.kind === "oak") it.shape = oakShape(it.seed, it.big);
  for (const it of items) if (it.kind === "pile") it.rocks = pileShape(it.seed);
  // clouds: big ones high up, flatter ones low by the mountains
  const clouds = Array.from({ length: whole(w.wClouds) }, (_, i) => {
    const gg = rng(S, 70, i), low = i % 3 === 2, size = H * 0.06 * w.wCloudSize * (low ? gg.range(0.5, 0.8) : gg.range(0.75, 1.4)), n = 4 + gg.int(0, 4), wide = size * gg.range(2.4, 3.8);
    const puffs = Array.from({ length: n }, (_, j) => {
      const fr = j / (n - 1), mid = 1 - Math.abs(fr - 0.5) * 1.4;
      return { dx: (fr - 0.5) * wide + gg.range(-0.15, 0.15) * size, dy: -size * (low ? 0.2 : 0.42) * mid - gg.range(0, size * 0.25), r: size * (0.42 + 0.6 * mid) * gg.range(0.8, 1.1), ph: gg.next() };
    });
    // a few small puffs on top give it a cauliflower crown
    for (let j = 0; j < (low ? 0 : 2); j++) puffs.push({ dx: gg.range(-0.25, 0.25) * wide, dy: -size * gg.range(0.75, 1.05), r: size * gg.range(0.3, 0.45), ph: gg.next() });
    return { x: gg.range(0, Wd * 2), y: low ? gg.range(hY * 0.62, hY * 0.8) : gg.range(H * 0.06, hY * 0.5), puffs, size, wide, low };
  });
  const motes = Array.from({ length: whole(w.wMotes) }, (_, i) => {
    const gg = rng(S, 90, i);
    return { x: gg.range(0, Wd * 2), y: gg.range(hY + (H - hY) * 0.2, H * 0.96), ax: gg.range(3, 9), ay: gg.range(2, 6), kx: 1 + gg.int(0, 1), ky: 1 + gg.int(0, 2), ph: gg.next(), ph2: gg.next(), kb: 1 + gg.int(0, 2) };
  });
  const stars = Array.from({ length: whole(w.wStars) }, (_, i) => { const gg = rng(S, 95, i); return { x: gg.range(0, Wd * 2), y: gg.range(0, hY), b: gg.next(), ph: gg.next(), k: gg.next() }; });
  const out = { river, path, riverHW, pathHW, items, clouds, motes, stars };
  if (cache.size > 24) cache.clear();
  cache.set(key, out);
  return out;
}

// an oak, in units of its height: a trunk with flared roots, a few branches, and a crown of leaf clumps
function oakShape(seed, big) {
  const g = rng(seed, 1), n = big ? 20 + g.int(0, 6) : 10 + g.int(0, 4), wide = g.range(0.36, 0.44), tall = g.range(0.24, 0.28), cy = -0.64;
  const clumps = [];
  // a ring of clumps makes the bumpy outline, more fill the inside
  const ring = big ? 11 : 7;
  for (let i = 0; i < ring; i++) { const a = (i / ring) * TAU + g.range(-0.2, 0.2); clumps.push({ x: Math.cos(a) * wide * 0.82, y: cy + Math.sin(a) * tall * 0.82, r: g.range(0.08, 0.11) * (big ? 1 : 1.3), k: g.range(-0.12, 0.12) }); }
  for (let i = 0; i < n; i++) {
    const a = g.range(0, TAU), rr = Math.sqrt(g.next()) * 0.7;
    clumps.push({ x: Math.cos(a) * rr * wide, y: cy + Math.sin(a) * rr * tall, r: g.range(0.1, 0.14) * (big ? 1 : 1.25), k: g.range(-0.12, 0.12) });
  }
  clumps.sort((p, q) => p.y - q.y);
  const branches = Array.from({ length: 3 + g.int(0, 1) }, (_, i) => ({ x: (i - 1.2) * 0.14 + g.range(-0.05, 0.05), y: cy + g.range(0, 0.12) }));
  return { clumps, branches, lean: g.range(-0.025, 0.025), cy, wide, tall, trunkW: g.range(0.075, 0.09) };
}
// a pile of boulders: convex lumps with a flat lit top and faceted sides, the biggest at the back
function pileShape(seed) {
  const g = rng(seed, 2), n = 3 + g.int(0, 2), bigH = g.range(0.6, 0.75), rocks = [{ x: g.range(-0.06, 0.06), y: 0, r: g.range(0.48, 0.55), h: bigH, seed: g.int(0, 99999) }];
  for (let i = 0; i < n; i++) { const r = g.range(0.16, 0.3), side = i % 2 ? 1 : -1; rocks.push({ x: side * g.range(0.35, 0.7), y: g.range(-0.1, 0.25), r, h: r * g.range(1.1, 1.5), seed: g.int(0, 99999) }); }
  // one sitting on the big one
  rocks.push({ x: g.range(-0.15, 0.2), y: 0.001, r: g.range(0.2, 0.27), h: g.range(0.3, 0.38), lift: bigH * 0.72, top: 1, seed: g.int(0, 99999) });
  rocks.sort((p, q) => p.y - q.y);
  return rocks;
}
// a boulder's outline: a convex polygon (unit radius), its top face, a few cracks
function boulderOf(seed) {
  const g = rng(seed, 3), n = 7 + g.int(0, 3), a0 = g.range(0, TAU), pts = [];
  for (let i = 0; i < n; i++) { const a = a0 + (i / n) * TAU + g.range(-0.2, 0.2); pts.push([Math.cos(a) * g.range(0.72, 1), Math.sin(a) * g.range(0.7, 1)]); }
  pts.sort((p, q) => Math.atan2(p[1], p[0]) - Math.atan2(q[1], q[0]));
  return { pts, topK: g.range(0.32, 0.46), topY: g.range(-0.55, -0.4), tone: g.range(-0.06, 0.06) };
}

// ---- the ground's rows, kept: one whole tile of each row (meadow, flowers, path, banks), read with the row's shift
const groundCache = new Map();
function groundOf(w, M, Tw, Wd, H, hY, C) {
  const key = [w.wSeed, Tw, Wd, H, hY, w.wGrassDark, w.wGrassLight, w.wPatches, w.wGrassTex, w.wFlowers, w.wFlowerA, w.wFlowerB, w.wFlowerC, w.wPathCol, w.wBankCol,
    w.wWaterCol, w.wWaterLight, w.wRiver, w.wRiverW, w.wMeander, w.wPath, w.wPathW, w.wSkyLow, w.wHaze].join();
  let gc = groundCache.get(key);
  if (gc) return gc;
  const S = w.wSeed, G = H - hY, Xc = Wd / 2, riv = M.river, pth = M.path, rows = new Map(), rivRows = new Map();
  const { GR, WT, BK, PT, FL, skyLow, haze } = C;
  const tex = Math.max(0, w.wGrassTex), patches = Math.max(0, w.wPatches), flowers = Math.max(0, w.wFlowers), patchPer = 10;
  const rowF = (yg) => (yg + 0.5 - hY) / G;
  const rivRow = (yg) => {
    let r = rivRows.get(yg);
    if (!r) { const f = rowF(yg), s = scaleAt(Math.max(0, f)); r = riv && f >= riv.fA ? { s, gx: riv.gx(f), hw: M.riverHW * s * clamp((f - riv.fA) / 0.12) ** 0.7 } : { s, gx: 0, hw: 0 }; rivRows.set(yg, r); }
    return r;
  };
  // seen with no camera: is the screen column of world x gxN (near the river's own copy, on a row of scale s) in the water on row yg2?
  const inRiverUp = (gxN, s, yg2) => { const r = rivRow(yg2); return r.hw > 0.3 && Math.abs(Xc + ((gxN - Xc) * s) / r.s - r.gx) * r.s < r.hw; };
  const row = (yg) => {
    if (rows.has(yg)) return rows.get(yg);
    const f = rowF(yg);
    let out = null;
    if (f >= 0) {
      const s = scaleAt(f), z = 1 / s, L = Math.ceil(Tw * s) + 1, arr = new Uint32Array(L), acr = new Float32Array(L).fill(NaN);
      const hzK = clamp(1 - f * 2.2) ** 2 * 0.6, segH = Math.max(1, Math.round(3.2 * s)), r0 = rivRow(yg), yb = wrap(yg, 4);
      const px0 = pth && f >= pth.fA ? pth.gx(f) : 0, phw = pth ? M.pathHW * s * clamp((f - pth.fA) / 0.18) ** 0.8 : 0;
      for (let tx = 0; tx < L; tx++) {
        const gw = (tx + 0.5) / s, bb = bayer(tx & 3, yb);
        // the meadow: big patches of greens, dithered at their edges, and short vertical grass strokes
        const nv = grad2((gw / Tw) * patchPer, z * 2.6, patchPer, S + 800) * 0.75 + grad2((gw / Tw) * patchPer * 3, z * 8, patchPer * 3, S + 810) * 0.3;
        let Lv = clamp(Math.floor(2 + nv * 2.2 * patches + (bb - 0.5) * 0.8), 1, 3);
        const r = h01(tx, Math.floor((yg + (hash(tx, S) & 3)) / segH), S + 820), k = tex * clamp((s - 0.25) * 1.5);
        if (r < 0.13 * k) Lv = Math.min(4, Lv + 1); else if (r > 1 - 0.12 * k) Lv = Math.max(0, Lv - 1);
        let c = GR[Lv];
        // flowers: specks of colour, more near us
        if (flowers > 0 && f > 0.12 && h01(tx, yg, S + 830) < 0.0045 * flowers * (0.3 + s)) c = FL[hash(tx, yg, S + 831) & 3];
        // the path: packed earth with darker edges and pebbles
        if (pth && phw > 0.4) {
          const d = Math.abs(wrapS(gw - px0, Tw)) * s;
          if (d < phw) {
            const e = d / phw, pb = h01(tx, yg, S + 840);
            c = e > 0.82 ? (pb < 0.4 ? GR[2] : PT[1]) : pb < 0.05 ? PT[0] : pb > 0.93 ? PT[3] : PT[2];
          } else if (d < phw + 1.2 && f > 0.3) c = GR[1];
        }
        // the river: the far bank in brown earth, deep water under it, open water (ripples each frame), a lit lip on the near bank
        if (r0.hw > 0.3) {
          const dd = wrapS(gw - r0.gx, Tw) * s, d = Math.abs(dd), gxN = r0.gx + dd / s;
          if (d < r0.hw) {
            const bankH = Math.max(1, Math.round(2.6 * s));
            let up = 0;
            while (up < bankH + 2 && inRiverUp(gxN, s, yg - up - 1)) up++;
            if (up < bankH) c = up === bankH - 1 || bankH === 1 ? BK[0] : (hash(tx, yg, S + 850) & 3) === 0 ? BK[2] : BK[1];
            else if (up < bankH + 2) c = WT[0];
            else { c = WT[1]; acr[tx] = dd / r0.hw; }
          } else if (d < r0.hw + Math.max(1, s * 1.5) && inRiverUp(gxN, s, yg - Math.max(2, Math.round(3 * s)))) c = GR[4];
        }
        if (hzK > 0.01 && hzK * haze * 1.6 > bb * 0.6) c = mix(c, skyLow, hzK * haze * 1.6);
        arr[tx] = c;
      }
      out = { s, z, arr, acr };
    }
    rows.set(yg, out);
    return out;
  };
  gc = { row };
  if (groundCache.size > 6) groundCache.clear();
  groundCache.set(key, gc);
  return gc;
}
// sprites: something drawn once around its anchor (0, 0) and kept; later points cover earlier ones
const spriteCache = new Map();
function spriteOf(key, draw) {
  let sp = spriteCache.get(key);
  if (sp) return sp;
  const m = new Map();
  draw((x, y, c) => m.set((y + 4096) * 8192 + (x + 4096), c));
  const n = m.size, xs = new Int16Array(n), ys = new Int16Array(n), cs = new Uint32Array(n);
  let i = 0;
  for (const [k, c] of m) { xs[i] = (k % 8192) - 4096; ys[i] = Math.floor(k / 8192) - 4096; cs[i++] = c; }
  sp = { xs, ys, cs, n };
  if (spriteCache.size > 600) spriteCache.clear();
  spriteCache.set(key, sp);
  return sp;
}

/**
 * The valley seen through a window of the scene: bw x bh cells whose top-left is scene cell (X0, Y0); dims the scene's
 * size in cells. wt is the world's clock (periodic over P), T the tile (the scene's longer side), cam the camera.
 * Returns { col, lit } like renderWorld.
 */
export function renderValley(w, wt, P, T, X0, Y0, bw, bh, cam = [0, 0], dims = [T, Math.round((T * 9) / 16)]) {
  const n = bw * bh, col = new Uint32Array(n), lit = new Float32Array(n * 3);
  const H = Math.max(16, dims[1]), Wd = Math.max(16, dims[0]), Xc = Wd / 2, u = (((wt / P) % 1) + 1) % 1, S = w.wSeed;
  const Tw = 2 * T, hY = (H * clamp(w.wHorizon, 20, 75)) / 100, G = H - hY, par = Math.max(0, w.wParallax), loops = whole(w.wLoops, 1);
  const dirX = Math.sign((DIRS[w.wDir] || DIRS.left)[0]) || -1, moving = w.wState === "moving" && w.wDrift > 0;
  const tilesOf = (depth) => (moving ? (w.wAllMove && depth >= 0.25 ? Math.max(1, whole(w.wDrift * depth)) : whole(w.wDrift * depth)) : 0);
  // far layers: whole tiles of T a loop (plus the wind's own), and the camera
  const shift = (depth, wind = 0) => [Math.round(u * (tilesOf(depth) * dirX + wind) * T) - Math.round(cam[0] * depth * par), -Math.round(cam[1] * depth * par)];
  // the ground: k whole tiles of Tw a loop; a row at scale s moves k Tw s pixels, the camera moves it cam * s
  const kG = moving ? Math.max(1, whole(w.wDrift / 2)) : 0, shiftW = u * kG * Tw * dirX - cam[0] * par, oyG = -Math.round(cam[1] * 0.6 * par);
  const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < bw && y < bh) col[y * bw + x] = c; };
  const get = (x, y) => (x >= 0 && y >= 0 && x < bw && y < bh ? col[y * bw + x] : 0);
  const addLight = (x, y, c, k) => {
    if (x < 0 || y < 0 || x >= bw || y >= bh || k <= 0) return;
    const j = (y * bw + x) * 3;
    lit[j] += red(c) * k; lit[j + 1] += green(c) * k; lit[j + 2] += blue(c) * k;
  };
  const glowAt = (x, y, r, c, k) => {
    if (k <= 0.004) return;
    const R = Math.ceil(r);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const d = Math.hypot(dx, dy) / r; if (d < 1) addLight(x + dx, y + dy, c, (1 - d) * (1 - d) * k); }
  };
  const copiesT = (x, ox, m, fn) => { const x0 = wrap(Math.round(x) + ox - X0, T * 2); for (let xx = x0 - T * 2; xx < bw + m; xx += T * 2) if (xx > -m) fn(xx); };
  const M = mapOf(w, Tw, Wd, H);
  const gust = whole(w.wGust), sway = Math.max(0, w.wSway);
  const windAt = (lx, ph = 0) => (gust ? Math.sin(TAU * (u * gust - (lx / Tw) * 4 + ph)) * 0.6 + Math.sin(TAU * (u * gust * 2 - (lx / Tw) * 9 + ph * 2)) * 0.25 : 0);

  // ---- colours
  const skyTop = hex(w.wSkyTop), skyLow = hex(w.wSkyLow), haze = clamp(w.wHaze, 0, 1);
  const hz = (c, k) => mix(c, skyLow, clamp(k * haze));
  const gD = hex(w.wGrassDark), gL = hex(w.wGrassLight), GR = [mix(gD, BLACK, 0.22), gD, mix(gD, gL, 0.5), gL, mix(gL, hex("#f4ffa0"), 0.45)];
  const lD = hex(w.wLeafDark), lL = hex(w.wLeafLight), LEAF = [mix(lD, BLACK, 0.35), lD, mix(lD, lL, 0.5), lL, mix(lL, hex("#f0ffb0"), 0.5)];
  const trunk = hex(w.wTrunk), TR = [mix(trunk, BLACK, 0.5), mix(trunk, BLACK, 0.25), trunk, mix(trunk, hex("#f0d0a0"), 0.3)];
  const rockC = hex(w.wRockCol), RK = [mix(rockC, BLACK, 0.62), mix(rockC, BLACK, 0.36), mix(rockC, BLACK, 0.15), rockC, mix(rockC, WHITE, 0.32), mix(rockC, WHITE, 0.55)];
  const water = hex(w.wWaterCol), wLight = hex(w.wWaterLight), WT = [mix(water, BLACK, 0.3), water, mix(water, wLight, 0.5), wLight, mix(wLight, WHITE, 0.7)];
  const bank = hex(w.wBankCol), BK = [mix(bank, BLACK, 0.45), bank, mix(bank, hex("#f0c890"), 0.3)];
  const pathC = hex(w.wPathCol), PT = [mix(pathC, BLACK, 0.3), mix(pathC, BLACK, 0.12), pathC, mix(pathC, WHITE, 0.3)];
  const FL = [hex(w.wFlowerA), hex(w.wFlowerB), hex(w.wFlowerC), WHITE];

  // ---- the sky, in hard bands, dithered between them
  const steps = Math.max(2, whole(w.wSkySteps, 2)), dith = clamp(w.wSkyDither, 0, 1.5), oyS = -Math.round(cam[1] * 0.04 * par);
  const SKY = Array.from({ length: steps + 1 }, (_, L) => mix(skyTop, skyLow, L / steps));
  for (let y = 0; y < bh; y++) {
    const sy = Y0 + y - oyS, f = clamp(sy / Math.max(1, hY));
    for (let x = 0; x < bw; x++) {
      const L = clamp(Math.floor(f ** 1.3 * steps + (bayer(wrap(X0 + x, 4), wrap(sy, 4)) - 0.5) * dith), 0, steps);
      col[y * bw + x] = SKY[L];
    }
  }
  // stars, for night skies
  if (M.stars.length) {
    const [ox, oy] = shift(0.02);
    for (const s of M.stars) copiesT(s.x, ox, 2, (x) => {
      const y = Math.round(s.y) + oy - Y0, v = s.b * 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(TAU * (u * Math.max(1, Math.round(2 * (0.5 + s.k))) + s.ph))), fade = 1 - (s.y / hY) ** 2;
      if (fade <= 0.1) return;
      put(x, y, mix(get(x, y), WHITE, clamp(v * fade * 1.1)));
      if (v > 0.85 && fade > 0.6) { const d = mix(get(x + 1, y), WHITE, 0.35); put(x - 1, y, d); put(x + 1, y, d); put(x, y - 1, d); put(x, y + 1, d); addLight(x, y, WHITE, 0.3); }
    });
  }

  // ---- sun with its halo rings, or a moon
  const sunR = Math.max(1.5, (H * w.wSunSize) / 100), scx = (Wd * w.wSunX) / 100 - X0, scy = (H * w.wSunY) / 100 - Y0 + oyS, sunC = hex(w.wSunCol);
  if (w.wSun !== "none") {
    const R = sunR, halo = Math.max(0, w.wHalo), Rc = Math.ceil(R * (1 + 2.6 * halo) + 2);
    for (let dy = -Rc; dy <= Rc; dy++) for (let dx = -Rc; dx <= Rc; dx++) {
      const x = Math.floor(scx + dx), y = Math.floor(scy + dy), d = Math.hypot(x + 0.5 - scx, y + 0.5 - scy);
      if (x < 0 || y < 0 || x >= bw || y >= bh) continue;
      if (w.wSun === "sun") {
        if (d < R - 1) put(x, y, d < R * 0.6 ? WHITE : mix(sunC, WHITE, 0.4));
        else if (d < R) put(x, y, sunC);
        else if (halo > 0) { // two soft rings of lighter sky, dithered at their rims
          const b = bayer(wrap(x, 4), wrap(y, 4)), r1 = R * (1 + 0.9 * halo), r2 = R * (1 + 2.4 * halo);
          if (d < r1 - 1 || (d < r1 + 1 && b < 0.5)) put(x, y, mix(get(x, y), WHITE, 0.42));
          else if (d < r2 - 1 || (d < r2 + 1.5 && b < 0.4)) put(x, y, mix(get(x, y), WHITE, 0.18));
        }
      } else if (d < R) {
        const sd = Math.hypot(x + 0.5 - (scx + R * 0.55), y + 0.5 - (scy - R * 0.25));
        let c = d < R - 1 ? sunC : mix(sunC, skyTop, 0.2);
        const g = rng(S, 7);
        for (let k = 0; k < 3; k++) { const cx = scx + g.range(-0.5, 0.3) * R, cy = scy + g.range(-0.5, 0.5) * R, cr = R * g.range(0.12, 0.22); if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < cr) c = mix(sunC, skyTop, 0.3); }
        if (sd < R * 0.95) c = mix(c, get(x, y), 0.72);
        put(x, y, c);
      }
    }
    glowAt(Math.floor(scx), Math.floor(scy), R * (w.wSun === "sun" ? 4 : 3), sunC, (w.wSun === "sun" ? 0.5 : 0.35) * w.wSunGlow);
  }

  // ---- birds
  if (w.wBirds > 0) {
    const dark = mix(skyTop, BLACK, 0.6), sh = [-Math.round(cam[0] * 0.2 * par), -Math.round(cam[1] * 0.2 * par)];
    cycle(wt, P, whole(w.wBirds), S * 13 + 5, (g) => g.range(0.35, 0.55) * P, (age, life, g) => {
      const k = age / life, way = g.next() < 0.5 ? -1 : 1, y0 = g.range(H * 0.08, hY * 0.6), span = Wd + 40, flock = 1 + Math.floor(g.next() * 3);
      for (let b = 0; b < flock; b++) {
        const x = Math.round((way > 0 ? -20 + span * k : Wd + 20 - span * k) - b * 7 * way + sh[0] - X0), y = Math.round(y0 + b * 4 + Math.sin(TAU * k * 2 + b) * 2 - Y0 + sh[1]);
        const flap = Math.floor(age * 7 + b * 0.5) % 3, wy = flap === 0 ? -1 : flap === 1 ? 0 : 1;
        put(x, y, dark); put(x - 1, y + (wy < 0 ? -1 : 0), dark); put(x + 1, y + (wy < 0 ? -1 : 0), dark); put(x - 2, y + wy, dark); put(x + 2, y + wy, dark);
      }
    });
  }

  // ---- cumulus: white crowns lit from the top left, a shaded belly and a flat base; low ones hazy
  {
    const cw = Math.round(w.wCloudWind || 0), morph = whole(w.wCloudMorph), cC = hex(w.wCloudCol), cS = hex(w.wCloudShade);
    for (const c of M.clouds) {
      const [ox, oy] = shift(c.low ? 0.08 : 0.05, cw);
      const top = c.low ? hz(cC, 0.4) : cC, lite = mix(cC, cS, c.low ? 0.45 : 0.22), mid = c.low ? hz(cS, 0.5) : cS, low = mix(cS, skyTop, c.low ? 0.15 : 0.28);
      const rs = c.puffs.map((p) => p.r * (1 + (morph ? 0.06 * Math.sin(TAU * (u * morph + p.ph)) : 0)));
      const half = c.wide / 2 + c.size * 1.3;
      copiesT(c.x, ox, half + 2, (cx) => {
        const cy = c.y + oy - Y0;
        for (let y = Math.floor(cy - c.size * 2.2); y <= Math.ceil(cy + 1); y++) {
          if (y < 0 || y >= bh) continue;
          for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
            if (x < 0 || x >= bw) continue;
            const px = x + 0.5, py = y + 0.5;
            if (py > cy + 0.5) continue;
            let best = 9;
            c.puffs.forEach((p, j) => { const dx = px - (cx + p.dx), dy = py - (cy + p.dy), r = rs[j]; if (dx * dx + dy * dy < r * r) best = Math.min(best, (dy + dx * 0.35) / r); });
            if (best > 2) continue;
            const b = (bayer(wrap(x, 4), wrap(y, 4)) - 0.5) * 0.16;
            put(x, y, py > cy - 1.5 ? low : best + b < -0.5 ? top : best + b < 0.05 ? lite : best + b < 0.55 ? mid : low);
          }
        }
      });
    }
  }

  // ---- mountains: two ranges, the far one paler; ridged noise, lit and shaded facets, snow on the peaks
  const range = (depth, hFrac, base0, seed, hzK, snowK) => {
    const [ox, oy] = shift(depth), mh = H * hFrac * w.wMount;
    if (mh < 1) return;
    const base = hz(base0, hzK), litC = hz(mix(base0, WHITE, 0.25), hzK), shade = hz(mix(base0, skyTop, 0.35), hzK * 0.8);
    const snow = hz(hex(w.wSnowCol), hzK * 0.4), snowSh = mix(snow, shade, 0.45), snowLine = hY - mh * (1 - clamp(w.wSnow * snowK, 0, 1)) * 0.95;
    const top = (lx) => hY - mh * clamp(0.12 + 0.88 * (fbm1(lx, T, T / 3.2, S + seed, 4, true) * 0.5 + 0.5)) + 2;
    const Mg = Math.ceil(mh * 0.7) + 4, ridge = new Float32Array(bw + 2 * Mg);
    for (let i = 0; i < ridge.length; i++) ridge[i] = top(X0 + i - Mg - ox);
    const at = (i) => ridge[clamp(i, 0, ridge.length - 1)];
    for (let x = 0; x < bw; x++) {
      const lx = wrap(X0 + x - ox, T), t = ridge[x + Mg] + oy;
      for (let y = Math.max(0, Math.floor(t - Y0)); y < bh; y++) {
        const sy = y + Y0, d = sy - t;
        if (sy > hY + oy + 30) break;
        const c0 = x + Mg - Math.round(d * 0.5), wn = Math.round(2 + d * 0.5), slope = at(c0 + wn) - at(c0 - wn);
        const lit2 = slope > 0.6, dk = slope < -0.6, bb = bayer(wrap(lx | 0, 4), wrap(sy, 4));
        const sn = w.wSnow > 0 && sy < snowLine + (bb - 0.5) * 3 + fbm1(lx, T, 12, S + seed + 20, 1) * 4;
        let c = sn ? (dk ? snowSh : snow) : d < 1 && !dk ? litC : lit2 ? litC : dk ? shade : base;
        const foot = (sy - (hY + oy - mh * 0.35)) / (mh * 0.35);
        if (foot > 0 && bb < foot * 0.8) c = mix(c, skyLow, 0.4);
        put(x, y, c);
      }
    }
  };
  if (w.wMount > 0) {
    const mc = hex(w.wMountCol);
    range(0.08, 0.14, mix(mc, skyLow, 0.2), 500, 0.5, 0.9);
    range(0.13, 0.085, mc, 540, 0.3, 0.4);
  }

  // ---- hills: soft green swells at the horizon, then a line of far woods
  if (w.wHills > 0) {
    const [ox, oy] = shift(0.2), hh = H * 0.06 * w.wHills, base = hz(GR[2], 0.7), rim = hz(GR[3], 0.62), dark = hz(GR[1], 0.72);
    for (let x = 0; x < bw; x++) {
      const lx = X0 + x - ox, t0 = hY - hh * (0.2 + 0.8 * (fbm1(lx, T, T / 3.5, S + 600, 3) * 0.5 + 0.5)) + 1, t = Math.round(t0) + oy;
      for (let y = Math.max(0, t - Y0); y < bh; y++) { const sy = y + Y0; if (sy > hY + oy + 30) break; put(x, y, sy - t < 1 ? rim : (sy + (x & 1)) % 7 === 0 && sy - t > 2 ? dark : base); }
    }
  }
  if (w.wForest > 0) {
    // far woods: round crowns side by side where the noise says there are woods, lit on their left
    const [ox, oy] = shift(0.28), fc = hex(w.wForestCol), base = hz(fc, 0.45), lite = hz(mix(fc, GR[3], 0.5), 0.4), dark = hz(mix(fc, BLACK, 0.35), 0.45), fh = H * 0.03 * w.wForest;
    const nC = Math.max(4, Math.round(T / Math.max(3, H * 0.018))), cw = T / nC, c0 = Math.floor((X0 - ox) / cw) - 3, c1 = Math.ceil((X0 + bw - ox) / cw) + 3, crowns = [];
    for (let ci = c0; ci <= c1; ci++) {
      const c = wrap(ci, nC), on = fbm1((c + 0.5) * cw, T, T / 6, S + 650, 2) + 0.12 * w.wForest - 0.05;
      crowns.push(on <= 0 ? null : { x: (ci + 0.5) * cw + (h01(c, S, 652) - 0.5) * cw * 0.5, r: cw * (0.75 + 0.5 * h01(c, S, 651)) * clamp(on * 5, 0.5, 1.2), top: hY - 1 - fh * clamp(on * 4, 0.3, 1) * (0.6 + 0.4 * h01(c, S, 653)) });
    }
    for (let x = 0; x < bw; x++) {
      const lx = X0 + x - ox + 0.5, ci = Math.floor((lx - 0.5) / cw);
      let t = 1e9, dxr = 0, rr = 0;
      for (let k = ci - 2; k <= ci + 2; k++) {
        const c = crowns[k - c0];
        if (!c) continue;
        const dx = lx - c.x;
        if (Math.abs(dx) >= c.r) continue;
        const tt = c.top + c.r - Math.sqrt(c.r * c.r - dx * dx);
        if (tt < t) { t = tt; dxr = dx / c.r; rr = c.r; }
      }
      if (t > 1e8) continue;
      const ti = Math.round(t) + oy;
      for (let y = Math.max(0, ti - Y0); y < bh; y++) { const sy = y + Y0, d = sy - ti; if (sy > hY + oy + 30) break; put(x, y, d < 1 && dxr < 0.3 ? lite : dxr > 0.35 && d < rr * 0.9 ? dark : d < rr * 0.5 && dxr < -0.2 && d > 0 && (sy & 1) ? lite : base); }
    }
  }

  // ---- the ground in perspective: each row is a depth. What does not move on it (meadow, flowers, path, banks) is
  // worked out once per row and kept, over one whole tile of the row; each frame only reads it and adds the ripples.
  const shimmer = Math.max(0, w.wShimmer), flowN = Math.max(1, Math.round(Math.max(0.1, w.wFlow) * loops / 3)), RIP = 80; // ripples: RIP cells of pattern, run flowN times a loop
  const GC = groundOf(w, M, Tw, Wd, H, hY, { GR, WT, BK, PT, FL, skyLow, haze });
  for (let y = 0; y < bh; y++) {
    const yg = Y0 + y - oyG, row = GC.row(yg);
    if (!row) continue;
    const { s, arr, acr } = row, L = arr.length, ripRow = row.z * 34 + u * flowN * RIP, cell = Math.floor(ripRow), jit = h01(cell, S + 860) * 3, base = Xc - Xc / s - shiftW;
    for (let x = 0; x < bw; x++) {
      const gx = (X0 + x + 0.5) / s + base;
      let tx = Math.floor((gx - Math.floor(gx / Tw) * Tw) * s);
      if (tx >= L) tx = L - 1;
      let c = arr[tx];
      const a = acr[tx];
      if (a === a) { // open water: ripples that flow towards us
        const rp = h01(wrap(cell, RIP), Math.floor(a * 3.5 + jit), S + 861), e = Math.abs(a);
        c = e > 0.9 ? WT[2] : WT[1];
        if (rp < 0.18 * shimmer) { c = rp < 0.05 * shimmer ? WT[4] : WT[3]; if (rp < 0.05 * shimmer) addLight(x, y, wLight, 0.12 * shimmer); }
        else if (rp > 0.9 && e < 0.85) c = WT[2];
      }
      col[y * bw + x] = c;
    }
  }

  // ---- things on the ground, far ones first; each at its depth, sized by it, sliding with its row. Each is drawn once
  // into a sprite and kept: only the oaks' crowns move, row by row, in the gusts.
  const csig = [w.wLeafDark, w.wLeafLight, w.wTrunk, w.wRockCol, w.wSkyLow, w.wHaze].join();
  const onScreen = [];
  for (const it of M.items) {
    const s = scaleAt(it.f), sy = Math.round(hY + it.f * G + oyG - Y0), per = Tw * s, half = it.size * s * 0.9 + 4;
    const x0 = wrap(Xc + (it.gx + shiftW - Xc) * s - X0, per);
    for (let xx = x0 - per; xx < bw + half; xx += per) if (xx > -half && sy - it.size * s * 1.1 < bh && sy - 6 < bh && sy + 8 > 0) onScreen.push({ it, x: Math.round(xx), y: sy, s });
  }
  onScreen.sort((a, b) => a.it.f - b.it.f);
  const blit = (sp, cx, by, rowShift) => {
    const { xs, ys, cs, n } = sp;
    for (let i = 0; i < n; i++) put(cx + xs[i] + (rowShift ? rowShift(ys[i]) : 0), by + ys[i], cs[i]);
  };
  for (const o of onScreen) {
    const it = o.it, k = it.kind, hzK = clamp(1 - it.f * 2.4) ** 2 * 0.55, sz = it.size * o.s, key = `${k}|${it.seed}|${sz.toFixed(2)}|${hzK.toFixed(3)}|${csig}`;
    if (k === "oak") {
      shadow(o.x + sz * 0.05, o.y, sz * it.shape.wide * 0.95, 0.5);
      blit(spriteOf(key + "|t", (pp) => oakTrunk(pp, sz, it, hzK)), o.x, o.y);
      const wv = windAt(it.gx, it.seed * 0.001) * sway * sz * 0.014, rows = new Map();
      blit(spriteOf(key + "|c", (pp) => clumps(pp, it.shape.clumps, sz, hzK, it.seed)), o.x, o.y, (yy) => { let v = rows.get(yy); if (v === undefined) rows.set(yy, (v = Math.round(wv * clamp(-yy / sz - 0.4) * 2))); return v; });
    } else if (k === "bush") { shadow(o.x, o.y, sz * 0.55, 0.45); blit(spriteOf(key, (pp) => bush(pp, sz, it.seed, hzK)), o.x, o.y); }
    else if (k === "stone") { shadow(o.x, o.y, sz * 0.8, 0.35); blit(spriteOf(key, (pp) => boulder(pp, 0, 0, sz * 0.5, sz * 0.32, boulderOf(it.seed), hzK)), o.x, o.y); }
    else if (k === "pile") { shadow(o.x + sz * 0.08, o.y + 1, sz * 0.85, 0.5); blit(spriteOf(key, (pp) => pile(pp, sz, it, hzK)), o.x, o.y); }
    else if (k === "tuft") tuft(o.x, o.y, sz, it.seed);
  }

  // a soft shadow on the grass
  function shadow(cx, cy, rx, k) {
    const ry = Math.max(1, rx * 0.2);
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      if (y < 0 || y >= bh) continue;
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy < 1 && bayer(wrap(x + X0, 4), wrap(y + Y0, 4)) < 0.75) put(x, y, mix(get(x, y), GR[0], k));
      }
    }
  }
  // leaf clumps (oaks and bushes), in sprite space around the anchor: the clump on top decides; lit top-left, the
  // shaded underside of each clump, leaf specks of the next tone so the crown is not flat, a dark outer rim
  function clumps(pp, list, sc, hzK, seed) {
    const tones = LEAF.map((c) => hz(c, hzK));
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const c of list) { x0 = Math.min(x0, c.x - c.r); x1 = Math.max(x1, c.x + c.r); y0 = Math.min(y0, c.y - c.r); y1 = Math.max(y1, c.y + c.r); }
    const ym = (y0 + y1) / 2, yr = Math.max(0.01, (y1 - y0) / 2);
    const hit = (px, py) => {
      const qx = px / sc, qy = py / sc;
      for (let i = list.length - 1; i >= 0; i--) { const c = list[i], dx = qx - c.x, dy = qy - c.y; if (dx * dx + dy * dy < c.r * c.r) return i; }
      return -1;
    };
    const sh = Math.max(1, sc * 0.022);
    for (let y = Math.floor(y0 * sc - 2); y <= Math.ceil(y1 * sc + 2); y++) for (let x = Math.floor(x0 * sc - 2); x <= Math.ceil(x1 * sc + 2); x++) {
      const i = hit(x + 0.5, y + 0.5);
      if (i < 0) continue;
      const c = list[i], dx = ((x + 0.5) / sc - c.x) / c.r, dy = ((y + 0.5) / sc - c.y) / c.r, d2 = dx * dx + dy * dy;
      let v = -0.6 * dx - 0.9 * dy + c.k - ((c.y - ym) / yr) * 0.45 - c.x * 0.8;
      const sp = h01(x, y, seed);
      if (sp < 0.16) v += 0.5; else if (sp > 0.86) v -= 0.5;
      let L = v > 1 ? 4 : v > 0.45 ? 3 : v > -0.2 ? 2 : 1;
      if (d2 > 0.62 && dy > 0.15) L = Math.min(L, 1);
      if (d2 > 0.84 && dy > 0.4) L = 0;
      // the shadow a clump in front casts on the ones behind it, down and to the right
      const j = hit(x + 0.5 - sh, y + 0.5 - sh * 1.6);
      if (j > i) L = Math.min(L, sp < 0.5 ? 1 : 0);
      if (hit(x + 1.5, y + 1.5) < 0) L = 0;
      pp(x, y, tones[L]);
    }
  }
  // an oak's trunk: flared roots, lit on its left, a dark right side, bark streaks; branches up into the crown
  function oakTrunk(pp, h, it, hzK) {
    const sh = it.shape, tr = TR.map((c) => hz(c, hzK)), tw = sh.trunkW * h, top = -h * 0.5;
    for (let y = Math.floor(top); y < 0; y++) {
      const k = -y / -top, half = (tw / 2) * (1 + 1.1 * Math.max(0, 1 - k * 5) ** 2) * (1 - 0.15 * k), mid = sh.lean * h * k * 4;
      for (let x = Math.floor(mid - half); x <= Math.ceil(mid + half); x++) {
        const e = (x + 0.5 - mid) / half;
        if (Math.abs(e) > 1) continue;
        let L = e < -0.45 ? 3 : e > 0.5 ? 0 : e > 0.1 ? 1 : 2;
        if (L > 0 && h01(x, Math.floor(y / 3), it.seed) < 0.2) L--;
        pp(x, y, tr[L]);
      }
    }
    for (const b of sh.branches) {
      const x1 = b.x * h, y1 = b.y * h, x0 = sh.lean * h * 4, n = Math.ceil(Math.hypot(x1 - x0, y1 - top)), th = Math.max(0.6, tw * 0.3);
      for (let i = 0; i <= n; i++) {
        const k = i / n, px = x0 + (x1 - x0) * k, py = top + 2 + (y1 - top - 2) * k, r = th * (1 - k * 0.6);
        for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) pp(Math.round(px + dx), Math.round(py), dx < 0 ? tr[2] : tr[1]);
      }
    }
  }
  function bush(pp, sz, seed, hzK) {
    const g = rng(seed, 4), n = 4 + g.int(0, 3), list = [];
    for (let i = 0; i < n; i++) { const f = (i + 0.5) / n; list.push({ x: (f - 0.5) * 0.9 + g.range(-0.06, 0.06), y: -0.3 - Math.sin(f * Math.PI) * 0.2 + g.range(-0.05, 0.05), r: g.range(0.22, 0.3) * (0.75 + 0.35 * Math.sin(f * Math.PI)), k: g.range(-0.1, 0.1) }); }
    list.push({ x: g.range(-0.1, 0.1), y: -0.56, r: 0.24, k: 0.1 });
    list.sort((p, q) => p.y - q.y);
    clumps(pp, list, sz, hzK, seed);
  }
  // a boulder: a convex lump, its top face flat and lit, its sides in facets by the way they face, dark seams
  function boulder(pp, cx, by, rx, ry, b, hzK) {
    const tones = RK.map((c) => hz(c, hzK)), cy = by - ry, n = b.pts.length;
    const pts = b.pts.map(([x, y]) => [cx + x * rx, cy + y * ry]), tp = b.pts.map(([x, y]) => [cx + x * rx * b.topK, cy + (y * b.topK + b.topY) * ry]);
    const inPoly = (P, x, y) => { for (let i = 0; i < P.length; i++) { const [ax, ay] = P[i], [bx, by2] = P[(i + 1) % P.length]; if ((bx - ax) * (y - ay) - (by2 - ay) * (x - ax) < 0) return false; } return true; };
    const ocy = cy + b.topY * ry * 0.5, mids = pts.map((p, i) => Math.atan2((p[1] + pts[(i + 1) % n][1]) / 2 - ocy, (p[0] + pts[(i + 1) % n][0]) / 2 - cx));
    const facet = (x, y) => {
      if (!inPoly(pts, x, y)) return -2;
      if (inPoly(tp, x, y)) return -1;
      const a = Math.atan2(y - ocy, x - cx);
      let best = 0, bd = 1e9;
      for (let i = 0; i < n; i++) { const d = Math.abs(wrapS(mids[i] - a, TAU)); if (d < bd) { bd = d; best = i; } }
      return best;
    };
    const lightOf = (i) => (i === -1 ? 4 : (() => { const v = Math.cos(mids[i] + 2.3) + 0.3 + b.tone * 4; return v > 0.55 ? 3 : v > -0.1 ? 2 : v > -0.6 ? 1 : 0; })());
    const W = Math.ceil(rx + 2), Hh = Math.ceil(ry * 2 + 2), x0 = Math.floor(cx - W), y0 = Math.floor(cy - ry - 2), F = new Int8Array((2 * W + 3) * (Hh + 4)).fill(-3);
    const fAt = (x, y) => { const i = (y - y0) * (2 * W + 3) + (x - x0); if (x < x0 || x > x0 + 2 * W + 2 || y < y0 || y > y0 + Hh + 3) return -2; if (F[i] === -3) F[i] = facet(x + 0.5, y + 0.5); return F[i]; };
    for (let y = y0; y <= y0 + Hh + 2; y++) for (let x = x0; x <= x0 + 2 * W + 1; x++) {
      const fc = fAt(x, y);
      if (fc === -2) continue;
      let L = lightOf(fc);
      if (rx > 3 && (fAt(x + 1, y) !== fc || fAt(x, y + 1) !== fc) && fAt(x + 1, y + 1) !== -2) L = Math.max(0, Math.min(L, 1) - (fc === -1 ? 0 : 1));
      if (fAt(x + 1, y + 1) === -2 || fAt(x, y + 1) === -2) L = 0;
      else if (fAt(x - 1, y - 1) === -2 && fc === -1) L = 5;
      if (rx > 6 && L > 1 && h01(x, y, 77) < 0.08) L--;
      pp(x, y, tones[L]);
    }
  }
  function pile(pp, sz, it, hzK) {
    for (const r of it.rocks) boulder(pp, r.x * sz, r.y * sz * 0.3 - (r.top ? r.lift * sz : 0), r.r * sz, r.h * sz * 0.5, boulderOf(r.seed), hzK);
  }
  // a tuft of tall grass: a fan of blades bending in the gusts
  function tuft(cx, by, sz, seed) {
    const g = rng(seed, 6), n = 4 + g.int(0, 4), bend0 = windAt(cx, seed * 0.001) * sway * 0.35;
    for (let i = 0; i < n; i++) {
      const lean = (i / (n - 1) - 0.5) * 0.9 + g.range(-0.15, 0.15), len = sz * g.range(0.55, 1), dark = g.next() < 0.35, bx = cx + g.range(-0.2, 0.2) * sz;
      for (let j = 0; j < len; j++) { const f = j / len, xx = Math.round(bx + (lean + bend0) * len * f * f), yy = Math.floor(by - j); put(xx, yy, dark ? (f > 0.6 ? GR[2] : GR[0]) : f > 0.7 ? GR[4] : f > 0.35 ? GR[3] : GR[2]); }
    }
  }

  // ---- tall grass at the bottom edge, bending with the gusts
  if (w.wBlades > 0 && w.wGrassH > 0) {
    const sNear = scaleAt(1), per = Tw * sNear, hb = (H * w.wGrassH) / 100, dens = clamp(w.wBlades, 0, 2), by = Math.round(hY + G + oyG) - Y0;
    for (let x = -6; x < bw + 6; x++) {
      const lx = wrap(X0 + x - (Xc + (shiftW - Xc) * sNear) * 1.15, per), li = Math.floor(lx), r = h01(li, S, 400);
      // clumps, thicker towards the sides of the scene
      const side = Math.abs((X0 + x) / Wd - 0.5) * 2, clump = fbm1(lx, per, per / 18, S + 410, 2) + side * 0.5 - 0.15;
      if (clump < 0 || r > 0.5 * dens) continue;
      const len = hb * (0.3 + 0.7 * h01(li, S, 401)) * clamp(clump * 2.5, 0.3, 1.2), lean = (h01(li, S, 402) - 0.5) * 0.6, bend = windAt(li * 2, 0.1) * sway * 0.5 + lean, dark = r < 0.12 * dens;
      for (let i = 0; i < len; i++) {
        const f = i / len, xx = Math.round(x + bend * len * f * f), yy = by - i - 1;
        put(xx, yy, dark ? (f > 0.7 ? GR[2] : GR[0]) : f > 0.75 ? GR[4] : f > 0.4 ? GR[3] : GR[2]);
      }
    }
  }

  // ---- floating motes: pollen by day, fireflies by night
  if (M.motes.length) {
    const [ox, oy] = shift(0.9), mc = hex(w.wMoteCol);
    for (const m of M.motes) {
      const mx = m.x + m.ax * Math.sin(TAU * (u * m.kx + m.ph)), my = m.y + m.ay * Math.sin(TAU * (u * m.ky + m.ph2)), v = 0.55 + 0.45 * Math.sin(TAU * (u * m.kb * 2 + m.ph));
      copiesT(mx, ox, 3, (x) => { const y = Math.round(my) + oy - Y0; put(x, y, v > 0.7 ? mix(mc, WHITE, 0.5) : mix(get(x, y), mc, 0.4 + 0.5 * v)); glowAt(x, y, 2.5, mc, 0.3 * v); });
    }
  }
  return { col, lit };
}

// ---- on its own (pixelfx render / checks)
const roomOf = (o) => (Array.isArray(o.room) ? o.room : [-meta.origin[0], -meta.origin[1], meta.size[0] - meta.origin[0], meta.size[1] - meta.origin[1]]);
export function drawBack(p, t, o) {
  const w = { ...VALLEY, ...(o.world || o) }, room = roomOf(o), bw = Math.ceil(room[2] - room[0]), bh = Math.ceil(room[3] - room[1]);
  const P = o.duration * Math.max(1, Math.round(w.wLoops || 1)), T = Math.max(16, bw, bh);
  const { col, lit } = renderValley(w, t, P, T, 0, 0, bw, bh, [w.wCamX || 0, w.wCamY || 0], [bw, bh]);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const i = y * bw + x, lx = room[0] + x + 0.5, ly = room[1] + y + 0.5, j = i * 3;
    p.px(lx, ly, col[i] || 0xff000000);
    if (lit[j] + lit[j + 1] + lit[j + 2] > 1) p.light(lx, ly, (255 << 24) | (Math.min(255, lit[j + 2]) << 16) | (Math.min(255, lit[j + 1]) << 8) | Math.min(255, lit[j]), 1);
  }
}
export function draw() {}
