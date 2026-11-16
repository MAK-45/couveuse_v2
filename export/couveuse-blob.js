// =====================================================================================================================
//  COUVEUSE — LE BLOB : la créature de lumière de glace telle qu’elle est née (pas le personnage humain)
//  Un seul fichier, autonome, sans dépendance : son APPARENCE, son REPOS (il flotte, ondule, respire, cligne des yeux et
//  regarde autour de lui : une boucle parfaite, sans saut) et TOUTES SES PALETTES DE COULEURS (Glace, Sang, Braise…).
//
//  Généré à partir du projet (src/blob/blob.js et pixelfx/src/core/) : chaque module garde son code et ses commentaires
//  d’origine (en anglais) dans sa propre portée « const M_xxx = (() => { … })(); ». Les bandeaux en MAJUSCULES disent à
//  quoi sert chaque partie.
//
//  QUI FAIT QUOI
//   1. pixelfx · maths, couleurs, particules, peintre, images ... les outils de dessin (le peintre de pixels). Les
//      couleurs (color.js) contiennent PAL, les dégradés d’où viennent les palettes du blob
//   2. LE BLOB (blob.js) ........................................... tout le blob :
//        - meta.options : ses réglages (palette, taille, ondulation, mouvement, yeux, lumière, particules)
//        - shapeOf()    : son contour qui ondule (bruit lu sur un cercle de temps : la boucle ne saute jamais)
//        - state()      : où il est, comme il s’étire et s’écrase en flottant
//        - blobBack() / blobFront() : son halo et sa lumière au sol (derrière), son corps éclairé (devant)
//        - eyes / blinkAt : ses yeux, leurs clignements et leur regard
//        - sparks / drips / motes : ses étincelles, ses gouttes et ses poussières de lumière
//   3. PALETTES (tout en bas) ..................................... les 9 palettes de la page (Glace, Arcane, Braise,
//      Sève, Aurore, Néon, Abysse, Lagon, Sang) et, en plus, les autres dégradés de pixelfx
//   4. DÉMO / UTILISATION (tout en bas) ............................ Couveuse.render(), Couveuse.play()
//
//  UNE PALETTE : 8 couleurs, de la plus sombre (l’ombre du corps) à la plus claire (le reflet, le cœur de lumière).
//  Une palette de 7 couleurs (Sang, Braise…) est étirée à 8 par le blob lui-même (fit(palette, 8)). N’importe quelle
//  liste de couleurs « #rrggbb » marche : c’est ainsi que tu peux faire la tienne.
//
//  UTILISATION
//   Dans une page : <script src="couveuse-blob.js"></script> → une démo s’affiche (un bouton par palette).
//   Ou à la main :
//     const o = Couveuse.options("Sang", { size: 30 });  // une palette (nom ou liste de couleurs) + d’autres réglages
//     Couveuse.render(canvas, t, o);                     // une image au temps t (s), dans un canvas 320 × 180
//     Couveuse.length(o);                                // la durée d’une boucle (s) : t et t + durée sont identiques
//     Couveuse.play(canvas, o);                          // le joue en boucle ; renvoie une fonction pour l’arrêter
//     Couveuse.PALETTES                                  // toutes les palettes, par nom
// =====================================================================================================================

(function () {
"use strict";

// ======================================================================================================================
// PIXELFX · MATHS  —  pixelfx/src/core/math.js
// outils : bruit, easing (ease), seg, bump, clamp, lerp, TAU, hasard (rng)
// ======================================================================================================================
const M_math_pfx = (() => {

// Numbers, easing, randomness and noise. Everything here is pure and deterministic,
// so an effect drawn at time t always looks the same.

const TAU = Math.PI * 2;

const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const invLerp = (a, b, x) => (b === a ? 0 : (x - a) / (b - a));
const remap = (x, a0, a1, b0, b1) => lerp(b0, b1, invLerp(a0, a1, x));
const fract = (x) => x - Math.floor(x);
const wrap = (x, m) => ((x % m) + m) % m;
/** Progress 0..1 of t through the window [t0, t1]: 0 before it, 1 after it. */
const seg = (t, t0, t1) => clamp((t - t0) / (t1 - t0));
/** Hermite smoothstep of x between e0 and e1. */
const smooth = (e0, e1, x) => {
  const t = seg(x, e0, e1);
  return t * t * (3 - 2 * t);
};
/** 0 → 1 → 0 over the window [t0, t1] (sine bump). */
const bump = (t, t0, t1) => (t <= t0 || t >= t1 ? 0 : Math.sin(Math.PI * seg(t, t0, t1)));
const pingpong = (x) => 1 - Math.abs(wrap(x, 2) - 1);
const dist = (x0, y0, x1, y1) => Math.hypot(x1 - x0, y1 - y0);
const angleTo = (x0, y0, x1, y1) => Math.atan2(y1 - y0, x1 - x0);

/** Easing curves: input 0..1, output 0..1 (back and elastic overshoot). */
const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inQuart: (t) => t * t * t * t,
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  outSine: (t) => Math.sin((t * Math.PI) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  inBack: (t, s = 1.70158) => (t <= 0 ? 0 : t >= 1 ? 1 : (s + 1) * t * t * t - s * t * t),
  outBack: (t, s = 1.70158) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2)),
  outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  outBounce: (t) => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
};

/** 32-bit integer hash of any number of integers. */
function hash(...ns) {
  let h = 0x9e3779b9;
  for (const n of ns) {
    h = Math.imul(h ^ (n | 0), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return h >>> 0;
}
/** Deterministic random number in [0, 1) from integers (seed, particle index, which value...). */
const rand = (...ns) => hash(...ns) / 4294967296;

/** Seeded random generator (mulberry32). */
class Rng {
  constructor(seed = 1) {
    this.s = seed >>> 0 || 1;
  }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) {
    return a + (b - a) * this.next();
  }
  int(a, b) {
    return Math.floor(this.range(a, b + 1));
  }
  chance(p) {
    return this.next() < p;
  }
  sign() {
    return this.next() < 0.5 ? -1 : 1;
  }
  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }
  /** Roughly normal, mean 0, sd 1. */
  gauss() {
    return (this.next() + this.next() + this.next() + this.next() - 2) * 1.732;
  }
}
/** A generator for one particle: rng(seed, i) gives the same numbers every frame. */
const rng = (...ns) => new Rng(hash(...ns));

/** Smooth 1D value noise in [-1, 1]. */
function noise(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(rand(i, seed), rand(i + 1, seed), u) * 2 - 1;
}
/** Smooth 2D value noise in [-1, 1]. */
function noise2(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = rand(ix, iy, seed), b = rand(ix + 1, iy, seed), c = rand(ix, iy + 1, seed), d = rand(ix + 1, iy + 1, seed);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1;
}
/** Fractal 2D noise in about [-1, 1]. */
function fbm(x, y, seed = 0, octaves = 3) {
  let s = 0, a = 0.5, n = 0;
  for (let o = 0; o < octaves; o++) {
    s += noise2(x, y, seed + o * 101) * a;
    n += a;
    x *= 2.03;
    y *= 2.03;
    a *= 0.5;
  }
  return s / n;
}
/**
 * 2D value noise whose lattice repeats every px cells in x and py cells in y (0: no repeat). Scroll it by
 * exactly py cells over a loop and the loop has no seam: tileNoise(x, y + phase * py, 0, py).
 */
function tileNoise(x, y, px = 0, py = 0, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const x0 = px ? wrap(ix, px) : ix, x1 = px ? wrap(ix + 1, px) : ix + 1;
  const y0 = py ? wrap(iy, py) : iy, y1 = py ? wrap(iy + 1, py) : iy + 1;
  const a = rand(x0, y0, seed), b = rand(x1, y0, seed), c = rand(x0, y1, seed), d = rand(x1, y1, seed);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1;
}
/** Fractal tileNoise: every octave keeps the repeat, so scrolled fields still loop. */
function tileFbm(x, y, px = 0, py = 0, seed = 0, octaves = 3) {
  let s = 0, a = 0.5, n = 0, k = 1;
  for (let o = 0; o < octaves; o++) {
    s += tileNoise(x * k, y * k, px * k, py * k, seed + o * 101) * a;
    n += a;
    a *= 0.5;
    k *= 2;
  }
  return s / n;
}
/** Noise that loops: the same value at phase 0 and phase 1 (for seamless loops). */
function loopNoise(phase, radius = 1, seed = 0) {
  const a = phase * TAU;
  return noise2(Math.cos(a) * radius + 50, Math.sin(a) * radius + 50, seed);
}
return { TAU, clamp, lerp, invLerp, remap, fract, wrap, seg, smooth, bump, pingpong, dist, angleTo, ease, hash, rand, Rng, rng, noise, noise2, fbm, tileNoise, tileFbm, loopNoise };
})();

// ======================================================================================================================
// PIXELFX · COULEURS  —  pixelfx/src/core/color.js
// outils : couleurs, fit() de la palette
// ======================================================================================================================
const M_color_pfx = (() => {
const { clamp } = M_math_pfx;
// Colors are 32-bit integers laid out like ImageData bytes (R, G, B, A in memory),
// so a frame's color buffer can be shown with new ImageData(new Uint8ClampedArray(buf.buffer), w, h).


const rgb = (r, g, b) => (255 << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
const red = (c) => c & 255;
const green = (c) => (c >>> 8) & 255;
const blue = (c) => (c >>> 16) & 255;

/** "#rgb" or "#rrggbb" (or a color number, passed through) to a color number. */
function hex(h) {
  if (typeof h === "number") return h;
  let s = h.replace("#", "");
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const v = parseInt(s.slice(0, 6), 16);
  return rgb((v >> 16) & 255, (v >> 8) & 255, v & 255);
}
const toHex = (c) => "#" + [red(c), green(c), blue(c)].map((v) => v.toString(16).padStart(2, "0")).join("");

/** Linear mix of two colors. */
function mix(a, b, t) {
  t = clamp(t);
  return rgb(red(a) + (red(b) - red(a)) * t, green(a) + (green(b) - green(a)) * t, blue(a) + (blue(b) - blue(a)) * t);
}
/** Multiply a color's brightness by k. */
const scale = (c, k) => rgb(Math.min(255, red(c) * k), Math.min(255, green(c) * k), Math.min(255, blue(c) * k));
/** Perceived brightness 0..1. */
const luma = (c) => (0.299 * red(c) + 0.587 * green(c) + 0.114 * blue(c)) / 255;

/** A list of hex strings (dark to bright) to color numbers. */
const ramp = (list) => list.map(hex);
/**
 * Resample a ramp to exactly n steps, keeping its ends (the darkest and brightest stay put). Lets an effect
 * index steps by number (C[5]) whatever length of palette a caller passes.
 */
function fit(r, n) {
  r = r.map(hex);
  if (r.length === n) return r;
  return Array.from({ length: n }, (_, i) => r[Math.round((i * (r.length - 1)) / Math.max(1, n - 1))]);
}
/** The ramp step for t in 0..1, no blending: pixel art picks a color, it doesn't fade between two. */
const at = (r, t) => r[clamp(Math.floor(t * r.length), 0, r.length - 1)];
/** Blended color along a ramp (for light, where smooth is right). */
function blend(r, t) {
  const x = clamp(t) * (r.length - 1), i = Math.min(r.length - 2, Math.floor(x));
  return mix(r[i], r[i + 1], x - i);
}

// Hue-shifted ramps, dark to bright: shadows lean cool or deep, highlights lean warm or white.
// Effects take `palette` as an option, so any of these (or your own) can recolor them.
const PAL = {
  fire: ["#1f0b10", "#4a1118", "#8c1d1c", "#cc3a1a", "#f2701f", "#ffae35", "#ffe27a", "#fff8d6"],
  ember: ["#1a0a0e", "#3d1012", "#701a14", "#a8301a", "#e0561e", "#ff8a2a", "#ffc46a"],
  lava: ["#14060a", "#380a10", "#6e1210", "#ac2410", "#e8501a", "#ff8c2a", "#ffd25a"],
  smoke: ["#0e0c12", "#1d1a22", "#2e2a35", "#433e4b", "#5c5664", "#7b7484", "#a39cab"],
  dust: ["#1c1610", "#33281c", "#4f3f2c", "#6e5a40", "#927a58", "#b89f78", "#dcc8a2"],
  ice: ["#0c1430", "#162c5c", "#1f4f94", "#2f7fcc", "#58b4ec", "#9bdcff", "#d8f4ff", "#ffffff"],
  water: ["#081830", "#0e2e5a", "#14508c", "#1c76bc", "#36a2e0", "#78ccf4", "#c4ecff", "#ffffff"],
  electric: ["#0a0f2e", "#172a78", "#2550d0", "#3f8cff", "#7cc8ff", "#c8f0ff", "#ffffff"],
  volt: ["#24160a", "#5e3a0c", "#a8680f", "#e8a218", "#ffd23c", "#fff08a", "#ffffff"],
  poison: ["#0d1a0c", "#173a14", "#265e18", "#3f8a1e", "#6cb82a", "#a8e04a", "#e0ff8a"],
  holy: ["#2a1c08", "#5a3e10", "#9a6c18", "#d8a428", "#ffd84a", "#fff09a", "#fffbe6", "#ffffff"],
  heal: ["#08201a", "#0f3f2c", "#17663e", "#24924e", "#3ec466", "#7ee88a", "#c8ffc4", "#ffffff"],
  arcane: ["#140a26", "#2b1252", "#481c88", "#6b2cc0", "#9a48ec", "#c684ff", "#ecc8ff", "#ffffff"],
  shadow: ["#050308", "#0f0a18", "#1c1230", "#2c1a4a", "#432468", "#5e3290", "#8048b8", "#a970e0"],
  blood: ["#14040a", "#3a0a14", "#6a101c", "#a01824", "#d42a30", "#ff5a50", "#ff9a8a"],
  earth: ["#140e0a", "#2a1e14", "#47321e", "#69492a", "#8e6638", "#b88a52", "#dcb47c"],
  stone: ["#0e0e12", "#1c1c24", "#2c2c38", "#42424f", "#5c5c6b", "#7d7d8c", "#a4a4b2", "#d0d0da"],
  gold: ["#1e1206", "#4a2c08", "#86520c", "#c48412", "#f0b424", "#ffe066", "#fff6c4", "#ffffff"],
  leaf: ["#0c1a0e", "#163418", "#225224", "#357530", "#4f9a3a", "#7cc048", "#b4e070", "#e4ffb0"],
  wood: ["#160c06", "#2e1a0c", "#4a2c14", "#6a421e", "#8e5c2c", "#b47c40", "#d8a464"],
  metal: ["#0c0e14", "#1c2230", "#2e3648", "#4a5468", "#6e7a90", "#9aa6ba", "#d0d8e6", "#ffffff"],
  bone: ["#1a1814", "#3a352c", "#5e5648", "#8a806c", "#b8ad96", "#e4dcc8", "#fffaf0"],
  neon: ["#1a0516", "#3d0a33", "#701560", "#b0228f", "#f53cd1", "#ff86e6", "#ffd2f6", "#ffffff"],
  cyber: ["#041418", "#08303a", "#0c5260", "#108088", "#18b4b0", "#4ce8d8", "#b4fff0", "#ffffff"],
  matrix: ["#020a04", "#05200c", "#0a3c16", "#106624", "#1a9a34", "#3cd650", "#a4ffa8", "#e8ffe8"],
  candy: ["#ff4a5a", "#ff9a2a", "#ffe03c", "#5ad84a", "#3cc8ff", "#7a6cff", "#f53cd1"],
  night: ["#07060d", "#0c0a18", "#131026", "#1b1734", "#241f44", "#2f2956"],
};
/** The same ramps as color numbers. */
const RAMP = Object.fromEntries(Object.entries(PAL).map(([k, v]) => [k, ramp(v)]));

const WHITE = hex("#ffffff");
const BLACK = hex("#000000");
const INK = hex("#0b0a10");
const PATCH = hex("#f53cd1");
return { rgb, red, green, blue, hex, toHex, mix, scale, luma, ramp, fit, at, blend, PAL, RAMP, WHITE, BLACK, INK, PATCH };
})();

// ======================================================================================================================
// PIXELFX · PARTICULES  —  pixelfx/src/core/particles.js
// outils : cycle() des particules qui bouclent
// ======================================================================================================================
const M_particles_pfx = (() => {
const { rng, clamp } = M_math_pfx;
// Particles without a simulation: each one's position is a closed-form function of its age, so an effect
// can be drawn at any time t, scrubbed, looped and rendered to a sprite sheet frame by frame.


/**
 * Where a particle is after t seconds, launched from (x, y) at (vx, vy) px/s, under gravity g (px/s²,
 * positive is down) and linear drag (1/s). Returns [x, y].
 */
function fly(x, y, vx, vy, t, g = 0, drag = 0) {
  if (drag <= 0) return [x + vx * t, y + vy * t + 0.5 * g * t * t];
  const f = (1 - Math.exp(-drag * t)) / drag, vt = g / drag;
  return [x + vx * f, y + vt * t + (vy - vt) * f];
}
/** Its velocity at t, for streaks that point along the motion. Returns [vx, vy]. */
function flyV(vx, vy, t, g = 0, drag = 0) {
  if (drag <= 0) return [vx, vy + g * t];
  const e = Math.exp(-drag * t), vt = g / drag;
  return [vx * e, vt + (vy - vt) * e];
}

/**
 * n one-shot particles: fn(r, i) with a repeatable rng per particle (the same numbers every frame).
 */
function burst(n, seed, fn) {
  for (let i = 0; i < n; i++) fn(rng(seed, i), i);
}

/**
 * Particles that repeat every `period` seconds, for loops with no seam. Particle i is born at its own
 * phase in the period and lives `life` seconds (a number, or a function of an rng). For every live copy,
 * fn(age, life, r, i) is called; r is a fresh rng for particle i, the same each period.
 */
function cycle(t, period, count, seed, life, fn) {
  for (let i = 0; i < count; i++) {
    const g = rng(seed, i, 911);
    const born = g.next() * period;
    const L = typeof life === "function" ? life(g) : life;
    let age = (((t - born) % period) + period) % period;
    for (; age < L; age += period) fn(age, L, rng(seed, i), i);
  }
}

/**
 * Particles born at a steady rate between t0 and t1 (an emitter that stops): fn(age, life, r, i) for every
 * particle alive at t. rate is particles per second.
 */
function stream(t, t0, t1, rate, seed, life, fn) {
  const n = Math.floor((Math.min(t, t1) - t0) * rate);
  for (let i = 0; i <= n; i++) {
    const born = t0 + i / rate, g = rng(seed, i, 911), L = typeof life === "function" ? life(g) : life;
    const age = t - born;
    if (age >= 0 && age < L) fn(age, L, rng(seed, i), i);
  }
}

/** A simple simulated particle list, for effects that export create() and keep state. */
class Particles {
  constructor() {
    this.list = [];
  }
  /** p: { x, y, vx, vy, life, g?, drag?, ground?, bounce? } plus anything you want to draw with. */
  add(p) {
    p.age = 0;
    p.g ??= 0;
    p.drag ??= 0;
    this.list.push(p);
    return p;
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if ((p.age += dt) >= p.life) {
        this.list.splice(i, 1);
        continue;
      }
      p.vx -= p.vx * p.drag * dt;
      p.vy += p.g * dt - p.vy * p.drag * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.ground !== undefined && p.y > p.ground) {
        p.y = p.ground;
        p.vy = -Math.abs(p.vy) * (p.bounce ?? 0.3);
        p.vx *= 0.7;
      }
    }
  }
  /** Life left, 1 at birth to 0 at death. */
  static k(p) {
    return clamp(1 - p.age / p.life);
  }
}
return { fly, flyV, burst, cycle, stream, Particles };
})();

// ======================================================================================================================
// PIXELFX · POLICE  —  pixelfx/src/core/font.js
// requis par le peintre (non utilisé par le personnage)
// ======================================================================================================================
const M_font_pfx = (() => {

// Two pixel fonts: "mini" (3x5) for small numbers and tags, "big" (5x7) for words like LEVEL UP.
// Glyphs are trimmed to their inked columns, so text sets proportionally (an I is narrower than an M).

const MINI = {
  A: ".#.|#.#|###|#.#|#.#", B: "##.|#.#|##.|#.#|##.", C: ".##|#..|#..|#..|.##", D: "##.|#.#|#.#|#.#|##.",
  E: "###|#..|##.|#..|###", F: "###|#..|##.|#..|#..", G: ".##|#..|#.#|#.#|.##", H: "#.#|#.#|###|#.#|#.#",
  I: "###|.#.|.#.|.#.|###", J: "..#|..#|..#|#.#|.#.", K: "#.#|#.#|##.|#.#|#.#", L: "#..|#..|#..|#..|###",
  M: "#.#|###|###|#.#|#.#", N: "##.|#.#|#.#|#.#|#.#", O: ".#.|#.#|#.#|#.#|.#.", P: "##.|#.#|##.|#..|#..",
  Q: ".#.|#.#|#.#|##.|.##", R: "##.|#.#|##.|#.#|#.#", S: ".##|#..|.#.|..#|##.", T: "###|.#.|.#.|.#.|.#.",
  U: "#.#|#.#|#.#|#.#|###", V: "#.#|#.#|#.#|#.#|.#.", W: "#.#|#.#|###|###|#.#", X: "#.#|#.#|.#.|#.#|#.#",
  Y: "#.#|#.#|.#.|.#.|.#.", Z: "###|..#|.#.|#..|###",
  0: "###|#.#|#.#|#.#|###", 1: ".#.|##.|.#.|.#.|###", 2: "##.|..#|.#.|#..|###", 3: "##.|..#|.#.|..#|##.",
  4: "#.#|#.#|###|..#|..#", 5: "###|#..|##.|..#|##.", 6: ".##|#..|###|#.#|###", 7: "###|..#|.#.|.#.|.#.",
  8: "###|#.#|###|#.#|###", 9: "###|#.#|###|..#|##.",
  "+": "...|.#.|###|.#.|...", "-": "...|...|###|...|...", "!": "#|#|#|.|#", "?": "##.|..#|.#.|...|.#.",
  ".": ".|.|.|.|#", ",": "..|..|..|.#|#.", ":": ".|#|.|#|.", "/": "..#|..#|.#.|#..|#..",
  "%": "#.#|..#|.#.|#..|#.#", x: "...|#.#|.#.|#.#|...", "*": "#.#|.#.|#.#|...|...", "'": "#|#|.|.|.",
  "(": ".#|#.|#.|#.|.#", ")": "#.|.#|.#|.#|#.", "<": "..#|.#.|#..|.#.|..#", ">": "#..|.#.|..#|.#.|#..",
  "=": "...|###|...|###|...", _: "...|...|...|...|###", "#": "#.#|###|#.#|###|#.#",
};

const BIG = {
  A: ".###.|#...#|#...#|#####|#...#|#...#|#...#", B: "####.|#...#|#...#|####.|#...#|#...#|####.",
  C: ".###.|#...#|#....|#....|#....|#...#|.###.", D: "####.|#...#|#...#|#...#|#...#|#...#|####.",
  E: "#####|#....|#....|####.|#....|#....|#####", F: "#####|#....|#....|####.|#....|#....|#....",
  G: ".###.|#...#|#....|#.###|#...#|#...#|.####", H: "#...#|#...#|#...#|#####|#...#|#...#|#...#",
  I: "###|.#.|.#.|.#.|.#.|.#.|###", J: "..###|...#.|...#.|...#.|...#.|#..#.|.##..",
  K: "#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#", L: "#....|#....|#....|#....|#....|#....|#####",
  M: "#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#", N: "#...#|#...#|##..#|#.#.#|#..##|#...#|#...#",
  O: ".###.|#...#|#...#|#...#|#...#|#...#|.###.", P: "####.|#...#|#...#|####.|#....|#....|#....",
  Q: ".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#", R: "####.|#...#|#...#|####.|#.#..|#..#.|#...#",
  S: ".####|#....|#....|.###.|....#|....#|####.", T: "#####|..#..|..#..|..#..|..#..|..#..|..#..",
  U: "#...#|#...#|#...#|#...#|#...#|#...#|.###.", V: "#...#|#...#|#...#|#...#|#...#|.#.#.|..#..",
  W: "#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.", X: "#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#",
  Y: "#...#|#...#|.#.#.|..#..|..#..|..#..|..#..", Z: "#####|....#|...#.|..#..|.#...|#....|#####",
  0: ".###.|#...#|#..##|#.#.#|##..#|#...#|.###.", 1: ".#.|##.|.#.|.#.|.#.|.#.|###",
  2: ".###.|#...#|....#|...#.|..#..|.#...|#####", 3: "#####|...#.|..#..|...#.|....#|#...#|.###.",
  4: "...#.|..##.|.#.#.|#..#.|#####|...#.|...#.", 5: "#####|#....|####.|....#|....#|#...#|.###.",
  6: "..##.|.#...|#....|####.|#...#|#...#|.###.", 7: "#####|....#|...#.|..#..|.#...|.#...|.#...",
  8: ".###.|#...#|#...#|.###.|#...#|#...#|.###.", 9: ".###.|#...#|#...#|.####|....#|...#.|.##..",
  "!": "#|#|#|#|#|.|#", "?": ".###.|#...#|....#|...#.|..#..|.....|..#..", "+": ".....|..#..|..#..|#####|..#..|..#..|.....",
  "-": "....|....|....|####|....|....|....", ".": ".|.|.|.|.|.|#", ",": "..|..|..|..|..|.#|#.", ":": ".|.|#|.|.|#|.",
  "/": "....#|....#|...#.|..#..|.#...|#....|#....", "%": "##...|##..#|...#.|..#..|.#...|#..##|...##",
  x: ".....|.....|#...#|.#.#.|..#..|.#.#.|#...#", "*": ".....|..#..|#.#.#|.###.|#.#.#|..#..|.....", "'": "#|#|.|.|.|.|.",
  "<": "...#|..#.|.#..|#...|.#..|..#.|...#", ">": "#...|.#..|..#.|...#|..#.|.#..|#...", "=": "....|....|####|....|####|....|....",
  "(": "..#|.#.|#..|#..|#..|.#.|..#", ")": "#..|.#.|..#|..#|..#|.#.|#..", "#": ".#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#.",
};

function build(table, h) {
  const out = {};
  for (const [ch, src] of Object.entries(table)) {
    const rows = src.split("|");
    out[ch] = { w: rows[0].length, rows: rows.map((r) => [...r].map((c) => c === "#")) };
    if (rows.length !== h) throw new Error(`glyph ${ch} has ${rows.length} rows, expected ${h}`);
  }
  return out;
}

const FONTS = {
  mini: { h: 5, space: 2, gap: 1, glyphs: build(MINI, 5) },
  big: { h: 7, space: 3, gap: 1, glyphs: build(BIG, 7) },
};

/** Width in font pixels of a string (before scaling). */
function textWidth(str, font = "mini") {
  const F = FONTS[font];
  let w = 0;
  for (const ch of String(str)) {
    const g = F.glyphs[ch] ?? F.glyphs[ch.toUpperCase()];
    w += (g ? g.w : F.space) + F.gap;
  }
  return Math.max(0, w - F.gap);
}

/** Calls plot(x, y) for every inked font pixel of str, with the top-left of the text at (0, 0). */
function rasterText(str, font, plot) {
  const F = FONTS[font];
  let x = 0;
  for (const ch of String(str)) {
    const g = F.glyphs[ch] ?? F.glyphs[ch.toUpperCase()];
    if (!g) {
      x += F.space + F.gap;
      continue;
    }
    for (let r = 0; r < F.h; r++) for (let c = 0; c < g.w; c++) if (g.rows[r][c]) plot(x + c, r);
    x += g.w + F.gap;
  }
}
return { FONTS, textWidth, rasterText };
})();

// ======================================================================================================================
// PIXELFX · PEINTRE  —  pixelfx/src/core/painter.js
// MOTEUR DE DESSIN : les points, la lumière additive, le tramage (p.dot, p.light…)
// ======================================================================================================================
const M_painter_pfx = (() => {
const { clamp } = M_math_pfx;
const { hex } = M_color_pfx;
const { rasterText, textWidth, FONTS } = M_font_pfx;
// The painter draws into a frame's two buffers: `color` (opaque pixels, faded with ordered dither, never
// blended) and `light` (additive glow, composited on top). Effects draw in local coordinates around their
// origin; the painter places, mirrors and rotates them, so an effect never needs to know where it is.




// 4x4 ordered (Bayer) thresholds: a pixel at alpha a is drawn when a is above its cell's threshold.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const OUT = { c: 0, a: 1, l: 0, k: 0 };
const sprites = new WeakMap();
const call = (v, ...args) => (typeof v === "function" ? v(...args) : v);

class Painter {
  constructor(frame) {
    this.frame = frame;
    this.reset();
  }

  /** Re-read the frame and clear placement, fade and light strength. */
  reset() {
    const f = this.frame;
    this.w = f.w; this.h = f.h; this.ox = f.ox | 0; this.oy = f.oy | 0; this.C = f.color; this.L = f.light;
    this.tx = 0; this.ty = 0; this.fx = 1; this.cs = 1; this.sn = 0;
    this.fade = 1; this.lightK = 1; this.layer = "front";
    return this;
  }

  /** Put the effect's origin at (x, y) in frame space, mirrored if flip, rotated by angle (radians). */
  place(x, y, flip = false, angle = 0) {
    this.tx = x; this.ty = y; this.fx = flip ? -1 : 1; this.cs = Math.cos(angle); this.sn = Math.sin(angle);
    return this;
  }

  // ---- transforms: local (effect) space <-> screen (frame) space
  toX(x, y) { return this.tx + x * this.fx * this.cs - y * this.sn; }
  toY(x, y) { return this.ty + x * this.fx * this.sn + y * this.cs; }
  fromX(sx, sy) { const dx = sx - this.tx, dy = sy - this.ty; return (dx * this.cs + dy * this.sn) * this.fx; }
  fromY(sx, sy) { const dx = sx - this.tx, dy = sy - this.ty; return -dx * this.sn + dy * this.cs; }
  // the screen pixel of the local pixel cell holding (x, y): mirrors and rotations land on whole cells
  cellX(x, y) { return Math.floor(this.toX(Math.floor(x) + 0.5, Math.floor(y) + 0.5)); }
  cellY(x, y) { return Math.floor(this.toY(Math.floor(x) + 0.5, Math.floor(y) + 0.5)); }

  // ---- raw writes, screen space, whole pixels. Color 0 means "nothing": it never erases what's there.
  put(sx, sy, c, a = 1) {
    if (!c) return;
    a *= this.fade;
    if (a < 1 && a <= BAYER[((sy & 3) << 2) | (sx & 3)]) return;
    const x = sx - this.ox, y = sy - this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.C[y * this.w + x] = c;
  }
  add(sx, sy, c, k = 1) {
    k *= this.fade * this.lightK;
    if (k <= 0.004) return;
    const x = sx - this.ox, y = sy - this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x, d = this.L[i];
    const r = Math.min(255, (d & 255) + (c & 255) * k) | 0;
    const g = Math.min(255, ((d >>> 8) & 255) + ((c >>> 8) & 255) * k) | 0;
    const b = Math.min(255, ((d >>> 16) & 255) + ((c >>> 16) & 255) * k) | 0;
    this.L[i] = (255 << 24) | (b << 16) | (g << 8) | r;
  }
  /**
   * Blend a color over what's there at alpha a (0..1), keeping the result's own alpha: soft smoke, vapour and
   * mist. Use dithered dot() for hard pixel fades and blend() for translucent volumes.
   */
  blendPx(sx, sy, c, a) {
    a *= this.fade;
    if (!c || a <= 0.004) return;
    const x = sx - this.ox, y = sy - this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x, d = this.C[i], da = (d >>> 24) / 255, oa = a + da * (1 - a), k = a / oa;
    const ch = (s) => ((((c >>> s) & 255) * k + ((d >>> s) & 255) * (1 - k)) & 255);
    this.C[i] = (((oa * 255) & 255) << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0);
  }
  /** Translucent pixel at a local point. */
  blend(x, y, c, a) { this.blendPx(this.cellX(x, y), this.cellY(x, y), c, a); }
  /** A translucent disc: puffs of smoke, vapour, dust. c and a may be functions of (d: 0 center..1 rim, angle). */
  disc(cx, cy, r, c, a) {
    if (r < 0.5) return this.blend(cx, cy, call(c, 0, 0), call(a, 0, 0));
    this.each(cx - r, cy - r, cx + r, cy + r, (x, y, sx, sy) => {
      const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
      if (d2 > r * r) return;
      const d = Math.sqrt(d2) / r, ang = Math.atan2(dy, dx);
      this.blendPx(sx, sy, call(c, d, ang), call(a, d, ang));
    });
  }
  /** Read back the color under a local point (0 if empty). */
  get(x, y) {
    const sx = this.cellX(x, y) - this.ox, sy = this.cellY(x, y) - this.oy;
    return sx < 0 || sy < 0 || sx >= this.w || sy >= this.h ? 0 : this.C[sy * this.w + sx];
  }

  // ---- pixels
  /** One opaque pixel. */
  px(x, y, c) { this.put(this.cellX(x, y), this.cellY(x, y), c, 1); }
  /** One pixel at alpha a (0..1), faded by ordered dither. */
  dot(x, y, c, a = 1) { if (a > 0) this.put(this.cellX(x, y), this.cellY(x, y), c, a); }
  /** Add light to one pixel. */
  light(x, y, c, k = 1) { this.add(this.cellX(x, y), this.cellY(x, y), c, k); }

  /**
   * Visit every screen pixel whose center falls in the local box [x0, x1] x [y0, y1], with that center in
   * local space: fn(lx, ly, sx, sy). The basis of every filled shape, so shapes mirror and rotate exactly.
   */
  each(x0, y0, x1, y1, fn) {
    let ax = Infinity, bx = -Infinity, ay = Infinity, by = -Infinity;
    for (let k = 0; k < 4; k++) {
      const x = k & 1 ? x1 : x0, y = k & 2 ? y1 : y0, sx = this.toX(x, y), sy = this.toY(x, y);
      if (sx < ax) ax = sx; if (sx > bx) bx = sx; if (sy < ay) ay = sy; if (sy > by) by = sy;
    }
    const sx0 = Math.max(Math.floor(ax), this.ox), sx1 = Math.min(Math.ceil(bx), this.ox + this.w - 1);
    const sy0 = Math.max(Math.floor(ay), this.oy), sy1 = Math.min(Math.ceil(by), this.oy + this.h - 1);
    for (let sy = sy0; sy <= sy1; sy++)
      for (let sx = sx0; sx <= sx1; sx++) {
        const cx = sx + 0.5, cy = sy + 0.5;
        fn(this.fromX(cx, cy), this.fromY(cx, cy), sx, sy);
      }
  }

  /**
   * A pixel shader over a local box. fn(x, y, out) returns a color, or sets out.c (color), out.a (alpha),
   * out.l (light color, defaults to out.c) and out.k (light amount). Return nothing to leave the pixel alone.
   */
  shade(x0, y0, x1, y1, fn) {
    const o = OUT;
    this.each(x0, y0, x1, y1, (lx, ly, sx, sy) => {
      o.c = 0; o.a = 1; o.l = 0; o.k = 0;
      const c = fn(lx, ly, o) || o.c;
      if (c) this.put(sx, sy, c, o.a);
      if (o.k > 0) this.add(sx, sy, o.l || c, o.k);
    });
  }

  // ---- shapes. Colors (c) and alphas (a) can be numbers or functions of the shape's own coordinates.
  /** 1 px line. c and a may be functions of u (0 at the start, 1 at the end). */
  line(x0, y0, x1, y1, c, a = 1) {
    let sx = this.cellX(x0, y0), sy = this.cellY(x0, y0);
    const ex = this.cellX(x1, y1), ey = this.cellY(x1, y1);
    const dx = Math.abs(ex - sx), dy = -Math.abs(ey - sy), stepx = sx < ex ? 1 : -1, stepy = sy < ey ? 1 : -1;
    const n = Math.max(dx, -dy) || 1, fc = typeof c === "function", fa = typeof a === "function";
    let err = dx + dy, i = 0;
    for (;;) {
      const u = i++ / n;
      this.put(sx, sy, fc ? c(u) : c, fa ? a(u) : a);
      if (sx === ex && sy === ey) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; sx += stepx; }
      if (e2 <= dx) { err += dx; sy += stepy; }
    }
  }
  /** Lines through a list of points [[x, y], ...]. */
  polyline(pts, c, a = 1) {
    for (let i = 1; i < pts.length; i++) this.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], c, a);
  }
  /** Thick segment with round ends. c and a may be functions of (u along, v across: 0 center, 1 edge). */
  beam(x0, y0, x1, y1, width, c, a = 1) {
    const r = width / 2, dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1e-9;
    this.shade(Math.min(x0, x1) - r, Math.min(y0, y1) - r, Math.max(x0, x1) + r, Math.max(y0, y1) + r, (x, y, o) => {
      const u = clamp(((x - x0) * dx + (y - y0) * dy) / L2), px = x0 + dx * u - x, py = y0 + dy * u - y;
      const d2 = px * px + py * py;
      if (d2 > r * r) return;
      const v = Math.sqrt(d2) / r;
      o.c = call(c, u, v);
      o.a = call(a, u, v);
    });
  }
  /** Filled disc. c and a may be functions of (d: 0 center to 1 rim, angle). */
  circle(cx, cy, r, c, a = 1) {
    if (r < 0.6) return this.dot(cx, cy, call(c, 0, 0), call(a, 0, 0));
    this.shade(cx - r, cy - r, cx + r, cy + r, (x, y, o) => {
      const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
      if (d2 > r * r) return;
      const d = Math.sqrt(d2) / r, ang = Math.atan2(dy, dx);
      o.c = call(c, d, ang);
      o.a = call(a, d, ang);
    });
  }
  /** Ellipse. c and a may be functions of (d: 0 center to 1 rim, angle). */
  ellipse(cx, cy, rx, ry, c, a = 1) {
    if (rx <= 0 || ry <= 0) return;
    this.shade(cx - rx, cy - ry, cx + rx, cy + ry, (x, y, o) => {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, d2 = dx * dx + dy * dy;
      if (d2 > 1) return;
      const d = Math.sqrt(d2), ang = Math.atan2(dy, dx);
      o.c = call(c, d, ang);
      o.a = call(a, d, ang);
    });
  }
  /** Ring from radius r - w to r. c and a may be functions of (v: 0 inner to 1 outer, angle). */
  ring(cx, cy, r, w, c, a = 1) {
    const r0 = Math.max(0, r - w);
    this.shade(cx - r, cy - r, cx + r, cy + r, (x, y, o) => {
      const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
      if (d2 > r * r || d2 < r0 * r0) return;
      const v = w > 0 ? (Math.sqrt(d2) - r0) / (r - r0 || 1) : 1, ang = Math.atan2(dy, dx);
      o.c = call(c, v, ang);
      o.a = call(a, v, ang);
    });
  }
  /**
   * Band of a ring from angle a0 to a1 (radians, a1 > a0), radius r - w to r: the slash and smear shape.
   * c and a may be functions of (u: 0 at a0 to 1 at a1, v: 0 inner to 1 outer). w can be a function of u
   * for a crescent that tapers at both ends.
   */
  arc(cx, cy, r, w, a0, a1, c, a = 1) {
    const span = a1 - a0, wf = typeof w === "function";
    this.shade(cx - r, cy - r, cx + r, cy + r, (x, y, o) => {
      const dx = x - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy);
      if (d > r) return;
      let ang = Math.atan2(dy, dx) - a0;
      ang -= Math.floor(ang / (Math.PI * 2)) * Math.PI * 2;
      if (ang > span) return;
      const u = ang / span, ww = wf ? w(u) : w;
      if (ww <= 0 || d < r - ww) return;
      const v = (d - (r - ww)) / ww;
      o.c = call(c, u, v);
      o.a = call(a, u, v);
    });
  }
  /** Filled rectangle. */
  rect(x, y, w, h, c, a = 1) {
    if (this.sn === 0) {
      const X0 = Math.round(x), Y0 = Math.round(y), X1 = Math.round(x + w), Y1 = Math.round(y + h);
      for (let yy = Y0; yy < Y1; yy++) for (let xx = X0; xx < X1; xx++) this.put(this.cellX(xx, yy), this.cellY(xx, yy), c, a);
      return;
    }
    this.shade(x, y, x + w, y + h, (lx, ly, o) => {
      if (lx < x || ly < y || lx >= x + w || ly >= y + h) return;
      o.c = c; o.a = a;
    });
  }
  /** Filled polygon from points [[x, y], ...] (even-odd rule). */
  poly(pts, c, a = 1) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const n = pts.length;
    this.shade(x0, y0, x1, y1, (x, y, o) => {
      let inside = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (!inside) return;
      o.c = call(c, x, y);
      o.a = call(a, x, y);
    });
  }
  tri(x0, y0, x1, y1, x2, y2, c, a = 1) { this.poly([[x0, y0], [x1, y1], [x2, y2]], c, a); }

  // ---- light
  /** Radial glow into the light buffer: k at the center, falling to 0 at radius r. */
  glow(x, y, r, c, k = 0.5) {
    if (r < 1 || k <= 0.004) return;
    const cx = this.toX(x, y), cy = this.toY(x, y);
    const x0 = Math.floor(cx - r), x1 = Math.ceil(cx + r), y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r);
    for (let sy = y0; sy <= y1; sy++) {
      const dy = (sy + 0.5 - cy) / r;
      for (let sx = x0; sx <= x1; sx++) {
        const dx = (sx + 0.5 - cx) / r, d = dx * dx + dy * dy;
        if (d >= 1) continue;
        const f = 1 - Math.sqrt(d);
        this.add(sx, sy, c, f * f * k);
      }
    }
  }
  /** Glow around a segment (a soft beam of light). */
  glowLine(x0, y0, x1, y1, r, c, k = 0.5) {
    if (r < 1 || k <= 0.004) return;
    const ax = this.toX(x0, y0), ay = this.toY(x0, y0), bx = this.toX(x1, y1), by = this.toY(x1, y1);
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
    const X0 = Math.floor(Math.min(ax, bx) - r), X1 = Math.ceil(Math.max(ax, bx) + r);
    const Y0 = Math.floor(Math.min(ay, by) - r), Y1 = Math.ceil(Math.max(ay, by) + r);
    for (let sy = Y0; sy <= Y1; sy++)
      for (let sx = X0; sx <= X1; sx++) {
        const px = sx + 0.5, py = sy + 0.5, u = clamp(((px - ax) * dx + (py - ay) * dy) / L2);
        const ex = ax + dx * u - px, ey = ay + dy * u - py, d = Math.sqrt(ex * ex + ey * ey) / r;
        if (d >= 1) continue;
        const f = 1 - d;
        this.add(sx, sy, c, f * f * k);
      }
  }
  /** Glow hugging a circle of radius R (a shockwave's light), falling off over width r. */
  glowRing(x, y, R, r, c, k = 0.5) {
    if (r < 1 || k <= 0.004) return;
    const cx = this.toX(x, y), cy = this.toY(x, y), E = R + r;
    for (let sy = Math.floor(cy - E); sy <= Math.ceil(cy + E); sy++)
      for (let sx = Math.floor(cx - E); sx <= Math.ceil(cx + E); sx++) {
        const d = Math.abs(Math.hypot(sx + 0.5 - cx, sy + 0.5 - cy) - R) / r;
        if (d >= 1) continue;
        const f = 1 - d;
        this.add(sx, sy, c, f * f * k);
      }
  }

  // ---- sprites, text, masks
  /**
   * A little sprite from strings: rows like ["..##..", ".#oo#."], pal maps characters to colors
   * ({ "#": "#222034", o: 0xff... }); "." and " " are empty. Top-left at (x, y).
   * opts: { scale, a, flip (mirror left-right), flipY (upside down), tint (draw every pixel in one color) }.
   */
  sprite(rows, pal, x, y, opts = {}) {
    let s = sprites.get(rows);
    if (!s) sprites.set(rows, (s = rows.map((r) => [...r])));
    const k = opts.scale ?? 1, a = opts.a ?? 1, W = s[0]?.length ?? 0, cache = {};
    for (let r = 0; r < s.length; r++)
      for (let q = 0; q < s[r].length; q++) {
        const ch = s[r][q];
        if (ch === "." || ch === " ") continue;
        let c = opts.tint;
        if (c === undefined) {
          c = cache[ch];
          if (c === undefined) c = cache[ch] = pal[ch] === undefined ? 0 : hex(pal[ch]);
        }
        if (!c) continue;
        const col = opts.flip ? W - 1 - q : q, row = opts.flipY ? s.length - 1 - r : r;
        if (k === 1) this.dot(x + col, y + row, c, a);
        else this.rect(x + col * k, y + row * k, k, k, c, a);
      }
  }
  /**
   * Pixel text. opts: { font: "mini" (3x5) | "big" (5x7), scale, align: "left" | "center" | "right",
   * outline: color, shadow: color, a }. (x, y) is the top of the text, at the left, center or right.
   */
  text(str, x, y, c, opts = {}) {
    const font = opts.font ?? "mini", k = opts.scale ?? 1, a = opts.a ?? 1, w = textWidth(str, font) * k;
    const left = Math.round(opts.align === "center" ? x - w / 2 : opts.align === "right" ? x - w : x), top = Math.round(y);
    const ol = opts.outline, sh = opts.shadow;
    if (ol !== undefined) rasterText(str, font, (gx, gy) => this.rect(left + gx * k - 1, top + gy * k - 1, k + 2, k + 2, ol, a));
    if (sh !== undefined) rasterText(str, font, (gx, gy) => this.rect(left + gx * k + 1, top + gy * k + 1, k, k, sh, a));
    rasterText(str, font, (gx, gy) => this.rect(left + gx * k, top + gy * k, k, k, call(c, gx, gy), a));
  }
  /** Size of text in pixels: [w, h]. */
  measure(str, opts = {}) {
    const k = opts.scale ?? 1;
    return [textWidth(str, opts.font ?? "mini") * k, FONTS[opts.font ?? "mini"].h * k];
  }
  /** Fill a mask ({ w, h, data }) with its top-left at (x, y). c may be a function of (mx, my). */
  mask(m, x, y, c, a = 1) {
    for (let my = 0; my < m.h; my++)
      for (let mx = 0; mx < m.w; mx++) if (m.data[my * m.w + mx]) this.dot(x + mx, y + my, call(c, mx, my), call(a, mx, my));
  }
  /** The 1 px outline just outside a mask. */
  outline(m, x, y, c, a = 1) {
    const at = (mx, my) => mx >= 0 && my >= 0 && mx < m.w && my < m.h && m.data[my * m.w + mx];
    for (let my = -1; my <= m.h; my++)
      for (let mx = -1; mx <= m.w; mx++)
        if (!at(mx, my) && (at(mx - 1, my) || at(mx + 1, my) || at(mx, my - 1) || at(mx, my + 1)))
          this.dot(x + mx, y + my, call(c, mx, my), call(a, mx, my));
  }
}
return { Painter };
})();

// ======================================================================================================================
// PIXELFX · ACTEUR  —  pixelfx/src/core/actor.js
// requis par fx.js (non utilisé par le personnage)
// ======================================================================================================================
const M_actor_pfx = (() => {
const { hex } = M_color_pfx;
// A stock character to try effects on: status effects wrap its silhouette, hits land on it, auras sit
// behind it. Previews and the gallery draw it; effects only read its mask through o.actor.

const HERO = [
  "....kkkkk...",
  "..kkhhhhhk..",
  ".khhhhhhhhk.",
  ".khhhhhhhhhk",
  ".khhssssshhk",
  ".khsessesshk",
  ".khsessesshk",
  "..ksssssssk.",
  "...kkSSSkk..",
  "..kttttttk..",
  ".kttTttTttk.",
  ".ksttTTttsk.",
  ".kstttttttk.",
  "..kbbbbbbk..",
  "..kppkkppk..",
  "..kppk.kppk.",
  "..kppk.kppk.",
  "..koook.kook",
  "..kkkkk.kkkk",
];
const HERO_PAL = {
  k: "#17121f", h: "#7a4128", s: "#f3c49d", S: "#c98b6c", e: "#17121f",
  t: "#5f6f94", T: "#46536f", b: "#8a5a32", p: "#38334a", o: "#6a4030",
  // the 2x character's extra detail
  H: "#a35d34", w: "#ffffff", m: "#a3564a", g: "#e8c060", L: "#7f90b6", O: "#8f5a3f", P: "#4b4560",
  // the scarf
  c: "#f53cd1", C: "#ff8fe6", D: "#a31f8a",
};
// the dummy: a neutral shell that lets any effect's colors do the talking, near and far limbs, dark bands at the joints, a small mark
const DUMMY_PAL = {
  k: "#0e0c14", A: "#e4e6ec", B: "#b6b9c3", C: "#868995", D: "#5c5e6a", E: "#6e707c", F: "#4b4d58", G: "#34353f", J: "#2a2b33", m: "#f53cd1",
};
// The same character at twice the size (24 x 38), standing easy: the rest pose of src/core/rig.js, baked.
const HERO2 = [
  "...........kkk..........",
  "..........kAABk.........",
  ".........kAAABJk........",
  ".........kABBJJk........",
  ".........kBBBJCDk.......",
  ".........kBCJDDDk.......",
  ".........kkJJJDk........",
  ".......kkkkABBJCkk......",
  "......kAABCJBCCCkDk.....",
  "......kABBCJCCCmDkDk....",
  "......kBBCDDJCDDDkDk....",
  "......kABCDJDDDDDkk.....",
  ".....kAABDkDDDDJkk......",
  ".....kABCDkDDJJGkk......",
  ".....kABCkJJJGGGkk......",
  "....kJJCDkFFFGGGk.......",
  "....kAJJDkJJJGGGk.......",
  "....kJCJJkABBJGGk.......",
  ".....kJCCkBBCDJJJk......",
  ".....kCCCJBBCDJJDk......",
  ".....kCCCDJCCDkJDDk.....",
  "......kCDDJBCDkDDDk.....",
  ".......kDJJJCDkDDDkk....",
  ".......kJBCJCDkDDDkk....",
  ".......kBDJBCDkCDDkk....",
  "........kJJBCDkCDDk.....",
  "........kBBBCDkCCDDk....",
  "........kBBBCDkCCDDk....",
  ".........kBBCDkJDDDk....",
  "........kBJJJJkCJJJk....",
  "........kBBCCDkCCDDk....",
  "........kBBCDDkCDDk.....",
  "........kBBCDkCCDDk.....",
  "........kBCCDkCCDDk.....",
  "........kBCDDkCDDDk.....",
  ".......kJBCJkkkDJkkkk...",
  ".......kAJJAAAAkCCCCCk..",
  "........kkkkkkkkkkkkk...",
];


function maskOf(rows, k = 1) {
  const h = rows.length * k, w = rows[0].length * k, data = new Uint8Array(w * h);
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === ".") return;
    for (let j = 0; j < k * k; j++) data[(y * k + ((j / k) | 0)) * w + x * k + (j % k)] = 1;
  }));
  return { w, h, data };
}

const MASKS = { 1: maskOf(HERO, 1), 2: maskOf(HERO2, 1) };
const SPRITES = { 1: HERO, 2: HERO2 };
// the character's own colors, row by row (0 where empty), for effects that recolor it: frozen, poisoned, stone
function pixelsOf(rows, pal) {
  const w = rows[0].length, data = new Uint32Array(w * rows.length);
  rows.forEach((r, y) => [...r].forEach((ch, x) => (data[y * w + x] = ch === "." ? 0 : hex(pal[ch]))));
  return data;
}
const PIXELS = { 1: pixelsOf(HERO, HERO_PAL), 2: pixelsOf(HERO2, DUMMY_PAL) };

/**
 * The stock actor at scale k (1: 12 x 19 px, 2: 24 x 38 px), in local space with its feet at (0, 0):
 * { mask, x, y (top-left of the mask), w, h, k, head: [x, y] (top of the head), chest: [x, y] }.
 */
function stockActor(k = 1) {
  k = k === 2 ? 2 : 1;
  const m = MASKS[k], x = -Math.floor(m.w / 2), y = -m.h;
  return { mask: m, pixels: PIXELS[k], x, y, w: m.w, h: m.h, k, head: [0, y], chest: [0, k === 2 ? -26 : y + 11], ...(k === 2 ? { eyes: [[13, 3], [15, 3]] } : {}) };
}

/** Draw the stock actor with its feet at the painter's origin, at alpha a (dithered). */
function drawActor(p, actor = stockActor(), a = 1) {
  if (a > 0) p.sprite(SPRITES[actor.k === 2 ? 2 : 1], actor.k === 2 ? DUMMY_PAL : HERO_PAL, actor.x, actor.y, { a });
}
/** How visible an effect wants the stand-in character at time t (effects may export actorAlpha). */
const actorAlphaOf = (mod, t, o) => (typeof mod.actorAlpha === "function" ? mod.actorAlpha(t, o) : 1);
return { HERO, HERO2, HERO_PAL, DUMMY_PAL, stockActor, drawActor, actorAlphaOf };
})();

// ======================================================================================================================
// PIXELFX · IMAGES  —  pixelfx/src/core/fx.js
// createFrame / clearFrame / painterFor / composite : l’image où l’on dessine
// ======================================================================================================================
const M_fx_pfx = (() => {
const { Painter } = M_painter_pfx;
const { clamp } = M_math_pfx;
const { stockActor } = M_actor_pfx;
const { fit, toHex } = M_color_pfx;
// Frames and live effect instances.





/**
 * A frame: w x h pixels whose top-left sits at (ox, oy) in world space. `color` holds opaque pixels,
 * `light` additive glow; composite() puts them together. Same shape as Sprite Fusion's VFX frames.
 */
function createFrame(w, h, ox = 0, oy = 0) {
  return { w, h, ox, oy, color: new Uint32Array(w * h), light: new Uint32Array(w * h) };
}
function clearFrame(f) {
  f.color.fill(0);
  f.light.fill(0);
  return f;
}

const painters = new WeakMap();
/** The painter for a frame (one per frame, reused). */
function painterFor(frame) {
  let p = painters.get(frame);
  if (!p) painters.set(frame, (p = new Painter(frame)));
  return p.reset();
}

const FADE = 0.3;

const isRamp = (v) => Array.isArray(v) && v.length > 0 && v.every((c) => typeof c === "number" || /^#[0-9a-f]{3,8}$/i.test(c));

/**
 * An effect's options: its defaults with the caller's on top. Any color ramp (palette, or another ramp option
 * like dust or smoke) of a different length than its default is resampled to the default's length, so effects
 * can index steps by number whatever a caller passes.
 */
function resolveOptions(meta, o = {}) {
  const opts = { ...(meta.options ?? {}), ...o };
  for (const [k, def] of Object.entries(meta.options ?? {}))
    if (isRamp(def) && isRamp(o[k]) && o[k].length !== def.length) opts[k] = fit(o[k], def.length).map(toHex);
  if (meta.actor && !opts.actor) opts.actor = stockActor(meta.actor === 2 ? 2 : 1);
  return opts;
}

/**
 * A live instance of an effect module: { update(dt), draw(frame, layer), stop(), done() }.
 * o: { x, y, flip, angle, seed, palette, light (glow strength), actor, ...the effect's own options }.
 * draw(frame, "back") draws what goes behind a character, "front" what goes in front, nothing both.
 */
function createFx(mod, o = {}) {
  const meta = mod.meta ?? {};
  const opts = resolveOptions(meta, o);
  const impl = mod.create ? mod.create(opts) : mod;
  const D = meta.duration ?? 1;
  let t = 0, stopAt = Infinity;
  return {
    meta,
    options: opts,
    get t() {
      return t;
    },
    update(dt) {
      t += dt;
      if (!impl.update) return;
      // simulations step at 120 Hz or finer whatever the caller's frame rate, so they look the same everywhere
      const n = Math.max(1, Math.ceil(dt * 120 - 1e-9));
      for (let i = 0; i < n; i++) impl.update(dt / n, opts);
    },
    draw(frame, layer) {
      const p = painterFor(frame);
      p.place(opts.x ?? 0, opts.y ?? 0, !!opts.flip, opts.angle ?? 0);
      p.fade = stopAt === Infinity ? 1 : clamp(1 - (t - stopAt) / FADE);
      p.lightK = opts.light ?? 1;
      const tt = meta.loop ? t % D : Math.min(t, D);
      if (layer !== "front" && impl.drawBack) {
        p.layer = "back";
        impl.drawBack(p, tt, opts);
      }
      if (layer !== "back") {
        p.layer = "front";
        impl.draw(p, tt, opts);
      }
    },
    /** Let it end: loops fade out, one-shots cut short. */
    stop() {
      if (stopAt === Infinity) stopAt = t;
    },
    done() {
      return t - stopAt >= FADE || (!meta.loop && t >= D);
    },
  };
}

/**
 * Color over a background, plus light, into RGBA bytes (a Uint8ClampedArray or Buffer, w * h * 4).
 * bg: null for transparent, a color number, or a Uint32Array of the frame's size. Over transparency, light
 * becomes color with alpha (its brightest channel), which reads as additive over dark backgrounds.
 */
function composite(f, out, bg = null, lightK = 1) {
  const n = f.w * f.h, C = f.color, L = f.light, flat = typeof bg === "number";
  for (let i = 0; i < n; i++) {
    const c = C[i], l = L[i] & 0xffffff;
    let r, g, b, a;
    const ca = c >>> 24;
    if (ca === 255) {
      r = c & 255; g = (c >>> 8) & 255; b = (c >>> 16) & 255; a = 255;
    } else if (bg === null) {
      // translucent color over nothing keeps its alpha
      r = c & 255; g = (c >>> 8) & 255; b = (c >>> 16) & 255; a = ca;
    } else {
      const k = flat ? bg : bg[i], f = ca / 255;
      r = (c & 255) * f + (k & 255) * (1 - f); g = ((c >>> 8) & 255) * f + ((k >>> 8) & 255) * (1 - f);
      b = ((c >>> 16) & 255) * f + ((k >>> 16) & 255) * (1 - f); a = 255;
    }
    if (l) {
      const lr = (l & 255) * lightK, lg = ((l >>> 8) & 255) * lightK, lb = ((l >>> 16) & 255) * lightK;
      if (a < 255) {
        // over transparency: premultiply what's there, add the light, divide by the new alpha
        const pa = a / 255, pr = r * pa + lr, pg = g * pa + lg, pb = b * pa + lb;
        const na = Math.min(1, Math.max(pa, Math.max(lr, lg, lb) / 255));
        if (na > 0) { r = Math.min(255, pr / na); g = Math.min(255, pg / na); b = Math.min(255, pb / na); a = na * 255; }
      } else {
        r = Math.min(255, r + lr); g = Math.min(255, g + lg); b = Math.min(255, b + lb);
      }
    }
    const j = i * 4;
    out[j] = r; out[j + 1] = g; out[j + 2] = b; out[j + 3] = a;
  }
  return out;
}
return { createFrame, clearFrame, painterFor, resolveOptions, createFx, composite };
})();

// pixelfx core (ce que les effets importent de "pixelfx/src/core/index.js", réduit à ce dont le personnage a besoin)
const PIXELFX = { ...M_math_pfx, ...M_color_pfx, ...M_particles_pfx, ...M_painter_pfx, ...M_fx_pfx };

// ======================================================================================================================
// LE BLOB : SON APPARENCE ET SON REPOS  —  src/blob/blob.js
// ses réglages (meta.options : corps, mouvement, yeux, lumière, particules), sa forme qui ondule (shapeOf), où il est (state), son corps éclairé, ses yeux, son halo, ses étincelles, ses gouttes et poussières de lumière
// ======================================================================================================================
const M_blob = (() => {
const { fit, cycle, clamp, noise2, rng, TAU, WHITE, hex } = PIXELFX;
// The creature once born: a blob of ice-light floating in place, its body never settling, wandering a little
// around its spot, squashing and stretching as it bobs, eyes that blink and look about. Everything random comes
// from noise read along a circle of time, and every cycle is a whole number of turns a loop: no seam, ever.

const meta = {
  name: "Ice blob idle",
  desc: "A born blob of ice-light levitating: an unstable, wandering body that squashes as it bobs, with blinking eyes that look about, a halo and dripping light.",
  tags: ["creature", "blob", "idle", "ice", "spirit", "light", "eyes", "loop"],
  size: [176, 176],
  origin: [88, 88],
  duration: 4,
  loop: true,
  fps: 30,
  bg: "black",
  options: {
    palette: ["#081026", "#102654", "#1a4a90", "#2c7ccc", "#58b6ee", "#9fe0ff", "#dcf8ff", "#ffffff"],
    seed: 7,
    duration: 4,
    // body
    size: 24, wobble: 0.3, detail: 0.85, chaos: 0.7, shapeTurns: 1, drip: 0.18, width: 1, stretch: 0.6, breath: 1, breathTurns: 2,
    // movement
    hover: 6, hoverTurns: 2, sway: 3, swayTurns: 1, wander: 5, wanderChaos: 0.6, tilt: 0.5,
    // eyes
    eyes: 2, eyeShape: "round", eyeStyle: "dark", eyeSize: 4.5, eyeSpacing: 0.42, eyeHeight: 0.18, eyeTall: 1.35,
    eyeColor: "#0a1430", pupilColor: "#081026", blinks: 2, blinkLength: 0.12, look: 1, lookTurns: 1, follow: 1, eyeGlow: 0.6,
    // light
    rim: 1, lightAngle: 233, currents: 1, nucleus: 0.6, halo: 1, shell: 1, ground: 0.7, groundDist: 1.9,
    // particles
    drips: 6, sparks: 3, sparkRadius: 1.6, motes: 18,
  },
};

const ln = (x, y, u, s, r = 1.2) => noise2(x + Math.cos(TAU * u) * r, y + Math.sin(TAU * u) * r, s);
const turns = (v) => Math.max(0, Math.round(v));

// what an action can lay over the idle; all neutral here, so the idle is the action at rest. ax, ay move the whole
// creature (body, its light on the ground, drops, motes): drawn there at rest, it is the rest drawn ax, ay farther
const NONE = Object.freeze({ dx: 0, dy: 0, ax: 0, ay: 0, rot: 0, sx: 1, sy: 1, grow: 1, morph: 0, shut: 0, happy: 0, halo: 1, glow: 0, lookX: 0, lookY: 0, quiet: 0, eyeScale: 1 });
const modAt = (M, t) => (M ? { ...NONE, ...M(t) } : NONE);

// where the body is at phase u: bob, sway and a noise wander
function posAt(o, u) {
  const R = rng(o.seed, 3), ph = R.range(0, TAU);
  const x = Math.sin(TAU * u * turns(o.swayTurns) + ph) * o.sway + (ln(3.1, 7.7, u, o.seed + 1, o.wanderChaos) - 0.5) * 2.4 * o.wander;
  const y = -Math.sin(TAU * u * turns(o.hoverTurns)) * o.hover + (ln(9.4, 1.3, u, o.seed + 2, o.wanderChaos) - 0.5) * 1.6 * o.wander;
  return [x, y];
}

function state(o, t, M) {
  const D = o.duration, m = modAt(M, t), u = (((t / D) % 1) + 1) % 1, e = 0.004;
  const at = (tt) => { const mm = modAt(M, tt), [ix, iy] = posAt(o, tt / D); return [ix + mm.dx + mm.ax, iy + mm.dy + mm.ay]; };
  const [x, y] = at(t), [x0, y0] = at(t - e * D), [x1, y1] = at(t + e * D);
  const vx = (x1 - x0) / (2 * e * o.duration), vy = (y1 - y0) / (2 * e * o.duration); // px a second
  // squash and stretch: moving up or down stretches it tall, the turn at the top and bottom squashes it
  const sv = clamp(vy / 40, -1, 1) * o.stretch, st = 1 + Math.abs(sv) * 0.12 - 0.04 * o.stretch * Math.cos(TAU * u * turns(o.hoverTurns) * 2);
  const breath = 1 + 0.03 * o.breath * Math.sin(TAU * u * turns(o.breathTurns));
  return { u, t, m, x, y, vx, vy, grow: m.grow, sy: st * breath * m.sy * m.grow, sx: (breath / Math.sqrt(st)) * m.sx * m.grow, tilt: clamp(-vx / 60, -0.4, 0.4) * o.tilt + m.rot };
}

// the outline as a table over angle, in the body's own (unsquashed) space
const TABLE = 512;
function shapeOf(o, u) {
  const tab = new Float32Array(TABLE + 1), k = turns(o.shapeTurns) || 1;
  for (let j = 0; j <= TABLE; j++) {
    const th = (j / TABLE) * TAU - Math.PI, c = Math.cos(th), s = Math.sin(th);
    const n = noise2(c * o.detail + Math.cos(TAU * u * k) * o.chaos, s * o.detail + Math.sin(TAU * u * k) * o.chaos, o.seed + 9) - 0.5;
    const n2 = noise2(c * o.detail * 2.3 + 40 + Math.cos(TAU * u * k * 2) * o.chaos * 0.6, s * o.detail * 2.3 + Math.sin(TAU * u * k * 2) * o.chaos * 0.6, o.seed + 19) - 0.5;
    let r = 1 + o.wobble * (n * 0.9 + n2 * 0.35);
    r += o.drip * Math.max(0, s) ** 3; // heavier at the bottom: a drop that floats
    r *= 1 + (o.width - 1) * c * c;
    tab[j] = Math.max(0.2, r) * o.size;
  }
  return (th) => {
    const f = ((((th + Math.PI) % TAU) + TAU) % TAU) / TAU * TABLE, i = Math.min(TABLE - 1, Math.floor(f)), w = f - i;
    return tab[i] + (tab[i + 1] - tab[i]) * w;
  };
}

// body space <-> screen: squash then tilt, around the body's centre
const toBody = (st, dx, dy) => {
  const c = Math.cos(-st.tilt), s = Math.sin(-st.tilt), x = dx * c - dy * s, y = dx * s + dy * c;
  return [x / st.sx, y / st.sy];
};
const toScreen = (st, bx, by) => {
  const x = bx * st.sx, y = by * st.sy, c = Math.cos(st.tilt), s = Math.sin(st.tilt);
  return [st.x + x * c - y * s, st.y + x * s + y * c];
};

function aura(p, C, o, st, rad) {
  const S = o.size * st.grow, m = st.m, H = o.halo * m.halo;
  p.glow(st.x, st.y, S * 3.2, C[2], 0.3 * H);
  p.glow(st.x, st.y, S * 2, C[4], 0.22 * H + 0.3 * m.glow);
  if (o.ground > 0) {
    // a pool of its light on the ground below: brighter when it dips close
    // (moved elsewhere, ay, its ground goes with it)
    const g0 = o.size * o.groundDist + o.hover + Math.max(0, m.dy), gy = g0 + m.ay, near = clamp(1 - (gy - st.y) / (g0 + o.hover + 1) + 0.5);
    for (let i = 0; i < 3; i++) p.glow(st.x, gy, S * (1.2 - i * 0.3), C[4 + i], 0.18 * o.ground * near);
    p.shade(st.x - S * 1.6, gy - 3, st.x + S * 1.6, gy + 3, (x, y, out) => {
      const d = Math.hypot((x - st.x) / (S * (1.3 - 0.3 * near)), (y - gy) / 2.4);
      if (d > 1) return;
      out.c = 0; out.l = C[5]; out.k = (1 - d) ** 2 * 0.35 * o.ground * near;
    });
  }
  if (o.shell > 0) {
    const E = S * 2.6;
    p.shade(st.x - E, st.y - E, st.x + E, st.y + E, (x, y, out) => {
      const [bx, by] = toBody(st, x - st.x, y - st.y), th = Math.atan2(by, bx), r = Math.hypot(bx, by), e = rad(th), d = (r - e) / (o.size * 0.55);
      if (d < 0 || d > 1) return;
      out.c = 0; out.l = d < 0.2 ? C[6] : d < 0.5 ? C[5] : C[4];
      out.k = (1 - d) ** 2 * (0.32 * o.shell + 0.4 * m.glow);
    });
  }
}

function body(p, C, o, st, rad) {
  if (st.grow < 0.03) return;
  const S = o.size, u = st.u, la = (o.lightAngle * Math.PI) / 180 - st.tilt, lx = Math.cos(la), ly = Math.sin(la), boost = st.m.glow;
  const nx = Math.cos(TAU * u) * S * 0.1 - S * 0.12, ny = Math.sin(TAU * u * 2) * S * 0.06 + S * 0.15, E = S * 2.6 * Math.max(st.sx, st.sy, 0.3);
  const inside = (x, y) => { const [bx, by] = toBody(st, x - st.x, y - st.y); return Math.hypot(bx, by) <= rad(Math.atan2(by, bx)); };
  for (let y = Math.floor(st.y - E); y <= Math.ceil(st.y + E); y++)
    for (let x = Math.floor(st.x - E); x <= Math.ceil(st.x + E); x++) {
      const px = x + 0.5, py = y + 0.5, [bx, by] = toBody(st, px - st.x, py - st.y), th = Math.atan2(by, bx), e = rad(th), r = Math.hypot(bx, by);
      if (r > e) continue;
      const ux = bx / e, uy = by / e, d = r / e;
      const rimPx = !inside(px - 1, py) || !inside(px + 1, py) || !inside(px, py - 1) || !inside(px, py + 1);
      if (rimPx) {
        const lit = ux * lx + uy * ly;
        p.px(px, py, lit > 0.35 && o.rim > 0 ? WHITE : lit > -0.25 ? C[6] : C[4]);
        continue;
      }
      // a second, inner rim one pixel in on the lit side: the glassy thickness
      const cur = o.currents > 0 ? ln(bx * 0.09, by * 0.09, u, o.seed + 23, 1.4) : 0.5;
      const dn = Math.hypot(bx - nx, by - ny) / S;
      const lit = 0.48 + boost * 0.45 + (ux * lx + uy * ly) * 0.38 * o.rim + (1 - d) * 0.22 + (cur - 0.5) * 0.32 * o.currents + Math.max(0, 0.42 - dn) * 1.3 * o.nucleus;
      const i = clamp(Math.round(1.5 + lit * 5), 2, 7);
      p.px(px, py, i === 7 ? WHITE : C[i]);
    }
  if (o.nucleus > 0) {
    const [gx, gy] = toScreen(st, nx, ny);
    p.glow(gx, gy, S * 0.8 * st.grow, C[6], 0.3 * o.nucleus + 0.4 * boost);
  }
  // a highlight blob on the lit shoulder
  if (o.rim > 0) {
    const th = la, e = rad(th) * 0.62, [hx, hy] = toScreen(st, Math.cos(th) * e, Math.sin(th) * e);
    const g = st.grow, sl = la + st.tilt;
    if (g > 0.35) {
      p.disc(hx, hy, Math.max(1, S * 0.12 * g), WHITE, 0.85 * Math.min(1, o.rim));
      p.px(hx + Math.cos(sl + 1.7) * S * 0.22 * g, hy + Math.sin(sl + 1.7) * S * 0.22 * g, WHITE);
    }
  }
}

// blink amount (0 open .. 1 shut) at phase u: a few blinks a loop at seeded times, sometimes a double one
function blinkAt(o, u) {
  const n = turns(o.blinks);
  let shut = 0;
  for (let i = 0; i < n; i++) {
    const g = rng(o.seed, 41, i), c = (i + g.range(0.2, 0.8)) / n, L = Math.max(0.01, o.blinkLength / o.duration);
    for (const off of g.chance(0.3) ? [0, L * 1.6] : [0]) {
      let d = u - (c + off);
      d -= Math.round(d);
      const k = Math.abs(d) / (L / 2);
      if (k < 1) shut = Math.max(shut, Math.sin((1 - k) * Math.PI * 0.5) ** 0.6);
    }
  }
  return shut;
}

function eyes(p, C, o, st, rad) {
  const n = Math.max(0, Math.min(3, Math.round(o.eyes))), m = st.m;
  if (!n || st.grow < 0.35) return;
  const S = o.size, u = st.u;
  const look = [(ln(1.7, 4.2, u * turns(o.lookTurns || 1), o.seed + 51, 1.1) - 0.5) * 2 * o.look + m.lookX, (ln(6.2, 2.9, u * turns(o.lookTurns || 1), o.seed + 52, 1.1) - 0.5) * 1.4 * o.look + m.lookY];
  // the face turns toward where it's going
  const fx = clamp(st.vx / 30, -1, 1) * o.follow * S * 0.12 + look[0] * S * 0.06, fy = clamp(st.vy / 40, -1, 1) * o.follow * S * 0.05 + look[1] * S * 0.04;
  const shut = Math.max(blinkAt(o, u), m.shut), R = o.eyeSize * Math.min(1.6, st.grow) * m.eyeScale, eyeC = hex(o.eyeColor), pupC = hex(o.pupilColor);
  const xs = n === 1 ? [0] : n === 2 ? [-1, 1] : [-1, 0, 1];
  xs.forEach((k, idx) => {
    const ex = k * S * o.eyeSpacing * (n === 3 ? 1.25 : 1) + fx, ey = -S * o.eyeHeight + fy - (n === 3 && k === 0 ? S * 0.12 : 0);
    const ea = Math.atan2(ey, ex), er = Math.hypot(ex, ey), lim = rad(ea) - (R / Math.max(0.35, st.grow)) * 1.6;
    const kk = er > lim && er > 0 ? Math.max(0, lim) / er : 1;
    const [cx, cy] = toScreen(st, ex * kk, ey * kk);
    const rx = R * (o.eyeShape === "almond" ? 1.25 : 1), ry = R * (o.eyeShape === "round" ? 1 : o.eyeTall) * (o.eyeShape === "almond" ? 0.75 : 1) * st.sy;
    const open = 1 - shut;
    const happy = o.eyeShape === "happy" || m.happy > 0.5;
    if (happy || open < 0.18) {
      // closed or happy: an arc of dark line
      const up = happy && open >= 0.18;
      for (let i = -Math.ceil(rx); i <= Math.ceil(rx); i++) {
        const v = i / rx, h = up ? -Math.sqrt(Math.max(0, 1 - v * v)) * ry * 0.6 : Math.sqrt(Math.max(0, 1 - v * v)) * 0.8;
        p.px(cx + i, cy + h, o.eyeStyle === "bright" ? C[1] : eyeC);
        if (Math.abs(v) < 0.6) p.px(cx + i, cy + h, o.eyeStyle === "bright" ? C[1] : eyeC);
      }
      return;
    }
    const hy = ry * open;
    const inEye = (x, y) => {
      const dx = (x - cx) / rx, dy = (y - cy) / hy;
      if (o.eyeShape === "almond") return Math.abs(dx) + dy * dy <= 1 && Math.abs(dy) <= 1 - dx * dx * 0.5;
      return dx * dx + dy * dy <= 1;
    };
    const lookX = look[0] * rx * 0.45, lookY = look[1] * hy * 0.4 + 0;
    for (let y = Math.floor(cy - hy - 1); y <= Math.ceil(cy + hy + 1); y++)
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const px = x + 0.5, py = y + 0.5;
        if (!inEye(px, py)) continue;
        if (o.eyeStyle === "dark") p.px(px, py, eyeC);
        else if (o.eyeStyle === "bright") p.px(px, py, !inEye(px - 1, py) || !inEye(px + 1, py) || !inEye(px, py + 1) || !inEye(px, py - 1) ? C[1] : WHITE);
        else {
          // sclera and a pupil that looks about
          const d = Math.hypot(px - (cx + lookX), py - (cy + lookY)) / (R * 0.58);
          p.px(px, py, d <= 1 ? pupC : !inEye(px, py + 1) ? C[6] : WHITE);
        }
      }
    // the catch-light: always toward the light, and a second smaller one
    if (o.eyeStyle !== "bright") {
      const lx = cx + (o.eyeStyle === "pupil" ? lookX : 0) - rx * 0.35, ly = cy + (o.eyeStyle === "pupil" ? lookY : 0) - hy * 0.4;
      p.px(lx, ly, WHITE);
      if (R >= 3) p.px(lx + 1, ly, WHITE), p.px(lx, ly + 1, WHITE);
      if (R >= 2.5 && open > 0.6) p.px(cx + rx * 0.35, cy + hy * 0.35, C[6]);
    }
    if (o.eyeGlow > 0) p.glow(cx, cy, R * 2.6, o.eyeStyle === "dark" ? C[6] : WHITE, (o.eyeStyle === "dark" ? 0.15 : 0.4) * o.eyeGlow * open);
  });
}

// drops of light gathering under it and falling away, fading
function drips(p, C, t, o, st, rad, M) {
  const D = o.duration, S = o.size;
  cycle(t, D, Math.round(o.drips), o.seed + 61, (g) => Math.min(D * 0.9, g.range(0.9, 1.6)), (age, life, r, i) => {
    const k = age / life, bxo = r.range(-0.55, 0.55) * S, t0 = t - age;
    // it left the body where the body was when it was born, then falls
    if (M && modAt(M, t0).quiet > 0) return;
    const s0 = state(o, M ? t0 : ((t0 % D) + D) % D, M), th = Math.atan2(1, bxo / S), e = rad(th) * 0.95;
    const [sx, sy] = toScreen(s0, Math.cos(th) * e, Math.sin(th) * e);
    const fall = age * age * 26, x = sx + Math.sin(age * 3 + i) * 0.8, y = sy + fall;
    const a = 1 - k;
    if (a < 0.2) return;
    p.px(x, y, k < 0.2 ? WHITE : C[6]);
    if (k < 0.5) p.px(x, y - 1, C[5]);
    p.glow(x, y, 4, C[5], 0.3 * a);
  });
}

// sparks circling it, tilted, passing behind and in front
function sparks(p, C, o, st, front) {
  const n = Math.round(o.sparks);
  for (let i = 0; i < n; i++) {
    const th = TAU * (st.u * (1 + (i % 2)) * (i % 3 === 2 ? -1 : 1) + i / n), d = Math.sin(th);
    if (d >= 0 !== front) continue;
    const R = o.size * o.sparkRadius * (1 + (i % 2) * 0.15), x = st.x + Math.cos(th) * R, y = st.y + d * R * 0.32 - (i % 2 ? 4 : -2);
    p.px(x, y, front ? WHITE : C[5]);
    if (front) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.dot(x + dx, y + dy, C[5], 0.7);
    p.glow(x, y, 5, C[5], front ? 0.4 : 0.2);
  }
}

function motes(p, C, t, o, front, ox = 0, oy = 0) {
  const D = o.duration;
  cycle(t, D, Math.round(o.motes), o.seed + 99, (g) => Math.min(D * 0.95, g.range(1.5, 3)), (age, life, r, i) => {
    if ((i % 2 === 0) !== front) return;
    const k = age / life, a0 = r.range(0, TAU), R = r.range(o.size * 1.3, o.size * 3.2);
    const x = Math.cos(a0) * R + Math.sin(age * r.range(1, 2)) * 2.5, y = Math.sin(a0) * R * 0.8 - age * r.range(4, 9);
    const a = Math.sin(Math.PI * k);
    if (a < 0.25) return;
    p.px(x + ox, y + oy, i % 4 === 0 ? WHITE : front ? C[6] : C[4]);
    if (i % 4 === 0) p.glow(x + ox, y + oy, 4, C[5], 0.25 * a);
  });
}

/** The blob's layers, with an action's modifiers M(t) laid over (null for the plain idle). */
function blobBack(p, t, o, M = null, C = fit(o.palette, 8)) {
  const st = state(o, t, M), rad = shapeOf(o, st.u);
  aura(p, C, o, st, rad);
  sparks(p, C, o, st, false);
  return st;
}
function blobFront(p, t, o, M = null, C = fit(o.palette, 8)) {
  const st = state(o, t, M), rad = shapeOf(o, st.u);
  drips(p, C, t, o, st, rad, M);
  body(p, C, o, st, rad);
  eyes(p, C, o, st, rad);
  sparks(p, C, o, st, true);
  return st;
}
function ambient(p, t, o, front, C = fit(o.palette, 8), off = [0, 0]) { motes(p, C, t, o, front, off[0], off[1]); }

function drawBack(p, t, o) {
  const C = fit(o.palette, 8);
  blobBack(p, t, o, null, C);
  motes(p, C, t, o, false);
}

function draw(p, t, o) {
  const C = fit(o.palette, 8);
  blobFront(p, t, o, null, C);
  motes(p, C, t, o, true);
}

// pieces of the blob reused by other forms (the transformation draws its new body with them)
return { drawEyes: eyes, drawSparks: sparks, drawDrips: drips, blinkAt, meta, state, shapeOf, blobBack, blobFront, ambient, drawBack, draw };
})();

// ====================================================================================================================
// PALETTES — toutes les couleurs que le blob peut avoir (8 couleurs, de l’ombre au reflet)
// ====================================================================================================================
const PAL = PIXELFX.PAL;
/** Les palettes de la page, sous leur nom (comme dans le menu « Couleurs »). */
const PALETTES = {
  "Glace": M_blob.meta.options.palette, // sa couleur de naissance : lumière de glace
  "Arcane": PAL.arcane,  // violet magique
  "Braise": PAL.fire,    // feu, braise
  "Sève": PAL.heal,      // vert de soin
  "Aurore": PAL.holy,    // or lumineux
  "Néon": PAL.neon,      // rose néon
  "Abysse": PAL.shadow,  // ombre violette, très sombre
  "Lagon": PAL.cyber,    // turquoise
  "Sang": PAL.blood,     // rouge sang (7 couleurs, étirées à 8)
};
/** En plus : les autres dégradés de pixelfx, non proposés dans la page mais qui marchent aussi (noms anglais). */
const AUTRES = Object.fromEntries(Object.entries(PAL).filter(([k]) => !Object.values(PALETTES).includes(PAL[k]) && k !== "candy" && k !== "night"));

// ====================================================================================================================
// DÉMO / UTILISATION — dessine le blob au repos dans un canvas (320 × 180 pixels)
// ====================================================================================================================
const SCENE = [320, 180]; // la scène (16:9), en pixels
const SPOT = [160, 90];   // où se tient le blob dans la scène (son centre)
const paletteOf = (p) => (Array.isArray(p) ? p : PALETTES[p] || AUTRES[p] || PALETTES.Glace);
/** Les réglages du blob : une palette (son nom, ou une liste de couleurs) et, au besoin, d’autres réglages (meta.options). */
function options(palette = "Glace", extra = {}) {
  return { ...M_blob.meta.options, palette: [...paletteOf(palette)], ...extra };
}
/** La durée d’une boucle (s) : son repos boucle sur o.duration (4 s par défaut). */
const length = (o = options()) => o.duration;
const FRAME = PIXELFX.createFrame(SCENE[0], SCENE[1]);
/** Une image au temps t (s) dans un canvas (mis à 320 × 180, agrandi en CSS sans flou). bg : le fond (noir pur). */
function render(canvas, t = 0, o = options(), bg = 0x000000) {
  const p = PIXELFX.painterFor(PIXELFX.clearFrame(FRAME));
  p.place(SPOT[0], SPOT[1]);
  p.layer = "back"; M_blob.drawBack(p, t, o);  // derrière : son halo, sa lumière au sol, les poussières de derrière
  p.layer = "front"; M_blob.draw(p, t, o);     // devant : son corps éclairé, ses yeux, ses étincelles, ses gouttes
  const px = PIXELFX.composite(FRAME, new Uint8ClampedArray(SCENE[0] * SCENE[1] * 4), bg);
  if (canvas.width !== SCENE[0] || canvas.height !== SCENE[1]) { canvas.width = SCENE[0]; canvas.height = SCENE[1]; }
  canvas.getContext("2d").putImageData(new ImageData(px, SCENE[0], SCENE[1]), 0, 0);
}
/** Le joue en temps réel, en boucle ; renvoie une fonction qui l’arrête. */
function play(canvas, o = options()) {
  const T = length(o), t0 = performance.now();
  let id = 0, last = -1;
  const tick = (now) => {
    const f = Math.floor((((now - t0) / 1000) % T) * 30);
    if (f !== last) { last = f; render(canvas, f / 30, o); } // 30 images par seconde, comme les exports
    id = requestAnimationFrame(tick);
  };
  id = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(id);
}
const api = { options, length, render, play, PALETTES, AUTRES, SCENE, SPOT, modules: { blob: M_blob, pixelfx: PIXELFX } };
if (typeof window !== "undefined") window.Couveuse = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;

// la démo : un canvas et un bouton par palette, si la page ne fournit pas déjà un élément #couveuse
if (typeof document !== "undefined" && !document.getElementById("couveuse")) {
  const start = () => {
    document.body.style.cssText = "margin:0;background:#000;color:#9fe0ff;font:14px system-ui;display:flex;flex-direction:column;align-items:center;gap:12px;padding:16px";
    const cv = document.createElement("canvas");
    cv.id = "couveuse";
    cv.style.cssText = "width:min(960px,100%);image-rendering:pixelated;background:#000";
    const bar = document.createElement("div");
    bar.style.cssText = "display:flex;flex-wrap:wrap;justify-content:center;gap:6px";
    let stop = null;
    const go = (name) => { if (stop) stop(); stop = play(cv, options(name)); };
    for (const [name, pal] of Object.entries(PALETTES)) {
      const b = document.createElement("button"), c = paletteOf(pal);
      b.textContent = name;
      b.style.cssText = `padding:6px 12px;background:${c[2]};color:${c[c.length - 1]};border:1px solid ${c[4]};border-radius:6px;cursor:pointer`;
      b.onclick = () => go(name);
      bar.append(b);
    }
    document.body.append(cv, bar);
    go("Glace");
  };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
}

})();
