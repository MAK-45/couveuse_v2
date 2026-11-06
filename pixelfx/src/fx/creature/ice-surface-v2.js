// Planet surfaces, second version (tab Surface planète v2): a green valley in a painted pixel-art style. Chunky pixels
// (wPix), big flat areas of colour instead of speckle, dark outlines round what stands on the ground, and shapes
// drawn the way a pixel artist would: meadows in terraces with a shaded slope and a fringe of grass at each edge,
// grass marks and flower clusters here and there, a river with a brown far bank, a darker rim, a light middle and
// flow lines that run along it, oaks whose crowns are layered pads of leaves over visible branches, boulders built of
// rounded, chamfered blocks (lit faces, dark crevices), leafy bushes, tall blades in front. The sky comes in bands
// joined by line dithering, with a haloed sun, shaded cumulus, hazy mountains, hills and far woods.
//
// The ground is one plane seen in perspective: each row of the screen is a depth (scale s from the horizon to the
// bottom); what lies on it is placed in world coordinates (gx along the row, depth f), so the river narrows into the
// distance and, when the world travels, each row slides at its own speed: true parallax that never tears.
//
// It loops like every world (wLoops blob loops): the ground repeats every Tw = 2 scenes and travels a whole number k
// of them a loop (a row of scale s moves k Tw s pixels, its own period); far layers scroll whole tiles; the river's
// flow lines run a whole number of their period; gusts, sway and twinkles run whole turns; birds use cycle().
// Sizes are in % of the scene's height.
import { clamp, mix, hex, red, green, blue, rng, cycle, hash, TAU, WHITE } from "../../core/index.js";

export const VALLEY = {
  wType: "valley", wSeed: 74, wLoops: 3, wPix: 2,
  // sky, sun or moon
  wSkyTop: "#2c7fe0", wSkyLow: "#bfe8f8", wSkySteps: 7, wSkyDither: 1, wStars: 0,
  wSun: "sun", wSunX: 64, wSunY: 11, wSunSize: 4.5, wSunCol: "#fffbe6", wSunGlow: 1, wHalo: 1,
  // clouds
  wClouds: 8, wCloudSize: 1, wCloudCol: "#ffffff", wCloudShade: "#a9c9ea", wCloudWind: 1, wCloudMorph: 1,
  // far away: mountains, hills, woods
  wHorizon: 42, wMount: 1, wMountCol: "#8494bd", wSnow: 0.1, wSnowCol: "#eef6ff", wHills: 1, wForest: 1, wForestCol: "#2f6a36", wHaze: 0.5,
  // the meadow
  wGrassDark: "#2f7f22", wGrassLight: "#8bd240", wTerraces: 2, wPatches: 1, wGrassTex: 1, wFlowers: 1,
  wFlowerA: "#ffe14a", wFlowerB: "#ff5f4a", wFlowerC: "#6aa6ff",
  wBlades: 1, wGrassH: 10, wSway: 1, wGust: 2,
  // the river and the path
  wRiver: 1, wRiverW: 24, wMeander: 1, wWaterCol: "#2f92e6", wWaterLight: "#8ed8ff", wBankCol: "#8a5a30", wFlow: 1, wShimmer: 1,
  wPath: 1, wPathW: 7, wPathCol: "#c89c64",
  // trees, bushes, rocks
  wBigTree: 1, wTreeSize: 48, wTrees: 6, wBushes: 10, wLeafDark: "#1b5520", wLeafLight: "#72bd38", wTrunk: "#7a4a28",
  wRockPile: 1, wPileSize: 40, wRocks: 7, wRockCol: "#938471",
  // little lives
  wMotes: 8, wMoteCol: "#fffbd0", wBirds: 2,
  // the voyage and the camera
  wState: "still", wDrift: 2, wDir: "left", wParallax: 1, wCamX: 0, wCamY: 0,
};
export const SURFACE2_DEFAULTS = { valley: VALLEY };
export const SURFACE2_TYPES = Object.keys(SURFACE2_DEFAULTS);

export const meta = {
  name: "Ice planet surface v2",
  desc: "A green valley in a painted pixel-art style: banded sky, cumulus, terraced meadows, a winding river, layered oaks, faceted boulders, bushes; still or in parallax.",
  tags: ["background", "world", "valley", "river", "trees", "rocks", "loop", "parallax"],
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
// line dithering, as in hand-made skies: f in 0..1 between two tones, rows alternate first, then a checker
const lineDith = (f, x, y) => (f < 0.25 ? false : f < 0.5 ? (y & 1) === 0 && (x & 1) === 0 : f < 0.75 ? (y & 1) === 0 : (y & 1) === 0 || (x & 1) === 0);

// the ground's perspective: a row's scale grows from the horizon (f = 0) to the bottom of the scene (f = 1)
const S0 = 0.18, S1 = 1.1;
const scaleAt = (f) => S0 + S1 * f;
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
// 2D gradient noise, x repeating every px cells (the meadow's patches; depth does not repeat)
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
  const key = [w.wSeed, Tw, Wd, H, w.wHorizon, w.wRiver, w.wRiverW, w.wMeander, w.wPath, w.wPathW, w.wBigTree, w.wTreeSize, w.wTrees, w.wBushes, w.wRockPile, w.wPileSize, w.wRocks, w.wClouds, w.wCloudSize, w.wMotes, w.wStars, w.wTerraces].join();
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
  const path = whole(w.wPath) ? course(rng(S, 3), Xc - side * Wd * g.range(0.02, 0.18), Xc - side * Wd * g.range(0.3, 0.46), g.range(0.32, 0.52), 0.06, g.range(0.6, 1.1)) : null;
  const riverHW = (H * clamp(w.wRiverW, 2, 40)) / 200, pathHW = (H * clamp(w.wPathW, 1, 20)) / 200; // half widths at scale 1
  // terraces: fold lines across the meadow (depth f along world x); in front of each, a shaded slope
  const nF = whole(w.wTerraces), folds = Array.from({ length: nF }, (_, i) => ({ f: 0.12 + (0.78 * (i + g.range(0.25, 0.75))) / nF, amp: g.range(0.05, 0.1), seed: S + 900 + i * 7 }));
  // how far a spot (world x, depth f) is from the water and the path, in screen pixels, minus their half widths
  const clearOf = (gx, f) => {
    const s = scaleAt(f);
    let d = 1e9;
    if (river && f > river.fA - 0.03) d = Math.min(d, Math.abs(wrapS(gx - river.gx(f), Tw)) * s - riverHW * s);
    if (path && f > path.fA - 0.03) d = Math.min(d, Math.abs(wrapS(gx - path.gx(f), Tw)) * s - pathHW * s);
    return d;
  };
  const items = [];
  const place = (gg, kind, fLo, fHi, half, xLo = null, xHi = null, extra = {}) => {
    for (let tries = 0; tries < 30; tries++) {
      const f = gg.range(fLo, fHi), gx = xLo === null ? gg.range(0, Tw) : gxOf(gg.range(xLo, xHi), f);
      if (clearOf(gx, f) > half * scaleAt(f) + 2) { const it = { kind, gx: wrap(gx, Tw), f, seed: gg.int(0, 99999), ...extra }; items.push(it); return it; }
    }
    return null;
  };
  if (whole(w.wBigTree)) {
    const gg = rng(S, 10), f = gg.range(0.33, 0.48), hs = (H * clamp(w.wTreeSize, 10, 90)) / 100;
    place(gg, "oak", f, f + 0.04, (hs * 0.45) / scaleAt(f), side > 0 ? Wd * 0.12 : Wd * 0.55, side > 0 ? Wd * 0.45 : Wd * 0.88, { size: hs / scaleAt(f), big: 1 });
  }
  if (whole(w.wRockPile)) {
    const gg = rng(S, 11), f = gg.range(0.36, 0.56), ps = (H * clamp(w.wPileSize, 5, 60)) / 100;
    place(gg, "pile", f, f + 0.04, (ps * 0.7) / scaleAt(f), side > 0 ? Wd * 0.62 : Wd * 0.06, side > 0 ? Wd * 0.94 : Wd * 0.38, { size: ps / scaleAt(f) });
  }
  for (let i = 0; i < whole(w.wTrees); i++) { const gg = rng(S, 20, i), f = gg.range(0.08, 0.42) ** 1.15 + 0.05, sz = H * gg.range(0.24, 0.38); place(gg, "oak", f, f, sz * 0.4, null, null, { size: sz }); }
  for (let i = 0; i < whole(w.wBushes); i++) { const gg = rng(S, 30, i), sz = H * gg.range(0.08, 0.13); place(gg, "bush", 0.2, 1.02, sz * 0.6, null, null, { size: sz }); }
  for (let i = 0; i < whole(w.wRocks); i++) { const gg = rng(S, 40, i), sz = H * gg.range(0.035, 0.07); place(gg, "stone", 0.25, 1.02, sz, null, null, { size: sz }); }
  for (let i = 0; i < 34; i++) { const gg = rng(S, 50, i), sz = H * gg.range(0.05, 0.09); place(gg, "tuft", 0.35, 1.04, sz * 0.4, null, null, { size: sz }); }
  // bushes and stones at the foot of the big ones
  for (const it of items.filter((q) => q.big || q.kind === "pile")) {
    const gg = rng(it.seed, 60), n = it.kind === "pile" ? 4 : 2;
    for (let j = 0; j < n; j++) {
      const dx = gg.range(-0.6, 0.6) * it.size, f = it.f + gg.range(0.005, 0.05), kind = j % 2 || it.kind !== "pile" ? "bush" : "stone";
      const gx = it.gx + dx, sz = kind === "bush" ? H * gg.range(0.07, 0.11) : H * gg.range(0.035, 0.055);
      if (clearOf(gx, f) > sz * 0.6 * scaleAt(f)) items.push({ kind, gx: wrap(gx, Tw), f, seed: gg.int(0, 99999), size: sz });
    }
  }
  for (const it of items) if (it.kind === "oak") it.shape = oakShape(it.seed, it.big);
  for (const it of items) if (it.kind === "pile") it.rocks = pileShape(it.seed);
  // clouds: big ones high up, flatter ones low by the mountains
  const clouds = Array.from({ length: whole(w.wClouds) }, (_, i) => {
    const gg = rng(S, 70, i), low = i % 3 === 2, size = H * 0.06 * w.wCloudSize * (low ? gg.range(0.5, 0.8) : gg.range(0.75, 1.3)), n = 4 + gg.int(0, 3), wide = size * gg.range(2.4, 3.6);
    const puffs = Array.from({ length: n }, (_, j) => {
      const fr = j / (n - 1), mid = 1 - Math.abs(fr - 0.5) * 1.4;
      return { dx: (fr - 0.5) * wide + gg.range(-0.15, 0.15) * size, dy: -size * (low ? 0.2 : 0.4) * mid - gg.range(0, size * 0.2), r: size * (0.42 + 0.6 * mid) * gg.range(0.85, 1.1), ph: gg.next() };
    });
    for (let j = 0; j < (low ? 0 : 2); j++) puffs.push({ dx: gg.range(-0.22, 0.22) * wide, dy: -size * gg.range(0.75, 1), r: size * gg.range(0.32, 0.45), ph: gg.next() });
    return { x: gg.range(0, Tw / 2), y: low ? gg.range(hY * 0.62, hY * 0.8) : gg.range(H * 0.06, hY * 0.5), puffs, size, wide, low };
  });
  const motes = Array.from({ length: whole(w.wMotes) }, (_, i) => {
    const gg = rng(S, 90, i);
    return { x: gg.range(0, Tw / 2), y: gg.range(hY + (H - hY) * 0.2, H * 0.96), ax: gg.range(3, 9), ay: gg.range(2, 6), kx: 1 + gg.int(0, 1), ky: 1 + gg.int(0, 2), ph: gg.next(), ph2: gg.next(), kb: 1 + gg.int(0, 2) };
  });
  const stars = Array.from({ length: whole(w.wStars) }, (_, i) => { const gg = rng(S, 95, i); return { x: gg.range(0, Tw / 2), y: gg.range(0, hY), b: gg.next(), ph: gg.next(), k: gg.next() }; });
  const out = { river, path, riverHW, pathHW, folds, items, clouds, motes, stars };
  if (cache.size > 24) cache.clear();
  cache.set(key, out);
  return out;
}

// an oak, in units of its height: a thick trunk with flared roots, branches that fork up to the pads of its crown;
// the pads are wide, flat-bottomed cushions of leaves laid in tiers, the lower ones overlapping the upper ones
function oakShape(seed, big) {
  const g = rng(seed, 1), pads = [];
  const tiers = big ? [[-0.92, 2, 0.1], [-0.82, 3, 0.25], [-0.71, 4, 0.37], [-0.6, 3, 0.4], [-0.5, 2, 0.4]] : [[-0.88, 1, 0], [-0.76, 2, 0.17], [-0.64, 3, 0.27], [-0.53, 2, 0.3]];
  for (const [y, n, spread] of tiers) {
    for (let i = 0; i < n; i++) {
      const fx = n === 1 ? 0 : (i / (n - 1)) * 2 - 1, rx = g.range(0.13, 0.17) * (big ? 1 : 1.2);
      pads.push({ x: fx * spread + g.range(-0.03, 0.03), y: y + g.range(-0.02, 0.02), rx, ryT: rx * g.range(0.55, 0.7), ryB: rx * g.range(0.32, 0.4), ph: g.range(0, TAU), k: Math.max(4, Math.round(rx * 34)) });
    }
  }
  pads.sort((p, q) => p.y - q.y);
  // the branches go from the top of the trunk to the middle of the lower pads, so they show in the gaps
  const branches = pads.filter((p) => p.y > -0.8).map((p) => ({ x: p.x * 0.85, y: p.y + p.ryB * 0.2 }));
  return { pads, branches, lean: g.range(-0.02, 0.02), trunkW: g.range(0.1, 0.12), wide: Math.max(...pads.map((p) => Math.abs(p.x) + p.rx)) };
}
// a pile of boulders: a big block at the back, smaller blocks before and beside it, one sitting on top
function pileShape(seed) {
  const g = rng(seed, 2), j = () => g.range(-0.05, 0.05), side = g.sign();
  const rocks = [
    { x: j(), y: 0, r: g.range(0.42, 0.48), h: g.range(0.7, 0.8) },
    { x: -0.3 * side + j(), y: 0.01, lift: 0.28, r: g.range(0.22, 0.27), h: 0.42 },
    { x: 0.32 * side + j(), y: 0.01, lift: 0.22, r: g.range(0.2, 0.25), h: 0.38 },
    { x: 0.06 * side + j(), y: 0.02, lift: 0.52, r: g.range(0.22, 0.27), h: 0.34 },
    { x: -0.48 * side + j(), y: 0.12, r: g.range(0.24, 0.3), h: 0.44 },
    { x: 0.5 * side + j(), y: 0.16, r: g.range(0.18, 0.24), h: 0.34 },
    { x: 0.12 * side + j(), y: 0.24, r: g.range(0.16, 0.2), h: 0.26 },
  ];
  for (const r of rocks) r.seed = g.int(0, 99999);
  rocks.sort((p, q) => p.y - q.y);
  return rocks;
}
// a block of stone: a convex outline (unit radius) with its corners rounded off, a top face set up and to the left,
// the sides between them as flat facets, a crack or two
function blockOf(seed) {
  const g = rng(seed, 3), n = 6 + g.int(0, 2), a0 = g.range(0, TAU), pts = [];
  for (let i = 0; i < n; i++) { const a = a0 + (i / n) * TAU + g.range(-0.25, 0.25); pts.push([Math.cos(a) * g.range(0.8, 1), Math.sin(a) * g.range(0.8, 1)]); }
  pts.sort((p, q) => Math.atan2(p[1], p[0]) - Math.atan2(q[1], q[0]));
  const edges = pts.map((p, i) => {
    const q = pts[(i + 1) % n], ex = q[0] - p[0], ey = q[1] - p[1], L = Math.hypot(ex, ey), nx = ey / L, ny = -ex / L;
    return { nx, ny, c: nx * p[0] + ny * p[1], mid: Math.atan2((p[1] + q[1]) / 2, (p[0] + q[0]) / 2) };
  });
  const top = { x: g.range(-0.22, 0.02), y: g.range(-0.4, -0.22), k: g.range(0.5, 0.62) };
  const cracks = Array.from({ length: g.int(1, 2) }, () => ({ a: g.range(0, TAU), len: g.range(0.3, 0.6), bend: g.range(-0.5, 0.5) }));
  return { pts, edges, top, cracks, tone: g.range(-0.12, 0.12) };
}

// ---- the ground's rows, kept: one whole tile of each row (meadow, flowers, path, banks), read with the row's shift
const groundCache = new Map();
function groundOf(w, M, Tw, Wd, H, hY, C) {
  const key = [w.wSeed, Tw, Wd, H, hY, w.wGrassDark, w.wGrassLight, w.wTerraces, w.wPatches, w.wGrassTex, w.wFlowers, w.wFlowerA, w.wFlowerB, w.wFlowerC, w.wPathCol, w.wBankCol,
    w.wWaterCol, w.wWaterLight, w.wRiver, w.wRiverW, w.wMeander, w.wPath, w.wPathW, w.wSkyLow, w.wHaze].join();
  let gc = groundCache.get(key);
  if (gc) return gc;
  const S = w.wSeed, G = H - hY, Xc = Wd / 2, riv = M.river, pth = M.path, rows = new Map(), rivRows = new Map();
  const { GR, WT, BK, PT, FL, skyLow, haze } = C;
  const tex = Math.max(0, w.wGrassTex), patches = Math.max(0, w.wPatches), flowers = Math.max(0, w.wFlowers), patchPer = 8;
  const rowF = (yg) => (yg + 0.5 - hY) / G;
  const rivRow = (yg) => {
    let r = rivRows.get(yg);
    if (!r) { const f = rowF(yg), s = scaleAt(Math.max(0, f)); r = riv && f >= riv.fA ? { s, gx: riv.gx(f), hw: M.riverHW * s * clamp((f - riv.fA) / 0.12) ** 0.7 } : { s, gx: 0, hw: 0 }; rivRows.set(yg, r); }
    return r;
  };
  // seen with no camera: is the screen column of world x gxN (near the river's own copy, on a row of scale s) in the water on row yg2?
  const waterAt = (gxN, s, yg2) => { const r = rivRow(yg2); return r.hw > 0.3 && Math.abs(Xc + ((gxN - Xc) * s) / r.s - r.gx) * r.s < r.hw; };
  // the fold lines: depth of fold i at world x
  const foldF = (i, gw) => { const fd = M.folds[i]; return fd.f + fd.amp * fbm1(gw, Tw, Tw / 4, fd.seed, 3); };
  // a fold only runs where its own noise says so: terraces end, they do not cross the whole valley
  const foldOn = (i, gw) => clamp((fbm1(gw, Tw, Tw / 3, M.folds[i].seed + 3, 2) + 0.05) * 8);
  const row = (yg) => {
    if (rows.has(yg)) return rows.get(yg);
    const f = rowF(yg);
    let out = null;
    if (f >= 0) {
      const s = scaleAt(f), z = 1 / s, L = Math.ceil(Tw * s) + 1, arr = new Uint32Array(L), acr = new Float32Array(L).fill(NaN);
      const hzK = clamp(1 - f * 2.4) ** 1.5 * haze, r0 = rivRow(yg), yb = wrap(yg, 4), nearK = clamp((s - 0.3) * 1.4);
      const px0 = pth && f >= pth.fA ? pth.gx(f) : 0, phw = pth ? M.pathHW * s * clamp((f - pth.fA) / 0.18) ** 0.8 : 0;
      for (let tx = 0; tx < L; tx++) {
        const gw = (tx + 0.5) / s, bb = bayer(tx & 3, yb);
        // the meadow: mid green, big soft light patches; terraces darken into a slope in front of each fold
        let Lv = 2;
        const nv = grad2((gw / Tw) * patchPer, z * 2.2, patchPer, S + 800);
        if (nv * patches > 0.22 || (nv * patches > 0.12 && lineDith((nv * patches - 0.12) / 0.1, tx, yg))) Lv = 3;
        else if (nv * patches < -0.42) Lv = 1;
        for (let i = 0; i < M.folds.length; i++) {
          const on = foldOn(i, gw);
          if (on <= 0) continue;
          const dpx = (f - foldF(i, gw)) * G, slopeH = (1.5 + 6 * s) * on; // rows below the fold (>0: on its slope), thinning where it ends
          const tip = 1 + (hash(tx, i, S + 870) % Math.max(2, Math.round(1 + 3 * s))); // grass blades poking up over the edge
          if (on > 0.5 && dpx > -tip && dpx < 0 && (hash(tx, S + 871) & 1)) { Lv = 1; break; }
          if (dpx >= 0 && dpx < slopeH) { Lv = dpx < 1 ? 0 : dpx > slopeH * 0.6 && lineDith((dpx - slopeH * 0.6) / (slopeH * 0.4), tx, yg) ? 2 : 1; break; }
          if (on > 0.5 && dpx <= -tip && dpx > -tip - 1.2 && s > 0.35) { Lv = Math.max(Lv, 3); break; } // the lit lip of the terrace
        }
        let c = GR[Lv];
        // grass marks: little strands in small groups, lighter on the mid green, darker on the light patches
        const cw = 4, ch = Math.max(3, Math.round(6 * s)), cx = Math.floor(tx / cw), cy = Math.floor(yg / ch);
        if (h01(cx, cy, S + 820) < 0.5 * tex * nearK && Lv >= 2) {
          const ox = hash(cx, cy, S + 821) % cw, len = 2 + (hash(cx, cy, S + 822) % Math.max(1, Math.round(1 + 2 * s))), row0 = (cy + 1) * ch - 1 - (yg);
          if ((tx % cw === ox && row0 < len) || (tx % cw === ox + 1 && row0 < len - 1)) c = Lv === 3 ? GR[2] : GR[3];
        }
        // flowers: clusters of one colour
        if (flowers > 0 && f > 0.15 && Lv >= 2) {
          const fx = Math.floor(tx / 9), fy = Math.floor(yg / 6);
          if (h01(fx, fy, S + 830) < 0.16 * flowers * nearK) {
            const fc = FL[hash(fx, fy, S + 831) & 3];
            for (let k = 0; k < 5; k++) { const hx = fx * 9 + (hash(fx, fy, k, S + 832) % 9), hy = fy * 6 + (hash(fx, fy, k, S + 833) % 6); if (hx === tx && hy === yg) c = fc; }
          }
        }
        // the path: packed earth, a darker rim and a grass fringe, a few pebbles
        if (pth && phw > 0.4) {
          const d = Math.abs(wrapS(gw - px0, Tw)) * s;
          if (d < phw) {
            const e = d / phw, pb = h01(tx, yg, S + 840);
            c = e > 0.86 ? ((hash(tx, S + 841) & 3) === 0 ? GR[2] : PT[0]) : e > 0.7 ? PT[1] : pb < 0.03 ? PT[0] : pb > 0.97 ? PT[3] : PT[2];
          }
        }
        // the river: the far bank in earth, the water's dark rim, its body and light middle (flow lines each frame),
        // grass overhanging the near bank
        if (r0.hw > 0.3) {
          const dd = wrapS(gw - r0.gx, Tw) * s, d = Math.abs(dd), gxN = r0.gx + dd / s;
          if (d < r0.hw) {
            const bankH = Math.max(1, Math.round(3 * s));
            let up = 0;
            while (up < bankH + 2 && waterAt(gxN, s, yg - up - 1)) up++;
            let down = 0;
            while (down < 3 && waterAt(gxN, s, yg + down + 1)) down++;
            const lip = 1 + (hash(tx, S + 851) % Math.max(1, Math.round(1 + 2 * s)));
            if (up < bankH) c = up === bankH - 1 || bankH === 1 ? BK[0] : up === 0 ? BK[2] : BK[1];
            else if (down < lip && s > 0.3) c = down === lip - 1 ? GR[1] : GR[3];
            else if (up < bankH + 1 || d > r0.hw * 0.86) c = WT[0];
            else { c = d < r0.hw * 0.38 ? WT[2] : WT[1]; acr[tx] = dd / r0.hw; }
          }
        }
        // far away, the ground fades into the haze in bands
        if (hzK > 0.02) { const k = Math.round(hzK * 4) / 4; c = mix(c, skyLow, k * 0.8); }
        arr[tx] = c;
      }
      out = { s, z, arr, acr, hw: r0.hw };
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
 * It is drawn with pixels wPix cells wide (chunky pixel art) and blown up. Returns { col, lit } like renderWorld.
 */
export function renderValley(w, wt, P, T, X0, Y0, bw, bh, cam = [0, 0], dims = [T, Math.round((T * 9) / 16)]) {
  const p = clamp(whole(w.wPix, 1), 1, 4);
  if (p === 1) return valley(w, wt, P, T, X0, Y0, bw, bh, cam, dims);
  const cx0 = Math.floor(X0 / p), cy0 = Math.floor(Y0 / p), cbw = Math.ceil((X0 + bw) / p) - cx0, cbh = Math.ceil((Y0 + bh) / p) - cy0;
  const r = valley(w, wt, P, Math.max(16, Math.round(T / p)), cx0, cy0, cbw, cbh, [cam[0] / p, cam[1] / p], [Math.ceil(dims[0] / p), Math.ceil(dims[1] / p)]);
  const col = new Uint32Array(bw * bh), lit = new Float32Array(bw * bh * 3);
  for (let y = 0; y < bh; y++) {
    const ry = (Math.floor((Y0 + y) / p) - cy0) * cbw;
    for (let x = 0; x < bw; x++) {
      const i = ry + Math.floor((X0 + x) / p) - cx0, o = y * bw + x;
      col[o] = r.col[i]; lit[o * 3] = r.lit[i * 3]; lit[o * 3 + 1] = r.lit[i * 3 + 1]; lit[o * 3 + 2] = r.lit[i * 3 + 2];
    }
  }
  return { col, lit };
}

function valley(w, wt, P, T, X0, Y0, bw, bh, cam, dims) {
  const n = bw * bh, col = new Uint32Array(n), lit = new Float32Array(n * 3);
  const H = Math.max(16, dims[1]), Wd = Math.max(16, dims[0]), Xc = Wd / 2, u = (((wt / P) % 1) + 1) % 1, S = w.wSeed;
  const Tw = 2 * T, hY = (H * clamp(w.wHorizon, 20, 75)) / 100, G = H - hY, par = Math.max(0, w.wParallax), loops = whole(w.wLoops, 1);
  const dirX = Math.sign((DIRS[w.wDir] || DIRS.left)[0]) || -1, moving = w.wState === "moving" && w.wDrift > 0;
  const tilesOf = (depth) => (moving ? (w.wAllMove && depth >= 0.25 ? Math.max(1, whole(w.wDrift * depth)) : whole(w.wDrift * depth)) : 0);
  // far layers: whole tiles of T a loop (plus the wind's own), and the camera
  const shift = (depth, wind = 0) => [Math.round(u * (tilesOf(depth) * dirX + wind) * T) - Math.round(cam[0] * depth * par), -Math.round(cam[1] * depth * par)];
  // the ground: k whole tiles of Tw a loop; a row of scale s moves k Tw s pixels, the camera moves it cam * s
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
  const copiesT = (x, ox, m, fn) => { const x0 = wrap(Math.round(x) + ox - X0, T); for (let xx = x0 - T; xx < bw + m; xx += T) if (xx > -m) fn(xx); };
  const M = mapOf(w, Tw, Wd, H);
  const gust = whole(w.wGust), sway = Math.max(0, w.wSway);
  const windAt = (lx, ph = 0) => (gust ? Math.sin(TAU * (u * gust - (lx / Tw) * 4 + ph)) * 0.6 + Math.sin(TAU * (u * gust * 2 - (lx / Tw) * 9 + ph * 2)) * 0.25 : 0);

  // ---- colours: short ramps, from an outline tone to a highlight
  const skyTop = hex(w.wSkyTop), skyLow = hex(w.wSkyLow), haze = clamp(w.wHaze, 0, 1);
  const hz = (c, k) => mix(c, skyLow, clamp(k * haze));
  const gD = hex(w.wGrassDark), gL = hex(w.wGrassLight), GR = [mix(gD, BLACK, 0.3), gD, mix(gD, gL, 0.55), gL, mix(gL, hex("#f0ff9a"), 0.45)];
  const lD = hex(w.wLeafDark), lL = hex(w.wLeafLight), LEAF = [mix(lD, BLACK, 0.55), lD, mix(lD, lL, 0.45), lL, mix(lL, hex("#e8ff9a"), 0.45)];
  const trunk = hex(w.wTrunk), TR = [mix(trunk, BLACK, 0.62), mix(trunk, BLACK, 0.3), trunk, mix(trunk, hex("#f0c890"), 0.3)];
  const rockC = hex(w.wRockCol), RK = [mix(rockC, hex("#1c140e"), 0.8), mix(rockC, hex("#1c140e"), 0.5), mix(rockC, hex("#1c140e"), 0.25), rockC, mix(rockC, hex("#fff4e0"), 0.32), mix(rockC, hex("#fff4e0"), 0.58)];
  const water = hex(w.wWaterCol), wLight = hex(w.wWaterLight), WT = [mix(water, hex("#0a2a70"), 0.35), water, mix(water, wLight, 0.45), wLight, mix(wLight, WHITE, 0.75)];
  const bank = hex(w.wBankCol), BK = [mix(bank, BLACK, 0.5), bank, mix(bank, hex("#f0c890"), 0.3)];
  const pathC = hex(w.wPathCol), PT = [mix(pathC, BLACK, 0.35), mix(pathC, BLACK, 0.12), pathC, mix(pathC, WHITE, 0.3)];
  const FL = [hex(w.wFlowerA), hex(w.wFlowerB), hex(w.wFlowerC), WHITE];

  // ---- the sky, in bands joined by line dithering
  const steps = Math.max(2, whole(w.wSkySteps, 2)), dith = clamp(w.wSkyDither, 0, 1.5), oyS = -Math.round(cam[1] * 0.04 * par);
  const SKY = Array.from({ length: steps + 1 }, (_, L) => mix(skyTop, skyLow, L / steps));
  for (let y = 0; y < bh; y++) {
    const sy = Y0 + y - oyS, v = clamp(sy / Math.max(1, hY)) ** 1.25 * steps, L = Math.min(steps, Math.floor(v)), fr = v - L;
    for (let x = 0; x < bw; x++) col[y * bw + x] = SKY[Math.min(steps, L + (dith > 0 && fr > 1 - 0.45 * dith && lineDith((fr - 1 + 0.45 * dith) / (0.45 * dith), X0 + x, sy) ? 1 : 0))];
  }
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
        if (d < R - 1) put(x, y, d < R * 0.65 ? WHITE : mix(sunC, WHITE, 0.4));
        else if (d < R) put(x, y, sunC);
        else if (halo > 0) {
          const r1 = R * (1 + 0.8 * halo), r2 = R * (1 + 2.2 * halo);
          if (d < r1 || (d < r1 + 1 && lineDith(0.5, x + X0, y + Y0))) put(x, y, mix(get(x, y), WHITE, 0.45));
          else if (d < r2 || (d < r2 + 1.5 && lineDith(0.5, x + X0, y + Y0))) put(x, y, mix(get(x, y), WHITE, 0.2));
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
    glowAt(Math.floor(scx), Math.floor(scy), R * (w.wSun === "sun" ? 4 : 3), sunC, (w.wSun === "sun" ? 0.45 : 0.35) * w.wSunGlow);
  }

  // ---- birds
  if (w.wBirds > 0) {
    const dark = mix(skyTop, BLACK, 0.6), sh = [-Math.round(cam[0] * 0.2 * par), -Math.round(cam[1] * 0.2 * par)];
    cycle(wt, P, whole(w.wBirds), S * 13 + 5, (g) => g.range(0.35, 0.55) * P, (age, life, g) => {
      const k = age / life, way = g.next() < 0.5 ? -1 : 1, y0 = g.range(H * 0.08, hY * 0.6), span = Wd + 40, flock = 1 + Math.floor(g.next() * 3);
      for (let b = 0; b < flock; b++) {
        const x = Math.round((way > 0 ? -20 + span * k : Wd + 20 - span * k) - b * 6 * way + sh[0] - X0), y = Math.round(y0 + b * 3 + Math.sin(TAU * k * 2 + b) * 2 - Y0 + sh[1]);
        const flap = Math.floor(age * 7 + b * 0.5) % 3, wy = flap === 0 ? -1 : flap === 1 ? 0 : 1;
        put(x, y, dark); put(x - 1, y + (wy < 0 ? -1 : 0), dark); put(x + 1, y + (wy < 0 ? -1 : 0), dark); put(x - 2, y + wy, dark); put(x + 2, y + wy, dark);
      }
    });
  }

  // ---- cumulus: white crowns, a soft blue-grey belly in bands joined by line dithering, a flat base; low ones hazy
  {
    const cw = Math.round(w.wCloudWind || 0), morph = whole(w.wCloudMorph), cC = hex(w.wCloudCol), cS = hex(w.wCloudShade);
    for (const c of M.clouds) {
      const [ox, oy] = shift(c.low ? 0.08 : 0.05, cw), hk = c.low ? 0.45 : 0;
      const T4 = [hz(cC, hk), hz(mix(cC, cS, 0.35), hk), hz(cS, hk), hz(mix(cS, skyTop, 0.3), hk)];
      const rs = c.puffs.map((pf) => pf.r * (1 + (morph ? 0.06 * Math.sin(TAU * (u * morph + pf.ph)) : 0)));
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
            c.puffs.forEach((pf, j) => { const dx = px - (cx + pf.dx), dy = py - (cy + pf.dy), r = rs[j]; if (dx * dx + dy * dy < r * r) best = Math.min(best, (dy + dx * 0.3) / r); });
            if (best > 2) continue;
            // the belly darkens towards the flat base
            const v = clamp((best + 0.55) / 1.4) * 3 + clamp(1 - (cy - py) / (c.size * 0.6)) * 0.9, L = Math.min(3, Math.floor(v)), fr = v - L;
            put(x, y, T4[Math.min(3, L + (fr > 0.7 && lineDith((fr - 0.7) / 0.3, x + X0, y + Y0) ? 1 : 0))]);
          }
        }
      });
    }
  }

  // ---- mountains: two ranges, the far one paler; ridged noise, lit and shaded faces, a little snow
  const range = (depth, hFrac, base0, seed, hzK, snowK) => {
    const [ox, oy] = shift(depth), mh = H * hFrac * w.wMount;
    if (mh < 1) return;
    const base = hz(base0, hzK), litC = hz(mix(base0, WHITE, 0.22), hzK), shade = hz(mix(base0, hex("#203060"), 0.25), hzK * 0.8);
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
        const sn = w.wSnow > 0 && sy < snowLine + fbm1(lx, T, 12, S + seed + 20, 1) * 4;
        let c = sn ? (slope < -0.6 ? snowSh : snow) : d < 1 && slope > -0.6 ? litC : slope > 0.6 ? litC : slope < -0.6 ? shade : base;
        const foot = (sy - (hY + oy - mh * 0.4)) / (mh * 0.4);
        if (foot > 0 && lineDith(foot, X0 + x, sy)) c = mix(c, skyLow, 0.35);
        put(x, y, c);
      }
    }
  };
  if (w.wMount > 0) {
    const mc = hex(w.wMountCol);
    range(0.08, 0.15, mix(mc, skyLow, 0.18), 500, 0.35, 0.9);
    range(0.13, 0.09, mc, 540, 0.12, 0.4);
  }

  // ---- hills: soft green swells at the horizon, then far woods (round crowns, lit on their left)
  if (w.wHills > 0) {
    const [ox, oy] = shift(0.2), hh = H * 0.06 * w.wHills, base = hz(GR[2], 0.65), rim = hz(GR[3], 0.55);
    for (let x = 0; x < bw; x++) {
      const lx = X0 + x - ox, t = Math.round(hY - hh * (0.2 + 0.8 * (fbm1(lx, T, T / 3.5, S + 600, 3) * 0.5 + 0.5)) + 1) + oy;
      for (let y = Math.max(0, t - Y0); y < bh; y++) { const sy = y + Y0; if (sy > hY + oy + 30) break; put(x, y, sy - t < 1 ? rim : base); }
    }
  }
  if (w.wForest > 0) {
    const [ox, oy] = shift(0.28), fc = hex(w.wForestCol), base = hz(fc, 0.42), lite = hz(mix(fc, GR[3], 0.5), 0.38), dark = hz(mix(fc, BLACK, 0.35), 0.42), fh = H * 0.032 * w.wForest;
    const nC = Math.max(4, Math.round(T / Math.max(3, H * 0.02))), cw = T / nC, c0 = Math.floor((X0 - ox) / cw) - 3, c1 = Math.ceil((X0 + bw - ox) / cw) + 3, crowns = [];
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
      for (let y = Math.max(0, ti - Y0); y < bh; y++) { const sy = y + Y0, d = sy - ti; if (sy > hY + oy + 30) break; put(x, y, d < 1 && dxr < 0.3 ? lite : dxr > 0.35 && d < rr * 0.9 ? dark : base); }
    }
  }

  // ---- the ground in perspective: each row is a depth. What does not move on it is worked out once per row and
  // kept, over one whole tile of the row; each frame only reads it and adds the river's flow lines.
  const shimmer = Math.max(0, w.wShimmer), flowN = Math.max(1, Math.round(Math.max(0.1, w.wFlow) * loops / 3)), RIP = 60;
  const GC = groundOf(w, M, Tw, Wd, H, hY, { GR, WT, BK, PT, FL, skyLow, haze });
  const LANES = [-0.62, -0.3, 0.02, 0.34, 0.6];
  for (let y = 0; y < bh; y++) {
    const yg = Y0 + y - oyG, row = GC.row(yg);
    if (!row) continue;
    const { s, arr, acr } = row, L = arr.length, q = row.z * 22 + u * flowN * RIP, cell = Math.floor(q), base = Xc - Xc / s - shiftW, hwp = row.hw;
    for (let x = 0; x < bw; x++) {
      const gx = (X0 + x + 0.5) / s + base;
      let tx = Math.floor((gx - Math.floor(gx / Tw) * Tw) * s);
      if (tx >= L) tx = L - 1;
      let c = arr[tx];
      const a = acr[tx];
      if (a === a && hwp > 3) { // open water: thin flow lines along the river, in segments that run towards us
        for (let li = 0; li < LANES.length; li++) {
          if (Math.abs((a - LANES[li]) * hwp) >= 0.5) continue;
          const seg = Math.floor((cell + li * 7) / 3), on = h01(wrap(seg, RIP / 3), li, S + 861);
          if (on < 0.42 * shimmer) { c = on < 0.12 * shimmer ? WT[4] : WT[3]; if (on < 0.12 * shimmer) addLight(x, y, wLight, 0.1 * shimmer); }
          break;
        }
      }
      col[y * bw + x] = c;
    }
  }

  // ---- things on the ground, far ones first; each at its depth, sized by it, sliding with its row. Each is drawn
  // once into a sprite and kept: only the oaks' crowns move, row by row, in the gusts.
  const csig = [w.wLeafDark, w.wLeafLight, w.wTrunk, w.wRockCol, w.wSkyLow, w.wHaze].join();
  const onScreen = [];
  for (const it of M.items) {
    const s = scaleAt(it.f), sy = Math.round(hY + it.f * G + oyG - Y0), per = Tw * s, half = it.size * s * 0.9 + 4;
    const x0 = wrap(Xc + (it.gx + shiftW - Xc) * s - X0, per);
    for (let xx = x0 - per; xx < bw + half; xx += per) if (xx > -half && sy - it.size * s * 1.1 < bh && sy - 6 < bh && sy + 8 > 0) onScreen.push({ it, x: Math.round(xx), y: sy, s });
  }
  onScreen.sort((a, b) => a.it.f - b.it.f);
  const blit = (sp, cx, by, rowShift) => { const { xs, ys, cs, n } = sp; for (let i = 0; i < n; i++) put(cx + xs[i] + (rowShift ? rowShift(ys[i]) : 0), by + ys[i], cs[i]); };
  for (const o of onScreen) {
    const it = o.it, k = it.kind, hzK = Math.round(clamp(1 - it.f * 2.4) ** 2 * 0.55 * 4) / 4, sz = it.size * o.s, key = `${k}|${it.seed}|${sz.toFixed(2)}|${hzK}|${csig}`;
    if (k === "oak") {
      shadow(o.x + sz * 0.04, o.y, sz * it.shape.wide * 0.9, 0.55);
      blit(spriteOf(key + "|t", (pp) => oakTrunk(pp, sz, it, hzK)), o.x, o.y);
      const wv = windAt(it.gx, it.seed * 0.001) * sway * sz * 0.014, rows = new Map();
      blit(spriteOf(key + "|c", (pp) => oakCrown(pp, sz, it, hzK)), o.x, o.y, (yy) => { let v = rows.get(yy); if (v === undefined) rows.set(yy, (v = Math.round(wv * clamp(-yy / sz - 0.4) * 2))); return v; });
    } else if (k === "bush") { shadow(o.x, o.y, sz * 0.55, 0.5); blit(spriteOf(key, (pp) => bush(pp, sz, it.seed, hzK)), o.x, o.y); }
    else if (k === "stone") { shadow(o.x, o.y, sz * 0.7, 0.4); blit(spriteOf(key, (pp) => block(pp, 0, 0, sz * 0.5, sz * 0.32, blockOf(it.seed), hzK, true)), o.x, o.y); }
    else if (k === "pile") { shadow(o.x + sz * 0.06, o.y + 1, sz * 0.85, 0.55); blit(spriteOf(key, (pp) => pile(pp, sz, it, hzK)), o.x, o.y); }
    else if (k === "tuft") tuft(o.x, o.y, sz, it.seed);
  }

  // a shadow on the grass: one darker tone, flat
  function shadow(cx, cy, rx, k) {
    const ry = Math.max(1, rx * 0.18);
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      if (y < 0 || y >= bh) continue;
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy < 1) put(x, y, mix(get(x, y), GR[0], k));
      }
    }
  }
  // an oak's trunk: flared roots, lit on its left, bark streaks, a dark outline; branches up into the crown
  function oakTrunk(pp, h, it, hzK) {
    const sh = it.shape, tr = TR.map((c) => hz(c, hzK)), tw = sh.trunkW * h, top = -h * 0.56, pts = new Map();
    const mark = (x, y, c) => pts.set(x + "," + y, [x, y, c]);
    for (let y = Math.floor(top); y < 0; y++) {
      const k = -y / -top, half = (tw / 2) * (1 + 1.3 * Math.max(0, 1 - k * 4.5) ** 2) * (1 - 0.2 * k), mid = sh.lean * h * k * 4;
      for (let x = Math.floor(mid - half); x <= Math.ceil(mid + half); x++) {
        const e = (x + 0.5 - mid) / half;
        if (Math.abs(e) > 1) continue;
        let L = e < -0.4 ? 3 : e > 0.45 ? 1 : 2;
        if (h01(x, Math.floor(y / 4), it.seed) < 0.22) L = Math.max(1, L - 1); // bark streaks
        mark(x, y, tr[L]);
      }
    }
    // branches: tapering strokes forking from the top of the trunk to the pads
    for (const b of sh.branches) {
      const x0 = sh.lean * h * 4, x1 = b.x * h, y1 = b.y * h, n = Math.ceil(Math.hypot(x1 - x0, y1 - top) * 1.5), th = Math.max(1, tw * 0.32);
      for (let i = 0; i <= n; i++) {
        const k = i / n, px = x0 + (x1 - x0) * k, py = top + 3 + (y1 - top - 3) * k - Math.sin(k * Math.PI) * h * 0.03, r = th * (1 - k * 0.55);
        for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) mark(Math.round(px + dx), Math.round(py), dx < 0 ? tr[2] : tr[1]);
      }
    }
    // the outline: every empty neighbour of the wood gets the darkest tone
    const out = new Map();
    for (const [x, y] of pts.values()) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = (x + dx) + "," + (y + dy); if (!pts.has(q) && y + dy < 0) out.set(q, [x + dx, y + dy]); }
    for (const [x, y] of out.values()) pp(x, y, tr[0]);
    for (const [x, y, c] of pts.values()) pp(x, y, c);
  }
  // an oak's crown: pads of leaves, each with a scalloped top, a lit band, a body with leaf marks and a dark
  // underside; the crown's silhouette and each pad's lower edge get a dark outline
  function oakCrown(pp, h, it, hzK) {
    const pads = it.shape.pads, tones = LEAF.map((c) => hz(c, hzK)), bumps = (pd, ax) => 1 + 0.26 * Math.abs(Math.sin(ax * pd.k * 0.45 + pd.ph));
    const inPad = (pd, px, py) => {
      const dx = (px / h - pd.x) / pd.rx;
      if (Math.abs(dx) >= 1) return false;
      const dy = py / h - pd.y, e = Math.sqrt(1 - dx * dx);
      return dy < 0 ? -dy < pd.ryT * e * bumps(pd, dx) : dy < pd.ryB * Math.sqrt(e);
    };
    const hit = (px, py) => { for (let i = pads.length - 1; i >= 0; i--) if (inPad(pads[i], px, py)) return i; return -1; };
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const pd of pads) { x0 = Math.min(x0, pd.x - pd.rx); x1 = Math.max(x1, pd.x + pd.rx); y0 = Math.min(y0, pd.y - pd.ryT * 1.2); y1 = Math.max(y1, pd.y + pd.ryB); }
    for (let y = Math.floor(y0 * h - 2); y <= Math.ceil(y1 * h + 2); y++) for (let x = Math.floor(x0 * h - 2); x <= Math.ceil(x1 * h + 2); x++) {
      const px = x + 0.5, py = y + 0.5, i = hit(px, py);
      if (i < 0) { // the outline round the whole crown
        if (hit(px + 1, py) >= 0 || hit(px - 1, py) >= 0 || hit(px, py + 1) >= 0 || hit(px, py - 1) >= 0) pp(x, y, tones[0]);
        continue;
      }
      const pd = pads[i], dx = (px / h - pd.x) / pd.rx, e = Math.sqrt(Math.max(0, 1 - dx * dx)), top = pd.y - pd.ryT * e, bot = pd.y + pd.ryB * Math.sqrt(e);
      const t = (py / h - top) / Math.max(1e-3, bot - top); // 0 at the pad's top, 1 at its bottom
      const deep = clamp((pd.y - y0) / Math.max(1e-3, y1 - y0)) * 0.5 + pd.x * 0.6; // lower and righter pads sit in more shade
      let L = t < 0.28 - deep * 0.2 ? 3 : t < 0.62 - deep * 0.25 ? 2 : 1;
      if (dx < -0.6 && L === 2) L = 3; // the lit left side
      if (dx > 0.55 && L >= 2) L--; // the shaded right side
      if (hit(px, py - 1) !== i && t < 0.4) L = deep > 0.45 ? 3 : 4; // the lit rim on top
      const below = hit(px, py + 1);
      if (below !== i && below < i) L = 0; // the dark lower edge of a pad, over the ones behind it
      // leaf marks: short dashes on a brick grid, a tone lighter in the light, a tone darker in the shade
      const cy = Math.floor(y / 3), cx = Math.floor((x + (cy & 1) * 2) / 4), m = h01(cx, cy, it.seed + 3), inCell = (x + (cy & 1) * 2) % 4, rowIn = y % 3;
      if (L >= 1 && L <= 3 && m < 0.35 && rowIn === 1 && inCell < 2) L = L === 3 ? 4 : L === 2 ? (m < 0.17 ? 3 : 1) : 2;
      pp(x, y, tones[L]);
    }
  }
  function bush(pp, sz, seed, hzK) {
    const g = rng(seed, 4), n = 3 + g.int(0, 2), pads = [];
    for (let i = 0; i < n; i++) { const f = n === 1 ? 0.5 : i / (n - 1); pads.push({ x: (f - 0.5) * 0.7 + g.range(-0.05, 0.05), y: -0.28 - Math.sin(f * Math.PI) * 0.18, rx: g.range(0.28, 0.36), ryT: g.range(0.2, 0.26), ryB: 0.24, ph: g.range(0, TAU), k: 7 }); }
    pads.push({ x: g.range(-0.08, 0.08), y: -0.52, rx: 0.3, ryT: 0.24, ryB: 0.2, ph: g.range(0, TAU), k: 7 });
    pads.sort((p, q) => p.y - q.y);
    oakCrown(pp, sz, { shape: { pads }, seed }, hzK);
  }
  // a block of stone: a convex shape with rounded corners and a dark outline; a lit rim along its top-left edge;
  // a top face; the sides as flat facets, each one tone by the way it faces (lit top-left, dark bottom-right); cracks
  function block(pp, cx, by, rx, ry, b, hzK, flat) {
    const tones = RK.map((c) => hz(c, hzK)), cy = by - ry, k = 0.05, unit = 1 / Math.max(rx, ry), n = b.edges.length;
    const sdf = (px, py) => {
      const ux = (px - cx) / rx, uy = (py - cy) / ry;
      let sum = 0;
      for (const e of b.edges) sum += Math.exp((e.nx * ux + e.ny * uy - e.c) / k);
      let d = k * Math.log(sum);
      if (flat && py > by - 0.5) d = Math.max(d, 0.01);
      return d;
    };
    const tp = b.pts.map(([x, y]) => [b.top.x + x * b.top.k, b.top.y + y * b.top.k]);
    const inTop = (ux, uy) => { for (let i = 0; i < n; i++) { const [ax, ay] = tp[i], [bx, by2] = tp[(i + 1) % n]; if ((bx - ax) * (uy - ay) - (by2 - ay) * (ux - ax) > 0) return false; } return true; };
    const toneOf = (e) => { const v = -e.nx * 0.6 - e.ny * 0.8 + b.tone; return v > 0.3 ? 4 : v > -0.15 ? 3 : v > -0.6 ? 2 : 1; };
    for (let y = Math.floor(cy - ry - 2); y <= Math.ceil(by + 1); y++) for (let x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x++) {
      const px = x + 0.5, py = y + 0.5, d = sdf(px, py);
      if (d >= 0) continue;
      const ux = (px - cx) / rx, uy = (py - cy) / ry;
      let L;
      if (d > -unit * 1.05) L = 0;
      else if (inTop(ux, uy)) L = 4;
      else {
        // the facet: the side whose middle is closest in angle, seen from the top face's centre
        const a = Math.atan2(uy - b.top.y, ux - b.top.x);
        let best = 0, bd = 9;
        for (let i = 0; i < n; i++) { const dd = Math.abs(wrapS(b.edges[i].mid - a, TAU)); if (dd < bd) { bd = dd; best = i; } }
        L = toneOf(b.edges[best]);
        if (d > -unit * 2.1 && L >= 3) L = 5; // the lit rim
      }
      if (L >= 2 && h01(x, y, 91) < 0.05) L--; // grain
      pp(x, y, tones[L]);
    }
    for (const cr of b.cracks) {
      if (rx < 7) break;
      const sx = cx + Math.cos(cr.a) * rx * 0.85, sy = cy + Math.sin(cr.a) * ry * 0.85, nn = Math.ceil(cr.len * Math.max(rx, ry));
      for (let i = 0; i < nn; i++) {
        const t = i / nn, a = cr.a + Math.PI + cr.bend * t, x = Math.round(sx + Math.cos(a) * i), y = Math.round(sy + Math.sin(a) * i * (ry / rx));
        if (sdf(x + 0.5, y + 0.5) < -unit * 2) { pp(x, y, tones[1]); pp(x + 1, y, tones[3]); }
      }
    }
  }
  function pile(pp, sz, it, hzK) {
    for (const r of it.rocks) block(pp, r.x * sz, r.y * sz * 0.3 - (r.lift ? r.lift * sz : 0), r.r * sz, r.h * sz * 0.5, blockOf(r.seed), hzK, !r.lift);
  }
  // a tuft of tall grass: a fan of blades bending in the gusts, dark at the foot, light at the tips
  function tuft(cx, by, sz, seed) {
    const g = rng(seed, 6), n = 4 + g.int(0, 3), bend0 = windAt(cx, seed * 0.001) * sway * 0.35;
    for (let i = 0; i < n; i++) {
      const lean = (i / (n - 1) - 0.5) * 0.9 + g.range(-0.15, 0.15), len = sz * g.range(0.55, 1), dark = g.next() < 0.35, bx = cx + g.range(-0.2, 0.2) * sz;
      for (let j = 0; j < len; j++) { const f = j / len, xx = Math.round(bx + (lean + bend0) * len * f * f), yy = Math.floor(by - j); put(xx, yy, dark ? (f > 0.6 ? GR[2] : GR[0]) : f > 0.7 ? GR[4] : f > 0.35 ? GR[3] : GR[1]); }
    }
  }

  // ---- tall grass along the bottom edge, in clumps, bending with the gusts
  if (w.wBlades > 0 && w.wGrassH > 0) {
    const sNear = scaleAt(1), per = Tw * sNear, hb = (H * w.wGrassH) / 100, dens = clamp(w.wBlades, 0, 2), by = Math.round(hY + G + oyG) - Y0;
    for (let x = -6; x < bw + 6; x++) {
      const lx = wrap(X0 + x - Xc - (shiftW - Xc) * sNear, per), li = Math.floor(lx), r = h01(li, S, 400);
      const side = Math.abs((X0 + x) / Wd - 0.5) * 2, clump = fbm1(lx, per, per / 14, S + 410, 2) + side * 0.5 - 0.2;
      if (clump < 0 || r > 0.45 * dens) continue;
      const len = hb * (0.3 + 0.7 * h01(li, S, 401)) * clamp(clump * 2.5, 0.3, 1.2), lean = (h01(li, S, 402) - 0.5) * 0.6, bend = windAt(li * 2, 0.1) * sway * 0.5 + lean, dark = r < 0.15 * dens;
      for (let i = 0; i < len; i++) {
        const f = i / len, xx = Math.round(x + bend * len * f * f), yy = by - i - 1;
        put(xx, yy, dark ? (f > 0.7 ? GR[1] : GR[0]) : f > 0.75 ? GR[4] : f > 0.4 ? GR[3] : GR[2]);
      }
    }
  }

  // ---- floating motes: pollen by day, fireflies by night
  if (M.motes.length) {
    const [ox, oy] = shift(0.9), mc = hex(w.wMoteCol);
    for (const m of M.motes) {
      const mx = m.x + m.ax * Math.sin(TAU * (u * m.kx + m.ph)), my = m.y + m.ay * Math.sin(TAU * (u * m.ky + m.ph2)), v = 0.55 + 0.45 * Math.sin(TAU * (u * m.kb * 2 + m.ph));
      copiesT(mx, ox, 3, (x) => { const y = Math.round(my) + oy - Y0; put(x, y, v > 0.7 ? mix(mc, WHITE, 0.5) : mix(get(x, y), mc, 0.4 + 0.5 * v)); glowAt(x, y, 2, mc, 0.3 * v); });
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
