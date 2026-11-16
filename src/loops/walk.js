// « Marche » : on the spot, the figure on its legs walks side on while its floor of ice goes by under its feet (_gait.js).
import { loop } from "./_loop.js";
import { gait, GAIT_DIRS } from "./_gait.js";

export const fiche = loop({
  id: "walk", name: "Marche", desc: "sur place, le sol défile sous ses pas", ...gait("walk"),
  formFit: {
    blob: "Il marche sur ses jambes : le blob né n’en a pas. Choisis la forme humaine au sol.",
    human: "En lévitation, ses pieds ne touchent pas le sol : il ne peut pas marcher. Choisis la forme humaine au sol.",
  },
  options: {
    gaWalk: [5, "Vitesse de marche", 1.5, 7.5, 0.1, " km/h"],
    gaDir: ["right", "Il marche", { select: GAIT_DIRS }],
    gaStride: [1, "Longueur des pas", 0.7, 1.4, 0.01, "×"],
    gaArms: [1, "Balancement des bras", 0, 2.5, 0.05],
    gaLean: [1, "Se penche en avant", 0, 3, 0.05],
    gaHair: [1, "Les cheveux suivent ses pas", 0, 2.5, 0.05],
    gaPrints: [1, "Empreintes de lumière sur le sol", 0, 2, 0.05],
    gaBounce: [1], gaHeel: [1], gaKnee: [1], gaSparks: [1], // (set on the run's page; walking keeps them as they are)
  },
});
export const { meta, drawBack, draw } = fiche;
