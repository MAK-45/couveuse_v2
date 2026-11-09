// The blob tells the time: it turns to an empty patch of sky, the hour appears there in solid digits of
// ice-light (assembling from sparks, projected, written, popping, growing as crystals, rolling like a slot
// machine), stays a while (seconds ticking if asked, the colon blinking), then goes (melting away, scattering,
// sucked back into the blob, sliding off, shattering, rolling away). Like the actions, it runs over whole loops
// of the blob's rest and everything it changes is back to zero at both ends: first and last frames are the rest's.
import { fit, clamp, lerp, seg, bump, ease, rng, TAU, WHITE } from "../../pixelfx/src/core/index.js";
import { meta as idleMeta, state } from "../blob/blob.js";
import { prog as progAt } from "../shared/_time.js";
import { creature } from "../shared/_creature.js";
import { hsl, fromHsl } from "../shared/_color.js";

export const APPEAR = ["particles", "projector", "write", "pop", "crystal", "slot"];
export const VANISH = ["fade", "scatter", "absorb", "slide", "shatter", "slot"];

export const meta = {
  name: "Ice blob clock",
  desc: "The ice blob shows the time in solid digits of ice-light that assemble, hold (ticking, colon blinking) and go, then it is back at rest exactly as it began.",
  tags: ["creature", "blob", "clock", "time", "text", "ice", "light", "loop"],
  size: [320, 180],
  origin: [160, 110],
  duration: 12,
  loop: true,
  fps: 30,
  bg: "black",
  options: {
    ...idleMeta.options,
    form: "blob", loops: 3, lead: 0.06,
    // the time
    clkH: 14, clkM: 35, clkS: 0, clkFormat: "24", clkSep: ":", clkSeconds: 0, clkTick: 1, clkZero: 1,
    // the digits
    clkX: 0, clkY: -62, clkScale: 3, clkSpacing: 1, clkBold: 0, clkStyle: "ice", clkHue: 0, clkGlow: 1, clkFloat: 2, clkBlink: 1, clkPanel: "none", clkSparkles: 1,
    // timing, as parts of the action
    clkAppear: "particles", clkAppearLen: 0.24, clkVanish: "absorb", clkVanishLen: 0.2,
    // the blob
    clkMove: "aside", clkOffset: 18, clkLook: 1, clkJoy: 1,
  },
};

const E = ease.inOutSine;
/** Its length: a whole number of the blob's loops. */
export const total = (o) => o.duration * Math.max(1, Math.round(o.loops));
const prog = (o, t) => progAt(o, t, total(o));
const hash = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };

// ---- a 5x7 pixel font for the clock
const FONT = {
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"], 1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"], 3: ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"], 5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"], 7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"], 9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ":": ["0", "0", "1", "0", "1", "0", "0"], ".": ["0", "0", "0", "0", "0", "0", "1"], h: ["10000", "10000", "10110", "11001", "10001", "10001", "10001"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"], P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"], " ": ["00", "00", "00", "00", "00", "00", "00"],
};
const glyphOf = (ch, bold) => {
  const g = FONT[ch] || FONT[" "];
  if (!bold) return g;
  // bold: every lit cell spreads one to the right
  return g.map((r) => [...(r + "0")].map((b, i, a) => (b === "1" || (i > 0 && a[i - 1] === "1") ? "1" : "0")).join(""));
};

// the time to show at a given second of the display
function timeText(o, extraSec) {
  let s = Math.round(o.clkH) * 3600 + Math.round(o.clkM) * 60 + Math.round(o.clkS) + (o.clkTick ? Math.floor(extraSec) : 0);
  s = ((s % 86400) + 86400) % 86400;
  let h = Math.floor(s / 3600);
  const m = Math.floor(s / 60) % 60, sec = s % 60, twelve = o.clkFormat === "12";
  let suffix = "";
  if (twelve) { suffix = h < 12 ? " AM" : " PM"; h = h % 12 || 12; }
  const p2 = (v) => String(v).padStart(2, "0"), hs = o.clkZero && !twelve ? p2(h) : String(h);
  const sep = o.clkSep === "h" ? "h" : o.clkSep === "." ? "." : ":";
  let txt = hs + sep + p2(m);
  if (o.clkSeconds) txt += (sep === "h" ? ":" : sep) + p2(sec);
  return txt + suffix;
}

// lay the text out as cells (font pixels), centred on (0,0)
function layout(o, txt) {
  const k = Math.max(1, Math.round(o.clkScale)), gap = Math.max(0, Math.round(o.clkSpacing)), chars = [];
  let x = 0;
  for (const ch of txt) {
    const g = glyphOf(ch, o.clkBold > 0);
    chars.push({ ch, g, x, w: g[0].length });
    x += g[0].length + gap;
  }
  const W = Math.max(1, x - gap), H = 7, cells = [];
  chars.forEach((c, ci) => c.g.forEach((r, j) => [...r].forEach((b, i) => { if (b === "1") cells.push({ ci, i: c.x + i, j, ch: c.ch }); })));
  return { k, W, H, chars, cells, pw: W * k, ph: H * k };
}

const PAL = new Map();
function palette(o) {
  const key = o.palette.join() + o.clkHue;
  if (!PAL.has(key)) PAL.set(key, fit(o.clkHue ? o.palette.map((c) => { const [h, s, l] = hsl(c); return fromHsl((((h + o.clkHue) % 360) + 360) % 360, s, l); }) : o.palette, 8));
  return PAL.get(key);
}

// ---- the timetable of one display
function phases(o, a) {
  const ap = clamp(o.clkAppearLen, 0.05, 0.45), vn = clamp(o.clkVanishLen, 0.05, 0.45);
  const A0 = 0.1, A1 = A0 + ap, V1 = 0.9, V0 = Math.max(A1 + 0.02, V1 - vn);
  return { A0, A1, V0, V1, appear: seg(a, A0, A1), vanish: seg(a, V0, V1), shown: a > A0 && a < V1 };
}

// where the clock's centre is and its gentle float
function clockAt(o, t) {
  const T = total(o), u = t / o.duration;
  return [o.clkX + Math.sin(TAU * u) * o.clkFloat * 0.4, o.clkY + Math.sin(TAU * 2 * u) * o.clkFloat];
}

function mods(o, t) {
  const a = prog(o, t);
  if (a <= 0 || a >= 1) return {};
  const ph = phases(o, a), env = E(seg(a, 0, 0.12)) * (1 - E(seg(a, 0.88, 1)));
  const [cx, cy] = clockAt(o, t), st = state(o, t, null), d = Math.hypot(cx - st.x, cy - st.y) || 1, dx = (cx - st.x) / d, dy = (cy - st.y) / d;
  const m = { lookX: dx * 1.5 * o.clkLook * env, lookY: dy * 1.2 * o.clkLook * env, quiet: 1, glow: 0.3 * bump(a, ph.A0 - 0.04, ph.A1) };
  const side = o.clkX > 0 ? -1 : 1;
  if (o.clkMove === "aside") { m.dx = side * o.clkOffset * env; m.rot = -side * 0.08 * env; }
  if (o.clkMove === "rise" && o.form !== "grounded") m.dy = -o.clkOffset * env * 0.6;
  if (o.clkMove === "below") m.dy = o.clkOffset * env * 0.6;
  const proud = bump(a, ph.A1, ph.A1 + 0.08) * o.clkJoy;
  if (proud > 0.05) { m.dy = (m.dy || 0) - 5 * proud; m.happy = 1; }
  if (a > ph.A1 + 0.08 && a < ph.V0 && o.clkJoy > 0.5) m.happy = 1;
  // a figure points at the clock while it makes it and while it takes it back
  m.reach = [cx, cy]; m.reachK = 0.9 * Math.max(bump(a, ph.A0 - 0.06, ph.A1 + 0.04), bump(a, ph.V0 - 0.04, ph.V1 + 0.04));
  return m;
}

// ---- drawing the digits from a set of settled cells (shaded with their neighbours) plus loose flying ones
function drawCells(p, o, C, L, ox, oy, settled, flying, flash) {
  const k = L.k, x0 = Math.round(ox - L.pw / 2), y0 = Math.round(oy - L.ph / 2), W = L.W, H = L.H;
  const on = new Uint8Array(W * H);
  for (const c of settled) on[c.j * W + c.i] = 1;
  const at = (i, j) => i >= 0 && j >= 0 && i < W && j < H && on[j * W + i];
  const style = o.clkStyle;
  // a dark rim so the digits read on any glow
  if (style !== "neon") for (const c of settled) for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!at(c.i + di, c.j + dj)) {
    const bx = x0 + (c.i + di) * k, by = y0 + (c.j + dj) * k;
    for (let v = 0; v < k; v++) for (let u = 0; u < k; u++) {
      const px = bx + u, py = by + v;
      if ((di === 1 && u === 0) || (di === -1 && u === k - 1) || (dj === 1 && v === 0) || (dj === -1 && v === k - 1)) p.px(px + 0.5, py + 0.5, C[1]);
    }
  }
  for (const c of settled) {
    const bx = x0 + c.i * k, by = y0 + c.j * k, up = !at(c.i, c.j - 1), dn = !at(c.i, c.j + 1), lf = !at(c.i - 1, c.j), rt = !at(c.i + 1, c.j);
    const base = c.j < 2 ? 6 : c.j < 5 ? 5 : 4;
    for (let v = 0; v < k; v++) for (let u = 0; u < k; u++) {
      let col;
      if (style === "neon") {
        const edge = (up && v === 0) || (dn && v === k - 1) || (lf && u === 0) || (rt && u === k - 1);
        col = edge ? (up && v === 0 ? WHITE : C[6]) : C[3];
      } else if (style === "flat") col = up && v === 0 ? WHITE : C[6];
      else if (style === "crystal") col = up && v === 0 ? WHITE : u + v < k ? C[6] : rt && u === k - 1 ? C[3] : C[5];
      else col = up && v === 0 ? WHITE : lf && u === 0 ? C[7] : dn && v === k - 1 ? C[3] : rt && u === k - 1 ? C[4] : C[base];
      if (flash > 0 && hash(c.i * 3 + u, c.j * 3 + v) < flash) col = WHITE;
      p.px(bx + u + 0.5, by + v + 0.5, col);
    }
  }
  for (const f of flying) {
    const s = Math.max(1, Math.round(k * (f.s ?? 1)));
    for (let v = 0; v < s; v++) for (let u = 0; u < s; u++) f.a >= 1 ? p.px(f.x + u + 0.5, f.y + v + 0.5, f.c || C[6]) : p.dot(f.x + u + 0.5, f.y + v + 0.5, f.c || C[6], f.a);
    if (f.glow) p.glow(f.x + s / 2, f.y + s / 2, 3 + s, C[5], 0.3 * f.a);
  }
}

// the slot machine: each digit's column rolls through a strip of digits and stops on its own
function drawSlot(p, o, C, L, ox, oy, txt, roll) {
  const k = L.k, x0 = Math.round(ox - L.pw / 2), y0 = Math.round(oy - L.ph / 2), per = 8;
  L.chars.forEach((c, ci) => {
    const isDigit = c.ch >= "0" && c.ch <= "9", r = isDigit ? roll(ci) : 0;
    if (r < 0) return;
    for (let j = 0; j < 7; j++) for (let i = 0; i < c.w; i++) {
      let lit, src = j;
      if (isDigit && r > 0) {
        const y = j + r * per, dIdx = Math.floor(y / per), inn = y - dIdx * per;
        const dg = (((+c.ch + dIdx) % 10) + 10) % 10;
        src = Math.floor(inn);
        lit = src < 7 && glyphOf(String(dg), o.clkBold > 0)[src][i] === "1";
      } else lit = c.g[j][i] === "1";
      if (!lit) continue;
      const bx = x0 + (c.x + i) * k, by = y0 + j * k;
      for (let v = 0; v < k; v++) for (let u = 0; u < k; u++) p.px(bx + u + 0.5, by + v + 0.5, v === 0 && j === 0 ? WHITE : r > 0 ? C[6] : C[j < 2 ? 6 : j < 5 ? 5 : 4]);
    }
  });
}

function panel(p, o, C, L, ox, oy, a, st) {
  if (o.clkPanel === "none" || a <= 0) return;
  const pad = 4 + L.k * 2, w = L.pw + pad * 2, h = L.ph + pad * 2, x0 = Math.round(ox - w / 2), y0 = Math.round(oy - h / 2);
  const grow = E(clamp(a));
  const cw = Math.round(w * grow), ch = Math.round(h * grow), cx0 = Math.round(ox - cw / 2), cy0 = Math.round(oy - ch / 2);
  if (cw < 3 || ch < 3) return;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const corner = (x < 2 || x >= cw - 2) && (y < 2 || y >= ch - 2) && !((x === 1 || x === cw - 2) && (y === 1 || y === ch - 2));
    if (corner) continue;
    const edge = x === 0 || y === 0 || x === cw - 1 || y === ch - 1 || ((x === 1 || x === cw - 2) && (y === 1 || y === ch - 2));
    if (edge) p.px(cx0 + x + 0.5, cy0 + y + 0.5, y === 0 ? WHITE : C[5]);
    else p.blend(cx0 + x + 0.5, cy0 + y + 0.5, C[1], 0.55);
  }
  if (o.clkPanel === "bubble" && grow > 0.9) {
    // a tail pointing down at the blob
    const tx = clamp(st.x, cx0 + 6, cx0 + cw - 6), ty = cy0 + ch, dir = Math.sign(st.y - ty) || 1;
    for (let i = 0; i < 6; i++) for (let x = -5 + i; x <= 5 - i; x++) {
      const px = tx + x + Math.round((st.x - tx) * 0.12 * (i / 6)), py = ty + i * dir;
      p[Math.abs(x) === 5 - i ? "px" : "blend"](px + 0.5, py + 0.5, Math.abs(x) === 5 - i ? C[5] : C[1], 0.55);
    }
  }
  p.glow(ox, oy, Math.max(w, h) * 0.7, C[4], 0.15 * grow);
}

function clockLayer(p, o, t, st) {
  const a = prog(o, t);
  if (a <= 0 || a >= 1) return;
  const C = palette(o), ph = phases(o, a);
  if (!ph.shown) return;
  const T = total(o), shownSec = Math.max(0, (a - ph.A0) * (1 - 2 * o.lead) * T);
  const txt = timeText(o, shownSec), L = layout(o, txt), [ox, oy] = clockAt(o, t);
  // the colon blinks once a second while it's up, if asked
  const blinkOff = o.clkBlink > 0 && ph.appear >= 1 && ph.vanish <= 0 && (shownSec % 1) > 0.5;
  const cells = L.cells.filter((c) => !(blinkOff && (c.ch === ":" || c.ch === ".")));
  const gl = o.clkGlow, tick = o.clkTick && o.clkSeconds ? Math.max(0, 1 - (shownSec % 1) * 5) : 0;
  const pin = ph.appear * (1 - ph.vanish);
  panel(p, o, C, L, ox, oy, o.clkPanel !== "none" ? Math.min(seg(a, ph.A0 - 0.03, ph.A0 + 0.05), 1 - seg(a, ph.V1 - 0.05, ph.V1 + 0.01)) : 0, st);
  p.glow(ox, oy, L.pw * 0.75, C[4], (0.2 + 0.15 * tick) * gl * pin);
  for (const c of L.chars) if (c.ch !== " ") p.glow(ox - L.pw / 2 + (c.x + c.w / 2) * L.k, oy, L.k * 6, o.clkStyle === "neon" ? C[6] : C[5], (o.clkStyle === "neon" ? 0.35 : 0.18) * gl * pin);
  const x0 = Math.round(ox - L.pw / 2), y0 = Math.round(oy - L.ph / 2), cellXY = (c) => [x0 + c.i * L.k, y0 + c.j * L.k];
  const order = (c) => c.i / Math.max(1, L.W);
  const settled = [], flying = [];
  let flash = 0;
  // ---- coming
  if (ph.appear < 1) {
    // (a figure makes it with its hand)
    const q = ph.appear, hand = st.hands ? st.hands.reduce((b, h) => (Math.hypot(h[0] - ox, h[1] - oy) < Math.hypot(b[0] - ox, b[1] - oy) ? h : b)) : null, st0 = hand || [st.x, st.y];
    switch (o.clkAppear) {
      case "slot": {
        if (q <= 0) return;
        drawSlot(p, o, C, L, ox, oy, txt, (ci) => { const stop = 0.35 + 0.6 * (ci / Math.max(1, L.chars.length - 1)); const r = seg(q, 0, stop); return r >= 1 ? 0 : (1 - ease.outCubic(r)) * (6 + ci * 2); });
        return;
      }
      case "projector": {
        const scan = q * 1.15;
        for (const c of cells) { const yy = c.j / 7; if (yy < scan - 0.1 || (yy < scan && hash(c.i, c.j + Math.floor(t * 24)) > 0.5)) settled.push(c); }
        const by = oy - L.ph / 2 + Math.min(1, scan) * L.ph;
        p.glowLine(ox - L.pw / 2 - 2, by, ox + L.pw / 2 + 2, by, 3, WHITE, 0.4 * (1 - q));
        // the beam out of the blob
        const a2 = Math.sin(Math.PI * Math.min(1, q * 1.1));
        const [hx, hy] = hand || [st.x, st.y - o.size * 0.3];
        for (const sx of [-1, 1]) p.glowLine(hx, hy, ox + sx * L.pw * 0.5, oy + L.ph * 0.5, 2, C[5], 0.25 * a2);
        p.glow(hx, hy, 8, WHITE, 0.4 * a2);
        flash = 1 - q;
        break;
      }
      case "write": {
        const head = q * 1.1;
        for (const c of cells) if (order(c) < head) settled.push(c);
        const hx = x0 + head * L.pw, hy = oy + Math.sin(q * 40) * L.ph * 0.35;
        if (q < 0.95) { p.glow(hx, hy, 8, WHITE, 0.6); p.px(hx, hy, WHITE); }
        flash = 0.25 * (1 - q);
        break;
      }
      case "pop": {
        L.chars.forEach((ch, ci) => {
          const s0 = (ci / Math.max(1, L.chars.length)) * 0.75, r = seg(q, s0, s0 + 0.25);
          if (r <= 0) return;
          const dy = Math.round((1 - ease.outBack(r, 2.4)) * -8);
          for (const c of cells) if (c.ci === ci) { const [x, y] = cellXY(c); flying.push({ x, y: y + dy, a: 1, c: r < 0.4 ? WHITE : c.j < 2 ? C[6] : c.j < 5 ? C[5] : C[4] }); }
          if (r < 0.4) p.glow(x0 + (ch.x + ch.w / 2) * L.k, oy, L.k * 5, WHITE, 0.5 * (1 - r / 0.4));
        });
        break;
      }
      case "crystal": {
        for (const c of cells) { const h = hash(c.i, c.j); if (h < q * 1.05) settled.push(c); else if (h < q * 1.05 + 0.08) { const [x, y] = cellXY(c); flying.push({ x, y, a: 0.6, s: 0.5, c: WHITE, glow: 1 }); } }
        flash = 0.4 * (1 - q);
        break;
      }
      default: { // particles: every cell flies out of the blob to its place, left to right
        for (const c of cells) {
          const s0 = order(c) * 0.55 + hash(c.i, c.j) * 0.15, r = seg(q, s0, s0 + 0.3);
          if (r <= 0) continue;
          const [tx, ty] = cellXY(c);
          if (r >= 1) { settled.push(c); continue; }
          const e = ease.inOutCubic(r), lift = Math.sin(Math.PI * e) * 26;
          flying.push({ x: Math.round(lerp(st0[0], tx, e)), y: Math.round(lerp(st0[1], ty, e) - lift), a: 1, c: e > 0.8 ? WHITE : C[6], s: 0.6 + 0.4 * e, glow: 1 });
        }
      }
    }
  } else if (ph.vanish > 0) {
    // ---- going
    const q = ph.vanish;
    switch (o.clkVanish) {
      case "slot": {
        drawSlot(p, o, C, L, ox, oy, txt, (ci) => { const s0 = 0.5 * (ci / Math.max(1, L.chars.length - 1)), r = seg(q, s0, s0 + 0.5); return r >= 1 ? -1 : ease.inCubic(r) * 8; });
        return;
      }
      case "scatter": {
        for (const c of cells) {
          const s0 = hash(c.j, c.i) * 0.3, r = seg(q, s0, s0 + 0.6), [x, y] = cellXY(c);
          if (r <= 0) { settled.push(c); continue; }
          if (r >= 1) continue;
          const th = Math.atan2(y - oy, x - ox) + (hash(c.i, 7) - 0.5), sp = 30 + hash(c.i, c.j) * 40, e = ease.outCubic(r);
          flying.push({ x: Math.round(x + Math.cos(th) * sp * e), y: Math.round(y + Math.sin(th) * sp * e), a: 1 - r, c: C[6], s: 1 - 0.5 * r, glow: 1 });
        }
        break;
      }
      case "absorb": {
        for (const c of cells) {
          const s0 = (1 - order(c)) * 0.5 + hash(c.i, c.j) * 0.15, r = seg(q, s0, s0 + 0.35), [x, y] = cellXY(c);
          if (r <= 0) { settled.push(c); continue; }
          if (r >= 1) continue;
          const e = ease.inCubic(r);
          flying.push({ x: Math.round(lerp(x, st.x, e)), y: Math.round(lerp(y, st.y, e) - Math.sin(Math.PI * e) * 14), a: 1, c: e > 0.5 ? WHITE : C[6], s: 1 - 0.6 * e, glow: 1 });
        }
        const gulp = bump(q, 0.6, 1);
        if (gulp > 0) p.glow(st.x, st.y, o.size * 2, WHITE, 0.3 * gulp);
        break;
      }
      case "slide": {
        const dy = Math.round(-ease.inCubic(q) * 18);
        for (const c of cells) { const [x, y] = cellXY(c); if (hash(c.i + 9, c.j) > q * 1.1) flying.push({ x, y: y + dy, a: 1, c: c.j < 2 ? C[6] : c.j < 5 ? C[5] : C[4] }); }
        break;
      }
      case "shatter": {
        flash = q < 0.15 ? 1 - q / 0.15 : 0;
        if (q < 0.15) { for (const c of cells) settled.push(c); break; }
        const r = (q - 0.15) / 0.85;
        for (const c of cells) {
          const [x, y] = cellXY(c), vx = (hash(c.i, c.j) - 0.5) * 50, vy = -10 - hash(c.j, c.i) * 20;
          if (hash(c.i * 2, c.j) < r * 0.9) continue;
          flying.push({ x: Math.round(x + vx * r), y: Math.round(y + vy * r + 90 * r * r), a: 1 - r * 0.6, c: c.j < 3 ? C[6] : C[5] });
        }
        if (r < 0.3) p.glow(ox, oy, L.pw * 0.8, WHITE, 0.4 * (1 - r / 0.3));
        break;
      }
      default: // fade: cells go out one by one, as if melting into the dark
        for (const c of cells) if (hash(c.i + 3, c.j + 5) > q) settled.push(c);
    }
  } else for (const c of cells) settled.push(c);
  drawCells(p, o, C, L, ox, oy, settled, flying, flash);
  // a few sparkles round the clock while it's up
  if (o.clkSparkles > 0 && ph.appear >= 1 && ph.vanish <= 0) {
    const g = rng(o.seed, 888);
    for (let i = 0; i < 6; i++) {
      const tw = Math.sin(TAU * (t * 0.6 + g.range(0, 1))) ;
      if (tw < 0.7) continue;
      const x = ox + g.range(-0.6, 0.6) * (L.pw + 10), y = oy + g.range(-0.8, 0.8) * (L.ph + 8);
      p.px(x, y, WHITE);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.dot(x + dx, y + dy, C[6], (tw - 0.7) * 3 * o.clkSparkles);
    }
  }
}

export const { drawBack, draw } = creature((o, t) => ({ M: (tt) => mods(o, tt), T: total(o), extra: (p, C, st, front) => front && clockLayer(p, o, t, st) }));
