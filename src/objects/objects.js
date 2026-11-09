// The blob's scene with things in it: solid shapes of ice-light (a cube, a sphere, a pyramid, a crystal, a column,
// a gem) floating weightless around it, turning slowly, all on the blob's own loop. Three animations:
//   live    the blob and every object floating, a loop of the blob's rest
//   appear  the blob conjures one object (a halo gathering, a laser, crystals assembling, an orb)
//   remove  the blob takes one away (dissolving, a laser, an implosion, shattering, swallowing it)
// Objects move only by whole turns of the blob's loop, and the blob's part goes back to rest at both ends, so
// "live without it" -> "appear" -> "live with it" -> "remove" -> "live without it" chain frame for frame.
import { fit, clamp, lerp, seg, bump, ease, noise2, rng, TAU, WHITE } from "../../pixelfx/src/core/index.js";
import { meta as idleMeta, state } from "../blob/blob.js";
import { prog as progAt } from "../shared/_time.js";
import { creature } from "../shared/_creature.js";
import { hsl, fromHsl } from "../shared/_color.js";

export const APPEAR = ["halo", "laser", "crystal", "orb"];
export const REMOVE = ["dissolve", "laser", "implode", "shatter", "swallow"];

export const meta = {
  name: "Ice scene objects",
  desc: "The ice blob's weightless scene: solid shapes of ice-light float and turn around it; it can conjure one (halo, laser, crystals, orb) or take one away (dissolve, laser, implode, shatter, swallow).",
  tags: ["creature", "blob", "objects", "scene", "ice", "light", "loop"],
  size: [320, 180],
  origin: [160, 100],
  duration: 4,
  loop: true,
  fps: 30,
  bg: "black",
  options: {
    ...idleMeta.options,
    // objects: { shape, x, y (offset from the blob's spot, own pixels), size, spinY, spinX, tilt, float, floatTurns, hue, glow, layer, ph }
    objects: [
      { shape: "cube", x: -70, y: -30, size: 12, spinY: 1, spinX: 0, tilt: 0.45, float: 4, floatTurns: 1, hue: 0, glow: 1, layer: "back", ph: 0.1 },
      { shape: "sphere", x: 75, y: 20, size: 10, spinY: -1, spinX: 0, tilt: 0.3, float: 5, floatTurns: 2, hue: 0, glow: 1, layer: "front", ph: 0.6 },
    ],
    form: "blob", mode: "live", target: 0, loops: 1, lead: 0.08, castLean: 1,
    appearStyle: "halo", appearPower: 1, appearParticles: 28,
    removeStyle: "dissolve", removePower: 1, removeParticles: 28,
  },
};

const E = ease.inOutSine;
/** Its length: a whole number of the blob's loops. */
export const total = (o) => o.duration * Math.max(1, Math.round(o.loops));
// as for the actions: the lead-out outlasts a drop of light, so the last frame is the rest's
const prog = (o, t) => progAt(o, t, total(o));
const ln = (x, y, u, s, r = 1) => noise2(x + Math.cos(TAU * u) * r, y + Math.sin(TAU * u) * r, s);
const hash = (x, y, s) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };

// ---- solids: vertices (y up) and faces, faces turned outward. A new shape: its solid here (the sphere is drawn apart, in
// drawObject), its French name in app/main.js (SHAPE_LIST)
function solid(verts, faces) {
  return {
    verts,
    faces: faces.map((f) => {
      const c = f.reduce((a, i) => [a[0] + verts[i][0] / f.length, a[1] + verts[i][1] / f.length, a[2] + verts[i][2] / f.length], [0, 0, 0]);
      const [a, b, d] = [verts[f[0]], verts[f[1]], verts[f[2]]];
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      return n[0] * c[0] + n[1] * c[1] + n[2] * c[2] < 0 ? [...f].reverse() : f;
    }),
  };
}
const SOLIDS = {};
{
  const k = 0.78;
  SOLIDS.cube = solid([[-k, -k, -k], [k, -k, -k], [k, k, -k], [-k, k, -k], [-k, -k, k], [k, -k, k], [k, k, k], [-k, k, k]],
    [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4]]);
  SOLIDS.pyramid = solid([[-0.9, -0.7, -0.9], [0.9, -0.7, -0.9], [0.9, -0.7, 0.9], [-0.9, -0.7, 0.9], [0, 1.05, 0]],
    [[0, 1, 2, 3], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]]);
  SOLIDS.crystal = solid([[0.8, 0, 0], [-0.8, 0, 0], [0, 1.25, 0], [0, -1.25, 0], [0, 0, 0.8], [0, 0, -0.8]],
    [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [0, 3, 4], [4, 3, 1], [1, 3, 5], [5, 3, 0]]);
  const hv = [];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; hv.push([Math.cos(a) * 0.72, 1, Math.sin(a) * 0.72]); }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; hv.push([Math.cos(a) * 0.72, -1, Math.sin(a) * 0.72]); }
  const hf = [[0, 1, 2, 3, 4, 5], [6, 7, 8, 9, 10, 11]];
  for (let i = 0; i < 6; i++) hf.push([i, (i + 1) % 6, 6 + ((i + 1) % 6), 6 + i]);
  SOLIDS.column = solid(hv, hf);
  const p = (1 + Math.sqrt(5)) / 2, s = 1 / Math.sqrt(1 + p * p);
  const iv = [[-1, p, 0], [1, p, 0], [-1, -p, 0], [1, -p, 0], [0, -1, p], [0, 1, p], [0, -1, -p], [0, 1, -p], [p, 0, -1], [p, 0, 1], [-p, 0, -1], [-p, 0, 1]].map((v) => v.map((c) => c * s));
  SOLIDS.gem = solid(iv, [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]]);
}

// ---- tiny rasterisers that take a clip test, so objects can be revealed and erased pixel by pixel
function fillPoly(p, pts, c, clip) {
  let y0 = Infinity, y1 = -Infinity;
  for (const [, y] of pts) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2)
      for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) if (!clip || clip(x + 0.5, yc)) p.px(x + 0.5, yc, c);
  }
}
function plotLine(p, x0, y0, x1, y1, c, clip, a = 1) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) {
    const x = Math.floor(x0 + ((x1 - x0) * i) / n) + 0.5, y = Math.floor(y0 + ((y1 - y0) * i) / n) + 0.5;
    if (!clip || clip(x, y)) a >= 1 ? p.px(x, y, c) : p.dot(x, y, c, a);
  }
}

// ---- one object's pose at time t: weightless float and slow turning, whole turns of the blob's loop
function pose(o, ob, t) {
  const u = t / o.duration, ph = ob.ph || 0, ft = Math.max(0, Math.round(ob.floatTurns ?? 1)), sid = Math.round(ph * 1000);
  const fx = ob.float * 0.35 * Math.sin(TAU * (u * Math.max(1, ft) + ph * 1.7)) + (ln(ph * 9, 2, u, o.seed + sid, 0.8) - 0.5) * ob.float * 0.6;
  const fy = ob.float * Math.sin(TAU * (u * ft + ph)) + (ln(3, ph * 9, u, o.seed + sid + 1, 0.8) - 0.5) * ob.float * 0.4;
  return {
    x: ob.x + fx, y: ob.y + fy, s: ob.size,
    yaw: TAU * (Math.round(ob.spinY ?? 1) * u + ph), pitch: (ob.tilt ?? 0.4) + TAU * Math.round(ob.spinX ?? 0) * u + 0.12 * Math.sin(TAU * (u + ph)),
    roll: 0.1 * Math.sin(TAU * (u + ph * 2)),
  };
}

const palCache = new Map();
function paletteFor(o, hue) {
  if (!hue) return fit(o.palette, 8);
  const key = o.palette.join() + "|" + hue;
  if (!palCache.has(key)) palCache.set(key, fit(o.palette.map((c) => { const [h, s, l] = hsl(c); return fromHsl((((h + hue) % 360) + 360) % 360, s, l); }), 8));
  return palCache.get(key);
}

// draw one object. fx: { scale, tint (0..1 toward white), clip(x, y), wire (edges only, 0..1), dx, dy, spin }
export function drawObject(p, o, ob, t, fx = {}) {
  const C = paletteFor(o, ob.hue || 0), ps = pose(o, ob, t), sc = fx.scale ?? 1, tint = fx.tint || 0, clip = fx.clip || null;
  const X = ps.x + (fx.dx || 0), Y = ps.y + (fx.dy || 0), s = ps.s * sc;
  if (s < 0.5) return;
  const la = (o.lightAngle * Math.PI) / 180, L = [Math.cos(la), -Math.sin(la), 0.9], ll = Math.hypot(...L);
  L[0] /= ll; L[1] /= ll; L[2] /= ll;
  const idx = (k) => clamp(Math.round(lerp(2 + k * 4.6, 7, tint)), 2, 7), col = (i) => (i >= 7 ? WHITE : C[i]);
  if ((ob.glow ?? 1) > 0 && !fx.wire) {
    p.glow(X, Y, s * 2.4, C[4], 0.16 * ob.glow * Math.min(1, sc));
    p.glow(X, Y, s * 1.2, C[6], 0.1 * ob.glow * Math.min(1, sc));
  }
  if (ob.shape === "sphere") {
    const yaw = ps.yaw + (fx.spin || 0);
    for (let y = Math.floor(Y - s - 1); y <= Math.ceil(Y + s + 1); y++)
      for (let x = Math.floor(X - s - 1); x <= Math.ceil(X + s + 1); x++) {
        const px = x + 0.5, py = y + 0.5, nx = (px - X) / s, ny = (py - Y) / s, r2 = nx * nx + ny * ny;
        if (r2 > 1 || (clip && !clip(px, py))) continue;
        const nz = Math.sqrt(1 - r2), lit = clamp(nx * L[0] - ny * L[1] + nz * L[2]);
        if (fx.wire) { if (r2 > (1 - 1.5 / s) ** 2) p.dot(px, py, C[6], fx.wire); continue; }
        if (Math.sqrt(r2) > 1 - 1 / s) { p.px(px, py, lit > 0.55 ? WHITE : tint > 0.5 ? C[6] : C[3]); continue; }
        // meridians and an equator turning with it, so you can see it spin
        const cp = Math.cos(ps.pitch), sp = Math.sin(ps.pitch), ny3 = -ny * cp - nz * sp, nz3 = -(-ny) * sp + nz * cp;
        const lon = Math.atan2(nx, nz3) + yaw, mer = ((lon / TAU) * 4 % 1 + 1) % 1, line = mer < 0.07 || Math.abs(ny3) < 0.06;
        let i = idx(lit);
        if (lit > 0.93) i = 7;
        else if (line) i = Math.max(2, i - 1);
        p.px(px, py, col(i));
      }
    return;
  }
  const sd = SOLIDS[ob.shape] || SOLIDS.cube;
  const cy = Math.cos(ps.yaw + (fx.spin || 0)), sy = Math.sin(ps.yaw + (fx.spin || 0)), cx = Math.cos(ps.pitch), sx = Math.sin(ps.pitch), cr = Math.cos(ps.roll), sr = Math.sin(ps.roll);
  const rot = ([x, y, z]) => {
    let a = x * cy + z * sy, b = y, c = -x * sy + z * cy; // yaw
    let d = b * cx - c * sx; c = b * sx + c * cx; b = d; // pitch
    d = a * cr - b * sr; b = a * sr + b * cr; a = d; // roll
    return [a, b, c];
  };
  const V = sd.verts.map(rot), P = V.map(([a, b]) => [X + a * s, Y - b * s]);
  const faces = sd.faces.map((f) => {
    const [a, b, c] = [V[f[0]], V[f[1]], V[f[2]]];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const nl = Math.hypot(...n) || 1;
    n = n.map((q) => q / nl);
    return { f, n, z: f.reduce((q, i) => q + V[i][2], 0) / f.length };
  });
  if (fx.wire) {
    for (const { f, n } of faces) for (let i = 0; i < f.length; i++) {
      const A = P[f[i]], B = P[f[(i + 1) % f.length]];
      plotLine(p, A[0], A[1], B[0], B[1], n[2] > 0 ? WHITE : C[5], clip, fx.wire * (n[2] > 0 ? 1 : 0.5));
    }
    return;
  }
  const vis = faces.filter((q) => q.n[2] > 0.02).sort((a, b) => a.z - b.z);
  let best = null;
  for (const q of vis) {
    const lit = clamp(q.n[0] * L[0] + q.n[1] * L[1] + q.n[2] * L[2]), i = idx(lit);
    q.i = i;
    fillPoly(p, q.f.map((k) => P[k]), col(i), clip);
    if (!best || lit > best.lit) best = { q, lit };
  }
  // crisp facet edges, brighter on the lit faces; a glint on the brightest corner
  for (const q of vis) for (let i = 0; i < q.f.length; i++) {
    const A = P[q.f[i]], B = P[q.f[(i + 1) % q.f.length]];
    plotLine(p, A[0], A[1], B[0], B[1], col(Math.min(7, q.i + 1)), clip);
  }
  if (best && tint < 0.9) {
    const k = best.q.f.reduce((m, i) => (P[i][0] + P[i][1] < P[m][0] + P[m][1] ? i : m), best.q.f[0]), [gx, gy] = P[k];
    if (!clip || clip(gx, gy)) { p.px(gx + 1, gy + 1, WHITE); p.glow(gx + 1, gy + 1, 3, WHITE, 0.3); }
  }
}

// ---- the blob turns toward what it's making or unmaking, lights up, then is pleased
function castMods(o, t, target, extra = () => ({})) {
  const a = prog(o, t);
  if (a <= 0 || a >= 1) return { quiet: 0 };
  const env = E(seg(a, 0, 0.2)) * (1 - E(seg(a, 0.7, 0.95)));
  const st = state(o, t, null), d = Math.hypot(target[0] - st.x, target[1] - st.y) || 1, dx = (target[0] - st.x) / d, dy = (target[1] - st.y) / d;
  // (a figure holds out its hand to it while it works)
  return { dx: dx * 5 * env * o.castLean, dy: dy * 3 * env * o.castLean, lookX: dx * 1.6 * env, lookY: dy * 1.1 * env, rot: dx * 0.15 * env * o.castLean,
    glow: 0.35 * bump(a, 0.1, 0.42), happy: a > 0.74 && a < 0.93 ? 1 : 0, quiet: 1, reach: target, reachK: 0.95 * env, ...extra(a) };
}

const spark = (p, C, x, y, a = 1) => { p.px(x, y, WHITE); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.dot(x + dx, y + dy, C[6], a); p.glow(x, y, 4, C[5], 0.35 * a); };
function beam(p, C, x0, y0, x1, y1, a, w = 1) {
  if (a <= 0.02) return;
  p.glowLine(x0, y0, x1, y1, 6 * w, C[5], 0.4 * a);
  p.glowLine(x0, y0, x1, y1, 2.5 * w, WHITE, 0.5 * a);
  plotLine(p, x0, y0, x1, y1, WHITE, null, a);
  p.glow(x1, y1, 8 * w, WHITE, 0.6 * a);
}

// ---- appearing: what the target looks like while it comes, and the light around it
function appearing(o, ob, t, a, from) {
  const ps = pose(o, ob, t), s = ob.size, P = o.appearPower, n = Math.round(o.appearParticles), g = rng(o.seed, 404);
  const top = ps.y - s * 1.35, h = s * 2.7;
  switch (o.appearStyle) {
    case "laser": {
      const r = seg(a, 0.3, 0.62), line = top + (1 - r) * h;
      return { obj: r > 0 ? { clip: (x, y) => y >= line } : null, fx(p, C) {
        beam(p, C, from[0], from[1], ps.x, Math.max(line, top), bump(a, 0.16, 0.68) * P);
        if (r > 0 && r < 1) { for (let i = 0; i < 5; i++) spark(p, C, ps.x + (hash(i, Math.floor(a * 90), 1) - 0.5) * s * 2.2, line, 0.8); p.glowLine(ps.x - s * 1.3, line, ps.x + s * 1.3, line, 3, WHITE, 0.4 * P); }
      } };
    }
    case "crystal": {
      const wire = seg(a, 0.34, 0.48), fill = seg(a, 0.46, 0.64);
      return { obj: fill > 0 ? { clip: (x, y) => hash(Math.floor(x), Math.floor(y), 9) < fill } : wire > 0 ? { wire } : null, fx(p, C) {
        if (wire > 0 && fill > 0 && fill < 1) drawObject(p, o, ob, t, { wire: 1 - fill });
        const k = seg(a, 0.1, 0.46);
        if (k > 0 && k < 1) for (let i = 0; i < n; i++) {
          const th = g.range(0, TAU), R = s * g.range(3, 6), e = ease.inCubic(k), x = ps.x + Math.cos(th) * R * (1 - e), y = ps.y + Math.sin(th) * R * (1 - e);
          const w = 1.5 + (i % 3);
          fillPoly(p, [[x, y - w], [x + w * 0.6, y], [x, y + w], [x - w * 0.6, y]], i % 2 ? C[6] : C[5]);
          p.glow(x, y, 4, C[5], 0.3 * P);
        }
        const fl = bump(a, 0.6, 0.72);
        if (fl > 0) p.glow(ps.x, ps.y, s * 3, WHITE, 0.4 * fl * P);
      } };
    }
    case "orb": {
      const fly = seg(a, 0.16, 0.45), grow = seg(a, 0.45, 0.62);
      const bx = lerp(from[0], ps.x, fly), by = lerp(from[1], ps.y, fly) - Math.sin(Math.PI * fly) * Math.max(20, Math.hypot(ps.x - from[0], ps.y - from[1]) * 0.35);
      return { obj: grow > 0 ? { scale: ease.outBack(grow, 1.8) } : null, fx(p, C) {
        if (fly > 0 && fly < 1) {
          for (let i = 1; i < 8; i++) {
            const f = Math.max(0, fly - i * 0.025), x = lerp(from[0], ps.x, f), y = lerp(from[1], ps.y, f) - Math.sin(Math.PI * f) * Math.max(20, Math.hypot(ps.x - from[0], ps.y - from[1]) * 0.35);
            p.glow(x, y, 5 - i * 0.5, C[5], 0.3 * (1 - i / 8) * P);
          }
          p.disc(bx, by, 3, WHITE); p.glow(bx, by, 10, C[6], 0.6 * P);
        }
        const sp = bump(a, 0.44, 0.6);
        if (sp > 0) { p.glow(ps.x, ps.y, s * 3, WHITE, 0.5 * sp * P); for (let i = 0; i < 10; i++) { const th = (i / 10) * TAU, r = s * (1 + 2 * seg(a, 0.45, 0.6)); spark(p, C, ps.x + Math.cos(th) * r, ps.y + Math.sin(th) * r, sp); } }
      } };
    }
    default: { // halo: light gathers in a spiral, flashes, and it swells out of the light
      const grow = seg(a, 0.38, 0.6);
      return { obj: grow > 0 ? { scale: ease.outBack(grow, 1.7), tint: 1 - seg(a, 0.42, 0.66) } : null, fx(p, C) {
        const k = seg(a, 0.08, 0.42);
        if (k > 0 && k < 1) {
          p.glow(ps.x, ps.y, s * (1 + 2 * k), C[5], 0.45 * k * P);
          for (let i = 0; i < n; i++) {
            const th = g.range(0, TAU) + k * 4, R = s * g.range(2.5, 5) * (1 - ease.inQuad(k));
            spark(p, C, ps.x + Math.cos(th) * R, ps.y + Math.sin(th) * R * 0.85, 0.6 + 0.4 * k);
          }
        }
        const fl = bump(a, 0.36, 0.5);
        if (fl > 0) p.glow(ps.x, ps.y, s * 4, WHITE, 0.6 * fl * P);
        const rk = seg(a, 0.4, 0.62);
        if (rk > 0 && rk < 1) { const r = s * (1.2 + 3 * ease.outCubic(rk)); for (let j = 0, m = Math.ceil(r * 5); j < m; j++) { const th = (j / m) * TAU; p.dot(ps.x + Math.cos(th) * r, ps.y + Math.sin(th) * r * 0.9, WHITE, 1 - rk); } p.glowRing(ps.x, ps.y, r, 5, C[5], 0.3 * (1 - rk) * P); }
      } };
    }
  }
}

// ---- going: the target while it leaves, and the light of it
function removing(o, ob, t, a, from) {
  const ps = pose(o, ob, t), s = ob.size, P = o.removePower, n = Math.round(o.removeParticles), g = rng(o.seed, 505);
  const top = ps.y - s * 1.35, h = s * 2.7;
  switch (o.removeStyle) {
    case "laser": {
      const hot = seg(a, 0.24, 0.38), r = seg(a, 0.38, 0.62), line = top + r * h;
      return { obj: r < 1 ? { tint: hot, clip: r > 0 ? (x, y) => y >= line : null } : null, fx(p, C) {
        beam(p, C, from[0], from[1], ps.x, r > 0 ? Math.min(line, top + h) : ps.y, bump(a, 0.14, 0.64) * P);
        if (r > 0 && r < 1) { for (let i = 0; i < 6; i++) spark(p, C, ps.x + (hash(i, Math.floor(a * 90), 2) - 0.5) * s * 2.2, line - hash(i, 3, Math.floor(a * 60)) * 8, 0.8); p.glowLine(ps.x - s * 1.3, line, ps.x + s * 1.3, line, 3, WHITE, 0.4 * P); }
      } };
    }
    case "implode": {
      const k = seg(a, 0.28, 0.55);
      return { obj: k < 1 ? { scale: 1 - ease.inBack(k, 1.6), spin: TAU * 2 * ease.inCubic(k), tint: k * 0.8 } : null, fx(p, C) {
        if (k > 0 && k < 1) for (let i = 0; i < n; i++) {
          const th = g.range(0, TAU) - k * 6, R = s * g.range(1.5, 4) * (1 - k);
          spark(p, C, ps.x + Math.cos(th) * R, ps.y + Math.sin(th) * R, k);
        }
        const fl = bump(a, 0.52, 0.66);
        if (fl > 0) { p.glow(ps.x, ps.y, s * 3.5, WHITE, 0.6 * fl * P); p.glow(ps.x, ps.y, s, WHITE, 0.8 * fl); }
      } };
    }
    case "shatter": {
      const pre = seg(a, 0.22, 0.36), k = seg(a, 0.36, 0.72);
      return { obj: a < 0.36 ? { tint: pre * 0.7, dx: (hash(Math.floor(a * 300), 1, 3) - 0.5) * 3 * pre, dy: (hash(2, Math.floor(a * 300), 3) - 0.5) * 3 * pre } : null, fx(p, C, Co) {
        if (k <= 0 || k >= 1) return;
        const sh = bump(a, 0.35, 0.5);
        if (sh > 0) p.glow(ps.x, ps.y, s * 3, WHITE, 0.5 * sh * P);
        for (let i = 0; i < n; i++) {
          const th = g.range(0, TAU), sp = s * g.range(2, 6) * P, rot = g.range(-6, 6) * k, w = s * g.range(0.2, 0.45);
          const x = ps.x + Math.cos(th) * sp * ease.outCubic(k), y = ps.y + Math.sin(th) * sp * ease.outCubic(k) + k * k * 6, al = 1 - k;
          const pts = [0, 1, 2].map((j) => [x + Math.cos(rot + (j * TAU) / 3) * w, y + Math.sin(rot + (j * TAU) / 3) * w]);
          if (al > 0.3) fillPoly(p, pts, i % 3 ? Co[5] : Co[6]);
          else for (const [qx, qy] of pts) p.dot(qx, qy, Co[5], al * 2);
          p.glow(x, y, 3, Co[5], 0.25 * al);
        }
        const rk = seg(a, 0.36, 0.56), r = s * (1 + 3.5 * ease.outCubic(rk));
        if (rk < 1) p.glowRing(ps.x, ps.y, r, 5, C[5], 0.35 * (1 - rk) * P);
      } };
    }
    case "swallow": {
      const k = seg(a, 0.28, 0.56), e = ease.inCubic(k);
      return { obj: k < 1 ? { dx: (from[0] - ps.x) * e, dy: (from[1] - ps.y) * e, scale: 1 - 0.85 * e, spin: TAU * e } : null, gulp: bump(a, 0.54, 0.72), fx(p, C) {
        if (k > 0 && k < 1) p.glowLine(ps.x + (from[0] - ps.x) * e, ps.y + (from[1] - ps.y) * e, from[0], from[1], 4, C[5], 0.3 * P * Math.sin(Math.PI * k));
      } };
    }
    default: { // dissolve: it comes apart pixel by pixel, the bits rising off as light
      const k = seg(a, 0.28, 0.66);
      return { obj: k < 1 ? { clip: k > 0 ? (x, y) => hash(Math.floor(x), Math.floor(y), 5) > k : null, tint: k * 0.5 } : null, fx(p, C) {
        if (k <= 0 || k >= 1.2) return;
        for (let i = 0; i < n; i++) {
          const born = g.range(0, 1), age = (k - born * 0.8) * 2.5;
          if (age <= 0 || age >= 1) continue;
          const x = ps.x + g.range(-1, 1) * s + Math.sin(age * 6 + i) * 2, y = ps.y + g.range(-1, 1) * s - age * s * 2.5;
          spark(p, C, x, y, 1 - age);
        }
      } };
    }
  }
}

// (hand: a figure's hand the light comes from, given once it is drawn)
function plan(o, t, hand = null) {
  const obs = o.objects || [], mode = o.mode, ti = Math.max(0, Math.min(obs.length - 1, Math.round(o.target))), a = mode === "live" || !obs.length ? 0 : prog(o, t);
  const target = obs[ti], from = hand || (() => { const st = state(o, t, null); return [st.x, st.y]; })();
  let tr = null;
  if (target && mode === "appear") tr = a <= 0 ? { hide: true } : a >= 1 ? null : appearing(o, target, t, a, from);
  if (target && mode === "remove") tr = a >= 1 ? { hide: true } : a <= 0 ? null : removing(o, target, t, a, from);
  if (tr && !tr.hide && !tr.fx) tr = null;
  const tp = target ? pose(o, target, t) : null;
  const M = mode === "live" || !target ? null : (tt) => castMods(o, tt, (() => { const q = pose(o, target, tt); return [q.x, q.y]; })(), (aa) => {
    const g = o.mode === "remove" && o.removeStyle === "swallow" ? bump(aa, 0.54, 0.72) : 0;
    return g ? { grow: 1 + 0.16 * g, happy: 1 } : {};
  });
  return { obs, ti, a, target, tr, M, tp };
}

function objectsOn(p, o, t, pl, layer) {
  pl.obs.forEach((ob, i) => {
    if ((ob.layer || "back") !== layer) return;
    if (i === pl.ti && pl.target && o.mode !== "live") {
      if (!pl.tr || pl.tr.hide) { if (pl.tr && pl.tr.hide) return; drawObject(p, o, ob, t); return; }
      if (pl.tr.obj) drawObject(p, o, ob, t, pl.tr.obj);
      return;
    }
    drawObject(p, o, ob, t);
  });
}

// in front, a figure works the change from its hand nearest the object
export const { drawBack, draw } = creature((o, t) => {
  const pl0 = plan(o, t);
  return { M: pl0.M, T: total(o), extra(p, C, st, front) {
    if (!front) return objectsOn(p, o, t, pl0, "back");
    const tg = pl0.tp, pl = st.hands && st.hands.length && tg ? plan(o, t, st.hands.reduce((b, h) => (Math.hypot(h[0] - tg.x, h[1] - tg.y) < Math.hypot(b[0] - tg.x, b[1] - tg.y) ? h : b))) : pl0;
    objectsOn(p, o, t, pl, "front");
    if (pl.tr && pl.tr.fx) pl.tr.fx(p, C, paletteFor(o, pl.target.hue || 0));
  } };
});
