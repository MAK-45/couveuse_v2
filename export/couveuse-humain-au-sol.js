// =====================================================================================================================
//  COUVEUSE — la créature de lumière de glace sous sa FORME HUMAINE AU SOL (sur ses jambes, ses pieds sur un sol de glace)
//  Un seul fichier, autonome, sans dépendance : son APPARENCE, son ATTENTE (debout, statique, il respire et se balance)
//  et sa MARCHE (de profil, sur place, le sol défile sous ses pas), avec l’entrée (il se tourne et démarre) et la sortie
//  (il ralentit, s’arrête et se retourne vers nous).
//
//  Généré à partir du projet (src/ et pixelfx/src/core/) : chaque module garde son code et ses commentaires d’origine
//  (en anglais) dans sa propre portée « const M_xxx = (() => { … })(); ». Les bandeaux en MAJUSCULES disent à quoi
//  sert chaque partie.
//
//  QUI FAIT QUOI
//   1. pixelfx · maths, couleurs, particules, peintre, images ..... les outils de dessin (le peintre de pixels)
//   2. temps partagé (_time.js) .................................... progression, entrée / sortie, retour au repos
//   3. APPARENCE commune : le blob (blob.js) ........................ palette, lumière de glace, yeux, étincelles,
//                                                                     gouttes et poussières de lumière (options de base)
//   4. APPARENCE + POSES de la forme humaine (forms.js) ............. tout le personnage :
//        - meta.options « hu… » / « gr… » : ses réglages (taille, tête, épaules, taille, cheveux, bras, sol…)
//        - human()        : la silhouette humaine (tête, cheveux, torse, bras, mains) en champ de distance
//        - stander()      : la silhouette DEBOUT sur ses jambes (jambes résolues depuis les pieds, genoux, bassin)
//        - grounding() / gravityAt() : la gravité, le sol, où il se tient
//        - gaitK / gaitSolve / gaitLine / (le profil qui marche) : la MARCHE (talon, pied à plat, pointe, genoux,
//          bras qui balancent, cheveux qui suivent, buste penché) — rien ne glisse : un pied posé reste posé
//        - floorFx / gaitFx : le sol de glace, ses reflets, les empreintes de lumière
//        - body() / eyesOf() / aura() / sparksOf() : l’éclairage du corps, les yeux, le halo, les étincelles
//        - mode "live" : l’ATTENTE, une boucle parfaite (il se tient debout, respire, déplace son poids)
//   5. fiches, créature, hôte des boucles ........................... l’animation en trois parties (entrée, boucle, sortie)
//   6. MARCHE : le plan (_gait.js) + la fiche « Marche » (walk.js) ... pas entiers par boucle, réglages de la marche
//   7. DÉMO / UTILISATION (tout en bas) ............................. Couveuse.render(), Couveuse.play()
//
//  UTILISATION
//   Dans une page : <script src="couveuse-humain-au-sol.js"></script> → une démo s’affiche (boutons Attente / Marche…).
//   Ou à la main :
//     const o = Couveuse.options("marche", { gaWalk: 4 });  // "attente" | "marche" | "entree" | "sortie", + réglages
//     Couveuse.render(canvas, "marche", t, o);              // une image au temps t (s), dans un canvas 320 × 180
//     Couveuse.length("marche", o);                         // la durée d’une boucle (s) : t et t + durée sont identiques
//     Couveuse.play(canvas, "attente");                     // la joue en boucle ; renvoie une fonction pour l’arrêter
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
// TEMPS PARTAGÉ  —  src/shared/_time.js
// progression, entrée et sortie (lead-in / lead-out), settle(), phases()
// ======================================================================================================================
const M_time = (() => {
const { seg, ease } = PIXELFX;
// The time every animation of the creature shares: how far along an animation is, and how what it changes goes back
// to rest. Pure helpers, nothing is drawn here.
//
// An animation lasts a whole number of the blob's loops (its length T). prog() is its progress: 0 during the
// lead-in, 1 after the lead-out, the lead-out never shorter than a drop of light lives, so its first and last frames
// are the rest's. An animation in three parts (an entry from rest, a loop, an exit back to rest) has an intensity k
// instead: 0 at rest, 1 in full; settle() draws its modifiers back to rest by k, the same way for every animation, and
// the drawing it adds fades with k (the painter's fade, dithered).

const E = ease.inOutSine;
/** How long a drop of light lives (s): every lead-out outlasts it, so the drops on a last frame fell from the body at rest. */
const DROP_LIFE = 1.7;
/** x wrapped into 0..1. */
const wrap = (x) => ((x % 1) + 1) % 1;
/** The shortest lead-in (s): a frame reads the body's speed a moment either side of it, so nothing may move sooner. */
const LEAD_MIN = 0.12;
/** Where the lead-in ends, as a part of the length T: o.lead, never shorter than LEAD_MIN. */
const leadIn = (o, T) => Math.max(o.lead, LEAD_MIN / T);
/** Where the lead-out starts, as a part of the length T. */
const leadOut = (o, T) => 1 - Math.max(o.lead, Math.min(0.45, DROP_LIFE / T));
/** An animation's progress at t (periodic over its length T): 0 in the lead-in, 1 after the lead-out. */
const prog = (o, t, T) => seg(wrap(t / T), leadIn(o, T), leadOut(o, T));

/** The modifiers that go back to rest by an amount, and their value at rest. The others (poses, happy eyes) switch. */
const NEUTRAL = Object.freeze({ dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, grow: 1, shut: 0, halo: 1, glow: 0, lookX: 0, lookY: 0, eyeScale: 1, armUp: 0, armOpen: 0, hold: 0, reachK: 0 });
/** Modifiers m drawn toward rest by k (1: as they are, 0: nothing left). Happy eyes switch on past 0.6, a reached point stays. */
function settle(m, k) {
  const out = {};
  if (!(k > 0)) return out;
  for (const key in NEUTRAL) if (key in m) out[key] = NEUTRAL[key] + (m[key] - NEUTRAL[key]) * k;
  if (m.happy && k > 0.6) out.happy = m.happy;
  if (m.reach) out.reach = m.reach;
  return out;
}

/**
 * The timetable of one part of a three-part animation, in seconds over its length T (a whole number of the blob's
 * loops): the intensity k (no wrapping: before the part it is what came before, after it what comes next), and, when
 * the body must change pose (a figure sitting down...), a melt into light around the moment the pose switches.
 *   part "enter": rest -> in full. k is 0 until the pose has switched, then rises, and is 1 for the last DROP_LIFE.
 *   part "exit":  in full -> rest. k falls, the pose switches back once k is 0, and the last DROP_LIFE is rest.
 * melt: 0..1 (1 exactly while the pose switches, so nothing of either pose shows), swap: the activity's pose is on,
 * s: 0..1 how far the melt has gone from the pose at rest to the activity's (for where the light gathers).
 */
function phases(part, T, lead = 0.08, pose = false, meltLen = 1.1) {
  const L = pose ? Math.min(meltLen, T * 0.4) : 0, a0 = Math.max(LEAD_MIN, lead * T), full = T - DROP_LIFE;
  if (part === "enter") {
    const m0 = a0, m1 = a0 + L / 2, m2 = a0 + L, r0 = pose ? m1 : a0, r1 = Math.max(r0 + 0.3, full);
    return (t) => ({ k: t <= r0 ? 0 : t >= r1 ? 1 : E((t - r0) / (r1 - r0)), melt: pose ? meltAt(t, m0, m2) : 0, swap: !pose || t >= m1, s: pose ? E(seg(t, m0, m2)) : 1 });
  }
  // exit: k falls over [f0, f1]; the pose switches back at f1 (k = 0 there), the melt around it; rest after
  const n2 = Math.max(0.6, full), n1 = n2 - L / 2, f1 = pose ? n1 : n2, f0 = Math.min(Math.max(LEAD_MIN, lead * T), f1 - 0.3), n0 = n2 - L;
  return (t) => ({ k: t <= f0 ? 1 : t >= f1 ? 0 : 1 - E((t - f0) / (f1 - f0)), melt: pose ? meltAt(t, n0, n2) : 0, swap: !pose || t < n1, s: pose ? 1 - E(seg(t, n0, n2)) : 0 });
}
/** A melt into light over [a, b]: up, a plateau at exactly 1 around the middle (where a pose may switch), down. */
function meltAt(t, a, b) {
  if (t <= a || t >= b) return 0;
  const v = Math.sin((Math.PI * (t - a)) / (b - a)) * 1.35;
  return v >= 1 ? 1 : E(v);
}
return { DROP_LIFE, LEAD_MIN, leadIn, leadOut, prog, settle, phases };
})();

// ======================================================================================================================
// APPARENCE COMMUNE : LE BLOB  —  src/blob/blob.js
// la palette, la lumière de glace, les yeux, les étincelles, les gouttes et poussières de lumière : la forme humaine garde tout cela (options de base)
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

// ======================================================================================================================
// APPARENCE + POSES DE LA FORME HUMAINE  —  src/forms/forms.js
// le corps (champ de distance), la silhouette au sol (stander), la MARCHE (gaitK, gaitSolve, gaitLine, la silhouette de profil), le sol de glace, son éclairage ; et l’ATTENTE (mode live : il se tient debout, respire, se balance)
// ======================================================================================================================
const M_forms = (() => {
const { fit, clamp, lerp, seg, bump, ease, noise2, rng, cycle, TAU, WHITE } = PIXELFX;
const { meta: idleMeta, blobBack, blobFront, ambient, state, shapeOf, drawEyes, drawSparks, drawDrips } = M_blob;
const { prog: progAt, leadIn, leadOut } = M_time;
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



const STYLES = ["grow", "flash", "spiral"];
const LEGS = ["spirit", "legs", "lotus"];
const ARMS = ["float", "open", "down"];
const GR_ARMS = ["relaxed", "hips", "wave"];
const GR_LOOKS = ["ice", "line"];

const meta = {
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
const livePeriod = (o) => o.duration * whole(o.liveLoops, 1);
/** How long the animation lasts: the live loop, or a whole number of the blob's loops. */
const total = (o) => (o.mode === "live" ? livePeriod(o) : o.duration * whole(o.loops, 1));
// as for the actions: the lead-out outlasts a drop of light, so every drop alive on the last frame fell from the
// resting form, as on the frames it chains with
const prog = (o, t) => progAt(o, t, total(o));
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
const floorOf = (o) => Math.round(Math.max(o.grFloor, o.size * o.huHeight * 2.25 + 3));
// where its hips are when its hanging toes touch the floor
const contactOf = (Lw, FY) => FY - 0.02 * Lw.U - (Lw.Lg + Lw.toe) * Math.cos(Lw.a0);
function gravityAt(o, c) {
  const T = o.duration * whole(o.loops, 1), act = T * Math.max(0.05, leadOut(o, T) - leadIn(o, T)), Lw = legsOf(o), FY = floorOf(o);
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
// what another tab can ask of its arms (angles of the upper arm, forearm and hand, 0 = straight down, > 0 outward):
// both raised over its head, spread wide, holding something before its chest; and one arm reaching for a point
const ARM_UP = [2.62, 2.86, 2.95], ARM_WIDE = [1.42, 1.56, 1.62], ARM_HOLD = [0.3, -1.95, -2.1];
function posed(a1, a2, a3, sd, x0, y0, Q) {
  if (!Q) return [a1, a2, a3];
  const to = (k, b) => { if (k > 0) { a1 = lerp(a1, b[0], k); a2 = lerp(a2, b[1], k); a3 = lerp(a3, b[2], k); } };
  to(Q.open, ARM_WIDE); to(Q.up, ARM_UP); to(Q.hold, ARM_HOLD);
  if (Q.rk > 0 && Q.rsd === sd) { const a = Math.atan2(sd * (Q.reach[0] - x0), Q.reach[1] - y0); to(Q.rk, [a - 0.14, a + 0.06, a + 0.1]); }
  return [a1, a2, a3];
}
const BOTTOM = { spirit: 1.92, legs: 1.98, lotus: 0.85 };
const bottomOf = (o) => (grounded(o) ? 2.02 : BOTTOM[o.huLegs]);
function human(o, st, h, P, g, Q = null) {
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
    const x0 = sd * shX, y0 = shY, rs = lerp(0.6, 1, clamp(ga)), b2 = ap[1] + sw * w2 * 1.2 + vyk * 0.16 - sd * vxk * 0.1;
    const [a1, a2, a3] = posed(ap[0] + sw * w1 + vyk * 0.1 - sd * vxk * 0.06, b2, b2 + ap[2] + sw * w2 * 0.6, sd, x0, y0, Q);
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
    const [a1, a2, a3] = posed(lerp(f1, p1 + swing, gv) + X.lift * 0.8 + X.kick * 0.3, lerp(f2, p2 + swing * 1.4, gv) + X.lift * 1.2 + X.kick * 0.55, lerp(f3, p3 + swing * 1.4, gv) + X.lift * 0.5 + X.kick * 0.45, sd, x0, y0, X.Q);
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
  // (another tab may bend its upper body over its hips: everything drawn so far turns round them)
  const iUp = L.length;
  const gl = Math.max(0, g.legs), nT = whole(o.huTailTurns, 1), tsw = o.huTailSway, tips = [];
  if (gl > 0.02) for (const sd of [1, -1]) {
    const rs = lerp(0.6, 1, clamp(gl)), hjx = sd * Lw.hw, hjy = hips + 0.02 * U - sd * X.pel, T1 = Lw.T1 * gl, T2 = Lw.T2 * gl, fi = sd > 0 ? 0 : 1;
    let ax, ay, tx, ty2;
    if (X.feet) {
      [ax, ay] = X.feet[fi];
      const px = ax + sd * Math.sin(Lw.a0) * Lw.toe, py = ay + Math.cos(Lw.a0) * Lw.toe, ff = X.step ? X.step.flat[fi] : X.flat;
      // a stepping foot leaves the floor toes first; up in the air (a jump) the legs hang, knees a little bent
      tx = lerp(px, ax + sd * 0.05 * U, ff); ty2 = X.step ? lerp(py, X.fy - 0.045 * U - X.step.up[fi], ff) : lerp(py, X.fy - 0.045 * U, X.flat);
      if (X.air > 0) {
        const a = sd * Lw.a0 * 1.7, len = (T1 + T2) * 0.88, hx = hjx + Math.sin(a) * len, hy = hjy + Math.cos(a) * len;
        ax = lerp(ax, hx, X.air); ay = lerp(ay, hy, X.air);
        tx = lerp(tx, hx + Math.sin(a) * Lw.toe * gl, X.air); ty2 = lerp(ty2, hy + Math.cos(a) * Lw.toe * gl, X.air);
      }
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
    const fl = X.feet ? (X.step ? X.step.flat[fi] : X.flat) * (1 - (X.air || 0)) : 0;
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
  let heart = [-0.05 * U + Math.cos(TAU * u) * 0.03 * U + lean * 0.6, chest + 0.06 * U + Math.sin(TAU * u * 2) * 0.02 * U], hd = head;
  if (X.lean) {
    const tn = turner(X.lean, 0, hips);
    turnParts(L, 0, iUp, tn); turnParts(Hl, 0, Hl.length, tn);
    const [nx, ny] = tn(head.x, head.y);
    hd = { ...head, x: nx, y: ny }; heart = tn(...heart);
    for (let i = 0; i < hands.length; i++) hands[i] = tn(...hands[i]);
  }
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const q of [...L, ...Hl]) { x0 = Math.min(x0, q.x0); x1 = Math.max(x1, q.x1); y0 = Math.min(y0, q.y0); y1 = Math.max(y1, q.y1); }
  return { L, Hl, U, head: hd, hands, tips, heart, chest, hips, box: [x0, y0, x1, y1] };
}
// a figure facing us seen as it turns away: everything but its head (and hair) drawn closer to its middle, by q
function narrow(fg, q) {
  const hd = fg.head;
  for (const p of fg.L) {
    if (p.t === 1 && p.cx === hd.x && p.cy === hd.y) continue;
    if (p.t === 0) {
      const ax = p.ax * q, bx = p.bx * q, mm = Math.max(p.ra, p.rb);
      Object.assign(p, { ax, bx, dx: bx - ax, l2: (bx - ax) ** 2 + p.dy ** 2, x0: Math.min(ax, bx) - mm, x1: Math.max(ax, bx) + mm });
    } else { const cx = p.cx * q; Object.assign(p, { cx, x0: cx - p.rx, x1: cx + p.rx }); }
  }
  fg.hands = fg.hands.map(([x, y]) => [x * q, y]); fg.tips = fg.tips.map(([x, y]) => [x * q, y]); fg.heart = [fg.heart[0] * q, fg.heart[1]];
  return fg;
}
// a whole figure carried into another space: tf maps its points, k scales its radii
function moveFig(fg, tf, k) {
  for (const Ls of [fg.L, fg.Al, fg.Fl, fg.Hl]) if (Ls) for (const q of Ls) {
    if (q.t === 0) {
      const [ax, ay] = tf(q.ax, q.ay), [bx, by] = tf(q.bx, q.by), ra = q.ra * k, rb = q.rb * k, mm = Math.max(ra, rb);
      Object.assign(q, { ax, ay, bx, by, ra, rb, k: q.k * k, dx: bx - ax, dy: by - ay, l2: (bx - ax) ** 2 + (by - ay) ** 2, x0: Math.min(ax, bx) - mm, x1: Math.max(ax, bx) + mm, y0: Math.min(ay, by) - mm, y1: Math.max(ay, by) + mm });
    } else {
      const [cx, cy] = tf(q.cx, q.cy), rx = q.rx * k, ry = q.ry * k;
      Object.assign(q, { cx, cy, rx, ry, r: Math.min(rx, ry), k: q.k * k, x0: cx - rx, x1: cx + rx, y0: cy - ry, y1: cy + ry });
    }
  }
  const [hx, hy] = tf(fg.head.x, fg.head.y);
  fg.head = { ...fg.head, x: hx, y: hy, rx: fg.head.rx * k, ry: fg.head.ry * k };
  fg.hands = fg.hands.map(([x, y]) => tf(x, y)); fg.tips = fg.tips.map(([x, y]) => tf(x, y)); fg.heart = tf(...fg.heart);
  fg.chest = tf(0, fg.chest)[1]; fg.hips = tf(0, fg.hips)[1];
  const a = tf(fg.box[0], fg.box[1]), b = tf(fg.box[2], fg.box[3]);
  fg.box = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
  fg.U *= k;
  return fg;
}
// turning parts of a figure round a point (a lean over the hips)
const turner = (a, px, py) => { const c = Math.cos(a), s = Math.sin(a); return (x, y) => [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c]; };
function turnParts(L, i0, i1, tn) {
  for (let i = i0; i < i1; i++) {
    const q = L[i];
    if (q.t === 0) {
      const [ax, ay] = tn(q.ax, q.ay), [bx, by] = tn(q.bx, q.by), m = Math.max(q.ra, q.rb);
      Object.assign(q, { ax, ay, bx, by, dx: bx - ax, dy: by - ay, l2: (bx - ax) ** 2 + (by - ay) ** 2, x0: Math.min(ax, bx) - m, x1: Math.max(ax, bx) + m, y0: Math.min(ay, by) - m, y1: Math.max(ay, by) + m });
    } else {
      const [cx, cy] = tn(q.cx, q.cy);
      Object.assign(q, { cx, cy, x0: cx - q.rx, x1: cx + q.rx, y0: cy - q.ry, y1: cy + q.ry });
    }
  }
}
// where gravity puts the figure: its origin (ox, oy) on the screen and what it does to the pose. xm: another tab's
// moves (its modifiers m, and how fast they carry it sideways, vx): steps along the floor, a jump, a crouch, a lean
function grounding(o, st, G, fsy, tilt, xm = null) {
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
  const W = xm ? walking(Lw, xm) : null, wx = W ? W.wx : 0, fR = W ? W.feet[0] : 0, fL = W ? W.feet[1] : 0, uR = W ? W.up[0] : 0, uL = W ? W.up[1] : 0;
  // (ax: another tab moves the whole of it along the floor, feet and all)
  const ax = xm ? xm.m.ax || 0 : 0;
  let sup = -Infinity;
  for (const sd of [1, -1]) { const dx = sd * (Lw.fw - Lw.hw) - sx + ((sd > 0 ? fR : fL) - wx); sup = Math.max(sup, FY - 0.09 * U + sd * pel - Math.sqrt(Math.max(0, Ls * Ls - dx * dx)) - (sd > 0 ? uR : uL) * 2.5); }
  const ox = sx + wx + ax, oy = lerp(cY, sup, G.gl) + G.crouch - hips + (W ? W.rise : 0);
  Object.assign(X, { sx, pel, feet: [[Lw.fw + fR + ax - ox, aY - uR - oy], [-Lw.fw + fL + ax - ox, aY - uL - oy]], fy: FY - oy });
  if (W) Object.assign(X, { step: W.step, air: W.air, lean: W.lean, crouch: X.crouch + W.squat });
  return { ox, oy, X };
}
// another tab's moves for the figure on its legs. Sideways (dx): within a little it only shifts its weight over its
// feet, farther the feet step after it, the leading foot first (each foot swings during its half of a stride, so the
// steps are a function of where it is: a pure function of time, and none at rest). Up (dy < 0): it rises off the
// floor, a jump, the legs leaving it and hanging. Down (dy > 0) and squashed (sy < 1): it bends its knees. A turn (rot)
// leans its upper body over its hips while it stands, and flips the whole of it in the air (in build()).
function walking(Lw, xm) {
  const m = xm.m, U = Lw.U, L = 0.62 * U, dz = 0.2 * U, d = m.dx, ad = Math.abs(d), c = ad > dz ? (Math.sign(d) * (ad - dz)) / L : 0;
  const mv = clamp(Math.abs(xm.vx) / (1.2 * U)), fr = (q) => q - Math.floor(q), S = (q) => Math.floor(q) + E(clamp(fr(q) * 2));
  const swing = (q) => (fr(q) < 0.5 ? Math.sin(Math.PI * clamp(fr(q) * 2)) : 0), sR = swing(c), sL = swing(c - 0.5);
  // a foot only lifts while it is going somewhere: stopped mid-stride, it simply lands where it is
  const up = [0.17 * U * sR * mv, 0.17 * U * sL * mv];
  const lift = Math.max(0, -m.dy), maxC = 0.42 * Lw.Lg, squat = maxC * Math.tanh((Math.max(0, m.dy) + Math.max(0, 1 - m.sy) * U * 1.3) / maxC);
  const air = E(clamp((lift - 0.06 * U) / (0.42 * U))), wrapPi = (a) => a - TAU * Math.round(a / TAU);
  const lean = clamp(wrapPi(m.rot), -0.55, 0.55) * (1 - air) + clamp(xm.vx / 160, -0.18, 0.18);
  return { wx: d, feet: [L * S(c), L * S(c - 0.5)], up, step: { up, flat: [1 - 0.75 * sR * mv, 1 - 0.75 * sL * mv] }, rise: squat - lift, squat, air, lean };
}

// ---- walking and running, seen from the side. Another tab asks for it with m.gait = { kind: "walk" | "run", ph: the
// stride's phase (0..1: the near foot lands at 0, the far one at 0.5), cyc: the same, unwrapped (strides so far), S: the
// stride (px), v: the speed (m/s, for how it moves), rate: strides a second, dir: 1 to the right / -1 to the left, and its
// settings (arms, lean, bounce, heel, knee, hair, prints, sparks; 1 = as it comes). The figure turns side on and moves as
// a person does. Its feet roll: walking, the heel strikes (toes up), the foot lowers flat, the heel lifts and the toes push
// off; running, it lands on the ball of the foot, the heel touches down and lifts again. While a foot is down it goes back
// at exactly the stride's speed (S a stride), so a floor going by at that speed keeps it planted. Each leg on the ground
// holds the hips as high as its rolling foot and its knee allow (the knee's bend over the stance follows a person's), so
// they rise over the foot and dip as the weight passes to the other leg when walking, and give under the weight, push off
// and fly when running; where the foot lands is worked out so the hips ride smoothly from one leg to the next. The legs are
// solved from the hips down (two bones, the knee forward), the swinging foot follows a smooth path from its toe-off to its
// landing, lifted (the heel kicked up when running); the arms swing against the legs, the upper body leans into the pace,
// the head stays level, the hair streams back and bounces with every step.
const frac = (x) => x - Math.floor(x);
const herm = (p0, m0, p1, m1, s) => { const s2 = s * s, s3 = s2 * s; return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * m0 + (3 * s2 - 2 * s3) * p1 + (s3 - s2) * m1; };
// the foot's frame turned by its pitch a (toes up > 0), y down
const pitchOf = (x, y, a) => [x * Math.cos(a) + y * Math.sin(a), -x * Math.sin(a) + y * Math.cos(a)];
// a bump from 0 to 0, flat at both ends, 1 at s = at
const bumpAt = (s, at, n = 5) => { if (s <= 0 || s >= 1) return 0; const a = n * at, b = n * (1 - at); return (s ** a * (1 - s) ** b) / (at ** a * (1 - at) ** b); };
// a smooth curve through keys [[x, y], ...] (Catmull-Rom, the ends carried on straight)
function curve(keys, x) {
  const n = keys.length;
  if (x <= keys[0][0]) return keys[0][1];
  if (x >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0;
  while (x > keys[i + 1][0]) i++;
  const [x1, y1] = keys[i], [x2, y2] = keys[i + 1], y0 = i > 0 ? keys[i - 1][1] : 2 * y1 - y2, y3 = i + 2 < n ? keys[i + 2][1] : 2 * y2 - y1;
  const x0 = i > 0 ? keys[i - 1][0] : 2 * x1 - x2, x3 = i + 2 < n ? keys[i + 2][0] : 2 * x2 - x1;
  return herm(y1, ((y2 - y0) / (x2 - x0)) * (x2 - x1), y2, ((y3 - y1) / (x3 - x1)) * (x2 - x1), (x - x1) / (x2 - x1));
}
// the foot side on (x U): the ankle above the sole, the heel behind it, the ball of the foot and the toes ahead of it, and
// the radii of the heel, the ball and the toe tip
const FOOT = { ha: 0.08, hb: 0.09, fb: 0.235, tb: 0.1, rH: 0.052, rB: 0.038, rT: 0.026 };
// how a person moves at v m/s. A leg's cycle starts as its foot lands (q = 0): it is down until beta (rolling on its heel,
// or walking on its ball, until q1, flat until q2, then the heel lifts to the pitch ato as the toes leave); knee: its
// bend while down; lift / drive: how high the swinging foot is lifted behind / carried forward (x U) and when; lean: the
// upper body (rad); arms: swing (rad), its middle, the elbow's bend and how much more it bends forward, the hand
function gaitK(W) {
  const v = Math.max(0.3, W.v || (W.kind === "run" ? 3.3 : 1.4)), set = (k) => (Number.isFinite(W[k]) ? Math.max(0, W[k]) : 1);
  if (W.kind === "run") {
    const beta = clamp(0.47 - 0.028 * v, 0.27, 0.42), b = Math.min(2, set("bounce"));
    // the knee: lands a little bent, gives under the weight, straightens to push off
    const knee = [[0, 0.3], [0.2 * beta, 0.3 + 0.32 * b], [0.45 * beta, 0.3 + 0.55 * b], [0.8 * beta, 0.28 + 0.14 * b], [beta, 0.12]];
    return { run: 1, v, beta, q1: 0.18 * beta, q2: 0.45 * beta, ahs: -0.16, ato: -1.05, knee, lift: (0.22 + 0.06 * v) * set("heel"), liftAt: 0.42,
      drive: 0.12 * set("knee"), driveAt: 0.7, lean: (0.1 + 0.03 * v) * set("lean"), armA: (0.4 + 0.05 * v) * set("arms"), armB: -0.12, elbow: 1.4, elbowF: 0.45, hand: 0.35, lag: 0.03 };
  }
  const beta = clamp(0.66 - 0.03 * v, 0.56, 0.64);
  // the knee: nearly straight as the heel strikes, gives a little as it takes the weight, straight again over the
  // foot, then folds as the heel lifts and the toes push off
  const knee = [[0, 0.07], [0.12, 0.3], [0.3, 0.1], [0.46, 0.12], [beta, 0.64]];
  return { run: 0, v, beta, q1: 0.1, q2: 0.34, ahs: 0.34, ato: -1.15, knee, lift: 0.1, liftAt: 0.26, drive: 0, driveAt: 0.6,
    lean: (0.03 + 0.02 * v) * set("lean"), armA: (0.18 + 0.14 * v) * set("arms"), armB: 0.03, elbow: 0.22, elbowF: 0.34, hand: 0.12, lag: 0.05 };
}
const prOf = (K, U, q) => 0.03 * U * Math.cos(TAU * q) * (K.run ? 0.6 : 1);
// standing still side on: the knee nearly straight
const KNEE0 = 0.06;
// what a pace between standing (0) and its own (1) makes of a value
const toward = (rest, full, k) => (k >= 1 ? full : rest + (full - rest) * k);
// one stride's geometry (cached): the rolling foot, the hips' height held by a leg down at q, where the ball lands so the
// hips ride smoothly from one leg to the next (walking: as high on the trailing leg as on the landing one when the heel
// strikes; running: as high as the foot lands as when it leaves). footAt / heldAt do the same for a step of any length
// (rho: its length as a part of the stride's, 0 a foot set down where it stands)
const SOLVED = new Map();
function gaitSolve(Lw, W) {
  const key = [W.kind, W.S, W.v, W.bounce, W.heel, W.knee, W.lean, W.arms, Lw.U, Lw.T1, Lw.T2].join();
  let sol = SOLVED.get(key);
  if (sol) return sol;
  const U = Lw.U, K = gaitK(W), S = Math.max(1, W.S || U), T1 = Lw.T1, T2 = Lw.T2, beta = K.beta;
  const ha = FOOT.ha * U, hb = FOOT.hb * U, fb = FOOT.fb * U, rH = FOOT.rH * U, rB = FOOT.rB * U;
  const dK = (k) => Math.sqrt(T1 * T1 + T2 * T2 + 2 * T1 * T2 * Math.cos(k));
  // the foot down at stance phase q, its ball on the ground at `ball` (hip-relative): the ankle (x, height above the
  // ground), pitch, toes' pitch. It rocks round the heel's round (walking, as it lands) and round the ball of the foot,
  // where the toes bend (as the heel lifts, and running as it lands): those stay where they are on the ground, so nothing
  // of it sinks into it. A shorter step (rho < 1) rolls the foot less
  const footAt = (ball, q, rho = 1) => {
    if (q < K.q1) {
      const a = rho * K.ahs * (1 - ease.outQuad(q / K.q1));
      if (K.run) { const [rx, ry] = pitchOf(fb, ha - rB, a); return { x: ball - rx, h: rB + ry, a, toe: 0 }; }
      const [rx, ry] = pitchOf(-hb, ha - rH, a);
      return { x: ball - hb - fb - rx, h: rH + ry, a, toe: a };
    }
    if (q < K.q2) return { x: ball - fb, h: ha, a: 0, toe: 0 };
    const k = (q - K.q2) / (beta - K.q2), a = rho * K.ato * (K.run ? ease.inQuad(k) : k * k * (0.55 + 0.45 * k)), [rx, ry] = pitchOf(fb, ha - rB, a);
    return { x: ball - rx, h: rB + ry, a, toe: 0 };
  };
  // how high a leg down holds the hips (its knee bends less on a shorter step; the pelvis turns: the hip of the leg ahead
  // is a little ahead, prOf, less as it slows down: sig its pace)
  const heldAt = (f, q, rho = 1, sig = 1) => { const d = dK(toward(KNEE0, curve(K.knee, q), rho)), x = f.x - prOf(K, U, q) * sig; return f.h + Math.sqrt(Math.max(0, d * d - x * x)); };
  const held = (b0, q) => heldAt(footAt(b0 - S * q, q), q);
  const gap = (b0) => (K.run ? held(b0, 0) - held(b0, beta) : held(b0, 0) - held(b0, 0.5));
  let lo = -0.5 * S, hi = 1.5 * S;
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (gap(m) > 0) lo = m; else hi = m; }
  const b0 = (lo + hi) / 2;
  sol = { K, S, b0, fb, footAt, heldAt };
  if (SOLVED.size > 40) SOLVED.clear();
  SOLVED.set(key, sol);
  return sol;
}
// ---- the line a gait follows in time. A gait at its own pace is a stride every 1 / rate seconds; one that sets off,
// slows down or stops has a pace s (0 standing still .. 1 its own) given in pieces, each eased from one pace to the next.
// From it: its cadence slows to `alpha` of its own as it stops, so its steps get shorter as well as slower; c(t) the
// strides it has done (each foot lands on whole ones, the far one half a stride later), d(t) how far it has gone (px), and
// for each moment the length of a step set down then (rho: 1 the stride's own, 0 none). While it goes at its own pace and
// a loop's clock is given (cs: its strides at t, csInv the inverse), c and d are that loop's exactly, so they join frame
// for frame; otherwise c(at) = c0 and d(at) = 0.
const ALPHA = 0.55;
function gaitLine({ S, rate, pieces = [], alpha = ALPHA, cs = null, csInv = null, at = 0, c0 = 0 }) {
  const P = pieces.filter((q) => q.t1 > q.t0).sort((a, b) => a.t0 - b.t0), n = P.length, V = S * rate;
  const T0 = n ? P[0].t0 : 0, T1 = n ? P[n - 1].t1 : 0, sF = n ? P[0].s0 : 1, sL = n ? P[n - 1].s1 : 1;
  const cum = [0];
  for (const q of P) cum.push(cum[cum.length - 1] + ((q.s0 + q.s1) / 2) * (q.t1 - q.t0));
  const find = (t) => { let i = 0; while (i < n - 1 && t > P[i].t1) i++; return i; };
  const sAt = (t) => {
    if (!n) return 1;
    if (t <= T0) return sF;
    if (t >= T1) return sL;
    const q = P[find(t)], x = (t - q.t0) / (q.t1 - q.t0);
    return q.s0 === q.s1 ? q.s0 : q.s0 + (q.s1 - q.s0) * E(x);
  };
  // the pace summed from the first piece's start: before it and after the last the pace stays as it was
  const F = (t) => {
    if (!n) return t;
    if (t <= T0) return sF * (t - T0);
    if (t >= T1) return cum[n] + sL * (t - T1);
    const i = find(t), q = P[i], R = q.t1 - q.t0, x = (t - q.t0) / R;
    return cum[i] + q.s0 * (t - q.t0) + (q.s1 - q.s0) * R * (x / 2 - Math.sin(Math.PI * x) / (2 * Math.PI));
  };
  const Fa = F(at), ca = cs ? cs(at) : c0, da = cs ? S * cs(at) : 0, own = (t) => !!cs && sAt(t) === 1;
  const c = (t) => (own(t) ? cs(t) : ca + rate * (alpha * (t - at) + (1 - alpha) * (F(t) - Fa)));
  const d = (t) => (own(t) ? S * cs(t) : da + V * (F(t) - Fa));
  const tOf = (cc) => {
    if (cs && csInv) { const t = csInv(cc); if (own(t)) return t; }
    // c grows at least alpha * rate and at most rate a second
    let lo, hi;
    if (cc >= ca) { lo = at + (cc - ca) / rate; hi = at + (cc - ca) / (alpha * rate); } else { lo = at - (ca - cc) / (alpha * rate); hi = at - (ca - cc) / rate; }
    for (let i = 0; i < 48; i++) { const m = (lo + hi) / 2; if (c(m) < cc) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
  const rho = (t) => { const s = sAt(t); return s >= 1 ? 1 : s <= 0 ? 0 : s / (alpha + (1 - alpha) * s); };
  // how fast its pace changes (px a second, a second): it leans into a start, back as it stops
  const acc = (t) => {
    if (!n || t <= T0 || t >= T1) return 0;
    const q = P[find(t)], R = q.t1 - q.t0;
    return V * (q.s1 - q.s0) * (Math.PI / 2) * Math.sin((Math.PI * (t - q.t0)) / R) / R;
  };
  return { c, d, s: sAt, rho, acc, tOf, V, rate, S, alpha };
}
// the line of a gait at its own pace, from what it says of now (t = 0: now)
const LINES = new Map();
function lineOf(W, S) {
  if (W.line) return { L: W.line, t: W.t || 0 };
  const c0 = W.cyc ?? W.ph ?? 0, r = W.rate || 1, key = [c0, r, S].join();
  let L = LINES.get(key);
  if (!L) {
    L = { c: (t) => c0 + r * t, d: (t) => S * (c0 + r * t), s: () => 1, rho: () => 1, acc: () => 0, tOf: (cc) => (cc - c0) / r, V: S * r, rate: r, S };
    if (LINES.size > 60) LINES.clear();
    LINES.set(key, L);
  }
  return { L, t: 0 };
}
/** How far a gait has gone (px, the way it goes) at the moment it gives (the floor goes back by as much). */
const gaitDist = (Lw, W) => { const S = gaitSolve(Lw, W).S, { L, t } = lineOf(W, S); return L.d(t); };
// the legs at that moment: for each leg (near first) its hip, knee, ankle, the foot's and the toes' pitch, whether it is
// down; the hips' height; its pace. Each foot stays where it came down on the ground (it lands ahead of the hips by as
// much as the step it takes, which the pace then gives it) while the ground goes back under it by as much as it goes:
// whatever its pace, a foot down never slides. FY: the ground (local px)
function gaitPose(Lw, W, FY) {
  const sol = gaitSolve(Lw, W), U = Lw.U, K = sol.K, T1 = Lw.T1, T2 = Lw.T2, beta = K.beta, S = sol.S, fb = sol.fb, e = 1e-4;
  const { L: Ln, t } = lineOf(W, S), c = Ln.c(t), sg = Ln.s(t);
  // a step: the foot landed at stride count cj; how long a step that was (rho) and where its ball came down (G, px along
  // the way it goes)
  const step = (cj) => { const tj = Ln.tOf(cj), rho = Ln.rho(tj); return { cj, rho, G: Ln.d(tj) + fb + (sol.b0 - fb) * rho }; };
  // that foot down at stride count cc (stance phase cc - cj), as the hips see it, and how high it holds them
  const down = (sp, cc, tc = Ln.tOf(cc)) => { const f = sol.footAt(sp.G - Ln.d(tc), cc - sp.cj, sp.rho); return { x: f.x, h: f.h, y: FY - f.h, a: f.a, toe: f.toe, tc }; };
  const heldBy = (sp, cc, tc) => { const f = down(sp, cc, tc); return sol.heldAt(f, cc - sp.cj, sp.rho, Ln.s(f.tc)); };
  const steps = [step(Math.floor(c)), step(Math.floor(c - 0.5) + 0.5)];
  // the hips: held by the leg that came down last; walking, passing from the other one to it while both are down;
  // running, in the air between the toe-off of the one and the landing of the other
  const [ld, tr] = c - steps[0].cj < 0.5 ? steps : [steps[1], steps[0]], q = c - ld.cj;
  let hipH;
  if (K.run) {
    if (q <= beta) hipH = heldBy(ld, c, t);
    else {
      const c0 = ld.cj + beta, c1 = ld.cj + 0.5, nx = step(c1), Lf = 0.5 - beta;
      const h0 = heldBy(ld, c0), h0b = heldBy(ld, c0 - e), h1 = heldBy(nx, c1), h1b = heldBy(nx, c1 + e);
      hipH = herm(h0, ((h0 - h0b) / e) * Lf, h1, ((h1b - h1) / e) * Lf, (c - c0) / Lf);
    }
  } else {
    const dbl = beta - 0.5;
    if (q >= dbl) hipH = heldBy(ld, c, t);
    else { const w = ease.inOutSine(q / dbl); hipH = heldBy(tr, c, t) * (1 - w) + heldBy(ld, c, t) * w; }
  }
  const hipY = FY - hipH, legs = [];
  for (const [side, sp] of [[1, steps[0]], [-1, steps[1]]]) {
    const qq = c - sp.cj;
    if (qq < beta) { const f = down(sp, c, t); legs.push({ side, q: qq, A: [f.x, f.y], a: f.a, toe: f.toe, down: true }); continue; }
    // in the air: from the toe-off to the next landing, a smooth path leaving and arriving at the speeds of both, lifted
    // (less for a short step, not at all for a foot set down where it was)
    const s = (qq - beta) / (1 - beta), k = 1 - beta, nx = step(sp.cj + 1), lk = Math.sqrt(clamp((nx.G - sp.G) / (0.55 * S)));
    const p0 = down(sp, sp.cj + beta - e), p0b = down(sp, sp.cj + beta - 2 * e), p1 = down(nx, nx.cj), p1b = down(nx, nx.cj + e);
    const x = herm(p0.x, ((p0.x - p0b.x) / e) * k, p1.x, ((p1b.x - p1.x) / e) * k, s);
    const y = herm(p0.y, ((p0.y - p0b.y) / e) * k, p1.y, ((p1b.y - p1.y) / e) * k, s) - (K.lift * U * bumpAt(s, K.liftAt) + K.drive * U * bumpAt(s, K.driveAt)) * lk;
    legs.push({ side, q: qq, s, A: [x, y], a: null, a0: p0.a, a1: p1.a, down: false, lk });
  }
  for (const L of legs) {
    // two bones from the hip to the ankle, the knee forward (the pelvis turns: the hip of the leg ahead is a little ahead)
    const hx = prOf(K, U, L.q) * sg, hy = hipY;
    let [ax, ay] = L.A, dx = ax - hx, dy = ay - hy, d = Math.hypot(dx, dy);
    const R = T1 + T2 - 1e-3;
    if (d > R) { ax = hx + (dx / d) * R; ay = hy + (dy / d) * R; dx = ax - hx; dy = ay - hy; d = R; L.A = [ax, ay]; }
    d = Math.max(d, Math.abs(T1 - T2) + 1e-3);
    const nx = dx / d, ny = dy / d, a = (d * d + T1 * T1 - T2 * T2) / (2 * d), hg = Math.sqrt(Math.max(0, T1 * T1 - a * a));
    L.hip = [hx, hy]; L.knee = [hx + nx * a + ny * hg, hy + ny * a - nx * hg]; L.bend = hg / T1;
    if (L.a === null) {
      // in the air the foot hangs off the shin, relaxed (toes dropped a little), turning from its toe-off pitch to its landing one
      const sx = L.A[0] - L.knee[0], sy = L.A[1] - L.knee[1], sl = Math.hypot(sx, sy) || 1, rel = Math.atan2(sx / sl, sy / sl) - 0.28;
      const w = Math.sin(Math.PI * L.s) ** 0.8 * L.lk;
      L.a = (1 - w) * (L.a0 + (L.a1 - L.a0) * L.s) + w * rel;
      // ... but as it passes over the ground the ankle lifts the toes just enough to clear it (they would scrape it)
      const fb = FOOT.fb * U, hb = FOOT.hb * U, ha = FOOT.ha * U, rH = FOOT.rH * U, rB = FOOT.rB * U, rT = FOOT.rT * U, tb = FOOT.tb * U;
      const low = (a) => { const [, h2] = pitchOf(-hb, ha - rH, a), [, b2] = pitchOf(fb, ha - rB, a), [, t2] = pitchOf(tb, rB - rT, a); return L.A[1] + Math.max(h2 + rH, b2 + rB, b2 + t2 + rT); };
      const lim = FY - 0.9 * Math.sin(Math.PI * L.s) ** 0.5 * L.lk;
      if (low(L.a) > lim) {
        let best = L.a, bv = low(L.a);
        for (let k = 1; k <= 24 && bv > lim; k++) { const a = L.a + k * 0.05, v = low(a); if (v < bv) { best = a; bv = v; } }
        L.a = best;
      }
      L.toe = L.a;
    }
  }
  return { hipY, legs, K, sol, sg, acc: Ln.acc(t), V: Ln.V };
}
/**
 * A gait for another tab: how fast it really goes and how many strides a loop of P seconds takes, so its feet stay planted
 * on a ground going by at whole tiles (T px) a loop. Its legs are a person's (hips to soles = 0.92 m): speed (km/h) and
 * stride (x a person's at that speed) become { tiles, N strides, S px a stride, v m/s, kmh, rate strides a second }.
 */
function gaitPlan(o, kind, P, T, kmh, stride = 1) {
  const f = withForm(o), Lw = legsOf(f), pxm = (Lw.Lg + FOOT.ha * Lw.U) / 0.92;
  const tiles = Math.max(1, Math.round(((Math.max(0.5, kmh) / 3.6) * pxm * P) / Math.max(1, T))), vpx = (tiles * T) / P, v = vpx / pxm;
  // a person's cadence at that speed (strides a second)
  const f0 = kind === "run" ? (2.67 + 0.145 * (v - 3)) / 2 : (1.58 + 0.56 * (v - 1)) / 2, N = Math.max(1, Math.round((clamp(f0, 0.45, 2) / Math.max(0.5, stride)) * P));
  return { tiles, N, S: (vpx * P) / N, v, kmh: v * 3.6, rate: N / P, vpx };
}
/** A gait going somewhere (no loop to fit): the speed asked (km/h) and a person's cadence at it, { S, v, kmh, rate, vpx }. */
function gaitFree(o, kind, kmh, stride = 1) {
  const f = withForm(o), Lw = legsOf(f), pxm = (Lw.Lg + FOOT.ha * Lw.U) / 0.92, v = Math.max(0.5, kmh) / 3.6, vpx = v * pxm;
  const f0 = kind === "run" ? (2.67 + 0.145 * (v - 3)) / 2 : (1.58 + 0.56 * (v - 1)) / 2, rate = clamp(f0, 0.45, 2) / Math.max(0.5, stride);
  return { S: vpx / rate, v, kmh: v * 3.6, rate, vpx };
}
// the figure side on, walking or running (W = m.gait), in local px (y down, the ground at FY): the same parts as when it
// stands, turned in profile. The near leg is part of the body (L), the near arm swings in front of it (Al), the far arm
// and leg behind it (Fl, drawn darker), the hair behind the head (Hl)
function strider(o, st, h, P, W, FY) {
  const Lw = legsOf(o), U = Lw.U, J = U * 0.08, bw = o.huBuild, ww = o.huWaist, dir = W.dir < 0 ? -1 : 1, ph = frac(W.ph || 0), u = st.u;
  const pose = gaitPose(Lw, W, FY), K = pose.K, L = [], Al = [], Fl = [], Hl = [], hands = [], tips = [];
  const X = (x) => dir * x, cn = (Ls, ax, ay, ra, bx, by, rb, k) => cone(Ls, X(ax), ay, ra, X(bx), by, rb, k), ov = (Ls, cx, cy, rx, ry, k) => oval(Ls, X(cx), cy, rx, ry, k);
  const hy = pose.hipY, psi = frac(2 * ph), sg = pose.sg, pxm = (Lw.Lg + FOOT.ha * U) / 0.92;
  // the upper body leans into the pace (a little more as each push starts, running), turned round the hips; as it sets
  // off it leans into the start, as it stops it leans back (sg: its pace, 0 standing still .. 1 its own)
  const lean = toward(0, K.lean + (K.run ? 0.03 * Math.cos(TAU * (psi - 0.15)) : 0.01 * Math.cos(TAU * psi)), sg) + clamp((0.8 * pose.acc) / pxm / 9.8, -0.18, 0.22);
  const up = turner(lean, 0, hy), T = (x, y) => up(x * U, hy + y * U), br = 0.012 * o.breath * Math.sin(TAU * u * whole(o.breathTurns));
  const [pvx, pvy] = T(-0.04, -0.03), [blx, bly] = T(-0.01, -0.16), [wsx, wsy] = T(0.01, -0.4), [chx, chy] = T(0.045, -0.74 - br), [shx, shy] = T(-0.02, -0.93 - br);
  ov(L, pvx, pvy, 0.21 * U * ww, 0.2 * U, J);
  cn(L, blx, bly, 0.2 * U * ww, wsx, wsy, 0.165 * U * ww, J);
  cn(L, wsx, wsy, 0.165 * U * ww, chx, chy, 0.25 * U * bw, J);
  ov(L, shx, shy, 0.17 * U * bw, 0.14 * U, J * 0.8);
  // neck and head; the head stays level (it does not follow the lean) and rides a little behind the body's bounce
  const hr = o.huHead, [nkx, nky] = T(0.05, -1.04 - br), [nhx, nhy] = T(0.085, -1.2 - br), [hcx, hcy] = T(0.1, -1.56 - br);
  const head = { x: X(hcx), y: hcy, rx: 0.37 * U * hr, ry: 0.41 * U * hr };
  cn(L, nkx, nky, 0.11 * U, nhx, nhy, 0.095 * U, J * 0.8);
  oval(L, head.x, head.y, head.rx, head.ry, J * 0.7);
  // legs: the near one with the body, the far one behind it; thigh, shin, calf, heel, sole and toes
  for (const lg of pose.legs) {
    const Ls = lg.side > 0 ? L : Fl, [hx, hy2] = lg.hip, [kx, ky] = lg.knee, [ax, ay] = lg.A, b = lg.bend;
    cn(Ls, hx, hy2 + 0.02 * U, 0.13 * U, kx, ky, 0.085 * U * (1 + 0.2 * b), J * 0.45);
    cn(Ls, kx, ky, 0.08 * U * (1 + 0.15 * b), ax, ay, 0.048 * U, J * 0.3);
    const sx = ax - kx, sy = ay - ky, sl = Math.hypot(sx, sy) || 1, bx = -sy / sl, by = sx / sl; // behind the shin
    cn(Ls, kx + sx * 0.14 + bx * 0.03 * U, ky + sy * 0.14 + by * 0.03 * U, 0.062 * U, kx + sx * 0.5 + bx * 0.012 * U, ky + sy * 0.5 + by * 0.012 * U, 0.044 * U, J * 0.3);
    const [h1, h2] = pitchOf(-FOOT.hb * U, (FOOT.ha - FOOT.rH) * U, lg.a), [b1, b2] = pitchOf(FOOT.fb * U, (FOOT.ha - FOOT.rB) * U, lg.a), [t1, t2] = pitchOf(FOOT.tb * U, (FOOT.rB - FOOT.rT) * U, lg.toe);
    cn(Ls, ax, ay, 0.056 * U, ax + h1, ay + h2, FOOT.rH * U, J * 0.2);
    cn(Ls, ax + h1, ay + h2, FOOT.rH * U, ax + b1, ay + b2, FOOT.rB * U, J * 0.2);
    cn(Ls, ax + b1, ay + b2, FOOT.rB * U, ax + b1 + t1, ay + b2 + t2, FOOT.rT * U, J * 0.15);
    tips.push([X(ax + b1 + t1), ay + b2 + t2]);
  }
  // arms: swinging against the legs (the near arm with the far leg), the elbow bending as the arm comes forward; bent
  // at the elbow and pumping when running, the hands loose fists
  const [sx0, sy0] = T(-0.03, -0.93 - br);
  for (const side of [1, -1]) {
    const Ls = side > 0 ? Al : Fl, aph = side > 0 ? ph : ph + 0.5, c = Math.cos(TAU * (aph - K.lag)), fw = (1 - c) / 2;
    const a1 = (K.armB - K.armA * c) * sg + lean * 0.6, a2 = a1 + toward(0.12, K.elbow, sg) + K.elbowF * fw * sg, a3 = a2 + toward(0.1, K.hand, sg);
    const ex = sx0 + Math.sin(a1) * 0.58 * U, ey = sy0 + Math.cos(a1) * 0.58 * U, wx = ex + Math.sin(a2) * 0.5 * U, wy = ey + Math.cos(a2) * 0.5 * U;
    const hx2 = wx + Math.sin(a3) * 0.2 * U, hy3 = wy + Math.cos(a3) * 0.2 * U;
    cn(Ls, sx0, sy0, 0.1 * U, ex, ey, 0.076 * U, J * 0.6);
    cn(Ls, ex, ey, 0.076 * U, wx, wy, 0.05 * U, J * 0.5);
    if (K.run) ov(Ls, (wx + hx2) / 2, (wy + hy3) / 2, 0.065 * U, 0.06 * U, J * 0.3);
    else cn(Ls, wx + (hx2 - wx) * 0.15, wy + (hy3 - wy) * 0.15, 0.058 * U, hx2, hy3, 0.046 * U, J * 0.3);
    hands.push([X((wx + hx2) / 2), (wy + hy3) / 2]);
  }
  // hair of light behind the head: a cap, and locks from the back of the head that fall to the shoulders, stream back
  // with the speed and bounce with every step (lagging behind the body's rise and fall, more toward the tips)
  const n = whole(o.huHairStrands), Lh = U * 0.29 * o.huHair, wind = clamp((K.v * sg - 0.6) / 5.5) * (0.6 + 0.4 * clamp(W.hair ?? 1, 0, 2)), hs = 0.22 * clamp(W.hair ?? 1, 0, 3) * (K.run ? 1.4 : 1) * sg;
  if (n && Lh > 0.6) {
    oval(Hl, X(hcx - 0.06 * U), hcy - 0.05 * U, head.rx * 1.08, head.ry * 1.03, 0);
    for (let j = 0; j < n; j++) {
      const kq = Math.floor(j / 2), f = n > 1 ? j / (n - 1) : 0.5, rho = -1.72 - 1.55 * f;
      let x = hcx + Math.cos(rho) * head.rx * 0.92, y = hcy + Math.sin(rho) * head.ry * 0.92, th = rho - Math.PI / 2 + TAU;
      const R = [0.13, 0.12, 0.1, 0.078, 0.052, 0.026].map((r) => r * U * hr * (1 - 0.08 * kq));
      for (let i = 1; i <= 5; i++) {
        const k = i / 5, aim = Math.PI / 2 + wind * (Math.PI / 2) * (0.25 + 0.75 * k);
        th += (aim - th) * 0.42 - hs * k * Math.sin(TAU * (2 * ph - 0.12 - 0.07 * i) + j * 0.6) + 0.06 * o.huHairFlow * k * Math.sin(TAU * u * whole(o.huTailTurns, 1) + j * 1.7 - i * 0.8);
        const len = Lh * (1 - 0.06 * i) * (1 - 0.08 * kq), nx = x + Math.cos(th) * len, ny = y + Math.sin(th) * len;
        cn(Hl, x, y, R[i - 1], nx, ny, R[i], J * 0.5);
        x = nx; y = ny;
      }
    }
  }
  const [hx0, hy0] = T(0.06, -0.62 - br);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const q of [...L, ...Al, ...Fl, ...Hl]) { x0 = Math.min(x0, q.x0); x1 = Math.max(x1, q.x1); y0 = Math.min(y0, q.y0); y1 = Math.max(y1, q.y1); }
  return { L, Al, Fl, Hl, U, head, hands, tips, heart: [X(hx0), hy0], chest: chy, hips: hy, box: [x0, y0, x1, y1], side: dir, pose };
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
// ext: another tab drawing the creature in its new form ({ M: its modifiers, st: the state they give, h: the figure's
// clock }): the change is done (c = 1) and the modifiers move, squash, turn, light and pose the figure itself. Every
// one of them is exactly neutral at rest (x * 1, x + 0), so at rest it is the "live" loop pixel for pixel
function build(o, t, ext = null) {
  const P = livePeriod(o), ph = ext ? { c: 1, h: ext.h } : phaseOf(o, t), style = ext ? "grow" : styleOf(o), cf = formOf(o, ph.c), ch = chore(o, cf, style), M = ext ? ext.M : modsOf(o);
  const st = ext ? ext.st : state(o, t, M), S = o.size, G = grounded(o) ? gravityAt(o, ph.c) : null;
  const F = { ph, cf, ch, st, M, style, P, G, ext: !!ext, blob: ch.kb <= 0 };
  if (F.blob) return F;
  const m = st.m, k = ext ? ch.kb * (1 - m.morph) : ch.kb, spiral = ch.front !== null;
  // the figure's own squash: a little of the idle's breath and bounce, and the change's size
  const bsx = st.sx / (m.sx * m.grow), bsy = st.sy / (m.sy * m.grow);
  let fsx = (1 + (bsx - 1) * 0.3) * ch.scale, fsy = (1 + (bsy - 1) * 0.3) * ch.scale, tilt = (st.tilt - m.rot) * o.huTilt, ox = st.x, oy = st.y, X = null;
  // another tab's squash, size and turn (the change's own are undone above: they were the blob's)
  if (ext && !G) { fsx *= m.grow * (1 + (m.sx - 1) * 0.6); fsy *= m.grow * (1 + (m.sy - 1) * 0.6); tilt += m.rot; }
  // another tab may change its pose for a while: its legs (lotus...) and arms (down...), or, on the floor, sit down
  // cross-legged on it (seat)
  const fo = ext && (m.legs || m.arms) ? { ...o, huLegs: m.legs || o.huLegs, huArms: m.arms || o.huArms } : o, seat = !!(ext && G && m.seat > 0.5);
  // walking or running (m.gait, on its legs): it turns side on and works out its own pose, on the spot (its floor goes by).
  // m.turn (0 facing us .. 1 side on) while it turns to set off or after it has stopped: the figure facing us and the one
  // side on are both posed and their fields blend, so it turns as one body, never melting nor jumping (at 0 it is the
  // figure facing us exactly, at 1 the one side on)
  const gaitM = ext && G && !seat && m.gait ? m.gait : null, tw = gaitM ? (m.turn == null ? 1 : clamp(m.turn)) : 0;
  const gait = tw >= 1 ? gaitM : null, turning = tw > 0 && tw < 1;
  if (seat) {
    const g = m.grow;
    fsx = g; fsy = g; tilt = clamp(m.rot, -0.5, 0.5); ox = m.dx + m.ax; oy = G.FY - (BOTTOM.lotus + 0.06) * G.Lw.U * g;
  } else if (gait) {
    // (on the spot, its floor going by, or carried along it by ax as it goes)
    fsx = ch.scale; fsy = ch.scale; tilt = 0; ox = m.ax; oy = 0;
    X = { gm: 1, grav: 1, lift: 0, hairUp: 0, hairGrav: 1, kick: 0, crouch: 0, gl: 1, flat: 1, sx: 0, pel: 0, feet: null, fy: G.FY, gait };
  } else if (G) {
    // gravity takes over from the blob's float: no more sway, tilt or squash; it falls and stands
    fsx = lerp(fsx, ch.scale, G.gm); fsy = lerp(fsy, ch.scale, G.gm); tilt *= 1 - G.gm;
    ({ ox, oy, X } = grounding(o, st, G, fsy, tilt, ext ? { m, vx: ext.vx } : null));
    if (ext) {
      // its size round the floor under it (it stays standing on it), round its middle up in the air; there a turn is a flip
      const g = m.grow;
      if (g !== 1) { const ay = lerp(G.FY, oy, X.air); oy = ay + (oy - ay) * g; fsx *= g; fsy *= g; }
      tilt += (m.rot - TAU * Math.round(m.rot / TAU)) * X.air;
    }
  }
  // a pose another tab changes under a melt into light (m.anchor = [x, y] of the frame, [x, y] of the middle, see
  // loops/_loop.js): the frame gathers to that point as it melts, so neither the pose it leaves nor the one it takes
  // shows while it switches (at morph 1 nothing of the figure is left)
  if (ext && G && m.anchor && m.morph > 0) { ox = lerp(ox, m.anchor[0], m.morph); oy = lerp(oy, m.anchor[1], m.morph); }
  // its arms, as another tab asks (raised, spread, holding, one reaching for a point given in the scene)
  let Q = null;
  if (ext && (m.armUp > 0 || m.armOpen > 0 || m.hold > 0 || (m.reach && m.reachK > 0))) {
    Q = { up: m.armUp || 0, open: m.armOpen || 0, hold: m.hold || 0, rk: 0 };
    if (m.reach && m.reachK > 0) {
      const ex = m.reach[0] - ox, ey = m.reach[1] - oy, c0 = Math.cos(tilt), s0 = Math.sin(tilt), rx = (ex * c0 + ey * s0) / fsx, ry = (-ex * s0 + ey * c0) / fsy;
      Object.assign(Q, { rk: m.reachK, reach: [rx, ry], rsd: m.reachSide || (rx >= 0 ? 1 : -1) });
    }
    if (X) X.Q = Q;
  }
  let fig = gait ? strider(o, st, ph.h, P, gait, G.FY) : G && !seat ? stander(o, st, ph.h, P, ch.g, X) : human(seat ? { ...fo, huLegs: "lotus" } : fo, st, ph.h, P, ch.g, Q);
  // turning: the figure side on too, brought into the space of the one facing us (both stand upright on the floor; its frame
  // is at (ax, 0)), and what the drawing needs of the figure (head, hands, feet, heart) taken between the two
  let figB = null, turnWx = null;
  if (turning) {
    // (seen turning away, its shoulders, hips, arms and feet come closer together, as a body's width does, not its head:
    // by half way they are where the figure side on has them, so the two bodies blend into one)
    narrow(fig, 1 - 0.62 * E(clamp(tw / 0.55)));
    figB = strider(o, st, ph.h, P, gaitM, G.FY);
    const kx = 1 / fsx, ky = 1 / fsy;
    moveFig(figB, (x, y) => [(x + m.ax - ox) * kx, (y - oy) * ky], Math.min(kx, ky));
    const mx = (a, b) => [lerp(a[0], b[0], tw), lerp(a[1], b[1], tw)];
    turnWx = lerp(ox - X.sx, m.ax, tw);
    fig = { ...fig, Al: figB.Al, Fl: figB.Fl, side: figB.side, turnK: tw, B: figB,
      head: { x: lerp(fig.head.x, figB.head.x, tw), y: lerp(fig.head.y, figB.head.y, tw), rx: lerp(fig.head.rx, figB.head.rx, tw), ry: lerp(fig.head.ry, figB.head.ry, tw) },
      hands: fig.hands.map((h, i) => mx(h, figB.hands[i] || h)), tips: fig.tips.map((q, i) => mx(q, figB.tips[i] || q)), heart: mx(fig.heart, figB.heart),
      chest: lerp(fig.chest, figB.chest, tw), hips: lerp(fig.hips, figB.hips, tw),
      box: [Math.min(fig.box[0], figB.box[0]), Math.min(fig.box[1], figB.box[1]), Math.max(fig.box[2], figB.box[2]), Math.max(fig.box[3], figB.box[3])] };
    // (past half way it stands on the floor as the figure side on does: its prints, the floor's glints)
    if (tw >= 0.5) X = { gm: 1, grav: 1, lift: 0, hairUp: 0, hairGrav: 1, kick: 0, crouch: 0, gl: 1, flat: 1, sx: 0, pel: 0, feet: null, fy: G.FY, gait: gaitM };
  }
  const U = fig.U, cs = Math.cos(tilt), sn = Math.sin(tilt);
  const toScreen = (fx, fy) => { const x = fx * fsx, y = fy * fsy; return [ox + x * cs - y * sn, oy + x * sn + y * cs]; };
  // the blob's side (while some of it is left): where the blob is; on the floor it pours itself from the figure's
  // middle, its bottom never under the floor
  let bs = st;
  if (ext && G && k < 1) {
    let [mx, my] = toScreen(0, (fig.chest + fig.hips) / 2);
    my += Math.max(0, m.dy);
    if (m.anchor && m.morph > 0) { mx = lerp(mx, m.anchor[2], m.morph); my = lerp(my, m.anchor[3], m.morph); }
    bs = { ...st, x: mx, y: Math.min(my, G.FY - S * st.sy * 0.98), tilt: m.rot };
  }
  const cb = Math.cos(-bs.tilt), sb = Math.sin(-bs.tilt);
  Object.assign(F, { fig, U, fsx, fsy, tilt, toScreen, ox, oy, X, bs, turn: turning ? tw : null, turnWx });
  // where the field lives: the blob's reach while some of it is left, the figure's box, and the halo around them
  const hm = lerp(S * 0.55, U * 0.3, k) * Math.max(0.01, o.shell), far = hm + 2;
  let X0 = Infinity, X1 = -Infinity, Y0 = Infinity, Y1 = -Infinity;
  const grow = (x, y) => { X0 = Math.min(X0, x); X1 = Math.max(X1, x); Y0 = Math.min(Y0, y); Y1 = Math.max(Y1, y); };
  const [bx0, by0, bx1, by1] = fig.box;
  for (const [x, y] of [[bx0, by0], [bx1, by0], [bx0, by1], [bx1, by1]]) grow(...toScreen(x, y));
  const blobPart = k < 1 || spiral, rad = blobPart ? shapeOf(o, st.u) : null;
  if (blobPart) { const R = S * 1.9 * Math.max(bs.sx, bs.sy); grow(bs.x - R, bs.y - R); grow(bs.x + R, bs.y + R); }
  X0 = Math.floor(X0 - far - 1); Y0 = Math.floor(Y0 - far - 1); X1 = Math.ceil(X1 + far + 1); Y1 = Math.ceil(Y1 + far + 1);
  const W = X1 - X0 + 1, H = Y1 - Y0 + 1, N = W * H;
  const Gs = new Float32Array(N), Gw = new Float32Array(N), Qx = new Float32Array(N), Qy = new Float32Array(N), Gk = new Float32Array(N), Gl = spiral ? new Uint8Array(N) : null, Hs = fig.Hl.length ? new Float32Array(N).fill(99) : null;
  // side on (walking, running): the near arm in front of the body (As) and the far limbs behind it (Fs), each with its thickness
  const As = fig.Al ? new Float32Array(N).fill(99) : null, Aw = As ? new Float32Array(N).fill(1) : null, Fs = fig.Fl ? new Float32Array(N).fill(99) : null, Fw = Fs ? new Float32Array(N).fill(1) : null;
  // (as it melts into light, those limbs thin out and are gone into the body long before the body itself is light; as it
  // turns side on they grow out of it)
  const lim = (1 - k) * U * 0.6 + (figB ? (1 - tw) * U * 0.6 : 0), hlim = (1 - k) * U * 0.9, tb = E(seg(tw, 0.3, 0.75));
  const band = U * 0.45, yF = spiral ? lerp(bottomOf(o) * U + U * 0.5, fig.box[1] - U * 0.3, ch.front) : 0, fsc = Math.min(fsx, fsy);
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const px = X0 + i + 0.5, py = Y0 + j + 0.5, dx = px - bs.x, dy = py - bs.y, n = j * W + i, ex = px - ox, ey = py - oy;
      // the figure's side, in its own space
      const rx = (ex * cs + ey * sn) / fsx, ry = (-ex * sn + ey * cs) / fsy;
      let kk = k, s = 0, w = 1, qx = rx, qy = ry;
      if (spiral) {
        // the spiral cuts clean: the new form below the ribbons' line, the blob above it, a line of light between
        const ux = dx * cb - dy * sb, uy = dx * sb + dy * cb, bx = ux / bs.sx, by = uy / bs.sy, r = Math.hypot(bx, by), pd = (ry - yF) * fsc;
        field(fig.L, rx, ry, far / fsc);
        const below = Math.max(SD * fsc, -pd), above = Math.max(r - rad(Math.atan2(by, bx)), pd);
        kk = below <= above ? 1 : 0; s = Math.min(below, above);
        w = kk ? SW * fsc : rad(Math.atan2(by, bx)); qx = kk ? rx : bx; qy = kk ? ry : by;
        if (Hs) { field(fig.Hl, rx, ry, far / fsc); Hs[n] = Math.max(SD * fsc, -pd); }
        if (Math.abs(pd) < 1) Gl[n] = 1;
        Gs[n] = s; Gw[n] = Math.max(0.5, w); Qx[n] = qx; Qy[n] = qy; Gk[n] = kk;
        continue;
      }
      // (its hair thins away as it melts into light, and grows back as it takes shape)
      if (kk > 0) {
        field(fig.L, rx, ry, far / fsc); s = SD * fsc; w = SW * fsc;
        if (figB) { field(figB.L, rx, ry, far / fsc); s = lerp(s, SD * fsc, tb); w = lerp(w, SW * fsc, tb); }
        if (Hs && kk > 0.5) {
          field(fig.Hl, rx, ry, far / fsc); let hs = SD * fsc;
          if (figB) { field(figB.Hl, rx, ry, far / fsc); hs = lerp(hs, SD * fsc, tb); }
          Hs[n] = hs + hlim;
        }
      }
      if (As) { field(fig.Al, rx, ry, far / fsc); As[n] = SD * fsc + lim; Aw[n] = Math.max(0.5, SW * fsc); }
      if (Fs) { field(fig.Fl, rx, ry, far / fsc); Fs[n] = SD * fsc + lim; Fw[n] = Math.max(0.5, SW * fsc); }
      if (kk < 1) {
        // the blob's side, in its body space (its squash and tilt)
        const ux = dx * cb - dy * sb, uy = dx * sb + dy * cb, bx = ux / bs.sx, by = uy / bs.sy, r = Math.hypot(bx, by), e = rad(Math.atan2(by, bx));
        s = kk > 0 ? lerp(r - e, s, kk) : r - e; w = kk > 0 ? lerp(e, w, kk) : e;
        qx = lerp(bx, rx, kk); qy = lerp(by, ry, kk);
      }
      Gs[n] = s; Gw[n] = Math.max(0.5, w); Qx[n] = qx; Qy[n] = qy; Gk[n] = kk;
    }
  // where the eyes, the heart of light and the highlight are: on the blob, then on the figure's head and chest
  const ke = spiral ? clamp((fig.head.y - yF) / band + 0.5) : clamp(ch.g.head) * k, kn = spiral ? clamp((fig.heart[1] - yF) / band + 0.5) : k;
  const [hX, hY] = toScreen(fig.head.x, fig.head.y), bn = [Math.cos(TAU * st.u) * S * 0.1 - S * 0.12, Math.sin(TAU * st.u * 2) * S * 0.06 + S * 0.15];
  const bnS = [bs.x + (bn[0] * bs.sx) * Math.cos(bs.tilt) - (bn[1] * bs.sy) * Math.sin(bs.tilt), bs.y + (bn[0] * bs.sx) * Math.sin(bs.tilt) + (bn[1] * bs.sy) * Math.cos(bs.tilt)];
  const hn = toScreen(...fig.heart);
  // how much of the figure there is at a height of its own space (the spiral remakes it from below)
  const kAt = (fy) => (spiral ? clamp((fy - yF) / (U * 0.15) + 0.5) : k);
  Object.assign(F, { X0, Y0, W, H, Gs, Gw, Qx, Qy, Gk, Gl, Hs, As, Aw, Fs, Fw, hm, rad, blobPart, yF, band, ke, kn, kAt, k,
    headS: [lerp(bs.x, hX, ke), lerp(bs.y, hY, ke)], headR: lerp(S, fig.head.rx * fsc, ke),
    nucS: [lerp(bnS[0], hn[0], kn), lerp(bnS[1], hn[1], kn)], nucR: lerp(S, U * 0.6, kn) * m.grow });
  return F;
}

// ---- drawing the blended body like the blob's: 1 px rim lit top-left, ramp steps inside, currents, heart of light
function body(p, C, o, F) {
  const { X0, Y0, W, H, Gs, Gw, Qx, Qy, Gk, Gl, st, ch } = F, la = (o.lightAngle * Math.PI) / 180, lx = Math.cos(la), ly = Math.sin(la);
  // the figure's limbs are thin: on top of each limb's own roundness it is lit as one body, top-left to bottom-right,
  // so it keeps the blob's big glassy gradient; its currents are a little stronger, so the bands still show
  const Rg = 1.5 * F.U, cy0 = lerp(F.fig.head.y, F.fig.hips, 0.45), Hs = F.Hs, boost = ch.glow + (F.ext ? st.m.glow : 0), white = ch.white, u = st.u;
  // side on: the far arm and leg first, behind everything, a step darker (the hair and the body cover them)
  if (F.Fs) limbs(p, C, o, F, F.Fs, F.Fw, true, Rg, cy0, boost);
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
  // side on: the near arm last, in front of the body, outlined where it crosses it
  if (F.As) limbs(p, C, o, F, F.As, F.Aw, false, Rg, cy0, boost);
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
// a limb drawn as a layer of its own (side on): lit like the body, its rim lit top-left. far: the far arm and leg, behind
// the body, a step darker; otherwise the near arm in front of it, its shaded edge dark where it crosses the body so it
// stands out from it
function limbs(p, C, o, F, Ls, Lw2, far, Rg, cy0, boost) {
  const { X0, Y0, W, H, Gs, st } = F, la = (o.lightAngle * Math.PI) / 180, lx = Math.cos(la), ly = Math.sin(la), u = st.u;
  for (let j = 1; j < H - 1; j++)
    for (let i = 1; i < W - 1; i++) {
      const n = j * W + i, s = Ls[n];
      if (s > 0) continue;
      const px = X0 + i + 0.5, py = Y0 + j + 0.5;
      let gx = Ls[n + 1] - Ls[n - 1], gy = Ls[n + W] - Ls[n - W];
      const gl = Math.hypot(gx, gy) || 1;
      gx /= gl; gy /= gl;
      const d = clamp(1 + s / Lw2[n]), litN = gx * lx + gy * ly;
      if (Ls[n - 1] > 0 || Ls[n + 1] > 0 || Ls[n - W] > 0 || Ls[n + W] > 0) {
        if (far) p.px(px, py, litN > 0.35 && o.rim > 0 ? C[5] : litN > -0.25 ? C[4] : C[2]);
        else p.px(px, py, litN > 0.35 && o.rim > 0 ? WHITE : litN > -0.25 ? C[6] : Gs[n] <= 0 ? C[2] : C[4]);
        continue;
      }
      const qx = px - F.ox, qy = py - F.oy, cur = o.currents > 0 ? ln(qx * 0.09, qy * 0.09, u, o.seed + 23, 1.4) : 0.5;
      const lit = (far ? 0.2 : 0.5) + boost * 0.45 + ((gx * d * lx + gy * d * ly) * 0.22 + ((qx * lx + (qy - cy0) * ly) / Rg) * 0.34) * o.rim + (1 - d) * 0.12 + (cur - 0.5) * 0.46 * o.currents;
      const ci = clamp(Math.round(1.5 + lit * 5), far ? 1 : 2, far ? 4 : 7);
      p.px(px, py, ci === 7 ? WHITE : C[ci]);
    }
  if (far) return;
  // the near arm casts a thin shadow on the body beside it, on the side away from the light
  for (let j = 1; j < H - 1; j++)
    for (let i = 1; i < W - 1; i++) {
      const n = j * W + i, s = Ls[n];
      if (s <= 0 || s > 1.4 || Gs[n] > 0 || Gs[n - 1] > 0 || Gs[n + 1] > 0 || Gs[n - W] > 0 || Gs[n + W] > 0) continue;
      const gx = Ls[n + 1] - Ls[n - 1], gy = Ls[n + W] - Ls[n - W], gl = Math.hypot(gx, gy) || 1;
      if ((gx * lx + gy * ly) / gl < -0.2) p.px(X0 + i + 0.5, Y0 + j + 0.5, C[3]);
    }
}
// the halo against the skin and the aura, as for the blob, around whatever shape it has now
function aura(p, C, o, F) {
  const { X0, Y0, W, H, Gs, st, ch, hm, fig } = F, S = o.size * st.m.grow, U = F.U * ch.scale, k = F.k, m = st.m, Hh = o.halo * m.halo * lerp(1, o.huHalo, k), xg = F.ext ? m.glow : 0;
  const [cx, cy] = F.toScreen(0, lerp(0, (fig.chest + fig.hips) / 2, k));
  p.glow(cx, cy, lerp(S * 3.2, U * 3.4, k), C[2], 0.3 * Hh);
  p.glow(cx, cy, lerp(S * 2, U * 2.2, k), C[4], 0.22 * Hh + 0.3 * (ch.glow + ch.white + xg));
  if (k > 0.3) { const [hx, hy] = F.headS; p.glow(hx, hy, U * 1.2, C[4], 0.12 * Hh * k); }
  if (o.ground > 0) {
    const gyB = o.size * o.groundDist + o.hover + Math.max(0, m.dy), gyH = bottomOf(o) * F.U + o.size * (o.groundDist - 1) * 0.5 + o.hover;
    const by = lerp(st.y, st.y + bottomOf(o) * F.U - o.size, k), G = F.G, ay = F.ext ? m.ay : 0;
    // (moved elsewhere by another tab, ay, its ground goes with it)
    let gy = lerp(gyB, gyH, k) + ay, near = clamp(1 - (gy - by) / (gy - ay + o.hover + 1) + 0.5);
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
        const q = j * W + i, s = Math.min(Gs[q], F.Hs ? F.Hs[q] : 99, F.As ? F.As[q] : 99, F.Fs ? F.Fs[q] : 99), d = s / hm;
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
  if (F.fig.side) {
    // side on, its face is turned three-quarters toward the way it goes: both eyes slid forward and closer, looking ahead
    // (turning, tk of the way)
    const sd = F.fig.side, tk = F.fig.turnK ?? 1;
    Object.assign(oe, { eyeSpacing: oe.eyeSpacing * toward(1, 0.86, tk) });
    Object.assign(se, { x: se.x + sd * hr * 0.24 * tk, vx: tk >= 1 ? 0 : se.vx * (1 - tk), vy: tk >= 1 ? 0 : se.vy * (1 - tk),
      m: { ...se.m, lookX: toward(se.m.lookX, sd * 0.85 + st.m.lookX * 0.3, tk), lookY: toward(se.m.lookY, 0.1, tk) } });
    const er = toward(lerp(1, 1.05, ke), 1.02, tk);
    drawEyes(p, C, oe, se, () => hr * er);
    return;
  }
  drawEyes(p, C, oe, se, () => hr * lerp(1, 1.05, ke));
}
// drops of light falling from its lowest points (tail tip, toes), and light rising from its palms
function dropsAndHands(p, C, t, o, F) {
  const { ph, P, fig } = F, n = whole(o.huDrops) * whole(o.liveLoops, 1), T = total(o), outAt = T * leadOut(o, T);
  // a drop shows if the form was whole and at rest when it fell (the frames it chains with have the same drops)
  // (in another tab: unless that tab was busy when it fell, as for the blob's own drops)
  const shown = F.ext ? (t0) => !(F.M && (F.M(t0).quiet || 0) > 0) : (t0) => o.mode === "live" || (o.mode === "transform" ? t0 >= outAt : t0 <= T * leadIn(o, T));
  if (F.G) {
    // on the ground they drip from its fingertips, fall to the floor and splash
    const G1 = gravityAt(o, 1), FY = F.G.FY;
    if (n) cycle(ph.h, P, n, o.seed + 77, (g) => g.range(1, 1.6), (age, life, r, i) => {
      const t0 = t - age;
      if (!shown(t0)) return;
      const s0 = state(o, t0, null), { ox, oy, X } = grounding(o, s0, G1, 1, 0), f0 = stander(o, s0, ph.h - age, P, G1g, X), hd = f0.hands[i % f0.hands.length];
      if (!hd) return;
      // (from where another tab had moved it to when it fell, ax)
      const ax0 = F.ext && F.M ? F.M(t0).ax || 0 : 0;
      const x = ox + ax0 + hd[0] + Math.sin(i * 2.3) * 0.6, y0 = oy + hd[1] + 2, hit = Math.sqrt(Math.max(0, FY - 0.5 - y0) / 46);
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
    const s0 = state(o, t0, F.ext ? F.M : null), f0 = human(o, s0, ph.h - age, P, G1), tip = f0.tips[i % f0.tips.length];
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
  // (lit round the figure: where it stands, or where another tab's steps or moves took it)
  const wx = F.turnWx != null ? F.turnWx : F.X && F.X.step ? F.ox - F.X.sx : F.X && F.X.gait ? F.ox : 0, lumAt = (px) => { const d = Math.abs(px - wx), edge = clamp(Math.min(px - room[0], room[2] - px) / (W * 0.14)); return Lt * (0.28 + 0.72 * Math.exp(-d / (U * 2.4))) * (0.3 + 0.7 * edge); };
  // the reflection: the body seen upside down in the ice, darker, in lines that thin out with depth
  const refl = o.grReflect > 0 && F.Gs && !F.hidden ? Math.round(U * 2.6 * o.grReflect) : 0;
  const sh = new Uint8Array(W);
  if (refl) {
    const { X0, Y0, W: GW, H: GH, Gs, Hs, As, Fs } = F;
    for (let d = 1; d <= refl && FY + d < y1; d++) {
      const f = d / refl;
      if (f > 0.35 && f <= 0.7 ? d % 2 : f > 0.7 ? d % 3 : 0) continue;
      const j = FY - d - Y0;
      if (j < 1 || j >= GH - 1) continue;
      for (let i = 1; i < GW - 1; i++) {
        const px = X0 + i + 0.5;
        if (Math.abs(px) > reach || px < room[0] || px > room[2]) continue;
        const n = j * GW + i, s = Math.min(Gs[n], As ? As[n] : 1), hs = Math.min(Hs ? Hs[n] : 1, Fs ? Fs[n] : 1);
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
    const px = x + 0.5, d = Math.abs(px - wx);
    if (Math.abs(px) > reach) continue;
    const lum = lumAt(px), ci = clamp(Math.round(1 + lum * 5.2), 1, 6), head = grow && reach - Math.abs(px) < 2.5;
    p.px(px, FY + 0.5, head ? WHITE : C[ci]);
    if (!sh[x - x0] && ci > 2) p.px(px, FY + 1.5, C[ci - 2]);
    // the nearer lines (lower down) catch its light wider: the floor comes toward us
    if (ice) for (const [dd, kk] of FLOOR_LINES) {
      const yy = FY + 1 + Math.round(dd * U);
      if (yy >= y1) break;
      const edge = clamp(Math.min(px - room[0], room[2] - px) / (W * 0.14)), ll = Lt * (0.28 + 0.72 * Math.exp(-d / (U * 2.4 * (1 + dd * 1.4)))) * (0.3 + 0.7 * edge);
      const cl = Math.round(ll * kk * 4.2);
      if (cl >= 1 && (cl > 1 || (x - x0 + yy) % 2 === 0)) p.px(px, yy + 0.5, C[Math.min(cl, 3)]);
    }
  }
  // its light on the floor, and under its feet once it stands on it
  p.glow(wx, FY, U * 2.2, C[4], 0.16 * Lt * G.fl);
  if (grow) p.glow(reach, FY, 5, WHITE, 0.4 * G.fl), p.glow(-reach, FY, 5, WHITE, 0.4 * G.fl);
  if (G.plant && F.fig) for (const [tx, ty] of F.fig.tips) { const [x, y] = F.toScreen(tx, ty); p.glow(x, FY, U * 0.45, C[6], 0.3 * Lt * clamp(1 - (FY - y) / (U * 0.3)) * (F.k ?? 1)); }
  // glints running on the ice (carried back with the floor while it walks or runs over it on the spot: a whole number of
  // tiles a loop; still when it walks along it). They dim as the figure melts into light, so they don't jump when it turns
  const n = whole(o.grGlints) * whole(o.liveLoops, 1), Wk = F.X && F.X.gait, Tt = Math.max(16, Math.ceil(Math.max(room[2] - room[0], room[3] - room[1])));
  const slide = Wk ? (Wk.dir < 0 ? -1 : 1) * gaitDist(G.Lw, Wk) - (F.ext ? F.st.m.ax : 0) : 0, lit = (F.ext ? 1 - (F.st.m.morph || 0) : 1) * (F.turn != null ? Math.abs(1 - 2 * F.turn) : 1);
  if (n) cycle(F.ph.h, F.P, n, o.seed + 313, (g) => g.range(0.45, 0.9), (age, life, r) => {
    const k = age / life, r0 = r.range(0, 1), x = Wk ? Math.floor(room[0] + (((r0 * Tt - slide) % Tt) + Tt) % Tt) + 0.5 : Math.floor(lerp(room[0] + 3, room[2] - 3, r0)) + 0.5, a = Math.sin(Math.PI * k) * G.fl * lit;
    if (Wk && (x < room[0] + 3 || x > room[2] - 3)) return;
    if (Math.abs(x) > reach || a < 0.3) return;
    star(p, C, x, FY + 0.5, a > 0.75 ? 2 : 1);
    p.glow(x, FY, 4, C[6], 0.35 * a * Lt);
  });
}
// walking or running: where each foot came down it leaves a print of light on the ground, carried back with the ground
// and fading; a little flash as it lands; running, light kicked up behind as the toes push off. Ages are counted in
// strides since each landing (whole strides a loop, so the prints loop with it)
function gaitFx(p, C, o, F) {
  const Wk = F.X && F.X.gait;
  if (!Wk || F.hidden || !F.G) return;
  const Lw = F.G.Lw, sol = gaitSolve(Lw, Wk), K = sol.K, U = Lw.U, FY = F.G.FY, sd = Wk.dir < 0 ? -1 : 1, S = sol.S, { L: Ln, t } = lineOf(Wk, S), c = Ln.c(t), dn = Ln.d(t);
  const N = Math.max(1, Math.round(Wk.N || 1)), pr = Math.max(0, Wk.prints ?? 1), sp = Math.max(0, Wk.sparks ?? 1), life = K.run ? 1.7 : 2.6;
  const fb = FOOT.fb * U, hb = FOOT.hb * U, tb = FOOT.tb * U, room = roomOf(o), Lt = o.grLight;
  // (ox: where another tab carries it along the floor; lit: the prints dim as it melts into light, to turn)
  const ox = F.ext ? F.st.m.ax : 0, lit = (F.ext ? 1 - (F.st.m.morph || 0) : 1) * (F.turn != null ? clamp(2 * F.turn - 1) : 1), X = (v) => ox + sd * v;
  for (const [side, off] of [[1, 0], [-1, 0.5]]) {
    for (let k = 0; k <= Math.ceil(life) + 1; k++) {
      const j = Math.floor(c - off) - k, a = c - off - j;
      if (a < 0 || a > life) continue;
      // that landing: how long a step it was (a foot set down where it stood leaves nothing) and where its ball came down
      const cj = j + off, rho = Ln.rho(Ln.tOf(cj)), w = rho * lit;
      if (w <= 0.02) continue;
      const r = rng(o.seed, 717 + (side > 0 ? 0 : 1), ((j % N) + N) % N), G = Ln.d(Ln.tOf(cj)) + fb + (sol.b0 - fb) * rho, ball = G - dn;
      // the print: the sole's length (running, mostly the ball of the foot), a dash of light on the ground
      const x0 = ball - (K.run ? fb * 0.7 : fb + hb), x1 = ball + tb * 0.8, fade = (1 - a / life) ** 1.4 * pr * w;
      if (fade > 0.06 && a > 0.04) for (let x = Math.floor(Math.min(X(x0), X(x1))); x <= Math.ceil(Math.max(X(x0), X(x1))); x++) {
        const px = x + 0.5;
        if (px < room[0] || px > room[2]) continue;
        const e = Math.abs(px - X((x0 + x1) / 2)) / ((x1 - x0) / 2 + 0.5), v = fade * (1 - 0.45 * e * e) * (0.85 + 0.3 * r.next());
        if (v < 0.12 || (v < 0.3 && (x + Math.floor(a * 7)) % 2)) continue;
        p.px(px, FY + 0.5, v > 0.75 ? C[6] : v > 0.45 ? C[5] : v > 0.25 ? C[4] : C[3]);
        if (v > 0.5) p.px(px, FY + 1.5, C[3]);
      }
      if (fade > 0.1 && a > 0.04) p.glow(X((x0 + x1) / 2), FY, U * 0.35, C[5], 0.25 * fade * Lt);
      // the landing: a short flash where it touches down, and a few grains of light springing from it
      const fl = 1 - a / 0.12;
      if (fl > 0 && pr > 0) {
        const cx = X(K.run ? ball : ball - fb - hb);
        p.glow(cx, FY, U * 0.5, C[6], 0.45 * fl * Math.min(1.5, pr) * Lt * w);
        if (w > 0.25) for (let i = 0, m = K.run ? 4 : 2; i < m; i++) {
          const g = rng(o.seed, 727, ((j % N) + N) % N, i, side > 0 ? 0 : 1), h = a / 0.12, vx = g.range(0.3, 1) * (i % 2 ? 1 : -1);
          p.px(cx + sd * vx * h * U * 0.5, FY - 0.5 - Math.sin(Math.PI * h) * U * g.range(0.08, 0.2) * w, h < 0.4 ? WHITE : C[6]);
        }
      }
      // running: light kicked up behind as the toes leave the ground, carried back and falling
      if (K.run && sp > 0) {
        const b = a - K.beta, Lk = 0.42;
        if (b > 0 && b < Lk) {
          const tOff = Ln.tOf(cj + K.beta), dOff = Ln.d(tOff), toe = G - dOff + tb;
          for (let i = 0, m = Math.round(5 * sp * w); i < m; i++) {
            const g = rng(o.seed, 737, ((j % N) + N) % N, i, side > 0 ? 0 : 1), h = b / g.range(0.6 * Lk, Lk);
            if (h >= 1) continue;
            const x = X(toe - (dn - dOff) * g.range(1.1, 1.6) - g.range(0, 0.15) * U), y = FY - 0.5 - (g.range(0.15, 0.45) * U * Math.sin(Math.PI * Math.min(1, h * 1.15)));
            p.px(x, y, h < 0.3 ? WHITE : h < 0.65 ? C[6] : C[4]);
            if (h < 0.5) p.glow(x, y, 3, C[5], 0.3 * (1 - h) * sp);
          }
        }
      }
    }
  }
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
  const { st, fig } = F, k = F.k, [x, y] = F.toScreen(0, lerp(0, fig.hips - 0.1 * F.U, k));
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

function drawBack(p, t, o) {
  const C = fit(o.palette, 8), F = frameAt(o, t);
  if (F.blob) blobBack(p, t, o, F.M, C);
  else { aura(p, C, o, F); sparksOf(p, C, o, F, false); floorFx(p, C, o, F); }
  ambient(p, t, o, false, C, motesAt(o, F));
  changeFx(p, C, o, F, false);
  landFx(p, C, t, o, F, false);
}

function draw(p, t, o) {
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

// ---- the new forms, for the other tabs. bodyBack / bodyFront / bodyAmbient replace the idle's blobBack / blobFront /
// ambient: with o.form "human" (levitating) or "grounded" (on its legs, on its floor of ice) they draw the creature in
// that form, with this tab's settings (FORM_DEFAULTS fill what a tab doesn't give); anything else is the blob. A tab
// hands over its modifiers M as for the blob: they move, squash, turn, light and pose the figure (and on the floor
// become steps, jumps, crouches and leans, see walking()), plus a few of its own for the arms (armUp, armOpen, hold,
// reach + reachK). At rest it is the "live" loop pixel for pixel, so "from rest" in a new form means from that loop.
// T is the tab's length: the figure's own clock runs on the live loop's period, so over T it is nudged (a little
// faster mid-way, never near the ends) to come back on that loop's frame (figClock).
const FORM_DEFAULTS = Object.freeze(Object.fromEntries(Object.entries(meta.options).filter(([k]) => /^(hu|gr)[A-Z]/.test(k) || k === "liveLoops")));
/** The forms the creature can take: the blob it is born as, and the Transformation's two human forms. A new form: its
 * figure in this file, its id here, its names in app/main.js (TF_FORMS, BODY_FORMS, FORM_NAMES); every tab, its life and
 * npm test then play it (skill /new-form). */
const FORMS = ["blob", "human", "grounded"];
const isForm = (o) => !!o && (o.form === "human" || o.form === "grounded");
const FORMED = new WeakMap();
function withForm(o) {
  let f = FORMED.get(o);
  if (!f) { f = { ...FORM_DEFAULTS, ...o, lead: Number.isFinite(o.lead) ? o.lead : 0.08, loops: Number.isFinite(o.loops) ? o.loops : 1 }; FORMED.set(o, f); }
  return f;
}
/** The figure's clock at time t of an animation T long: t at both ends, nudged in between to end on a whole loop. */
function figClock(o, t, T) {
  const P = livePeriod(o);
  if (!(T > 0)) return t;
  const r = T / P, sh = (Math.ceil(r - 1e-9) - r) * P;
  if (sh < 1e-6) return t;
  const n = Math.floor(t / T), f = t / T - n, a1 = Math.max(0.2, 1 - 1.75 / T);
  return t + sh * (n + E(seg(f, 0.04, a1)));
}
// back and front ask for the same frame: keep a few
const EXT = [];
const keyOf = (m) => JSON.stringify(m, (k, v) => (typeof v === "function" ? undefined : v));
function formFrame(o, t, M, T) {
  const st = state(o, t, M), m = st.m, h = figClock(o, t, T);
  let vx = 0;
  if (M && grounded(o)) { const e = 0.004 * o.duration; vx = ((M(t + e).dx || 0) - (M(t - e).dx || 0)) / (2 * e); }
  const key = [t, h, vx, st.x, st.y, st.vx, st.vy, st.sx, st.sy, st.tilt, keyOf(m)].join();
  for (const e of EXT) if (e.o === o && e.key === key) return e.F;
  const F = build(o, t, { M, st, h, vx });
  F.hidden = m.grow < 0.03;
  EXT.unshift({ o, key, F });
  if (EXT.length > 10) EXT.pop();
  return F;
}
// what the tab gets back, as the blob's state: x, y the middle of its body, sx/sy its size against the blob's (so an
// ellipse of o.size * sx by o.size * sy holds its body), and where its hands, head and feet are
function stOf(o, F) {
  const { st, fig } = F, sc = Math.min(F.fsx, F.fsy), [x, y] = F.toScreen(0, (fig.chest + fig.hips) / 2), at = ([a, b]) => F.toScreen(a, b);
  return { ...st, x, y, sx: ((0.5 * F.U) / o.size) * F.fsx, sy: (F.U / o.size) * F.fsy, tilt: F.tilt, form: o.form, U: F.U * sc,
    hands: fig.hands.map(at), head: F.toScreen(fig.head.x, fig.head.y), headR: fig.head.rx * sc, feet: fig.tips.map(at), top: F.toScreen(fig.head.x, fig.box[1]),
    floor: F.G ? F.G.FY : null };
}
/** The creature's back layer in its form. */
function bodyBack(p, t, o, M = null, C = fit(o.palette, 8), T = 0) {
  if (!isForm(o)) return blobBack(p, t, o, M, C);
  const f = withForm(o), F = formFrame(f, t, M, T);
  aura(p, C, f, F); sparksOf(p, C, f, F, false);
  floorFx(p, C, f, F);
  gaitFx(p, C, f, F);
  return stOf(f, F);
}
/** The creature's front layer in its form. */
function bodyFront(p, t, o, M = null, C = fit(o.palette, 8), T = 0) {
  if (!isForm(o)) return blobFront(p, t, o, M, C);
  const f = withForm(o), F = formFrame(f, t, M, T);
  if (!F.hidden) {
    if (F.blobPart) drawDrips(p, C, t, f, F.st, F.rad, F.M);
    dropsAndHands(p, C, t, f, F);
    body(p, C, f, F);
    eyesOf(p, C, f, F);
  }
  sparksOf(p, C, f, F, true);
  return stOf(f, F);
}
/** The motes round it (on its legs, round where it stands). */
function bodyAmbient(p, t, o, front, C = fit(o.palette, 8), off = [0, 0]) {
  if (!isForm(o) || o.form !== "grounded") return ambient(p, t, o, front, C, off);
  const G = gravityAt(withForm(o), 1);
  return ambient(p, t, o, front, C, [off[0] + 0, off[1] + G.gm * (G.FY - 1.85 * G.Lw.U)]);
}
/** Where its frame is and where the middle of its body is, at rest or posed by M: [x, y, middle x, middle y] in local px. */
function formAnchor(o, M = null) {
  if (!isForm(o)) return [0, 0, 0, 0];
  const F = formFrame(withForm(o), 0, M, 0);
  if (F.blob) return [F.st.x, F.st.y, F.st.x, F.st.y];
  const [mx, my] = F.toScreen(0, (F.fig.chest + F.fig.hips) / 2);
  return [F.ox, F.oy, mx, my];
}
/** Where its body reaches at rest, in local px round its spot: [left, top, right, bottom] (the blob's for the blob). */
function formExtent(o) {
  if (!isForm(o)) { const S = o.size; return [-S * 1.05, -S * 1.05, S * 1.05, S * (1.05 + (o.drip || 0))]; }
  const f = withForm(o), F = formFrame(f, 0, null, 0), [x0, y0, x1, y1] = F.fig.box, a = F.toScreen(x0, y0), b = F.toScreen(x1, y1);
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
}
return { STYLES, LEGS, ARMS, GR_ARMS, GR_LOOKS, meta, total, floorOf, gaitLine, gaitPlan, gaitFree, drawBack, draw, FORM_DEFAULTS, FORMS, isForm, bodyBack, bodyFront, bodyAmbient, formAnchor, formExtent };
})();

// ======================================================================================================================
// FICHES  —  src/shared/_fiche.js
// les options d’une animation
// ======================================================================================================================
const M_fiche = (() => {

// What every fiche (GLOSSARY.md) shares: its options, written once, and the catalogue they make together.
//
// An option is  key: [default, label, min, max, step, unit?, how?]  (a slider),  key: [default, label, { select }, how?]
// (a list), or  key: [default]  (no row on the page). The optional `how` says how the page sets it:
//   scene: n   a length in % of the scene's height (n % is the page's default; the effect's default stays in px)
//   x: key / y: key   a point of the scene, in %, that the page turns into that effect option (px from its spot) and
//                     lets you drag in the preview; such a setting exists only on the page
//   forms: [...]      the forms whose page shows the row (others hide it)
const isHow = (v) => v && typeof v === "object" && !Array.isArray(v) && !("select" in v) && !("color" in v);

/** A fiche's options: its effect defaults, page defaults and rows. reserved: the host's own keys (a fiche can't reuse one). */
function options(spec, reserved = {}) {
  const defaults = {}, page = {}, rows = [], scene = [], points = {}, forms = {};
  for (const [key, [value, label, ...row]] of Object.entries(spec)) {
    if (key in reserved) throw new Error(`option ${key}: the blob or the host already has a setting by that name`);
    const how = isHow(row[row.length - 1]) ? row.pop() : {};
    if (how.x || how.y) { points[key] = how.x ? { x: how.x } : { y: how.y }; page[key] = value; }
    else defaults[key] = value;
    if (how.scene != null) { scene.push(key); page[key] = how.scene; }
    if (how.forms) forms[key] = how.forms;
    if (label) rows.push(typeof row[0] === "number" ? [key, label, row[0], row[1], row[2], row[3] ?? ""] : [key, label, row[0]]);
  }
  const x = Object.keys(points).find((k) => points[k].x), y = Object.keys(points).find((k) => points[k].y);
  return { defaults, page, rows, scene, points, forms, target: x && y ? [x, y] : null };
}

/** Every fiche's effect defaults together (two fiches sharing an option must give it the same default). */
function merged(list) {
  const out = {};
  for (const f of list) for (const [k, v] of Object.entries(f.defaults)) {
    if (k in out && out[k] !== v) throw new Error(`fiche ${f.id}: option ${k} = ${v}, but another fiche says ${out[k]}`);
    out[k] = v;
  }
  return out;
}
return { options, merged };
})();

// ======================================================================================================================
// CRÉATURE  —  src/shared/_creature.js
// dessine le corps dans sa forme pour une animation
// ======================================================================================================================
const M_creature = (() => {
const { fit } = PIXELFX;
const { bodyBack, bodyFront, bodyAmbient } = M_forms;
// The creature drawn by an animation, the same way in every tab: its body in its form (forms.js) moved by the animation's
// modifiers, the motes round it, then what the animation draws itself (back layer, then front layer).


/**
 * frame(o, t) → { M: modifiers at a time, T: the animation's length, drift?: where the motes follow it,
 * extra?(p, C, st, front): what the animation draws over its body }. Returns the effect's drawBack and draw.
 */
function creature(frame) {
  const layer = (front) => (p, t, o) => {
    const f = frame(o, t), C = fit(o.palette, 8);
    const st = front ? bodyFront(p, t, o, f.M, C, f.T) : bodyBack(p, t, o, f.M, C, f.T);
    bodyAmbient(p, t, o, front, C, f.drift);
    if (f.extra) f.extra(p, C, st, front);
    return st;
  };
  return { drawBack: layer(false), draw: layer(true) };
}
return { creature };
})();

// ======================================================================================================================
// HÔTE DES BOUCLES  —  src/loops/_loop.js
// entrée, boucle, sortie
// ======================================================================================================================
const M_loop = (() => {
const { lerp, TAU } = PIXELFX;
const { meta: idleMeta } = M_blob;
const { formAnchor, isForm, FORM_DEFAULTS } = M_forms;
const { phases, settle } = M_time;
const { creature } = M_creature;
const { options, merged } = M_fiche;
// The host of the loops: what every loop fiche gets without writing it. Its period (whole loops of the blob), its three
// parts (o.part: "loop" the activity itself, "enter" from rest, "exit" back to rest), the rest when its form can't do it,
// and its body drawn in every form (shared/_creature.js).
//
// The three parts. The entry starts on the rest's frame and the activity's own clock runs up to 0 on its last frame, where
// the loop starts; the exit starts where the loop ends (its clock goes on) and ends on the rest's frame. In between, the
// activity's intensity k (phases(), shared/_time.js) draws each of its modifiers back to rest (settle()) and fades what it
// draws; k = 1 for the last 1.7 s of the entry, so the drops of light alive at the join are the loop's. A pose the activity
// needs (sitting cross-legged on the floor, legs crossed, arms down) can't be faded: the figure melts into light (morph 1),
// the pose switches while nothing of the figure shows, and on its legs its frame gathers at a point going from where one
// pose has it to where the other does (anchor), so the light doesn't jump. A fiche may bring its own parts instead
// (act.parts(part, T), like walking and running: a quarter turn and their first and last steps).






const REST = { mods: () => ({}) };
// the part, its lengths in the blob's loops, and how long the figure takes to melt into light and back for a pose
const BASE = { form: "blob", loops: 2, part: "loop", inLoops: 1, outLoops: 1, lead: 0.08, meltTime: 1.1 };
const META = { tags: ["creature", "blob", "loop", "idle", "activity", "ice", "light"], size: [320, 180], origin: [160, 100], duration: 8, loop: true, fps: 30, bg: "black" };

/** The activity's period (o.loops of the blob's loops), and its phase 0..1 at any time (negative too). */
const loopLen = (o) => o.duration * Math.max(1, Math.round(o.loops));
const phase = (o, t) => (((t / loopLen(o)) % 1) + 1) % 1;
/** Counts that drive motion are whole numbers. */
const whole = (v, lo = 1) => Math.max(lo, Math.round(v));
const gnd = (o) => o.form === "grounded";
/** A dotted ellipse (filter(angle) keeps part of it: the half behind or in front of the creature). */
const ring = (p, x, y, rx, ry, c, a, filter) => { for (let j = 0, m = Math.ceil(Math.max(rx, ry) * 6); j < m; j++) { const th = (j / m) * TAU; if (!filter || filter(th)) p.dot(x + Math.cos(th) * rx, y + Math.sin(th) * ry, c, a); } };
const partOf = (o) => (o.part === "enter" || o.part === "exit" ? o.part : "loop");
// the part's length: the loop, or its entry or exit (whole loops of the blob; a fiche's partLoops can ask for more)
const lengthOf = (f, o) => {
  const p = partOf(o);
  if (p === "loop") return loopLen(o);
  const n = Math.max(1, Math.round(p === "enter" ? o.inLoops : o.outLoops));
  return o.duration * (f && f.partLoops && f.fits(o) ? f.partLoops(o, p, n) : n);
};

/**
 * A loop fiche. def: { id, name, desc (its card in Vivre), loops (its default period), options (see shared/_fiche.js),
 * formFit ({ form: "pourquoi pas, en français" }), play(o) → { mods(t), back?(p, C, t, st), front?(p, C, t, st),
 * parts?(part, T) }: the activity itself, its modifiers and drawing at its own clock t (periodic over loopLen(o): read time
 * through phase(o, t)); its entry and exit come by themselves. gait / partLoops: walking and running (_gait.js) }.
 * The fiche is also a pixelfx effect playing only this loop (meta, drawBack, draw: npm run render -- loops/<id>).
 */
function loop(def) {
  const f = { loops: 2, formFit: {}, ...def, kind: "loop", ...options(def.options, { ...idleMeta.options, ...BASE, loop: 0 }) };
  f.fits = (o) => !f.formFit[o.form];
  f.total = (o) => lengthOf(f, o);
  f.act = (o) => (f.fits(o) ? f.play(o) : REST);
  const own = { ...idleMeta.options, ...BASE, loop: f.id, loops: f.loops, ...f.defaults };
  return Object.assign(f, { meta: { ...META, name: f.name, desc: f.desc, options: own } }, creature(frame(() => f)));
}

/** The loops tab's effect over a catalogue: it plays the loop o.loop names, in the part o.part (an unknown one just rests). */
function family(list) {
  const byId = new Map(list.map((f) => [f.id, f])), ficheOf = (o) => byId.get(o.loop);
  const options = { ...idleMeta.options, ...BASE, loop: list[0].id, ...merged(list) };
  return {
    meta: { ...META, name: "Ice blob loops", desc: "The ice blob busy forever with one of its activities, with an entry from rest and an exit back to it.", options },
    total: (o) => lengthOf(ficheOf(o), o),
    /** Walking or running: how fast it really goes and its strides, for the page (null for the other loops). */
    gaitOf: (o) => { const f = ficheOf(o); return f && f.gait && f.fits(o) ? f.act(o).plan : null; },
    ...creature(frame(ficheOf)),
  };
}

const POSE_KEYS = ["legs", "arms", "seat"];
function poseChange(o, m0) {
  if (!isForm(o)) return false;
  if (o.form === "grounded") return m0.seat > 0.5;
  return !!((m0.legs && m0.legs !== (o.huLegs ?? FORM_DEFAULTS.huLegs)) || (m0.arms && m0.arms !== (o.huArms ?? FORM_DEFAULTS.huArms)));
}
// the part played: the activity, its clock, and (entry, exit) its intensity's timetable or its own parts
const PLANS = new WeakMap();
function planOf(f, o) {
  let pl = PLANS.get(o);
  if (pl) return pl;
  const act = f ? f.act(o) : REST, part = partOf(o), T = lengthOf(f, o);
  pl = { act, part, T, clock: part === "enter" ? (t) => t - T : (t) => t };
  if (part !== "loop" && act.parts) {
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
// what the creature adapter needs at t; what the activity draws fades in and out with it (dithered: crisp pixel art)
const frame = (ficheOf) => (o, t) => {
  const pl = planOf(ficheOf(o), o);
  return { M: modsOf(pl), T: pl.T, extra: (p, C, st, front) => {
    const hook = front ? pl.act.front : pl.act.back, k = pl.part === "loop" ? 1 : pl.at(t).k;
    if (!hook || k <= 0) return;
    const f0 = p.fade;
    p.fade = f0 * k;
    hook.call(pl.act, p, C, pl.clock(t), st);
    p.fade = f0;
  } };
};
return { loopLen, phase, whole, gnd, ring, loop, family };
})();

// ======================================================================================================================
// MARCHE : LE PLAN  —  src/loops/_gait.js
// pas entiers par boucle, sol qui défile, entrée (se tourne de profil, démarre) et sortie (s’arrête, se retourne)
// ======================================================================================================================
const M_gait = (() => {
const { seg, ease } = PIXELFX;
const { gaitPlan, gaitLine } = M_forms;
const { DROP_LIFE, LEAD_MIN } = M_time;
const { loopLen } = M_loop;
// Walking and running on the spot (the figure on its legs), shared by the fiches walk.js and run.js. Side on, it walks or
// runs where it is and its floor of ice goes by under its feet like a treadmill (glints and prints carried back at the
// speed of its steps): whole strides a loop, and the floor goes by whole tiles a loop (gaitPlan), the speed asked rounded
// so the loop is seamless.
// Its own entry and exit, the first steps and the last. Entry: it stands facing us (its rest) and turns side on, its body
// turning as one (the figure facing us and the one side on blend: it never melts), then sets off, its steps growing to the
// loop's over a stride and a half (two running) as its floor starts to go by under it; then it goes at the loop's own pace
// long enough that its steps and prints are the loop's, frame for frame. Exit: it slows down, its steps shortening, stops
// and turns back to face us, at rest. Its steps follow a line (gaitLine, forms.js): every foot stays where it came down
// while the floor goes back under it by exactly as much as it goes, whatever its pace, so nothing slides.




const GAIT_DIRS = [["right", "Vers la droite"], ["left", "Vers la gauche"]];
const E = ease.inOutSine;
const GAIT_RAMP = { walk: 1.5, run: 2 }; // strides from standing to its own pace, and back
const PRINT_LIFE = { walk: 2.6, run: 1.7 }; // how many strides a print lasts (gaitFx)
const TURN = 0.55; // (s) a quarter turn

/** What a walking or running fiche adds to loop(): its play, and the loops its entry and exit take. */
const gait = (kind) => ({ gait: true, play: gaitLoop(kind), partLoops: (o, part, n) => gaitLoops(o, kind, part, n) });

const PLANNED = new WeakMap();
function gaitPlanOf(o, kind) {
  let pl = PLANNED.get(o);
  if (!pl) {
    const r = Array.isArray(o.room) ? o.room : [-160, -100, 160, 80];
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
  const gaitAt = (line, t) => { const c = line.c(t); return { ...W0, ph: c - Math.floor(c), cyc: c, line, t }; };
  const own = gaitLine({ S: plan.S, rate: plan.rate, cs, csInv });
  return {
    plan,
    mods(t) { return { gait: gaitAt(own, t), quiet: 1 }; },
    // its entry and its exit (o.part): the line of its first steps, or of its last, and what they make of the figure
    parts(part, T) { return gaitParts(o, kind, part, T, plan, (line) => (t) => gaitAt(line, t), cs, csInv); },
  };
};
function gaitTimes(o, kind, part, T, rate) {
  const R = GAIT_RAMP[kind] / rate, a0 = Math.max(LEAD_MIN, (o.lead ?? 0.08) * T);
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
function gaitLoops(o, kind, part, n) {
  const key = part + n;
  let m = PART_LOOPS.get(o);
  if (!m) { m = {}; PART_LOOPS.set(o, m); }
  if (m[key]) return m[key];
  const rate = gaitPlanOf(o, kind).rate;
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
return { GAIT_DIRS, gait };
})();

// ======================================================================================================================
// MARCHE : LA FICHE « MARCHE »  —  src/loops/walk.js
// ses réglages (vitesse, bras, cheveux, empreintes…)
// ======================================================================================================================
const M_walk = (() => {
const { loop } = M_loop;
const { gait, GAIT_DIRS } = M_gait;
// « Marche » : on the spot, the figure on its legs walks side on while its floor of ice goes by under its feet (_gait.js).


const fiche = loop({
  id: "walk", name: "Marche", desc: "sur place, le sol défile sous ses pas", ...gait("walk"),
  formFit: {
    blob: "Il marche sur ses jambes : le blob né n’en a pas. Choisis la forme humaine au sol.",
    human: "En lévitation, ses pieds ne touchent pas le sol : il ne peut pas marcher. Choisis la forme humaine au sol.",
  },
  options: {
    gaWalk: [5, "Vitesse de marche", 1.5, 7.5, 0.1, " km/h"],
    gaDir: ["right", "Il marche", { select: GAIT_DIRS }],
    gaStride: [1, "Longueur des pas", 0.7, 1.4, 0.01, "×"],
    gaArms: [1, "Balancement des bras", 0, 2.5, 0.05],
    gaLean: [1, "Se penche en avant", 0, 3, 0.05],
    gaHair: [1, "Les cheveux suivent ses pas", 0, 2.5, 0.05],
    gaPrints: [1, "Empreintes de lumière sur le sol", 0, 2, 0.05],
    gaBounce: [1], gaHeel: [1], gaKnee: [1], gaSparks: [1], // (set on the run's page; walking keeps them as they are)
  },
});
const { meta, drawBack, draw } = fiche;
return { meta, drawBack, draw, fiche };
})();

// ====================================================================================================================
// DÉMO / UTILISATION — dessine la forme humaine au sol, en attente ou en marche, dans un canvas (320 × 180 pixels)
// ====================================================================================================================
const SCENE = [320, 180]; // la scène (16:9), en pixels
const SPOT = [160, 90];   // où se tient la créature dans la scène (son centre au repos)
// la pièce, en pixels autour de sa place : le sol de glace s’étend sur toute sa largeur
const ROOM = [-SPOT[0], -SPOT[1], SCENE[0] - SPOT[0], SCENE[1] - SPOT[1]];
const FORMS_FX = M_forms;  // la Transformation : son mode "live" sous la forme "grounded" est l’ATTENTE
const WALK_FX = M_walk;    // la fiche « Marche »
const PART = { marche: "loop", entree: "enter", sortie: "exit" };

/** Les réglages d’une animation : "attente" (debout, il attend) ou "marche" / "entree" / "sortie" (la marche). */
function options(kind = "attente", extra = {}) {
  if (kind === "attente") return { ...FORMS_FX.meta.options, form: "grounded", mode: "live", room: ROOM, ...extra };
  return { ...FORMS_FX.FORM_DEFAULTS, ...WALK_FX.meta.options, form: "grounded", part: PART[kind] || "loop", room: ROOM, ...extra };
}
const fxOf = (kind) => (kind === "attente" ? FORMS_FX : WALK_FX);
/** La durée de l’animation (s). L’attente et la marche bouclent ; l’entrée et la sortie se jouent une fois. */
function length(kind = "attente", o = options(kind)) {
  return kind === "attente" ? FORMS_FX.total(o) : WALK_FX.fiche.total(o);
}
const FRAME = PIXELFX.createFrame(SCENE[0], SCENE[1]);
/** Une image au temps t (s) dans un canvas (mis à 320 × 180, agrandi en CSS sans flou). bg : le fond (noir pur). */
function render(canvas, kind = "attente", t = 0, o = options(kind), bg = 0x000000) {
  const fx = fxOf(kind), p = PIXELFX.painterFor(PIXELFX.clearFrame(FRAME));
  p.place(SPOT[0], SPOT[1]);
  p.layer = "back"; fx.drawBack(p, t, o);   // derrière : halo, sol de glace, empreintes, étincelles de derrière
  p.layer = "front"; fx.draw(p, t, o);      // devant : le corps, ses yeux, ses cheveux, ses mains, les étincelles
  const px = PIXELFX.composite(FRAME, new Uint8ClampedArray(SCENE[0] * SCENE[1] * 4), bg);
  if (canvas.width !== SCENE[0] || canvas.height !== SCENE[1]) { canvas.width = SCENE[0]; canvas.height = SCENE[1]; }
  canvas.getContext("2d").putImageData(new ImageData(px, SCENE[0], SCENE[1]), 0, 0);
}
/** La joue en temps réel (l’attente et la marche en boucle) ; renvoie une fonction qui l’arrête. */
function play(canvas, kind = "attente", o = options(kind)) {
  const T = length(kind, o), once = PART[kind] === "enter" || PART[kind] === "exit", t0 = performance.now();
  let id = 0, last = -1;
  const tick = (now) => {
    const s = (now - t0) / 1000, t = once ? Math.min(s, T - 1 / 30) : s % T, f = Math.floor(t * 30);
    if (f !== last) { last = f; render(canvas, kind, f / 30, o); } // 30 images par seconde, comme les exports
    id = requestAnimationFrame(tick);
  };
  id = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(id);
}
const api = { options, length, render, play, SCENE, SPOT, modules: { forms: M_forms, walk: M_walk, blob: M_blob, gait: M_gait, pixelfx: PIXELFX } };
if (typeof window !== "undefined") window.Couveuse = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;

// la démo : un canvas et des boutons, si la page ne fournit pas déjà un élément #couveuse
if (typeof document !== "undefined" && !document.getElementById("couveuse")) {
  const start = () => {
    document.body.style.cssText = "margin:0;background:#000;color:#9fe0ff;font:14px system-ui;display:flex;flex-direction:column;align-items:center;gap:12px;padding:16px";
    const cv = document.createElement("canvas");
    cv.id = "couveuse";
    cv.style.cssText = "width:min(960px,100%);image-rendering:pixelated;background:#000";
    const bar = document.createElement("div");
    let stop = null;
    const go = (kind) => { if (stop) stop(); stop = play(cv, kind); };
    for (const [kind, label] of [["attente", "Attente"], ["entree", "Se met en marche"], ["marche", "Marche"], ["sortie", "S’arrête"]]) {
      const b = document.createElement("button");
      b.textContent = label;
      b.style.cssText = "margin:0 4px;padding:6px 12px;background:#102654;color:#dcf8ff;border:1px solid #2c7ccc;border-radius:6px;cursor:pointer";
      b.onclick = () => go(kind);
      bar.append(b);
    }
    document.body.append(cv, bar);
    go("attente");
  };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
}

})();
