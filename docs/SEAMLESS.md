# Seamless loops and chains

The promise to the user: any GIF loops forever with no visible jump, and GIFs placed end to end chain:

    rest (Blob né) → action → rest → clock → rest → electricity → rest …
    objects: live without X → appear X → live with X → remove X → live without X
    portal: rest → open → live (as often as you like) → close → rest
            or … → live → cross → beyond (the blob at rest in the other world, as often as you like)
            → reopen → beyondOpen (as often as you like) → return → rest (or live, if the portal stays open)
    transformation: rest → transform → live (the new form, as often as you like) → revert → rest
    loops (Boucles) and worlds (Mondes): each one loops on itself (no chaining promise)

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
- **Worlds.** A world's period is `wLoops` idle loops. Its layers move by whole tiles a loop (offsets rounded to
  whole pixels), twinkles and the nebula's warp turn whole turns, shooting stars use `cycle` on that period. The
  portal's `live` and `beyond` last that period; in `open` the world's clock is `t − T`, so it is at 0 on the frame after
  the last; in `cross`, `reopen` and `return` it is `t − shift · E(seg(t/T, 0.1, 0.9))`, the shift being `T mod P` (or that minus P), so it
  starts at 0 and ends on 0 exactly. A still world (`wState: "still"`) does not scroll at all. A planet surface also wraps on the tile: every
  hash and dither reads the layer's x wrapped on T, its clouds' wind is a whole number of tiles a loop, its gusts and
  ripples whole turns, its birds `cycle` on the period.
- **Transformation.** The change is a function of c (0 the blob, 1 the new form), `chore()`: every part of it is
  exactly neutral at both ends, and at c = 0 the idle's own code draws the blob. The new form's motion is periodic over
  `liveLoops · D` (its own clock h); in `transform` h = t − T, so the last frame is the live loop's last frame, and in
  `revert` h = t. Its drops of light only show if they fell from the whole, resting form (lead-out ≥ 1.7 s again). The grounded
  form's gravity (floor, fall, landing) is a function of c too, all of it done before c = 1; its landing burst is timed on
  the progress itself (forward in time both ways: a landing, or a jump on the way back) and ends before progress 1.
- **Encoding.** GIF frames carry a palette computed from that frame alone, so two identical frames in two
  different GIFs produce identical pixels.

## When you add something

- Counts that drive motion: `whole(v)` / `Math.round`. Never a fractional number of turns.
- Use `cycle(t, period, n, seed, life, fn)` for particles with the right `period` (`total(o)` in loops).
- Test the start, the end, and `t` vs `t + T` — add a line to `tests/seams.mjs`.
- `tw` (the blob's own clock) must equal `t` whenever the action is not active.
