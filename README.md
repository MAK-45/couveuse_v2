# Couveuse

Une créature de lumière glacée en pixel art, et l’éditeur web qui la règle et l’exporte en GIF, planche PNG
et JSON, toujours en boucle parfaite.

Six onglets : **Naissance**, **Blob né** (le repos), **Actions** (18, il revient toujours au repos),
**Objets** (il crée et retire des formes qui flottent dans la scène), **Boucles** (18 activités sans fin),
**Heure** (il affiche l’heure).

## Démarrer

```bash
npm install
npm run build      # crée dist/couveuse.html, à ouvrir dans un navigateur
npm test           # vérifie au pixel près que toutes les boucles et tous les enchaînements sont exacts
```

Avec Claude Code : ouvre ce dossier, `CLAUDE.md` est lu automatiquement. Commandes prêtes :
`/check`, `/new-action <idée>`, `/new-loop <idée>`.

## Licence

`pixelfx/` est la bibliothèque pixelfx (MIT, © Patch, Hugo Duprez), voir `pixelfx/LICENSE`.
