// Seam tests: the rules that make every GIF loop or chain without a visible jump. Pixel-exact.
//   blob idle            frame 0 == frame at t = D (its own loop)
//   actions / clock      first and last frames == the idle's first and last frames (chain with the idle GIF)
//   the move             first frame == the rest where it was, last == the rest where it went (drawn there), every form
//   objects              appear: first == live without, last == live with; remove: the reverse
//   loops                frame at t == frame at t + T (its own loop); in three parts: entry from rest -> loop -> exit to rest
//                        (walking and running too: their first steps from rest, their last steps back to it)
//   transformation       transform: first == idle, last == live; live loops on itself; revert: first == live, last == idle
//                        (both forms: levitating, and on its legs on a floor with gravity)
//   in a new form        every other tab drawn in the levitating or grounded human form: from rest now means from the
//                        new form's loop (first and last frames == "live"'s), loops loop on themselves
//   life (tab Vivre)     whole lives played by the life engine: every segment's first frame == the rest it leaves, its
//                        last == the rest it reaches (forms, things made and taken away, moves to other places of the
//                        scene, walking and running)
// Run: npm test      (exit code 1 on any failure)
import { createFrame, clearFrame, painterFor, composite } from "../pixelfx/src/core/index.js";
import * as idle from "../src/creature/ice-blob-idle.js";
import * as actions from "../src/creature/ice-blob-actions.js";
import * as objects from "../src/creature/ice-scene-objects.js";
import * as loops from "../src/creature/ice-blob-loops.js";
import * as clock from "../src/creature/ice-blob-clock.js";
import * as transform from "../src/creature/ice-blob-transform.js";
import * as life from "../src/creature/ice-life.js";

const W = 320, H = 200, Ni = 120; // Ni: frames in one idle loop (D * fps with the defaults)
function render(mod, o, t, at = [0, 0]) {
  const f = createFrame(W, H); clearFrame(f);
  const p = painterFor(f); p.place(160 + at[0], 115 + at[1]);
  p.layer = "back"; mod.drawBack(p, t, o); p.layer = "front"; mod.draw(p, t, o);
  return composite(f, new Uint8ClampedArray(W * H * 4), 0xff000000);
}
const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };
let fails = 0;
const report = (name, ...counts) => { const ok = counts.every((c) => c === 0); if (!ok) fails++; console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(34)} ${counts.join(" / ")}`); };

const base = { ...idle.meta.options }, D = base.duration;
report("idle self-loop", diff(render(idle, base, 0), render(idle, base, D)));
const id0 = render(idle, base, 0), idL = render(idle, base, D - D / Ni);

for (const name of actions.ACTIONS) {
  if (name === "move") continue; // (it ends somewhere else: see below)
  const o = { ...actions.meta.options, action: name }, T = o.duration * o.loops, N = Ni * o.loops;
  report(`action ${name}`, diff(render(actions, o, 0), id0), diff(render(actions, o, (N - 1) * T / N), idL));
}
// the move: from its rest here to its rest there (drawn dx, dy farther, the scene seen from there), in every form, every way
{
  const room = [-160, -115, 160, 85], moved = (r, d) => [r[0] - d[0], r[1] - d[1], r[2] - d[0], r[3] - d[1]];
  for (const [F, tag] of [[{}, ""], [{ form: "human" }, " human"], [{ form: "grounded" }, " ground"], [{ form: "grounded", grArms: "hips", liveLoops: 3 }, " ground L3"], [{ form: "human", huLegs: "lotus", liveLoops: 1 }, " lotus L1"]]) {
    for (const [mv, how] of [[{}, ""], [{ moveX: -130, moveY: 40, moveArc: 1.2 }, " left"], [{ moveX: 17, moveY: -61, moveHops: 3 }, " hops"], [{ moveX: 63, moveGait: "run" }, " run"], [{ moveX: 300, moveY: -200 }, " edge"]]) {
      const o = { ...actions.meta.options, ...F, room, action: "move", loops: 1, ...mv }, T = actions.total(o), N = Math.round(T / D) * Ni, d = actions.moveOf(o);
      const rest = F.form ? { ...transform.meta.options, ...F, room, mode: "live" } : { ...idle.meta.options }, mod = F.form ? transform : idle;
      const P = F.form ? transform.total(rest) : D, M = Math.round(P / D) * Ni, there = F.form ? { ...rest, room: moved(room, d) } : rest;
      report(`action move${tag}${how}`, diff(render(actions, o, 0), render(mod, rest, 0)), diff(render(actions, o, (N - 1) * T / N), render(mod, there, (M - 1) * P / M, d)));
    }
  }
}

for (const [ap, vn] of clock.APPEAR.map((a, i) => [a, clock.VANISH[i]])) {
  const o = { ...clock.meta.options, clkAppear: ap, clkVanish: vn }, T = o.duration * o.loops, N = Ni * o.loops;
  report(`clock ${ap} / ${vn}`, diff(render(clock, o, 0), id0), diff(render(clock, o, (N - 1) * T / N), idL));
}

{
  const ob = objects.meta.options, list = [...ob.objects, { shape: "pyramid", x: 10, y: -55, size: 13, spinY: 1, spinX: 0, tilt: 0.35, float: 4, floatTurns: 1, hue: 140, glow: 1, layer: "back", ph: 0.33 }];
  const ti = list.length - 1, without = { ...ob, objects: list.slice(0, ti), mode: "live", loops: 1 }, withIt = { ...ob, objects: list, mode: "live", loops: 1 };
  const w0 = render(objects, without, 0), wL = render(objects, without, D - D / Ni), a0 = render(objects, withIt, 0), aL = render(objects, withIt, D - D / Ni);
  report("objects live self-loop", diff(w0, render(objects, without, D)));
  for (const st of objects.APPEAR) { const o = { ...ob, objects: list, mode: "appear", target: ti, loops: 2, appearStyle: st }, T = o.duration * 2, N = Ni * 2; report(`objects appear ${st}`, diff(render(objects, o, 0), w0), diff(render(objects, o, (N - 1) * T / N), aL)); }
  for (const st of objects.REMOVE) { const o = { ...ob, objects: list, mode: "remove", target: ti, loops: 2, removeStyle: st }, T = o.duration * 2, N = Ni * 2; report(`objects remove ${st}`, diff(render(objects, o, 0), a0), diff(render(objects, o, (N - 1) * T / N), wL)); }
}

for (const name of loops.LOOPS) {
  const o = { ...loops.meta.options, loop: name }, T = o.duration * o.loops;
  report(`loop ${name}`, diff(render(loops, o, 0), render(loops, o, T)), diff(render(loops, o, -1 / 30), render(loops, o, T - 1 / 30)));
}

// loops in three parts, in every form: rest -> entry -> the loop -> exit -> rest. The entry starts on the rest's first
// frame and its last frame is the loop's last (so the loop's first comes next as if it had looped); the exit starts on the
// loop's first frame and ends on the rest's last. In a new form "rest" is its live loop (a pose change melts through light)
{
  const room = [-160, -115, 160, 85], dt = D / Ni;
  for (const [F, tag] of [[{}, ""], [{ form: "human" }, " human"], [{ form: "grounded" }, " ground"], [{ form: "human", huLegs: "legs", liveLoops: 1 }, " legs L1"],
    [{ form: "grounded", grArms: "hips", liveLoops: 3 }, " ground L3"]]) {
    const live = { ...transform.meta.options, ...F, room, mode: "live" }, P = transform.total(live);
    const r0 = F.form ? render(transform, live, 0) : id0, rL = F.form ? render(transform, live, P - dt) : idL;
    for (const name of loops.LOOPS) {
      if (!loops.fitsForm({ ...F }, name)) continue;
      const base = { ...loops.meta.options, ...F, room, loop: name, loops: F.liveLoops === 3 ? 3 : 2, ...(name === "sleep" ? { inLoops: 2, outLoops: 2 } : {}) };
      const lp = { ...base, part: "loop" }, en = { ...base, part: "enter" }, ex = { ...base, part: "exit" };
      const TL = loops.total(lp), Ti = loops.total(en), To = loops.total(ex);
      report(`parts ${name}${tag}`, diff(render(loops, en, 0), r0), diff(render(loops, en, Ti - dt), render(loops, lp, TL - dt)),
        diff(render(loops, ex, 0), render(loops, lp, 0)), diff(render(loops, ex, To - dt), rL));
    }
  }
}

// walking and running on the spot (the human form on its legs, tab Boucles): its floor of ice going by under its feet at
// the speed of its steps, both ways, other speeds
{
  const G = { form: "grounded", room: [-160, -115, 160, 85] };
  for (const [more, tag] of [[{ loop: "walk" }, "loop walk"], [{ loop: "run", gaDir: "left", loops: 3 }, "loop run left"], [{ loop: "run", gaRun: 24, gaStride: 0.75, gaSparks: 2.5 }, "loop sprint"], [{ loop: "walk", gaWalk: 2, gaStride: 1.4, loops: 1 }, "loop walk slow"]]) {
    const o = { ...loops.meta.options, ...G, ...more }, T = o.duration * o.loops;
    report(`gait ${tag}`, diff(render(loops, o, 0), render(loops, o, T)), diff(render(loops, o, T / 3 - 1 / 30), render(loops, o, T + T / 3 - 1 / 30)));
  }
}

// the transformation: rest -> transform -> the new form's loop -> revert -> rest, every style, pose and timing
{
  const cases = [[{}, 2, ""], [{ huLegs: "legs", huArms: "open", huHairStrands: 7 }, 2, " legs open"], [{ huLegs: "lotus", huArms: "down", liveLoops: 1 }, 3, " lotus"],
    [{ liveLoops: 3, huHair: 0, huArmTurns: 3, huTailTurns: 2, tfSpin: 2 }, 2, " 3 loops bald"],
    // on its legs, with gravity and a floor: the fall, the landing, the jump back, every arm pose and floor look
    [{ form: "grounded", room: [-160, -115, 160, 85] }, 2, " ground"],
    [{ form: "grounded", room: [-160, -115, 160, 85], grArms: "hips", grLook: "line", grFloor: 60, grSwayTurns: 2, liveLoops: 1 }, 3, " ground hips"],
    [{ form: "grounded", room: [-160, -115, 160, 85], grArms: "wave", grGravity: 0.4, grStance: 2.5, huHairStrands: 7, grGlints: 6 }, 1, " ground wave"]];
  for (const [more, loops, tag] of cases) {
    const live = { ...transform.meta.options, ...more, mode: "live" }, P = transform.total(live), M = Math.round(P / D) * Ni;
    const l0 = render(transform, live, 0), lL = render(transform, live, (M - 1) * P / M);
    report(`transform live self-loop${tag}`, diff(l0, render(transform, live, P)), diff(render(transform, live, P / 3), render(transform, live, P + P / 3)));
    for (const st of transform.STYLES) {
      const o = { ...live, mode: "transform", tfStyle: st, loops }, r = { ...live, mode: "revert", rvStyle: st, loops }, T = o.duration * loops, N = Ni * loops;
      report(`transform ${st}${tag}`.slice(0, 34), diff(render(transform, o, 0), id0), diff(render(transform, o, (N - 1) * T / N), lL));
      report(`revert ${st}${tag}`.slice(0, 34), diff(render(transform, r, 0), l0), diff(render(transform, r, (N - 1) * T / N), idL));
    }
  }
}

// the other tabs in the transformation's new forms (levitating, and on its legs on its floor): "rest" is now the new
// form's loop, so every animation from rest starts on its first frame and ends on its last; loops loop on themselves.
// With other loop lengths too, so the figure's own clock has to be nudged to land on its loop
{
  const room = [-160, -115, 160, 85];
  const formCases = [[{ form: "human" }, " human"], [{ form: "grounded" }, " ground"], [{ form: "human", huLegs: "lotus", liveLoops: 1 }, " lotus L1"], [{ form: "grounded", grArms: "hips", liveLoops: 3 }, " ground L3"]];
  for (const [F, tag] of formCases) {
    const live = { ...transform.meta.options, ...F, room, mode: "live" }, P = transform.total(live), M = Math.round(P / D) * Ni;
    const r0 = render(transform, live, 0), rL = render(transform, live, (M - 1) * P / M);
    const chain = (name, mod, o) => { const T = o.duration * o.loops, N = Ni * o.loops; report(`${name}${tag}`.slice(0, 34), diff(render(mod, o, 0), r0), diff(render(mod, o, (N - 1) * T / N), rL)); };
    const selfLoop = (name, mod, o, T) => report(`${name}${tag}`.slice(0, 34), diff(render(mod, o, 0), render(mod, o, T)), diff(render(mod, o, T / 3 - 1 / 30), render(mod, o, T + T / 3 - 1 / 30)));
    const lp = F.liveLoops ? 3 : 2;
    for (const name of actions.ACTIONS) if (name !== "move" && actions.fitsForm({ ...F }, name)) chain(`action ${name}`, actions, { ...actions.meta.options, ...F, room, action: name, loops: lp });
    chain("clock", clock, { ...clock.meta.options, ...F, room, loops: 3 });
    for (const name of loops.LOOPS) if (loops.fitsForm({ ...F }, name)) { const o = { ...loops.meta.options, ...F, room, loop: name, loops: lp }; selfLoop(`loop ${name}`, loops, o, o.duration * o.loops); }
    // objects: rest without -> appear -> rest with it -> remove -> rest without
    {
      const ob = objects.meta.options, list = [...ob.objects, { shape: "gem", x: 40, y: -50, size: 11, spinY: 1, spinX: 0, tilt: 0.35, float: 4, floatTurns: 1, hue: 200, glow: 1, layer: "front", ph: 0.2 }], ti = list.length - 1;
      const without = { ...ob, ...F, room, objects: list.slice(0, ti), mode: "live", loops: 1 }, withIt = { ...without, objects: list };
      const w0 = render(objects, without, 0), wL = render(objects, without, D - D / Ni), a0 = render(objects, withIt, 0), aL = render(objects, withIt, D - D / Ni);
      report(`objects live self-loop${tag}`.slice(0, 34), diff(w0, render(objects, without, D)), diff(render(objects, without, D / 3), render(objects, without, D + D / 3)));
      report(`objects live = rest${tag}`.slice(0, 34), diff(render(objects, { ...without, objects: [] }, 0), r0), 0);
      const ap = { ...withIt, mode: "appear", target: ti, loops: 2, appearStyle: "laser" }, rm = { ...withIt, mode: "remove", target: ti, loops: 2, removeStyle: "dissolve" }, T = D * 2, N = Ni * 2;
      report(`objects appear${tag}`.slice(0, 34), diff(render(objects, ap, 0), w0), diff(render(objects, ap, (N - 1) * T / N), aL));
      report(`objects remove${tag}`.slice(0, 34), diff(render(objects, rm, 0), a0), diff(render(objects, rm, (N - 1) * T / N), wL));
    }
  }
}

// the life engine (tab Vivre): lives asked for one request after another, as the page does. Each segment starts on a
// beat of the rest it leaves and must start on that rest's frame, and end on the frame before the next rest's first
// (that rest drawn with the things there at that moment); loops' own joins are checked above
{
  const room = [-160, -115, 160, 85], dt = D / Ni, lifeOf = (L, t) => render(life, { ...life.meta.options, life: L }, t);
  const restOf = (L, h, as) => ({ ...L, segs: [], hub0: h, things: L.things.map((th) => ({ ...th, born: th.born <= as ? -Infinity : Infinity, dying: th.dying >= as ? Infinity : -Infinity })) });
  const ob = (x, y, shape, layer = "back") => ({ shape, x, y, size: 11, spinY: 1, spinX: 0, tilt: 0.4, float: 4, floatTurns: 1, hue: 0, glow: 1, layer, ph: 0.3 });
  const scripts = {
    blob: [{ id: "actions:aura" }, { id: "loops:magic", reps: 1 }, { id: "appear", ob: ob(-70, -30, "cube") }, { id: "loops:sleep", reps: 1 },
      { id: "appear", ob: ob(60, 20, "gem", "front") }, { id: "actions:aura" }, { id: "remove", thing: 1 }, { id: "clock" }],
    forms: [{ id: "form", form: "human" }, { id: "loops:magic", reps: 1 }, { id: "appear", ob: ob(70, -40, "crystal") }, { id: "form", form: "grounded" },
      { id: "loops:sleep", reps: 1 }, { id: "actions:aura" }, { id: "clock" }, { id: "form", form: "blob" }],
    // it goes about the scene and does things there, in every form: things it makes stay where they were made; on its legs
    // it walks there, then walks and runs on the spot
    moves: [{ id: "actions:move", to: [90, -30] }, { id: "actions:aura" }, { id: "appear", ob: ob(-60, -20, "cube") }, { id: "loops:magic", reps: 1 },
      { id: "actions:move", to: [-100, 20] }, { id: "clock" }, { id: "remove", thing: 1 }, { id: "form", form: "human" }, { id: "actions:move", to: [30, -40] },
      { id: "loops:sleep", reps: 1 }, { id: "form", form: "grounded" }, { id: "actions:move", to: [-80, 0] }, { id: "loops:walk", reps: 1 }, { id: "actions:move", to: [60, 0] },
      { id: "loops:run", reps: 1 }, { id: "form", form: "blob" }],
  };
  for (const [name, script] of Object.entries(scripts)) {
    const L = life.createLife({ D, optsFor: life.plainOpts({ room }) });
    for (const r of script) { const res = life.want(L, r, 0.5); if (!res.ok) { fails++; console.log(`FAIL life ${name} refused ${r.id}: ${res.why}`); } }
    for (const sg of L.segs) {
      const end = sg.at + sg.len;
      report(`life ${name} ${sg.kind} ${sg.label}`.slice(0, 34), sg.kind === "loop" || sg.kind === "exit" ? 0 : diff(lifeOf(L, sg.at), lifeOf(restOf(L, sg.hub0, sg.at), sg.at)),
        sg.kind === "loop" || sg.kind === "enter" ? 0 : diff(lifeOf(L, end - dt), lifeOf(restOf(L, sg.hub1, end), end - dt)));
    }
  }
}

console.log(fails ? `\n${fails} failing` : "\nall seams exact");
process.exit(fails ? 1 : 0);
