# Couveuse

Une créature de lumière glacée en pixel art qui **vit** dans une page web, sans fin et sans jamais sauter d’image, et
l’éditeur web qui règle chacune de ses animations et l’exporte en GIF, planche PNG et JSON, toujours en boucle parfaite.

La page s’ouvre sur **Vivre** : il vit, on lui demande quoi faire, il l’enchaîne de lui-même, et ce qu’il fait apparaître
reste dans le décor. Chaque chose se règle depuis là (⚙), dans sa page de réglages, qui la montre en boucle et l’exporte :
**Naissance**, **Blob né** (son repos), **Actions** (« Se déplacer » : il va ailleurs dans la scène et y reste ; « Halo de
lumière » : il revient au repos), **Boucles** (sommeil, magie, marche, course, chacune avec son entrée depuis le repos et sa
sortie vers le repos), **Heure** (il affiche l’heure), **Objets** (il crée et retire des formes qui flottent dans la scène)
et **Formes humaines** (il prend une forme humaine, en lévitation ou debout sur un sol de glace avec la gravité, et
redevient blob).

## Démarrer

```bash
npm install
npm run build      # crée dist/couveuse.html, à ouvrir dans un navigateur
npm test           # vérifie au pixel près toutes les boucles et tous les enchaînements, dans chaque forme
```

Pour continuer le projet (ajouter des animations, des formes, des objets) : lis `docs/GUIDE.md`. Une animation tient dans
un seul fichier (sa fiche, faite à partir d’un modèle commenté) ajouté au catalogue.

Avec Claude Code : ouvre ce dossier, `CLAUDE.md` est lu automatiquement. Recettes prêtes : `/check`, `/new-anim <idée>`
(demande d’abord : une fois ou en boucle ?), `/new-action <idée>`, `/new-loop <idée>`, `/new-form <idée>`,
`/new-thing <idée>`.

## Licence

`pixelfx/` est la bibliothèque pixelfx (MIT, © Patch, Hugo Duprez), voir `pixelfx/LICENSE` : notre bibliothèque de référence,
gardée telle quelle (on n’y modifie rien). Nos effets sont dans `src/`.
