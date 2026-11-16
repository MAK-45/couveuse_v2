# Vision et objectifs

Ce que l’auteur veut, tel qu’il l’a demandé au fil du projet. À relire avant toute nouvelle fonctionnalité.

## Le but

Faire **vivre une petite créature de lumière** (le « blob ») : elle vit **dans une page web** (la page **Vivre**), sans
fin, en faisant ce qu’on lui demande avec des boutons, et **sans jamais sauter d’image** d’une animation à l’autre.
Toutes ses animations se fabriquent et se règlent depuis **une seule interface web**, en **boucles parfaites**, et
s’exportent aussi pour d’autres usages (GIF, planches PNG et JSON).

Décision de l’auteur : la créature est dessinée **en direct** dans la page (pas de GIF pré-calculés pour la faire vivre).
Elle peut attendre avant de réagir (même une minute) : le plus important est que sa vie soit **continue**.

La scène va évoluer : d’autres animations, d’autres personnages (des animaux de compagnie), des objets qu’elle
construit et laisse dans le décor. Tout doit pouvoir se combiner : même scène, même place, mêmes raccords.

## Exigences, par ordre d’importance

1. **Jamais de saut.** Aucune animation ne doit avoir de saut visible, ni quand elle reboucle, ni quand une autre
   lui succède. C’est la contrainte numéro un, testée au pixel près (`npm test`), y compris sur des vies entières.
2. **Tout part du repos et y revient.** Chaque animation se joue **une fois** (repos → animation → repos, comme les
   actions et l’heure) ou **en boucle** : une **entrée** depuis le repos, la **boucle** qui dure tant qu’on ne demande
   rien d’autre, une **sortie** vers le repos (comme les Boucles). Ainsi la créature peut tout enchaîner, dans
   n’importe quel ordre.
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
  gemme). **Pas de gravité** dans la scène : tout flotte avec le blob, au rythme de sa boucle. On choisit
  leur position, on les ajoute et on les retire, avec des animations d’apparition et de disparition réglables.
- Tout ce qui est nouveau (effets, objets, décors) reste **dans ce même style** : palette de 8 teintes,
  contours d’un pixel éclairés en haut à gauche, lueurs douces.

## Ce qui existe

La page s’ouvre sur **Vivre** : la créature vit (voir plus bas). Chaque chose qu’il fait se règle depuis Vivre, avec la ⚙
de son bouton ou un lien « Régler … », dans une page de réglages qui la montre en boucle et l’exporte (GIF, planche PNG,
JSON), avec « Revenir à la vie » pour revenir. Ces pages de réglages sont :

- **Naissance** : sa naissance, avant qu’il vive (elle ne fait pas partie de sa vie).
- **Blob né** (dans « Forme ») : le blob lui-même, son corps, ses mouvements au repos, ses yeux, sa lumière, ses couleurs ;
  toutes ses animations le gardent.
- **Actions**, jouées une fois :
  - **Se déplacer** : il va ailleurs dans la scène et y reste. Le blob y glisse en arc, avec de petits bonds s’il veut ;
    la forme en lévitation y vole ; la forme au sol y marche ou y court, de profil, le long de son sol.
  - **Halo de lumière** : il se charge de lumière, puis revient au repos.
- **Boucles**, chacune avec son entrée depuis le repos et sa sortie vers le repos : **Sommeil**, **Magie**, **Marche** et
  **Course**. La marche et la course ont leurs premiers et leurs derniers pas.
- **Heure** : il affiche une heure choisie ou celle de l’export, puis revient au repos.
- **Objets** : la scène vivante, l’apparition et la disparition (halo, laser, cristaux, orbe ; dissolution, laser,
  implosion, éclats, avalé).
- **Formes humaines** (Transformation) : le blob change de forme, en une forme humaine faite de la même lumière de glace.
  - **En lévitation** : une queue de lumière, des jambes pointes vers le bas ou assise en tailleur, les bras qui flottent,
    des cheveux de lumière en apesanteur, ses yeux seulement.
  - **Au sol** : la même, sur ses jambes, avec la gravité. Elle prend forme dans les airs, un sol de glace s’étend sous
    elle, elle tombe, atterrit en pliant les genoux et se tient debout. Elle passe d’un pied sur l’autre (bras détendus,
    poings sur les hanches ou coucou de la main), avec son reflet dans la glace. Au retour, elle saute et redevient le blob.
  - Trois animations qui s’enchaînent : la transformation part du repos du blob né (éclosion, éclair ou spirale), la forme
    en boucle tourne sans fin, et le retour revient exactement au repos du blob né.

**Les formes partout.** Le blob peut jouer toutes ses animations sous une forme humaine : dans Actions, Objets, Boucles et
Heure, un groupe « Forme » choisit le blob né, la forme humaine en lévitation ou la forme humaine au sol. Les animations
s’adaptent : la forme se sert de ses bras (bras levés, ouverts, main tendue vers l’objet), et au sol elle reste sur son sol
de glace (elle s’assoit en tailleur pour dormir). Ce qui n’a pas de sens est désactivé et l’interface dit pourquoi :
seule la forme au sol marche et court. Le repos devient la « Forme en boucle » : les GIF s’enchaînent toujours
(blob né → transformation → animations de la forme… → retour au blob).

**Marcher et courir.** La forme humaine au sol marche et court, vue de profil, avec un mouvement réaliste (talon, plante,
pointe ; genoux qui amortissent ; bras qui balancent à l’opposé des jambes ; buste penché ; cheveux qui suivent ; phase de
vol en course). Dans les Boucles, elle marche et court **sur place** : son sol de glace (reflets, empreintes de lumière)
défile sous ses pieds exactement à la vitesse de ses pas, comme un tapis roulant. La vitesse est en km/h, arrondie pour que
la boucle soit parfaite. Son **entrée** : face à nous, elle se tourne de profil d’un **quart de tour**, sans jamais
redevenir une boule de lumière, puis ses pas grandissent jusqu’à son allure. Sa **sortie** : ses pas raccourcissent, elle
freine, s’arrête et se retourne vers nous. Le pied posé ne glisse jamais, même quand l’allure change. Pour **se déplacer**,
elle marche ainsi pour de vrai jusqu’à l’endroit choisi, ses empreintes restant sur le sol.

**Règle pour la suite : chaque nouvelle animation est faite pour chaque forme** (blob né, forme humaine en lévitation,
forme humaine au sol, et toute forme ajoutée plus tard), adaptée à chacune ; si elle n’a vraiment pas de sens dans une
forme, elle y est désactivée et l’interface dit pourquoi. Et chaque nouvelle forme joue toutes les animations existantes.

## La vie (page Vivre)

La créature vit sans fin. Des boutons lui demandent quoi faire : les actions, les activités en boucle (elle s’y met,
continue jusqu’à ce qu’on lui demande autre chose ou « Arrêter la boucle », puis s’arrête), l’heure (l’heure qu’il est),
ses trois formes et les objets. Elle fait chaque chose **à son tour**, en partant de son repos et en y revenant, au
battement de sa boucle de repos ; si une étape est nécessaire, elle la prend d’elle-même (redevenir blob avant de prendre
l’autre forme humaine…). On voit ce qu’elle fait et ce qui suit ; ce qu’elle ne peut pas faire est grisé avec la raison.
Chaque animation garde les réglages de sa page de réglages (sa ⚙).

Quand la forme humaine doit changer de posture pour une activité (s’asseoir en tailleur pour dormir), elle **fond en
lumière**, change de pose pendant qu’il ne reste rien de sa silhouette, et reprend forme. Pour marcher et courir, elle se
tourne de profil d’un quart de tour, sans fondre.

**Elle va et vient dans la scène.** « Se déplacer » l’emmène jusqu’à la croix (un clic dans la scène) : elle y reste, son
repos est là-bas, et tout ce qu’elle fait ensuite se fait là-bas ; les objets restent où ils sont dans la scène. Sa place
est gardée d’une visite à l’autre (elle revient à sa place si on change sa place dans la scène ou la scène elle-même).

**Les objets restent dans le décor** jusqu’à ce qu’on lui demande de les faire disparaître. On choisit où (un clic dans la
scène), la forme, la taille, la teinte, le plan, la manière d’apparaître et de disparaître. Ils sont gardés d’une visite à
l’autre, comme la forme et la place où elle se trouve.

## Directions déjà évoquées pour la suite

- La forme humaine qui s’assoit vraiment (genoux qui plient), d’autres personnages et des **animaux de compagnie**, des
  objets qu’elle **construit** et laisse dans le décor.
- Dans Vivre : enregistrer un moment de sa vie en GIF ; se déplacer aussi en profondeur (vers le fond ou vers nous) et, sur
  ses jambes, changer de hauteur dans la scène.
- Toujours plus d’actions et d’activités, chacune paramétrable, avec plus de portée dans la scène.
- La scène continuera d’évoluer : d’autres événements y auront lieu.
- D’autres formes viendront (la forme humaine en lévitation et au sol sont les premières), chacune avec sa transformation,
  sa boucle et son retour, et chacune jouera toutes les animations.

## Toujours demander : une fois ou en boucle ?

Avant chaque nouvelle animation, demander à l’auteur ce qu’il veut :
- **une seule fois** : elle part du repos et y revient (première et dernière images = celles du repos), comme Actions et
  Heure ;
- ou **en boucle** : elle s’y met depuis le repos (entrée), continue autant qu’on veut (boucle), puis s’arrête et revient
  au repos (sortie), comme Boucles.
Dans les deux cas elle se fait pour chaque forme, et elle vit dans Vivre.

## Pour juger une modification

- Est-ce que `npm test` passe toujours (boucles et enchaînements exacts) ?
- Est-ce qu’elle vit dans Vivre, dans chaque forme, sans saut ?
- Est-ce que c’est réglable dans l’interface, en français, avec de bonnes valeurs par défaut ?
- Est-ce que ça reste dans le style de la créature ?
- Est-ce que ça marche dans toute la scène, quelle que soit sa taille ?
