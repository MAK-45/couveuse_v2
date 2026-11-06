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
const SHARED_DEF = { sceneW: 480, sceneH: 270, ratio: "16:9", bg: "black", bgColor: "#000000", zoom: 0, gifScale: 2, exportWhat: "scene", guides: true };
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
    name: "Naissance", fx: PFX.birth, file: "naissance", id: "spawn/ice-spirit-gestation",
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
    name: "Blob né", fx: PFX.blob, file: "blob", id: "creature/ice-blob-idle",
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
const ACTION_LIST = [
  ["walk", "Balade", "se promène et revient"],
  ["jump", "Saut", "bondit, saltos possibles"],
  ["aura", "Halo de lumière", "se charge de lumière"],
  ["morph", "Métamorphose", "prend une autre forme"],
  ["spin", "Tourbillon", "tourne sur lui-même"],
  ["split", "Dédoublement", "se divise, se rassemble"],
  ["burst", "Explosion de givre", "éclate et se reforme"],
  ["teleport", "Téléportation", "disparaît, réapparaît, revient"],
  ["nap", "Sieste", "s’endort, se réveille"],
  ["inflate", "Gonflement", "gonfle et se dégonfle"],
  ["dance", "Danse", "se déhanche en rythme"],
  ["scared", "Frayeur", "sursaute, recule, tremble"],
  ["freeze", "Gel", "se fige, des pics de glace"],
  ["drop", "Chute et rebonds", "tombe, rebondit, remonte"],
  ["rainbow", "Couleurs", "fait le tour des couleurs"],
  ["comet", "Comète", "file en grande boucle"],
  ["melt", "Fonte", "fond en flaque, se reforme"],
  ["curious", "Curiosité", "regarde, se penche, observe"],
  ["portal", "Portails", "passe d’un portail bleu à un orange"],
];
// how long each action lasts by default, in loops of the blob's rest
const LOOPS_DEF = { portal: 4, walk: 4, comet: 3, freeze: 3, drop: 3, melt: 3, scared: 3, curious: 3 };
// where a portal is set: the side it opens towards (degrees, y down)
const PORTAL_FACES = [["270", "Le sol (s’ouvre vers le haut)"], ["90", "Le plafond (s’ouvre vers le bas)"], ["0", "Un mur à gauche (s’ouvre vers la droite)"],
  ["180", "Un mur à droite (s’ouvre vers la gauche)"], ["315", "Une pente, vers le haut à droite"], ["225", "Une pente, vers le haut à gauche"],
  ["45", "Un surplomb, vers le bas à droite"], ["135", "Un surplomb, vers le bas à gauche"]];
const ACTION_PARAMS = {
  walk: [["walkRoute", "Trajet", { button: "Autre trajet" }],
    ["walkStops", "Nombre d’étapes", 1, 10, 1, ""], ["walkZoneW", "Largeur de la zone parcourue", 10, 100, 1, " % de la largeur"], ["walkZoneH", "Hauteur de la zone parcourue", 10, 100, 1, " % de la hauteur"],
    ["walkPause", "Temps passé aux arrêts", 0, 0.8, 0.01, " part"], ["walkCurve", "Trajets en courbe", 0, 1.5, 0.05, ""],
    ["walkLook", "Regarde autour aux arrêts", 0, 2, 0.05, ""], ["walkJoy", "Petits sauts de joie aux arrêts", 0, 1, 0.05, " part"],
    ["walkHops", "Petits bonds par trajet", 0, 8, 1, ""], ["walkHop", "Hauteur des bonds", 0, 16, 0.5, " px"], ["walkSquash", "Écrasement à chaque bond", 0, 2.5, 0.05, ""]],
  jump: [["jumpCount", "Nombre de sauts", 1, 6, 1, ""], ["jumpHeight", "Hauteur", 0, 100, 0.5, " % de la scène"], ["jumpFlips", "Saltos par saut", 0, 4, 1, ""],
    ["jumpAir", "Temps en l’air", 0.2, 0.9, 0.01, ""], ["jumpSquash", "Écrasement", 0, 2.5, 0.05, ""]],
  aura: [["auraPower", "Puissance", 0, 2.5, 0.05, ""], ["auraRadius", "Rayon du halo", 0.5, 3.5, 0.05, ""], ["auraPulses", "Ondes de lumière", 1, 8, 1, ""],
    ["auraRays", "Rayons", 0, 36, 1, ""], ["auraRise", "Élévation", 0, 60, 0.5, " % de la scène"],
    ["auraEyes", "Yeux pendant le halo", { select: [["closed", "Fermés, concentré"], ["open", "Ouverts"], ["happy", "Plissés, heureux"]] }]],
  morph: [["morphShape", "Forme", { select: [["star", "Étoile"], ["heart", "Cœur"], ["square", "Carré"], ["triangle", "Triangle"], ["hexagon", "Hexagone"], ["crystal", "Cristal à pointes"], ["drop", "Goutte"], ["flat", "Galette"], ["tall", "Colonne"]] }],
    ["morphAmount", "Force de la transformation", 0, 1, 0.01, ""], ["morphHold", "Temps sous cette forme", 0, 0.9, 0.01, ""],
    ["morphSpin", "Tours pendant la transformation", 0, 4, 1, ""], ["morphFlash", "Éclat de la transformation", 0, 2, 0.05, ""]],
  spin: [["spinTurns", "Nombre de tours", 1, 10, 1, ""], ["spinRise", "Élévation", 0, 60, 0.5, " % de la scène"], ["spinStretch", "Étirement", 0, 1, 0.01, ""],
    ["spinShrink", "Rétrécissement", 0, 0.7, 0.01, ""], ["spinTrail", "Traînée de lumière", 0, 2, 0.05, ""]],
  split: [["splitCount", "Nombre de copies", 2, 5, 1, ""], ["splitDistance", "Écartement", 0, 50, 0.5, " % de la scène"], ["splitOrbit", "Tours en orbite", 0, 3, 0.05, ""],
    ["splitShrink", "Rétrécissement des copies", 0, 0.7, 0.01, ""]],
  burst: [["burstShards", "Éclats", 4, 160, 1, ""], ["burstRadius", "Portée des éclats", 5, 100, 0.5, " % de la scène"], ["burstCharge", "Tremblement avant l’explosion", 0, 3, 0.05, ""],
    ["burstRing", "Onde de choc", 0, 2, 0.05, ""]],
  teleport: [["tpTX", "Destination horizontale", 0, 100, 0.5, " %"], ["tpTY", "Destination verticale", 0, 100, 0.5, " %"], ["tpHold", "Temps passé là-bas", 0, 0.6, 0.01, ""],
    ["tpFlash", "Colonne de lumière", 0, 2, 0.05, ""]],
  nap: [["napSink", "Affaissement", 0, 30, 0.5, " px"], ["napBreath", "Respiration endormie", 0, 3, 0.05, ""], ["napBubbles", "Bulles de sommeil", 0, 12, 1, ""],
    ["napDim", "Lumière qui baisse", 0, 1, 0.01, ""]],
  dance: [["danceBeats", "Temps de danse", 2, 32, 1, ""], ["danceAmp", "Amplitude du déhanché", 0, 30, 0.5, " % de la scène"], ["danceBounce", "Rebond", 0, 20, 0.5, " px"],
    ["danceWiggle", "Inclinaison", 0, 45, 1, "°"], ["danceSparkles", "Étincelles sur le rythme", 0, 2, 0.05, ""]],
  scared: [["scareSide", "Recule", { select: [["left", "Vers la gauche"], ["right", "Vers la droite"]] }], ["scareRetreat", "Distance du recul", 0, 50, 0.5, " % de la scène"],
    ["scareShake", "Tremblement", 0, 3, 0.05, ""], ["scareShrink", "Se fait petit", 0, 0.6, 0.01, ""], ["scareDrops", "Gouttes de peur", 0, 2, 0.05, ""]],
  freeze: [["freezeSpikes", "Pics de glace", 0, 40, 1, ""], ["freezeLength", "Longueur des pics", 0.2, 1.6, 0.05, ""], ["freezeHold", "Temps figé", 0, 0.7, 0.01, " part"],
    ["freezeTint", "Givre sur la peau", 0, 1.5, 0.05, ""], ["freezeShatter", "Éclat à la cassure", 0, 2, 0.05, ""]],
  drop: [["dropFloor", "Hauteur du sol", 40, 100, 0.5, " % (sol)"], ["dropBounces", "Rebonds", 1, 6, 1, ""], ["dropBounce", "Élasticité", 0.1, 0.85, 0.01, ""],
    ["dropSquash", "Écrasement à l’impact", 0, 2.5, 0.05, ""], ["dropDust", "Poussière de lumière", 0, 2, 0.05, ""]],
  rainbow: [["rainbowTurns", "Tours de couleurs", 1, 5, 1, ""], ["rainbowSat", "Intensité des couleurs", 0, 1.6, 0.05, ""], ["rainbowGlow", "Lueur", 0, 2, 0.05, ""],
    ["rainbowSparkles", "Étincelles", 0, 2, 0.05, ""]],
  comet: [["cometSide", "Part", { select: [["right", "Vers la droite"], ["left", "Vers la gauche"]] }], ["cometLoops", "Grandes boucles", 1, 4, 1, ""],
    ["cometRadius", "Taille des boucles", 5, 50, 0.5, " % de la scène"], ["cometTrail", "Queue de lumière", 0, 2, 0.05, ""], ["cometSpin", "Tourne avec la boucle", { select: [["1", "Oui"], ["0", "Non"]] }]],
  melt: [["meltDrop", "Descente vers le sol", 0, 40, 0.5, " % de la scène"], ["meltWidth", "Largeur de la flaque", 1.2, 3.2, 0.05, "×"], ["meltHold", "Temps en flaque", 0, 0.8, 0.01, " part"],
    ["meltRipples", "Ondes sur la flaque", 0, 6, 1, ""], ["meltEyes", "Yeux", { select: [["open", "Ouverts"], ["closed", "Fermés"], ["happy", "Plissés"]] }]],
  curious: [["curiousGlances", "Coups d’œil", 1, 8, 1, ""], ["curiousPeek", "Se penche jusqu’à", 0, 30, 0.5, " % de la scène"], ["curiousLean", "Inclinaison", 0, 0.8, 0.01, ""],
    ["curiousEyes", "Yeux qui s’écarquillent", 1, 2, 0.05, "×"]],
  portal: [["portalMode", "Trajet", { select: [["back", "Aller par les portails, retour par les portails"], ["fly", "Aller par les portails, retour en volant"], ["loop", "Chute sans fin à travers les portails"]] }],
    ["portalATX", "Portail bleu : horizontale", 0, 100, 0.5, " %"], ["portalATY", "Portail bleu : verticale", 0, 100, 0.5, " %"],
    ["portalAAngle", "Portail bleu : posé sur", { select: PORTAL_FACES }], ["portalColorA", "Portail bleu : couleur", { color: true }],
    ["portalBTX", "Portail orange : horizontale", 0, 100, 0.5, " %"], ["portalBTY", "Portail orange : verticale", 0, 100, 0.5, " %"],
    ["portalBAngle", "Portail orange : posé sur", { select: PORTAL_FACES }], ["portalColorB", "Portail orange : couleur", { color: true }],
    ["portalSize", "Taille des portails", 0.8, 3, 0.05, "× le blob"], ["portalDepth", "Ouverture (perspective)", 0.1, 0.8, 0.01, ""],
    ["portalShots", "Tire les portails", { select: [["1", "Oui, un tir de lumière"], ["0", "Non, ils s’ouvrent seuls"]] }],
    ["portalHold", "Temps passé de l’autre côté", 0, 0.6, 0.01, " part"], ["portalExit", "Distance à la sortie", 0.5, 5, 0.1, "× le blob"],
    ["portalLook", "Regarde autour à la sortie", 0, 2, 0.05, ""], ["portalArc", "Hauteur du vol de retour", 0, 6, 0.1, "× le blob"],
    ["portalLoops", "Passages (chute sans fin)", 1, 8, 1, ""], ["portalSwirl", "Tourbillon dans les portails", 0, 2, 0.05, ""],
    ["portalSparks", "Étincelles", 0, 3, 0.05, ""], ["portalGlow", "Lueur", 0, 2, 0.05, ""], ["portalSplash", "Éclat à l’ouverture", 0, 2, 0.05, ""]],
  inflate: [["inflateSize", "Taille gonflé", 1.1, 3, 0.05, "×"], ["inflateHold", "Temps gonflé", 0, 0.4, 0.01, ""], ["inflateJiggle", "Tremblement au dégonflage", 0, 2.5, 0.05, ""]],
};
function actionGroups() {
  const cur = ACTION_LIST.find((a) => a[0] === V.action) || ACTION_LIST[0];
  return [
    { title: "Action", hint: "choisis ce qu’il fait", picker: true, rows: [
      ["loops_" + cur[0], "Durée de l’action", 1, 8, 1, ""],
      ["lead", "Repos avant et après", 0, 0.3, 0.01, ""],
    ]},
    { title: cur[1], hint: "réglages de l’action", key: "actparams", rows: ACTION_PARAMS[cur[0]] },
    { ...PLACE, rows: PLACE.rows.filter((r) => r[0] !== "canvas"), hint: "la même que le blob né" },
  ];
}
ANIMS.actions = { name: "Actions", fx: PFX.actions, file: "action", id: "creature/ice-blob-actions", mode: "scene", groups: null };
ANIMS.birth.mode = "box"; ANIMS.blob.mode = "scene";
ANIMS.blob.groups[0] = { ...PLACE, rows: PLACE.rows.filter((r) => r[0] !== "canvas") };
const BLOB_KEYS = new Set(Object.keys(PFX.blob.meta.options));
const ACTION_KEYS = new Set(Object.keys(PFX.actions.meta.options).filter((k) => !BLOB_KEYS.has(k)));
// distances an action covers are set on the scene (points in %, lengths in % of the scene's height) and turned
// into the effect's own pixels when drawn, so the blob can reach any corner whatever the scene's size
const SCENE_ACTION_DEF = { walkZoneW: 90, walkZoneH: 70, tpTX: 85, tpTY: 25, jumpHeight: 30, splitDistance: 14, burstRadius: 28, auraRise: 5, spinRise: 5,
  danceAmp: 5, scareRetreat: 18, dropFloor: 92, cometRadius: 30, meltDrop: 10, curiousPeek: 8,
  portalATX: 30, portalATY: 86, portalBTX: 90, portalBTY: 40 };
for (const [id] of ACTION_LIST)
  SCENE_ACTION_DEF["loops_" + id] = LOOPS_DEF[id] || 2;
// lengths set in % of the scene's height, turned into the effect's own pixels
const SCENE_LENGTHS = ["jumpHeight", "splitDistance", "burstRadius", "auraRise", "spinRise", "danceAmp", "scareRetreat", "cometRadius", "meltDrop", "curiousPeek"];
for (const k of Object.keys(SCENE_ACTION_DEF)) ACTION_KEYS.add(k);
const actionDef = () => ({ ...Object.fromEntries([...ACTION_KEYS].filter((k) => k in PFX.actions.meta.options).map((k) => [k, PFX.actions.meta.options[k]])), ...SCENE_ACTION_DEF });
// where an action wants to go, as a scene point, if it has one
const TARGETS = { teleport: ["tpTX", "tpTY"], portal: [["portalATX", "portalATY"], ["portalBTX", "portalBTY"]] };
// an action's targets as a list of key pairs (one or more)
const targetKeys = (a) => { const t = TARGETS[a]; return !t ? [] : Array.isArray(t[0]) ? t : [t]; };
// ---- the objects tab: things the blob makes in its scene, which stay and float with it
ANIMS.objects = { name: "Objets", fx: PFX.objects, file: "objets", id: "creature/ice-scene-objects", mode: "scene", groups: null };
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
const APPEAR_ROWS = [
  ["appearStyle", "Manière", { select: [["halo", "Halo de lumière"], ["laser", "Laser qui le dessine"], ["crystal", "Cristaux qui s’assemblent"], ["portal", "Portail"], ["orb", "Orbe lancée par le blob"]] }],
  ["appearPower", "Intensité de la lumière", 0, 2.5, 0.05, ""], ["appearParticles", "Particules", 0, 80, 1, ""],
];
const REMOVE_ROWS = [
  ["removeStyle", "Manière", { select: [["dissolve", "Dissolution"], ["laser", "Laser qui l’efface"], ["implode", "Implosion"], ["shatter", "Éclats"], ["swallow", "Avalé par le blob"]] }],
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
ANIMS.loops = { name: "Boucles", fx: PFX.loops, file: "boucle", id: "creature/ice-blob-loops", mode: "scene", groups: null };
const LOOP_LIST = [
  ["sleep", "Sommeil", "dort, respire, bulles"], ["magic", "Magie", "cercle de runes, lumière"],
  ["conjure", "Objets magiques", "apparaissent, disparaissent"], ["juggle", "Jonglage", "lance et rattrape"],
  ["meditate", "Méditation", "s’élève, orbes, ondes"], ["dance", "Danse", "se déhanche sans fin"],
  ["bounce", "Rebonds", "saute sur place"], ["orbit", "Ronde", "vole en boucle"],
  ["sing", "Chanson", "se balance, notes de lumière"], ["bubbles", "Bulles", "souffle des bulles"],
  ["read", "Lecture", "un livre de lumière"], ["draw", "Dessin dans l’air", "trace une forme lumineuse"],
  ["rain", "Petit nuage", "il pleut sur lui"], ["stars", "Étoiles filantes", "regarde le ciel, s’émerveille"],
  ["hiccup", "Hoquet", "sursauts surprises"], ["top", "Toupie", "tourne sur lui-même"],
  ["swing", "Balançoire", "suspendu à un fil de lumière"], ["firefly", "Luciole", "joue avec une petite lumière"],
];
const SHAPE_OPTS = [["sphere", "Sphère"], ["cube", "Cube"], ["pyramid", "Pyramide"], ["crystal", "Cristal"], ["column", "Colonne"], ["gem", "Gemme"]];
const LOOP_PARAMS = {
  sleep: [["sleepBreaths", "Respirations par boucle", 1, 8, 1, ""], ["sleepDepth", "Profondeur du souffle", 0, 3, 0.05, ""], ["sleepSink", "Affaissement", 0, 30, 0.5, " px"],
    ["sleepBubbles", "Bulles de sommeil", 0, 10, 1, ""], ["sleepDim", "Lumière qui baisse", 0, 1, 0.01, ""], ["sleepTwitch", "Petit sursaut dans son sommeil", 0, 2, 0.05, ""]],
  magic: [["magicEyes", "Yeux", { select: [["closed", "Fermés, concentré"], ["open", "Ouverts"], ["happy", "Plissés"]] }], ["magicCircle", "Taille du cercle", 10, 90, 1, " px"],
    ["magicTurns", "Tours du cercle par boucle", 0, 4, 1, ""], ["magicRunes", "Runes", 0, 16, 1, ""], ["magicPulses", "Pulsations par boucle", 1, 8, 1, ""],
    ["magicSparkles", "Étincelles", 0, 80, 1, ""], ["magicRise", "Lévitation", 0, 40, 0.5, " px"], ["magicHue", "Teinte de la magie", 0, 360, 1, "°"]],
  conjure: [["conjureShape", "Objets", { select: [["cycle", "Toutes les formes, à tour de rôle"], ...SHAPE_OPTS] }],
    ["conjureStyle", "Ils s’en vont en", { select: [["halo", "Halo de lumière"], ["implode", "Implosion"], ["sparkle", "Poussière d’étoiles"]] }],
    ["conjureCount", "Objets par boucle", 1, 7, 1, ""], ["conjureHold", "Temps de présence", 0.1, 0.8, 0.01, " part"],
    ["conjureRadius", "Distance du blob", 20, 110, 1, " px"], ["conjureSize", "Taille des objets", 4, 24, 0.5, " px"]],
  juggle: [["juggleShape", "Objets", { select: [...SHAPE_OPTS, ["cycle", "Un de chaque"]] }], ["juggleCount", "Nombre d’objets", 2, 5, 1, ""],
    ["juggleThrows", "Tours par boucle", 1, 8, 1, ""], ["juggleHeight", "Hauteur des lancers", 10, 140, 1, " px"], ["juggleWidth", "Écart des mains", 6, 60, 1, " px"],
    ["juggleSize", "Taille des objets", 3, 14, 0.5, " px"]],
  meditate: [["medRise", "Lévitation", 0, 50, 0.5, " px"], ["medRings", "Ondes par boucle", 0, 6, 1, ""], ["medOrbs", "Orbes en orbite", 0, 12, 1, ""],
    ["medOrbit", "Rayon des orbes", 1, 3.5, 0.05, ""], ["medSpin", "Tours sur lui-même", 0, 3, 1, ""], ["medGlow", "Lueur", 0, 2.5, 0.05, ""]],
  dance: [["danceBeats", "Pas par boucle", 2, 16, 1, ""], ["danceAmp", "Amplitude", 0, 40, 0.5, " px"], ["danceBounce", "Rebond", 0, 20, 0.5, " px"],
    ["danceWiggle", "Inclinaison", 0, 45, 1, "°"], ["danceSparkles", "Étincelles", 0, 2, 0.05, ""]],
  bounce: [["bounceCount", "Sauts par boucle", 1, 10, 1, ""], ["bounceHeight", "Hauteur", 0, 140, 1, " px"], ["bounceFlips", "Saltos par saut", 0, 3, 1, ""],
    ["bounceSquash", "Écrasement", 0, 2.5, 0.05, ""], ["bounceDust", "Poussière de lumière", 0, 2, 0.05, ""]],
  orbit: [["orbitPath", "Trajet", { select: [["circle", "Cercle"], ["eight", "Huit"], ["infinity", "Infini"]] }], ["orbitSide", "Part", { select: [["right", "Vers la droite"], ["left", "Vers la gauche"]] }],
    ["orbitRX", "Largeur du vol", 2, 50, 0.5, " % de la largeur"], ["orbitRY", "Hauteur du vol", 2, 50, 0.5, " % de la hauteur"], ["orbitTurns", "Tours par boucle", 1, 4, 1, ""],
    ["orbitTrail", "Traînée de lumière", 0, 2, 0.05, ""], ["orbitBank", "S’incline dans les virages", 0, 2, 0.05, ""]],
  sing: [["singBeats", "Temps par boucle", 2, 16, 1, ""], ["singNotes", "Notes par boucle", 0, 16, 1, ""], ["singNoteSize", "Taille des notes", 1, 3, 1, "×"],
    ["singSway", "Balancement", 0, 20, 0.5, " px"], ["singBounce", "Rebond", 0, 12, 0.5, " px"], ["singHue", "Teinte des notes", 0, 360, 1, "°"]],
  read: [["readPages", "Pages tournées par boucle", 1, 8, 1, ""], ["readSize", "Taille du livre", 12, 60, 1, " px"], ["readGlow", "Lumière des pages", 0, 2.5, 0.05, ""],
    ["readNod", "Hoche la tête", 0, 2.5, 0.05, ""], ["readHue", "Teinte du livre", 0, 360, 1, "°"]],
  draw: [["drawShape", "Forme", { select: [["heart", "Cœur"], ["star", "Étoile"], ["spiral", "Spirale"], ["circle", "Cercle"], ["infinity", "Infini"]] }],
    ["drawSide", "Où", { select: [["right", "À sa droite"], ["left", "À sa gauche"], ["up", "Au-dessus de lui"]] }], ["drawCount", "Dessins par boucle", 1, 6, 1, ""],
    ["drawSize", "Taille du dessin", 6, 60, 1, " px"], ["drawHold", "Temps où le dessin brille", 0, 0.5, 0.01, " part"], ["drawHue", "Teinte du tracé", 0, 360, 1, "°"]],
  rain: [["rainMood", "Humeur", { select: [["happy", "Ravi, il danse sous la pluie"], ["sulk", "Boudeur, il se tasse"]] }], ["rainDrops", "Gouttes par boucle", 0, 160, 1, ""],
    ["rainCloud", "Taille du nuage", 8, 50, 1, " px"], ["rainHeight", "Hauteur du nuage", 8, 80, 1, " px"], ["rainSplash", "Éclaboussures", 0, 2, 0.05, ""], ["rainHue", "Teinte de la pluie", 0, 360, 1, "°"]],
  stars: [["starsShoot", "Étoiles filantes par boucle", 0, 8, 1, ""], ["starsCount", "Étoiles qui scintillent", 0, 160, 1, ""], ["starsArea", "Étendue du ciel", 40, 320, 1, " px"],
    ["starsTrail", "Longueur des traînées", 0.2, 3, 0.05, ""], ["starsWonder", "Émerveillement", 0, 2.5, 0.05, ""]],
  hiccup: [["hicCount", "Hoquets par boucle", 1, 8, 1, ""], ["hicStrength", "Force du sursaut", 0, 30, 0.5, " px"], ["hicSurprise", "Yeux surpris", 0, 2.5, 0.05, ""],
    ["hicBubble", "Petite bulle qui éclate", 0, 2, 0.05, ""]],
  top: [["topTurns", "Tours par boucle", 1, 16, 1, ""], ["topWobble", "Vacillement", 0, 1, 0.01, ""], ["topStretch", "Étalement", 0, 0.8, 0.01, ""],
    ["topDrift", "Glisse en rond", 0, 30, 0.5, " px"], ["topTrail", "Traînée de lumière", 0, 2, 0.05, ""]],
  swing: [["swingAngle", "Amplitude", 5, 80, 1, "°"], ["swingCount", "Allers-retours par boucle", 1, 6, 1, ""], ["swingLength", "Longueur du fil", 10, 140, 1, " px"],
    ["swingRope", "Fil de lumière", 0, 2, 0.05, ""]],
  firefly: [["flyCount", "Lucioles", 1, 3, 1, ""], ["flyTurns", "Tours par boucle", 1, 6, 1, ""], ["flyRadius", "Rayon de vol", 10, 90, 1, " px"],
    ["flyFollow", "Se penche pour la suivre", 0, 2.5, 0.05, ""], ["flyGlow", "Lueur", 0, 2.5, 0.05, ""], ["flyHue", "Teinte de la luciole", 0, 360, 1, "°"]],
  bubbles: [["bubbleSide", "Direction", { select: [["right", "Vers la droite"], ["left", "Vers la gauche"], ["up", "Vers le haut"]] }], ["bubbleCount", "Bulles par boucle", 1, 16, 1, ""],
    ["bubbleSize", "Taille des bulles", 2, 10, 0.5, " px"], ["bubbleDrift", "Distance parcourue", 10, 160, 1, " px"], ["bubblePop", "Éclat en éclatant", 0, 2, 0.05, ""]],
};
const LOOP_LOOPS = { conjure: 3, bounce: 1 };
const LOOP_KEYS = new Set(Object.keys(PFX.loops.meta.options).filter((k) => !(k in PFX.blob.meta.options)));
const loopsDef = () => {
  const d = Object.fromEntries([...LOOP_KEYS].map((k) => [k, PFX.loops.meta.options[k]]));
  d.orbitRX = 20; d.orbitRY = 15;
  for (const [id] of LOOP_LIST) d["loops_" + id] = LOOP_LOOPS[id] || 2;
  return d;
};
for (const k of Object.keys(loopsDef())) LOOP_KEYS.add(k);
function loopGroups() {
  const cur = LOOP_LIST.find((a) => a[0] === V.loop) || LOOP_LIST[0];
  return [
    { title: "Boucle", hint: "ce qu’il fait", pickerList: LOOP_LIST, pickerKey: "loop", rows: [["loops_" + cur[0], "Durée de la boucle", 1, 8, 1, ""]] },
    { title: cur[1], hint: "réglages", key: "loopparams", rows: LOOP_PARAMS[cur[0]] },
    { ...PLACE, rows: PLACE.rows.filter((r) => r[0] !== "canvas"), hint: "la même que le blob né" },
  ];
}
// ---- the clock tab: the blob shows the time, then is back at rest
ANIMS.clock = { name: "Heure", fx: PFX.clock, file: "heure", id: "creature/ice-blob-clock", mode: "scene", groups: null };
const CLOCK_KEYS = new Set(Object.keys(PFX.clock.meta.options).filter((k) => !(k in PFX.blob.meta.options)));
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
// ---- the electricity tab: the blob finds electricity and plays with it, for ever
ANIMS.elec = { name: "Électricité", fx: PFX.elec, file: "electricite", id: "creature/ice-blob-electric", mode: "scene", groups: null };
const ELEC_LIST = [
  ["discover", "Découverte", "une étincelle, il touche… zap !"], ["static", "Électricité statique", "hérissé, arcs sur la peau"],
  ["ball", "Boule d’énergie", "tient une boule de plasma"], ["charge", "Charge et décharge", "se concentre, tout explose"],
  ["poles", "Entre deux pôles", "le courant passe par lui"], ["chain", "Éclair en chaîne", "saute de cristal en cristal"],
  ["storm", "Orage", "un nuage, la foudre"], ["atom", "Atome", "des électrons tournent autour"],
];
const ELEC_PRESETS = {
  "Glace": ["#ffffff", "#8ff0ff", "#3c78ff"], "Foudre jaune": ["#fffbe0", "#ffe14a", "#ff8a1c"], "Plasma violet": ["#ffffff", "#d79bff", "#7a2cff"],
  "Rose néon": ["#fff0fb", "#ff6ad5", "#c2187a"], "Vert toxique": ["#f4ffe8", "#8dff6a", "#1fa83c"], "Rouge colère": ["#fff1e8", "#ff5a3c", "#b0101c"],
  "Blanc pur": ["#ffffff", "#e6f2ff", "#8aa6d6"],
};
const ELEC_STYLE = { title: "L’électricité", hint: "couleurs, allure des éclairs", key: "elstyle", open: true, elecPresets: true, rows: [
  ["elCore", "Cœur de l’éclair", { color: true }], ["elColor", "Couleur de l’arc", { color: true }], ["elGlow", "Couleur de la lueur", { color: true }],
  ["elTint", "Le blob prend la couleur du courant", 0, 1, 0.01, ""], ["elGlowAmt", "Intensité de la lueur", 0, 2.5, 0.05, ""],
  ["elFlicker", "Crépitement (formes par seconde)", 2, 30, 0.5, ""], ["elJag", "Zigzag des éclairs", 0, 0.6, 0.01, ""],
  ["elThick", "Épaisseur des éclairs", 1, 3, 1, " px"], ["elBranches", "Ramifications", 0, 3, 0.05, ""], ["elSparks", "Étincelles aux impacts", 0, 3, 0.05, ""],
]};
const ELEC_PARAMS = {
  discover: [["discMood", "Après le choc", { select: [["amused", "Il rit, ravi"], ["scared", "Les yeux ronds, surpris"]] }],
    ["discSide", "Où est l’étincelle", { select: [["alternate", "D’un côté puis de l’autre"], ["right", "À sa droite"], ["left", "À sa gauche"]] }],
    ["discCount", "Rencontres par boucle", 1, 6, 1, ""], ["discDist", "Distance de l’étincelle", 30, 120, 1, " px"], ["discSize", "Taille de l’étincelle", 0.4, 3, 0.05, "×"],
    ["discJolt", "Force du choc", 0, 2.5, 0.05, ""]],
  static: [["statArcs", "Arcs sur la peau", 0, 12, 1, ""], ["statLen", "Longueur des arcs", 0.2, 2, 0.05, ""], ["statGround", "Décharges vers le sol par boucle", 0, 8, 1, ""],
    ["statBristle", "Cheveux de lumière dressés", 0, 2.5, 0.05, ""], ["statPuff", "Gonflé, frémissant", 0, 2.5, 0.05, ""]],
  ball: [["ballPos", "Où", { select: [["above", "Au-dessus de lui"], ["right", "À sa droite"], ["left", "À sa gauche"]] }], ["ballSize", "Taille de la boule", 5, 40, 0.5, " px"],
    ["ballHeight", "Distance du blob", 0, 80, 1, " px"], ["ballTendrils", "Filaments dans la boule", 0, 16, 1, ""], ["ballSpin", "Tours des filaments par boucle", -4, 4, 1, ""],
    ["ballPulses", "Pulsations par boucle", 1, 8, 1, ""], ["ballArc", "Fil de courant vers le blob", 0, 1, 0.05, ""]],
  charge: [["chgCount", "Décharges par boucle", 1, 6, 1, ""], ["chgBolts", "Éclairs de la décharge", 0, 20, 1, ""], ["chgReach", "Portée des éclairs", 10, 160, 1, " px"],
    ["chgCrouch", "Se ramasse sur lui-même", 0, 2.5, 0.05, ""], ["chgShake", "Tremblement", 0, 3, 0.05, ""], ["chgFlash", "Éclair de lumière", 0, 2, 0.05, ""]],
  poles: [["polesShape", "Les pôles", { select: [["crystal", "Cristal"], ...SHAPE_OPTS.filter((s) => s[0] !== "crystal")] }], ["polesDist", "Écart des pôles", 30, 180, 1, " px"],
    ["polesHeight", "Hauteur des pôles", -60, 60, 1, " px"], ["polesSize", "Taille des pôles", 4, 20, 0.5, " px"], ["polesFlow", "Impulsions par boucle", 1, 12, 1, ""],
    ["polesSway", "Balancements par boucle", 0, 6, 1, ""]],
  chain: [["chainShape", "Objets", { select: [["cycle", "Toutes les formes"], ...SHAPE_OPTS] }], ["chainCount", "Nombre d’objets", 2, 8, 1, ""],
    ["chainRounds", "Éclairs par boucle", 1, 6, 1, ""], ["chainRadius", "Distance du blob", 30, 140, 1, " px"], ["chainSize", "Taille des objets", 3, 16, 0.5, " px"],
    ["chainHold", "Temps où la chaîne reste allumée", 0.05, 0.45, 0.01, " part"]],
  storm: [["stormMood", "La foudre", { select: [["catch", "Il l’attrape, ravi"], ["dodge", "Tombe à côté, il saute"]] }], ["stormStrikes", "Éclairs par boucle", 1, 8, 1, ""],
    ["stormHeight", "Hauteur du nuage", 10, 120, 1, " px"], ["stormCloud", "Taille du nuage", 10, 60, 1, " px"], ["stormRain", "Gouttes de pluie par boucle", 0, 160, 1, ""]],
  atom: [["atomRings", "Électrons", 1, 6, 1, ""], ["atomTurns", "Tours par boucle", 1, 6, 1, ""], ["atomRadius", "Rayon des orbites", 20, 120, 1, " px"],
    ["atomTrail", "Traînée", 0, 2.5, 0.05, ""], ["atomArcs", "Arcs vers le blob", 0, 3, 0.05, ""], ["atomRise", "Lévitation", 0, 30, 0.5, " px"]],
};
const ELEC_LOOPS = {};
const ELEC_KEYS = new Set(Object.keys(PFX.elec.meta.options).filter((k) => !(k in PFX.blob.meta.options)));
const elecDef = () => {
  const d = Object.fromEntries([...ELEC_KEYS].map((k) => [k, PFX.elec.meta.options[k]]));
  for (const [id] of ELEC_LIST) d["loops_" + id] = ELEC_LOOPS[id] || 3;
  return d;
};
for (const k of Object.keys(elecDef())) ELEC_KEYS.add(k);
function elecGroups() {
  const cur = ELEC_LIST.find((a) => a[0] === V.elec) || ELEC_LIST[0];
  return [
    { title: "Électricité", hint: "ce qu’il en fait", pickerList: ELEC_LIST, pickerKey: "elec", rows: [["loops_" + cur[0], "Durée de l’animation", 1, 8, 1, ""],
      ["lead", "Repos avant et après", 0, 0.3, 0.01, ""], ["elRamp", "Montée et descente de l’électricité", 0.02, 0.45, 0.01, " part"]] },
    { title: cur[1], hint: "réglages", key: "elecparams", open: true, rows: ELEC_PARAMS[cur[0]] },
    ELEC_STYLE,
    { ...PLACE, rows: PLACE.rows.filter((r) => r[0] !== "canvas"), hint: "la même que le blob né" },
  ];
}
// ---- the worlds tab: the places portals open onto. Each world is saved here, with its own settings
ANIMS.worlds = { name: "Mondes", fx: PFX.worlds, file: "monde", id: "creature/ice-worlds", mode: "scene", groups: null };
const WORLD_TYPE_LIST = [["space", "Espace", "étoiles lointaines, nébuleuse"]];
const worldTypeName = (t) => (WORLD_TYPE_LIST.find((x) => x[0] === t) || WORLD_TYPE_LIST[0])[1];
const WORLD_KEYS = new Set(Object.keys(PFX.worlds.SPACE));
const worldNew = (id, name, type = "space") => ({ id, name, ...PFX.worlds.DEFAULTS[type] });
const worldsDef = () => ({ list: [worldNew(1, "Espace profond")], sel: 1, nextId: 2 });
const selWorld = () => S.worlds.list.find((w) => w.id === S.worlds.sel) || S.worlds.list[0];
const worldById = (id) => S.worlds.list.find((w) => w.id === +id) || S.worlds.list[0];
const worldsView = () => ({ ...S.shared, ...S.blob, ...selWorld() });
// colour moods for a world: sky, nebula, its heart, the stars' tint
const WORLD_PRESETS = {
  "Glace": ["#000000", "#1a3f9a", "#6a35c8", "#9fe0ff", "#9fe0ff"], "Aurore": ["#000000", "#0f6a5a", "#2a8fd0", "#b8fff0", "#a8ffe0"],
  "Braise": ["#000000", "#8a2a12", "#c2185b", "#ffd08a", "#ffc070"], "Améthyste": ["#000000", "#4a1a8a", "#b0389a", "#f0b8ff", "#e0a8ff"],
  "Émeraude": ["#000000", "#0d5a2a", "#1f7a8c", "#c8ffb0", "#b0ffd0"], "Nuit pure": ["#000000", "#10204a", "#202a5a", "#8aa6d6", "#dcefff"],
};
const DIR_LIST = [["left", "Vers la gauche"], ["right", "Vers la droite"], ["up", "Vers le haut"], ["down", "Vers le bas"], ["upleft", "En haut à gauche"], ["upright", "En haut à droite"], ["downleft", "En bas à gauche"], ["downright", "En bas à droite"], ["none", "Immobile"]];
const WORLD_PARAMS = {
  space: [
    { title: "Couleurs", hint: "ciel, nébuleuse, étoiles", key: "wcol", open: true, worldPresets: true, rows: [
      ["wSky", "Fond de l’espace", { color: true }], ["wNebA", "Nébuleuse, première teinte", { color: true }], ["wNebB", "Nébuleuse, seconde teinte", { color: true }],
      ["wNebCore", "Cœur de la nébuleuse", { color: true }], ["wStarCol", "Étoiles", { color: true }], ["wStarTint", "Étoiles colorées", { color: true }]] },
    { title: "Nébuleuse", hint: "les nuages de lumière", key: "wneb", rows: [
      ["wNeb", "Intensité", 0, 2.5, 0.05, ""], ["wNebCover", "Étendue", 0, 1, 0.01, ""], ["wNebScale", "Taille des nuages", 24, 240, 1, " px"],
      ["wNebSteps", "Paliers de couleur", 2, 8, 1, ""], ["wNebDither", "Tramage entre les paliers", 0, 1.5, 0.05, ""], ["wNebMix", "Part de la seconde teinte", 0, 1, 0.01, ""],
      ["wNebWarp", "Tourbillons", 0, 2.5, 0.05, ""], ["wNebMorph", "Mouvements par boucle du monde", 0, 4, 1, ""], ["wNebGlow", "Lueur", 0, 2.5, 0.05, ""]] },
    { title: "Étoiles", hint: "trois profondeurs", key: "wstars", rows: [
      ["wFar", "Étoiles lointaines", 0, 600, 1, ""], ["wMid", "Étoiles moyennes", 0, 200, 1, ""], ["wNear", "Étoiles proches", 0, 60, 1, ""],
      ["wBright", "Étoiles brillantes à rayons", 0, 16, 1, ""], ["wSpikes", "Longueur des rayons", 0, 2.5, 0.05, ""], ["wTwinkle", "Scintillement", 0, 8, 1, ""],
      ["wStarGlow", "Lueur des étoiles", 0, 2.5, 0.05, ""], ["wSeed", "Disposition (graine)", 0, 999, 1, ""]] },
    { title: "Mouvement", hint: "filantes, voyage, caméra", key: "wmove", rows: [
      ["wShoot", "Étoiles filantes par boucle", 0, 10, 1, ""], ["wShootLen", "Longueur des étoiles filantes", 0.3, 3, 0.05, "×"], ["wDust", "Poussière d’étoiles proche", 0, 160, 1, ""],
      ["wDrift", "Vitesse du voyage", 0, 6, 1, ""], ["wDir", "Les étoiles défilent", { select: DIR_LIST }], ["wParallax", "Profondeur (parallaxe)", 0, 2, 0.05, ""],
      ["wCamX", "Caméra, horizontale", -400, 400, 1, " px"], ["wCamY", "Caméra, verticale", -400, 400, 1, " px"]] },
    { title: "Temps", hint: "la boucle du monde", key: "wtime", open: true, rows: [["wLoops", "Durée de la boucle du monde", 1, 12, 1, " × boucle du blob"]] },
  ],
};
function worldGroups() {
  const w = selWorld();
  return [
    { title: "Mes mondes", hint: `${S.worlds.list.length} monde${S.worlds.list.length > 1 ? "s" : ""}`, key: "wlist", open: true, worldList: true, rows: [] },
    { title: "Type de monde", hint: worldTypeName(w.wType), key: "wtype", pickerList: WORLD_TYPE_LIST, pickerKey: "wType", rows: [] },
    ...(WORLD_PARAMS[w.wType] || WORLD_PARAMS.space),
  ];
}
function worldListMarkup(rows) {
  const w = selWorld();
  rows.insertAdjacentHTML("beforeend", `<div class="row"><label for="in-wname"><span>Nom du monde</span></label><div class="inline"><input type="text" id="in-wname" maxlength="40" value=""></div></div>`);
  const nm = rows.querySelector("#in-wname");
  nm.value = w.name;
  nm.oninput = () => { w.name = nm.value.trim() || "Sans nom"; const b = rows.querySelector(`[data-wid="${w.id}"] strong`); if (b) b.textContent = w.name; persist(); };
  const ul = document.createElement("div");
  ul.className = "objlist";
  for (const x of S.worlds.list) {
    const r = document.createElement("div");
    r.className = "obj" + (x.id === w.id ? " on" : ""); r.dataset.wid = x.id;
    r.innerHTML = `<button type="button" class="objpick" aria-pressed="${x.id === w.id}"><strong></strong><span>${worldTypeName(x.wType)} · boucle de ${x.wLoops} × ${(+S.blob.duration).toFixed(1)} s</span></button><button type="button" class="objdel" aria-label="Supprimer ce monde">Supprimer</button>`;
    r.querySelector("strong").textContent = x.name;
    r.querySelector(".objpick").onclick = () => { S.worlds.sel = x.id; refreshV(); buildControls(); changed(); };
    r.querySelector(".objdel").onclick = () => removeWorld(x.id);
    ul.appendChild(r);
  }
  rows.appendChild(ul);
  rows.insertAdjacentHTML("beforeend", `<div class="row"><div class="inline"><button type="button" id="wNew">Nouveau monde</button><button type="button" id="wDup">Dupliquer</button><button type="button" id="wSave">Enregistrer en fichier</button><button type="button" id="wOpen">Ouvrir un fichier</button><input type="file" id="wFile" accept=".json,application/json" hidden></div>
    <p class="note">Tes mondes sont gardés dans ce navigateur et dans « Enregistrer les réglages ». Glisse dans l’aperçu pour déplacer la caméra : les étoiles proches défilent plus vite que les lointaines.</p></div>`);
  rows.querySelector("#wNew").onclick = () => addWorld();
  rows.querySelector("#wDup").onclick = () => addWorld({ ...selWorld(), name: selWorld().name + " (copie)" });
  rows.querySelector("#wSave").onclick = () => { const x = selWorld(); run([["Monde", async () => JSON.stringify({ couveuseWorld: 1, world: x }, null, 1), "json", "monde-" + slug(x.name)]], `Monde « ${x.name} » enregistré.`); };
  rows.querySelector("#wOpen").onclick = () => rows.querySelector("#wFile").click();
  rows.querySelector("#wFile").onchange = openWorldFile;
}
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "monde";
function addWorld(from) {
  const id = S.worlds.nextId++, w = from ? { ...from, id } : worldNew(id, `Monde ${id}`);
  if (!from) w.wSeed = Math.floor(Math.random() * 999);
  S.worlds.list.push(w); S.worlds.sel = id;
  refreshV(); buildControls(); changed();
  say(`Monde « ${w.name} » créé.`);
}
function removeWorld(id) {
  if (S.worlds.list.length <= 1) { say("Il faut garder au moins un monde.", true); return; }
  const i = S.worlds.list.findIndex((w) => w.id === id), [w] = S.worlds.list.splice(i, 1);
  if (S.worlds.sel === id) S.worlds.sel = S.worlds.list[Math.max(0, i - 1)].id;
  if (S.portal.pWorld === id) S.portal.pWorld = S.worlds.list[0].id;
  refreshV(); buildControls(); changed();
  say(`Monde « ${w.name} » supprimé.`);
}
async function openWorldFile(e) {
  const f = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!f) return;
  try {
    const v = JSON.parse(await f.text()), w = v.world || (v.meta && v.meta.pixelfx && v.meta.pixelfx.world);
    if (!w || typeof w !== "object" || !PFX.worlds.DEFAULTS[w.wType || "space"]) throw 0;
    addWorld({ ...PFX.worlds.DEFAULTS[w.wType || "space"], ...w, name: String(w.name || "Monde importé").slice(0, 40) });
  } catch (err) { say("Ce fichier ne contient pas de monde de la Couveuse.", true); }
}
// ---- the portal tab: the blob opens a portal onto a world, keeps it open, closes it
ANIMS.portal = { name: "Portail", fx: PFX.portal, file: "portail", id: "creature/ice-blob-portal", mode: "scene", groups: null };
const PORTAL_MODES = [["open", "Création", "le blob ouvre le portail"], ["live", "Portail ouvert", "il reste là, le monde vit"], ["close", "Fermeture", "le blob le referme"]];
const portalDef = () => {
  const d = Object.fromEntries(Object.entries(PFX.portal.meta.options).filter(([k]) => !(k in PFX.blob.meta.options) && !["world", "room", "loops", "pX", "pY", "pH"].includes(k)));
  return { ...d, loops_open: 2, loops_close: 2, ptX: 76, ptY: 44, ptSize: 46, pWorld: 1 };
};
const PORTAL_KEYS = new Set(Object.keys(portalDef()));
const PORTAL_ROWS = [
  ["pWorld", "Monde de l’autre côté", { worlds: true }],
  ["ptX", "Position horizontale", 0, 100, 0.1, " % pos x"], ["ptY", "Position verticale", 0, 100, 0.1, " % pos y"],
  ["ptSize", "Hauteur", 4, 100, 0.5, " % de la hauteur"], ["pRatio", "Largeur par rapport à la hauteur", 0.2, 2, 0.01, "×"],
  ["pShape", "Forme", { select: [["oval", "Ovale"], ["circle", "Cercle"], ["arch", "Arche (porte)"], ["rift", "Faille"], ["diamond", "Losange"]] }],
  ["pLayer", "Plan", { select: [["back", "Derrière le blob"], ["front", "Devant le blob"]] }],
  ["pViewX", "Cadrage du monde, horizontal", -300, 300, 1, " px"], ["pViewY", "Cadrage du monde, vertical", -300, 300, 1, " px"],
];
const PORTAL_LOOK = [
  ["pHue", "Teinte du bord", 0, 360, 1, "°"], ["pRim", "Épaisseur du bord", 1, 6, 1, " px"], ["pFlames", "Flammèches d’énergie", 0, 2.5, 0.05, ""],
  ["pWobble", "Bord qui ondule", 0, 3, 0.05, ""], ["pSwirl", "Tours de l’énergie par boucle du monde", 0, 8, 1, ""], ["pGlow", "Lueur", 0, 2.5, 0.05, ""],
  ["pLip", "Bord intérieur sombre", 0, 3, 1, " px"], ["pLens", "Effet de loupe sur les bords", 0, 2, 0.05, ""],
  ["pSparks", "Étincelles autour", 0, 40, 1, ""], ["pLeak", "Poussière du monde qui s’échappe", 0, 40, 1, ""],
];
const OPEN_ROWS = [
  ["openStyle", "Manière", { select: [["tear", "Déchirure : une fente qui s’ouvre"], ["spiral", "Tourbillon de lumière"], ["bloom", "Éclosion : un anneau de lumière"]] }],
  ["openBeam", "Rayon lancé par le blob", { select: [["1", "Oui"], ["0", "Non"]] }],
  ["openPower", "Intensité de la lumière", 0, 2.5, 0.05, ""], ["openParticles", "Particules", 0, 80, 1, ""],
];
const CLOSE_ROWS = [
  ["closeStyle", "Manière", { select: [["seal", "Se referme en fente"], ["implode", "Implosion en tourbillon"], ["fade", "S’éteint, se dissout"]] }],
  ["closePower", "Intensité de la lumière", 0, 2.5, 0.05, ""], ["closeParticles", "Particules", 0, 80, 1, ""],
];
function portalGroups() {
  const m = V.mode, w = worldById(V.pWorld);
  const gs = [
    { title: "Animation", hint: "ce qu’on exporte", key: "ptanim", open: true, portalModes: true,
      rows: [...(m === "live" ? [] : [[`loops_${m}`, "Durée", 1, 8, 1, ""], ["lead", "Repos avant et après", 0, 0.3, 0.01, ""], ["castLean", "Le blob se tourne vers le portail", 0, 2.5, 0.05, ""]])] },
    { title: "Le portail", hint: `vers « ${w.name} »`, key: "ptmain", open: true, rows: PORTAL_ROWS },
    { title: "Allure du portail", hint: "bord, énergie", key: "ptlook", rows: PORTAL_LOOK },
  ];
  if (m === "open") gs.push({ title: "Ouverture", hint: "comment il naît", key: "ptopen", open: true, rows: OPEN_ROWS });
  if (m === "close") gs.push({ title: "Fermeture", hint: "comment il se referme", key: "ptclose", open: true, rows: CLOSE_ROWS });
  gs.push({ ...PLACE, rows: PLACE.rows.filter((r) => r[0] !== "canvas"), hint: "la même que le blob né" });
  return gs;
}
function portalModesMarkup(rows) {
  const grid = document.createElement("div");
  grid.className = "actions modes"; grid.setAttribute("role", "radiogroup"); grid.setAttribute("aria-label", "Animation du portail");
  for (const [id, name, desc] of PORTAL_MODES) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "act"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(id === V.mode));
    b.innerHTML = `<strong>${name}</strong><span>${desc}</span>`;
    b.onclick = () => { if (V.mode === id) return; setV("mode", id); buildControls(); changed(); };
    grid.appendChild(b);
  }
  rows.appendChild(grid);
  const w = worldById(V.pWorld), txt = {
    open: "Commence sur l’image du blob né, sans portail. Le blob ouvre le portail et revient à son repos : la dernière image est celle du portail ouvert.",
    live: `Le blob au repos, le portail ouvert : dure la boucle du monde « ${w.name} » (${w.wLoops} × ${(+V.duration).toFixed(1)} s) et se raccorde à elle-même, à la création et à la fermeture.`,
    close: "Commence sur le portail ouvert, le blob le referme et revient exactement à son repos de blob né.",
  }[V.mode];
  rows.insertAdjacentHTML("beforeend", `<p class="note">${txt} Enchaîne : blob né → création → portail ouvert (autant de fois que tu veux) → fermeture → blob né.</p>`);
}
// the portal's centre and half-size, in scene pixels
function portalRect() {
  const H = (V.ptSize / 100) * SH, W = V.pShape === "circle" ? H : H * V.pRatio;
  return { cx: Math.round((V.ptX / 100) * SW), cy: Math.round((V.ptY / 100) * SH), rx: W / 2, ry: H / 2 };
}
const RENDER = { title: "Rendu", hint: "fond, export", render: true, rows: [
  ["zoom", "Zoom de l’aperçu", 0, 6, 1, "×"],
  ["gifScale", "Agrandissement du GIF", 1, 6, 1, "×"],
]};
const SHARED_KEYS = new Set(Object.keys(SHARED_DEF));

// ---- state: { anim, shared, birth, blob }, kept in this browser
const KEY = "couveuse-v3";
function animDef(a) { const o = ANIMS[a].fx.meta.options; return { ...o, ...PER_DEF, palette: [...o.palette] }; }
function fresh() { return { anim: "blob", shared: { ...SHARED_DEF }, birth: animDef("birth"), blob: animDef("blob"), actions: actionDef(), objects: objectsDef(), loops: loopsDef(), clock: clockDef(), elec: elecDef(), portal: portalDef(), worlds: worldsDef() }; }
function clampInt(v, lo, hi) { v = Math.round(+v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo; }
function sanitize(v) {
  const f = fresh(), s = { anim: ANIMS[v && v.anim] ? v.anim : f.anim, shared: { ...f.shared, ...(v && v.shared) } };
  s.actions = { ...f.actions, ...((v && v.actions) || {}) };
  s.loops = { ...f.loops, ...((v && v.loops) || {}) };
  s.clock = { ...f.clock, ...((v && v.clock) || {}) };
  s.elec = { ...f.elec, ...((v && v.elec) || {}) };
  if (!ELEC_LIST.some((a) => a[0] === s.elec.elec)) s.elec.elec = f.elec.elec;
  s.worlds = { ...f.worlds, ...((v && v.worlds) || {}) };
  if (!Array.isArray(s.worlds.list) || !s.worlds.list.length) s.worlds.list = f.worlds.list;
  s.worlds.list = s.worlds.list.filter((w) => w && typeof w === "object").map((w, i) => ({ ...(PFX.worlds.DEFAULTS[w.wType] || PFX.worlds.SPACE), id: i + 1, name: "Monde", ...w }));
  if (!s.worlds.list.length) s.worlds.list = f.worlds.list;
  s.worlds.nextId = Math.max(s.worlds.nextId || 1, ...s.worlds.list.map((w) => w.id + 1));
  if (!s.worlds.list.some((w) => w.id === s.worlds.sel)) s.worlds.sel = s.worlds.list[0].id;
  s.portal = { ...f.portal, ...((v && v.portal) || {}) };
  if (!PORTAL_MODES.some((m) => m[0] === s.portal.mode)) s.portal.mode = f.portal.mode;
  if (!s.worlds.list.some((w) => w.id === s.portal.pWorld)) s.portal.pWorld = s.worlds.list[0].id;
  s.objects = { ...f.objects, ...((v && v.objects) || {}) };
  if (!Array.isArray(s.objects.list)) s.objects.list = f.objects.list;
  s.objects.list = s.objects.list.filter((ob) => ob && typeof ob === "object").map((ob) => ({ ...OBJECT_DEF(), ...ob }));
  s.objects.nextId = Math.max(s.objects.nextId || 1, ...s.objects.list.map((ob) => ob.id + 1));
  for (const a of ["birth", "blob"]) {
    const src = (v && v[a]) || {};
    s[a] = { ...f[a], ...src };
    if (!Array.isArray(s[a].palette) || s[a].palette.length !== 8) s[a].palette = [...f[a].palette];
  }
  const sh = s.shared;
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
// V: what the current animation sees, the shared settings and its own together
let V = {};
const refreshV = () => (V = S.anim === "worlds" ? worldsView() : S.anim === "portal" ? { ...S.shared, ...S.blob, ...S.portal } : S.anim === "elec" ? { ...S.shared, ...S.blob, ...S.elec } : S.anim === "clock" ? { ...S.shared, ...S.blob, ...S.clock } : S.anim === "loops" ? { ...S.shared, ...S.blob, ...S.loops } : S.anim === "objects" ? objectsView() : S.anim === "actions" ? { ...S.shared, ...S.blob, ...S.actions } : { ...S.shared, ...S[S.anim] });
refreshV();
// the actions tab borrows the blob's look, timing and place: only the action is its own
function setV(k, v) {
  if (S.anim === "worlds" && !SHARED_KEYS.has(k)) { (WORLD_KEYS.has(k) ? selWorld() : S.blob)[k] = v; V[k] = v; return; }
  if (S.anim === "portal" && !SHARED_KEYS.has(k)) { (PORTAL_KEYS.has(k) || k.startsWith("loops_") ? S.portal : S.blob)[k] = v; V[k] = v; return; }
  if (S.anim === "clock" && !SHARED_KEYS.has(k)) { (CLOCK_KEYS.has(k) ? S.clock : S.blob)[k] = v; V[k] = v; return; }
  if (S.anim === "elec" && !SHARED_KEYS.has(k)) { (ELEC_KEYS.has(k) ? S.elec : S.blob)[k] = v; V[k] = v; return; }
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
  if (k === "walkTX" || k === "tpTX" || k === "portalATX" || k === "portalBTX" || k === "ptX") return `${(+v).toFixed(1)} % · ${Math.round((v / 100) * V.sceneW)} px`;
  if (k === "walkTY" || k === "tpTY" || k === "portalATY" || k === "portalBTY" || k === "ptY") return `${(+v).toFixed(1)} % · ${Math.round((v / 100) * V.sceneH)} px`;
  if (unit === " % de la scène") return `${(+v).toFixed(1)} % · ${Math.round((v / 100) * V.sceneH)} px`;
  if (k === "scale") return `${v}× · ${V.canvas * v} px`;
  if (k === "zoom") return +v === 0 ? "ajusté" : `${v}×`;
  if (unit === " % pos x") return `${(+v).toFixed(1)} % · ${Math.round((v / 100) * V.sceneW)} px`;
  if (unit === " % pos y") return `${(+v).toFixed(1)} % · ${Math.round((v / 100) * V.sceneH)} px`;
  if (k === "wLoops") return `${v} × ${(+V.duration).toFixed(1)} s = ${(v * V.duration).toFixed(1)} s`;
  if (k.startsWith("loops_")) return `${v} × ${(+V.duration).toFixed(1)} s = ${(v * V.duration).toFixed(1)} s`;
  if (unit === " part") return `${Math.round(v * 100)} %`;
  if (unit === " % de la largeur") return `${Math.round(v)} % · ${Math.round((v / 100) * V.sceneW)} px`;
  if (unit === " % de la hauteur") return `${Math.round(v)} % · ${Math.round((v / 100) * V.sceneH)} px`;
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
    if (spec.button) {
      r.innerHTML = `<label><span>${label}</span><output id="out-${k}"></output></label><div class="inline"><button type="button" id="in-${k}">${spec.button}</button></div>`;
      const b = r.querySelector("button"), out = r.querySelector("output");
      b.onclick = () => { setV(k, (V[k] || 1) + 1); out.textContent = `n° ${V[k]}`; changed(); };
      inputs[k] = { kind: "button", inp: b, out };
    } else if (spec.worlds) {
      r.innerHTML = `<label for="in-${k}"><span>${label}</span></label><div class="inline"><select id="in-${k}">${S.worlds.list.map((w) => `<option value="${w.id}"></option>`).join("")}</select><button type="button" id="editWorld">Modifier ce monde</button></div>`;
      const sel = r.querySelector("select");
      [...sel.options].forEach((op, i) => (op.textContent = S.worlds.list[i].name));
      sel.onchange = () => { setV(k, +sel.value); buildControls(); changed(); };
      r.querySelector("#editWorld").onclick = () => { S.worlds.sel = +V[k]; S.anim = "worlds"; refreshV(); buildControls(); changed(); say(`Mondes : « ${selWorld().name} » à modifier.`); };
      inputs[k] = { kind: "select", inp: sel };
    } else if (spec.select) {
      r.innerHTML = `<label for="in-${k}"><span>${label}</span></label><div class="inline"><select id="in-${k}">${spec.select.map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select></div>`;
      const sel = r.querySelector("select");
      sel.onchange = () => { setV(k, sel.value); if (k === "clkSource" || k === "clkPos") buildControls(); changed(); };
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
  // the scene, shared by every animation
  {
    const [d, rows] = group({ title: "Scène", hint: "partagée par les animations" }, "scene", true);
    rows.innerHTML = `<div class="row"><label for="in-ratio"><span>Format de la scène</span><output id="out-scene"></output></label>
      <div class="inline"><select id="in-ratio">${Object.keys(RATIOS).map((k) => `<option value="${k}">${k === "libre" ? "Libre" : k.replace(":", " / ")}</option>`).join("")}</select></div>
      <div class="inline dims"><label class="dim">Largeur<input type="number" id="in-sw" min="16" max="1920" step="1" inputmode="numeric"></label><span aria-hidden="true">×</span><label class="dim">Hauteur<input type="number" id="in-sh" min="16" max="1920" step="1" inputmode="numeric"></label></div>
      <div class="inline sizes" id="sizes"></div></div>
      <div class="row"><label for="in-bg"><span>Fond de la scène</span></label><div class="inline"><select id="in-bg"><option value="black">Noir complet</option><option value="none">Transparent</option><option value="color">Couleur</option></select><input type="color" id="in-bgc" aria-label="Couleur du fond"></div><p class="note" id="bgnote"></p></div>`;
    controls.appendChild(d);
  }
  if (S.anim === "loops") controls.insertAdjacentHTML("beforeend", `<p class="note intro">Le blob garde l’apparence et la place de l’onglet Blob né. Chaque boucle part de là où il se trouve et tourne sans fin, sans raccord visible.</p>`);
  if (S.anim === "elec") controls.insertAdjacentHTML("beforeend", `<p class="note intro">Le blob garde l’apparence et la place de l’onglet Blob né. Il part de son repos, découvre l’électricité et joue avec, puis revient exactement à son repos : la première et la dernière image sont celles de la boucle du blob né. Mets les GIF bout à bout, ils s’enchaînent. Les couleurs de l’électricité se règlent à part, dans « L’électricité ».</p>`);
  if (S.anim === "clock") controls.insertAdjacentHTML("beforeend", `<p class="note intro">Le blob garde l’apparence et la place de l’onglet Blob né. Il part de sa position de repos, affiche l’heure, puis revient exactement à son repos : la première et la dernière image sont celles de la boucle du blob né.</p>`);
  if (S.anim === "portal") controls.insertAdjacentHTML("beforeend", `<p class="note intro">Le blob garde l’apparence et la place de l’onglet Blob né. Il ouvre un portail vers un autre monde, qu’on ne voit qu’à travers lui. Glisse le portail dans l’aperçu pour le placer, et sa poignée carrée pour changer sa taille. Les mondes se créent et se règlent dans l’onglet Mondes.</p>`);
  if (S.anim === "worlds") controls.insertAdjacentHTML("beforeend", `<p class="note intro">Les mondes qu’on voit à travers les portails. Crée-les, règle-les et garde-les ici ; l’aperçu montre le monde entier, en boucle sans fin. Il est fait de couches à différentes profondeurs : quand la caméra bouge, les étoiles proches défilent plus vite que les lointaines.</p>`);
  const groups = S.anim === "worlds" ? worldGroups() : S.anim === "portal" ? portalGroups() : S.anim === "elec" ? elecGroups() : S.anim === "clock" ? clockGroups() : S.anim === "loops" ? loopGroups() : S.anim === "objects" ? objectGroups() : S.anim === "actions" ? actionGroups() : ANIMS[S.anim].groups;
  if (S.anim === "objects") controls.insertAdjacentHTML("beforeend", `<p class="note intro">Le blob garde l’apparence et la place de l’onglet Blob né. Rien ne pèse dans la scène : les objets flottent et tournent au rythme de sa boucle, et chaque animation se raccorde aux autres.</p>`);
  if (S.anim === "actions") controls.insertAdjacentHTML("beforeend", `<p class="note intro">Le blob garde l’apparence, la durée et la place réglées dans l’onglet Blob né. Chaque action commence et finit sur la même image que la boucle du blob né : mets les GIF bout à bout, ils s’enchaînent.</p>`);
  groups.forEach((g, gi) => {
    const [d, rows] = group(g, g.key || S.anim + gi, g.open || (gi < 2 && (S.anim === "actions" || S.anim === "objects")) ? true : gi === 0);
    if (g.objlist) objListMarkup(rows);
    if (g.objanim) objAnimMarkup(rows);
    if (g.portalModes) portalModesMarkup(rows);
    if (g.worldList) worldListMarkup(rows);
    if (g.worldPresets) {
      const pr = document.createElement("div");
      pr.className = "presets";
      for (const [name, cols] of Object.entries(WORLD_PRESETS)) {
        const b = document.createElement("button");
        b.className = "preset"; b.type = "button";
        b.innerHTML = `<i style="background:linear-gradient(90deg,${cols.slice(1).join(",")})"></i>${name}`;
        b.onclick = () => { ["wSky", "wNebA", "wNebB", "wNebCore", "wStarTint"].forEach((k, i) => setV(k, cols[i])); syncUI(); changed(); };
        pr.appendChild(b);
      }
      rows.appendChild(pr);
    }
    if (g.picker || g.pickerList) {
      const list = g.pickerList || ACTION_LIST, pk = g.pickerKey || "action";
      const grid = document.createElement("div");
      grid.className = "actions"; grid.setAttribute("role", "radiogroup"); grid.setAttribute("aria-label", g.title);
      for (const [id, name, desc] of list) {
        const b = document.createElement("button");
        b.type = "button"; b.className = "act"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(id === V[pk]));
        b.innerHTML = `<strong>${name}</strong><span>${desc}</span>`;
        b.onclick = () => { if (V[pk] === id) return; setV(pk, id); buildControls(); changed(); };
        grid.appendChild(b);
      }
      rows.appendChild(grid);
    }
    if (g.place) {
      const place = document.createElement("div");
      place.className = "row";
      place.innerHTML = `<div class="inline"><button type="button" id="center">Centrer</button><button type="button" id="fit">Ajuster à la scène</button><label class="check"><input type="checkbox" id="in-guides">Cadre et repères</label></div>
        <p class="note">${S.anim === "portal" ? "Glisse la créature pour la placer. Le portail se glisse aussi, et sa poignée carrée change sa taille." : V.action === "portal" && S.anim === "actions" ? "Glisse la créature pour la placer, et les deux cibles pour placer les portails (le trait montre le portail, la flèche le côté où il s’ouvre)." : TARGETS[V.action] && S.anim === "actions" ? "Glisse la créature pour la placer, et la cible pour choisir où va l’action." : S.anim === "actions" && V.action === "walk" ? "Le cadre en pointillés montre la zone de la balade et ses étapes." : "Glisse la créature dans l’aperçu pour la placer, ou utilise les flèches."}</p>`;
      rows.appendChild(place);
    }
    if (g.palette) {
      const pr = document.createElement("div");
      pr.className = "presets";
      for (const [name, pal] of Object.entries(PRESETS)) {
        const b = document.createElement("button");
        b.className = "preset"; b.type = "button";
        const f = PFX.fit(pal, 8).map(PFX.toHex);
        b.innerHTML = `<i style="background:linear-gradient(90deg,${f.join(",")})"></i>${name}`;
        b.onclick = () => { setV("palette", f); syncPalette(); changed(); };
        pr.appendChild(b);
      }
      rows.appendChild(pr);
      const sw = document.createElement("div");
      sw.className = "swatches"; sw.id = "swatches";
      for (let i = 0; i < 8; i++) {
        const c = document.createElement("input");
        c.type = "color"; c.setAttribute("aria-label", `Teinte ${i + 1} sur 8, de la plus sombre à la plus claire`);
        c.oninput = () => { const p = [...V.palette]; p[i] = c.value; setV("palette", p); changed(); };
        sw.appendChild(c);
      }
      rows.appendChild(sw);
      const n = document.createElement("p");
      n.className = "note"; n.textContent = "De la plus sombre à la plus claire : les dernières teintes font le cœur et la peau éclairée.";
      rows.appendChild(n);
    }
    if (g.elecPresets) {
      const pr = document.createElement("div");
      pr.className = "presets";
      for (const [name, cols] of Object.entries(ELEC_PRESETS)) {
        const b = document.createElement("button");
        b.className = "preset"; b.type = "button";
        b.innerHTML = `<i style="background:linear-gradient(90deg,${[...cols].reverse().join(",")})"></i>${name}`;
        b.onclick = () => { ["elCore", "elColor", "elGlow"].forEach((k, i) => setV(k, cols[i])); syncUI(); changed(); };
        pr.appendChild(b);
      }
      rows.appendChild(pr);
    }
    for (const def of g.rows) rowFor(rows, def);
    if (g.place) {
      const r = document.createElement("div");
      r.className = "row";
      r.innerHTML = `<label for="in-seed"><span>Graine</span></label><div class="inline"><input type="number" id="in-seed" min="0" max="99999" step="1"><button type="button" id="dice">Autre créature</button></div>`;
      rows.appendChild(r);
    }
    controls.appendChild(d);
  });
  {
    const [d, rows] = group(RENDER, "render", false);
    for (const def of RENDER.rows) rowFor(rows, def);
    rows.insertAdjacentHTML("beforeend", `<div class="row"><label for="in-what"><span>Contenu exporté</span></label><div class="inline"><select id="in-what"><option value="scene">La scène entière</option><option value="creature">L’animation seule, sans fond</option></select></div><p class="note">Le JSON note toujours la taille de la scène et la place de l’animation, pour y ajouter les suivantes.</p></div>
      <div class="row"><label><span>Réglages</span></label><div class="inline"><button type="button" id="saveScene">Enregistrer les réglages</button><button type="button" id="loadScene">Ouvrir des réglages</button><input type="file" id="sceneFile" accept=".json,application/json" hidden></div><p class="note">Un seul fichier garde la scène et toutes les animations.</p></div>`);
    controls.appendChild(d);
  }
  wire();
  syncUI();
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
$("reset").onclick = () => { const f = fresh(); if (S.anim === "worlds") { const w = selWorld(); Object.assign(w, PFX.worlds.DEFAULTS[w.wType] || PFX.worlds.SPACE); } else if (S.anim === "portal") S.portal = { ...f.portal, pWorld: S.portal.pWorld }; else if (S.anim === "objects") { const keep = { list: S.objects.list, sel: S.objects.sel, nextId: S.objects.nextId }; S.objects = { ...f.objects, ...keep }; } else S[S.anim] = f[S.anim]; refreshV(); buildControls(); changed(); say(`${ANIMS[S.anim].name} : réglages d’origine.`); };

function syncPalette() { const sw = $("swatches"); if (sw) [...sw.children].forEach((c, i) => (c.value = PFX.toHex(PFX.hex(V.palette[i])))); accent(); }
function syncUI() {
  for (const [k, o] of Object.entries(inputs)) {
    if (o.kind === "button") o.out.textContent = `n° ${V[k]}`;
    else if (o.kind === "select") o.inp.value = String(V[k]);
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
  document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.anim === S.anim)));
  syncPalette();
}
// the interface borrows the creature's own light
function accent() {
  const c = PFX.toHex(PFX.hex(V.palette[5])), h = PFX.hex(V.palette[5]);
  document.documentElement.style.setProperty("--glow", c);
  document.documentElement.style.setProperty("--glow-soft", `rgba(${h & 255},${(h >> 8) & 255},${(h >> 16) & 255},0.22)`);
}
// switching animation: same scene, the other creature with its own settings
document.querySelectorAll(".tab").forEach((t) => (t.onclick = () => {
  if (S.anim === t.dataset.anim) return;
  S.anim = t.dataset.anim; refreshV(); buildControls(); changed();
  say(`${ANIMS[S.anim].name} affiché.`);
}));

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
const loopsOf = () => (S.anim === "worlds" ? Math.max(1, Math.round(V.wLoops || 1)) : S.anim === "portal" ? Math.max(1, Math.round(V.mode === "live" ? worldById(V.pWorld).wLoops || 1 : V["loops_" + V.mode] || 2)) : S.anim === "elec" ? Math.max(1, Math.round(V["loops_" + V.elec] || 3)) : S.anim === "clock" ? Math.max(1, Math.round(V.loops || 3)) : S.anim === "loops" ? Math.max(1, Math.round(V["loops_" + V.loop] || 2)) : S.anim === "actions" ? Math.max(1, Math.round(V["loops_" + V.action] || 2)) : S.anim === "objects" ? Math.max(1, Math.round(V["loops_" + V.mode] || 1)) : 1);
const loopLen = () => V.duration * loopsOf();
// an action is a whole number of the blob's loops, frame for frame
const nFrames = () => Math.max(2, Math.round(V.duration * V.fps)) * loopsOf();
function effOpts(src = V) {
  const o = { ...src };
  o.palette = src.palette.map((c) => PFX.toHex(PFX.hex(c)));
  if (S.anim === "clock" && src === V) {
    o.loops = loopsOf();
    [o.clkX, o.clkY] = clockSpot();
    for (const key of ["clkSeconds", "clkTick", "clkZero", "clkBlink", "clkBold"]) o[key] = +V[key];
    if (V.clkSource === "now") { const d = new Date(); o.clkH = d.getHours(); o.clkM = d.getMinutes(); o.clkS = d.getSeconds(); }
  }
  if (S.anim === "elec" && src === V) o.loops = loopsOf();
  if ((S.anim === "portal" || S.anim === "worlds") && src === V) {
    // the scene's bounds in the effect's own pixels: the world is pinned to the scene, not to the blob
    const g = grid();
    o.room = [-g.ox, -g.oy, g.fw - g.ox, g.fh - g.oy];
  }
  if (S.anim === "worlds" && src === V) { const w = selWorld(); o.world = { ...w }; o.loops = loopsOf(); }
  if (S.anim === "portal" && src === V) {
    const pl = placement(), k = V.scale, r = portalRect();
    o.world = { ...worldById(V.pWorld) };
    o.loops = V.mode === "live" ? 1 : loopsOf();
    o.pX = (r.cx - pl.cx) / k; o.pY = (r.cy - pl.cy) / k; o.pH = (r.ry * 2) / k;
  }
  if (S.anim === "loops" && src === V) {
    const pl = placement(), k = V.scale, m = V.size * k * 1.3;
    o.loops = loopsOf();
    // the round stays inside the scene
    const room = V.orbitSide === "left" ? pl.cx : SW - pl.cx, roomX = o.orbitPath === "circle" ? room : Math.min(pl.cx, SW - pl.cx);
    o.orbitRX = Math.max(0, Math.min((V.orbitRX / 100) * SW, roomX - m) / k);
    const up = o.orbitPath === "circle" ? (pl.cy - m) / 2 : Math.min(pl.cy, SH - pl.cy) - m;
    o.orbitRY = Math.max(0, Math.min((V.orbitRY / 100) * SH, up) / k);
  }
  if (S.anim === "objects" && src === V) {
    const pl = placement(), k = V.scale, list = S.objects.list;
    o.objects = list.map((ob) => ({ ...ob, x: ((ob.x / 100) * SW - pl.cx) / k, y: ((ob.y / 100) * SH - pl.cy) / k }));
    o.target = Math.max(0, list.findIndex((ob) => ob.id === S.objects.sel));
    o.loops = loopsOf();
    if (!list.length) o.mode = "live";
  }
  if (S.anim === "actions" && src === V) {
    const pl = placement(), k = V.scale, h = SH / k;
    o.loops = V["loops_" + V.action] || 2;
    o.tpX = ((V.tpTX / 100) * SW - pl.cx) / k; o.tpY = ((V.tpTY / 100) * SH - pl.cy) / k;
    o.portalAX = ((V.portalATX / 100) * SW - pl.cx) / k; o.portalAY = ((V.portalATY / 100) * SH - pl.cy) / k;
    o.portalBX = ((V.portalBTX / 100) * SW - pl.cx) / k; o.portalBY = ((V.portalBTY / 100) * SH - pl.cy) / k;
    o.portalRoom = [-pl.cx / k, -pl.cy / k, (SW - pl.cx) / k, (SH - pl.cy) / k];
    for (const key of SCENE_LENGTHS) o[key] = (V[key] / 100) * h;
    // the comet's loops stay inside the scene
    const m = V.size * k * 1.3, room = V.cometSide === "left" ? pl.cx : SW - pl.cx;
    o.cometRadius = Math.max(0, Math.min(o.cometRadius, (room - m) / 2 / k, (Math.min(pl.cy, SH - pl.cy) - m) / k));
    // the stroll's zone: centred on the scene, kept clear of the edges by a body's width
    const z = walkZone();
    o.walkMinX = (z.x0 - pl.cx) / k; o.walkMaxX = (z.x1 - pl.cx) / k; o.walkMinY = (z.y0 - pl.cy) / k; o.walkMaxY = (z.y1 - pl.cy) / k;
    // the ground for the fall, as how far below its spot its bottom lands
    o.dropFloor = Math.max(0, ((V.dropFloor / 100) * SH - pl.cy) / k - V.size * 0.95);
  }
  return o;
}
let OPTS = effOpts();
function bgValue() { return V.bg === "none" ? null : V.bg === "color" ? PFX.hex(V.bgColor) : PFX.hex("#000000"); }
// where the creature sits: centred on the chosen point; its zone (for the birth) scaled by whole pixels
function placement() {
  const D = B * V.scale, cx = Math.round((V.posX / 100) * SW), cy = Math.round((V.posY / 100) * SH);
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
function rebuild() {
  E = ANIMS[S.anim].fx; SW = V.sceneW; SH = V.sceneH; B = V.canvas; OPTS = effOpts(); N = nFrames();
  if (view.width !== SW || view.height !== SH || !img) { view.width = SW; view.height = SH; img = ctx.createImageData(SW, SH); }
  sceneCache = [];
  $("scrub").max = N - 1;
  if (V.zoom > 0) { view.classList.remove("fit"); view.style.width = SW * V.zoom + "px"; }
  else { view.classList.add("fit"); view.style.width = ""; }
  $("wrap").classList.toggle("checker", V.bg === "none");
}
let pending = false;
function changed() { pending = true; persist(); accent(); }
// recompose only: moving the creature doesn't redraw it
function moved() { if (S.anim !== "birth" && S.anim !== "blob") OPTS = effOpts(); sceneCache = []; shown = -1; persist(); }

// ---- guides drawn over the preview only, never exported
function drawGuides() {
  if (!V.guides) return;
  const pl = placement();
  ctx.save();
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--glow").trim() || "#9fe0ff";
  ctx.globalAlpha = 0.7; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
  if (ANIMS[S.anim].mode === "box") ctx.strokeRect(pl.x + 0.5, pl.y + 0.5, pl.D - 1, pl.D - 1);
  if (S.anim === "actions" && V.action === "walk") {
    const z = walkZone(), k = V.scale;
    ctx.strokeRect(Math.round(z.x0) + 0.5, Math.round(z.y0) + 0.5, Math.round(z.x1 - z.x0), Math.round(z.y1 - z.y0));
    const pts = PFX.actions.walkRoute(OPTS).map(([x, y]) => [pl.cx + x * k, pl.cy + y * k]);
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x + 0.5, y + 0.5) : ctx.moveTo(x + 0.5, y + 0.5))); ctx.stroke();
    ctx.setLineDash([]);
    pts.slice(1, -1).forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x + 0.5, y + 0.5, 3, 0, Math.PI * 2); ctx.stroke(); });
    ctx.setLineDash([4, 3]);
  }
  if (S.anim === "actions" && V.action === "drop") {
    const fy = Math.round((V.dropFloor / 100) * SH) + 0.5;
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
  if (S.anim === "portal") {
    const r = portalRect(), h = portalHandle();
    ctx.save(); ctx.setLineDash([3, 3]); ctx.globalAlpha = 0.6;
    ctx.beginPath();
    if (V.pShape === "diamond") { ctx.moveTo(r.cx + 0.5, r.cy - r.ry); ctx.lineTo(r.cx + r.rx, r.cy + 0.5); ctx.lineTo(r.cx + 0.5, r.cy + r.ry); ctx.lineTo(r.cx - r.rx, r.cy + 0.5); ctx.closePath(); }
    else if (V.pShape === "arch") { ctx.moveTo(r.cx - r.rx, r.cy + r.ry); ctx.lineTo(r.cx - r.rx, r.cy); ctx.ellipse(r.cx + 0.5, r.cy + 0.5, r.rx, r.ry, 0, Math.PI, 0); ctx.lineTo(r.cx + r.rx, r.cy + r.ry); ctx.closePath(); }
    else ctx.ellipse(r.cx + 0.5, r.cy + 0.5, Math.max(1, r.rx), Math.max(1, r.ry), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 0.95;
    ctx.strokeRect(Math.round(h[0]) - 3.5, Math.round(h[1]) - 3.5, 8, 8);
    ctx.restore();
  }
  for (const { p: tg, keys } of targets()) {
    // a portal: its plane, across the way it opens
    const face = keys[0] === "portalATX" ? +V.portalAAngle : keys[0] === "portalBTX" ? +V.portalBAngle : null;
    if (face !== null) {
      const a = (face * Math.PI) / 180, L = V.size * V.scale * (+V.portalSize || 1.5), tx = -Math.sin(a), ty = Math.cos(a);
      ctx.save(); ctx.setLineDash([]); ctx.globalAlpha = 0.9; ctx.strokeStyle = keys[0] === "portalATX" ? V.portalColorA : V.portalColorB;
      ctx.beginPath(); ctx.moveTo(tg[0] + 0.5 - tx * L, tg[1] + 0.5 - ty * L); ctx.lineTo(tg[0] + 0.5 + tx * L, tg[1] + 0.5 + ty * L);
      ctx.moveTo(tg[0] + 0.5, tg[1] + 0.5); ctx.lineTo(tg[0] + 0.5 + Math.cos(a) * 12, tg[1] + 0.5 + Math.sin(a) * 12); ctx.stroke(); ctx.restore();
    }
    ctx.beginPath(); ctx.moveTo(pl.cx + 0.5, pl.cy + 0.5); ctx.lineTo(tg[0] + 0.5, tg[1] + 0.5); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 0.95;
    ctx.beginPath(); ctx.arc(tg[0] + 0.5, tg[1] + 0.5, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tg[0] - 9, tg[1] + 0.5); ctx.lineTo(tg[0] - 3, tg[1] + 0.5); ctx.moveTo(tg[0] + 4, tg[1] + 0.5); ctx.lineTo(tg[0] + 10, tg[1] + 0.5);
    ctx.moveTo(tg[0] + 0.5, tg[1] - 9); ctx.lineTo(tg[0] + 0.5, tg[1] - 3); ctx.moveTo(tg[0] + 0.5, tg[1] + 4); ctx.lineTo(tg[0] + 0.5, tg[1] + 10); ctx.stroke();
    ctx.setLineDash([4, 3]); ctx.globalAlpha = 0.7;
  }
  ctx.setLineDash([]); ctx.globalAlpha = S.anim === "worlds" ? 0 : 0.5;
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

function walkZone() {
  const m = Math.min(SW, SH) * 0.04 + V.size * V.scale * 1.2;
  const x0 = Math.max(m, SW * (0.5 - V.walkZoneW / 200)), x1 = Math.min(SW - m, SW * (0.5 + V.walkZoneW / 200));
  const y0 = Math.max(m, SH * (0.5 - V.walkZoneH / 200)), y1 = Math.min(SH - m, SH * (0.5 + V.walkZoneH / 200));
  return { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1) };
}
// the portal's size handle: its lower right corner
function portalHandle() { const r = portalRect(); return [r.cx + r.rx, r.cy + r.ry]; }
// the current action's destination in scene pixels, if it has one
function targets() {
  const list = S.anim === "actions" ? targetKeys(V.action) : S.anim === "clock" && V.clkPos === "free" ? [["clkPX", "clkPY"]] : S.anim === "portal" ? [["ptX", "ptY"]] : [];
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
  let tgHit = null;
  const [x, y] = toScene(ev), pl = placement(), tgs = targets(), hit = Math.max(10, 14 / (view.getBoundingClientRect().width / SW));
  if (S.anim === "worlds") {
    drag = { cam: true, x0: x, y0: y, c0: [V.wCamX || 0, V.wCamY || 0] };
    view.setPointerCapture(ev.pointerId);
    return;
  }
  if (S.anim === "portal") {
    const h = portalHandle();
    if (Math.hypot(x - h[0], y - h[1]) <= hit) { drag = { size: true }; view.setPointerCapture(ev.pointerId); return; }
  }
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
  if (drag.cam) {
    const k = V.scale;
    setV("wCamX", Math.round(drag.c0[0] - (x - drag.x0) / k)); setV("wCamY", Math.round(drag.c0[1] - (y - drag.y0) / k));
    for (const key of ["wCamX", "wCamY"]) if (inputs[key]) { inputs[key].inp.value = V[key]; inputs[key].out.textContent = fmtRow(key, V[key], 1, " px"); }
    moved();
    return;
  }
  if (drag.size) {
    const r = portalRect(), ry = Math.max(2, Math.abs(y - r.cy)), rx = Math.max(1, Math.abs(x - r.cx));
    setV("ptSize", +Math.min(100, Math.max(4, ((ry * 2) / SH) * 100)).toFixed(1));
    if (V.pShape !== "circle") setV("pRatio", +Math.min(2, Math.max(0.2, rx / ry)).toFixed(2));
    for (const key of ["ptSize", "pRatio"]) if (inputs[key]) { inputs[key].inp.value = V[key]; inputs[key].out.textContent = fmtRow(key, V[key], inputs[key].step, inputs[key].unit); }
    moved();
    return;
  }
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
  if (S.anim === "worlds") return;
  const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
  if (!d) return;
  ev.preventDefault();
  const m = ev.shiftKey ? 10 : 1, pl = placement();
  setV("posX", +(((Math.max(0, Math.min(SW, pl.cx + d[0] * m))) / SW) * 100).toFixed(2));
  setV("posY", +(((Math.max(0, Math.min(SH, pl.cy + d[1] * m))) / SH) * 100).toFixed(2));
  for (const k of ["posX", "posY"]) { inputs[k].inp.value = V[k]; inputs[k].out.textContent = fmtRow(k, V[k], 0.1, " %"); }
  moved();
});

// ---- playback
let playing = true, t0 = performance.now(), shown = -1, scrubIdx = 0;
$("play").onclick = () => {
  playing = !playing;
  $("play").textContent = playing ? "Pause" : "Lecture";
  $("play").setAttribute("aria-label", playing ? "Pause" : "Lecture");
  if (playing) t0 = performance.now() - (scrubIdx / N) * (loopLen() / V.speed) * 1000;
};
$("scrub").oninput = (e) => { scrubIdx = +e.target.value; if (playing) $("play").click(); };
function tick(now) {
  if (pending) { pending = false; rebuild(); shown = -1; }
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
const portalName = () => { const w = worldById(V.pWorld); return `portail-${{ open: "creation", live: "ouvert", close: "fermeture" }[V.mode]}-${slug(w.name)}`; };
const base = () => S.anim === "worlds" ? `monde-${slug(selWorld().name)}-${selWorld().wSeed}` : `creature-glace-${S.anim === "portal" ? portalName() : S.anim === "clock" ? clockName() : S.anim === "loops" ? "boucle-" + V.loop : S.anim === "elec" ? "electricite-" + V.elec : S.anim === "actions" ? "action-" + V.action : S.anim === "objects" ? objName() : ANIMS[S.anim].file}-${V.seed}` + (V.exportWhat === "creature" ? "-seule" : "-scene");
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
function portalInfo() {
  const r = portalRect();
  return { center: [r.cx, r.cy], centerPercent: [V.ptX, V.ptY], size: [Math.round(r.rx * 2), Math.round(r.ry * 2)], shape: V.pShape, layer: V.pLayer };
}
function sceneInfo() {
  const pl = placement();
  return {
    scene: { width: SW, height: SH, ratio: V.ratio, background: V.bg === "none" ? "transparent" : V.bg === "color" ? V.bgColor : "#000000" },
    creature: { center: [pl.cx, pl.cy], centerPercent: [V.posX, V.posY], scale: V.scale, ...(ANIMS[S.anim].mode === "box" ? { zone: B, box: { x: pl.x, y: pl.y, w: pl.D, h: pl.D } } : { drawnAcross: "scene" }) },
    ...(S.anim === "portal" ? { portal: portalInfo() } : {}),
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
      ...(S.anim === "loops" ? { activity: V.loop, restLoops: loopsOf(), seamless: true } : {}),
      ...(S.anim === "worlds" ? { world: selWorld(), seamless: true, worldLoops: loopsOf() } : {}),
      ...(S.anim === "portal" ? { portal: { animation: V.mode, ...portalInfo() }, world: worldById(V.pWorld) } : {}),
      ...(S.anim === "elec" ? { activity: V.elec, electricity: { core: V.elCore, arc: V.elColor, glow: V.elGlow } } : {}),
      ...(S.anim === "clock" ? { time: { h: OPTS.clkH, m: OPTS.clkM, s: OPTS.clkS, format: OPTS.clkFormat, center: [Math.round(placement().cx + OPTS.clkX * V.scale), Math.round(placement().cy + OPTS.clkY * V.scale)] } } : {}),
      ...(S.anim === "birth" || S.anim === "loops" || S.anim === "worlds" ? {} : S.anim === "portal" ? { chain: { restFrames: Math.round(V.duration * V.fps), firstFrameIs: { open: "rest", live: "portal open", close: "portal open" }[V.mode], lastFrameIs: { open: "portal open", live: "portal open", close: "rest" }[V.mode], order: ["rest", "open", "live…", "close", "rest"] } } : { chain: { restFrames: N / loopsOf(), firstAndLastFrameAreRest: true, ...(S.anim === "actions" ? { action: V.action, restLoops: loopsOf() } : S.anim === "elec" ? { electricity: V.elec, restLoops: loopsOf() } : {}) } }),
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
