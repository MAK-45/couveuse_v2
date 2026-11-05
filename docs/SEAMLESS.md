# Seamless loops and chains

The promise to the user: any GIF loops forever with no visible jump, and GIFs placed end to end chain:

    rest (Blob né) → action → rest → clock → rest …
    objects: live without X → appear X → live with X → remove X → live without X
    loops (Boucles): each one loops on itself (no chaining promise)

`npm test` checks all of it pixel for pixel (`tests/seams.mjs`).

## Why it holds

- **Time is periodic.** The idle repeats every `D = o.duration` seconds. Anything periodic multiplies the
  phase by a whole number (`Math.round`) of turns. Random-looking motion reads `noise2` along a circle:
  `ln(x, y, u, seed, r) = noise2(x + cos(2πu)·r, y + sin(2πu)·r, seed)`.
- **Long animations are whole idle loops.** Actions, clock, objects appear/remove last `loops · D`; the export
  uses `loops · round(D · fps)` frames and `t = i · T / N`. Their last frame lands on the idle's last frame.
- **Neutral ends.** Within `prog(o, t)` (0 during the lead-in, 1 after the lead-out) every modifier returns
  to exactly `NONE` at 0 and 1: envelopes via `seg`, `plateau`, `bump`, `ease.*`; rotations are `2π · integer`;
  colour shifts are 0 at the ends (rainbow returns the palette itself).
- **History-dependent bits.** Light drops falling from the blob depend on where it was when they fell. Drops
  born while an action is active are hidden (`quiet: 1`), and the lead-out is at least 1.7 s (a drop's life),
  so every drop alive on the last frame was shed by the resting blob, as on the idle's frames.
- **One-shot particles** of an action live strictly inside `(0, 1)` of its progress.
- **Encoding.** GIF frames carry a palette computed from that frame alone, so two identical frames in two
  different GIFs produce identical pixels.

## When you add something

- Counts that drive motion: `whole(v)` / `Math.round`. Never a fractional number of turns.
- Use `cycle(t, period, n, seed, life, fn)` for particles with the right `period` (`total(o)` in loops).
- Test the start, the end, and `t` vs `t + T` — add a line to `tests/seams.mjs`.
- `tw` (the blob's own clock) must equal `t` whenever the action is not active.
