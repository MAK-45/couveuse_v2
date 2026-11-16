---
paths:
  - "app/**"
---
# The page (app/)

- The UI is in French with typographic punctuation (’ « »); code and comments in English, straight quotes in code.
- Actions and loops come from the catalogues (`FAMILIES`, `ficheOf()`, `pageDef()`, Vivre's cards): never list an
  animation, its rows or its defaults here. Points and lengths in % of the scene become effect px in `effOpts()`
  (`sceneUnits()`).
- `setV(k, v)` routes a key to its store (`S.life`, `S.shared`, `S.blob`, `S.actions`, `S.objects`, `S.loops`, `S.clock`,
  `S.transform`): a new key of a page goes in that page's `*_KEYS`, or it lands in `S.blob`.
- Controls may be missing on a page: wire them with `on(id, event, fn)`, never `$(id).onclick =`.
- Saved state: `localStorage` key `couveuse-v3`; `sanitize()` keeps each store's known keys over the defaults (add a check
  there for a new choice list).
- The exports save through `window.claude.use("downloads")` on claude.ai: keep the `downloads` capability when publishing.
- After a change: `npm run build && npm test`, look at the page with Playwright (CLAUDE.md « Commands »), publish the
  artifact.
