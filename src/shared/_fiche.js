// What every fiche (GLOSSARY.md) shares: its options, written once, and the catalogue they make together.
//
// An option is  key: [default, label, min, max, step, unit?, how?]  (a slider),  key: [default, label, { select }, how?]
// (a list), or  key: [default]  (no row on the page). The optional `how` says how the page sets it:
//   scene: n   a length in % of the scene's height (n % is the page's default; the effect's default stays in px)
//   x: key / y: key   a point of the scene, in %, that the page turns into that effect option (px from its spot) and
//                     lets you drag in the preview; such a setting exists only on the page
//   forms: [...]      the forms whose page shows the row (others hide it)
const isHow = (v) => v && typeof v === "object" && !Array.isArray(v) && !("select" in v) && !("color" in v);

/** A fiche's options: its effect defaults, page defaults and rows. reserved: the host's own keys (a fiche can't reuse one). */
export function options(spec, reserved = {}) {
  const defaults = {}, page = {}, rows = [], scene = [], points = {}, forms = {};
  for (const [key, [value, label, ...row]] of Object.entries(spec)) {
    if (key in reserved) throw new Error(`option ${key}: the blob or the host already has a setting by that name`);
    const how = isHow(row[row.length - 1]) ? row.pop() : {};
    if (how.x || how.y) { points[key] = how.x ? { x: how.x } : { y: how.y }; page[key] = value; }
    else defaults[key] = value;
    if (how.scene != null) { scene.push(key); page[key] = how.scene; }
    if (how.forms) forms[key] = how.forms;
    if (label) rows.push(typeof row[0] === "number" ? [key, label, row[0], row[1], row[2], row[3] ?? ""] : [key, label, row[0]]);
  }
  const x = Object.keys(points).find((k) => points[k].x), y = Object.keys(points).find((k) => points[k].y);
  return { defaults, page, rows, scene, points, forms, target: x && y ? [x, y] : null };
}

/** Every fiche's effect defaults together (two fiches sharing an option must give it the same default). */
export function merged(list) {
  const out = {};
  for (const f of list) for (const [k, v] of Object.entries(f.defaults)) {
    if (k in out && out[k] !== v) throw new Error(`fiche ${f.id}: option ${k} = ${v}, but another fiche says ${out[k]}`);
    out[k] = v;
  }
  return out;
}
