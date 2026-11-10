(() => {
"use strict";
const PAL = PFX.PAL;
const PRESETS = {
  "Glace": PFX.birth.meta.options.palette,
  "Arcane": PAL.arcane, "Braise": PAL.fire, "Sève": PAL.heal, "Aurore": PAL.holy,
  "Néon": PAL.neon, "Abysse": PAL.shadow, "Lagon": PAL.cyber, "Sang": PAL.blood,
};
const RATIOS = { "16:9": 16 / 9, "21:9": 21 / 9, "3:2": 3 / 2, "4:3": 4 / 3, "1:1": 1, "4:5": 4 / 5, "9:16": 9 / 16, "libre": 0 };
// settings every animation shares: the scene and the export
// (bodyForm: the creature's form in the tabs that can draw it: the blob, or one of the transformation's new forms)
const SHARED_DEF = { sceneW: 480, sceneH: 270, ratio: "16:9", bg: "black", bgColor: "#000000", zoom: 0, gifScale: 2, exportWhat: "scene", guides: true, bodyForm: "blob" };
// settings each animation keeps for itself: its own look, timing and place in the scene
const PER_DEF = { speed: 1, fps: 30, light: 1, posX: 50, posY: 50, scale: 1, canvas: 176 };

const PLACE = { title: "Place dans la scène", hint: "position, taille", place: true, rows: [
  ["posX", "Position horizontale", 0, 100, 0.1, " %"],
  ["posY", "Position verticale", 0, 100, 0.1, " %"],
  ["scale", "Taille de l’animation dans la scène", 1, 8, 1, "×"],
  ["canvas", "Zone de l’animation", 64, 320, 8, " px"],
]};
const COLORS = { title: "Couleurs", hint: "la lumière", palette: true, rows: [["light", "Intensité lumineuse", 0, 2.5, 0.05, ""]] };

const ANIMS = {
  birth: {
    name: "Naissance", fx: PFX.birth, file: "naissance", id: "birth/birth",
    groups: [
      PLACE,
      { title: "Temps", hint: "durée, rythme", rows: [
        ["duration", "Durée d’une boucle", 1, 12, 0.1, " s"],
        ["speed", "Vitesse de lecture", 0.25, 3, 0.05, "×"],
        ["fps", "Images par seconde", 8, 60, 1, ""],
        ["beats", "Battements par boucle", 0, 8, 1, ""],
        ["beatPower", "Force du battement", 0, 3, 0.05, ""],
        ["breath", "Respiration", 0, 4, 0.05, ""],
      ]},
      { title: "Forme", hint: "le corps", rows: [
        ["size", "Taille du corps", 8, 44, 1, " px"],
        ["lumps", "Bosses", 0, 2.5, 0.05, ""],
        ["detail", "Détail du contour", 1, 10, 1, ""],
        ["drift", "Mouvance des bosses", 0, 4, 1, ""],
        ["buds", "Excroissances", 0, 10, 1, ""],
        ["budSize", "Taille des excroissances", 0, 2.5, 0.05, ""],
        ["squash", "Écrasement", 0, 0.35, 0.01, ""],
        ["squashAngle", "Sens de l’écrasement", -180, 180, 1, "°"],
      ]},
      { title: "Peau et cœur", hint: "l’inachevé", rows: [
        ["unformed", "Peau inachevée", 0, 0.8, 0.01, ""],
        ["flicker", "Scintillement de la peau", 0, 3, 0.25, ""],
        ["currents", "Courants intérieurs", 0, 2.5, 0.05, ""],
        ["nucleus", "Éclat du noyau", 0, 2.5, 0.05, ""],
        ["nucleusDrift", "Dérive du noyau", 0, 3, 0.05, ""],
        ["lightAngle", "Direction de la lumière", 0, 360, 1, "°"],
        ["glint", "Reflet", 0, 2, 0.05, ""],
      ]},
      { title: "Halo", hint: "le cocon", rows: [
        ["halo", "Lueur", 0, 2.5, 0.05, ""],
        ["shell", "Halo contre la peau", 0, 2.5, 0.05, ""],
        ["cocoon", "Taille du cocon", 0, 2, 0.05, ""],
        ["cocoonWobble", "Ondulation du cocon", 0, 5, 0.1, ""],
        ["cocoonOpacity", "Opacité du cocon", 0, 2, 0.05, ""],
      ]},
      { title: "Nourriture", hint: "ce qui l’alimente", rows: [
        ["streams", "Filets de givre", 0, 90, 1, ""],
        ["streamReach", "Portée", 0.4, 1.8, 0.05, ""],
        ["streamSpeed", "Vitesse des filets", 0.3, 3, 0.05, "×"],
        ["fragments", "Fragments qui fusionnent", 0, 20, 1, ""],
        ["motes", "Poussières", 0, 90, 1, ""],
      ]},
      COLORS,
    ],
  },
  blob: {
    name: "Blob né", fx: PFX.blob, file: "blob", id: "blob/blob",
    groups: [
      PLACE,
      { title: "Temps", hint: "durée, rythme", rows: [
        ["duration", "Durée d’une boucle", 1, 16, 0.1, " s"],
        ["speed", "Vitesse de lecture", 0.25, 3, 0.05, "×"],
        ["fps", "Images par seconde", 8, 60, 1, ""],
        ["breath", "Respiration", 0, 4, 0.05, ""],
        ["breathTurns", "Respirations par boucle", 0, 8, 1, ""],
      ]},
      { title: "Corps", hint: "une forme jamais stable", rows: [
        ["size", "Taille du corps", 8, 48, 1, " px"],
        ["wobble", "Instabilité de la forme", 0, 1, 0.01, ""],
        ["detail", "Finesse des déformations", 0.3, 2.5, 0.05, ""],
        ["chaos", "Imprévisibilité", 0, 2, 0.05, ""],
        ["shapeTurns", "Vitesse de déformation", 1, 5, 1, "×"],
        ["drip", "Poids vers le bas", 0, 0.7, 0.01, ""],
        ["width", "Largeur", 0.6, 1.6, 0.01, ""],
        ["stretch", "Écrasement au rebond", 0, 2.5, 0.05, ""],
      ]},
      { title: "Mouvement", hint: "la lévitation", rows: [
        ["hover", "Amplitude de lévitation", 0, 24, 0.5, " px"],
        ["hoverTurns", "Montées et descentes par boucle", 0, 6, 1, ""],
        ["sway", "Balancement", 0, 24, 0.5, " px"],
        ["swayTurns", "Balancements par boucle", 0, 4, 1, ""],
        ["wander", "Errance aléatoire", 0, 24, 0.5, " px"],
        ["wanderChaos", "Hasard de l’errance", 0.1, 2.5, 0.05, ""],
        ["tilt", "Inclinaison en mouvement", 0, 2.5, 0.05, ""],
      ]},
      { title: "Yeux", hint: "son regard", rows: [
        ["eyes", "Nombre d’yeux", 0, 3, 1, ""],
        ["eyeShape", "Forme", { select: [["round", "Ronds"], ["oval", "Ovales"], ["almond", "En amande"], ["happy", "Plissés, heureux"]] }],
        ["eyeStyle", "Style", { select: [["dark", "Sombres et brillants"], ["pupil", "Blancs à pupille"], ["bright", "Lumineux"]] }],
        ["eyeColor", "Couleur des yeux", { color: true }],
        ["pupilColor", "Couleur des pupilles", { color: true }],
        ["eyeSize", "Taille", 1.5, 9, 0.5, " px"],
        ["eyeTall", "Hauteur des yeux ovales", 0.6, 2.2, 0.05, ""],
        ["eyeSpacing", "Écart", 0, 0.8, 0.01, ""],
        ["eyeHeight", "Placement vertical", -0.4, 0.6, 0.01, ""],
        ["blinks", "Clignements par boucle", 0, 8, 1, ""],
        ["blinkLength", "Durée d’un clignement", 0.04, 0.5, 0.01, " s"],
        ["look", "Regard qui se promène", 0, 2.5, 0.05, ""],
        ["lookTurns", "Vivacité du regard", 1, 5, 1, "×"],
        ["follow", "Regarde où il va", 0, 3, 0.05, ""],
        ["eyeGlow", "Lueur des yeux", 0, 2, 0.05, ""],
      ]},
      { title: "Lumière", hint: "reflets, halo", rows: [
        ["rim", "Reflets sur la peau", 0, 2, 0.05, ""],
        ["lightAngle", "Direction de la lumière", 0, 360, 1, "°"],
        ["currents", "Courants intérieurs", 0, 2.5, 0.05, ""],
        ["nucleus", "Éclat du noyau", 0, 2.5, 0.05, ""],
        ["halo", "Lueur", 0, 2.5, 0.05, ""],
        ["shell", "Halo contre la peau", 0, 2.5, 0.05, ""],
        ["ground", "Lumière au sol", 0, 2, 0.05, ""],
        ["groundDist", "Distance du sol", 1.2, 3.5, 0.05, ""],
      ]},
      { title: "Particules", hint: "autour de lui", rows: [
        ["drips", "Gouttes de lumière", 0, 30, 1, ""],
        ["sparks", "Étincelles en orbite", 0, 12, 1, ""],
        ["sparkRadius", "Rayon de l’orbite", 1, 3.2, 0.05, ""],
        ["motes", "Poussières", 0, 80, 1, ""],
      ]},
      COLORS,
    ],
  },
};
// ---- the catalogue: every action and loop is a fiche (src/actions, src/loops) that says its name, settings and rows;
// the page lists none of them
const FAMILIES = { actions: PFX.actions.ACTIONS, loops: PFX.loops.LOOPS };
const find = (family, id) => FAMILIES[family].find((f) => f.id === id);
const ficheOf = (family, id) => find(family, id) || FAMILIES[family][0];
// [id, name, description] for the pickers and Vivre's cards
const listOf = (family) => FAMILIES[family].map((f) => [f.id, f.name, f.desc]);
const ACTION_LIST = listOf("actions"), LOOP_LIST = listOf("loops");
// settings a fiche sets on the scene (its page defaults) and each animation's length, kept in that family's store
const pageDef = (family) => Object.assign({}, ...FAMILIES[family].map((f) => ({ ...f.page, ["loops_" + f.id]: f.loops })));
// points of the scene (in %) and lengths in % of the scene's height become the effect's own px from its spot, so the
// blob can reach any corner whatever the scene's size
function sceneUnits(o, family, pl, k) {
  for (const f of FAMILIES[family]) {
    for (const [key, pt] of Object.entries(f.points)) if (pt.x) o[pt.x] = ((V[key] / 100) * SW - pl.cx) / k; else o[pt.y] = ((V[key] / 100) * SH - pl.cy) / k;
    for (const key of f.scene) o[key] = (V[key] / 100) * (SH / k);
  }
}
function actionGroups() {
  const f = ficheOf("actions", V.action), pal = f.rows.find((r) => r[2] && r[2].palette);
  return [
    { title: "Action", hint: "choisis ce qu’il fait", picker: true, rows: [
      ["loops_" + f.id, f.kind === "move" ? "Durée de l’action (au moins : il prend le temps d’y aller)" : "Durée de l’action", 1, 8, 1, ""],
      ["lead", "Repos avant et après", 0, 0.3, 0.01, ""],
    ]},
    { title: f.name, hint: "réglages de l’action", key: "actparams", rows: f.rows.filter((r) => r !== pal) },
    // a palette of its own: the newborn's presets and swatches, for the tones the action takes
    ...(pal ? [{ title: pal[1], hint: "les teintes qu’il prend", key: "actpal", palette: pal[0], rows: [] }] : []),
    { ...PLACE, rows: PLACE.rows.filter((r) => r[0] !== "canvas"), hint: "la même que le blob né" },
  ];
}
ANIMS.actions = { name: "Actions", fx: PFX.actions, file: "action", id: "actions/index", mode: "scene", groups: null };
ANIMS.birth.mode = "box"; ANIMS.blob.mode = "scene";
ANIMS.blob.groups[0] = { ...PLACE, rows: PLACE.rows.filter((r) => r[0] !== "canvas") };
const BLOB_KEYS = new Set(Object.keys(PFX.blob.meta.options));
// (the form is shared by every tab, not an action's own: see bodyForm)
const ACTION_KEYS = new Set(Object.keys(PFX.actions.meta.options).filter((k) => !BLOB_KEYS.has(k) && k !== "form"));
const ACTION_PAGE = pageDef("actions");
for (const k of Object.keys(ACTION_PAGE)) ACTION_KEYS.add(k);
const actionDef = () => ({ ...Object.fromEntries([...ACTION_KEYS].filter((k) => k in PFX.actions.meta.options).map((k) => [k, PFX.actions.meta.options[k]])), ...ACTION_PAGE });
// where an action wants to go, as a scene point its fiche names, if it has one
const targetKeys = (a) => { const f = find("actions", a); return f && f.target ? [f.target] : []; };
// ---- the objects tab: things the blob makes in its scene, which stay and float with it
ANIMS.objects = { name: "Objets", fx: PFX.objects, file: "objets", id: "objects/objects", mode: "scene", groups: null };
// the shapes of objects (their solids: src/objects/objects.js)
const SHAPE_LIST = [["cube", "Cube"], ["sphere", "Sphère"], ["pyramid", "Pyramide"], ["crystal", "Cristal"], ["column", "Colonne"], ["gem", "Gemme"]];
const shapeName = (s) => (SHAPE_LIST.find((x) => x[0] === s) || SHAPE_LIST[0])[1];
const OBJ_MODES = [["live", "Scène vivante", "tout flotte avec le blob"], ["appear", "Apparition", "le blob crée l’objet choisi"], ["remove", "Disparition", "le blob retire l’objet choisi"]];
const OBJECT_DEF = () => ({ id: 0, shape: "cube", x: 50, y: 50, size: 12, spinY: 1, spinX: 0, tilt: 0.4, float: 4, floatTurns: 1, hue: 0, glow: 1, layer: "back", ph: 0 });
const objectsDef = () => ({
  list: [{ ...OBJECT_DEF(), id: 1, x: 26, y: 34, ph: 0.15 }], sel: 1, nextId: 2,
  mode: "live", loops_live: 1, loops_appear: 2, loops_remove: 2, lead: 0.08, castLean: 1,
  appearStyle: "halo", appearPower: 1, appearParticles: 28, removeStyle: "dissolve", removePower: 1, removeParticles: 28,
});
const OBJ_KEYS = new Set(Object.keys(objectsDef()).filter((k) => k !== "list" && k !== "sel" && k !== "nextId"));
const OBJ_ROWS = [
  ["ob_shape", "Forme", { select: SHAPE_LIST }],
  ["ob_x", "Position horizontale", 0, 100, 0.1, " % pos x"], ["ob_y", "Position verticale", 0, 100, 0.1, " % pos y"],
  ["ob_size", "Taille", 4, 48, 0.5, " px"], ["ob_layer", "Plan", { select: [["back", "Derrière le blob"], ["front", "Devant le blob"]] }],
  ["ob_spinY", "Rotation, tours par boucle", -3, 3, 1, ""], ["ob_spinX", "Culbute, tours par boucle", -2, 2, 1, ""], ["ob_tilt", "Inclinaison", -1.5, 1.5, 0.05, ""],
  ["ob_float", "Flottement", 0, 20, 0.5, " px"], ["ob_floatTurns", "Rythme du flottement", 0, 4, 1, ""],
  ["ob_hue", "Teinte", 0, 360, 1, "°"], ["ob_glow", "Lueur", 0, 2.5, 0.05, ""],
];
const OBJ_APPEAR = [["halo", "Halo de lumière"], ["laser", "Laser qui le dessine"], ["crystal", "Cristaux qui s’assemblent"], ["orb", "Orbe lancée par le blob"]];
const OBJ_REMOVE = [["dissolve", "Dissolution"], ["laser", "Laser qui l’efface"], ["implode", "Implosion"], ["shatter", "Éclats"], ["swallow", "Avalé par le blob"]];
const APPEAR_ROWS = [
  ["appearStyle", "Manière", { select: OBJ_APPEAR }],
  ["appearPower", "Intensité de la lumière", 0, 2.5, 0.05, ""], ["appearParticles", "Particules", 0, 80, 1, ""],
];
const REMOVE_ROWS = [
  ["removeStyle", "Manière", { select: OBJ_REMOVE }],
  ["removePower", "Intensité de la lumière", 0, 2.5, 0.05, ""], ["removeParticles", "Particules", 0, 80, 1, ""],
];
const selObj = () => (S.objects.list.find((ob) => ob.id === S.objects.sel) || S.objects.list[0] || null);
function objectsView() {
  const o = { ...S.shared, ...S.blob };
  for (const k of OBJ_KEYS) o[k] = S.objects[k];
  const so = selObj();
  if (so) for (const [k, v] of Object.entries(so)) o["ob_" + k] = v;
  return o;
}
// a free spot for a new object: far from the blob and from the others
function freeSpot() {
  const pl = { x: V.posX, y: V.posY }, others = S.objects.list;
  let best = [30, 30], bd = -1;
  for (let i = 0; i < 60; i++) {
    const x = 10 + ((i * 37) % 81), y = 12 + ((i * 53) % 77);
    const d = Math.min(Math.hypot((x - pl.x) * 1.6, y - pl.y) * 0.8, ...others.map((ob) => Math.hypot((x - ob.x) * 1.6, y - ob.y)), 200);
    if (d > bd) { bd = d; best = [x, y]; }
  }
  return best;
}
function addObject(shape) {
  const [x, y] = freeSpot(), id = S.objects.nextId++;
  S.objects.list.push({ ...OBJECT_DEF(), id, shape, x, y, ph: Math.round(Math.random() * 1000) / 1000, spinY: Math.random() < 0.5 ? 1 : -1 });
  S.objects.sel = id;
  refreshV(); buildControls(); changed();
  say(`${shapeName(shape)} ajouté à la scène. Glisse-le pour le placer.`);
}
function removeObject(id) {
  const i = S.objects.list.findIndex((ob) => ob.id === id);
  if (i < 0) return;
  const [ob] = S.objects.list.splice(i, 1);
  if (S.objects.sel === id) S.objects.sel = (S.objects.list[Math.max(0, i - 1)] || {}).id ?? null;
  refreshV(); buildControls(); changed();
  say(`${shapeName(ob.shape)} n° ${ob.id} retiré de la scène.`);
}
function objectGroups() {
  const so = selObj(), m = V.mode, hasObj = !!so;
  const gs = [
    { title: "Objets de la scène", hint: `${S.objects.list.length} objet${S.objects.list.length > 1 ? "s" : ""}`, key: "objlist", objlist: true, rows: [] },
    { title: "Animation", hint: "ce qu’on exporte", key: "objanim", objanim: true, rows: [[`loops_${m}`, "Durée", 1, 8, 1, ""], ["lead", "Repos avant et après", 0, 0.3, 0.01, ""], ...(m === "live" ? [] : [["castLean", "Le blob se tourne vers l’objet", 0, 2.5, 0.05, ""]])] },
  ];
  if (m === "appear") gs.push({ title: "Apparition", hint: so ? `${shapeName(so.shape)} n° ${so.id}` : "aucun objet", key: "objappear", open: true, rows: APPEAR_ROWS });
  if (m === "remove") gs.push({ title: "Disparition", hint: so ? `${shapeName(so.shape)} n° ${so.id}` : "aucun objet", key: "objremove", open: true, rows: REMOVE_ROWS });
  if (hasObj) gs.push({ title: "Objet choisi", hint: `${shapeName(so.shape)} n° ${so.id}`, key: "objsel", rows: OBJ_ROWS });
  return gs;
}
function objListMarkup(rows) {
  const list = S.objects.list;
  rows.insertAdjacentHTML("beforeend", `<div class="row"><label><span>Ajouter</span></label><div class="inline addshapes">${SHAPE_LIST.map(([id, n]) => `<button type="button" data-add="${id}">${n}</button>`).join("")}</div></div>`);
  const ul = document.createElement("div");
  ul.className = "objlist";
  if (!list.length) ul.innerHTML = `<p class="note">Aucun objet. Ajoute une forme : elle apparaît dans la scène et tu peux la glisser où tu veux.</p>`;
  for (const ob of list) {
    const r = document.createElement("div");
    r.className = "obj" + (ob.id === S.objects.sel ? " on" : "");
    r.innerHTML = `<button type="button" class="objpick" aria-pressed="${ob.id === S.objects.sel}"><strong>${shapeName(ob.shape)} n° ${ob.id}</strong><span>${Math.round(ob.x)} %, ${Math.round(ob.y)} % · ${ob.layer === "front" ? "devant" : "derrière"}</span></button><button type="button" class="objdel" aria-label="Retirer ${shapeName(ob.shape)} n° ${ob.id}">Retirer</button>`;
    r.querySelector(".objpick").onclick = () => { S.objects.sel = ob.id; refreshV(); buildControls(); changed(); };
    r.querySelector(".objdel").onclick = () => removeObject(ob.id);
    ul.appendChild(r);
  }
  rows.appendChild(ul);
  rows.querySelectorAll("[data-add]").forEach((b) => (b.onclick = () => addObject(b.dataset.add)));
  rows.insertAdjacentHTML("beforeend", `<div class="row"><div class="inline"><label class="check"><input type="checkbox" id="in-guides">Repères des objets</label></div><p class="note">Glisse un objet dans l’aperçu pour le déplacer. Pour garder sa disparition, exporte-la avant de le retirer.</p></div>`);
}
function objAnimMarkup(rows) {
  const grid = document.createElement("div");
  grid.className = "actions modes"; grid.setAttribute("role", "radiogroup"); grid.setAttribute("aria-label", "Animation");
  for (const [id, name, desc] of OBJ_MODES) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "act"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(id === V.mode));
    b.innerHTML = `<strong>${name}</strong><span>${desc}</span>`;
    b.onclick = () => { if (V.mode === id) return; setV("mode", id); buildControls(); changed(); };
    grid.appendChild(b);
  }
  rows.appendChild(grid);
  const so = selObj(), txt = {
    live: "La boucle du blob et de tous les objets de la liste : elle se raccorde à elle-même et aux apparitions et disparitions.",
    appear: so ? `Commence sur la scène vivante sans ${shapeName(so.shape).toLowerCase()} n° ${so.id}, finit sur la scène vivante avec. Les autres objets restent là.` : "Ajoute un objet pour le faire apparaître.",
    remove: so ? `Commence sur la scène vivante avec ${shapeName(so.shape).toLowerCase()} n° ${so.id}, finit sur la scène vivante sans. Les autres objets restent là.` : "Ajoute un objet pour le faire disparaître.",
  }[V.mode];
  rows.insertAdjacentHTML("beforeend", `<p class="note">${txt}</p>`);
}
// ---- the loops tab: the blob busy with something, for ever
ANIMS.loops = { name: "Boucles", fx: PFX.loops, file: "boucle", id: "loops/index", mode: "scene", groups: null };
const LOOP_KEYS = new Set(Object.keys(PFX.loops.meta.options).filter((k) => !(k in PFX.blob.meta.options) && k !== "form"));
const loopsDef = () => {
  return { ...Object.fromEntries([...LOOP_KEYS].map((k) => [k, PFX.loops.meta.options[k]])), ...pageDef("loops") };
};
for (const k of Object.keys(loopsDef())) LOOP_KEYS.add(k);
const LOOP_PARTS = [["loop", "La boucle"], ["enter", "Entrée : depuis le repos"], ["exit", "Sortie : retour au repos"]];
// the part shown: the loop, its entry or its exit
const loopPart = (src = V) => (src.part === "enter" || src.part === "exit" ? src.part : "loop");
function loopGroups() {
  const f = ficheOf("loops", V.loop);
  return [
    { title: "Boucle", hint: "ce qu’il fait", pickerList: LOOP_LIST, pickerKey: "loop", rows: [
      ["part", "Morceau", { select: LOOP_PARTS }],
      ["loops_" + f.id, "Durée de la boucle", 1, 8, 1, ""],
      ["inLoops", "Durée de l’entrée", 1, 4, 1, ""], ["outLoops", "Durée de la sortie", 1, 4, 1, ""]] },
    { title: f.name, hint: "réglages", key: "loopparams", gaitNote: !!f.gait, rows: f.rows },
    { ...PLACE, rows: PLACE.rows.filter((r) => r[0] !== "canvas"), hint: "la même que le blob né" },
  ];
}
// ---- the clock tab: the blob shows the time, then is back at rest
ANIMS.clock = { name: "Heure", fx: PFX.clock, file: "heure", id: "clock/clock", mode: "scene", groups: null };
const CLOCK_KEYS = new Set(Object.keys(PFX.clock.meta.options).filter((k) => !(k in PFX.blob.meta.options) && k !== "form"));
const clockDef = () => {
  const d = Object.fromEntries([...CLOCK_KEYS].map((k) => [k, PFX.clock.meta.options[k]]));
  return { ...d, clkSource: "fixed", clkPos: "above", clkPX: 50, clkPY: 20 };
};
for (const k of Object.keys(clockDef())) CLOCK_KEYS.add(k);
const YESNO = [["1", "Oui"], ["0", "Non"]];
function clockGroups() {
  const fixed = V.clkSource !== "now";
  return [
    { title: "L’heure", hint: "ce qu’il affiche", key: "clktime", open: true, rows: [
      ["clkSource", "Heure affichée", { select: [["fixed", "Celle que je choisis"], ["now", "L’heure au moment de l’export"]] }],
      ...(fixed ? [["clkH", "Heures", 0, 23, 1, " h"], ["clkM", "Minutes", 0, 59, 1, " min"], ["clkS", "Secondes", 0, 59, 1, " s"]] : []),
      ["clkFormat", "Format", { select: [["24", "24 heures (14:35)"], ["12", "12 heures (2:35 PM)"]] }],
      ["clkSep", "Séparateur", { select: [[":", "Deux-points  14:35"], ["h", "Lettre h  14h35"], [".", "Point  14.35"]] }],
      ["clkSeconds", "Afficher les secondes", { select: YESNO }], ["clkTick", "Les secondes défilent pendant l’affichage", { select: YESNO }],
      ["clkZero", "Zéro devant l’heure (09:05)", { select: YESNO }], ["clkBlink", "Séparateur qui clignote", { select: YESNO }],
    ]},
    { title: "Affichage", hint: "où, comment", key: "clklook", open: true, rows: [
      ["clkPos", "Position", { select: [["above", "Au-dessus du blob"], ["left", "À sa gauche"], ["right", "À sa droite"], ["below", "En dessous"], ["free", "Où je veux dans la scène"]] }],
      ...(V.clkPos === "free" ? [["clkPX", "Position horizontale", 0, 100, 0.5, " % pos x"], ["clkPY", "Position verticale", 0, 100, 0.5, " % pos y"]] : []),
      ["clkStyle", "Style des chiffres", { select: [["ice", "Glace pleine"], ["neon", "Néon"], ["flat", "Plat"], ["crystal", "Cristal à facettes"]] }],
      ["clkPanel", "Cadre", { select: [["none", "Aucun"], ["panel", "Panneau"], ["bubble", "Bulle"]] }],
      ["clkScale", "Taille des chiffres", 1, 8, 1, "×"], ["clkSpacing", "Espace entre les chiffres", 0, 4, 1, ""], ["clkBold", "Gras", { select: [["0", "Non"], ["1", "Oui"]] }],
      ["clkHue", "Teinte", 0, 360, 1, "°"], ["clkGlow", "Lueur", 0, 2.5, 0.05, ""], ["clkFloat", "Flottement", 0, 10, 0.5, " px"], ["clkSparkles", "Étincelles autour", 0, 2, 0.05, ""],
    ]},
    { title: "Effets", hint: "arrivée, départ", key: "clkfx", open: true, rows: [
      ["clkAppear", "Arrivée", { select: [["particles", "Étincelles sorties du blob"], ["projector", "Projetée par le blob"], ["write", "Écrite au trait"], ["pop", "Chiffres qui surgissent"], ["crystal", "Cristaux qui poussent"], ["slot", "Rouleaux de machine à sous"]] }],
      ["clkAppearLen", "Durée de l’arrivée", 0.05, 0.45, 0.01, " part"],
      ["clkVanish", "Départ", { select: [["absorb", "Aspirée par le blob"], ["fade", "S’éteint pixel par pixel"], ["scatter", "S’éparpille"], ["slide", "Glisse vers le haut"], ["shatter", "Vole en éclats"], ["slot", "Rouleaux qui repartent"]] }],
      ["clkVanishLen", "Durée du départ", 0.05, 0.45, 0.01, " part"],
      ["loops", "Durée totale", 1, 8, 1, ""], ["lead", "Repos avant et après", 0, 0.3, 0.01, ""],
    ]},
    { title: "Le blob", hint: "pendant l’affichage", key: "clkblob", rows: [
      ["clkMove", "Il", { select: [["aside", "Se pousse sur le côté"], ["rise", "S’élève"], ["below", "Descend un peu"], ["stay", "Reste en place"]] }],
      ["clkOffset", "Distance", 0, 60, 0.5, " px"], ["clkLook", "Regarde l’heure", 0, 2, 0.05, ""], ["clkJoy", "Fier de lui", 0, 1.5, 0.05, ""],
    ]},
    { ...PLACE, rows: PLACE.rows.filter((r) => r[0] !== "canvas"), hint: "la même que le blob né" },
  ];
}
// the clock's centre, in the effect's own pixels from the blob's spot
function clockSpot() {
  const pl = placement(), k = V.scale, s = Math.max(1, Math.round(V.clkScale)), sec = +V.clkSeconds ? 3 : 0, chars = 5 + sec + (V.clkFormat === "12" ? 3 : 0);
  const w = chars * (5 + Math.round(V.clkSpacing)) * s, h = 7 * s, S = V.size;
  switch (V.clkPos) {
    case "left": return [-(S * 1.5 + w / 2 + 10), -S * 0.3];
    case "right": return [S * 1.5 + w / 2 + 10, -S * 0.3];
    case "below": return [0, S * 1.5 + h / 2 + 14];
    case "free": return [((V.clkPX / 100) * SW - pl.cx) / k, ((V.clkPY / 100) * SH - pl.cy) / k];
    default: return [0, -(S * 1.4 + h / 2 + 18)];
  }
}
// ---- the transformation tab: the blob changes shape (into a human figure made for levitation, or the same figure on
// its legs on a floor, with gravity), lives in that form and comes back. rest -> transform -> live (looping) -> revert
// -> rest, frame for frame
ANIMS.transform = { name: "Transformation", fx: PFX.transform, file: "transformation", id: "forms/forms", mode: "scene", groups: null };
const TF_MODES = [["transform", "Transformation", "le blob change de forme"], ["live", "Forme en boucle", "il vit sous sa nouvelle forme"],
  ["revert", "Retour au blob", "il redevient le blob né"]];
const TF_FORMS = [["human", "Forme humaine", "en lévitation, faite de sa lumière"], ["grounded", "Forme humaine au sol", "sur ses jambes, avec la gravité"]];
const TF_STYLES = { transform: [["grow", "Éclosion : son corps s’étire et ses membres poussent"], ["flash", "Éclair : il se roule en boule de lumière, un flash, et le voilà"],
  ["spiral", "Spirale : des rubans de lumière le refont de bas en haut"]],
  revert: [["grow", "Résorption : ses membres rentrent, il se refait goutte"], ["flash", "Éclair : un flash, et il redevient boule"],
  ["spiral", "Spirale : des rubans de lumière le défont de haut en bas"]] };
const transformDef = () => {
  const d = Object.fromEntries(Object.entries(PFX.transform.meta.options).filter(([k]) => !(k in PFX.blob.meta.options) && !["loops", "liveLoops", "room"].includes(k)));
  // the floor is set in % of the scene's height (effOpts turns it into the effect's px below the blob's spot)
  return { ...d, grFloor: 82, loops_transform: 2, loops_live: 2, loops_revert: 2 };
};
const TRANSFORM_KEYS = new Set(Object.keys(transformDef()));
const HUMAN_ROWS = [
  ["huHeight", "Taille de la forme (× le blob)", 0.6, 1.6, 0.01, "×"], ["huHead", "Taille de la tête", 0.7, 1.5, 0.01, "×"],
  ["huBuild", "Carrure (épaules)", 0.7, 1.4, 0.01, "×"], ["huWaist", "Taille et hanches", 0.7, 1.5, 0.01, "×"],
  ["huLegs", "En l’air grâce à", { select: [["spirit", "Une queue de lumière (esprit)"], ["legs", "Des jambes, pointes vers le bas"], ["lotus", "Assis en tailleur, en méditation"]] }],
  ["huArms", "Les bras", { select: [["float", "Flottent, un peu écartés"], ["open", "Grands ouverts"], ["down", "Le long du corps"]] }],
  ["huTilt", "Se penche quand il bouge", 0, 2, 0.05, ""], ["huEyes", "Taille des yeux", 0.5, 2, 0.05, "×"],
];
const HUMAN_MOVES = [
  ["huArmSway", "Les bras ondulent", 0, 3, 0.05, ""], ["huArmTurns", "Ondulations des bras par boucle", 1, 4, 1, ""],
  ["huTailSway", "Balancement de la queue ou des jambes", 0, 3, 0.05, ""], ["huTailTurns", "Balancements par boucle du blob", 1, 4, 1, ""],
  ["huHair", "Longueur des cheveux de lumière", 0, 2, 0.05, "×"], ["huHairStrands", "Mèches", 0, 8, 1, ""], ["huHairFlow", "Les cheveux flottent", 0, 3, 0.05, ""],
];
const HUMAN_LIGHT = [
  ["huHands", "Lumière dans les mains", 0, 2.5, 0.05, ""], ["huDrops", "Gouttes de lumière par boucle du blob", 0, 10, 1, ""], ["huHalo", "Halo autour de la forme", 0, 2.5, 0.05, ""],
];
// the grounded form: the same figure on its legs, the floor, gravity
const groundRows = () => [
  ["huHeight", "Taille de la forme (× le blob)", 0.6, 1.6, 0.01, "×"], ["huHead", "Taille de la tête", 0.7, 1.5, 0.01, "×"],
  ["huBuild", "Carrure (épaules)", 0.7, 1.4, 0.01, "×"], ["huWaist", "Taille et hanches", 0.7, 1.5, 0.01, "×"],
  ["grStance", "Écart des pieds", 0, 3, 0.05, "×"],
  ["grArms", "Les bras", { select: [["relaxed", "Le long du corps, détendus"], ["hips", "Les poings sur les hanches"], ["wave", "Il fait coucou de la main"]] }],
  ...(V.grArms === "wave" ? [["grWaves", "Coucous par boucle du blob", 1, 6, 1, ""]] : []),
  ["huEyes", "Taille des yeux", 0.5, 2, 0.05, "×"],
];
const GROUND_MOVES = [
  ["grSway", "Il passe d’un pied sur l’autre", 0, 3, 0.05, ""], ["grSwayTurns", "Balancements par boucle du blob", 1, 4, 1, ""],
  ["huHair", "Longueur des cheveux de lumière", 0, 2, 0.05, "×"], ["huHairStrands", "Mèches", 0, 8, 1, ""],
  ["grHairSway", "Les cheveux suivent ses mouvements", 0, 3, 0.05, ""],
  ["huHairFlow", "Les cheveux flottent (tant qu’il est en l’air)", 0, 3, 0.05, ""], ["huArmSway", "Les bras ondulent (tant qu’il est en l’air)", 0, 3, 0.05, ""],
];
const GROUND_FALL = [
  ["grGravity", "Force de la gravité (chute plus rapide)", 0.3, 3, 0.05, "×"], ["grLand", "Il plie les genoux en atterrissant", 0, 2, 0.05, ""],
  ["grDust", "Éclats de lumière au contact du sol", 0, 2.5, 0.05, ""],
];
const GROUND_FLOOR = [
  ["grFloor", "Hauteur du sol", 55, 99, 0.5, " % (sol)"],
  ["grLook", "Aspect du sol", { select: [["ice", "Glace : reflet et lignes de profondeur"], ["line", "Une simple ligne de lumière"]] }],
  ["grLight", "Lumière du sol", 0, 2, 0.05, ""], ["grReflect", "Reflet dans la glace", 0, 1.5, 0.05, ""], ["grGlints", "Éclats qui scintillent sur le sol (par boucle du blob)", 0, 10, 1, ""],
];
function transformGroups() {
  const m = V.mode, gs = [
    { title: "Animation", hint: "ce qu’on exporte", key: "tfanim", open: true, tfModes: true,
      rows: [[`loops_${m}`, m === "live" ? "Durée de la boucle" : "Durée", 1, 8, 1, ""], ...(m === "live" ? [] : [["lead", "Repos avant et après", 0, 0.3, 0.01, ""]])] },
    { title: "Nouvelle forme", hint: (TF_FORMS.find((f) => f[0] === V.form) || TF_FORMS[0])[1].toLowerCase(), key: "tfform", pickerList: TF_FORMS, pickerKey: "form", rows: [] },
  ];
  if (m !== "live") {
    const sk = m === "revert" ? "rvStyle" : "tfStyle";
    gs.push({ title: m === "revert" ? "Le retour" : "La transformation", hint: "comment il change", key: "tfstyle", open: true, rows: [
      [sk, "Manière", { select: TF_STYLES[m] }], ["tfPower", "Intensité de la lumière", 0, 2.5, 0.05, ""], ["tfParticles", "Particules", 0, 100, 1, ""],
      ...(V[sk] === "flash" ? [["tfFlash", "Force du flash", 0, 2.5, 0.05, ""]] : []), ["tfRing", "Anneau de lumière à la fin", 0, 2, 0.05, ""],
      ...(V[sk] !== "grow" ? [["tfSpin", V[sk] === "flash" ? "Tours sur lui-même" : "Tours des rubans", 0, 4, 1, ""]] : [])] });
  }
  if (V.form === "grounded") gs.push({ title: "La forme humaine", hint: "silhouette, pose", key: "tfhuman", open: m === "live", rows: groundRows() },
    { title: "Mouvements", hint: "son poids, les cheveux", key: "tfmoves", rows: GROUND_MOVES },
    { title: "La gravité", hint: "chute, atterrissage", key: "tffall", open: m !== "live", rows: GROUND_FALL },
    { title: "Le sol", hint: "place, aspect", key: "tffloor", rows: GROUND_FLOOR },
    { title: "Lumière", hint: "mains, gouttes, halo", key: "tflight", rows: HUMAN_LIGHT });
  else gs.push({ title: "La forme humaine", hint: "silhouette, pose", key: "tfhuman", open: m === "live", rows: HUMAN_ROWS },
    { title: "Mouvements", hint: "la lévitation, les cheveux", key: "tfmoves", rows: HUMAN_MOVES },
    { title: "Lumière", hint: "mains, gouttes, halo", key: "tflight", rows: HUMAN_LIGHT });
  gs.push(
    { ...PLACE, rows: PLACE.rows.filter((r) => r[0] !== "canvas"), hint: "la même que le blob né" });
  return gs;
}
function tfModesMarkup(rows) {
  const grid = document.createElement("div");
  grid.className = "actions modes"; grid.setAttribute("role", "radiogroup"); grid.setAttribute("aria-label", "Animation de la transformation");
  for (const [id, name, desc] of TF_MODES) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "act"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(id === V.mode));
    b.innerHTML = `<strong>${name}</strong><span>${desc}</span>`;
    b.onclick = () => { if (V.mode === id) return; setV("mode", id); buildControls(); changed(); };
    grid.appendChild(b);
  }
  rows.appendChild(grid);
  const L = Math.max(1, Math.round(+V.loops_live || 2)), loopTxt = `une boucle parfaite de ${L} × ${(+V.duration).toFixed(1)} s, qui se raccorde à elle-même, à la fin de la transformation et au début du retour.`;
  const txt = (V.form === "grounded" ? {
    transform: "Commence sur l’image du blob né. Il prend forme humaine dans les airs, un sol de glace s’étend sous lui, la gravité le prend : il tombe, atterrit en pliant les genoux et se tient debout. La dernière image est celle de « Forme en boucle ».",
    live: `Debout sur le sol, les pieds bien posés, il passe d’un pied sur l’autre et respire : ${loopTxt}`,
    revert: "Commence sur la première image de « Forme en boucle ». Il plie les genoux, saute, s’arrête en l’air en apesanteur pendant que le sol s’éteint, puis reprend sa forme de blob : la dernière image est celle du blob né.",
  } : {
    transform: "Commence sur l’image du blob né. Il rassemble sa lumière, ferme les yeux, prend sa nouvelle forme et rouvre les yeux : la dernière image est celle de « Forme en boucle ».",
    live: `Sa nouvelle forme en lévitation : ${loopTxt}`,
    revert: "Commence sur la première image de « Forme en boucle ». Il ferme les yeux, reprend sa forme de blob et revient exactement à son repos : la dernière image est celle du blob né.",
  })[V.mode];
  rows.insertAdjacentHTML("beforeend", `<p class="note">${txt} Enchaîne : blob né → transformation → forme en boucle (autant de fois que tu veux) → retour au blob → blob né.</p>`);
}
// ---- the creature's form in the other tabs: the blob, or one of the transformation's new forms, with that tab's
// settings (its pose, size, hair, floor...). Everything from rest then starts and ends on the new form's loop
// ("Forme en boucle"), so GIFs chain: blob né -> transformation -> its animations... -> retour au blob. What a form
// can't do (walking without legs...) comes from the fiches (formFit): it is shown, and can't be picked
const BODY_FORMS = [["blob", "Blob né", "la petite créature de lumière"], ["human", "Forme humaine", "en lévitation, comme dans Transformation"],
  ["grounded", "Forme humaine au sol", "sur ses jambes, avec la gravité"]];
const FORM_TABS = new Set(["actions", "objects", "loops", "clock"]);
const FIT_FAMILY = { action: "actions", loop: "loops" };
const formNow = () => (FORM_TABS.has(S.anim) && BODY_FORMS.some((f) => f[0] === S.shared.bodyForm) ? S.shared.bodyForm : "blob");
const unfit = (key, id, form = formNow()) => { const f = FIT_FAMILY[key] && find(FIT_FAMILY[key], id); return (f && f.formFit[form]) || null; };
// a choice its form can't do moves to the first one it can
function fixFit(s = S) {
  const f = s.shared.bodyForm;
  for (const [store, key] of [[s.actions, "action"], [s.loops, "loop"]])
    if (store && unfit(key, store[key], f)) store[key] = (FAMILIES[FIT_FAMILY[key]].find((x) => !x.formFit[f]) || FAMILIES[FIT_FAMILY[key]][0]).id;
}
function setBodyForm(id) {
  if ((S.shared.bodyForm || "blob") === id) return;
  S.shared.bodyForm = id;
  if (id !== "blob") S.transform.form = id;
  fixFit(); refreshV(); buildControls(); changed();
}
function formMarkup(rows) {
  const grid = document.createElement("div"), cur = S.shared.bodyForm || "blob";
  grid.className = "actions modes"; grid.setAttribute("role", "radiogroup"); grid.setAttribute("aria-label", "Forme de la créature");
  for (const [id, name, desc] of BODY_FORMS) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "act"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(id === cur));
    b.innerHTML = `<strong>${name}</strong><span>${desc}</span>`;
    b.onclick = () => setBodyForm(id);
    grid.appendChild(b);
  }
  rows.appendChild(grid);
  const L = Math.max(1, Math.round(+S.transform.loops_live || 2));
  rows.insertAdjacentHTML("beforeend", `<p class="note">${cur === "blob" ? "Le blob né, avec ses réglages (Vivre › Forme › Régler le blob né). Choisis une forme humaine pour voir l’animation faite par elle (ses réglages : Vivre › Forme › Régler les formes humaines)."
    : `L’animation est faite par la ${cur === "grounded" ? "forme humaine au sol (sur ses jambes, avec la gravité, sur son sol de glace : elle marche, court, s’assoit)" : "forme humaine en lévitation"}, avec tous les réglages des formes humaines (silhouette, pose, cheveux${cur === "grounded" ? ", sol" : ""}, boucle de ${L} × ${(+V.duration).toFixed(1)} s). Partir du repos veut dire partir de sa « Forme en boucle » et y revenir.`}</p>`);
}
// a row shows only in the forms its fiche names (a figure on its legs has no height to rise by; only it walks somewhere)
const ROW_FORMS = Object.assign({}, ...FAMILIES.actions.map((f) => f.forms), ...FAMILIES.loops.map((f) => f.forms));
const rowShown = (k) => !ROW_FORMS[k] || ROW_FORMS[k].includes(formNow());
const formGroup = () => ({ title: "Forme", hint: (BODY_FORMS.find((f) => f[0] === (S.shared.bodyForm || "blob")) || BODY_FORMS[0])[1].toLowerCase(), key: "bodyform", open: true, formPicker: true, rows: [] });
const RENDER = { title: "Rendu", hint: "fond, export", render: true, rows: [
  ["zoom", "Zoom de l’aperçu", 0, 6, 1, "×"],
  ["gifScale", "Agrandissement du GIF", 1, 6, 1, "×"],
]};
const SHARED_KEYS = new Set(Object.keys(SHARED_DEF));
ANIMS.life = { name: "Vivre", fx: PFX.life, file: "vie", id: "life/life", mode: "scene", groups: null };
const lifeDef = () => ({ shape: "cube", obSize: 12, obHue: 0, obLayer: "back", appearStyle: "halo", removeStyle: "dissolve",
  spotX: 27, spotY: 36, hub: { form: "blob", pos: [0, 0] }, things: [] });
const LIFE_KEYS = new Set(Object.keys(lifeDef()));

// ---- state: { anim, shared, birth, blob }, kept in this browser
const KEY = "couveuse-v3";
function animDef(a) { const o = ANIMS[a].fx.meta.options; return { ...o, ...PER_DEF, palette: [...o.palette] }; }
function fresh() { return { anim: "life", life: lifeDef(), shared: { ...SHARED_DEF }, birth: animDef("birth"), blob: animDef("blob"), actions: actionDef(), objects: objectsDef(), loops: loopsDef(), clock: clockDef(), transform: transformDef() }; }
function clampInt(v, lo, hi) { v = Math.round(+v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo; }
// a saved store over its defaults: only the keys it still has (what disappeared is ignored)
const known = (def, saved) => Object.fromEntries(Object.entries(def).map(([k, d]) => [k, saved && typeof saved === "object" && k in saved ? saved[k] : d]));
function sanitize(v) {
  v = v && typeof v === "object" ? v : {};
  const f = fresh(), s = { anim: ANIMS[v.anim] ? v.anim : f.anim };
  for (const k of ["shared", "life", "birth", "blob", "actions", "objects", "loops", "clock", "transform"]) s[k] = known(f[k], v[k]);
  if (!ACTION_LIST.some((a) => a[0] === s.actions.action)) s.actions.action = f.actions.action;
  if (!LOOP_LIST.some((a) => a[0] === s.loops.loop)) s.loops.loop = f.loops.loop;
  // the palette an action takes (eight tones)
  if (!Array.isArray(s.actions.couleurPalette) || s.actions.couleurPalette.length !== 8) s.actions.couleurPalette = [...f.actions.couleurPalette];
  for (const o of [s.objects, s.life]) {
    if (!PFX.objects.APPEAR.includes(o.appearStyle)) o.appearStyle = f.objects.appearStyle;
    if (!PFX.objects.REMOVE.includes(o.removeStyle)) o.removeStyle = f.objects.removeStyle;
  }
  if (!TF_MODES.some((m) => m[0] === s.transform.mode)) s.transform.mode = f.transform.mode;
  if (!TF_FORMS.some((m) => m[0] === s.transform.form)) s.transform.form = f.transform.form;
  for (const k of ["tfStyle", "rvStyle"]) if (!PFX.transform.STYLES.includes(s.transform[k])) s.transform[k] = f.transform[k];
  if (!PFX.transform.LEGS.includes(s.transform.huLegs)) s.transform.huLegs = f.transform.huLegs;
  if (!PFX.transform.ARMS.includes(s.transform.huArms)) s.transform.huArms = f.transform.huArms;
  if (!PFX.transform.GR_ARMS.includes(s.transform.grArms)) s.transform.grArms = f.transform.grArms;
  if (!PFX.transform.GR_LOOKS.includes(s.transform.grLook)) s.transform.grLook = f.transform.grLook;
  // the creature in its form, where it stood; things an older save left elsewhere are gone
  const lh = s.life.hub || {};
  s.life.hub = { form: BODY_FORMS.some((x) => x[0] === lh.form) ? lh.form : "blob", pos: Array.isArray(lh.pos) && lh.pos.length === 2 ? lh.pos.map((v) => Math.round(+v) || 0) : [0, 0], look: PFX.life.lookIn(lh.look) };
  s.life.things = (Array.isArray(s.life.things) ? s.life.things : []).filter((th) => th && th.ob && !(th.linked && th.place != null && th.place !== "home")).map(({ id, ob }) => ({ id, ob }));
  if (!Array.isArray(s.objects.list)) s.objects.list = f.objects.list;
  s.objects.list = s.objects.list.filter((ob) => ob && typeof ob === "object").map((ob) => ({ ...OBJECT_DEF(), ...ob }));
  s.objects.nextId = Math.max(s.objects.nextId || 1, ...s.objects.list.map((ob) => ob.id + 1));
  for (const a of ["birth", "blob"]) if (!Array.isArray(s[a].palette) || s[a].palette.length !== 8) s[a].palette = [...f[a].palette];
  const sh = s.shared;
  if (!BODY_FORMS.some((f) => f[0] === sh.bodyForm)) sh.bodyForm = "blob";
  fixFit(s);
  sh.sceneW = clampInt(sh.sceneW, 16, 1920); sh.sceneH = clampInt(sh.sceneH, 16, 1920);
  if (!(sh.ratio in RATIOS)) sh.ratio = "libre";
  return s;
}
// the previous version kept one flat set of settings: it was the birth
function migrate(flat) {
  const shared = {}, birth = {};
  for (const [k, v] of Object.entries(flat)) (SHARED_KEYS.has(k) ? shared : birth)[k] = v;
  return { anim: "birth", shared, birth };
}
function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (v && typeof v === "object") return sanitize(v);
    const old = JSON.parse(localStorage.getItem("couveuse-v2") || "null");
    if (old && typeof old === "object") return sanitize({ ...migrate(old), anim: "blob" });
  } catch (e) {}
  return fresh();
}
let S = load();
S.anim = "life"; // the page opens on the creature's life
// V: what the current animation sees, the shared settings and its own together
let V = {};
// (the birth and the blob have their own look; every other page borrows the blob's)
const refreshV = () => (V = S.anim === "objects" ? objectsView() : S.anim === "birth" || S.anim === "blob" ? { ...S.shared, ...S[S.anim] } : { ...S.shared, ...S.blob, ...S[S.anim] });
refreshV();
// the actions tab borrows the blob's look, timing and place: only the action is its own
function setV(k, v) {
  if (S.anim === "life" && !SHARED_KEYS.has(k)) { (LIFE_KEYS.has(k) ? S.life : S.blob)[k] = v; V[k] = v; return; }
  if (S.anim === "transform" && !SHARED_KEYS.has(k)) { (TRANSFORM_KEYS.has(k) || k.startsWith("loops_") ? S.transform : S.blob)[k] = v; V[k] = v; return; }
  if (S.anim === "clock" && !SHARED_KEYS.has(k)) { (CLOCK_KEYS.has(k) ? S.clock : S.blob)[k] = v; V[k] = v; return; }
  if (S.anim === "loops" && !SHARED_KEYS.has(k)) { (LOOP_KEYS.has(k) ? S.loops : S.blob)[k] = v; V[k] = v; return; }
  if (S.anim === "objects" && !SHARED_KEYS.has(k)) {
    if (k.startsWith("ob_")) { const so = selObj(); if (so) so[k.slice(3)] = v; }
    else (OBJ_KEYS.has(k) || k.startsWith("loops_") ? S.objects : S.blob)[k] = v;
    V[k] = v;
    return;
  }
  const home = SHARED_KEYS.has(k) ? S.shared : S.anim === "actions" ? (ACTION_KEYS.has(k) ? S.actions : S.blob) : S[S.anim];
  home[k] = v; V[k] = v;
}
let saveT = 0;
function persist() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }, 300); }

// ---- controls
const $ = (id) => document.getElementById(id), controls = $("groups");
let inputs = {};
const fmt = (v, step, unit) => (step < 1 ? (+v).toFixed(step < 0.5 ? 2 : 1) : String(Math.round(v))) + unit;
const fmtRow = (k, v, step, unit) => {
  if (k === "posX") return `${(+v).toFixed(1)} % · ${Math.round((v / 100) * V.sceneW)} px`;
  if (k === "posY") return `${(+v).toFixed(1)} % · ${Math.round((v / 100) * V.sceneH)} px`;
  if (unit === " % de la scène") return `${(+v).toFixed(1)} % · ${Math.round((v / 100) * V.sceneH)} px`;
  if (k === "scale") return `${v}× · ${V.canvas * v} px`;
  if (k === "zoom") return +v === 0 ? "ajusté" : `${v}×`;
  if (unit === " % pos x") return `${(+v).toFixed(1)} % · ${Math.round((v / 100) * V.sceneW)} px`;
  if (unit === " % pos y") return `${(+v).toFixed(1)} % · ${Math.round((v / 100) * V.sceneH)} px`;
  if (k.startsWith("loops_") || k === "inLoops" || k === "outLoops") return `${v} × ${(+V.duration).toFixed(1)} s = ${(v * V.duration).toFixed(1)} s`;
  if (unit === " part") return `${Math.round(v * 100)} %`;
  if (unit === " % (sol)") return `${(+v).toFixed(1)} % · y = ${Math.round((v / 100) * V.sceneH)} px`;
  if (k === "lead") return `${Math.round(v * 100)} %`;
  return fmt(v, step, unit);
};
const openState = {};
function rowFor(rows, def) {
  const [k, label] = def, r = document.createElement("div");
  r.className = "row";
  if (typeof def[2] === "object") {
    const spec = def[2];
    if (spec.select) {
      r.innerHTML = `<label for="in-${k}"><span>${label}</span></label><div class="inline"><select id="in-${k}">${spec.select.map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select></div>`;
      const sel = r.querySelector("select");
      sel.onchange = () => { setV(k, sel.value); if (k === "part" || k === "clkSource" || k === "clkPos" || k === "tfStyle" || k === "rvStyle" || k === "grArms") buildControls(); changed(); };
      inputs[k] = { kind: "select", inp: sel };
    } else {
      r.innerHTML = `<label for="in-${k}"><span>${label}</span><output id="out-${k}"></output></label><div class="inline"><input type="color" id="in-${k}"></div>`;
      const c = r.querySelector("input"), out = r.querySelector("output");
      c.oninput = () => { setV(k, c.value); out.textContent = c.value; changed(); };
      inputs[k] = { kind: "color", inp: c, out };
    }
  } else {
    const [, , min, max, step, unit] = def;
    r.innerHTML = `<label for="in-${k}"><span>${label}</span><output id="out-${k}"></output></label><input type="range" id="in-${k}" min="${min}" max="${max}" step="${step}">`;
    const inp = r.querySelector("input"), out = r.querySelector("output");
    inputs[k] = { inp, out, step, unit };
    inp.oninput = () => { setV(k, +inp.value); out.textContent = fmtRow(k, inp.value, step, unit); if (k === "canvas") syncUI(); changed(); };
  }
  rows.appendChild(r);
}
function group(g, key, openDefault) {
  const d = document.createElement("details");
  d.open = openState[key] ?? openDefault;
  d.ontoggle = () => (openState[key] = d.open);
  d.innerHTML = `<summary>${g.title}<small>${g.hint}</small></summary><div class="rows"></div>`;
  return [d, d.querySelector(".rows")];
}
function buildControls() {
  controls.innerHTML = ""; inputs = {};
  const life = S.anim === "life";
  // the page: the creature's life, or the settings of one thing, opened from it, with the way back
  $("crumb").hidden = life; $("crumbName").textContent = life ? "" : pageName();
  $("topNote").textContent = life ? "Il vit sans jamais sauter d’image. Réinitialiser : il repart du repos, chez lui, sans objet."
    : "Ces réglages servent partout où il le fait. Réinitialiser ne remet qu’eux à zéro.";
  for (const id of ["exAll", "exGif", "exPng", "exJson"]) $(id).hidden = life;
  if (life) { lifeControls(); sceneGroup(); renderGroup(); wire(); syncUI(); return; }
  controls.insertAdjacentHTML("beforeend", `<h2 class="pagetitle">${pageName()}</h2>`);
  // (the move doesn't come back: it stays where it went)
  const own = S.anim === "actions" ? find("actions", V.action) : S.anim === "loops" ? find("loops", V.loop) : null;
  const intro = (own && own.intro) || PAGE_INTRO[S.anim];
  if (intro) controls.insertAdjacentHTML("beforeend", `<p class="note intro">${intro}</p>`);
  settingsGroups();
  sceneGroup();
  renderGroup();
  wire();
  syncUI();
}
// the scene, shared by every animation: its format and background (closed: set once)
function sceneGroup() {
  {
    const [d, rows] = group({ title: "Scène", hint: "format et fond" }, "scene", false);
    rows.innerHTML = `<div class="row"><label for="in-ratio"><span>Format de la scène</span><output id="out-scene"></output></label>
      <div class="inline"><select id="in-ratio">${Object.keys(RATIOS).map((k) => `<option value="${k}">${k === "libre" ? "Libre" : k.replace(":", " / ")}</option>`).join("")}</select></div>
      <div class="inline dims"><label class="dim">Largeur<input type="number" id="in-sw" min="16" max="1920" step="1" inputmode="numeric"></label><span aria-hidden="true">×</span><label class="dim">Hauteur<input type="number" id="in-sh" min="16" max="1920" step="1" inputmode="numeric"></label></div>
      <div class="inline sizes" id="sizes"></div></div>
      <div class="row"><label for="in-bg"><span>Fond de la scène</span></label><div class="inline"><select id="in-bg"><option value="black">Noir complet</option><option value="none">Transparent</option><option value="color">Couleur</option></select><input type="color" id="in-bgc" aria-label="Couleur du fond"></div><p class="note" id="bgnote"></p></div>`;
    controls.appendChild(d);
  }
}
// a settings page: its own groups (the creature's form for the preview first, where it has one)
function settingsGroups() {
  palKey = "palette";
  const groups0 = S.anim === "transform" ? transformGroups() : S.anim === "clock" ? clockGroups() : S.anim === "loops" ? loopGroups() : S.anim === "objects" ? objectGroups() : S.anim === "actions" ? actionGroups() : ANIMS[S.anim].groups;
  // the tabs that can draw a new form start with the choice of form
  const own = groups0.filter((g) => !(g.place && S.anim !== "blob" && S.anim !== "birth"));
  const off = FORM_TABS.has(S.anim) ? 1 : 0, groups = off ? [formGroup(), ...own] : own;
  groups.forEach((g, gk) => {
    const gi = gk - off, [d, rows] = group(g, g.key || S.anim + gi, g.open || (gi < 2 && (S.anim === "actions" || S.anim === "objects")) ? true : gi === 0);
    if (g.formPicker) formMarkup(rows);
    if (g.objlist) objListMarkup(rows);
    if (g.objanim) objAnimMarkup(rows);
    if (g.tfModes) tfModesMarkup(rows);
    if ((g.picker || g.pickerList) && COMPACT_PICK.has(S.anim)) {
      const list = g.pickerList || ACTION_LIST, pk = g.pickerKey || "action", r = document.createElement("div");
      r.className = "row";
      r.innerHTML = `<label for="in-pick"><span>Réglages de</span></label><div class="inline"><select id="in-pick">${list.map(([id, name]) => { const why = unfit(pk, id); return `<option value="${id}"${why ? " disabled" : ""}>${name}${why ? " (pas dans cette forme)" : ""}</option>`; }).join("")}</select></div>`;
      const sel = r.querySelector("select");
      sel.value = V[pk];
      sel.onchange = () => { setV(pk, sel.value); buildControls(); changed(); };
      rows.appendChild(r);
    } else if (g.picker || g.pickerList) {
      const list = g.pickerList || ACTION_LIST, pk = g.pickerKey || "action";
      const grid = document.createElement("div");
      grid.className = "actions"; grid.setAttribute("role", "radiogroup"); grid.setAttribute("aria-label", g.title);
      const nope = [];
      for (const [id, name, desc] of list) {
        const b = document.createElement("button"), why = unfit(pk, id);
        b.type = "button"; b.className = "act"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(id === V[pk]));
        b.innerHTML = `<strong>${name}</strong><span>${why ? "pas adaptable à cette forme" : desc}</span>`;
        // what its form can't do is shown, and can't be picked
        if (why) { b.disabled = true; b.title = why; nope.push([name, why]); }
        b.onclick = () => {
          if (V[pk] === id) return;
          setV(pk, id);
          // the transformation's form is the one the other tabs use, unless they use the blob
          if (S.anim === "transform" && pk === "form" && S.shared.bodyForm && S.shared.bodyForm !== "blob") { S.shared.bodyForm = id; fixFit(); }
          buildControls(); changed();
        };
        grid.appendChild(b);
      }
      rows.appendChild(grid);
      if (nope.length) rows.insertAdjacentHTML("beforeend", `<p class="note unfit">Pas adaptable ${{ blob: "au blob né", human: "à la forme humaine en lévitation", grounded: "à la forme humaine au sol" }[formNow()]} : ${nope.map(([n, w]) => `<b>${n}</b> — ${w.charAt(0).toLowerCase() + w.slice(1)}`).join(" ")}</p>`);
    }
    if (g.place) {
      const place = document.createElement("div");
      place.className = "row";
      place.innerHTML = `<div class="inline"><button type="button" id="center">Centrer</button><button type="button" id="fit">Ajuster à la scène</button><label class="check"><input type="checkbox" id="in-guides">Cadre et repères</label></div>
        <p class="note">${S.anim === "actions" && targetKeys(V.action).length ? "Glisse la créature pour la placer, et la cible pour choisir où va l’action." : "Glisse la créature dans l’aperçu pour la placer, ou utilise les flèches."}</p>`;
      rows.appendChild(place);
    }
    if (g.palette) {
      // (the key of the palette this group sets: the creature's, or an action's own)
      const pk = g.palette === true ? "palette" : g.palette;
      palKey = pk;
      const pr = document.createElement("div");
      pr.className = "presets";
      for (const [name, pal] of Object.entries(PRESETS)) {
        const b = document.createElement("button");
        b.className = "preset"; b.type = "button";
        const f = PFX.fit(pal, 8).map(PFX.toHex);
        b.innerHTML = `<i style="background:linear-gradient(90deg,${f.join(",")})"></i>${name}`;
        b.onclick = () => { setV(pk, f); syncPalette(); changed(); };
        pr.appendChild(b);
      }
      rows.appendChild(pr);
      const sw = document.createElement("div");
      sw.className = "swatches"; sw.id = "swatches";
      for (let i = 0; i < 8; i++) {
        const c = document.createElement("input");
        c.type = "color"; c.setAttribute("aria-label", `Teinte ${i + 1} sur 8, de la plus sombre à la plus claire`);
        c.oninput = () => { const p = [...V[pk]]; p[i] = c.value; setV(pk, p); changed(); };
        sw.appendChild(c);
      }
      rows.appendChild(sw);
      const n = document.createElement("p");
      n.className = "note"; n.textContent = "De la plus sombre à la plus claire : les dernières teintes font le cœur et la peau éclairée.";
      rows.appendChild(n);
    }
    for (const def of g.rows) if (rowShown(def[0])) rowFor(rows, def);
    if (g.gaitNote) rows.insertAdjacentHTML("beforeend", `<p class="note" id="gaitnote"></p>`);
    if (g.place) {
      const r = document.createElement("div");
      r.className = "row";
      r.innerHTML = `<label for="in-seed"><span>Graine</span></label><div class="inline"><input type="number" id="in-seed" min="0" max="99999" step="1"><button type="button" id="dice">Autre créature</button></div>`;
      rows.appendChild(r);
    }
    controls.appendChild(d);
  });
}
// the render and export settings, last in every tab
function renderGroup() {
  {
    const [d, rows] = group(RENDER, "render", false);
    for (const def of RENDER.rows) rowFor(rows, def);
    rows.insertAdjacentHTML("beforeend", `<div class="row"><label for="in-what"><span>Contenu exporté</span></label><div class="inline"><select id="in-what"><option value="scene">La scène entière</option><option value="creature">L’animation seule, sans fond</option></select></div><p class="note">Le JSON note toujours la taille de la scène et la place de l’animation, pour y ajouter les suivantes.</p></div>
      <div class="row"><label><span>Réglages</span></label><div class="inline"><button type="button" id="saveScene">Enregistrer les réglages</button><button type="button" id="loadScene">Ouvrir des réglages</button><input type="file" id="sceneFile" accept=".json,application/json" hidden></div><p class="note">Un seul fichier garde la scène et toutes les animations.</p></div>`);
    controls.appendChild(d);
  }
}

// scene format: a ratio keeps the height in step with the width
const SIZES = [320, 480, 640, 960, 1280];
function applyRatio(from) {
  const r = RATIOS[V.ratio];
  if (!r) return;
  if (from === "h") setV("sceneW", clampInt(V.sceneH * r, 16, 1920));
  else setV("sceneH", clampInt(V.sceneW / r, 16, 1920));
}
// wire a control if this tab has it
function on(id, ev, fn) { const el = $(id); if (el) el[ev] = fn; }
function wire() {
  on("backLife", "onclick", backToLife);
  on("toLife", "onclick", backToLife);
  on("in-ratio", "onchange", (e) => { setV("ratio", e.target.value); applyRatio("w"); syncUI(); changed(); });
  on("in-sw", "onchange", (e) => { setV("sceneW", clampInt(e.target.value, 16, 1920)); applyRatio("w"); syncUI(); changed(); });
  on("in-sh", "onchange", (e) => { setV("sceneH", clampInt(e.target.value, 16, 1920)); applyRatio("h"); syncUI(); changed(); });
  on("center", "onclick", () => { setV("posX", 50); setV("posY", 50); syncUI(); moved(); });
  on("fit", "onclick", () => { setV("scale", Math.max(1, Math.floor(Math.min(V.sceneW, V.sceneH) / (ANIMS[S.anim].mode === "scene" ? V.size * 6 : V.canvas)))); setV("posX", 50); setV("posY", 50); syncUI(); changed(); });
  on("in-guides", "onchange", (e) => { setV("guides", e.target.checked); shown = -1; persist(); });
  on("in-seed", "oninput", (e) => { setV("seed", Math.max(0, Math.floor(+e.target.value || 0))); changed(); });
  on("dice", "onclick", () => { setV("seed", Math.floor(Math.random() * 99999)); $("in-seed").value = V.seed; changed(); });
  on("in-bg", "onchange", (e) => { setV("bg", e.target.value); syncUI(); changed(); });
  on("in-bgc", "oninput", (e) => { setV("bgColor", e.target.value); changed(); });
  on("in-what", "onchange", (e) => { setV("exportWhat", e.target.value); persist(); });
  on("saveScene", "onclick", saveSettings);
  on("loadScene", "onclick", () => $("sceneFile").click());
  on("sceneFile", "onchange", openSettings);
}
$("reset").onclick = () => {
  if (S.anim === "life") { S.life = lifeDef(); LIFE = null; lifeSig = ""; refreshV(); buildControls(); changed(); say("Vivre : il repart du repos, chez lui, en blob né, sans objet."); return; }
  const f = fresh(); if (S.anim === "objects") { const keep = { list: S.objects.list, sel: S.objects.sel, nextId: S.objects.nextId }; S.objects = { ...f.objects, ...keep }; } else S[S.anim] = f[S.anim]; refreshV(); buildControls(); changed(); say(`${ANIMS[S.anim].name} : réglages d’origine.`); };

// the palette the swatches of this page show and set (the creature's, or an action's own)
let palKey = "palette";
function syncPalette() { const sw = $("swatches"); if (sw) [...sw.children].forEach((c, i) => (c.value = PFX.toHex(PFX.hex(V[palKey][i])))); accent(); }
function syncUI() {
  for (const [k, o] of Object.entries(inputs)) {
    if (o.kind === "select") o.inp.value = String(V[k]);
    else if (o.kind === "color") { o.inp.value = V[k]; o.out.textContent = V[k]; }
    else { o.inp.value = V[k]; o.out.textContent = fmtRow(k, V[k], o.step, o.unit); }
  }
  $("in-ratio").value = V.ratio; $("in-sw").value = V.sceneW; $("in-sh").value = V.sceneH;
  $("out-scene").textContent = `${V.sceneW} × ${V.sceneH} px`;
  const sz = $("sizes"), r = RATIOS[V.ratio];
  sz.innerHTML = "";
  if (r) for (const w of SIZES) {
    const b = document.createElement("button"), sw = r >= 1 ? w : Math.round(w * r);
    b.type = "button"; b.className = "chip" + (sw === V.sceneW ? " on" : "");
    b.textContent = r >= 1 ? `${w} × ${Math.round(w / r)}` : `${Math.round(w * r)} × ${w}`;
    b.onclick = () => { setV("sceneW", sw); applyRatio("w"); syncUI(); changed(); };
    sz.appendChild(b);
  }
  if ($("in-guides")) $("in-guides").checked = V.guides;
  if ($("in-seed")) $("in-seed").value = V.seed; $("in-bg").value = V.bg; $("in-bgc").value = V.bgColor; $("in-what").value = V.exportWhat;
  $("in-bgc").hidden = V.bg !== "color";
  $("bgnote").textContent = V.bg === "none" ? "La planche PNG garde la lueur en transparence. Le GIF ne connaît que le tout ou rien : la lueur douce y est coupée." : "";
  syncPalette();
}
// the interface borrows the creature's own light
function accent() {
  const c = PFX.toHex(PFX.hex(V.palette[5])), h = PFX.hex(V.palette[5]);
  document.documentElement.style.setProperty("--glow", c);
  document.documentElement.style.setProperty("--glow-soft", `rgba(${h & 255},${(h >> 8) & 255},${(h >> 16) & 255},0.22)`);
}

function edgeFade(f, EF = 8) {
  const { w, h, light: L } = f;
  for (let y = 0; y < h; y++) {
    const ey = Math.min(y, h - 1 - y);
    for (let x = 0; x < w; x++) {
      const e = Math.min(ey, x, w - 1 - x);
      if (e >= EF) { x = w - 1 - EF; continue; }
      const i = y * w + x, l = L[i];
      if (!(l & 0xffffff)) continue;
      const u = (e + 0.5) / EF, k = u * u * (3 - 2 * u);
      L[i] = (l & 0xff000000) | Math.round((l & 255) * k) | (Math.round(((l >>> 8) & 255) * k) << 8) | (Math.round(((l >>> 16) & 255) * k) << 16);
    }
  }
}

// ---- rendering. The birth is drawn in its own zone and laid into the scene; the blob and its actions are
// drawn across the whole scene, so a stroll or a jump can go anywhere. Either way scaled by whole pixels.
let N = 120, B = 176, SW = 480, SH = 270, E = ANIMS[S.anim].fx;
const view = $("view"), ctx = view.getContext("2d");
let img = null;
// how many of the blob's loops the page's animation lasts
const loopsOf = () => Math.max(1, Math.round(S.anim === "transform" ? V["loops_" + V.mode] || 2 : S.anim === "clock" ? V.loops || 3 : S.anim === "loops" ? PFX.loops.total(OPTS) / V.duration
  : S.anim === "actions" ? PFX.actions.total(OPTS) / V.duration : S.anim === "objects" ? V["loops_" + V.mode] || 1 : 1));
const loopLen = () => V.duration * loopsOf();
// an action is a whole number of the blob's loops, frame for frame
const nFrames = () => Math.max(2, Math.round(V.duration * V.fps)) * loopsOf();
function effOpts(src = V) {
  const o = { ...src };
  o.palette = src.palette.map((c) => PFX.toHex(PFX.hex(c)));
  if (Array.isArray(src.couleurPalette)) o.couleurPalette = src.couleurPalette.map((c) => PFX.toHex(PFX.hex(c)));
  // the creature's form: the blob, or the transformation's new form with that tab's settings (its floor in % of the
  // scene's height, as px below the spot; the scene's bounds for the floor)
  if (FORM_TABS.has(S.anim) && src === V) {
    o.form = formNow();
    if (o.form !== "blob") {
      for (const k of Object.keys(PFX.transform.FORM_DEFAULTS)) if (k in S.transform) o[k] = S.transform[k];
      o.liveLoops = Math.max(1, Math.round(+S.transform.loops_live || 2));
      const pl = placement(), g = grid();
      o.grFloor = ((S.transform.grFloor / 100) * SH - pl.cy) / V.scale;
      o.room = [-g.ox, -g.oy, g.fw - g.ox, g.fh - g.oy];
    }
  }
  if (S.anim === "clock" && src === V) {
    o.loops = loopsOf();
    [o.clkX, o.clkY] = clockSpot();
    for (const key of ["clkSeconds", "clkTick", "clkZero", "clkBlink", "clkBold"]) o[key] = +V[key];
    if (V.clkSource === "now") { const d = new Date(); o.clkH = d.getHours(); o.clkM = d.getMinutes(); o.clkS = d.getSeconds(); }
  }
  if (S.anim === "transform" && src === V) {
    o.loops = loopsOf(); o.liveLoops = Math.max(1, Math.round(V.loops_live || 2));
    // the floor of the grounded form, as how far below the blob's spot its top edge is; the scene's bounds in the
    // effect's own pixels (the floor spans the scene)
    const pl = placement(), k = V.scale, g = grid();
    o.grFloor = ((V.grFloor / 100) * SH - pl.cy) / k;
    o.room = [-g.ox, -g.oy, g.fw - g.ox, g.fh - g.oy];
  }
  if (S.anim === "loops" && src === V) {
    // the activity's own period; the part played (its entry and exit have their own lengths)
    o.loops = Math.max(1, Math.round(V["loops_" + V.loop] || 2)); o.part = loopPart();
    sceneUnits(o, "loops", placement(), V.scale);
  }
  if (S.anim === "objects" && src === V) {
    const pl = placement(), k = V.scale, list = S.objects.list;
    o.objects = list.map((ob) => ({ ...ob, x: ((ob.x / 100) * SW - pl.cx) / k, y: ((ob.y / 100) * SH - pl.cy) / k }));
    o.target = Math.max(0, list.findIndex((ob) => ob.id === S.objects.sel));
    o.loops = loopsOf();
    if (!list.length) o.mode = "live";
  }
  if (S.anim === "actions" && src === V) {
    const pl = placement(), k = V.scale;
    o.loops = V["loops_" + V.action] || 2;
    // the scene it must stay in with all its body (a move), and its settings set on the scene
    if (!o.room) { const g = grid(); o.room = [-g.ox, -g.oy, g.fw - g.ox, g.fh - g.oy]; }
    sceneUnits(o, "actions", pl, k);
  }
  return o;
}
let OPTS = effOpts();
function bgValue() { return V.bg === "none" ? null : V.bg === "color" ? PFX.hex(V.bgColor) : PFX.hex("#000000"); }
// where the creature sits: centred on the chosen point; its zone (for the birth) scaled by whole pixels
let posShift = [0, 0];
function placement() {
  const D = B * V.scale, cx = Math.round((V.posX / 100) * SW) + posShift[0], cy = Math.round((V.posY / 100) * SH) + posShift[1];
  return { D, cx, cy, x: cx - Math.floor(D / 2), y: cy - Math.floor(D / 2) };
}
// the coarse grid for scene-wide drawing, lined up so the creature's centre falls on the same scene pixel
function grid() {
  const k = V.scale, pl = placement();
  let gx = ((pl.cx % k) + k) % k, gy = ((pl.cy % k) + k) % k;
  if (gx) gx -= k;
  if (gy) gy -= k;
  return { k, gx, gy, fw: Math.ceil((SW - gx) / k), fh: Math.ceil((SH - gy) / k), ox: (pl.cx - gx) / k, oy: (pl.cy - gy) / k };
}
const FRAMES = {};
const frameOf = (w, h) => FRAMES[w + "x" + h] || (FRAMES[w + "x" + h] = PFX.createFrame(w, h));
function drawInto(f, x, y, fx, o, t) {
  PFX.clearFrame(f);
  const p = PFX.painterFor(f);
  p.place(x, y); p.lightK = o.light;
  p.layer = "back"; fx.drawBack(p, t, o);
  p.layer = "front"; fx.draw(p, t, o);
  edgeFade(f);
}
// nearest-neighbour blit of a sw x sh image into a w x h buffer at (x, y), k pixels a pixel
function blit(src, sw, sh, dst, w, h, x, y, k) {
  const x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(w, x + sw * k), y1 = Math.min(h, y + sh * k);
  const s32 = new Uint32Array(src.buffer), d32 = new Uint32Array(dst.buffer);
  for (let yy = y0; yy < y1; yy++) {
    const sy = (((yy - y) / k) | 0) * sw, oy = yy * w;
    for (let xx = x0; xx < x1; xx++) d32[oy + xx] = s32[sy + (((xx - x) / k) | 0)];
  }
}
function fillBg(buf, bg = bgValue()) {
  if (bg === null) return;
  new Uint32Array(buf.buffer).fill(((bg & 0xffffff) | 0xff000000) >>> 0);
}
// one frame of an animation as a scene-sized image (bg null: transparent)
function renderScene(anim, o, t, bg) {
  const out = new Uint8ClampedArray(SW * SH * 4), fx = ANIMS[anim].fx;
  fillBg(out, bg);
  if (ANIMS[anim].mode === "box") {
    const f = frameOf(B, B), pl = placement();
    drawInto(f, B / 2, B / 2, fx, o, t);
    blit(PFX.composite(f, new Uint8ClampedArray(B * B * 4), bg), B, B, out, SW, SH, pl.x, pl.y, V.scale);
  } else {
    const g = grid(), f = frameOf(g.fw, g.fh);
    drawInto(f, g.ox, g.oy, fx, o, t);
    blit(PFX.composite(f, new Uint8ClampedArray(g.fw * g.fh * 4), bg), g.fw, g.fh, out, SW, SH, g.gx, g.gy, g.k);
  }
  return out;
}
// the birth alone, at its zone's size, for the "alone" export
function renderBoxAlone(t) {
  const f = frameOf(B, B), D = B * V.scale, out = new Uint8ClampedArray(D * D * 4);
  drawInto(f, B / 2, B / 2, E, OPTS, t);
  blit(PFX.composite(f, new Uint8ClampedArray(B * B * 4), null), B, B, out, D, D, 0, 0, V.scale);
  return out;
}
let sceneCache = [];
const tAt = (i) => (i * loopLen()) / N;
function getScene(i) { return sceneCache[i] || (sceneCache[i] = renderScene(S.anim, OPTS, tAt(i), bgValue())); }
// walking or running: the speed it really goes and its strides (rounded so the loop is seamless)
function gaitNote() {
  const el = $("gaitnote");
  if (!el) return;
  const act = V.loop, g = PFX.loops.gaitOf(OPTS), run = act === "run", fr = (x, d = 1) => x.toFixed(d).replace(".", ",");
  if (!g) { el.textContent = ""; return; }
  const L = Math.max(1, Math.round(+V["loops_" + act] || 2)), P = L * V.duration, part = loopPart(), dur = part !== "loop" ? PFX.loops.total(OPTS) : 0;
  const how = part === "enter" ? `<b>Entrée</b> (${fr(dur)} s, il lui faut ce temps pour ses premiers pas) : face à nous, il se tourne de profil d’un quart de tour, puis ses ${run ? "foulées" : "pas"} grandissent jusqu’à cette allure, penché pour démarrer, et son sol se met à défiler. `
    : part === "exit" ? `<b>Sortie</b> (${fr(dur)} s) : ses ${run ? "foulées" : "pas"} raccourcissent, il se penche en arrière pour freiner, s’arrête et se retourne vers nous, au repos. ` : "";
  el.innerHTML = how + `Vitesse réelle : <b>${fr(g.kmh)} km/h</b>, ${2 * g.N} ${run ? "foulées" : "pas"} par boucle de ${fr(P)} s (cadence : ${fr(g.rate * 120, 0)} ${run ? "foulées" : "pas"} par minute). Il reste sur place : son sol de glace (reflets, empreintes) défile sous ses pieds exactement à la vitesse de ses pas, comme un tapis roulant. La vitesse et la cadence sont arrondies pour que la boucle soit parfaite (un nombre entier de foulées et d’écrans par boucle).`;
}
function rebuild() {
  E = ANIMS[S.anim].fx; SW = V.sceneW; SH = V.sceneH; B = V.canvas; OPTS = effOpts(); N = nFrames();
  gaitNote();
  if (view.width !== SW || view.height !== SH || !img) { view.width = SW; view.height = SH; img = ctx.createImageData(SW, SH); }
  sceneCache = [];
  $("scrub").max = N - 1;
  if (V.zoom > 0) { view.classList.remove("fit"); view.style.width = SW * V.zoom + "px"; }
  else { view.classList.add("fit"); view.style.width = ""; }
  $("wrap").classList.toggle("checker", V.bg === "none");
  $("scrub").hidden = S.anim === "life";
  if (S.anim === "life") {
    const sig = [SW, SH, V.posX, V.posY, V.scale, V.duration, V.light, JSON.stringify(V.palette)].join(), ps = [SW, SH, V.posX, V.posY, V.scale].join();
    // (its home spot moved, or the scene changed: it is at home again in it)
    if (placeSig && ps !== placeSig && S.life.hub) S.life.hub.pos = [0, 0];
    placeSig = ps;
    if (!LIFE || sig !== lifeSig) { lifeSig = sig; lifeStart(); }
  } else { LIFE = null; lifeSig = ""; }
}
let pending = false;
function changed() { pending = true; persist(); accent(); }
// recompose only: moving the creature doesn't redraw it
function moved() {
  if (S.anim !== "birth" && S.anim !== "blob") OPTS = effOpts();
  if (S.anim !== "life") { N = nFrames(); $("scrub").max = N - 1; }
  sceneCache = []; shown = -1; persist();
}

// ---- guides drawn over the preview only, never exported
function drawGuides() {
  if (!V.guides) return;
  const pl = placement();
  if (S.anim === "life") {
    // where the next thing will appear
    const x = Math.round((V.spotX / 100) * SW) + 0.5, y = Math.round((V.spotY / 100) * SH) + 0.5;
    ctx.save(); ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--glow").trim() || "#9fe0ff"; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke(); ctx.restore();
    return;
  }
  ctx.save();
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--glow").trim() || "#9fe0ff";
  ctx.globalAlpha = 0.7; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
  if (ANIMS[S.anim].mode === "box") ctx.strokeRect(pl.x + 0.5, pl.y + 0.5, pl.D - 1, pl.D - 1);
  if ((S.anim === "transform" && V.form === "grounded") || (FORM_TABS.has(S.anim) && formNow() === "grounded")) {
    const fy = pl.cy + PFX.transform.floorOf({ ...PFX.transform.FORM_DEFAULTS, ...OPTS }) * V.scale - 0.5;
    ctx.beginPath(); ctx.moveTo(0, fy); ctx.lineTo(SW, fy); ctx.stroke();
  }
  if (S.anim === "objects") {
    for (const ob of S.objects.list) {
      const x = Math.round((ob.x / 100) * SW) + 0.5, y = Math.round((ob.y / 100) * SH) + 0.5, r = ob.size * V.scale * 1.5 + 3;
      ctx.setLineDash(ob.id === S.objects.sel ? [] : [2, 3]);
      ctx.globalAlpha = ob.id === S.objects.sel ? 0.9 : 0.4;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.setLineDash([4, 3]); ctx.globalAlpha = 0.7;
  }
  for (const { p: tg } of targets()) {
    ctx.beginPath(); ctx.moveTo(pl.cx + 0.5, pl.cy + 0.5); ctx.lineTo(tg[0] + 0.5, tg[1] + 0.5); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 0.95;
    ctx.beginPath(); ctx.arc(tg[0] + 0.5, tg[1] + 0.5, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tg[0] - 9, tg[1] + 0.5); ctx.lineTo(tg[0] - 3, tg[1] + 0.5); ctx.moveTo(tg[0] + 4, tg[1] + 0.5); ctx.lineTo(tg[0] + 10, tg[1] + 0.5);
    ctx.moveTo(tg[0] + 0.5, tg[1] - 9); ctx.lineTo(tg[0] + 0.5, tg[1] - 3); ctx.moveTo(tg[0] + 0.5, tg[1] + 4); ctx.lineTo(tg[0] + 0.5, tg[1] + 10); ctx.stroke();
    ctx.setLineDash([4, 3]); ctx.globalAlpha = 0.7;
  }
  ctx.setLineDash([]); ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(pl.cx - 4, pl.cy + 0.5); ctx.lineTo(pl.cx + 5, pl.cy + 0.5);
  ctx.moveTo(pl.cx + 0.5, pl.cy - 4); ctx.lineTo(pl.cx + 0.5, pl.cy + 5);
  ctx.stroke();
  // thirds, to compose the scene
  ctx.globalAlpha = 0.18; ctx.setLineDash([2, 4]);
  ctx.beginPath();
  for (const f of [1 / 3, 2 / 3]) { ctx.moveTo(Math.round(SW * f) + 0.5, 0); ctx.lineTo(Math.round(SW * f) + 0.5, SH); ctx.moveTo(0, Math.round(SH * f) + 0.5); ctx.lineTo(SW, Math.round(SH * f) + 0.5); }
  ctx.stroke();
  ctx.restore();
}

// the current action's destination in scene pixels, if it has one
function targets() {
  const list = S.anim === "actions" ? targetKeys(V.action) : S.anim === "clock" && V.clkPos === "free" ? [["clkPX", "clkPY"]] : [];
  return list.map((tk) => ({ keys: tk, p: [Math.round((V[tk[0]] / 100) * SW), Math.round((V[tk[1]] / 100) * SH)] }));
}
// ---- drag the creature, or the action's destination, in the preview
function toScene(ev) {
  const r = view.getBoundingClientRect(), k = Math.min(r.width / SW, r.height / SH);
  const ox = (r.width - SW * k) / 2, oy = (r.height - SH * k) / 2;
  return [(ev.clientX - r.left - ox) / k, (ev.clientY - r.top - oy) / k];
}
let drag = null;
view.addEventListener("pointerdown", (ev) => {
  if (S.anim === "life") {
    const [x, y] = toScene(ev);
    setV("spotX", +Math.max(0, Math.min(100, (x / SW) * 100)).toFixed(2)); setV("spotY", +Math.max(0, Math.min(100, (y / SH) * 100)).toFixed(2));
    shown = -1; persist();
    return;
  }
  let tgHit = null;
  const [x, y] = toScene(ev), pl = placement(), tgs = targets(), hit = Math.max(10, 14 / (view.getBoundingClientRect().width / SW));
  const obHit = S.anim === "objects" ? [...S.objects.list].reverse().find((ob) => Math.hypot(x - (ob.x / 100) * SW, y - (ob.y / 100) * SH) <= Math.max(hit, ob.size * V.scale * 1.5 + 3)) : null;
  if (obHit) {
    drag = { obj: obHit.id, dx: (obHit.x / 100) * SW - x, dy: (obHit.y / 100) * SH - y };
    if (S.objects.sel !== obHit.id) { S.objects.sel = obHit.id; refreshV(); buildControls(); changed(); }
  } else if ((tgHit = tgs.find(({ p: tg }) => Math.hypot(x - tg[0], y - tg[1]) <= hit))) drag = { target: tgHit.keys, dx: tgHit.p[0] - x, dy: tgHit.p[1] - y };
  else {
    drag = { dx: pl.cx - x, dy: pl.cy - y };
    if (Math.hypot(x - pl.cx, y - pl.cy) > V.size * V.scale * 1.5) drag = { dx: 0, dy: 0 };
  }
  view.setPointerCapture(ev.pointerId);
  moveTo(ev);
});
view.addEventListener("pointermove", (ev) => { if (drag) moveTo(ev); });
view.addEventListener("pointerup", () => { if (drag && drag.obj) buildControls(); drag = null; });
view.addEventListener("pointercancel", () => { drag = null; });
function moveTo(ev) {
  const [x, y] = toScene(ev);
  const px = Math.max(0, Math.min(SW, Math.round(x + drag.dx))), py = Math.max(0, Math.min(SH, Math.round(y + drag.dy)));
  if (drag.obj) {
    const ob = S.objects.list.find((q) => q.id === drag.obj);
    if (ob) { ob.x = +((px / SW) * 100).toFixed(2); ob.y = +((py / SH) * 100).toFixed(2); V.ob_x = ob.x; V.ob_y = ob.y; }
    for (const k of ["ob_x", "ob_y"]) if (inputs[k]) { inputs[k].inp.value = V[k]; inputs[k].out.textContent = fmtRow(k, V[k], 0.1, k === "ob_x" ? " % pos x" : " % pos y"); }
    moved();
    return;
  }
  const keys = drag.target || ["posX", "posY"];
  setV(keys[0], +((px / SW) * 100).toFixed(2)); setV(keys[1], +((py / SH) * 100).toFixed(2));
  for (const k of keys) {
    if (!inputs[k]) continue; inputs[k].inp.value = V[k]; inputs[k].out.textContent = fmtRow(k, V[k], 0.1, " %"); }
  moved();
}
// arrows nudge it a pixel when the preview has focus
view.tabIndex = 0;
view.addEventListener("keydown", (ev) => {
  const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
  if (!d) return;
  ev.preventDefault();
  const m = ev.shiftKey ? 10 : 1, pl = placement();
  setV("posX", +(((Math.max(0, Math.min(SW, pl.cx + d[0] * m))) / SW) * 100).toFixed(2));
  setV("posY", +(((Math.max(0, Math.min(SH, pl.cy + d[1] * m))) / SH) * 100).toFixed(2));
  for (const k of ["posX", "posY"]) { inputs[k].inp.value = V[k]; inputs[k].out.textContent = fmtRow(k, V[k], 0.1, " %"); }
  moved();
});

// ---- the life tab (Vivre): the creature lives on, as it will in its own page. It plays every tab's animations with
// that tab's settings, each one from its rest back to a rest, on the beats of that rest (life/life.js), taking by itself
// the steps it needs (changing form...); its scene keeps what it makes. What it is asked waits its turn: nothing ever jumps.
const FORM_NAMES = { blob: "le blob né", human: "la forme humaine en lévitation", grounded: "la forme humaine au sol" };
const SHAPE_NAMES = Object.fromEntries(SHAPE_LIST);
const LIFE_KIND = { enter: " (il s’y met)", exit: " (il s’arrête)", loop: " (en boucle)" };
let LIFE = null, lifeBase = 0, lifeAt = 0, lifePaused = false, lifeLast = 0, lifeSig = "", lifeOpts = null, placeSig = "";
// a tab's options for its effect, as that tab builds them, for the creature in a given form (the life engine asks)
function optsAs(tab, pick, hub) {
  const keep = { anim: S.anim, V, SW, SH, B, form: S.shared.bodyForm, shift: posShift };
  try {
    S.anim = tab; S.shared.bodyForm = hub.form;
    refreshV(); Object.assign(V, pick);
    if (tab === "clock") V.clkSource = "now";
    SW = V.sceneW; SH = V.sceneH; B = V.canvas;
    // (where it stands now: its options are worked out from there, the scene seen from there)
    posShift = Array.isArray(hub.pos) ? [Math.round(hub.pos[0]) * V.scale, Math.round(hub.pos[1]) * V.scale] : [0, 0];
    return effOpts();
  } finally { S.anim = keep.anim; V = keep.V; SW = keep.SW; SH = keep.SH; B = keep.B; S.shared.bodyForm = keep.form; posShift = keep.shift; }
}
const lifeNow = () => (lifePaused ? lifeAt : lifeAt + ((performance.now() - lifeBase) / 1000) * (+V.speed || 1));
function lifeStart() {
  LIFE = PFX.life.createLife({ D: Math.max(0.5, +S.blob.duration || 4), optsFor: optsAs, hub: S.life.hub, look: blobLook(), things: S.life.things, t0: 0 });
  lifeOpts = { light: V.light ?? 1, life: LIFE };
  lifeBase = performance.now(); lifeAt = 0; lifePaused = false; shown = -1; lifeLast = 0;
  $("play").textContent = "Pause";
}
function lifeSave() { const s = PFX.life.snapshot(LIFE); S.life.hub = s.hub; S.life.things = s.things; persist(); }
// the creature's colours as the blob's page has them: the look the life follows (its rests take it on)
const blobLook = () => ({ palette: [...S.blob.palette], eyeColor: S.blob.eyeColor, pupilColor: S.blob.pupilColor });
const lookSig = (l) => [...l.palette, l.eyeColor, l.pupilColor].join();
// an action that changed the creature's look (its colours were `before`) sets the page's colours to the new look
function adoptLook(before) {
  const after = PFX.life.tailLook(LIFE);
  if (lookSig(after) === before) return;
  S.blob.palette = [...after.palette]; S.blob.eyeColor = after.eyeColor; S.blob.pupilColor = after.pupilColor;
  persist();
}
// the colours set by hand on the blob's page take effect at its next rest: once nothing else is asked beyond now
function lifeSync(t) {
  if (lookSig(blobLook()) === lookSig(PFX.life.tailLook(LIFE)) || !PFX.life.settled(LIFE, t)) return;
  PFX.life.want(LIFE, { id: "look", look: blobLook(), label: "change de couleur" }, t);
  lifeSave();
}
function lifeAsk(req) {
  if (!LIFE) lifeStart();
  const before = lookSig(PFX.life.tailLook(LIFE));
  const r = PFX.life.want(LIFE, req, lifeNow());
  if (!r.ok) say(r.why, true);
  else { adoptLook(before); lifeSave(); say(`Demandé : ${req.label || "c’est noté"}. Il le fera à son tour, sans saut.`); }
  lifeStatus();
}
function lifeStatus() {
  const el = $("lifeNow");
  if (!el || !LIFE) return;
  const t = lifeNow(), st = PFX.life.status(LIFE, t), h = st.hub;
  const doing = st.kind === "rest" ? "Il se repose." : `${st.label}${LIFE_KIND[st.kind] || ""}${st.loop ? " — jusqu’à ce que tu demandes autre chose" : ""}.`;
  const q = st.queue.filter((x, i) => !(x.kind === "loop" && st.queue[i - 1] && st.queue[i - 1].kind === "enter"));
  el.innerHTML = `<p><b>${doing}</b></p><p class="note">${FORM_NAMES[h.form]}.</p>`
    + (q.length ? `<p class="note">À suivre : ${q.map((x) => x.label + (x.kind === "enter" ? " (en boucle)" : x.kind === "exit" ? " (il s’arrête)" : "")).join(" → ")}</p>` : "");
  const stop = $("lifeStop");
  if (stop) stop.disabled = !(st.loop || (st.queue.length && st.queue[st.queue.length - 1].kind === "loop"));
  // what it can do after what it was asked, and why not
  document.querySelectorAll("[data-life]").forEach((b) => { const r = PFX.life.can(LIFE, JSON.parse(b.dataset.life)); b.disabled = !r.ok; b.title = r.ok ? "" : r.why; });
  const n = $("lifeThings");
  if (n) {
    const here = PFX.life.snapshot(LIFE).things;
    const key = here.map((th) => th.id).join();
    if (n.dataset.key !== key) {
      n.dataset.key = key;
      n.innerHTML = here.length ? "" : `<p class="note">Rien ici pour l’instant.</p>`;
      for (const th of here) {
        const b = document.createElement("button");
        b.type = "button"; b.className = "act";
        b.innerHTML = `<strong>${SHAPE_NAMES[th.ob.shape] || th.ob.shape} n° ${th.id}</strong><span>le faire disparaître</span>`;
        b.dataset.life = JSON.stringify({ id: "remove", thing: th.id });
        b.onclick = () => lifeAsk({ id: "remove", thing: th.id, label: `fait disparaître ${(SHAPE_NAMES[th.ob.shape] || "l’objet").toLowerCase()} n° ${th.id}`, pick: { removeStyle: S.life.removeStyle } });
        n.appendChild(b);
      }
    }
  }
  $("fcount").textContent = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
}
function lifeTick(now) {
  if (!LIFE) lifeStart();
  const t = lifeNow(), fps = +V.fps || 30, i = Math.floor(t * fps + 1e-6);
  lifeSync(t);
  if (i !== shown) {
    img.data.set(renderScene("life", lifeOpts, i / fps, bgValue()));
    ctx.putImageData(img, 0, 0);
    drawGuides();
    shown = i;
  }
  if (now - lifeLast > 250) { lifeLast = now; lifeStatus(); PFX.life.trim(LIFE, t); }
}
// a card that asks for something (greyed, with the reason, when it can't be done after what is already asked), and its
// gear: the settings page of that thing (its preview in a loop, its export)
function lifeButton(grid, req, name, desc, onclick, gear) {
  const card = document.createElement("div"), b = document.createElement("button");
  card.className = "lifecard";
  b.type = "button"; b.className = "act";
  if (req) b.dataset.life = JSON.stringify({ ...req, label: undefined });
  b.innerHTML = `<strong>${name}</strong><span>${desc}</span>`;
  b.onclick = onclick || (() => lifeAsk({ ...req, label: name }));
  card.appendChild(b);
  if (gear) {
    const g = document.createElement("button");
    g.type = "button"; g.className = "gear"; g.textContent = "⚙"; g.title = `Régler : ${name}`; g.setAttribute("aria-label", `Régler ${name}`);
    g.onclick = () => openPage(...gear);
    card.appendChild(g);
  }
  grid.appendChild(card);
  return b;
}
function lifeGrid(rows, label) { const g = document.createElement("div"); g.className = "actions"; g.setAttribute("aria-label", label); rows.appendChild(g); return g; }
// a plain button row (a settings page to open, an action of the page)
function lifeLinks(rows, links) {
  const r = document.createElement("div");
  r.className = "inline links";
  for (const [text, fn] of links) { const b = document.createElement("button"); b.type = "button"; b.textContent = text; b.onclick = fn; r.appendChild(b); }
  rows.appendChild(r);
}
// the cross (the point clicked in the scene), in px from the creature's home spot: where the next thing appears, where it goes
function lifeCross() {
  const pl = placement(), k = V.scale;
  return [Math.round(((S.life.spotX / 100) * SW - pl.cx) / k), Math.round(((S.life.spotY / 100) * SH - pl.cy) / k)];
}
function lifeControls() {
  controls.insertAdjacentHTML("beforeend", `<p class="note intro">Il <b>vit</b>, sans fin et sans jamais sauter d’image. Clique sur ce qu’il doit faire : il le fait à son tour, en partant de son repos et en y revenant, et prend de lui-même les étapes nécessaires. Les boucles durent jusqu’à ce que tu demandes autre chose. ⚙ ouvre les réglages d’une chose, avec son aperçu et son export en GIF.</p>`);
  {
    const [d, rows] = group({ title: "Maintenant", hint: "ce qu’il fait, ce qui suit" }, "life-now", true);
    rows.insertAdjacentHTML("beforeend", `<div class="lifenow" id="lifeNow" aria-live="polite"></div><div class="inline"><button type="button" id="lifeStop">Arrêter la boucle</button><button type="button" id="lifeClear">Vider la file</button></div>`);
    controls.appendChild(d);
  }
  const fam = (title, hint, key, list, family, open, note) => {
    const [d, rows] = group({ title, hint }, "life-" + key, open), grid = lifeGrid(rows, title);
    if (note) rows.insertAdjacentHTML("afterbegin", `<p class="note">${note}</p>`);
    for (const f of list) {
      const id = family === "clock" ? "clock" : `${family}:${f.id}`;
      // (an action that goes somewhere goes to the cross)
      lifeButton(grid, { id }, f.name, f.desc, f.kind === "move" ? () => lifeAsk({ id, to: lifeCross(), label: f.name }) : null,
        [family, family === "actions" ? { action: f.id } : family === "loops" ? { loop: f.id } : {}]);
    }
    controls.appendChild(d);
  };
  fam("Actions", "une fois, du repos au repos", "actions", FAMILIES.actions, "actions", true,
    "« Se déplacer » l’emmène jusqu’à la croix (clique dans la scène pour la placer) : il y reste, et fait la suite là-bas. Sous forme humaine au sol, il y va en marchant, de côté, le long de son sol.");
  fam("En boucle", "il s’y met, continue, s’arrête", "loops", FAMILIES.loops, "loops", true);
  fam("Heure", "il affiche l’heure qu’il est", "clock", [{ id: "clock", name: "Afficher l’heure", desc: "l’heure qu’il est, puis repos" }], "clock", false);
  {
    const [d, rows] = group({ title: "Forme", hint: "il se transforme" }, "life-form", false), grid = lifeGrid(rows, "Forme");
    for (const [id, name, desc] of BODY_FORMS) lifeButton(grid, { id: "form", form: id }, name, desc, () => lifeAsk({ id: "form", form: id, label: `devient ${FORM_NAMES[id]}` }));
    lifeLinks(rows, [["⚙ Régler le blob né", () => openPage("blob", {})], ["⚙ Régler les formes humaines", () => openPage("transform", { form: S.transform.form })]]);
    controls.appendChild(d);
  }
  {
    const [d, rows] = group({ title: "Objets", hint: "ils restent dans le décor" }, "life-objects", false);
    for (const def of [["shape", "Objet", { select: SHAPE_LIST }], ["obSize", "Taille", 4, 30, 0.5, " px"], ["obHue", "Teinte", 0, 360, 1, "°"],
      ["obLayer", "Plan", { select: [["back", "Derrière lui"], ["front", "Devant lui"]] }],
      ["appearStyle", "Il apparaît en", { select: OBJ_APPEAR }], ["removeStyle", "Il disparaît en", { select: OBJ_REMOVE }]]) rowFor(rows, def);
    rows.insertAdjacentHTML("beforeend", `<p class="note">Clique dans la scène pour choisir où le prochain objet apparaît (la croix ; « Se déplacer » y va aussi).</p>`);
    const grid = lifeGrid(rows, "Faire apparaître");
    lifeButton(grid, { id: "appear" }, "Faire apparaître", "à la croix", () => {
      const pl = placement(), k = V.scale, id = (LIFE ? LIFE.nextId : 1);
      const ob = { shape: S.life.shape, x: ((S.life.spotX / 100) * SW - pl.cx) / k, y: ((S.life.spotY / 100) * SH - pl.cy) / k, size: +S.life.obSize, spinY: 1, spinX: 0, tilt: 0.4,
        float: 4, floatTurns: 1, hue: +S.life.obHue, glow: 1, layer: S.life.obLayer, ph: (id * 0.37) % 1 };
      lifeAsk({ id: "appear", ob, label: `fait apparaître ${(SHAPE_NAMES[ob.shape] || "un objet").toLowerCase()}`, pick: { appearStyle: S.life.appearStyle } });
    }, ["objects", { mode: "appear" }]);
    rows.insertAdjacentHTML("beforeend", `<p class="note">Là où il est maintenant :</p><div class="actions" id="lifeThings"></div>`);
    controls.appendChild(d);
  }
  {
    const [d, rows] = group({ title: "Naissance", hint: "avant qu’il vive" }, "life-birth", false);
    lifeLinks(rows, [["⚙ Sa naissance", () => openPage("birth", {})]]);
    controls.appendChild(d);
  }
  {
    const pr = PLACE.rows.filter((r) => r[0] !== "canvas"), [d, rows] = group({ ...PLACE, rows: pr, hint: "où il vit dans la scène" }, "life-place", false);
    for (const def of pr) rowFor(rows, def);
    rows.insertAdjacentHTML("beforeend", `<div class="row"><div class="inline"><button type="button" id="center">Centrer</button><button type="button" id="fit">Ajuster à la scène</button><label class="check"><input type="checkbox" id="in-guides">Repères</label></div></div>`);
    controls.appendChild(d);
  }
  on("lifeStop", "onclick", () => lifeAsk({ id: "stop", label: "s’arrête" }));
  on("lifeClear", "onclick", () => { if (LIFE) { const before = lookSig(PFX.life.tailLook(LIFE)); PFX.life.clearQueue(LIFE, lifeNow()); adoptLook(before); lifeSave(); lifeStatus(); say("File vidée : il finit ce qu’il fait."); } });
  lifeStatus();
}

// ---- navigation: Vivre is the page; every other view is the settings of one thing, opened from it (⚙), with the way back
const COMPACT_PICK = new Set(["actions", "loops"]);
const PAGE_NAMES = { blob: "Blob né", birth: "Naissance", actions: "Action", loops: "En boucle", clock: "Heure", objects: "Apparition des objets", transform: "Formes humaines" };
const PAGE_INTRO = {
  blob: "Le blob né lui-même : la taille et la forme de son corps, ses mouvements au repos, ses yeux, sa lumière, ses couleurs. Toutes ses animations les gardent.",
  birth: "Sa naissance, avant qu’il vive : une forme sans membres qui se forme dans son halo. Elle ne fait pas partie de sa vie ; l’aperçu la montre en boucle.",
  actions: "Cette action part du repos et y revient : dans sa vie, elle s’enchaîne avec tout le reste. L’aperçu la montre en boucle ; tu peux l’exporter en GIF, en planche PNG ou en JSON.",
  loops: "Une activité en trois morceaux : l’entrée depuis le repos, la boucle, la sortie vers le repos (choisis le morceau à voir). Quand la forme humaine doit s’asseoir ou croiser les jambes, elle fond en lumière et reprend forme dans la nouvelle posture ; pour marcher ou courir, elle se tourne de profil d’un quart de tour.",
  clock: "Il affiche une heure puis revient au repos. Dans sa vie, il montre l’heure qu’il est.",
  objects: "Comment les objets apparaissent et disparaissent. L’aperçu le montre sur des objets d’essai ; dans sa vie, ce sont tes objets, qui restent dans le décor.",
  transform: "Ses formes humaines, faites de sa lumière : en lévitation, ou debout sur un sol de glace avec la gravité. La silhouette, la pose, les cheveux, le sol, et ses manières de se transformer et de redevenir blob. Dans sa vie, tout ce qu’il fait sous une forme humaine garde ces réglages.",
};
function pageName() {
  const a = S.anim, name = (list, id) => (list.find((x) => x[0] === id) || [id, id])[1];
  if (a === "actions") return `Action : ${name(ACTION_LIST, V.action)}`;
  if (a === "loops") return `En boucle : ${name(LOOP_LIST, V.loop)}`;
  return PAGE_NAMES[a] || ANIMS[a].name;
}
const FIT_KEY = { actions: "action", loops: "loop" };
function openPage(anim, pick = {}) {
  const key = FIT_KEY[anim], id = key && pick[key];
  if (anim === "actions" && id) S.actions.action = id;
  if (anim === "loops" && id) S.loops.loop = id;
  if (anim === "objects" && pick.mode) S.objects.mode = pick.mode;
  // the preview shows it in the form the creature is in now, when it can be done in that form
  if (FORM_TABS.has(anim)) {
    const form = (LIFE ? PFX.life.status(LIFE, lifeNow()).hub : S.life.hub).form;
    S.shared.bodyForm = key && id && unfit(key, id, form) ? "blob" : form;
  }
  S.anim = anim; refreshV(); buildControls(); changed();
  controls.scrollTop = 0;
  say(`Réglages : ${pageName()}. « Revenir à la vie » (ou Échap) pour le retrouver.`);
}
function backToLife() { if (S.anim === "life") return; S.anim = "life"; refreshV(); buildControls(); changed(); say("Il vit."); }
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && S.anim !== "life" && !(e.target && e.target.closest && e.target.closest("input, select, textarea"))) backToLife(); });

// ---- playback
let playing = true, t0 = performance.now(), shown = -1, scrubIdx = 0;
$("play").onclick = () => {
  if (S.anim === "life") {
    if (lifePaused) { lifeBase = performance.now(); lifePaused = false; } else { lifeAt = lifeNow(); lifePaused = true; }
    $("play").textContent = lifePaused ? "Lecture" : "Pause"; $("play").setAttribute("aria-label", $("play").textContent);
    return;
  }
  playing = !playing;
  $("play").textContent = playing ? "Pause" : "Lecture";
  $("play").setAttribute("aria-label", playing ? "Pause" : "Lecture");
  if (playing) t0 = performance.now() - (scrubIdx / N) * (loopLen() / V.speed) * 1000;
};
$("scrub").oninput = (e) => { scrubIdx = +e.target.value; if (playing) $("play").click(); };
function tick(now) {
  if (pending) { pending = false; rebuild(); shown = -1; }
  if (S.anim === "life") { lifeTick(now); requestAnimationFrame(tick); return; }
  let i = scrubIdx;
  if (playing) {
    const loop = (loopLen() / V.speed) * 1000;
    i = Math.floor((((now - t0) % loop) / loop) * N) % N;
    scrubIdx = i;
  }
  if (i !== shown) {
    img.data.set(getScene(i));
    ctx.putImageData(img, 0, 0);
    drawGuides();
    $("scrub").value = i;
    $("fcount").textContent = `${i + 1}/${N}`;
    shown = i;
  }
  requestAnimationFrame(tick);
}

// ---- export: the whole scene, or the creature alone on transparency at its scene size
const status = $("status");
const say = (m, err = false) => { status.textContent = m; status.classList.toggle("err", err); };
const nextPaint = () => new Promise((r) => setTimeout(r, 0));
const objName = () => { const so = selObj(); return V.mode === "live" || !so ? "objets-scene" : `objets-${V.mode === "appear" ? "apparition" : "disparition"}-${so.shape}-${so.id}`; };
const clockName = () => { const o = OPTS; return "heure-" + String(o.clkH).padStart(2, "0") + String(o.clkM).padStart(2, "0"); };
const tfName = () => `${{ transform: "transformation", live: "forme", revert: "retour" }[V.mode]}-${{ human: "humaine", grounded: "humaine-au-sol" }[V.form] || V.form}${V.mode === "live" ? "-boucle" : ""}`;
const base = () => `creature-glace-${S.anim === "transform" ? tfName() : S.anim === "clock" ? clockName() : S.anim === "loops" ? "boucle-" + V.loop + { loop: "", enter: "-entree", exit: "-sortie" }[loopPart()] : S.anim === "actions" ? "action-" + V.action : S.anim === "objects" ? objName() : ANIMS[S.anim].file}${{ human: "-humaine", grounded: "-humaine-au-sol" }[formNow()] || ""}-${V.seed}` + (V.exportWhat === "creature" ? "-seule" : "-scene");
function frameSize() { return V.exportWhat === "creature" && ANIMS[S.anim].mode === "box" ? [B * V.scale, B * V.scale] : [SW, SH]; }
async function allFrames(label) {
  const out = [], alone = V.exportWhat === "creature", box = ANIMS[S.anim].mode === "box";
  for (let i = 0; i < N; i++) {
    if (alone) out.push(box ? renderBoxAlone(tAt(i)) : renderScene(S.anim, OPTS, tAt(i), null));
    else out.push(getScene(i));
    if (i % 8 === 0) { say(`${label} : image ${i + 1} sur ${N}`); await nextPaint(); }
  }
  return out;
}
function sheetLayout() {
  const [fw, fh] = frameSize(), cols = Math.min(N, Math.max(1, Math.round(Math.sqrt((N * fh) / fw)) || 1));
  return { cols, rows: Math.ceil(N / cols), fw, fh };
}
const frameMs = () => (loopLen() / V.speed / N) * 1000;

async function makePng() {
  const { cols, rows, fw, fh } = sheetLayout();
  if (cols * fw > 16384 || rows * fh > 16384 || cols * fw * rows * fh > 2.5e8)
    throw { code: "sheet_big", message: `La planche ferait ${cols * fw} × ${rows * fh} px : trop grand pour un navigateur. Baisse les images par seconde, la durée ou la taille de la scène.` };
  const fr = await allFrames("Planche");
  const c = document.createElement("canvas"); c.width = cols * fw; c.height = rows * fh;
  const cx = c.getContext("2d"), im = cx.createImageData(fw, fh);
  fr.forEach((f, i) => { im.data.set(f); cx.putImageData(im, (i % cols) * fw, Math.floor(i / cols) * fh); });
  return await new Promise((r) => c.toBlob(r, "image/png"));
}
function sceneInfo() {
  const pl = placement();
  return {
    scene: { width: SW, height: SH, ratio: V.ratio, background: V.bg === "none" ? "transparent" : V.bg === "color" ? V.bgColor : "#000000" },
    creature: { center: [pl.cx, pl.cy], centerPercent: [V.posX, V.posY], scale: V.scale, ...(ANIMS[S.anim].mode === "box" ? { zone: B, box: { x: pl.x, y: pl.y, w: pl.D, h: pl.D } } : { drawnAcross: "scene" }) },
    ...(S.anim === "objects" ? { objects: S.objects.list.map((ob) => ({ id: ob.id, shape: ob.shape, center: [Math.round((ob.x / 100) * SW), Math.round((ob.y / 100) * SH)], centerPercent: [ob.x, ob.y], size: ob.size * V.scale, layer: ob.layer })),
      ...(V.mode !== "live" && selObj() ? { [V.mode === "appear" ? "appears" : "disappears"]: selObj().id } : {}) } : {}),
  };
}
function makeJson() {
  const { cols, rows, fw, fh } = sheetLayout(), name = base(), frames = [], ms = frameMs(), pl = placement();
  let acc = 0;
  for (let i = 0; i < N; i++) {
    const d = Math.round((i + 1) * ms) - Math.round(acc); acc += d;
    frames.push({ filename: `${name} ${i}`, frame: { x: (i % cols) * fw, y: Math.floor(i / cols) * fh, w: fw, h: fh }, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: fw, h: fh }, sourceSize: { w: fw, h: fh }, duration: d });
  }
  const alone = V.exportWhat === "creature";
  return JSON.stringify({ frames, meta: { app: "https://github.com/patch-gg/pixelfx", version: "2", image: `${name}.png`, format: "RGBA8888",
    size: { w: cols * fw, h: rows * fh }, scale: "1", frameTags: [{ name, from: 0, to: N - 1, direction: "forward" }],
    pixelfx: { id: ANIMS[S.anim].id, name: ANIMS[S.anim].fx.meta.name, animation: S.anim, content: alone ? "creature" : "scene",
      fps: +(N / (loopLen() / V.speed)).toFixed(3), loop: true, frames: N, frameSize: [fw, fh],
      ...(S.anim === "loops" ? { activity: V.loop, part: loopPart(), restLoops: loopsOf(), seamless: true,
        ...(loopPart() === "enter" ? { firstFrameIs: "rest", lastFrameIs: "the loop's last frame (the loop comes next)" } : loopPart() === "exit" ? { firstFrameIs: "the loop's first frame", lastFrameIs: "rest" } : {}) } : {}),
      ...(S.anim === "transform" ? { transformation: { form: V.form, animation: V.mode, style: V.mode === "revert" ? V.rvStyle : V.mode === "transform" ? V.tfStyle : null, ...(V.form === "grounded" ? { arms: V.grArms, floorY: Math.round(placement().cy + PFX.transform.floorOf(OPTS) * V.scale) } : { legs: V.huLegs, arms: V.huArms }) } } : {}),
      // in a new form: rest is that form's loop (Transformation > Forme en boucle), with that tab's settings
      ...(FORM_TABS.has(S.anim) ? { form: formNow(), ...(formNow() !== "blob" ? { restIs: "the new form's loop (Transformation, mode live)", newFormLoops: Math.max(1, Math.round(+S.transform.loops_live || 2)), ...(formNow() === "grounded" ? { floorY: Math.round(placement().cy + PFX.transform.floorOf({ ...PFX.transform.FORM_DEFAULTS, ...OPTS }) * V.scale) } : {}) } : {}) } : {}),
      ...(S.anim === "clock" ? { time: { h: OPTS.clkH, m: OPTS.clkM, s: OPTS.clkS, format: OPTS.clkFormat, center: [Math.round(placement().cx + OPTS.clkX * V.scale), Math.round(placement().cy + OPTS.clkY * V.scale)] } } : {}),
      ...(S.anim === "birth" || S.anim === "loops" ? {} : S.anim === "transform" ? { chain: { restFrames: Math.round(V.duration * V.fps), firstFrameIs: { transform: "rest", live: "new form", revert: "new form" }[V.mode], lastFrameIs: { transform: "new form", live: "new form", revert: "rest" }[V.mode], newFormLoops: Math.max(1, Math.round(V.loops_live || 2)), order: ["rest", "transform", "live…", "revert", "rest"] } } : { chain: { restFrames: N / loopsOf(), firstAndLastFrameAreRest: true, ...(S.anim === "actions" ? { action: V.action, restLoops: loopsOf() } : {}) } }),
      pivot: alone && ANIMS[S.anim].mode === "box" ? [Math.floor(pl.D / 2), Math.floor(pl.D / 2)] : [pl.cx, pl.cy],
      // where this layer goes in the scene, for the animations that come next
      placeAt: alone && ANIMS[S.anim].mode === "box" ? [pl.x, pl.y] : [0, 0],
      columns: cols, ...sceneInfo(), settings: { ...S } } } }, null, 1);
}

// GIF: one shared palette by median cut, LZW by hand
// median cut over a 15-bit histogram; each box keeps its own stats, so a split only measures the two halves
function medianCut(hist, max, reserve) {
  const cols = [];
  for (let k = 0; k < 32768; k++) if (hist[k]) cols.push(k);
  if (!cols.length) cols.push(0);
  const ch = (k, c) => (k >> (c * 5)) & 31;
  const stat = (b) => {
    let best = -1, bc = 0, w = 0;
    for (const k of b) w += hist[k];
    if (b.length > 1) for (let c = 0; c < 3; c++) {
      let lo = 31, hi = 0;
      for (const k of b) { const v = ch(k, c); if (v < lo) lo = v; if (v > hi) hi = v; }
      const sc = (hi - lo) * Math.sqrt(w);
      if (sc > best) { best = sc; bc = c; }
    }
    return { b, score: best, c: bc, w };
  };
  const boxes = [stat(cols)];
  while (boxes.length < max - reserve) {
    let bi = -1, best = 0;
    for (let i = 0; i < boxes.length; i++) if (boxes[i].score > best) { best = boxes[i].score; bi = i; }
    if (bi < 0) break;
    const { b, c, w } = boxes[bi];
    b.sort((x, z) => ch(x, c) - ch(z, c));
    let half = 0, cut = 1;
    for (let j = 0; j < b.length - 1; j++) { half += hist[b[j]]; cut = j + 1; if (half >= w / 2) break; }
    boxes.splice(bi, 1, stat(b.slice(0, cut)), stat(b.slice(cut)));
  }
  return boxes.map(({ b }) => {
    let r = 0, g = 0, bl = 0, w = 0;
    for (const k of b) { const n = hist[k] || 1; r += (k & 31) * n; g += ((k >> 5) & 31) * n; bl += ((k >> 10) & 31) * n; w += n; }
    return [Math.round((r / w) * 255 / 31), Math.round((g / w) * 255 / 31), Math.round((bl / w) * 255 / 31)];
  });
}
function lzw(ix, out) {
  const MIN = 8, CLEAR = 256, EOI = 257;
  let size = MIN + 1, next = EOI + 1, dict = new Map(), cur = 0, bits = 0, block = [];
  const emit = (code) => { cur |= code << bits; bits += size; while (bits >= 8) { block.push(cur & 255); cur >>>= 8; bits -= 8; if (block.length === 255) { out.push(255, ...block); block = []; } } };
  out.push(MIN);
  emit(CLEAR);
  let pre = ix[0];
  for (let i = 1; i < ix.length; i++) {
    const k = ix[i], key = pre * 256 + k, hit = dict.get(key);
    if (hit !== undefined) { pre = hit; continue; }
    emit(pre);
    if (next < 4096) { dict.set(key, next++); if (next > (1 << size) && size < 12) size++; }
    else { emit(CLEAR); dict = new Map(); size = MIN + 1; next = EOI + 1; }
    pre = k;
  }
  emit(pre); emit(EOI);
  if (bits > 0) block.push(cur & 255);
  if (block.length) out.push(block.length, ...block);
  out.push(0);
}
// GIF with a palette of its own on every frame, worked out from that frame alone: two GIFs whose frames
// match pixel for pixel encode those frames the same way, so chained loops join without a colour step
async function makeGif() {
  const transparent = V.bg === "none" || V.exportWhat === "creature", fr = await allFrames("GIF"), k = V.gifScale;
  const [fw, fh] = frameSize(), GW = fw * k, GH = fh * k;
  if (GW > 65535 || GH > 65535) throw { code: "too_large" };
  const q = (d, j) => (d[j] >> 3) | ((d[j + 1] >> 3) << 5) | ((d[j + 2] >> 3) << 10), first = transparent ? 1 : 0;
  const parts = [], head = [];
  const str = (a, s) => { for (const c of s) a.push(c.charCodeAt(0)); };
  const u16 = (a, v) => a.push(v & 255, (v >> 8) & 255);
  str(head, "GIF89a"); u16(head, GW); u16(head, GH); head.push(0x70, 0, 0); // no global palette
  head.push(0x21, 0xff, 11); str(head, "NETSCAPE2.0"); head.push(3, 1, 0, 0, 0); // loop forever
  parts.push(new Uint8Array(head));
  const ms = frameMs(); let acc = 0;
  const small = new Uint8Array(fw * fh), big = k === 1 ? small : new Uint8Array(GW * GH), hist = new Uint32Array(32768), lut = new Int16Array(32768);
  for (let f = 0; f < fr.length; f++) {
    const d = fr[f];
    hist.fill(0);
    for (let j = 0; j < d.length; j += 4) if (!transparent || d[j + 3] >= 128) hist[q(d, j)]++;
    const pal = medianCut(hist, 256, first);
    if (transparent) pal.unshift([0, 0, 0]);
    while (pal.length < 256) pal.push([0, 0, 0]);
    lut.fill(-1);
    const near = (key) => {
      const r = (key & 31) * 255 / 31, g = ((key >> 5) & 31) * 255 / 31, b = ((key >> 10) & 31) * 255 / 31;
      let bi = first, bd = Infinity;
      for (let i = first; i < 256; i++) { const p = pal[i], dd = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2; if (dd < bd) { bd = dd; bi = i; } }
      return bi;
    };
    for (let i = 0, j = 0; i < fw * fh; i++, j += 4) {
      if (transparent && d[j + 3] < 128) { small[i] = 0; continue; }
      const key = q(d, j); let v = lut[key]; if (v < 0) v = lut[key] = near(key); small[i] = v;
    }
    if (k > 1) for (let y = 0; y < GH; y++) { const sy = ((y / k) | 0) * fw, oy = y * GW; for (let x = 0; x < GW; x++) big[oy + x] = small[sy + ((x / k) | 0)]; }
    const cs = Math.max(2, Math.round(((f + 1) * ms) / 10) - Math.round(acc / 10)); acc += cs * 10;
    const out = [];
    out.push(0x21, 0xf9, 4, transparent ? (2 << 2) | 1 : 1 << 2); u16(out, cs); out.push(0, 0);
    out.push(0x2c); u16(out, 0); u16(out, 0); u16(out, GW); u16(out, GH); out.push(0x87); // local palette, 256 colours
    for (const p of pal) out.push(p[0], p[1], p[2]);
    lzw(big, out);
    parts.push(new Uint8Array(out));
    if (f % 4 === 0) { say(`GIF : encodage ${f + 1} sur ${fr.length}`); await nextPaint(); }
  }
  parts.push(new Uint8Array([0x3b]));
  return new Blob(parts, { type: "image/gif" });
}

// saving: through the viewer's download prompt when there is one, a plain link otherwise
let downloads;
async function getDownloads() {
  if (downloads !== undefined) return downloads;
  if (!window.claude || typeof window.claude.use !== "function") return (downloads = "link");
  try { downloads = (await window.claude.use("downloads")) || null; } catch (e) { downloads = null; }
  return downloads;
}
async function saveFile(filename, data) {
  const dl = await getDownloads();
  if (dl === "link") {
    const a = document.createElement("a"), url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  }
  if (!dl) throw { code: "unavailable" };
  await dl.save({ filename, data });
  return true;
}
const ERR = {
  declined: "Enregistrement refusé : rien n’a été téléchargé.",
  rate_limited: "Une autre demande d’enregistrement est ouverte. Termine-la, puis réessaie.",
  too_large: "Fichier trop lourd : baisse l’agrandissement du GIF ou la taille de la scène.",
};
const errText = (e) => (e && e.code === "sheet_big" ? e.message : ERR[e && e.code] || "Le téléchargement n’est pas disponible dans cette vue.");
const btns = () => ["exAll", "exGif", "exPng", "exJson", "saveScene"].map($).filter(Boolean);
async function run(jobs, done) {
  if (S.anim === "life") { say("Dans Vivre, la créature vit en direct. Pour un GIF, une planche ou un JSON, ouvre les réglages de l’animation (⚙)."); return; }
  btns().forEach((b) => (b.disabled = true));
  if (pending) { pending = false; rebuild(); }
  try {
    for (const [label, make, ext, name] of jobs) {
      const data = await make();
      say(`${label} prêt, enregistrement…`);
      await saveFile(`${name || base()}.${ext}`, data);
    }
    say(done || (jobs.length > 1 ? "Exporté : GIF, planche PNG et JSON." : `Exporté : ${jobs[0][0]}.`));
  } catch (e) { say(errText(e), true); }
  btns().forEach((b) => (b.disabled = false));
}
const J = { gif: ["GIF", makeGif, "gif"], png: ["Planche PNG", makePng, "png"], json: ["JSON", async () => makeJson(), "json"] };
$("exGif").onclick = () => run([J.gif]);
$("exPng").onclick = () => run([J.png]);
$("exJson").onclick = () => run([J.json]);
$("exAll").onclick = () => run([J.gif, J.png, J.json]);

// settings as a file: the scene and every animation in one, to reuse it; an exported JSON opens too
function saveSettings() { run([["Réglages", async () => JSON.stringify({ couveuse: 3, ...sceneInfo(), settings: S }, null, 1), "json", "couveuse-reglages"]], "Réglages enregistrés."); }
async function openSettings(e) {
  const f = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!f) return;
  try {
    const v = JSON.parse(await f.text()), set = v.settings || (v.meta && v.meta.pixelfx && v.meta.pixelfx.settings);
    if (!set || typeof set !== "object") throw 0;
    S = sanitize(set.shared ? set : migrate(set)); refreshV(); buildControls(); changed();
    say(`Réglages ouverts : scène ${V.sceneW} × ${V.sceneH} px, ${ANIMS[S.anim].name.toLowerCase()} affiché.`);
  } catch (err) { say("Ce fichier ne contient pas de réglages de la Couveuse. Choisis un JSON enregistré ou exporté ici.", true); }
}

buildControls(); rebuild(); requestAnimationFrame(tick);
})();
