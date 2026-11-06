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
2. **Enchaînements.** Une animation qui fait faire quelque chose au blob (action, électricité, heure, apparition ou
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

## Ce qui existe (dix onglets)

Naissance · Blob né (repos) · Actions (19, retour au repos) · Objets (scène vivante, apparition,
disparition) · Boucles (18 activités sans fin : dormir, magie, jongler…) · Heure (affiche une heure choisie
ou celle de l’export, puis revient au repos) · Électricité (8 animations où le blob part de son repos,
découvre l’électricité et la manipule, puis revient exactement à son repos, comme les actions : étincelle, statique, boule de plasma, charge et décharge, deux pôles, éclair en
chaîne, orage, atome ; couleurs de l’électricité réglables à part : cœur, arc, lueur, avec des préréglages) ·
Portail (le blob ouvre un portail vers un autre monde, qu’on ne voit qu’à travers lui ; création depuis le repos,
portail ouvert en boucle, fermeture qui revient au repos ; traversée : le blob plonge dans le portail, son reflet en
miroir vient à sa rencontre, et il ressort par un portail en miroir dans l’autre monde, où il reprend sa boucle de
repos ; retour : dans l’autre monde il rouvre un portail vers chez lui et repasse, jusqu’au repos du blob né (ou
au portail ouvert) ; place et taille choisies sur la scène) · Action monde (le blob explore un monde de l’onglet
Mondes, en boucle libre. Première action, le mouvement : il reste sur place et le monde défile derrière lui ; une
seule vitesse règle à la fois le défilement du décor et la déformation du blob (goutte étirée, penchée, qui regarde
devant elle), avec des accélérations réglables et cinq effets de vitesse : étoile filante (il se change en lumière),
étirement, rémanences, onde de choc, flammes de glace) · Mondes (les
décors de l’autre côté des portails, créés, réglés et gardés : pour l’instant l’espace, étoiles en trois
profondeurs, nébuleuse en pixel art, étoiles filantes, caméra). Chaque monde a deux états : **immobile** (il vit
sur place quand le blob y est sans bouger) et **en mouvement** (il défile à la vitesse réglée, pour quand le blob
voyage).

## Directions déjà évoquées pour la suite

- Toujours plus d’actions et d’activités, chacune paramétrable, avec plus de portée dans la scène.
- La scène continuera d’évoluer : d’autres événements y auront lieu.
- Le blob entrera dans le monde du portail et s’y déplacera : le décor suivra ses mouvements (la caméra des
  mondes et leurs couches en profondeur sont prévues pour ça). D’autres types de mondes viendront, chacun avec
  ses réglages, dans l’onglet Mondes.

## Toujours demander : depuis le repos ou boucle libre ?

Avant chaque nouvelle animation, demander à l’auteur ce qu’il veut :
- une **boucle parfaite qui part du blob né et y revient** (première et dernière images = celles du blob né,
  pour enchaîner les GIF), comme Actions, Heure et Électricité ;
- ou une **animation en boucle libre**, qui boucle sur elle-même sans raccord mais n’a pas à partir du blob né,
  comme Boucles.

## Pour juger une modification

- Est-ce que `npm test` passe toujours (boucles et enchaînements exacts) ?
- Est-ce que c’est réglable dans l’interface, en français, avec de bonnes valeurs par défaut ?
- Est-ce que ça reste dans le style de la créature ?
- Est-ce que ça marche dans toute la scène, quelle que soit sa taille ?
