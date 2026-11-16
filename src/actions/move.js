// « Se déplacer » : it goes somewhere else in the scene and stays there. Its first frame is its rest where it was, its last
// its rest where it went (`{ ax, ay }`, whole px, a pure translation of all it draws), so what comes next carries on there.
// The blob and the levitating figure glide there along a gentle arc, looking where they go (the blob may hop along); the
// figure on its legs walks (or runs) there along its floor: a quarter turn side on, its pace up and down on a gaitLine
// (every foot stays where it came down), a quarter turn back to face us.
import { seg, bump, ease } from "../../pixelfx/src/core/index.js";
import { leadIn, leadOut, DROP_LIFE, LEAD_MIN } from "../shared/_time.js";
import { formExtent, gaitFree, gaitLine } from "../forms/forms.js";
import { action } from "./_action.js";

const E = ease.inOutSine, TURN = 0.55, GAIT_RAMP = { walk: 1.5, run: 2 };
const gnd = (o) => o.form === "grounded";

/** Where it goes: [dx, dy] whole px from its spot (o.moveTo, a life's, or moveX/moveY), its whole body inside o.room; on its legs only along its floor. */
function moveOf(o) {
  const to = Array.isArray(o.moveTo) ? o.moveTo : [o.moveX, o.moveY];
  let dx = Math.round(to[0] || 0), dy = gnd(o) ? 0 : Math.round(to[1] || 0);
  if (Array.isArray(o.room)) {
    const [x0, y0, x1, y1] = formExtent(o), r = o.room, fit = (v, lo, hi) => (lo > hi ? Math.round((lo + hi) / 2) : Math.min(hi, Math.max(lo, v)));
    dx = fit(dx, Math.ceil(r[0] - x0 + 2), Math.floor(r[2] - x1 - 2));
    if (!gnd(o)) dy = fit(dy, Math.ceil(r[1] - y0 + 2), Math.floor(r[3] - y1 - 2));
  }
  return [dx, dy];
}
// on its legs, its walk there over T: turn side on, set off, its pace, slow down, stop, turn back; and its line's pieces
function moveWalk(o, T) {
  const [dx] = moveOf(o), dist = Math.abs(dx), kind = o.moveGait === "run" ? "run" : "walk", g = gaitFree(o, kind, kind === "run" ? o.moveRun : o.moveWalk);
  const a0 = Math.max(LEAD_MIN, o.lead * T), R = GAIT_RAMP[kind] / g.rate, V = g.S * g.rate;
  // up to its pace over R, at its pace for L, down over R: as far as it has to go (a short way: it never gets to its pace)
  const L = Math.max(0, dist / V - R), peak = L > 0 ? 1 : dist / (V * R), s1 = a0 + 0.75 * TURN, s2 = s1 + R, s3 = s2 + L, s4 = s3 + R, u0 = s4 - 0.2 * TURN;
  return { kind, g, dist, dir: dx < 0 ? -1 : 1, turn1: [a0, a0 + TURN], go: s1, stop: s4, turn2: [u0, u0 + TURN], need: u0 + TURN + DROP_LIFE,
    pieces: [{ t0: s1, t1: s2, s0: 0, s1: peak }, { t0: s2, t1: s3, s0: peak, s1: peak }, { t0: s3, t1: s4, s0: peak, s1: 0 }] };
}
// the blob, or the levitating figure: how long its glide takes
const glideTime = (o) => { const [dx, dy] = moveOf(o); return Math.max(0.9, Math.hypot(dx, dy) / Math.max(1, o.moveSpeed * o.size)); };
// how many of the blob's loops its way takes (at least o.loops)
const MOVE_LOOPS = new WeakMap();
function moveLoops(o) {
  let n = MOVE_LOOPS.get(o);
  if (n) return n;
  n = Math.max(1, Math.round(o.loops));
  for (let k = 0; k < 12; k++, n++) {
    const T = o.duration * n;
    if (gnd(o) ? moveWalk(o, T).need <= T : (leadOut(o, T) - leadIn(o, T)) * T >= glideTime(o)) break;
  }
  MOVE_LOOPS.set(o, n);
  return n;
}
// on its legs: it walks (or runs) there along its floor
function walkTo(o, T, dx) {
  const W = moveWalk(o, T), { g, dir } = W;
  const line = gaitLine({ S: g.S, rate: g.rate, pieces: W.pieces, at: W.go, c0: 0.55 });
  const base = { kind: W.kind, S: g.S, v: g.v, rate: g.rate, N: 64, dir, arms: 1, lean: 1, bounce: 1, heel: 1, knee: 1, hair: 1, prints: 1, sparks: 1 };
  const gaitAt = (t) => { const c = line.c(t); return { ...base, ph: c - Math.floor(c), cyc: c, line, t }; };
  const [a0, a1] = W.turn1, [u0, u1] = W.turn2;
  return {
    mods(t) {
      if (t >= u1) return { ax: dx };
      if (t <= a0) return {};
      // (once it has stopped it is there exactly)
      const w = t < a1 ? E(seg(t, a0, a1)) : t > u0 ? 1 - E(seg(t, u0, u1)) : 1, ax = t >= W.stop ? dx : dir * line.d(t);
      return w >= 1 ? { gait: gaitAt(t), ax, quiet: 1 } : { gait: gaitAt(t), turn: w, ax, quiet: 1 };
    },
  };
}
// the blob, or the levitating figure: it glides there on an arc that bulges upward (sideways for a move straight up or down)
function play(o, { T }) {
  const [dx, dy] = moveOf(o), d = Math.hypot(dx, dy);
  if (!d) return { mods: () => ({}) };
  if (gnd(o)) return walkTo(o, T, dx);
  let nx = -dy / d, ny = dx / d;
  if (ny > 0 || (ny === 0 && nx < 0)) { nx = -nx; ny = -ny; }
  const bend = Math.min(1.5, o.moveArc) * d * 0.18, hops = Math.max(0, Math.round(o.moveHops)), ux = dx / d, uy = dy / d, out = leadOut(o, T);
  return {
    mods(t) {
      // (its progress does not wrap round: before it sets off it was here, after it arrives it is there, drops and all)
      const a = seg(t / T, leadIn(o, T), out);
      if (a <= 0) return {};
      if (a >= 1) return { ax: dx, ay: dy };
      const s = E(a), b = Math.sin(Math.PI * s) * bend, env = Math.sin(Math.PI * a);
      // a little crouch as it sets off, a squash as it arrives
      const sq = 0.1 * bump(a, 0, 0.16) + 0.08 * bump(a, 0.86, 1);
      const m = { ax: dx * s + nx * b, ay: dy * s + ny * b, sy: 1 - sq, sx: 1 + sq * 0.7, quiet: 1,
        lookX: ux * 1.3 * o.moveLook * Math.min(1, env * 2.5), lookY: uy * 0.8 * o.moveLook * Math.min(1, env * 2.5) };
      if (hops && o.form !== "human") {
        const h = Math.abs(Math.sin(Math.PI * hops * s)), land = 1 - h, w = env ** 0.5;
        m.dy = -o.moveHop * h * w;
        const k = (land > 0.85 ? ((land - 0.85) / 0.15) * 0.16 : -h * 0.05) * w;
        m.sy -= k; m.sx += k * 0.8;
      }
      return m;
    },
  };
}

export const fiche = action({
  id: "move", name: "Se déplacer", desc: "va jusqu’à la croix et y reste", kind: "move", loops: 1,
  intro: "Il part de son repos et va ailleurs dans la scène, où il reste : son repos est là-bas maintenant, et dans sa vie tout ce qu’il fait ensuite se fait là-bas. Le blob y glisse, la forme humaine en lévitation y vole, la forme humaine au sol y marche (ou y court), de côté, le long de son sol. Glisse la destination dans l’aperçu ; dans sa vie, il va jusqu’à la croix. L’aperçu le montre en boucle (il revient alors d’un coup à son départ) ; le GIF va du repos ici au repos là-bas.",
  options: {
    moveX: [110], moveY: [-25], // where it goes, px from its spot (the page sets them from the destination below)
    moveTX: [78, "Destination horizontale", 0, 100, 0.5, " %", { x: "moveX" }],
    moveTY: [42, "Destination verticale", 0, 100, 0.5, " %", { y: "moveY", forms: ["blob", "human"] }],
    moveSpeed: [2.6, "Vitesse", 0.5, 8, 0.1, "× sa taille / s", { forms: ["blob", "human"] }],
    moveArc: [0.35, "Trajet en courbe", 0, 1.5, 0.05, "", { forms: ["blob", "human"] }],
    moveLook: [1, "Regarde où il va", 0, 2, 0.05, "", { forms: ["blob", "human"] }],
    moveHops: [0, "Petits bonds en chemin", 0, 8, 1, "", { forms: ["blob"] }],
    moveHop: [5, "Hauteur des bonds", 0, 16, 0.5, " px", { forms: ["blob"] }],
    moveGait: ["walk", "Sur ses jambes, il", { select: [["walk", "Y va en marchant"], ["run", "Y va en courant"]] }, { forms: ["grounded"] }],
    moveWalk: [4.5, "Vitesse de marche", 1.5, 7.5, 0.1, " km/h", { forms: ["grounded"] }],
    moveRun: [10, "Vitesse de course", 6, 20, 0.5, " km/h", { forms: ["grounded"] }],
  },
  moveOf, length: moveLoops, play,
});
export const { meta, drawBack, draw } = fiche;
