---
name: new-anim
description: Add any new animation to the creature (a gesture, an activity, an effect it plays). Asks the author « une fois ou en boucle ? » first, then follows new-action or new-loop. Use whenever the author asks for something new the creature should do.
argument-hint: <ce qu’il doit faire>
---
Add a new animation to the creature: $ARGUMENTS

1. Ask the author, in French, and wait for the answer:
   « Tu la veux une seule fois (elle part du repos et y revient), ou en boucle (elle s’y met, continue autant que tu
   veux, puis s’arrête et revient au repos) ? »
2. Once → skill `new-action`. A loop → skill `new-loop`.
   A new form or posture → `new-form`. A new object shape or a companion → `new-thing`.
3. Anything else (a new kind of step in its life, a new settings page): read docs/ARCHITECTURE.md « Extension points »
   and agree the plan with the author before building.
