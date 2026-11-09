// The loops (an entry from rest, the loop for as long as nothing else is asked, an exit back to rest): their catalogue, in
// the order of their cards in Vivre, and the loops tab's effect, which plays the one o.loop names. To add a loop: copy
// _template.js, then list it here.
import { family } from "./_loop.js";
import { fiche as sleep } from "./sleep.js";
import { fiche as magic } from "./magic.js";
import { fiche as walk } from "./walk.js";
import { fiche as run } from "./run.js";

export const LOOPS = [sleep, magic, walk, run];
export const { meta, drawBack, draw, total, gaitOf } = family(LOOPS);
