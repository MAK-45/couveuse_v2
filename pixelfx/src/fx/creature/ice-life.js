// The creature's life (tab Vivre): one continuous time in which it rests, does things, changes form, opens portals,
// goes into other worlds and comes back, and makes things that stay in its scene. Nothing is drawn here that another
// module doesn't already draw: every animation is the one of its tab, played with that tab's settings, and they are
// laid end to end on a score.
//
//   rest      the creature at rest where it is: its form (the blob, or a form of the Transformation tab), the place
//             (home, or a world of the Mondes / Surface planète tabs) and the portal open there, if any. It lasts as
//             long as nothing is asked; its own loop (the blob's, the figure's live loop, the world's with a portal
//             open) gives its beats.
//   segments  what it does, each starting on a beat of the rest it leaves and lasting whole loops: an animation from
//             rest back to rest ("once"), the entry, loop and exit of an activity (the loop repeats until something
//             else is asked), a change of form or of place (from one rest to another), a thing made or taken away.
//
// So every join is one the seam tests check (an animation's first and last frames are its rest's), and the creature
// lives without a jump for as long as you like. A frame is a pure function of (t, score): the page draws the time it
// is now, the tests and the render tool draw any time. Things (objects for now, companions later) live in the scene
// with their place: linked to the world they were made in (they stay there when it leaves, and are there again when it
// comes back) or following the creature from world to world.
import { fit, seg, ease } from "../../core/index.js";
import * as idle from "./ice-blob-idle.js";
import * as actions from "./ice-blob-actions.js";
import * as loops from "./ice-blob-loops.js";
import * as clock from "./ice-blob-clock.js";
import * as elec from "./ice-blob-electric.js";
import * as objects from "./ice-scene-objects.js";
import * as portal from "./ice-blob-portal.js";
import * as transform from "./ice-blob-transform.js";
import { paintWorld, worldOf, isSurface } from "./ice-worlds.js";

export const meta = {
  name: "Ice creature life",
  desc: "The ice creature living on: it rests, acts, loops activities, changes form, crosses portals to other worlds and back, and leaves things in its scene, with no jump.",
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

const E = ease.inOutSine;
/** The modules a life plays, by the tab they belong to. */
export const MODULES = { actions, loops, clock, elec, objects, portal, transform };
const FORMS = ["blob", "human", "grounded"];
const MARGIN = 0.15; // (s) nothing new starts sooner than this after now: the frame on screen never changes

// ---- what it can do: every animation of the tabs that go from rest back to rest, or loop with an entry and an exit
/** Every animation a life can play, generated from the modules' own lists: { id, family, tab, pick, kind, name }. */
export const CATALOG = [
  ...actions.ACTIONS.map((name) => ({ id: "actions:" + name, family: "actions", tab: "actions", pick: { action: name }, kind: "once", name })),
  ...loops.LOOPS.map((name) => ({ id: "loops:" + name, family: "loops", tab: "loops", pick: { loop: name }, kind: "loop", name })),
  ...elec.ELEC.map((name) => ({ id: "elec:" + name, family: "elec", tab: "elec", pick: { elec: name }, kind: "once", name })),
  { id: "clock", family: "clock", tab: "clock", pick: {}, kind: "once", name: "clock" },
];
const byId = new Map(CATALOG.map((c) => [c.id, c]));
/** Why an animation can't be played in a form (null if it can). */
export function whyNot(entry, form) {
  const mod = MODULES[entry.tab], key = entry.tab === "loops" ? entry.pick.loop : entry.tab === "actions" ? entry.pick.action : null;
  if (key && mod.FORM_FIT && mod.FORM_FIT[form] && mod.FORM_FIT[form][key]) return mod.FORM_FIT[form][key];
  if (entry.tab === "loops" && !loops.hasParts(key)) return loops.PART_FIT[key];
  return null;
}

// ---- rests. A hub: { form, place ("home" or a world's id), portal (null; at home the id of the world it opens onto;
// in another world "home" for the way back), since (when this rest began), wt0 (when it arrived in that world) }
const hubKey = (h) => `${h.form}|${h.place}|${h.portal}`;
const away = (h) => h.place !== "home";

/**
 * A new life. cfg: { D: the blob's loop (s), optsFor(tab, pick, hub): that tab's options for its effect as the page
 * builds them (its settings, the creature's look and place, the scene), hub: { form, place, portal } to start from,
 * things: [{ id, ob, place, linked }] already in the scene, t0: when it starts }.
 */
export function createLife(cfg) {
  const t0 = cfg.t0 || 0, h = cfg.hub || {};
  const hub = { form: FORMS.includes(h.form) ? h.form : "blob", place: h.place ?? "home", portal: h.portal ?? null, since: t0, wt0: h.wt0 ?? t0 };
  const things = (cfg.things || []).map((th, i) => ({ ...th, id: th.id ?? i + 1, born: -Infinity, dying: Infinity }));
  return { cfg, hub0: hub, segs: [], things, nextId: Math.max(1, ...things.map((th) => th.id + 1)), rests: new Map(), worlds: new Map() };
}

// the options of a tab, with what a life adds: the creature on a planet's ground stands on it (no floor of ice); a
// portal leaves the world's near part to the life (drawn after the things); no portal stays open behind it
function optsOf(L, tab, pick, hub) {
  const o = { ...L.cfg.optsFor(tab, pick, hub) };
  if (tab === "portal") { o.frontLater = 1; o.crossKeep = 0; o.returnKeep = 0; }
  else if (away(hub) && o.form === "grounded" && isSurface(worldCtx(L, hub.place, hub).w)) o.grNoFloor = 1;
  return o;
}
// a world as the portal tab shows it (its state, its view through the portal), for painting it behind the creature
function worldCtx(L, id, hub) {
  const key = id + "|" + hub.form;
  let w = L.worlds.get(key);
  if (!w) {
    const o = { ...L.cfg.optsFor("portal", { pWorld: id, mode: "beyond" }, { ...hub, place: "home", portal: null }) };
    const W = worldOf(o.world), room = Array.isArray(o.room) ? o.room : [-portal.meta.origin[0], -portal.meta.origin[1], portal.meta.size[0] - portal.meta.origin[0], portal.meta.size[1] - portal.meta.origin[1]];
    const P = portal.total({ ...o, mode: "live" }), cut = o.form === "grounded" && isSurface(W) ? transform.floorFor(o) : null;
    w = { o, w: W, P, room, view: [Math.round(o.pViewX || 0), Math.round(o.pViewY || 0)], cut };
    L.worlds.set(key, w);
  }
  return w;
}
// how long one loop of a rest lasts: its beats
export function restLen(L, h) {
  const D = L.cfg.D;
  if (h.portal === null) return h.form === "blob" ? D : rest(L, h).o.loops * D;
  return rest(L, h).len;
}
// the rest's animation: the creature at rest (the objects tab's live scene with nothing in it: its form's own rest), or
// the portal's open loops
function rest(L, h) {
  const key = hubKey(h);
  let r = L.rests.get(key);
  if (!r) {
    if (h.portal === null) {
      const o = optsOf(L, "objects", { mode: "live" }, h), lp = h.form === "blob" ? 1 : Math.max(1, Math.round(o.liveLoops || 2));
      Object.assign(o, { mode: "live", objects: [], loops: lp });
      r = { mod: objects, o, len: L.cfg.D * lp };
    } else {
      const o = optsOf(L, "portal", { mode: away(h) ? "beyondOpen" : "live", pWorld: away(h) ? h.place : h.portal }, h);
      r = { mod: portal, o, len: portal.total(o) };
    }
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

// ---- what a request needs: the steps that take it from the rest it is in to doing what's asked
const STEP_LABEL = { close: "ferme le portail", open: "ouvre un portail", cross: "traverse le portail", reopen: "ouvre le chemin du retour",
  return: "rentre chez lui", revert: "redevient le blob", transform: "prend forme humaine", appear: "fait apparaître un objet", remove: "fait disparaître un objet" };
function plan(L, req, h) {
  const steps = [];
  // a portal open where it is must close first (the other animations don't draw it); in another world the way home
  // can't be closed from there yet: only going home is possible then
  const shut = () => {
    if (h.portal === null) return null;
    if (!away(h)) { steps.push({ kind: "close" }); h = { ...h, portal: null }; return null; }
    return "Le chemin du retour est ouvert : il ne peut que rentrer chez lui (le refermer depuis l’autre monde n’existe pas encore).";
  };
  const goHome = () => {
    if (!away(h)) return;
    if (h.portal === null) { steps.push({ kind: "reopen" }); h = { ...h, portal: "home" }; }
    steps.push({ kind: "return" }); h = { ...h, place: "home", portal: null };
  };
  const goTo = (W) => {
    if (h.place === W) return;
    goHome();
    if (W === "home") return;
    if (h.portal !== null && h.portal !== W) { steps.push({ kind: "close" }); h = { ...h, portal: null }; }
    if (h.portal === null) { steps.push({ kind: "open", world: W }); h = { ...h, portal: W }; }
    steps.push({ kind: "cross" }); h = { ...h, place: W, portal: null };
  };
  const toForm = (form) => {
    if (h.form === form) return null;
    const why = shut();
    if (why) return why;
    if (h.form !== "blob") { steps.push({ kind: "revert" }); h = { ...h, form: "blob" }; }
    if (form !== "blob") { steps.push({ kind: "transform", form }); h = { ...h, form }; }
    return null;
  };
  let why = null;
  switch (req.id) {
    case "form": why = FORMS.includes(req.form) ? toForm(req.form) : "Forme inconnue."; break;
    case "go": goTo(req.place ?? "home"); break;
    case "portal":
      if (req.open === false) { if (h.portal === null) break; why = away(h) ? "Le chemin du retour ne se referme pas depuis l’autre monde : il peut rentrer par lui." : null; if (!why) steps.push({ kind: "close" }); break; }
      if (away(h)) { if (h.portal === null) steps.push({ kind: "reopen" }); break; }
      if (req.world == null) { why = "Choisis d’abord un monde."; break; }
      if (h.portal === req.world) break;
      if (h.portal !== null) steps.push({ kind: "close" });
      steps.push({ kind: "open", world: req.world });
      break;
    case "appear": why = shut(); if (!why) steps.push({ kind: "appear", ob: req.ob, linked: req.linked !== false, label: req.label, pick: req.pick }); break;
    case "remove": {
      why = shut();
      const th = L.things.find((x) => x.id === req.thing && x.dying === Infinity);
      if (!why && !th) why = "Cet objet n’est plus là.";
      else if (!why && th.linked && th.place !== h.place) why = "Cet objet est resté dans un autre monde.";
      if (!why) steps.push({ kind: "remove", thing: th.id, label: req.label, pick: req.pick });
      break;
    }
    case "stop": break;
    default: {
      const entry = byId.get(req.id);
      if (!entry) { why = "Animation inconnue."; break; }
      why = whyNot(entry, h.form) || shut();
      if (!why) steps.push({ kind: entry.kind === "loop" ? "enter" : "once", entry, label: req.label, reps: req.reps });
    }
  }
  return why ? { ok: false, why } : { ok: true, steps };
}

// one step as a segment starting at `at` from rest h, with the options of its tab
function segment(L, step, h, at) {
  const D = L.cfg.D, k = step.kind, s = { at, kind: k, hub0: h, label: step.label || STEP_LABEL[k] || "" };
  let h1 = h;
  if (k === "once") {
    s.o = optsOf(L, step.entry.tab, step.entry.pick, h); s.mod = MODULES[step.entry.tab];
    s.len = s.o.duration * Math.max(1, Math.round(s.o.loops));
  } else if (k === "enter" || k === "exit" || k === "loop") {
    const part = k === "loop" ? "loop" : k;
    s.o = optsOf(L, "loops", { ...step.entry.pick, part }, h); s.o.part = part; s.mod = loops; s.entry = step.entry;
    s.len = loops.total(s.o);
    if (k === "loop") { s.T = s.len; s.rep = step.reps ? Math.max(1, Math.round(step.reps)) : Infinity; s.len = s.rep === Infinity ? Infinity : s.rep * s.T; s.exitLabel = step.exitLabel; }
  } else if (k === "transform" || k === "revert") {
    s.o = optsOf(L, "transform", k === "transform" ? { mode: "transform", form: step.form } : { mode: "revert", form: h.form }, h); s.mod = transform;
    s.len = transform.total(s.o); h1 = { ...h, form: k === "transform" ? step.form : "blob" };
    if (k === "transform") s.label = step.form === "grounded" ? "prend forme humaine, sur ses jambes" : "prend forme humaine, en lévitation";
  } else if (k === "appear" || k === "remove") {
    s.o = optsOf(L, "objects", { ...step.pick, mode: k }, h); s.mod = objects;
    const th = k === "appear" ? { id: L.nextId++, ob: step.ob, place: h.place, linked: step.linked, born: Infinity, dying: Infinity } : L.things.find((x) => x.id === step.thing);
    if (k === "appear") L.things.push(th);
    s.thing = th.id;
    s.len = s.o.duration * Math.max(1, Math.round(s.o.loops));
    // the objects tab draws them all for this one: what is there with this one coming or going, in the order they were made
    const list = visible(L, at, h.place).filter((x) => x.id !== th.id).concat([th]).sort((a, b) => a.id - b.id);
    s.o.objects = list.map((x) => x.ob); s.o.target = list.indexOf(th); s.o.mode = k;
    if (k === "appear") th.born = at + s.len;
    else th.dying = at;
  } else {
    // the portal: open (at home onto a world), close, cross (into it), reopen (the way home, from there), return
    const W = k === "open" ? step.world : k === "close" || k === "cross" ? h.portal : h.place;
    s.o = optsOf(L, "portal", { mode: k, pWorld: W }, h); s.mod = portal;
    if (k === "reopen") { const P = worldCtx(L, W, h).P; s.o.wClock0 = (((at - h.wt0) % P) + P) % P; }
    s.len = portal.total(s.o);
    h1 = k === "open" ? { ...h, portal: W } : k === "close" ? { ...h, portal: null } : k === "cross" ? { ...h, place: W, portal: null }
      : k === "reopen" ? { ...h, portal: "home" } : { ...h, place: "home", portal: null };
  }
  if (Number.isFinite(s.len)) {
    s.hub1 = { ...h1, since: at + s.len };
    if (k === "cross") s.hub1.wt0 = at + s.len;
  } else s.hub1 = { ...h1, since: Infinity };
  return s;
}

/**
 * Ask the creature for something; it does it after what it was already asked (a loop going on ends after its turn,
 * through its exit), starting on the next beat of its rest, taking the steps it needs first (closing a portal,
 * changing form, going home...). req: { id: a CATALOG id | "form" (form) | "go" (place) | "portal" (open, world) |
 * "appear" (ob, linked) | "remove" (thing) | "stop", label, reps (a loop's turns before it stops by itself), pick (more of the
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
/** The things in the scene at t where the creature is (and those it may still take away there). */
export function visible(L, t, place) {
  return L.things.filter((th) => th.born <= t && t < th.dying && (!th.linked || th.place === place)).sort((a, b) => a.id - b.id);
}
/** What to keep for next time: where it is and what it made (from the end of the score). */
export function snapshot(L) {
  const h = tail(L);
  return { hub: { form: h.form, place: h.place, portal: h.portal }, things: L.things.filter((th) => th.dying === Infinity).map(({ id, ob, place, linked }) => ({ id, ob, place, linked })) };
}

// ---- drawing a frame
// the things there while a segment plays: those made and not taken away, where it is; while it crosses to another
// world those of the world it leaves fade as the other world fills the scene, and those of the one it reaches appear
function thingsOn(p, L, x, t, layer) {
  const s = x.seg;
  if (s && (s.kind === "appear" || s.kind === "remove")) return; // the objects tab draws them all for these
  const crossing = s && (s.kind === "cross" || s.kind === "return"), from = x.hub.place, to = crossing ? s.hub1.place : from;
  const list = L.things.filter((th) => th.born <= t && t < th.dying && (!th.linked || th.place === from || th.place === to)).sort((a, b) => a.id - b.id);
  if (!list.length) return;
  const r = rest(L, x.hub), a = crossing ? portal.crossAt(s.o, x.tau) : 0, X = portal.CROSS, f0 = p.fade;
  for (const th of list) {
    if ((th.ob.layer || "back") !== layer) continue;
    let k = 1;
    if (crossing && th.linked) k = th.place === from ? 1 - E(seg(a, X.swell[0], X.swell[1])) : E(seg(a, X.out[0], X.out[1]));
    if (k <= 0.01) continue;
    p.fade = f0 * k;
    objects.drawObject(p, r.o, th.ob, x.ttau);
    p.fade = f0;
  }
}
// in another world the world is painted behind it, unless the portal's own animation paints it
function worldBehind(L, x, t) {
  if (!away(x.hub) || x.mod === portal) return null;
  const w = worldCtx(L, x.hub.place, x.hub), wt = (((t - x.hub.wt0) % w.P) + w.P) % w.P;
  return { ...w, wt, cut: x.o.form === "grounded" && isSurface(w.w) ? transform.floorFor(x.o) : null };
}
function layerOf(p, t, o, front) {
  const L = o.life || demoLife(o);
  if (!L) return front ? idle.draw(p, t, o) : idle.drawBack(p, t, o);
  const x = locate(L, t), w = worldBehind(L, x, t);
  if (!front) {
    if (w) paintWorld(p, w.w, w.wt, w.P, w.room, w.view, w.cut === null ? null : { part: "back", y: w.cut });
    x.mod.drawBack(p, x.tau, x.o);
    thingsOn(p, L, x, t, "back");
    return;
  }
  x.mod.draw(p, x.tau, x.o);
  thingsOn(p, L, x, t, "front");
  if (w && w.cut !== null) paintWorld(p, w.w, w.wt, w.P, w.room, w.view, { part: "front", y: w.cut });
  if (x.mod === portal) portal.worldFront(p, x.tau, x.o);
}
export function drawBack(p, t, o) { layerOf(p, t, o, false); }
export function draw(p, t, o) { layerOf(p, t, o, true); }

// ---- lives without the page (tests, the render tool): each tab's defaults, the creature in the given form
/** Options as each tab's defaults give them, with base (room, world list, figure settings...) laid over. */
export function plainOpts(base = {}) {
  const worlds = base.worlds || {};
  return (tab, pick, hub) => {
    const mod = MODULES[tab], o = { ...mod.meta.options, ...(base.tabs && base.tabs[tab]), room: base.room ?? null, ...pick };
    for (const [k, v] of Object.entries(base)) if (/^(hu|gr)[A-Z]/.test(k) || k === "liveLoops" || k === "palette" || k === "seed") o[k] = v;
    if (tab !== "transform") o.form = hub.form;
    if (tab === "portal") o.world = worlds[pick.pWorld] ?? null;
    return o;
  };
}
const DEMOS = new WeakMap();
// a life from a script: [{ at, ...request }] (render tool: --opts '{"script":[{"at":0,"id":"actions:jump"}]}')
function demoLife(o) {
  if (!Array.isArray(o.script)) return null;
  let L = DEMOS.get(o);
  if (!L) {
    L = createLife({ D: o.duration, optsFor: plainOpts({ room: o.room, worlds: o.worlds, palette: o.palette }), hub: o.hub, things: o.things });
    for (const r of o.script) want(L, r, r.at || 0);
    DEMOS.set(o, L);
  }
  return L;
}
