// The creature drawn by an animation, the same way in every tab: its body in its form (forms.js) moved by the animation's
// modifiers, the motes round it, then what the animation draws itself (back layer, then front layer).
import { fit } from "../../pixelfx/src/core/index.js";
import { bodyBack, bodyFront, bodyAmbient } from "../forms/forms.js";
import { withLook } from "./_look.js";

/**
 * frame(o, t) → { M: modifiers at a time, T: the animation's length, drift?: where the motes follow it,
 * look?: the look the creature has at that time, when the animation changes it (it glides there), extra?(p, C, st,
 * front): what the animation draws over its body }. Returns the effect's drawBack and draw.
 */
export function creature(frame) {
  const layer = (front) => (p, t, o) => {
    const f = frame(o, t), oo = withLook(o, f.look), C = fit(oo.palette, 8);
    const st = front ? bodyFront(p, t, oo, f.M, C, f.T) : bodyBack(p, t, oo, f.M, C, f.T);
    bodyAmbient(p, t, oo, front, C, f.drift);
    if (f.extra) f.extra(p, C, st, front);
    return st;
  };
  return { drawBack: layer(false), draw: layer(true) };
}
