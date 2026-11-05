// Builds dist/couveuse.html: one self-contained page (engine bundled + UI script inlined).
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url)), root = join(here, "..");
const res = await build({ entryPoints: [join(here, "entry.js")], bundle: true, format: "iife", globalName: "PFX", minify: true, write: false });
const pfx = res.outputFiles[0].text.replace(/<\/script/g, "<\\/script");
const main = readFileSync(join(here, "main.js"), "utf8");
const html = readFileSync(join(here, "index.template.html"), "utf8").replace("/*PFX*/", () => pfx).replace("/*MAIN*/", () => main);
mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist", "couveuse.html"), html);
console.log(`dist/couveuse.html  ${(html.length / 1024).toFixed(0)} kB`);
