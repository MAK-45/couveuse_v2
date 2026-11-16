// « Course » : on the spot, the figure on its legs runs side on (strides and time in the air) while its floor of ice goes
// by under its feet (_gait.js).
import { loop } from "./_loop.js";
import { gait, GAIT_DIRS } from "./_gait.js";

export const fiche = loop({
  id: "run", name: "Course", desc: "sur place, foulées et temps de vol", ...gait("run"),
  formFit: {
    blob: "Il court sur ses jambes : le blob né n’en a pas. Choisis la forme humaine au sol.",
    human: "En lévitation, ses pieds ne touchent pas le sol : il ne peut pas courir. Choisis la forme humaine au sol.",
  },
  options: {
    gaRun: [12, "Vitesse de course", 6, 30, 0.5, " km/h"],
    gaDir: ["right", "Il court", { select: GAIT_DIRS }],
    gaStride: [1, "Longueur des foulées", 0.7, 1.4, 0.01, "×"],
    gaBounce: [1, "Les genoux amortissent (rebond)", 0, 2, 0.05],
    gaHeel: [1, "Les talons remontent", 0, 2, 0.05],
    gaKnee: [1, "Les genoux montent", 0, 2.5, 0.05],
    gaArms: [1, "Balancement des bras", 0, 2.5, 0.05],
    gaLean: [1, "Se penche en avant", 0, 3, 0.05],
    gaHair: [1, "Les cheveux suivent ses foulées", 0, 2.5, 0.05],
    gaPrints: [1, "Empreintes de lumière sur le sol", 0, 2, 0.05],
    gaSparks: [1, "Éclats de lumière à chaque foulée", 0, 2.5, 0.05],
  },
});
export const { meta, drawBack, draw } = fiche;
