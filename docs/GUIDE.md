# Faire grandir Couveuse

Le guide pour continuer le projet : comment il tient debout, comment demander une nouveauté, et comment vérifier qu’elle
est réussie. À lire avant d’ajouter quoi que ce soit (Claude le lit aussi, avec `CLAUDE.md`). Les mots du projet sont
dans `GLOSSARY.md`.

## En deux mots

La page s’ouvre sur **Vivre** : le blob vit, sans fin, et **ne saute jamais d’image**. On lui demande quoi faire avec des
boutons ; il le fait **à son tour**, en partant de son repos et en y revenant. Chaque chose qu’il sait faire a sa **page de
réglages** (la ⚙ de son bouton) : on y règle ses curseurs, on la voit en boucle, on l’exporte en GIF, planche PNG ou JSON.

## Comment ça tient (les idées à connaître)

- **Le repos.** Quand on ne lui demande rien, il se repose : une boucle de 4 s pour le blob né (son « battement »), la boucle
  de sa forme humaine sous une forme humaine.
- **Tout part du repos et y revient.** Une nouvelle chose ne commence qu’au début d’un battement de son repos, et finit sur un
  repos : c’est pour ça qu’il ne saute jamais. Il peut donc attendre quelques secondes avant de réagir : c’est voulu.
- **Une fois ou en boucle.** Chaque animation se joue :
  - **une fois** : repos → l’animation → repos (les Actions, l’Heure) ;
  - **en boucle** : une **entrée** depuis le repos, la **boucle**, qui continue jusqu’à ce qu’on demande autre chose, une
    **sortie** vers le repos (les Boucles). L’entrée et la sortie se font d’elles-mêmes : l’activité monte doucement puis
    redescend.
- **La fonte en lumière.** Quand la forme humaine doit changer de posture (s’asseoir en tailleur pour dormir), elle fond en
  lumière, change de pose pendant qu’il ne reste rien de sa silhouette, puis reprend forme.
- **Le quart de tour.** Pour marcher ou courir, la forme humaine au sol ne fond pas : elle se tourne de profil d’un quart de
  tour, reste elle-même tout du long, puis se retourne vers nous quand elle s’arrête.
- **Sa place dans la scène.** « Se déplacer » l’emmène ailleurs (jusqu’à la croix) et elle y reste : son repos est là-bas,
  et tout ce qu’elle fait ensuite se fait là-bas (les objets restent où ils sont dans la scène).
- **Les étapes toutes seules.** S’il faut d’abord redevenir blob avant de prendre l’autre forme humaine, il le fait de
  lui-même avant ce qu’on a demandé.
- **Les formes.** Tout ce qu’il fait se fait dans chaque forme (blob né, forme humaine en lévitation, forme humaine au sol). Ce
  qui n’a pas de sens dans une forme est grisé, avec la raison (seule la forme au sol marche et court).
- **Les objets restent.** Ce qu’il fait apparaître reste dans le décor jusqu’à ce qu’on lui demande de le faire disparaître.
- **Les tests au pixel près.** `npm test` rejoue tous les raccords : chaque animation avec ses réglages par défaut, tous ses
  curseurs au minimum, tous au maximum et chaque choix de ses listes, dans chaque forme, puis des vies entières (formes,
  déplacements, objets). S’il échoue, c’est l’animation qu’on corrige, jamais le test.

## Comment une animation est faite

Chaque action et chaque boucle tient dans **un seul fichier**, sa **fiche** : son nom et sa description (sa carte dans
Vivre), ses réglages avec leurs valeurs par défaut (les curseurs de sa page), les formes où elle ne se fait pas (et
pourquoi), et son dessin. Les actions sont dans `src/actions/`, les boucles dans `src/loops/`.

Pour en ajouter une, Claude copie le **modèle** commenté (`_template.js` : une lueur qui monte et redescend pour les
actions, une lumière qui respire pour les boucles), le transforme en la nouvelle animation, et l’ajoute à la liste du
**catalogue** (`index.js`). C’est tout : sa carte dans Vivre, sa page de réglages, sa place dans la vie et ses tests
viennent d’eux-mêmes.

## Demander une nouveauté à Claude

Décris ce que tu veux voir, comme à un animateur : le mouvement, l’humeur, le rythme, la durée, ce qui apparaît autour, et
les réglages que tu aimerais avoir. Claude te demandera d’abord : **« une fois ou en boucle ? »**. Quelques modèles :

- **Une action** : « Ajoute une action : il s’étire comme au réveil, bâille, puis se secoue. Une seule fois. »
- **Une activité en boucle** : « Ajoute une boucle : il pêche des étoiles avec un fil de lumière. En boucle. »
- **Une forme** : « Ajoute une forme : un petit renard de lumière, à quatre pattes. » (elle jouera toutes les animations, ou
  dira pourquoi elle ne peut pas)
- **Une posture** : « Fais vraiment s’asseoir la forme humaine : ses genoux plient, elle se pose sur le sol. »
- **Un objet** : « Ajoute une forme d’objet : une étoile à cinq branches. »
- **Un compagnon** : « Ajoute un compagnon : une petite luciole qui le suit. »

Les recettes prêtes (dans Claude Code) font la même chose avec la bonne méthode : `/new-anim`, `/new-action`,
`/new-loop`, `/new-form`, `/new-thing`, et `/check` pour tout vérifier. Claude s’en sert aussi tout seul quand ta demande
s’y prête.

Deux outils de Matt Pocock (dans `.claude/skills/`) servent avant ou à côté d’une nouveauté, seulement quand tu les demandes :
- `/grill-me` (ou « grille-moi sur ce plan ») : Claude te pose ses questions par séries, avec sa réponse conseillée pour
  chacune, jusqu’à ce que le plan soit clair pour vous deux. Rien n’est construit avant ton accord.
- `/improve-codebase-architecture` (ou « améliore l’architecture ») : Claude cherche où le code pourrait être plus simple à
  faire évoluer, te montre une page avec des propositions (avant / après), puis te questionne sur celle que tu choisis.

## Ce que Claude fait à chaque fois

1. Il demande « une fois ou en boucle ? » et attend ta réponse.
2. Il charge le savoir-faire pixelfx et dessine en regardant ses images : brouillon, rendu, regard, correction.
3. Il la fait pour **chaque forme** (ou il écrit en français pourquoi une forme ne peut pas).
4. Il lui donne **ses réglages**, en français, avec de bonnes valeurs par défaut.
5. Il l’ajoute au catalogue : elle **vit dans Vivre** (son bouton, sa ⚙) et ses raccords sont testés.
6. Il lance `npm run build && npm test` (« all seams exact »), publie la page au même lien et te dit quoi essayer.
7. Il enregistre le travail dans git.

## Vérifier toi-même

- Ouvre la page, reste dans **Vivre**, clique la nouveauté : elle doit partir du repos et y revenir sans aucun saut.
- Essaie-la dans chaque forme (section Forme), et après l’avoir déplacé ailleurs dans la scène (« Se déplacer »).
- Pour une boucle : laisse-la tourner, puis clique autre chose ou « Arrêter la boucle » : la sortie doit être douce.
- Ouvre sa ⚙ : l’aperçu la montre en boucle ; règle-la, puis reviens à la vie (« Revenir à la vie » ou Échap).

## Où sont les choses

- `src/` : un dossier par idée : la vie (`life/`), le blob (`blob/`), les formes (`forms/`), les actions (`actions/`), les
  boucles (`loops/`), l’heure (`clock/`), les objets (`objects/`), la naissance (`birth/`), et ce qui est commun (`shared/`).
  Dans `actions/` et `loops/` : une fiche par animation, le catalogue (`index.js`) et le modèle (`_template.js`).
- `app/main.js` : l’interface (Vivre, les pages de réglages, l’aperçu, les exports). `app/index.template.html` : sa page.
- `tests/seams.mjs` : les tests de raccord. `dist/couveuse.html` : la page construite, celle qu’on ouvre.
- `pixelfx/` : la bibliothèque d’effets de référence, gardée telle quelle (on n’y modifie rien, Claude en est empêché).
- `archive/` : la première naissance, mise de côté pour plus tard.
- `docs/VISION.md` : ce que tu veux. `docs/ARCHITECTURE.md` et `docs/SEAMLESS.md` : comment c’est fait (pour Claude).
  `GLOSSARY.md` : les mots du projet.

## Ce qui reste à faire (idées, dans un ordre conseillé)

1. **S’asseoir pour de vrai** : une posture assise où les genoux plient, que le sommeil utilisera (au lieu de la fonte en
   lumière, comme le quart de tour l’a fait pour la marche).
2. **Les compagnons** : un animal de lumière qui a son propre repos et ses animations.
3. **Construire des objets** : il assemble un objet pièce par pièce et le laisse dans le décor.
4. **Enregistrer un moment de sa vie** en GIF.
5. **Se déplacer en profondeur** : aller vers le fond ou vers nous (il rapetisse ou grandit), et sur ses jambes changer de
   hauteur dans la scène (aujourd’hui il ne va que de côté, le long de son sol).
