// The creature once born: a blob of ice-light floating in place, its body never settling, wandering a little
// around its spot, squashing and stretching as it bobs, eyes that blink and look about. Everything random comes
// from noise read along a circle of time, and every cycle is a whole number of turns a loop: no seam, ever.
import { fit, cycle, clamp, lerp, ease, noise2, rng, TAU, WHITE, hex } from "../../core/index.js";

export const meta = {
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

// what an action can lay over the idle; all neutral here, so the idle is the action at rest
export const NONE = Object.freeze({ dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, grow: 1, morph: 0, shape: null, shut: 0, happy: 0, vis: 1, halo: 1, glow: 0, lookX: 0, lookY: 0, quiet: 0, eyeScale: 1, tw: null });
const modAt = (M, t) => (M ? { ...NONE, ...M(t) } : NONE);

// where the body is at phase u: bob, sway and a noise wander
function posAt(o, u) {
  const R = rng(o.seed, 3), ph = R.range(0, TAU);
  const x = Math.sin(TAU * u * turns(o.swayTurns) + ph) * o.sway + (ln(3.1, 7.7, u, o.seed + 1, o.wanderChaos) - 0.5) * 2.4 * o.wander;
  const y = -Math.sin(TAU * u * turns(o.hoverTurns)) * o.hover + (ln(9.4, 1.3, u, o.seed + 2, o.wanderChaos) - 0.5) * 1.6 * o.wander;
  return [x, y];
}

export function state(o, t, M) {
  // tw: an action can slow or stop the blob's own clock (frozen, say); its idle reads that time instead
  const D = o.duration, m = modAt(M, t), ti = m.tw ?? t, u = (((ti / D) % 1) + 1) % 1, e = 0.004;
  const at = (tt) => { const mm = modAt(M, tt), [ix, iy] = posAt(o, (mm.tw ?? tt) / D); return [ix + mm.dx, iy + mm.dy]; };
  const [x, y] = at(t), [x0, y0] = at(t - e * D), [x1, y1] = at(t + e * D);
  const vx = (x1 - x0) / (2 * e * o.duration), vy = (y1 - y0) / (2 * e * o.duration); // px a second
  // squash and stretch: moving up or down stretches it tall, the turn at the top and bottom squashes it
  const sv = clamp(vy / 40, -1, 1) * o.stretch, st = 1 + Math.abs(sv) * 0.12 - 0.04 * o.stretch * Math.cos(TAU * u * turns(o.hoverTurns) * 2);
  const breath = 1 + 0.03 * o.breath * Math.sin(TAU * u * turns(o.breathTurns));
  return { u, t, m, x, y, vx, vy, grow: m.grow, sy: st * breath * m.sy * m.grow, sx: (breath / Math.sqrt(st)) * m.sx * m.grow, tilt: clamp(-vx / 60, -0.4, 0.4) * o.tilt + m.rot };
}

// the outline as a table over angle, in the body's own (unsquashed) space
const TABLE = 512;
export function shapeOf(o, u, m = NONE) {
  const tab = new Float32Array(TABLE + 1), k = turns(o.shapeTurns) || 1;
  for (let j = 0; j <= TABLE; j++) {
    const th = (j / TABLE) * TAU - Math.PI, c = Math.cos(th), s = Math.sin(th);
    const n = noise2(c * o.detail + Math.cos(TAU * u * k) * o.chaos, s * o.detail + Math.sin(TAU * u * k) * o.chaos, o.seed + 9) - 0.5;
    const n2 = noise2(c * o.detail * 2.3 + 40 + Math.cos(TAU * u * k * 2) * o.chaos * 0.6, s * o.detail * 2.3 + Math.sin(TAU * u * k * 2) * o.chaos * 0.6, o.seed + 19) - 0.5;
    let r = 1 + o.wobble * (n * 0.9 + n2 * 0.35);
    r += o.drip * Math.max(0, s) ** 3; // heavier at the bottom: a drop that floats
    r *= 1 + (o.width - 1) * c * c;
    if (m.morph > 0 && m.shape) r = lerp(r, m.shape(th) * (1 + o.wobble * n * 0.25), m.morph);
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
  const S = o.size * st.grow, m = st.m, H = o.halo * m.halo * m.vis;
  p.glow(st.x, st.y, S * 3.2, C[2], 0.3 * H);
  p.glow(st.x, st.y, S * 2, C[4], 0.22 * H + 0.3 * m.glow);
  if (o.ground > 0) {
    // a pool of its light on the ground below: brighter when it dips close
    const gy = o.size * o.groundDist + o.hover + Math.max(0, m.dy), near = clamp(1 - (gy - st.y) / (gy + o.hover + 1) + 0.5);
    for (let i = 0; i < 3; i++) p.glow(st.x, gy, S * (1.2 - i * 0.3), C[4 + i], 0.18 * o.ground * near * st.m.vis);
    p.shade(st.x - S * 1.6, gy - 3, st.x + S * 1.6, gy + 3, (x, y, out) => {
      const d = Math.hypot((x - st.x) / (S * (1.3 - 0.3 * near)), (y - gy) / 2.4);
      if (d > 1) return;
      out.c = 0; out.l = C[5]; out.k = (1 - d) ** 2 * 0.35 * o.ground * near * m.vis;
    });
  }
  if (o.shell > 0) {
    const E = S * 2.6;
    p.shade(st.x - E, st.y - E, st.x + E, st.y + E, (x, y, out) => {
      const [bx, by] = toBody(st, x - st.x, y - st.y), th = Math.atan2(by, bx), r = Math.hypot(bx, by), e = rad(th), d = (r - e) / (o.size * 0.55);
      if (d < 0 || d > 1) return;
      out.c = 0; out.l = d < 0.2 ? C[6] : d < 0.5 ? C[5] : C[4];
      out.k = (1 - d) ** 2 * (0.32 * o.shell + 0.4 * m.glow) * m.vis;
    });
  }
}

function body(p, C, o, st, rad) {
  if (st.m.vis <= 0.02 || st.grow < 0.03) return;
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
  if (!n || m.vis <= 0.02 || st.grow < 0.35) return;
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
  const n = st.m.vis > 0.5 ? Math.round(o.sparks) : 0;
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
export function blobBack(p, t, o, M = null, C = fit(o.palette, 8)) {
  const st = state(o, t, M), rad = shapeOf(o, st.u, st.m);
  aura(p, C, o, st, rad);
  sparks(p, C, o, st, false);
  return st;
}
export function blobFront(p, t, o, M = null, C = fit(o.palette, 8)) {
  const st = state(o, t, M), rad = shapeOf(o, st.u, st.m);
  drips(p, C, t, o, st, rad, M);
  body(p, C, o, st, rad);
  eyes(p, C, o, st, rad);
  sparks(p, C, o, st, true);
  return st;
}
export function ambient(p, t, o, front, C = fit(o.palette, 8), off = [0, 0]) { motes(p, C, t, o, front, off[0], off[1]); }

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8);
  blobBack(p, t, o, null, C);
  motes(p, C, t, o, false);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8);
  blobFront(p, t, o, null, C);
  motes(p, C, t, o, true);
}
