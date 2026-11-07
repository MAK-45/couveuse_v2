Build the page and run every check, then report briefly.

1. `npm run build`
2. `npm test` — every line must be `ok`; if any FAIL, find the cause in the effect (see docs/SEAMLESS.md) and fix it, don't touch the test thresholds.
3. `npm run check:fx` — errors must be fixed; "slow" warnings are acceptable.
4. Look at the page: open `dist/couveuse.html` with Playwright (see CLAUDE.md « Commands »), check Vivre plays what changed
   from rest back to rest, open its ⚙ settings page, and that no `pageerror` is raised.
5. Publish `dist/couveuse.html` as the artifact (same link, `downloads` capability) so the author can test it live.
6. Summarise: what passed, what you fixed, and the artifact link.
