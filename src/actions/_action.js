// The host of the actions: what every action fiche gets without writing it. Its length (whole loops of the blob, or what a
// move's way takes), its time (prog: a lead-in, and a lead-out never shorter than a drop of light lives, so its first and
// last frames are the rest's), the rest when its form can't do it, its body drawn in every form (shared/_creature.js).
import { meta as idleMeta } from "../blob/blob.js";
import { prog as progAt } from "../shared/_time.js";
import { creature } from "../shared/_creature.js";
import { options, merged } from "../shared/_fiche.js";

const REST = { mods: () => ({}) };
const BASE = { form: "blob", loops: 2, lead: 0.08 };
const META = { tags: ["creature", "blob", "action", "ice", "light", "loop"], size: [320, 180], origin: [160, 100], duration: 8, loop: true, fps: 30, bg: "black" };
const whole = (o) => Math.max(1, Math.round(o.loops));

/**
 * An action fiche. def: { id, name, desc (its card in Vivre), kind: "once" (default) or "move" (it ends at rest somewhere
 * else: moveOf(o) says where, length(o) how many loops its way takes), loops (its default length), options (see
 * shared/_fiche.js), formFit ({ form: "pourquoi pas, en français" }), intro? (its settings page's introduction),
 * play(o, { T, prog }) → { mods(t), back?(p, C, t, st), front?(p, C, t, st) } }: its modifiers at t (neutral when
 * prog(t) is 0 or 1) and what it draws behind and in front of the creature (st: where its body is, its hands, head...).
 * The fiche is also a pixelfx effect playing only this action (meta, drawBack, draw: npm run render -- actions/<id>).
 */
export function action(def) {
  const f = { kind: "once", loops: 2, formFit: {}, ...def, ...options(def.options, { ...idleMeta.options, ...BASE, action: 0 }) };
  f.fits = (o) => !f.formFit[o.form];
  f.total = (o) => o.duration * (f.length && f.fits(o) ? f.length(o) : whole(o));
  f.act = (o) => {
    if (!f.fits(o)) return REST;
    const T = f.total(o);
    return f.play(o, { T, prog: (t) => progAt(o, t, T) });
  };
  const own = { ...idleMeta.options, ...BASE, action: f.id, loops: f.loops, ...f.defaults };
  return Object.assign(f, { meta: { ...META, name: f.name, desc: f.desc, options: own } }, creature(frame(() => f)));
}

/** The actions tab's effect over a catalogue: it plays the action o.action names (an unknown one just rests). */
export function family(list) {
  const byId = new Map(list.map((f) => [f.id, f])), ficheOf = (o) => byId.get(o.action);
  const options = { ...idleMeta.options, ...BASE, action: list[0].id, ...merged(list) };
  return {
    meta: { ...META, name: "Ice blob actions", desc: "The born ice blob performs one of its actions and ends exactly how it began (or at rest elsewhere).", options },
    total: (o) => (ficheOf(o) ? ficheOf(o).total(o) : o.duration * whole(o)),
    moveOf: (o) => ficheOf(o).moveOf(o),
    ...creature(frame(ficheOf)),
  };
}

// what the creature adapter needs at t: the action's modifiers and length, where the motes follow it, what it draws
const frame = (ficheOf) => (o, t) => {
  const f = ficheOf(o), act = f ? f.act(o) : REST;
  return { M: (tt) => act.mods(tt), T: f ? f.total(o) : o.duration * whole(o), drift: drift(act, t),
    extra: (p, C, st, front) => { const h = front ? act.front : act.back; if (h) h.call(act, p, C, t, st); } };
};
// the motes round it follow where it goes (ax, ay: it went somewhere else, all of it)
function drift(act, t) {
  const m = act.mods(t);
  return [(m.dx || 0) + (m.ax || 0), Math.min(0, m.dy || 0) * 0.5 + Math.max(0, m.dy || 0) + (m.ay || 0)];
}
