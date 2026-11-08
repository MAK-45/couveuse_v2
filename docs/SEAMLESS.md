# Seamless loops and chains

The promise to the user: the creature lives on (page Vivre) without ever a jump, and any GIF loops forever with no visible
jump, and GIFs placed end to end chain:

    rest (Blob né) → action → rest → clock → rest → electricity → rest …
    move: rest here → move → rest there (everything after is drawn there)
    objects: live without X → appear X → live with X → remove X → live without X
    portal: rest → open → live (as often as you like) → close → rest
            or … → live → cross → beyond (the blob at rest in the other world, as often as you like)
            → reopen → beyondOpen (as often as you like) → return → rest (or live, if the portal stays open)
    transformation: rest → transform → live (the new form, as often as you like) → revert → rest
    loops (Boucles): rest → entry → the loop (as often as you like) → exit → rest
    worlds (Mondes) and world actions (Action monde): each one loops on itself (no chaining promise yet)
    in a new form: rest -> transform -> live -> (any of the above, from live and back to live) -> revert -> rest

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
- **The new forms in the other tabs.** There "rest" is the Transformation's `live` loop. At rest a tab draws exactly the
  `live` frame: the same `build()` at c = 1, and every modifier enters as `x * 1` or `x + 0` (scale, turn, steps, lift,
  lean, arms...). The figure's own clock has the live loop's period `P = liveLoops · D`; a tab T long passes T and
  `figClock` adds `sh · E(seg(t/T, 0.04, a1))` (sh ≥ 0, so `T + sh` is a whole number of P), flat near both ends (a1 ≤ 1 − 1.75/T,
  so drops alive on the first and last frames fell where the live loop drops them); the idle's own clock is untouched (T is a
  whole number of D). Steps on the floor are a function of `dx` only, so they are none at rest.
- **Walking and running** (Action monde, the figure on its legs). A free loop P long: `gaitPlan()` makes the ground under its
  feet go by a whole number of tiles a loop (`tiles · T / P` px a second: the speed asked, rounded) and the legs take a whole
  number of strides N a loop (a person's cadence at that speed, rounded), so a stride is `S = tiles · T / N` and a foot on the
  ground goes back at exactly the ground's speed. The stride's phase is `N · t / P` (whole turns a loop); everything of the gait
  is a function of that phase. Prints and sparks are aged in strides since each landing, seeded by the landing's index mod N;
  the ice floor's glints go by with it, wrapped on the tile. The world's layer under its feet is found by `groundDepth()` and
  given `wDrift = tiles / depth`, so it makes exactly `tiles` a loop; other layers make their own whole number (`wAllMove: 0`:
  one too far to make a whole tile stays still).
- **Walking and running that set off and stop.** Their pace follows a `gaitLine`: each foot lands ahead of the hips by as much
  as the step its pace gives it, then stays where it came down while the floor goes back (or the figure goes on, `ax`) by exactly
  as much as it goes, d(t), so a foot down never slides whatever the pace. The entry's line is the loop's own clock (`cs`) from
  the moment it reaches its pace, and it stays at its pace for as long as a print lives (2.6 strides walking, 1.7 running): its
  last frame has the loop's steps, prints and floor. The exit goes on at its pace until the steps already on their way are set
  down (0.45 of a stride), so its first frame is the loop's. Turning side on is a blend of the two figures (`m.turn`, nothing
  switches while it shows); the floor's glints and prints change footing at the half-way point, where they are dimmed to nothing.
- **Going somewhere else.** A move is from one rest to another: at progress 0 nothing is changed, from its arrival on it is
  `{ ax, ay }` exactly (whole pixels), and `ax`/`ay` are a pure translation of everything the creature draws (body, light on the
  ground, drops, motes, its floor's light; the floor itself and its glints stay with the scene, dithers read their column from
  `room[0]`), so its last frame is the rest drawn there: the painter moved by the new `pos` and the scene's room seen from there.
  Its progress does not wrap round, so the drops before it fell here and those after it fell there.
- **Encoding.** GIF frames carry a palette computed from that frame alone, so two identical frames in two
  different GIFs produce identical pixels.

## Loops in three parts

The entry and the exit are windows of the activity's own time, so they join the loop exactly: in the entry its clock is
`t - T` (0 on its last frame, where the loop starts), in the exit it goes on from the loop's end. Its intensity k (ice-time.js
`phases()`) never wraps: before the entry it is 0, after it 1, before the exit 1, after it 0. For the last 1.7 s of an entry
k = 1 (the modifiers are exactly the loop's, so the drops alive at the join fell the same way), and the last 1.7 s of an exit
are rest. Modifiers that can be faded go back to rest by k (`settle()`); what the activity draws fades by k (`p.fade`); a
pose can't be faded: it switches while the figure is melted into light (`morph` exactly 1 on a plateau), on its legs its
frame gathered at `anchor`.

## The life

A segment starts on a beat of the rest it leaves and lasts whole loops: every join is one checked above. Its first frame is
that rest's, its last the frame before the next rest's first. Every length is a whole number of the blob's loops, so the
blob's own clock, the things' float and turn (whole turns a blob loop) and the figure's live loop (whole live loops by
`figClock`) run on; a world's clock is `t - wt0` in another world (the portal's "reopen" starts it at `wClock0` and still ends
on 0), and the portal's open loops are whole world loops. Where it stands (`pos`) moves the painter for the module's layers and
the options' spot, never the worlds or the things. Nothing is scheduled sooner than `now + MARGIN`: a frame already on
screen never changes. The drawing order is the same in every segment (world behind, module back, things back, module front,
things front, world's near part), so a thing drawn by the engine and the same thing drawn by the objects tab are the same
pixels. `tests/seams.mjs` plays whole lives (at home, in the forms, through portals into space and onto a plain, things
linked and following, going about the scene, walking and running) and checks every join.

## When you add something

- Counts that drive motion: `whole(v)` / `Math.round`. Never a fractional number of turns.
- Use `cycle(t, period, n, seed, life, fn)` for particles with the right `period` (`total(o)` in loops).
- Test the start, the end, and `t` vs `t + T` — add a line to `tests/seams.mjs`.
- `tw` (the blob's own clock) must equal `t` whenever the action is not active.
