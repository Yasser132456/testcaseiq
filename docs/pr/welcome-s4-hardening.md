# Welcome S4 regression hardening

## Summary

- locks the welcome route at 360, 768, 1024, 1440, and 1920 pixels with containment, headline, stacking, and 44-pixel target assertions
- routes welcome animation policy through `MotionService` and verifies reduced-motion plus `?bg=fallback` render one static approved frame with no animation loop
- adds serious/critical axe coverage, keyboard focus checks, heading-order checks, and the decorative instrument-panel accessibility contract
- instruments and optimizes the lazy dot-grid render loop to enforce a 1.5 ms p95 main-thread frame budget while retaining every raw frame in the audit artifact
- commits deterministic 1440x900 and 390x844 fallback screenshot baselines

## Bundle delta

| Bundle | Baseline | Candidate | Delta |
|---|---:|---:|---:|
| Shared main | 843,139 B | 843,139 B | 0 B |
| Lazy welcome | 31,078 B | 33,991 B | +2,913 B |

The welcome route remains lazy-loaded. The candidate welcome chunk contains zero Three.js modules, confirming that the deleted Three.js welcome branch is absent from the chunk.

The exact comparison is reproducible with `npm run bundle:welcome`; its generated report is committed at `artifacts/perf-audit/welcome-s4-bundle-report.md`.

## Verification

- `npm run build` — passed (existing size-budget warnings remain)
- `npm run test:unit` — passed, 232/232
- welcome responsive, motion, accessibility, performance, and screenshot coverage — passed
- complete Playwright run — 39/41 passed locally; the two failures are pre-existing non-welcome performance budgets: dashboard entrance long task and review-board Lenis frame 0

No dashboard or review-board production code is changed by this PR. The welcome performance test passes in the same full four-worker run.
