// Everything the page needs from pixelfx, bundled into one browser global: PFX
export { createFrame, clearFrame, painterFor, composite, fit, PAL, toHex, hex } from "../pixelfx/src/core/index.js";
export * as birth from "../pixelfx/src/fx/spawn/ice-spirit-gestation.js";
export * as blob from "../pixelfx/src/fx/creature/ice-blob-idle.js";
export * as actions from "../pixelfx/src/fx/creature/ice-blob-actions.js";
export * as objects from "../pixelfx/src/fx/creature/ice-scene-objects.js";
export * as loops from "../pixelfx/src/fx/creature/ice-blob-loops.js";
export * as clock from "../pixelfx/src/fx/creature/ice-blob-clock.js";
