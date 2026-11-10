// The creature's look: its palette of eight tones and its two eye colours. A look changes only while the creature acts:
// its tones glide from one look to the next, frame by frame, as a pure function of time (the life draws it so, and so
// does the action that changes it). Every page draws the look it is given; none keeps its own copy of it.
import { hsl, mixHex } from "./_color.js";

/** The look of some options (a page's, a fiche's, a hub's): { palette, eyeColor, pupilColor }. */
export const lookOf = (o) => ({ palette: o.palette, eyeColor: o.eyeColor, pupilColor: o.pupilColor });

/** Whether a value is a look: eight tones and two eye colours. */
export const isLook = (v) => !!v && Array.isArray(v.palette) && v.palette.length === 8 && typeof v.eyeColor === "string" && typeof v.pupilColor === "string";

/** The options with a look laid over them (no look: they stay as they are). */
export const withLook = (o, look) => (look ? { ...o, palette: look.palette, eyeColor: look.eyeColor, pupilColor: look.pupilColor } : o);

/** The eyes a palette gives: its two darkest tones, the pupils the darkest and the eyes the next one. */
export function eyesOf(palette) {
  const dark = palette.map((c, i) => [hsl(c)[2], i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return { pupilColor: palette[dark[0][1]], eyeColor: palette[dark[1][1]] };
}

/** The look a palette makes, its eyes included. */
export const lookFor = (palette) => ({ palette: [...palette], ...eyesOf(palette) });

/** Between two looks at k (0: a, 1: b), tone by tone. Exactly a or b at the ends. */
export function mixLook(a, b, k) {
  if (k <= 0) return a;
  if (k >= 1) return b;
  return { palette: a.palette.map((c, i) => mixHex(c, b.palette[i], k)), eyeColor: mixHex(a.eyeColor, b.eyeColor, k), pupilColor: mixHex(a.pupilColor, b.pupilColor, k) };
}

/** v eased from 0 to 1 across the window [a, b] (0 before it, 1 after it). */
export function glide(v, a = 0, b = 1) {
  const k = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return k * k * (3 - 2 * k);
}

/** A key that tells two looks apart. */
export const lookKey = (l) => [...l.palette, l.eyeColor, l.pupilColor].join();
