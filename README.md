# Couveuse

Une créature de lumière glacée en pixel art qui **vit** dans une page web, sans fin et sans jamais sauter d’image, et
l’éditeur web qui règle chacune de ses animations et l’exporte en GIF, planche PNG et JSON, toujours en boucle parfaite.

La page s’ouvre sur **Vivre** : il vit, on lui demande quoi faire, il l’enchaîne de lui-même, et ce qu’il fait apparaître reste
dans le décor, lié à un monde ou le suivant. Chaque chose se règle depuis là (⚙), dans sa page de réglages, qui la montre en
boucle et l’exporte : **Naissance**, **Apparence** (le blob né, son repos), **Actions** (19, il revient
toujours au repos), **Objets** (il crée et retire des formes qui flottent dans la scène), **Boucles** (20 activités, chacune
avec son entrée depuis le repos et sa sortie vers le repos), **Heure** (il affiche l’heure), **Électricité**, **Portail**,
**Action monde**, **Transformation** (il prend une forme humaine, en lévitation ou debout sur un sol de glace avec la
gravité, et redevient blob), **Mondes** et **Surface planète**.

## Démarrer

```bash
npm install
npm run build      # crée dist/couveuse.html, à ouvrir dans un navigateur
npm test           # vérifie au pixel près que toutes les boucles et tous les enchaînements sont exacts
```

Avec Claude Code : ouvre ce dossier, `CLAUDE.md` est lu automatiquement. Commandes prêtes :
`/check`, `/new-anim <idée>` (demande d’abord : une fois ou en boucle ?), `/new-action <idée>`, `/new-loop <idée>`.

## Licence

`pixelfx/` est la bibliothèque pixelfx (MIT, © Patch, Hugo Duprez), voir `pixelfx/LICENSE`.
