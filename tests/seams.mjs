// Seam tests: every animation starts and ends exactly on its rest, in every form, so the creature lives on without a
// jump (docs/SEAMLESS.md). Pixel-exact. Run: npm test (exit code 1 on any failure; never loosen a test, fix the effect).
//
// It walks the catalogue by itself, so a new fiche needs nothing here: every fiche of src/actions/index.js and
// src/loops/index.js, and the two templates, with its defaults, all its sliders at their minimum, all at their maximum
// (its length too), and each choice of its lists, in every form it can take:
//   once   its first and last frames are its rest's
//   move   its first frame is its rest here, its last its rest where it went (drawn there), for several destinations
//   loop   frame t == frame t + T; its entry starts on its rest and ends on the loop's last frame, its exit starts on the
//          loop's first frame and ends on its rest
// Then each fiche's coherence (id, file, card, rows, defaults, forms), the other tabs (clock, objects, transformation),
// and a life per form played by the life engine (tab Vivre): every animation at home and after a move, things made and
// taken away, its form changed and back. Rest is the blob's idle loop, or in a new form the Transformation's live loop.
import { existsSync } from "node:fs";
import { createFrame, clearFrame, painterFor, composite } from "../pixelfx/src/core/index.js";
import * as idle from "../src/blob/blob.js";
import * as forms from "../src/forms/forms.js";
import * as clock from "../src/clock/clock.js";
import * as objects from "../src/objects/objects.js";
import * as life from "../src/life/life.js";
import { ACTIONS } from "../src/actions/index.js";
import { LOOPS } from "../src/loops/index.js";
import { fiche as actionTemplate } from "../src/actions/_template.js";
import { fiche as loopTemplate } from "../src/loops/_template.js";

const W = 320, H = 200, ROOM = [-160, -115, 160, 85], D = idle.meta.options.duration, Ni = 120, dt = D / Ni; // Ni frames a blob's loop
// the forms everything is tested in: each of forms.FORMS, plus the figure's own loop over 1 or 3 of the blob's (its clock
// nudged to land on it) and a pose that melts into light to change (legs crossed to sleep)
const FORM_CASES = { ...Object.fromEntries(forms.FORMS.map((f) => [f, f === "blob" ? {} : { form: f }])), "legs L1": { form: "human", huLegs: "legs", liveLoops: 1 },
  "lotus L1": { form: "human", huLegs: "lotus", liveLoops: 1 }, "hips L3": { form: "grounded", grArms: "hips", liveLoops: 3 } };
const DESTS = [null, [-130, 40], [17, -61], [300, -200]]; // where a move goes (null: its own default; the last one past the edge)
const EXTREMES = [["court, sans repos", { lead: 0, loops: 1 }], ["long, long repos", { lead: 0.3, loops: 8 }]]; // the other tabs' length rows

function render(mod, o, t, at = [0, 0]) {
  const f = createFrame(W, H); clearFrame(f);
  const p = painterFor(f); p.place(160 + at[0], 115 + at[1]);
  p.layer = "back"; mod.drawBack(p, t, o); p.layer = "front"; mod.draw(p, t, o);
  return composite(f, new Uint8ClampedArray(W * H * 4), 0xff000000);
}
const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };
const lastOf = (T) => { const N = Math.round(T / D) * Ni; return ((N - 1) * T) / N; }; // its last frame, as exported
const moved = (r, d) => [r[0] - d[0], r[1] - d[1], r[2] - d[0], r[3] - d[1]];

// results, one line per group; a check is pixel counts that must all be 0, or a condition that must hold
let fails = 0;
function group(name, fn) {
  const g = { n: 0, bad: [] };
  fn((label, ...counts) => { g.n++; if (counts.some((c) => c !== 0 && c !== true)) g.bad.push(`${label}: ${counts.join(" / ")}`); });
  fails += g.bad.length;
  console.log(`${g.bad.length ? "FAIL" : "ok  "} ${name.padEnd(30)} ${g.n} checks`);
  for (const b of g.bad) console.log(`       ${b}`);
}

// ---- rests: the first and last frames of the rest of each form case (and its last drawn where it went)
const REST = {};
for (const [name, F] of Object.entries(FORM_CASES)) {
  const mod = F.form ? forms : idle, o = F.form ? { ...forms.meta.options, ...F, room: ROOM, mode: "live" } : { ...idle.meta.options };
  const P = F.form ? forms.total(o) : D;
  REST[name] = { first: render(mod, o, 0), last: render(mod, o, lastOf(P)), there: (d) => render(mod, F.form ? { ...o, room: moved(ROOM, d) } : o, lastOf(P), d) };
}
group("blob idle loop", (check) => check("t = 0 / t = D", diff(render(idle, idle.meta.options, 0), render(idle, idle.meta.options, D))));

// ---- each fiche
const FAMILIES = { actions: ACTIONS, loops: LOOPS };
const TEMPLATES = { actions: actionTemplate, loops: loopTemplate };
// the settings to try: its defaults, every slider at its minimum, every one at its maximum (and its length), each choice
// of its lists. (A length in % of the scene is px for the effect; a point of the scene exists only on the page.)
function variants(f) {
  const loop = f.kind === "loop", min = loop ? { loops: 1, inLoops: 1, outLoops: 1 } : { loops: 1, lead: 0 }, max = loop ? { loops: 8, inLoops: 4, outLoops: 4 } : { loops: 8, lead: 0.3 };
  const out = [["défauts", {}]], lists = [];
  for (const [key, , a, b] of f.rows) {
    if (f.points[key]) continue;
    if (typeof a === "number") { const k = f.scene.includes(key) ? H / 100 : 1; min[key] = a * k; max[key] = b * k; }
    else if (a && a.select) for (const [v] of a.select) if (v !== f.defaults[key]) lists.push([`${key} ${v}`, { [key]: v }]);
  }
  return [...out, ["min", min], ["max", max], ...lists];
}
function joins(check, f, label, o, R) {
  if (f.kind === "once") {
    check(label, diff(render(f, o, 0), R.first), diff(render(f, o, lastOf(f.total(o))), R.last));
  } else if (f.kind === "move") {
    for (const to of DESTS) {
      const m = { ...o, moveTo: to }, d = f.moveOf(m);
      check(`${label} → ${to || "défaut"}`, diff(render(f, m, 0), R.first), diff(render(f, m, lastOf(f.total(m))), R.there(d)));
    }
  } else {
    const lp = { ...o, part: "loop" }, en = { ...o, part: "enter" }, ex = { ...o, part: "exit" }, T = f.total(lp), Ti = f.total(en), To = f.total(ex);
    check(`${label} boucle`, diff(render(f, lp, 0), render(f, lp, T)), diff(render(f, lp, T / 3), render(f, lp, T + T / 3)));
    check(`${label} entrée, sortie`, diff(render(f, en, 0), R.first), diff(render(f, en, lastOf(Ti)), render(f, lp, lastOf(T))),
      diff(render(f, ex, 0), render(f, lp, 0)), diff(render(f, ex, lastOf(To)), R.last));
  }
}
const fileOf = (family, f) => new URL(`../src/${family}/${f.id}.js`, import.meta.url);
function coherence(check, family, f, isTemplate) {
  const kinds = family === "loops" ? ["loop"] : ["once", "move"], text = (s) => typeof s === "string" && s.trim().length > 0;
  check("id in camelCase", /^[a-z][a-zA-Z0-9]*$/.test(f.id));
  check(isTemplate ? "not in the catalogue" : `its file src/${family}/${f.id}.js`, isTemplate ? !FAMILIES[family].some((x) => x.id === f.id) : existsSync(fileOf(family, f)));
  check("name and desc (its card)", text(f.name) && text(f.desc));
  check(`kind ${f.kind}`, kinds.includes(f.kind) && typeof f.play === "function" && (f.kind !== "move" || (typeof f.moveOf === "function" && typeof f.length === "function")));
  check("formFit: forms, reasons in French", Object.entries(f.formFit).every(([k, v]) => forms.FORMS.includes(k) && text(v)) && forms.FORMS.some((form) => f.fits({ form })));
  check("rows shown in known forms", Object.values(f.forms).every((l) => l.length && l.every((k) => forms.FORMS.includes(k))));
  for (const [key, label, a, b, step] of f.rows) {
    const v = key in f.page ? f.page[key] : f.defaults[key];
    if (typeof a === "number") check(`${key}: ${a} ≤ ${v} ≤ ${b}`, text(label) && step > 0 && a <= v && v <= b);
    else check(`${key}: ${v} in its list`, text(label) && !!a.select && a.select.some(([x]) => x === v));
  }
  check("defaults in its meta", Object.entries(f.defaults).every(([k, v]) => f.meta.options[k] === v));
}
for (const [family, list] of Object.entries(FAMILIES)) {
  group(`${family}: ids`, (check) => check("each id once", new Set(list.map((f) => f.id)).size === list.length));
  for (const [f, isTemplate] of [...list.map((f) => [f, false]), [TEMPLATES[family], true]]) {
    const tag = isTemplate ? `${f.id} (modèle)` : f.id;
    group(`${tag} : fiche`, (check) => coherence(check, family, f, isTemplate));
    for (const [name, F] of Object.entries(FORM_CASES)) {
      if (!f.fits({ form: F.form || "blob" })) continue;
      group(`${tag} ${name}`, (check) => { for (const [vn, v] of variants(f)) joins(check, f, vn, { ...f.meta.options, ...F, room: ROOM, ...v }, REST[name]); });
    }
  }
}

// ---- the clock (once): every way it shows the time and hides it again, its length and lead at their extremes, every form
for (const [name, F] of Object.entries(FORM_CASES)) {
  const cases = [...clock.APPEAR.map((ap, i) => [`${ap} / ${clock.VANISH[i]}`, { clkAppear: ap, clkVanish: clock.VANISH[i] }]), ...EXTREMES];
  group(`clock ${name}`, (check) => { for (const [label, more] of cases) {
    const o = { ...clock.meta.options, ...F, room: ROOM, ...more };
    check(label, diff(render(clock, o, 0), REST[name].first), diff(render(clock, o, lastOf(clock.total(o))), REST[name].last));
  } });
}

// ---- objects: its live scene loops and is its rest with them; appear: rest without -> rest with; remove: the reverse
for (const [name, F] of Object.entries(FORM_CASES)) {
  group(`objects ${name}`, (check) => {
    const lp = F.form ? Math.max(1, Math.round(F.liveLoops ?? forms.FORM_DEFAULTS.liveLoops)) : 1, base = { ...objects.meta.options, ...F, room: ROOM, mode: "live", loops: lp };
    const list = [...base.objects, { shape: "gem", x: 40, y: -50, size: 11, spinY: 1, spinX: 0, tilt: 0.35, float: 4, floatTurns: 1, hue: 200, glow: 1, layer: "front", ph: 0.2 }], ti = list.length - 1;
    const none = { ...base, objects: [] }, without = { ...base, objects: list.slice(0, ti) }, withIt = { ...base, objects: list }, P = objects.total(base);
    const w0 = render(objects, without, 0), wL = render(objects, without, lastOf(P)), a0 = render(objects, withIt, 0), aL = render(objects, withIt, lastOf(P));
    check("live = rest", diff(render(objects, none, 0), REST[name].first), diff(render(objects, none, lastOf(P)), REST[name].last));
    check("live loop", diff(w0, render(objects, without, P)), diff(render(objects, without, P / 3), render(objects, without, P + P / 3)));
    const appear = (label, more) => { const o = { ...withIt, mode: "appear", target: ti, loops: 2, ...more }; check(`appear ${label}`, diff(render(objects, o, 0), w0), diff(render(objects, o, lastOf(objects.total(o))), aL)); };
    const remove = (label, more) => { const o = { ...withIt, mode: "remove", target: ti, loops: 2, ...more }; check(`remove ${label}`, diff(render(objects, o, 0), a0), diff(render(objects, o, lastOf(objects.total(o))), wL)); };
    for (const st of objects.APPEAR) appear(st, { appearStyle: st });
    for (const st of objects.REMOVE) remove(st, { removeStyle: st });
    for (const [label, more] of EXTREMES) { appear(label, more); remove(label, more); }
  });
}

// ---- the transformation: rest -> transform -> the new form's live loop -> revert -> rest, every style, pose and timing
const TF_CASES = { "": [{}, 2], "legs open": [{ huLegs: "legs", huArms: "open", huHairStrands: 7 }, 2], lotus: [{ huLegs: "lotus", huArms: "down", liveLoops: 1 }, 3],
  "3 loops bald": [{ liveLoops: 3, huHair: 0, huArmTurns: 3, huTailTurns: 2, tfSpin: 2 }, 2],
  // on its legs, with gravity and a floor: the fall, the landing, the jump back, every arm pose and floor look
  ground: [{ form: "grounded" }, 2], "ground hips": [{ form: "grounded", grArms: "hips", grLook: "line", grFloor: 60, grSwayTurns: 2, liveLoops: 1 }, 3],
  "ground wave": [{ form: "grounded", grArms: "wave", grGravity: 0.4, grStance: 2.5, huHairStrands: 7, grGlints: 6 }, 1] };
for (const [name, [more, loops]] of Object.entries(TF_CASES)) {
  group(`transformation ${name}`.trim(), (check) => {
    const live = { ...forms.meta.options, ...more, room: ROOM, mode: "live" }, P = forms.total(live), l0 = render(forms, live, 0), lL = render(forms, live, lastOf(P));
    check("live loop", diff(l0, render(forms, live, P)), diff(render(forms, live, P / 3), render(forms, live, P + P / 3)));
    for (const [label, more] of [...forms.STYLES.map((st) => [st, { tfStyle: st, rvStyle: st }]), ...EXTREMES]) {
      const o = { ...live, mode: "transform", loops, ...more }, r = { ...live, mode: "revert", loops, ...more }, T = forms.total(o);
      check(label, diff(render(forms, o, 0), REST.blob.first), diff(render(forms, o, lastOf(T)), lL), diff(render(forms, r, 0), l0), diff(render(forms, r, lastOf(T)), REST.blob.last));
    }
  });
}

// ---- lives (tab Vivre): in each form case, every animation it can play there, at home and after a move, things made and
// taken away, played one after the other as the page asks them. Each segment starts on the frame of the rest it leaves
// and ends on the frame before the rest it reaches (with the things there then); a loop joins its entry and its exit.
const ob = (x, y, shape, layer = "back") => ({ shape, x, y, size: 11, spinY: 1, spinX: 0, tilt: 0.4, float: 4, floatTurns: 1, hue: 0, glow: 1, layer, ph: 0.3 });
const ANIMS = [...ACTIONS.map((f) => ["actions:" + f.id, f]), ...LOOPS.map((f) => ["loops:" + f.id, f]), ["clock", null]];
const lifeAt = (L, t) => render(life, { ...life.meta.options, life: L }, t);
// the life at rest on hub h at time `as`: no segment, the things there at that moment
const restAt = (L, h, as) => ({ ...L, segs: [], hub0: h, things: L.things.map((th) => ({ ...th, born: th.born <= as ? -Infinity : Infinity, dying: th.dying >= as ? Infinity : -Infinity })) });
for (const [name, F] of Object.entries(FORM_CASES)) {
  const { form = "blob", ...figure } = F, can = ([, f]) => !f || f.fits({ form });
  const each = ANIMS.filter((a) => can(a) && !(a[1] && a[1].kind === "move")).map(([id]) => ({ id })), moves = ANIMS.filter(([, f]) => f && f.kind === "move");
  const script = [{ id: "appear", ob: ob(-70, -30, "cube") }, ...moves.map(([id]) => ({ id, to: [-90, 20] })), { id: "form", form }, ...each,
    ...moves.filter(can).map(([id]) => ({ id, to: [80, -30] })), ...each, { id: "appear", ob: ob(60, 20, "gem", "front") }, { id: "remove", thing: 1 }, { id: "form", form: "blob" }];
  group(`life ${name}`, (check) => {
    const L = life.createLife({ D, optsFor: life.plainOpts({ room: ROOM, ...figure }) });
    for (const r of script) { const res = life.want(L, r, 0.5); check(`${r.id} accepted`, res.ok || res.why); }
    for (const s of L.segs) {
      const end = s.at + s.len, label = `${s.kind} ${s.label}`;
      if (s.kind === "loop") check(label, diff(lifeAt(L, s.at - dt), lifeAt(L, end - dt)), diff(lifeAt(L, s.at), lifeAt(L, end)));
      else check(label, s.kind === "exit" ? 0 : diff(lifeAt(L, s.at), lifeAt(restAt(L, s.hub0, s.at), s.at)), s.kind === "enter" ? 0 : diff(lifeAt(L, end - dt), lifeAt(restAt(L, s.hub1, end), end - dt)));
    }
  });
}

console.log(fails ? `\n${fails} failing` : "\nall seams exact");
process.exit(fails ? 1 : 0);
