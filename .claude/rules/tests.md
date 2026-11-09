---
paths:
  - "tests/**"
---
# Seam tests (tests/seams.mjs)

- Pixel-exact and never loosened: a FAIL is fixed in the effect (docs/SEAMLESS.md says why each rule holds).
- It walks the catalogue by itself: a new action or loop, its settings, and every form of `FORMS` are tested with no
  change here.
- Touch it only for what the catalogue doesn't bring: a new tab or kind of step (its checks, and its requests in the
  generated lives), a variant of a form in `FORM_CASES`, a transformation case in `TF_CASES`, an extreme of the other
  tabs' length rows in `EXTREMES`.
- One line per group, failures in detail below it. Keep the run under ~30 s (about 2,500 frames today).
