// Everything the page needs from pixelfx, bundled into one browser global: PFX
export { createFrame, clearFrame, painterFor, composite, fit, PAL, toHex, hex, rng } from "../pixelfx/src/core/index.js";
export * as birth from "../src/spawn/ice-spirit-gestation.js";
export * as blob from "../src/creature/ice-blob-idle.js";
export * as actions from "../src/creature/ice-blob-actions.js";
export * as objects from "../src/creature/ice-scene-objects.js";
export * as loops from "../src/creature/ice-blob-loops.js";
export * as clock from "../src/creature/ice-blob-clock.js";
export * as elec from "../src/creature/ice-blob-electric.js";
export * as portal from "../src/creature/ice-blob-portal.js";
export * as explore from "../src/creature/ice-blob-explore.js";
export * as worlds from "../src/creature/ice-worlds.js";
export * as transform from "../src/creature/ice-blob-transform.js";
export * as life from "../src/creature/ice-life.js";
