// Lets pixelfx's own tools (render, check) find our effects in src/ without editing pixelfx: when they load
// pixelfx/tools/lib/fxlib.mjs, its FX_DIR is pointed at src/. Used by `npm run render` and `npm run check:fx`.
import { register } from "node:module";
import { isMainThread } from "node:worker_threads";
import { fileURLToPath } from "node:url";

if (isMainThread) register(import.meta.url);
const SRC = JSON.stringify(fileURLToPath(new URL("../src/", import.meta.url)));
export async function load(url, context, nextLoad) {
  const r = await nextLoad(url, context);
  if (!url.endsWith("/pixelfx/tools/lib/fxlib.mjs")) return r;
  return { ...r, source: String(r.source).replace(/export const FX_DIR = [^;]+;/, `export const FX_DIR = ${SRC};`) };
}
