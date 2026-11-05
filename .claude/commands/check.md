Build the page and run every check, then report briefly.

1. `npm run build`
2. `npm test` — every line must be `ok`; if any FAIL, find the cause in the effect (see docs/SEAMLESS.md) and fix it, don't touch the test thresholds.
3. `npm run check:fx` — errors must be fixed; "slow" warnings are acceptable.
4. Summarise: what passed, what you fixed.
