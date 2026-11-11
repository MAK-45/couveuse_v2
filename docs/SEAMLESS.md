# Seamless loops and chains

The promise: the creature lives on (page Vivre) without ever a jump, any GIF loops forever with no visible jump, and GIFs
placed end to end chain:

    rest (Blob né) → action → rest → clock → rest …
    move: rest here → move → rest there (everything after is drawn there)
    objects: live without X → appear X → live with X → remove X → live without X
    transformation: rest → transform → live (as often as you like) → revert → rest
    loops (Boucles): rest → entry → the loop (as often as you like) → exit → rest
    in a new form: rest → transform → live → (any of the above, from live back to live) → revert → rest

`npm test` checks all of it pixel for pixel (`tests/seams.mjs`), for every fiche of the catalogue at its defaults and its
extremes, in every form, and in whole lives.

## Why it holds

- **Time is periodic.** The idle repeats every `D = o.duration` seconds. Anything periodic multiplies the phase by a whole
  number of turns (`Math.round`, `whole()`). Random-looking motion reads noise along a circle:
  `ln(x, y, u, seed, r) = noise2(x + cos(2πu)·r, y + sin(2πu)·r, seed)`.
- **Long animations are whole idle loops.** Actions, clock, objects appear and remove last `loops · D`; the export uses
  `loops · round(D · fps)` frames at `t = i · T / N`, so their last frame lands on the idle's last frame.
- **Neutral ends.** An action's progress (`prog(t)`, shared/_time.js) is 0 during the lead-in and 1 after the lead-out,
  and every modifier is exactly at rest at 0 and 1: envelopes from `seg`, `bump`, `ease.*`; rotations are `2π · integer`.
- **Nothing moves in the first 0.12 s** (`LEAD_MIN`): a frame reads the body's speed a moment either side of it (its
  squash and tilt), so even with « Repos avant et après » at 0 the first frame must not feel the motion to come.
- **History-dependent bits.** Drops of light falling from the blob depend on where it was when they fell. Drops born
  while an action acts are hidden (`quiet: 1`), and the lead-out lasts at least 1.7 s (a drop's life), so every drop alive
  on the last frame was shed by the resting blob, as on the idle's frames.
- **One-shot particles** of an action live strictly inside (0, 1) of its progress.
- **Transformation.** The change is a function of c (0 the blob, 1 the new form), `chore()`: every part of it is exactly
  neutral at both ends, and at c = 0 the idle's own code draws the blob. The new form's motion is periodic over
  `liveLoops · D` (its own clock h); in `transform` h = t − T, so its last frame is the live loop's last frame, and in
  `revert` h = t. Its drops only show if they fell from the whole, resting form. The grounded form's gravity (floor, fall,
  landing) is a function of c too, all done before c = 1; its landing burst ends before progress 1.
- **The new forms in the other pages.** There, rest is the Transformation's `live` loop. At rest a page draws exactly the
  `live` frame: the same `build()` at c = 1, and every modifier enters as `x * 1` or `x + 0`. The figure's clock has the
  live loop's period `P = liveLoops · D`; a page T long passes T, and `figClock` adds `sh · E(seg(t/T, 0.04, a1))` (sh ≥ 0
  so that `T + sh` is a whole number of P), flat near both ends so the drops alive on the first and last frames fell where
  the live loop drops them. Steps on the floor are a function of `dx` only, so there are none at rest.
- **Walking and running on the spot.** A loop P long: `gaitPlan()` makes the floor of ice go by a whole number of tiles a
  loop (the speed asked, rounded) and the legs take a whole number of strides N a loop, so a foot on the ground goes back
  at exactly the floor's speed. Everything of the gait is a function of the stride's phase `N · t / P`; prints and sparks
  are aged in strides since each landing, seeded by the landing's index mod N.
- **Walking and running that set off and stop.** Their pace follows a `gaitLine`: each foot lands ahead of the hips by as
  much as its step, then stays where it came down while the floor goes back (or the figure goes on, `ax`) by exactly as
  much as it goes, d(t). The entry's line is the loop's own clock from the moment it reaches its pace, and it stays at its
  pace for as long as a print lives, so its last frame has the loop's steps, prints and floor. The exit goes on at its pace
  until the steps on their way are set down, so its first frame is the loop's. Turning side on blends two figures
  (`m.turn`): nothing switches while it shows.
- **Going somewhere else.** A move goes from one rest to another: at progress 0 nothing has changed, from its arrival on it
  is `{ ax, ay }` exactly (whole pixels), and `ax` / `ay` are a pure translation of all the creature draws (body, light on
  the ground, drops, motes; the floor and its glints stay with the scene, dithers read their column from `room[0]`), so its
  last frame is the rest drawn there. Its progress does not wrap round: the drops before it fell here, those after it there.
- **Encoding.** A GIF frame carries a palette computed from that frame alone, so two identical frames in two different
  GIFs give identical pixels.

## Loops in three parts

The entry and the exit are windows of the activity's own time, so they join the loop exactly: in the entry its clock is
`t − T` (0 on its last frame, where the loop starts), in the exit it goes on from the loop's end. Its intensity k
(`phases()`) never wraps: 0 before the entry, 1 after it, 1 before the exit, 0 after it. For the last 1.7 s of an entry
k = 1 (the modifiers are exactly the loop's, so the drops alive at the join fell the same way), and the last 1.7 s of an
exit are rest. Modifiers that can be faded go back to rest by k (`settle()`); what the activity draws fades by k
(`p.fade`). A pose (sitting down, legs crossed, arms down) is taken as far as k too (`poseK`): the figure at rest and the one in
the pose are both built and each part of the body goes from where the one has it to where the other does (`blendFig`
in forms.js; a leg's parts are named, so they match), so at k = 0 it is the rest exactly and at k = 1 the loop's pose,
and it never melts nor jumps in between.

## The life

A segment starts on a beat of the rest it leaves and lasts whole loops, so every join is one of those above: its first
frame is that rest's, its last the frame before the next rest's first. Every length is a whole number of the blob's
loops, so the blob's clock, the things' float and turn and the figure's live loop (by `figClock`) run on. Where it stands
(`pos`) moves the painter for the module's layers and the options' spot, never the things. Nothing is scheduled sooner
than `now + MARGIN`: a frame already on screen never changes. The drawing order is the same in every segment (module back,
things back, module front, things front), so a thing drawn by the engine and by the objects page is the same pixels.

## When you add something

- Counts that drive motion are whole; never a fractional number of turns.
- Particles: `cycle(t, period, n, seed, life, fn)` with the right period (`loopLen(o)` in a loop).
- The tests walk the catalogue and every form by themselves; for a new kind of thing add its checks and its requests in
  the lives of `tests/seams.mjs` (start, end, t against t + T, every join).
