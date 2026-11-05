# Vision et objectifs

Ce que l’auteur veut, tel qu’il l’a demandé au fil du projet. À relire avant toute nouvelle fonctionnalité.

## Le but

Faire **vivre une petite créature de lumière** (le « blob ») dans une scène, et pouvoir produire facilement
toutes ses animations depuis **une seule interface web**, en **boucles infinies parfaites**, pour les réutiliser
ailleurs (GIF collés bout à bout, planches PNG et JSON pour un moteur de jeu).

La scène va évoluer : d’autres animations et d’autres éléments viendront s’y ajouter. Tout ce qui est
produit doit donc pouvoir se combiner : même scène, même place, mêmes raccords.

## Exigences, par ordre d’importance

1. **Boucle parfaite, toujours.** Aucune animation ne doit avoir de saut visible quand elle reboucle.
   C’est la contrainte numéro un, testée au pixel près (`npm test`).
2. **Enchaînements.** Une animation qui fait faire quelque chose au blob (action, heure, apparition ou
   disparition d’objet) **part de sa position et de son état de repos, et y revient exactement**. Ainsi,
   collés bout à bout, les GIF s’enchaînent : repos → action → repos → autre action… Seules les boucles
   d’activités (onglet Boucles) sont libres : elles partent de sa position mais n’ont pas à retrouver l’image de repos.
3. **Tout est paramétrable.** Chaque animation, chaque action, chaque effet a ses réglages (couleurs, vitesse,
   durée, forme, mouvement, intensité, nombre de particules…). Quand on ajoute quelque chose, on ajoute ses
   réglages, avec des valeurs par défaut qui donnent déjà un beau résultat.
4. **La scène.** Taille au choix (16/9 par défaut, autres formats possibles), réutilisable. On choisit la
   position et la taille de la créature dans la scène. Les actions ont **toute la scène** comme terrain de jeu
   (pas seulement le carré autour du blob). Les exports gardent la taille de la scène et la place de chaque
   élément (JSON) pour pouvoir ajouter les animations suivantes.
5. **Exports.** GIF, planche PNG (fond noir ou transparent) et JSON, pour la scène entière ou l’élément seul.

## La créature et son style

- **Pixel art**, net, sans anticipation floue ; lumière **couleur glace** par défaut, sur **fond complètement noir**.
- Animation **belle et fluide** : mouvements avec accélérations douces, rien de mécanique.
- **Naissance** : une forme sans membres, pas vraiment ronde, avec des imperfections qui montrent qu’elle se
  forme, entourée d’un halo lumineux.
- **Le blob né** : en lévitation, forme jamais stable qui bouge au hasard (mais en boucle parfaite),
  **des yeux seulement** (pas de bouche ni de nez), une palette de personnalisation complète.
- **Les objets** : même style que le blob mais d’aspect **solide** (cube, sphère, pyramide, cristal, colonne,
  gemme…). **Pas de gravité** dans la scène : tout flotte avec le blob, au rythme de sa boucle. On choisit
  leur position, on les ajoute et on les retire, avec des animations d’apparition et de disparition réglables
  (halo, laser…).
- Tout ce qui est nouveau (effets, objets, décors) reste **dans ce même style** : palette de 8 teintes,
  contours d’un pixel éclairés en haut à gauche, lueurs douces.

## Ce qui existe (six onglets)

Naissance · Blob né (repos) · Actions (18, retour au repos) · Objets (scène vivante, apparition,
disparition) · Boucles (18 activités sans fin : dormir, magie, jongler…) · Heure (affiche une heure choisie
ou celle de l’export, puis revient au repos).

## Directions déjà évoquées pour la suite

- Toujours plus d’actions et d’activités, chacune paramétrable, avec plus de portée dans la scène.
- La scène continuera d’évoluer : d’autres événements y auront lieu.

## Pour juger une modification

- Est-ce que `npm test` passe toujours (boucles et enchaînements exacts) ?
- Est-ce que c’est réglable dans l’interface, en français, avec de bonnes valeurs par défaut ?
- Est-ce que ça reste dans le style de la créature ?
- Est-ce que ça marche dans toute la scène, quelle que soit sa taille ?
