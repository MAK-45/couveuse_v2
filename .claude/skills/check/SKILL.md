---
name: check
description: Build the page and run every check (seam tests, pixelfx checks, the page itself in a browser), fix what fails, publish the artifact and report briefly. Use before handing work over, or when the author asks to check everything.
---
Build the page and run every check, then report briefly.

1. `npm run build`
2. `npm test` — every line `ok`, « all seams exact ». On a FAIL find the cause in the effect (docs/SEAMLESS.md) and fix
   it; never loosen the test.
3. `npm run check:fx` — errors must be fixed; warnings about speed or the canvas size are acceptable.
4. The page: open `dist/couveuse.html` with Playwright (CLAUDE.md « Commands »), check Vivre plays what changed from rest
   back to rest, open its ⚙ settings page, and that no `pageerror` is raised.
5. Publish `dist/couveuse.html` as the artifact (CLAUDE.md « After every change »).
6. Summarise: what passed, what you fixed, the artifact link.
