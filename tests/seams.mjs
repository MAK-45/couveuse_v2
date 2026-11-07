// Seam tests: the rules that make every GIF loop or chain without a visible jump. Pixel-exact.
//   blob idle            frame 0 == frame at t = D (its own loop)
//   actions / clock / electricity   first and last frames == the idle's first and last frames (chain with the idle GIF)
//   objects              appear: first == live without, last == live with; remove: the reverse
//   loops                frame at t == frame at t + T (its own loop)
//   portal               open: first == idle, last == live; live loops on itself; close: first == live, last == idle
//                        cross: first == live, last == beyond (the blob at rest in the other world); beyond loops on itself
//   worlds               a world loops on itself (its own period, whole blob loops)
//   world actions        free loops: frame at t == frame at t + T, every speed style, direction, surges and still
//   transformation       transform: first == idle, last == live; live loops on itself; revert: first == live, last == idle
//                        (both forms: levitating, and on its legs on a floor with gravity)
//   in a new form        every other tab drawn in the levitating or grounded human form: from rest now means from the
//                        new form's loop (first and last frames == "live"'s), loops loop on themselves
// Run: npm test      (exit code 1 on any failure)
import { createFrame, clearFrame, painterFor, composite } from "../pixelfx/src/core/index.js";
import * as idle from "../pixelfx/src/fx/creature/ice-blob-idle.js";
import * as actions from "../pixelfx/src/fx/creature/ice-blob-actions.js";
import * as objects from "../pixelfx/src/fx/creature/ice-scene-objects.js";
import * as loops from "../pixelfx/src/fx/creature/ice-blob-loops.js";
import * as clock from "../pixelfx/src/fx/creature/ice-blob-clock.js";
import * as elec from "../pixelfx/src/fx/creature/ice-blob-electric.js";
import * as portal from "../pixelfx/src/fx/creature/ice-blob-portal.js";
import * as worlds from "../pixelfx/src/fx/creature/ice-worlds.js";
import * as explore from "../pixelfx/src/fx/creature/ice-blob-explore.js";
import * as transform from "../pixelfx/src/fx/creature/ice-blob-transform.js";

const W = 320, H = 200, Ni = 120; // Ni: frames in one idle loop (D * fps with the defaults)
function render(mod, o, t) {
  const f = createFrame(W, H); clearFrame(f);
  const p = painterFor(f); p.place(160, 115);
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
  const o = { ...actions.meta.options, action: name }, T = o.duration * o.loops, N = Ni * o.loops;
  report(`action ${name}`, diff(render(actions, o, 0), id0), diff(render(actions, o, (N - 1) * T / N), idL));
}
// the portals' other ways home, with their own lengths
// and portals it must go round to reach (the blue one above it, opening upwards)
const behindIt = { portalAX: -60, portalAY: -70, portalBX: 110, portalBY: -40, portalBAngle: "315", portalRoom: [-160, -115, 160, 85] };
for (const [mode, loops, more] of [["fly", 3, {}], ["loop", 4, {}], ["back", 4, behindIt]]) {
  const o = { ...actions.meta.options, action: "portal", portalMode: mode, loops, ...more }, T = o.duration * o.loops, N = Ni * o.loops;
  report(`action portal ${mode}${more.portalRoom ? " round" : ""}`, diff(render(actions, o, 0), id0), diff(render(actions, o, (N - 1) * T / N), idL));
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

// electricity: rest -> electricity -> rest, every animation and the variants with other timings or sides
const elecCases = [...elec.ELEC.map((n) => [n, {}]), ["discover", { discSide: "left", discCount: 3, loops: 3, discMood: "scared" }], ["storm", { stormMood: "dodge" }],
  ["ball", { ballPos: "left" }], ["chain", { chainRounds: 3, chainCount: 6 }], ["charge", { chgCount: 3, loops: 2, elThick: 3 }], ["atom", { atomRings: 4, elFlicker: 7.3 }]];
for (const [name, more] of elecCases) {
  const o = { ...elec.meta.options, elec: name, ...more }, T = o.duration * o.loops, tag = Object.keys(more).length ? " " + Object.values(more).join(",") : "";
  const N = Ni * o.loops;
  report(`elec ${name}${tag}`.slice(0, 34), diff(render(elec, o, 0), id0), diff(render(elec, o, (N - 1) * T / N), idL));
}

// the portal: rest -> open -> live (the world's loop) -> close -> rest, each style, shapes and planes
{
  const room = [-160, -115, 160, 85];
  const cases = [[{}, ""], [{ pShape: "arch", pLayer: "front", pX: -70, pY: -30 }, " arch front"], [{ pShape: "rift", world: { wState: "moving", wDrift: 2, wDir: "upleft", wLoops: 2 } }, " rift drift"]];
  for (const [more, tag] of cases) {
    const live = { ...portal.meta.options, room, ...more, mode: "live" }, P = portal.total(live), M = Math.round(P / D) * Ni;
    const l0 = render(portal, live, 0), lL = render(portal, live, (M - 1) * P / M);
    report(`portal live self-loop${tag}`, diff(l0, render(portal, live, P)), diff(render(portal, live, P / 3), render(portal, live, P + P / 3)));
    for (const st of portal.OPEN) { const o = { ...live, mode: "open", openStyle: st, loops: 2 }, T = o.duration * 2, N = Ni * 2; report(`portal open ${st}${tag}`.slice(0, 34), diff(render(portal, o, 0), id0), diff(render(portal, o, (N - 1) * T / N), lL)); }
    for (const st of portal.CLOSE) { const o = { ...live, mode: "close", closeStyle: st, loops: 2 }, T = o.duration * 2, N = Ni * 2; report(`portal close ${st}${tag}`.slice(0, 34), diff(render(portal, o, 0), l0), diff(render(portal, o, (N - 1) * T / N), idL)); }
  }
  // going through, and the blob at rest in the other world (still or moving, portal kept or closed behind it)
  const crossCases = [[{}, 3, ""], [{ crossKeep: 1 }, 3, " keep"], [{ world: { wState: "moving", wDrift: 3, wDir: "downleft" } }, 2, " moving"],
    [{ pShape: "rift", pX: -80, pY: 20, pLayer: "front", world: { wLoops: 5 } }, 4, " rift left"]];
  for (const [more, loops, tag] of crossCases) {
    const live = { ...portal.meta.options, room, ...more, mode: "live" }, P = portal.total(live), M = Math.round(P / D) * Ni;
    const beyond = { ...live, mode: "beyond" }, b0 = render(portal, beyond, 0), bL = render(portal, beyond, (M - 1) * P / M);
    report(`portal beyond self-loop${tag}`, diff(b0, render(portal, beyond, P)), diff(render(portal, beyond, P / 3), render(portal, beyond, P + P / 3)));
    const o = { ...live, mode: "cross", loops }, T = o.duration * loops, N = Ni * loops;
    const bOpenL = render(portal, { ...live, mode: "beyondOpen" }, (M - 1) * P / M);
    report(`portal cross${tag}`, diff(render(portal, o, 0), render(portal, live, 0)), diff(render(portal, o, (N - 1) * T / N), live.crossKeep ? bOpenL : bL));
    // and home again: open the way back from "beyond", rest by it, go back through, home at rest (or with it open)
    const bOpen = { ...live, mode: "beyondOpen" }, o0 = render(portal, bOpen, 0), oL = render(portal, bOpen, (M - 1) * P / M);
    report(`portal beyondOpen loop${tag}`, diff(o0, render(portal, bOpen, P)), 0);
    for (const st of portal.OPEN) {
      const r = { ...live, mode: "reopen", openStyle: st, loops: 2 }, Tr = r.duration * 2, Nr = Ni * 2;
      report(`portal reopen ${st}${tag}`.slice(0, 34), diff(render(portal, r, 0), b0), diff(render(portal, r, (Nr - 1) * Tr / Nr), oL));
    }
    for (const keep of [0, 1]) {
      const r = { ...live, mode: "return", returnKeep: keep, loops }, Tr = r.duration * loops, Nr = Ni * loops;
      report(`portal return${keep ? " keep" : ""}${tag}`.slice(0, 34), diff(render(portal, r, 0), o0), diff(render(portal, r, (Nr - 1) * Tr / Nr), keep ? render(portal, live, (M - 1) * P / M) : idL));
    }
  }
  // a world alone (tab Mondes) loops on its own period
  for (const more of [{}, { wState: "moving", wDrift: 3, wDir: "downright", wLoops: 3, wNebMorph: 2 }]) {
    const o = { ...worlds.meta.options, room, ...more }, P = worlds.worldPeriod(o.duration, worlds.worldOf(o));
    report(`world space${Object.keys(more).length ? " drift" : ""}`, diff(render(worlds, o, 0), render(worlds, o, P)), diff(render(worlds, o, P / 7), render(worlds, o, P + P / 7)));
  }
  // planet surfaces (tab Surface planète): still, moving with wind and camera, at night travelling fast
  for (const [more, tag] of [[{}, "still"], [{ wState: "moving", wDrift: 3, wDir: "right", wLoops: 2, wCloudWind: -2, wCamX: 30, wCamY: -10, wGust: 3 }, "moving"],
    [{ wSun: "moon", wStars: 80, wState: "moving", wDrift: 5, wAllMove: 1, wDir: "downleft", wMotes: 40, wBirds: 5 }, "night fast"]]) {
    const w = { ...worlds.PLAIN, ...more }, o = { ...worlds.meta.options, room, world: w }, P = worlds.worldPeriod(o.duration, worlds.worldOf(w));
    report(`world plain ${tag}`, diff(render(worlds, o, 0), render(worlds, o, P)), diff(render(worlds, o, P / 7), render(worlds, o, P + P / 7)));
  }
  // a portal onto a plain
  { const o = { ...portal.meta.options, mode: "live", world: { ...worlds.PLAIN, wState: "moving", wDrift: 2 } }, P = portal.total(o); report("portal live plain", diff(render(portal, o, 0), render(portal, o, P)), 0); }
}

// world actions (tab Action monde): free endless loops, the world scrolling past at the blob's speed
{
  const room = [-160, -115, 160, 85];
  const cases = [...explore.STYLES.map((st) => [{ exStyle: st }, st]), [{ exStyle: "comet", exSpeed: 9, exDir: "upleft", exSurges: 3, exSurge: 0.8, loops: 3 }, "comet fast upleft"],
    [{ exStyle: "ghosts", exSpeed: 1.25, exDir: "down", exSurges: 0, exHue: 40 }, "ghosts slow down"], [{ exStyle: "flame", exSpeed: 0 }, "flame still"],
    [{ exStyle: "shock", exDrift: 0.35, exDir: "downright", world: { wNebMorph: 2, wShoot: 4 } }, "shock drift world"],
    // the other actions, with defaults and with other settings
    ...["look", "swim", "turns", "collect"].map((e) => [{ explore: e }, ""]),
    [{ explore: "look", lkPanTurns: 3, lkSpots: 7, lkPan: 120, loops: 3 }, "busy"], [{ explore: "swim", swStrokes: 7, swKick: 0.6, exDir: "up", swBubbles: 3 }, "up"],
    [{ explore: "swim", exSpeed: 0 }, "still"], [{ explore: "turns", trTurns: 5, trFollow: 1, exDir: "downleft", exSpeed: 7 }, "downleft"],
    [{ explore: "turns", trFollow: 0, exSpeed: 0.5 }, "slow"], [{ explore: "collect", clCount: 9, clSpread: 90, exDir: "left", loops: 3 }, "many left"],
    // across a plain
    ...["move", "look", "swim", "turns", "collect"].map((e) => [{ explore: e, world: { wType: "plain" } }, "plain"]), [{ exStyle: "flame", exSpeed: 6, exDir: "upright", exSurges: 2, loops: 3, world: { wType: "plain" } }, "plain fast"]];
  for (const [more, tag] of cases) {
    const o = { ...explore.meta.options, room, ...more }, T = o.duration * o.loops;
    report(`explore ${o.explore} ${tag}`.slice(0, 34), diff(render(explore, o, 0), render(explore, o, T)), diff(render(explore, o, T / 3 - 1 / 30), render(explore, o, T + T / 3 - 1 / 30)));
  }
}

// walking and running (the human form on its legs, tab Action monde): free loops, the ground going by at the speed of its
// steps; on a planet's surface (no floor of ice: the meadow under its feet, whichever it is) or in space (its floor of ice,
// glints and prints going by); both ways, slow and fast, long strides, every setting pushed; looking round on a plain
{
  const room = [-160, -115, 160, 85], G = { form: "grounded", room };
  const cases = [[{ explore: "walk" }, "walk space"], [{ explore: "run" }, "run space"], [{ explore: "walk", world: { wType: "plain" } }, "walk plain"],
    [{ explore: "run", world: { wType: "plain" }, gaDir: "left", loops: 3 }, "run plain left"],
    [{ explore: "walk", world: { wType: "plain", wHorizon: 70, wCamY: 20 }, gaWalk: 2.5, gaStride: 1.35, gaDir: "left", loops: 4 }, "walk plain slow"],
    [{ explore: "walk", world: { wType: "plain", wHorizon: 75 }, gaWalk: 7, gaArms: 2, gaLean: 3, gaHair: 2.5, gaPrints: 2, loops: 1 }, "walk mid meadow"],
    [{ explore: "run", gaRun: 24, gaBounce: 2, gaHeel: 2, gaKnee: 2.5, gaArms: 2, gaLean: 2, gaPrints: 2, gaSparks: 2.5, gaStride: 0.75 }, "sprint"],
    [{ explore: "run", world: { wType: "plain", wSun: "moon", wStars: 80 }, gaRun: 7, gaBounce: 0, gaHeel: 0, gaKnee: 0, gaArms: 0, gaLean: 0, gaPrints: 0, gaSparks: 0, huHairStrands: 0 }, "jog all off"],
    [{ explore: "look", world: { wType: "plain" } }, "look plain"], [{ explore: "walk", world: { wType: "plain" }, exFront: 0 }, "walk plain all behind"]];
  for (const [more, tag] of cases) {
    const o = { ...explore.meta.options, ...G, ...more }, T = o.duration * o.loops;
    report(`gait ${tag}`, diff(render(explore, o, 0), render(explore, o, T)), diff(render(explore, o, T / 3 - 1 / 30), render(explore, o, T + T / 3 - 1 / 30)));
  }
  // on the spot in the Boucles tab (its floor of ice going by under its feet), both ways, other speeds
  for (const [more, tag] of [[{ loop: "walk" }, "loop walk"], [{ loop: "run", gaDir: "left", loops: 3 }, "loop run left"], [{ loop: "run", gaRun: 24, gaStride: 0.75, gaSparks: 2.5 }, "loop sprint"], [{ loop: "walk", gaWalk: 2, gaStride: 1.4, loops: 1 }, "loop walk slow"]]) {
    const o = { ...loops.meta.options, ...G, ...more }, T = o.duration * o.loops;
    report(`gait ${tag}`, diff(render(loops, o, 0), render(loops, o, T)), diff(render(loops, o, T / 3 - 1 / 30), render(loops, o, T + T / 3 - 1 / 30)));
  }
  // through a portal onto a planet's surface: there it stands on the ground (no floor of ice), and the crossing chains
  const pl = { ...portal.meta.options, ...G, world: { ...worlds.PLAIN }, mode: "live" }, Pp = portal.total(pl), Mp = Math.round(Pp / D) * Ni;
  const by = { ...pl, mode: "beyond" }, cr = { ...pl, mode: "cross", loops: 3 }, T3 = D * 3, N3 = Ni * 3;
  report("portal cross ground plain", diff(render(portal, cr, 0), render(portal, pl, 0)), diff(render(portal, cr, (N3 - 1) * T3 / N3), render(portal, by, (Mp - 1) * Pp / Mp)));
  report("portal beyond ground plain", diff(render(portal, by, 0), render(portal, by, Pp)), 0);
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
// With other loop lengths too, so the figure's own clock has to be nudged to land on its loop (figClock)
{
  const room = [-160, -115, 160, 85];
  const formCases = [[{ form: "human" }, " human"], [{ form: "grounded" }, " ground"], [{ form: "human", huLegs: "lotus", liveLoops: 1 }, " lotus L1"], [{ form: "grounded", grArms: "hips", liveLoops: 3 }, " ground L3"]];
  for (const [F, tag] of formCases) {
    const live = { ...transform.meta.options, ...F, room, mode: "live" }, P = transform.total(live), M = Math.round(P / D) * Ni;
    const r0 = render(transform, live, 0), rL = render(transform, live, (M - 1) * P / M);
    const chain = (name, mod, o) => { const T = o.duration * o.loops, N = Ni * o.loops; report(`${name}${tag}`.slice(0, 34), diff(render(mod, o, 0), r0), diff(render(mod, o, (N - 1) * T / N), rL)); };
    const selfLoop = (name, mod, o, T) => report(`${name}${tag}`.slice(0, 34), diff(render(mod, o, 0), render(mod, o, T)), diff(render(mod, o, T / 3 - 1 / 30), render(mod, o, T + T / 3 - 1 / 30)));
    const lp = F.liveLoops ? 3 : 2;
    for (const name of actions.ACTIONS) if (actions.fitsForm({ ...F }, name)) chain(`action ${name}`, actions, { ...actions.meta.options, ...F, room, action: name, loops: name === "portal" || name === "walk" ? 4 : lp });
    chain("clock", clock, { ...clock.meta.options, ...F, room, loops: 3 });
    for (const name of elec.ELEC) chain(`elec ${name}`, elec, { ...elec.meta.options, ...F, room, elec: name, loops: lp + 1 });
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
    // the portal: rest -> open -> live -> close -> rest, and through it to the other world and back
    {
      const pl = { ...portal.meta.options, ...F, room, mode: "live" }, Pp = portal.total(pl), Mp = Math.round(Pp / D) * Ni, p0 = render(portal, pl, 0), pL = render(portal, pl, (Mp - 1) * Pp / Mp);
      report(`portal live self-loop${tag}`.slice(0, 34), diff(p0, render(portal, pl, Pp)), diff(render(portal, pl, Pp / 3), render(portal, pl, Pp + Pp / 3)));
      const T = D * 2, N = Ni * 2, op = { ...pl, mode: "open", loops: 2 }, cl = { ...pl, mode: "close", loops: 2 };
      report(`portal open${tag}`.slice(0, 34), diff(render(portal, op, 0), r0), diff(render(portal, op, (N - 1) * T / N), pL));
      report(`portal close${tag}`.slice(0, 34), diff(render(portal, cl, 0), p0), diff(render(portal, cl, (N - 1) * T / N), rL));
      const by = { ...pl, mode: "beyond" }, b0 = render(portal, by, 0), bL = render(portal, by, (Mp - 1) * Pp / Mp), cr = { ...pl, mode: "cross", loops: 3 }, T3 = D * 3, N3 = Ni * 3;
      report(`portal cross${tag}`.slice(0, 34), diff(render(portal, cr, 0), p0), diff(render(portal, cr, (N3 - 1) * T3 / N3), bL));
      report(`portal beyond self-loop${tag}`.slice(0, 34), diff(b0, render(portal, by, Pp)), 0);
      const bo = { ...pl, mode: "beyondOpen" }, o0 = render(portal, bo, 0), re = { ...pl, mode: "reopen", loops: 2 }, rt = { ...pl, mode: "return", loops: 3 };
      report(`portal reopen${tag}`.slice(0, 34), diff(render(portal, re, 0), b0), diff(render(portal, re, (N - 1) * T / N), render(portal, bo, (Mp - 1) * Pp / Mp)));
      report(`portal return${tag}`.slice(0, 34), diff(render(portal, rt, 0), o0), diff(render(portal, rt, (N3 - 1) * T3 / N3), rL));
    }
    // world actions: free loops
    for (const name of explore.EXPLORE) if (explore.fitsForm({ ...F }, name)) for (const more of name === "move" ? [{ exStyle: "comet" }, { exStyle: "ghosts" }] : [{}]) {
      const o = { ...explore.meta.options, ...F, room, explore: name, ...more, loops: lp }, T = o.duration * o.loops;
      selfLoop(`explore ${name}${more.exStyle ? " " + more.exStyle : ""}`, explore, o, T);
    }
  }
}

console.log(fails ? `\n${fails} failing` : "\nall seams exact");
process.exit(fails ? 1 : 0);
