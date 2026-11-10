// The creature's life (tab Vivre): one continuous time in which it rests, does things, changes form, goes about the
// scene and makes things that stay in it. Nothing is drawn here that another module doesn't already draw: every
// animation is the one of its tab, played with that tab's settings, and they are laid end to end on a score.
//
//   rest      the creature at rest where it is: its form (the blob, or a form of the Transformation tab) and where it
//             stands in the scene (pos: it may have moved there). It lasts as long as nothing is asked; its own loop
//             (the blob's, or the figure's live loop) gives its beats.
//   segments  what it does, each starting on a beat of the rest it leaves and lasting whole loops: an animation from
//             rest back to rest ("once"), the entry, loop and exit of an activity (the loop repeats until something
//             else is asked), a change of form or of place (from one rest to another), a thing made or taken away.
//
// So every join is one the seam tests check (an animation's first and last frames are its rest's), and the creature
// lives without a jump for as long as you like. A frame is a pure function of (t, score): the page draws the time it
// is now, the tests and the render tool draw any time. Things (objects for now) stay in the scene where they were made.
import * as idle from "../blob/blob.js";
import * as actions from "../actions/index.js";
import * as loops from "../loops/index.js";
import * as clock from "../clock/clock.js";
import * as objects from "../objects/objects.js";
import * as transform from "../forms/forms.js";
import { lookOf, isLook, withLook, mixLook, glide, lookKey } from "../shared/_look.js";

export const meta = {
  name: "Ice creature life",
  desc: "The ice creature living on: it rests, acts, loops activities, changes form, goes about the scene and leaves things in it, with no jump.",
  tags: ["creature", "blob", "life", "state machine", "ice", "light", "loop"],
  size: [320, 180],
  origin: [160, 100],
  duration: 8,
  loop: false,
  fps: 30,
  bg: "black",
  // life: a life from createLife() (the page's); script: requests to build one from (render tool, tests)
  options: { ...idle.meta.options, life: null, script: null },
};

/** The modules a life plays, by the tab they belong to. */
const MODULES = { actions, loops, clock, objects, transform };
const MARGIN = 0.15; // (s) nothing new starts sooner than this after now: the frame on screen never changes

// ---- what it can do: every animation of the tabs that go from rest back to rest, or loop with an entry and an exit
/** Every animation a life can play, from the catalogues: { id, tab (whose options and effect), pick, kind, fiche }. */
const CATALOG = [
  // (kind "move" goes from one rest to another: its rest is somewhere else after it)
  ...actions.ACTIONS.map((f) => ({ id: "actions:" + f.id, tab: "actions", pick: { action: f.id }, kind: f.kind, fiche: f })),
  ...loops.LOOPS.map((f) => ({ id: "loops:" + f.id, tab: "loops", pick: { loop: f.id }, kind: "loop", fiche: f })),
  { id: "clock", tab: "clock", pick: {}, kind: "once" },
];
const byId = new Map(CATALOG.map((c) => [c.id, c]));
/** Why an animation can't be played in a form (null if it can). */
const whyNot = (entry, form) => (entry.fiche && entry.fiche.formFit[form]) || null;

// ---- rests. A hub: { form, pos ([x, y]: where it stands, whole px from its home spot), since (when this rest began),
// look (its colours: { palette, eyeColor, pupilColor }, see shared/_look.js) }.
// Everything it does at a pos is drawn there: the painter moved by pos, its tab's options worked out for that spot
// (cfg.optsFor gets the hub), in the look it has there.
const posOf = (h) => (Array.isArray(h.pos) ? [Math.round(h.pos[0]) || 0, Math.round(h.pos[1]) || 0] : [0, 0]);
const hubKey = (h) => `${h.form}|${posOf(h)}|${lookKey(h.look)}`;
// the look a creature starts with when nothing says otherwise: the blob's own
const DEFAULT_LOOK = lookOf(idle.meta.options);

/**
 * A new life. cfg: { D: the blob's loop (s), optsFor(tab, pick, hub): that tab's options for its effect as the page
 * builds them (its settings, the scene; the creature's look and place are laid over them), hub: { form, pos, look } to
 * start from, look: the creature's look when the hub has none, things: [{ id, ob }] already in the scene, t0: when it starts }.
 */
export function createLife(cfg) {
  const t0 = cfg.t0 || 0, h = cfg.hub || {};
  // its look: the one it was left with, else the page's (cfg.look), else the blob's
  const hub = { form: transform.FORMS.includes(h.form) ? h.form : "blob", pos: posOf(h), since: t0, look: lookIn(h.look) || lookIn(cfg.look) || DEFAULT_LOOK };
  const things = (cfg.things || []).map((th, i) => ({ ...th, id: th.id ?? i + 1, born: -Infinity, dying: Infinity }));
  return { cfg, hub0: hub, segs: [], things, nextId: Math.max(1, ...things.map((th) => th.id + 1)), rests: new Map() };
}

// a tab's options for its effect from rest hub: the page's, with the creature's look at that rest laid over them
const optsOf = (L, tab, pick, hub) => withLook({ ...L.cfg.optsFor(tab, pick, hub) }, hub.look);
// how long one loop of a rest lasts: its beats
function restLen(L, h) {
  const D = L.cfg.D;
  return h.form === "blob" ? D : rest(L, h).o.loops * D;
}
// the rest's animation: the creature at rest (the objects tab's live scene with nothing in it: its form's own rest)
function rest(L, h) {
  const key = hubKey(h);
  let r = L.rests.get(key);
  if (!r) {
    const o = optsOf(L, "objects", { mode: "live" }, h), lp = h.form === "blob" ? 1 : Math.max(1, Math.round(o.liveLoops || 2));
    Object.assign(o, { mode: "live", objects: [], loops: lp });
    r = { mod: objects, o, len: L.cfg.D * lp };
    L.rests.set(key, r);
  }
  return r;
}

// ---- the score
const endOf = (s) => s.at + s.len;
/** The hub at the end of the score and when its rest began. */
function tail(L) {
  const s = L.segs[L.segs.length - 1];
  return s ? s.hub1 : L.hub0;
}
// the first beat of a rest at or after t
function beat(L, h, t) {
  const R = restLen(L, h), n = Math.ceil((t - h.since) / R - 1e-9);
  return h.since + Math.max(0, n) * R;
}
// a loop playing on and on at the end of the score: it ends after the turn going on at `now`, and its exit follows
function closeLoop(L, now) {
  const s = L.segs[L.segs.length - 1];
  if (!s || s.kind !== "loop" || s.rep !== Infinity) return;
  s.rep = Math.max(1, Math.ceil((now + MARGIN - s.at) / s.T - 1e-9));
  s.len = s.rep * s.T;
  s.hub1 = { ...s.hub1, since: endOf(s) };
  L.segs.push(segment(L, { kind: "exit", entry: s.entry, label: s.exitLabel }, s.hub1, endOf(s)));
}

// ---- what a request needs: the steps that take it from the rest it is in to doing what's asked. (An action or a loop
// needs nothing here: the catalogue brings it. A new kind of step, such as a companion: its case in plan() and segment(),
// and its request in the lives of tests/seams.mjs.)
const STEP_LABEL = { move: "se déplace", revert: "redevient le blob", transform: "prend forme humaine", appear: "fait apparaître un objet", remove: "fait disparaître un objet", recolour: "change de couleur" };
function plan(L, req, h) {
  const steps = [];
  const toForm = (form) => {
    if (h.form === form) return;
    if (h.form !== "blob") { steps.push({ kind: "revert" }); h = { ...h, form: "blob" }; }
    if (form !== "blob") { steps.push({ kind: "transform", form }); h = { ...h, form }; }
  };
  let why = null;
  switch (req.id) {
    case "form": if (transform.FORMS.includes(req.form)) toForm(req.form); else why = "Forme inconnue."; break;
    case "appear": steps.push({ kind: "appear", ob: req.ob, label: req.label, pick: req.pick }); break;
    case "remove": {
      const th = L.things.find((x) => x.id === req.thing && x.dying === Infinity);
      if (!th) why = "Cet objet n’est plus là.";
      else steps.push({ kind: "remove", thing: th.id, label: req.label, pick: req.pick });
      break;
    }
    case "stop": break;
    // its colours change to req.look, at its next rest (the page asks so when its colours are set by hand)
    case "look": steps.push({ kind: "recolour", look: req.look, label: req.label }); break;
    default: {
      const entry = byId.get(req.id);
      if (!entry) { why = "Animation inconnue."; break; }
      why = whyNot(entry, h.form);
      if (!why && entry.kind === "move") {
        // where to (req.to: px from the home spot); without one (asking whether it could), only the form matters
        if (!req.to) break;
        const p0 = posOf(h), d = actions.moveOf(moveOpts(L, entry, req.to, h));
        if (!d[0] && !d[1]) why = h.form === "grounded" ? "Il y est déjà : sur ses jambes, il ne va que de côté, le long de son sol." : "Il y est déjà.";
        else steps.push({ kind: "move", entry, to: [p0[0] + d[0], p0[1] + d[1]], label: req.label });
        break;
      }
      if (!why) steps.push({ kind: entry.kind === "loop" ? "enter" : "once", entry, label: req.label, reps: req.reps });
    }
  }
  return why ? { ok: false, why } : { ok: true, steps };
}

// the move's options from rest h to a place `to` (px from the home spot)
function moveOpts(L, entry, to, h) {
  const p0 = posOf(h);
  return optsOf(L, entry.tab, { ...entry.pick, moveTo: [Math.round(to[0]) - p0[0], Math.round(to[1]) - p0[1]] }, h);
}
// one step as a segment starting at `at` from rest h, with the options of its tab
function segment(L, step, h, at) {
  const k = step.kind, s = { at, kind: k, hub0: h, label: step.label || STEP_LABEL[k] || "" };
  let h1 = h;
  if (k === "once") {
    s.o = optsOf(L, step.entry.tab, step.entry.pick, h); s.mod = MODULES[step.entry.tab];
    s.len = s.mod.total(s.o);
    // an action that ends with another look: its rest after it is that look, reached in its window
    const lk = step.entry.fiche && step.entry.fiche.look;
    if (lk) { h1 = { ...h, look: lk.to(s.o) }; s.look = { from: h.look, to: h1.look, window: lk.window }; }
  } else if (k === "move") {
    // it goes there, and its rest is there now
    s.o = moveOpts(L, step.entry, step.to, h); s.mod = actions;
    s.len = actions.total(s.o);
    const p0 = posOf(h), d = actions.moveOf(s.o);
    h1 = { ...h, pos: [p0[0] + d[0], p0[1] + d[1]] };
  } else if (k === "enter" || k === "exit" || k === "loop") {
    const part = k === "loop" ? "loop" : k;
    s.o = optsOf(L, "loops", { ...step.entry.pick, part }, h); s.o.part = part; s.mod = loops; s.entry = step.entry;
    s.len = loops.total(s.o);
    if (k === "loop") { s.T = s.len; s.rep = step.reps ? Math.max(1, Math.round(step.reps)) : Infinity; s.len = s.rep === Infinity ? Infinity : s.rep * s.T; s.exitLabel = step.exitLabel; }
  } else if (k === "transform" || k === "revert") {
    s.o = optsOf(L, "transform", k === "transform" ? { mode: "transform", form: step.form } : { mode: "revert", form: h.form }, h); s.mod = transform;
    s.len = transform.total(s.o); h1 = { ...h, form: k === "transform" ? step.form : "blob" };
    if (k === "transform") s.label = step.form === "grounded" ? "prend forme humaine, sur ses jambes" : "prend forme humaine, en lévitation";
  } else if (k === "recolour") {
    // the rest it stands in, its colours gliding to the new look over one of its loops (nothing else moves)
    s.o = { ...rest(L, h).o }; s.mod = objects; s.len = restLen(L, h);
    h1 = { ...h, look: step.look }; s.look = { from: h.look, to: step.look, window: [0, 1] };
  } else {
    // a thing made (appear) or taken away (remove)
    s.o = optsOf(L, "objects", { ...step.pick, mode: k }, h); s.mod = objects;
    const th = k === "appear" ? { id: L.nextId++, ob: step.ob, born: Infinity, dying: Infinity } : L.things.find((x) => x.id === step.thing);
    if (k === "appear") L.things.push(th);
    s.thing = th.id;
    s.len = objects.total(s.o);
    // the objects tab draws them all for this one: what is there with this one coming or going, in the order they were made
    const list = visible(L, at).filter((x) => x.id !== th.id).concat([th]).sort((a, b) => a.id - b.id), [px, py] = posOf(h);
    // (things are placed from the home spot; the objects tab draws them from where the creature stands)
    s.o.objects = list.map((x) => (px || py ? { ...x.ob, x: x.ob.x - px, y: x.ob.y - py } : x.ob)); s.o.target = list.indexOf(th); s.o.mode = k;
    if (k === "appear") th.born = at + s.len;
    else th.dying = at;
  }
  s.hub1 = { ...h1, since: Number.isFinite(s.len) ? at + s.len : Infinity };
  return s;
}

/**
 * Ask the creature for something; it does it after what it was already asked (a loop going on ends after its turn,
 * through its exit), starting on the next beat of its rest, taking the steps it needs first (changing form...).
 * req: { id: a CATALOG id (the move: "actions:move" with to: [x, y], px from the home spot) | "form" (form) |
 * "appear" (ob) | "remove" (thing) | "stop", label, reps (a loop's turns before it stops by itself), pick (more of the
 * objects tab's settings for appear / remove: appearStyle, removeStyle...) }.
 * Returns { ok } or { ok: false, why } (in French).
 */
export function want(L, req, now) {
  const was = L.segs.length, open = L.segs.length && L.segs[L.segs.length - 1].rep === Infinity;
  if (open) closeLoop(L, now);
  let h = tail(L);
  const p = plan(L, req, h);
  if (!p.ok) {
    // nothing changes: a loop going on goes on
    if (open) { L.segs.length = was; const s = L.segs[was - 1]; s.rep = Infinity; s.len = Infinity; s.hub1 = { ...s.hub1, since: Infinity }; }
    return p;
  }
  let at = beat(L, h, Math.max(h.since, now + MARGIN));
  for (const step of p.steps) {
    const s = segment(L, step, h, at);
    L.segs.push(s);
    if (step.kind === "enter") {
      // the loop itself, then (when it is told to stop, or after its turns) its exit
      const lp = segment(L, { kind: "loop", entry: step.entry, reps: step.reps, label: step.label, exitLabel: step.label }, s.hub1, endOf(s));
      L.segs.push(lp);
      if (lp.rep !== Infinity) L.segs.push(segment(L, { kind: "exit", entry: step.entry, label: step.label }, lp.hub1, endOf(lp)));
    }
    h = L.segs[L.segs.length - 1].hub1;
    at = endOf(L.segs[L.segs.length - 1]);
  }
  return { ok: true };
}
/** Whether a request could be played after what is already asked, and why not. */
export function can(L, req) {
  const s = L.segs[L.segs.length - 1], h = s && s.rep === Infinity ? s.hub0 : tail(L), p = plan(L, req, h);
  return p.ok ? { ok: true } : p;
}
/** Forget what hasn't started yet (a loop going on keeps going). */
export function clearQueue(L, now) {
  L.segs = L.segs.filter((s) => s.at <= now + MARGIN);
  for (const th of L.things) {
    if (th.born > now + MARGIN && th.born !== -Infinity && !L.segs.some((s) => s.thing === th.id)) th.dropped = true;
    if (th.dying > now + MARGIN && th.dying !== Infinity && !L.segs.some((s) => s.thing === th.id && s.kind === "remove")) th.dying = Infinity;
  }
  L.things = L.things.filter((th) => !th.dropped);
  const s = L.segs[L.segs.length - 1];
  if (s && s.kind === "loop" && endOf(s) > now) { s.rep = Infinity; s.len = Infinity; s.hub1 = { ...s.hub1, since: Infinity }; }
}
/** Forget what ended long ago (the rest it led to stays where it was). */
export function trim(L, now, keep = 6) {
  let n = 0;
  while (n < L.segs.length - 1 && endOf(L.segs[n]) < now - keep) n++;
  if (n) { L.hub0 = L.segs[n - 1].hub1; L.segs = L.segs.slice(n); }
  L.things = L.things.filter((th) => !(th.dying < now - keep));
}

// ---- where the score is at t
function locate(L, t) {
  const S = L.segs;
  let lo = 0, hi = S.length - 1, i = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (S[m].at <= t) { i = m; lo = m + 1; } else hi = m - 1; }
  if (i >= 0 && t < endOf(S[i])) {
    const s = S[i], tau = t - s.at;
    return { seg: s, hub: s.hub0, mod: s.mod, o: s.o, tau: s.kind === "loop" ? tau % s.T : tau, ttau: tau };
  }
  const h = i >= 0 ? S[i].hub1 : L.hub0, r = rest(L, h), tau = t - h.since;
  return { seg: null, hub: h, mod: r.mod, o: r.o, tau, ttau: tau };
}
/** What it is doing at t and what comes next, for the page: { label, kind, hub, queue: [labels], end: the last hub }. */
export function status(L, t) {
  const x = locate(L, t), next = L.segs.filter((s) => s.at > t);
  return { label: x.seg ? x.seg.label : "", kind: x.seg ? x.seg.kind : "rest", hub: x.hub, loop: x.seg && x.seg.kind === "loop" && x.seg.rep === Infinity,
    queue: next.map((s) => ({ label: s.label, kind: s.kind })), end: tail(L) };
}
// the things in the scene at t (and those it may still take away)
const visible = (L, t) => L.things.filter((th) => th.born <= t && t < th.dying).sort((a, b) => a.id - b.id);
/** What to keep for next time: where it is, its look and what it made (from the end of the score). */
export function snapshot(L) {
  const h = tail(L);
  return { hub: { form: h.form, pos: posOf(h), look: h.look }, things: L.things.filter((th) => th.dying === Infinity).map(({ id, ob }) => ({ id, ob })) };
}
/** The look the creature ends with (its rest at the end of the score). */
export const tailLook = (L) => tail(L).look;
/** Whether nothing is asked beyond now: it is at rest, and what it does next can start on its rest. */
export function settled(L, now) {
  const s = L.segs[L.segs.length - 1];
  return !s || endOf(s) <= now + MARGIN;
}
/** A look as the life draws it, from the page's or a saved one (null if it isn't one). */
export const lookIn = (v) => (isLook(v) ? { palette: [...v.palette], eyeColor: v.eyeColor, pupilColor: v.pupilColor } : null);

// ---- drawing a frame
// the look at a point of the score: where a segment changes it, its tones glide from one look to the other in its window
function lookAt(x) {
  const s = x.seg;
  if (!s || !s.look) return x.hub.look;
  return mixLook(s.look.from, s.look.to, glide(x.ttau / s.len, ...s.look.window));
}
// the things there while a segment plays: those made and not taken away
function thingsOn(p, L, x, t, layer) {
  const s = x.seg;
  if (s && (s.kind === "appear" || s.kind === "remove")) return; // the objects tab draws them all for these
  const list = visible(L, t);
  if (!list.length) return;
  const r = rest(L, x.hub), o = withLook(r.o, lookAt(x));
  for (const th of list) if ((th.ob.layer || "back") === layer) objects.drawObject(p, o, th.ob, x.ttau);
}
// a module draws where the creature stands: the painter moved by the rest's pos while it draws
function at(p, pos, fn) {
  if (!pos[0] && !pos[1]) return fn();
  const tx = p.tx, ty = p.ty;
  p.tx += pos[0]; p.ty += pos[1];
  try { return fn(); } finally { p.tx = tx; p.ty = ty; }
}
function layerOf(p, t, o, front) {
  const L = o.life || demoLife(o);
  if (!L) return front ? idle.draw(p, t, o) : idle.drawBack(p, t, o);
  const x = locate(L, t), pos = posOf(x.hub);
  // (an action that changes the look glides its own body; a recolour, which draws the rest, glides it here)
  const mo = x.seg && x.seg.kind === "recolour" ? withLook(x.o, lookAt(x)) : x.o;
  at(p, pos, () => (front ? x.mod.draw(p, x.tau, mo) : x.mod.drawBack(p, x.tau, mo)));
  thingsOn(p, L, x, t, front ? "front" : "back");
}
export function drawBack(p, t, o) { layerOf(p, t, o, false); }
export function draw(p, t, o) { layerOf(p, t, o, true); }

// ---- lives without the page (tests, the render tool): each tab's defaults, the creature in the given form
/** Options as each tab's defaults give them, with base (room, figure settings...) laid over. */
export function plainOpts(base = {}) {
  return (tab, pick, hub) => {
    // (the scene's room as seen from where it stands)
    const [px, py] = posOf(hub), r = base.room ?? null, room = r && (px || py) ? [r[0] - px, r[1] - py, r[2] - px, r[3] - py] : r;
    const mod = MODULES[tab], o = { ...mod.meta.options, ...(base.tabs && base.tabs[tab]), room, ...pick };
    for (const [k, v] of Object.entries(base)) if (/^(hu|gr)[A-Z]/.test(k) || k === "liveLoops" || k === "palette" || k === "seed") o[k] = v;
    if (tab !== "transform") o.form = hub.form;
    return o;
  };
}
const DEMOS = new WeakMap();
// a life from a script: [{ at, ...request }] (render tool: --opts '{"script":[{"at":0,"id":"actions:aura"}]}')
function demoLife(o) {
  if (!Array.isArray(o.script)) return null;
  let L = DEMOS.get(o);
  if (!L) {
    L = createLife({ D: o.duration, optsFor: plainOpts({ room: o.room, palette: o.palette }), hub: o.hub, things: o.things, look: lookOf(o) });
    for (const r of o.script) want(L, r, r.at || 0);
    DEMOS.set(o, L);
  }
  return L;
}
