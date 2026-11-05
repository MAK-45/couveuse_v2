// Seam tests: the rules that make every GIF loop or chain without a visible jump. Pixel-exact.
//   blob idle            frame 0 == frame at t = D (its own loop)
//   actions / clock      first and last frames == the idle's first and last frames (chain with the idle GIF)
//   objects              appear: first == live without, last == live with; remove: the reverse
//   loops                frame at t == frame at t + T (its own loop)
// Run: npm test      (exit code 1 on any failure)
import { createFrame, clearFrame, painterFor, composite } from "../pixelfx/src/core/index.js";
import * as idle from "../pixelfx/src/fx/creature/ice-blob-idle.js";
import * as actions from "../pixelfx/src/fx/creature/ice-blob-actions.js";
import * as objects from "../pixelfx/src/fx/creature/ice-scene-objects.js";
import * as loops from "../pixelfx/src/fx/creature/ice-blob-loops.js";
import * as clock from "../pixelfx/src/fx/creature/ice-blob-clock.js";

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

console.log(fails ? `\n${fails} failing` : "\nall seams exact");
process.exit(fails ? 1 : 0);
