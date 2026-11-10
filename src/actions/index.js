// The actions (played once, from rest back to rest): their catalogue, in the order of their cards in Vivre, and the
// actions tab's effect, which plays the one o.action names. To add an action: copy _template.js, then list it here.
import { family } from "./_action.js";
import { fiche as move } from "./move.js";
import { fiche as aura } from "./aura.js";
import { fiche as couleur } from "./couleur.js";

export const ACTIONS = [move, aura, couleur];
export const { meta, drawBack, draw, total, moveOf } = family(ACTIONS);
