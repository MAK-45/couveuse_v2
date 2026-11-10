// Colour helpers shared by the effects: a colour to [hue, saturation, lightness] and back.
import { clamp, hex } from "../../pixelfx/src/core/index.js";

export function hsl(c) {
  const v = hex(c), r = (v & 255) / 255, g = ((v >> 8) & 255) / 255, b = ((v >> 16) & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
// Two colours mixed at k (0: a, 1: b), channel by channel, as "#rrggbb": exact at both ends.
export function mixHex(a, b, k) {
  const x = hex(a), y = hex(b);
  const channel = (s) => {
    const u = (x >> s) & 255, v = (y >> s) & 255;
    return Math.round(u + (v - u) * k).toString(16).padStart(2, "0");
  };
  return "#" + [0, 8, 16].map(channel).join("");
}
export function fromHsl(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + [r, g, b].map((v) => Math.round(clamp(v + m) * 255).toString(16).padStart(2, "0")).join("");
}
