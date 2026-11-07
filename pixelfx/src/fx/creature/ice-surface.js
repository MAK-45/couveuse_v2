// Planet surfaces: worlds seen from the ground (tab Surface planète). The first one is a plain: a sky in hard bands,
// a sun or a moon, clouds in two layers, far mountains with snow, rolling hills, then meadows in three depths with
// lakes and ponds, trees (round or pines), rocks, flowers, and tall grass in front that bends in the wind.
//
// Like every world it has two states. Still (wState "still"): it lives in place (grass and trees sway in gusts,
// clouds go by in the wind, water shimmers, pollen floats, birds fly over) but the ground does not travel. Moving
// ("moving"): the ground also goes by at wDrift, each layer at its own depth, so the near grass rushes past while
// the mountains hardly move (parallax). A surface only travels sideways: the up/down part of a heading is dropped.
//
// It loops on its own period (wLoops blob loops): layers scroll by whole tiles of the world (the tile is the
// scene's longer side, every layer repeats on it), gusts, sway, shimmer and twinkles run whole turns, birds use
// cycle() on that period. Sizes are in % of the scene's height, so it looks the same whatever the scene's size.
import { clamp, mix, hex, red, green, blue, rng, cycle, hash, TAU, WHITE } from "../../core/index.js";

export const PLAIN = {
  wType: "plain", wSeed: 21, wLoops: 3,
  // sky, sun or moon
  wSkyTop: "#1a4aa6", wSkyLow: "#9fe2f6", wSkySteps: 7, wSkyDither: 1, wStars: 0,
  wSun: "sun", wSunX: 76, wSunY: 18, wSunSize: 4.5, wSunCol: "#fff3c4", wSunGlow: 1,
  // clouds
  wClouds: 7, wCloudSize: 1, wCloudCol: "#f4fbff", wCloudWind: 1, wCloudMorph: 1,
  // relief
  wHorizon: 56, wMount: 1, wMountCol: "#40619f", wSnow: 0.3, wSnowCol: "#eef9ff", wHills: 1, wHaze: 0.55,
  // the ground and its grass
  wGrassDark: "#14472a", wGrassLight: "#8ad64e", wGrassTex: 1, wBlades: 1, wGrassH: 8, wSway: 1, wGust: 2,
  wFlowers: 50, wFlowerA: "#ffe066", wFlowerB: "#ff9ad0",
  // trees, rocks, water
  wTrees: 9, wPines: 0.3, wTreeSize: 24, wTrunk: "#6a4426", wLeafDark: "#16432a", wLeafLight: "#6cc64e",
  wRocks: 6, wRockSize: 7, wRockCol: "#8e98aa", wMoss: 0.4,
  wLake: 0.35, wPonds: 1, wPondSize: 12, wWaterCol: "#3a9be0", wShimmer: 1,
  // little lives: pollen or fireflies, birds
  wMotes: 14, wMoteCol: "#fff8c8", wBirds: 2,
  // the voyage and the camera
  wState: "still", wDrift: 2, wDir: "left", wParallax: 1, wCamX: 0, wCamY: 0,
};
export const SURFACE_DEFAULTS = { plain: PLAIN };
export const SURFACE_TYPES = Object.keys(SURFACE_DEFAULTS);

export const meta = {
  name: "Ice planet surface",
  desc: "A planet's surface from the ground: banded sky, sun or moon, clouds, snowy peaks, meadows in depth with water, trees, rocks and windblown grass, still or in parallax.",
  tags: ["background", "world", "plain", "grass", "trees", "water", "loop", "parallax"],
  size: [320, 180],
  origin: [160, 90],
  duration: 12,
  loop: true,
  fps: 30,
  bg: "black",
  options: { palette: ["#081026", "#102654", "#1a4a90", "#2c7ccc", "#58b6ee", "#9fe0ff", "#dcf8ff", "#ffffff"], seed: 7, duration: 4, ...PLAIN },
};

const DIRS = { none: [0, 0], left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1], upleft: [-1, -1], upright: [1, -1], downleft: [-1, 1], downright: [1, 1] };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];
const wrap = (x, m) => ((x % m) + m) % m;
const whole = (v, lo = 0) => Math.max(lo, Math.round(v));
const h01 = (...n) => (hash(...n) >>> 0) / 4294967296;

// 1D gradient noise (about -1..1) whose lattice repeats every `per` cells; fbm keeps the repeat (whole octaves)
const g1 = (i, s) => (hash(i, s) & 1023) / 511.5 - 1;
function n1(x, per, s) {
  const i = Math.floor(x), f = x - i, a = g1(wrap(i, per), s), b = g1(wrap(i + 1, per), s), k = f * f * f * (f * (f * 6 - 15) + 10);
  return (a * f + (b * (f - 1) - a * f) * k) * 2;
}
/** Noise along a layer: period T (pixels), features about `size` pixels wide. */
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

/**
 * How deep the ground is at row y of a scene H rows high (y from the top), for something standing there: the meadow under
 * it (0.45 far, 0.7 middle, 1 near), so a walker's steps can be matched to the speed that layer goes by. Above the horizon
 * there is no ground: 1.
 */
export function groundDepthAt(w, y, H) {
  const hY = (H * clamp(w.wHorizon, 15, 90)) / 100, G = H - hY, cy = (w.wCamY || 0) * Math.max(0, w.wParallax ?? 1);
  if (y >= hY + 0.5 * G - cy) return 1;
  if (y >= hY + 0.2 * G - 0.7 * cy) return 0.7;
  if (y >= hY - 0.45 * cy) return 0.45;
  return 1;
}

// everything placed on the world, scattered once per layout and kept
const cache = new Map();
function layoutOf(w, T, H) {
  const key = [w.wSeed, T, H, whole(w.wClouds), whole(w.wTrees), whole(w.wRocks), whole(w.wPonds), whole(w.wFlowers), whole(w.wMotes), whole(w.wStars), w.wPines, w.wTreeSize, w.wRockSize, w.wPondSize, w.wCloudSize, w.wHorizon].join();
  if (cache.has(key)) return cache.get(key);
  const S = w.wSeed, hY = (H * clamp(w.wHorizon, 15, 90)) / 100;
  // clouds: a few puffs on a flat bottom; far ones smaller
  const clouds = [0, 1].map((L) => Array.from({ length: Math.max(0, Math.round(whole(w.wClouds) * (L ? 0.45 : 0.55))) }, (_, i) => {
    const g = rng(S, 40 + L, i), size = H * 0.055 * w.wCloudSize * (L ? 1.35 : 0.8) * g.range(0.7, 1.35), n = 3 + Math.floor(g.next() * 4), wide = size * g.range(2.2, 3.4);
    const puffs = Array.from({ length: n }, (_, j) => {
      const f = n === 1 ? 0.5 : j / (n - 1), mid = 1 - Math.abs(f - 0.5) * 1.3;
      return { dx: (f - 0.5) * wide, dy: -size * 0.35 * mid - g.range(0, size * 0.25), r: size * (0.45 + 0.55 * mid) * g.range(0.8, 1.1), ph: g.next() };
    });
    return { x: g.range(0, T), y: g.range(H * 0.07, Math.max(H * 0.1, hY * (L ? 0.62 : 0.78))), puffs, size, wide };
  }));
  // trees in the three meadows: far ones small, near ones big; a share are pines
  const trees = Array.from({ length: whole(w.wTrees) }, (_, i) => {
    const g = rng(S, 50, i), r = g.next(), band = r < 0.45 ? 0 : r < 0.8 ? 1 : 2;
    return { band, x: g.range(0, T), f: g.range(0.15, 0.85), pine: g.next() < w.wPines, h: H * (w.wTreeSize / 100) * [0.38, 0.66, 1][band] * g.range(0.75, 1.2), ph: g.next(), seed: g.int(0, 9999) };
  });
  const rocks = Array.from({ length: whole(w.wRocks) }, (_, i) => {
    const g = rng(S, 60, i), band = g.next() < 0.55 ? 1 : 2;
    return { band, x: g.range(0, T), f: g.range(0.2, 0.9), s: H * (w.wRockSize / 100) * [0.4, 0.65, 1][band] * g.range(0.7, 1.3), seed: g.int(0, 9999), moss: g.next() };
  });
  const ponds = Array.from({ length: whole(w.wPonds) }, (_, i) => {
    const g = rng(S, 70, i);
    return { band: 1, x: g.range(0, T), f: g.range(0.35, 0.65), r: H * (w.wPondSize / 100) * g.range(0.8, 1.2), ph: g.next() };
  });
  const flowers = Array.from({ length: whole(w.wFlowers) }, (_, i) => {
    const g = rng(S, 80, i), r = g.next(), band = r < 0.25 ? 0 : r < 0.6 ? 1 : 2;
    return { band, x: g.range(0, T), f: g.range(0.05, 0.98), b: g.next() < 0.5, ph: g.next() };
  });
  const motes = Array.from({ length: whole(w.wMotes) }, (_, i) => {
    const g = rng(S, 90, i);
    return { x: g.range(0, T), y: g.range(hY - H * 0.12, H * 0.96), ax: g.range(3, 9), ay: g.range(2, 6), kx: 1 + Math.floor(g.next() * 2), ky: 1 + Math.floor(g.next() * 3), ph: g.next(), ph2: g.next(), kb: 1 + Math.floor(g.next() * 3) };
  });
  const stars = Array.from({ length: whole(w.wStars) }, (_, i) => { const g = rng(S, 95, i); return { x: g.range(0, T), y: g.range(0, hY), b: g.next(), ph: g.next(), k: g.next() }; });
  const out = { clouds, trees, rocks, ponds, flowers, motes, stars };
  if (cache.size > 24) cache.clear();
  cache.set(key, out);
  return out;
}

/**
 * The surface seen through a window of the scene: bw x bh cells whose top-left is scene cell (X0, Y0); dims the
 * scene's size in cells (W, H). wt is the world's clock (periodic over P), T the tile, cam the camera's offset.
 * split: someone stands on the ground at scene row split.y; what stands up from the ground nearer to us than that
 * (trees, rocks, flowers, the tall grass) passes in front of them: part "back" leaves those out (only their shadows on
 * the ground), part "front" draws only those, on transparency (col 0 = nothing). Returns { col, lit } like renderWorld.
 */
export function renderSurface(w, wt, P, T, X0, Y0, bw, bh, cam = [0, 0], dims = [T, Math.round((T * 9) / 16)], split = null) {
  const n = bw * bh, col = new Uint32Array(n), lit = new Float32Array(n * 3), front = !!split && split.part === "front", cut = split ? split.y : Infinity;
  const H = Math.max(8, dims[1]), Wd = Math.max(8, dims[0]), u = (((wt / P) % 1) + 1) % 1, S = w.wSeed;
  const hY = (H * clamp(w.wHorizon, 15, 90)) / 100, G = H - hY, par = Math.max(0, w.wParallax);
  const dirX = Math.sign((DIRS[w.wDir] || DIRS.left)[0]), moving = w.wState === "moving" && w.wDrift > 0;
  const tilesOf = (depth) => (moving ? (w.wAllMove && depth >= 0.3 ? Math.max(1, whole(w.wDrift * depth)) : whole(w.wDrift * depth)) : 0);
  // a layer's shift on screen: whole tiles of voyage a loop (plus the wind's own tiles), and the camera
  const shift = (depth, wind = 0) => [Math.round(u * (tilesOf(depth) * dirX + wind) * T) - Math.round(cam[0] * depth * par), -Math.round(cam[1] * depth * par)];
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
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const d = Math.hypot(dx, dy) / r;
      if (d < 1) addLight(x + dx, y + dy, c, (1 - d) * (1 - d) * k);
    }
  };
  // every on-screen copy of a point of a layer (x in layer pixels, wraps on T)
  const copies = (x, [ox], m, fn) => { const x0 = wrap(Math.round(x) + ox - X0, T); for (let xx = x0 - T; xx < bw + m; xx += T) if (xx > -m) fn(xx); };

  // ---- colours
  const skyTop = hex(w.wSkyTop), skyLow = hex(w.wSkyLow), haze = clamp(w.wHaze, 0, 1);
  const hz = (c, k) => mix(c, skyLow, clamp(k * haze));
  const gD = hex(w.wGrassDark), gL = hex(w.wGrassLight), GR = [0, 0.25, 0.5, 0.75, 1].map((k) => mix(gD, gL, k));
  const BANDS = [ // far, middle and near meadows: their depth, where they start (share of the ground) and their colours
    { depth: 0.45, top: 0, wav: 1.2, base: hz(GR[3], 0.5), light: hz(GR[4], 0.5), dark: hz(GR[2], 0.5), rim: hz(GR[4], 0.35) },
    { depth: 0.7, top: 0.2, wav: 2.5, base: hz(GR[2], 0.18), light: hz(GR[3], 0.18), dark: hz(GR[1], 0.18), rim: hz(GR[4], 0.1) },
    { depth: 1, top: 0.5, wav: 3.5, base: GR[1], light: GR[2], dark: GR[0], rim: GR[3] },
  ];
  // where each meadow starts, in its own layer pixels
  const bandTop = (b, lx) => hY + BANDS[b].top * G + (b ? BANDS[b].wav * fbm1(lx, T, T / 5, S + 300 + b * 17, 2) : 0.6 * fbm1(lx, T, T / 9, S + 300, 2));
  const bandAt = (b, lx, f) => { const t0 = bandTop(b, lx), t1 = b < 2 ? bandTop(b + 1, lx) : H; return t0 + 2 + (t1 - t0 - 4) * f; };
  const gust = whole(w.wGust), sway = Math.max(0, w.wSway);
  // the wind: a gust running along the ground, whole turns a loop and whole waves a tile
  const windAt = (lx, ph = 0) => (gust ? Math.sin(TAU * (u * gust - (lx / T) * 3 + ph)) * 0.6 + Math.sin(TAU * (u * gust * 2 - (lx / T) * 7 + ph * 2)) * 0.25 : 0);
  const lay = layoutOf(w, T, H);

  // ---- the sky, in hard bands, dithered between them
  const steps = Math.max(2, whole(w.wSkySteps, 2)), dith = clamp(w.wSkyDither, 0, 1.5);
  const skyRow = (sy, x) => { const f = clamp(sy / Math.max(1, hY)), L = clamp(Math.floor(f * f * 0.5 * steps + f * 0.5 * steps + (bayer(wrap(x, 4), wrap(sy, 4)) - 0.5) * dith), 0, steps); return mix(skyTop, skyLow, L / steps); };
  if (!front) for (let y = 0; y < bh; y++) { const sy = Y0 + y; for (let x = 0; x < bw; x++) col[y * bw + x] = skyRow(sy, X0 + x); }

  // stars, for night skies: fainter near the horizon
  if (lay.stars.length && !front) {
    const sh = shift(0.02), tw = 2;
    for (const s of lay.stars) copies(s.x, sh, 2, (x) => {
      const y = Math.round(s.y) + sh[1] - Y0, v = s.b * 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(TAU * (u * Math.max(1, Math.round(tw * (0.5 + s.k))) + s.ph))), fade = 1 - (s.y / hY) ** 2;
      if (fade <= 0.1) return;
      const c = mix(get(x, y), WHITE, clamp(v * fade * 1.1));
      put(x, y, c);
      if (v > 0.85 && fade > 0.6) { const d = mix(get(x + 1, y), WHITE, 0.35); put(x - 1, y, d); put(x + 1, y, d); put(x, y - 1, d); put(x, y + 1, d); addLight(x, y, WHITE, 0.3); }
    });
  }

  // ---- sun or moon: pinned to the sky
  const sunR = Math.max(1.5, (H * w.wSunSize) / 100), scx = (Wd * w.wSunX) / 100 - X0, scy = (H * w.wSunY) / 100 - Y0, sunC = hex(w.wSunCol);
  if (w.wSun !== "none" && !front) {
    const R = sunR, Rc = Math.ceil(R + 3);
    for (let dy = -Rc; dy <= Rc; dy++) for (let dx = -Rc; dx <= Rc; dx++) {
      const x = Math.floor(scx + dx), y = Math.floor(scy + dy), d = Math.hypot(x + 0.5 - scx, y + 0.5 - scy);
      if (w.wSun === "sun") {
        if (d < R - 1) put(x, y, d < R * 0.55 ? WHITE : sunC);
        else if (d < R) put(x, y, mix(sunC, skyLow, 0.25));
        else if (d < R + 2.5 && bayer(wrap(x, 4), wrap(y, 4)) < 0.5 - (d - R) / 5) put(x, y, mix(get(x, y), sunC, 0.45));
      } else if (d < R) { // a moon: pale disc, a shadow on its right, a few craters
        const sd = Math.hypot(x + 0.5 - (scx + R * 0.55), y + 0.5 - (scy - R * 0.25));
        let c = d < R - 1 ? sunC : mix(sunC, skyTop, 0.2);
        const g = rng(S, 7);
        for (let k = 0; k < 3; k++) { const cx = scx + g.range(-0.5, 0.3) * R, cy = scy + g.range(-0.5, 0.5) * R, cr = R * g.range(0.12, 0.22); if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < cr) c = mix(sunC, skyTop, 0.3); }
        if (sd < R * 0.95) c = mix(c, get(x, y), 0.72);
        put(x, y, c);
      }
    }
    glowAt(Math.floor(scx), Math.floor(scy), R * (w.wSun === "sun" ? 4 : 3), sunC, (w.wSun === "sun" ? 0.55 : 0.35) * w.wSunGlow);
  }

  // ---- birds: little wing strokes crossing the sky, a few a loop
  if (w.wBirds > 0 && !front) {
    const dark = mix(skyTop, hex("#000000"), 0.55), sh = [-Math.round(cam[0] * 0.2 * par), -Math.round(cam[1] * 0.2 * par)]; // they fly on their own: only the camera moves them
    cycle(wt, P, whole(w.wBirds), S * 13 + 5, (g) => g.range(0.35, 0.55) * P, (age, life, g) => {
      const k = age / life, way = g.next() < 0.5 ? -1 : 1, y0 = g.range(H * 0.08, hY * 0.6), span = Wd + 40;
      const flock = 1 + Math.floor(g.next() * 3);
      for (let b = 0; b < flock; b++) {
        const bx = (way > 0 ? -20 + span * k : Wd + 20 - span * k) - b * 7 * way + sh[0] - X0, by = y0 + b * 4 + Math.sin(TAU * k * 2 + b) * 2 - Y0 + sh[1];
        const x = Math.round(bx), y = Math.round(by), flap = Math.floor(age * 7 + b * 0.5) % 3; // wings up, level, down
        put(x, y, dark);
        const wy = flap === 0 ? -1 : flap === 1 ? 0 : 1;
        put(x - 1, y + (wy < 0 ? -1 : 0), dark); put(x + 1, y + (wy < 0 ? -1 : 0), dark);
        put(x - 2, y + wy, dark); put(x + 2, y + wy, dark);
      }
    });
  }

  // ---- clouds: two layers, the wind pushes them by whole tiles a loop
  const cloudC = hex(w.wCloudCol), wind = Math.round(w.wCloudWind || 0), morph = whole(w.wCloudMorph);
  if (!front) lay.clouds.forEach((list, L) => {
    const sh = shift(L ? 0.12 : 0.06, wind);
    const top = L ? cloudC : hz(cloudC, 0.3), mid = mix(top, skyTop, L ? 0.18 : 0.12), low = mix(top, skyTop, L ? 0.36 : 0.26);
    for (const c of list) {
      const rs = c.puffs.map((p) => p.r * (1 + (morph ? 0.07 * Math.sin(TAU * (u * morph + p.ph)) : 0)));
      const half = c.wide / 2 + c.size * 1.2;
      copies(c.x, sh, half + 2, (cx) => {
        const cy = c.y + sh[1] - Y0, y0 = Math.floor(cy - c.size * 1.8), y1 = Math.ceil(cy + 1);
        for (let y = y0; y <= y1; y++) for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
          if (x < 0 || y < 0 || x >= bw || y >= bh) continue;
          const px = x + 0.5, py = y + 0.5;
          if (py > cy + 0.5) continue;
          let best = 9;
          c.puffs.forEach((p, j) => { const dx = px - (cx + p.dx), dy = py - (cy + p.dy), r = rs[j]; if (dx * dx + dy * dy < r * r) best = Math.min(best, dy / r); });
          if (best > 1) continue;
          put(x, y, py > cy - 1.2 ? low : best < -0.15 ? top : best < 0.5 ? mid : low);
        }
      });
    }
  });

  // ---- far mountains: ridged noise, a lit and a shaded side, snow on the peaks
  if (w.wMount > 0 && !front) {
    const sh = shift(0.12), mh = H * 0.24 * w.wMount, base = hz(hex(w.wMountCol), 0.35), litC = hz(mix(hex(w.wMountCol), WHITE, 0.2), 0.3), shade = hz(mix(hex(w.wMountCol), skyTop, 0.4), 0.35);
    const snow = hz(hex(w.wSnowCol), 0.15), snowSh = mix(snow, shade, 0.5), snowLine = hY - mh * (1 - clamp(w.wSnow, 0, 1)) * 0.95;
    const top = (lx) => hY - mh * clamp(0.18 + 0.82 * (fbm1(lx, T, T / 3, S + 500, 4, true) * 0.5 + 0.5)) + 2;
    // the ridge, read once per column (with room on both sides for the slope)
    const M = Math.ceil(mh * 0.7) + 4, ridge = new Float32Array(bw + 2 * M);
    for (let i = 0; i < ridge.length; i++) ridge[i] = top(X0 + i - M - sh[0]);
    const at = (i) => ridge[clamp(i, 0, ridge.length - 1)];
    for (let x = 0; x < bw; x++) {
      const lx = wrap(X0 + x - sh[0], T), t = ridge[x + M] + sh[1];
      for (let y = Math.max(0, Math.floor(t - Y0)); y < bh; y++) {
        const sy = y + Y0, d = sy - t;
        if (sy > hY + sh[1] + 2) break;
        const c0 = x + M - Math.round(d * 0.5), wnd = Math.round(2 + d * 0.5), slope = at(c0 + wnd) - at(c0 - wnd); // > 0: the ridge falls to the right, so it faces the light (read up the slope, so the facets lean)
        const lit2 = slope > 0.6, dk = slope < -0.6;
        const sn = w.wSnow > 0 && sy < snowLine + (bayer(wrap(lx | 0, 4), wrap(sy, 4)) - 0.5) * 3 + fbm1(lx, T, 12, S + 520, 1) * 4;
        let c = sn ? (dk ? snowSh : snow) : d < 1 && !dk ? litC : lit2 ? litC : dk ? shade : base;
        // the foot of the range fades into the haze
        const foot = (sy - (hY + sh[1] - mh * 0.3)) / (mh * 0.3);
        if (foot > 0 && bayer(wrap(lx | 0, 4), wrap(sy, 4)) < foot * 0.75) c = mix(c, skyLow, 0.35);
        put(x, y, c);
      }
    }
  }

  // ---- hills: soft rolling line, a lit rim, little trees on the crest
  if (w.wHills > 0 && !front) {
    const sh = shift(0.3), hh = H * 0.085 * w.wHills, base = hz(GR[2], 0.78), rim = hz(GR[3], 0.7), dark = hz(GR[1], 0.78);
    const top = (lx) => hY - hh * (0.25 + 0.75 * (fbm1(lx, T, T / 4, S + 600, 3) * 0.5 + 0.5)) + 1;
    for (let x = 0; x < bw; x++) {
      const lx = X0 + x - sh[0], t0 = top(lx), lw = wrap(lx, T), cell = Math.floor(lw / 6), fx = lw / 6 - cell, ht = h01(cell, S, 61) < 0.3 ? 2 + h01(cell, S, 62) * 3 : 0;
      const bump = ht * Math.max(0, 1 - ((fx - 0.5) * 2.4) ** 2), t = Math.round(t0 - bump) + sh[1];
      for (let y = Math.max(0, t - Y0); y < bh; y++) {
        const sy = y + Y0;
        if (sy > hY + sh[1] + 3) break;
        put(x, y, sy < t0 + sh[1] - 0.5 ? dark : sy - t < 1 ? rim : base);
      }
    }
  }

  // ---- the meadows, back to front; each with its water, flowers, rocks and trees
  const shimmer = Math.max(0, w.wShimmer), water = hex(w.wWaterCol), wRefl = mix(water, skyLow, 0.55), wDeep = mix(water, skyTop, 0.35);
  const flA = hex(w.wFlowerA), flB = hex(w.wFlowerB), tex = Math.max(0, w.wGrassTex);
  for (let b = 0; b < 3; b++) {
    const B = BANDS[b], sh = shift(B.depth);
    // the ground: rows of short lighter and darker strokes, a lit edge on top and tufts poking out of it
    if (!front) for (let x = 0; x < bw; x++) {
      const lx = wrap(X0 + x - sh[0], T), t = bandTop(b, lx) + sh[1], ti = Math.round(t), li = Math.floor(lx);
      const tuft = h01(li, S, 200 + b) < 0.22 * tex ? 1 + Math.floor(h01(li, S, 210 + b) * (b + 1.6)) : 0;
      for (let y = Math.max(0, ti - tuft - Y0); y < bh; y++) {
        const sy = y + Y0, d = sy - ti;
        if (d < 0) { put(x, y, B.rim); continue; }
        let c = d < 1 ? B.rim : B.base;
        if (d >= 1) {
          const ly = sy - sh[1], seg = Math.floor((li + (ly * 7) % 13) / (3 + b));
          const r = h01(seg, ly, S + b * 7);
          if (r < 0.1 * tex) c = B.light; else if (r > 1 - 0.09 * tex) c = B.dark;
          if (b === 2 && d > G * 0.3 && bayer(wrap(li, 4), wrap(sy, 4)) < clamp((d - G * 0.3) / (G * 0.35))) c = r < 0.08 * tex ? B.base : B.dark; // the foreground grows darker
        }
        put(x, y, c);
      }
    }
    // the lake along the horizon
    if (b === 0 && w.wLake > 0 && !front) {
      const th = 1 - 2 * clamp(w.wLake, 0, 1);
      for (let x = 0; x < bw; x++) {
        const lx = wrap(X0 + x - sh[0], T), v = fbm1(lx, T, T / 3, S + 700, 2) * 1.6;
        if (v <= th) continue;
        const t = Math.round(bandTop(0, lx) + sh[1]) + 1, depthPx = G * 0.11 * Math.sqrt(clamp((v - th) / 0.45)), bot = t + Math.round(depthPx);
        const nearSun = w.wSun !== "none" && Math.abs(x + 0.5 - scx) < sunR * 1.4;
        for (let sy = t; sy <= bot; sy++) {
          const y = sy - Y0, row = sy - t, f = row / Math.max(1, bot - t);
          let c = bot - sy < 1 && depthPx > 2 ? B.dark : f < 0.35 ? wRefl : water;
          const dash = h01(Math.floor((lx + Math.round(2 * Math.sin(TAU * (u * whole(shimmer * 2, 1) + row * 0.37)))) / 3), sy, S + 710) < 0.16 * shimmer;
          if (dash && row > 0) c = mix(c, WHITE, 0.55);
          if (nearSun && row > 0 && (sy + Math.floor(u * whole(shimmer * 6, 1) * 4) + x) % 3 === 0) { c = mix(sunC, WHITE, 0.4); addLight(x, y, sunC, 0.25 * shimmer); }
          put(x, y, c);
        }
      }
    }
    const items = [];
    for (const p of lay.ponds) if (p.band === b) items.push({ k: 0, y: bandAt(b, p.x, p.f), o: p });
    for (const p of lay.flowers) if (p.band === b) items.push({ k: 1, y: bandAt(b, p.x, p.f), o: p });
    for (const p of lay.rocks) if (p.band === b) items.push({ k: 2, y: bandAt(b, p.x, p.f), o: p });
    for (const p of lay.trees) if (p.band === b) items.push({ k: 3, y: bandAt(b, p.x, p.f), o: p });
    items.sort((a, c) => (a.k ? a.y : -1e6 + a.y) - (c.k ? c.y : -1e6 + c.y)); // ponds lie flat, under the rest
    for (const it of items) {
      // (standing up from the ground nearer to us than the one standing there: in front of them)
      const o = it.o, by = it.y + sh[1] - Y0, ahead = it.k >= 1 && it.y + sh[1] > cut, part = !ahead ? "all" : front ? "body" : "shadow";
      if (front && !ahead) continue;
      if (it.k === 0) copies(o.x, sh, o.r + 3, (cx) => pond(cx, by, o, B));
      else if (it.k === 1) { if (part !== "shadow") copies(o.x, sh, 2, (cx) => {
        const x = Math.round(cx + (b === 2 ? windAt(o.x, o.ph) * sway * 0.8 : 0)), y = Math.round(by), c = o.b ? flB : flA;
        if (b === 0) { put(x, y, hz(c, 0.4)); return; }
        put(x, y + 1, B.dark); put(x, y, c);
        if (b === 2) { put(x - 1, y, mix(c, B.dark, 0.3)); put(x + 1, y, mix(c, B.dark, 0.3)); put(x, y - 1, mix(c, WHITE, 0.3)); put(x, y + 2, B.dark); }
      }); }
      else if (it.k === 2) copies(o.x, sh, o.s + 3, (cx) => rock(cx, by, o, b, part));
      else copies(o.x, sh, o.h * 0.6 + 3, (cx) => tree(cx, by, o, b, part));
    }
  }

  // ---- a pond: a flat ellipse, the far bank in shade, the sky in it, ripples that glint
  function pond(cx, cy, o, B) {
    const rx = o.r, ry = Math.max(1.5, o.r * 0.2);
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = dx * dx + dy * dy;
      if (d >= 1.25) continue;
      if (d >= 1) { put(x, y, dy < 0 ? B.dark : B.rim); continue; }
      let c = dy < -0.45 ? wDeep : dy < 0.15 ? water : wRefl;
      const rip = Math.round(1.5 * Math.sin(TAU * (u * whole(shimmer * 2, 1) + o.ph + y * 0.3)));
      if (h01(Math.floor((x - Math.round(cx) + rip) / 3), y, S + 720) < 0.18 * shimmer && d < 0.8) { c = mix(c, WHITE, 0.6); addLight(x, y, WHITE, 0.08 * shimmer); }
      put(x, y, c);
    }
  }

  // ---- a rock: one or two lumps, flat underneath, lit top-left, a crack, moss on top, a shadow on the grass
  function rock(cx, by, o, b, part = "all") {
    const g = rng(o.seed, 3), s = o.s, rx = s * 0.55, ry = s * 0.38, bx = g.range(-0.3, 0.3) * s, brx = rx * g.range(0.45, 0.7), bry = ry * g.range(0.6, 0.9);
    const rc = hz(hex(w.wRockCol), [0.45, 0.15, 0][b]), rl = mix(rc, WHITE, 0.3), rd = mix(rc, hex("#10141c"), 0.38), rdd = mix(rc, hex("#10141c"), 0.6), moss = BANDS[b].light;
    const inside = (px, py) => {
      if (py > by) return false;
      const a = (px - cx) / rx, c = (py - (by - ry * 0.85)) / ry, e = (px - cx - bx) / brx, f = (py - (by - ry * 0.95 - bry * 0.6)) / bry;
      return a * a + c * c < 1 || e * e + f * f < 1;
    };
    if (part !== "body") for (let x = Math.floor(cx - rx * 1.25); x <= Math.ceil(cx + rx * 1.25); x++) { const k = (x + 0.5 - cx) / (rx * 1.25); if (Math.abs(k) < 1) put(x, Math.floor(by), mix(get(x, Math.floor(by)), rdd, 0.55)); }
    if (part === "shadow") return;
    const crack = g.range(-0.4, 0.4) * rx, mossOn = o.moss < w.wMoss;
    for (let y = Math.floor(by - ry * 2.2); y <= Math.ceil(by); y++) for (let x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x++) {
      const px = x + 0.5, py = y + 0.5;
      if (!inside(px, py)) continue;
      let c = !inside(px - 1, py - 1) ? rl : !inside(px + 1.5, py + 1.5) ? rd : rc;
      if (by - py < 1.2) c = rdd;
      if (s > 5 && Math.abs(px - (cx + crack + (by - py) * 0.4)) < 0.6 && by - py > ry * 0.3 && by - py < ry * 1.2) c = rd;
      if (mossOn && !inside(px, py - 1.5) && h01(x, y, o.seed) < 0.8) c = moss;
      put(x, y, c);
    }
  }

  // ---- a tree: a trunk and a round crown of leaf clumps, or a pine in three tiers; the crown sways in the gusts
  function tree(cx, by, o, b, part = "all") {
    const h = o.h, g = rng(o.seed, 5), k = [0.5, 0.18, 0][b];
    const leaf = [hz(hex(w.wLeafDark), k), hz(mix(hex(w.wLeafDark), hex(w.wLeafLight), 0.5), k), hz(hex(w.wLeafLight), k)], lDeep = mix(leaf[0], hex("#000000"), 0.3);
    const tr = hz(hex(w.wTrunk), k), trL = mix(tr, WHITE, 0.2), trD = mix(tr, hex("#000000"), 0.35);
    const sw = (py) => windAt(o.x, o.ph) * sway * h * 0.035 * clamp((by - py) / h);
    // its shadow on the grass
    if (part !== "body") for (let x = Math.floor(cx - h * 0.28); x <= Math.ceil(cx + h * 0.28); x++) { const yy = Math.floor(by); put(x, yy, mix(get(x, yy), lDeep, 0.5)); }
    if (part === "shadow") return;
    const tw = Math.max(1, Math.round(h * 0.07)), th = h * (o.pine ? 0.22 : 0.48);
    for (let y = Math.floor(by - th); y < Math.ceil(by); y++) for (let i = 0; i < tw; i++) put(Math.round(cx - tw / 2) + i, y, tw > 1 && i === 0 ? trL : i === tw - 1 && tw > 2 ? trD : tr);
    let inside, front, clumps;
    if (o.pine) {
      const tiers = 3, w0 = h * 0.26;
      inside = (px, py) => {
        const qx = px - cx - sw(py);
        for (let i = 0; i < tiers; i++) {
          const yT = by - h + (i * h * 0.62) / tiers, yB = yT + h * 0.42, hw = (w0 * (0.55 + 0.45 * (i / (tiers - 1)))) * clamp((py - yT) / (yB - yT));
          if (py >= yT && py <= yB && Math.abs(qx) < hw) return true;
        }
        return false;
      };
    } else {
      // a round crown: clumps of leaves, the lower ones in front, each lit on its top-left
      const R = h * 0.32, ccy = by - h * 0.64, n = 7 + Math.floor(g.next() * 3);
      clumps = Array.from({ length: n }, (_, i) => {
        const a = (i / n) * TAU + g.range(-0.3, 0.3), rr = i === 0 ? 0 : g.range(0.45, 0.75);
        return [Math.cos(a) * rr * R * 1.1, Math.sin(a) * rr * R * 0.85 + (i === 0 ? -R * 0.1 : 0), R * (i === 0 ? 0.7 : g.range(0.4, 0.55))];
      }).sort((p, q) => q[1] - p[1]);
      inside = (px, py) => { const qx = px - cx - sw(py); for (const [x, y, r] of clumps) { const dx = qx - x, dy = py - (ccy + y); if (dx * dx + dy * dy < r * r) return true; } return false; };
      front = (px, py) => { const qx = px - cx - sw(py); for (const cl of clumps) { const dx = qx - cl[0], dy = py - (ccy + cl[1]); if (dx * dx + dy * dy < cl[2] * cl[2]) return [dx / cl[2], dy / cl[2]]; } return null; };
    }
    const top = Math.floor(by - h - 2), x0 = Math.floor(cx - h * 0.6 - 3), x1 = Math.ceil(cx + h * 0.6 + 3), y1 = Math.ceil(by - th * (o.pine ? 0.3 : 0.6));
    for (let y = top; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      if (!inside(px, py)) continue;
      let c;
      if (!inside(px + 1.5, py + 1.5)) c = o.pine ? leaf[0] : lDeep;
      else if (!inside(px - 1, py - 1)) c = leaf[2];
      else if (o.pine) c = px - cx - sw(py) < -0.5 ? leaf[1] : mix(leaf[1], leaf[0], 0.55);
      else {
        const [fx, fy] = front(px, py), v = fx + fy;
        c = v < -0.75 ? leaf[2] : v < 0.45 ? leaf[1] : leaf[0];
      }
      put(x, y, c);
    }
  }

  // ---- tall grass in front, bending with the gusts
  if (w.wBlades > 0 && w.wGrassH > 0 && (front || !split)) {
    const sh = shift(1.35), hb = (H * w.wGrassH) / 100, dens = clamp(w.wBlades, 0, 2);
    for (let x = -4; x < bw + 4; x++) {
      const lx = wrap(X0 + x - sh[0], T), li = Math.floor(lx), r = h01(li, S, 400);
      if (r > 0.42 * dens) continue;
      const len = hb * (0.35 + 0.65 * h01(li, S, 401)), lean = (h01(li, S, 402) - 0.5) * 0.5, bend = windAt(li, 0.1) * sway * 0.5 + lean;
      const by = H + sh[1] - Y0, dark = r < 0.08 * dens;
      for (let i = 0; i < len; i++) {
        const f = i / len, xx = Math.round(x + bend * len * f * f), yy = Math.floor(by - i - 1);
        put(xx, yy, dark ? (f > 0.7 ? GR[2] : GR[0]) : f > 0.75 ? GR[4] : f > 0.4 ? GR[3] : GR[1]);
      }
    }
  }

  // ---- floating motes: pollen by day, fireflies by night
  if (lay.motes.length && !front) {
    const sh = shift(0.9), mc = hex(w.wMoteCol);
    for (const m of lay.motes) {
      const mx = m.x + m.ax * Math.sin(TAU * (u * m.kx + m.ph)), my = m.y + m.ay * Math.sin(TAU * (u * m.ky + m.ph2)), v = 0.55 + 0.45 * Math.sin(TAU * (u * m.kb * 2 + m.ph));
      copies(mx, sh, 3, (x) => {
        const y = Math.round(my) + sh[1] - Y0;
        put(x, y, v > 0.7 ? mix(mc, WHITE, 0.5) : mix(get(x, y), mc, 0.4 + 0.5 * v));
        glowAt(x, y, 2.5, mc, 0.35 * v);
      });
    }
  }
  return { col, lit };
}

// ---- on its own (pixelfx render / checks)
const roomOf = (o) => (Array.isArray(o.room) ? o.room : [-meta.origin[0], -meta.origin[1], meta.size[0] - meta.origin[0], meta.size[1] - meta.origin[1]]);
export function drawBack(p, t, o) {
  const w = { ...PLAIN, ...(o.world || o) }, room = roomOf(o), bw = Math.ceil(room[2] - room[0]), bh = Math.ceil(room[3] - room[1]);
  const P = o.duration * Math.max(1, Math.round(w.wLoops || 1)), T = Math.max(16, bw, bh);
  const { col, lit } = renderSurface(w, t, P, T, 0, 0, bw, bh, [w.wCamX || 0, w.wCamY || 0], [bw, bh]);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const i = y * bw + x, lx = room[0] + x + 0.5, ly = room[1] + y + 0.5, j = i * 3;
    p.px(lx, ly, col[i] || 0xff000000);
    if (lit[j] + lit[j + 1] + lit[j + 2] > 1) p.light(lx, ly, (255 << 24) | (Math.min(255, lit[j + 2]) << 16) | (Math.min(255, lit[j + 1]) << 8) | Math.min(255, lit[j]), 1);
  }
}
export function draw() {}
