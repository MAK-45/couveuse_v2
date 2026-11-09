# Vendored skills (Matt Pocock)

From https://github.com/mattpocock/skills (MIT, see `LICENSE-mattpocock`), commit `4ae2317`, copied unchanged.

| Skill | Invoked by | Role |
|---|---|---|
| `grill-me` | the author only (`/grill-me`) | entry point: loads `grilling` |
| `grilling` | `grill-me`, `improve-codebase-architecture`, or « grill me » | relentless interview, in rounds, on a plan or design |
| `improve-codebase-architecture` | the author only (`/improve-codebase-architecture`) | finds deepening opportunities, HTML report, then grills the chosen one |
| `codebase-design` | `improve-codebase-architecture` | vocabulary: module, interface, depth, seam, adapter, leverage, locality |
| `domain-modeling` | `improve-codebase-architecture` | keeps `GLOSSARY.md` and `docs/adr/` (created lazily) |

How they apply to this project: see « Matt Pocock's skills » in `CLAUDE.md`.
To update: copy the five folders again from the upstream repo (`skills/productivity/`, `skills/engineering/`) and bump the commit here.
