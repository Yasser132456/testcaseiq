# Welcome Regression Hardening Design

## Goal

Lock the rebuilt welcome route against responsive, motion-policy, performance, accessibility, and visual regressions without adding features or changing its approved visual direction.

## Scope

The implementation is limited to the Angular welcome route, its shared motion policy, Playwright quality coverage, deterministic screenshot baselines, and bundle/performance evidence. Existing copy, semantic color roles, component vocabulary, and the “Black Glass Instrument” composition remain intact.

## Responsive contract

Playwright will exercise the complete welcome page at viewport widths 360, 768, 1024, 1440, and 1920. At every width it will assert that the document and principal welcome regions have no horizontal overflow, the actual two-line headline stays inside its container and viewport, and every visible interactive target is at least 44 by 44 CSS pixels.

The hero remains two columns only above the existing 900px content breakpoint. At 900px and below, the review-gate instrument stacks after the hero copy at full available width. The workflow changes from four columns to two and then one as space requires; the formats strip wraps without clipping. CSS changes will be limited to corrections proven necessary by the failing regression tests.

## Motion and fallback contract

`MotionService` is the sole JavaScript source of truth for reduced-motion, quality-tier, document-visibility, pointer capability, and `?bg=fallback` policy. The welcome dot-grid loop, hero entrance, review-gate cycle, and magnetic CTAs consume that service rather than creating their own media queries.

CSS reduced-motion rules may provide non-scripted safety fallbacks, but no welcome TypeScript code may call `matchMedia('(prefers-reduced-motion…')` outside `MotionService`. A source-level test will guard that boundary.

Both reduced motion and `?bg=fallback` render an immediately complete, deterministic frame: no dot-grid animation frame loop, no hero entrance sequence, no review-gate timer cycle, no magnetic pointer behavior, and the review gate fixed in its approved state. Tests will observe animation-frame and timer behavior rather than relying only on visual appearance.

## Performance and bundle contract

Playwright will collect `longtask` entries across initial entrance and a steady-state observation window; no task may exceed 50ms. It will instrument welcome-page animation-frame callbacks before application boot and assert that dot-grid main-thread callback work remains below 1.5ms per measured frame.

Production builds will emit stats for bundle comparison. Evidence will record the shared initial bundle and the lazy welcome chunk before and after the sprint. The initial bundle must not increase because of welcome code. The route must remain lazy-loaded, and the welcome chunk’s module listing must contain no Three.js module or deleted Three.js welcome implementation. Three.js may remain elsewhere in the application if still used by non-welcome routes.

## Accessibility contract

`@axe-core/playwright` is the standard axe integration. It is already present in the current lockfile and package manifest, so dependency work is limited to confirming the installed version rather than adding a duplicate.

The welcome page will pass axe with zero serious or critical violations. Keyboard tests will confirm visible focus indicators on navigation, primary and secondary CTAs, and footer links. The animated instrument panel will be hidden from the accessibility tree and paired with a concise static screen-reader description of the approved review-gate state. The document will expose exactly one `h1` and maintain ordered heading levels.

## Visual lock

The visual-regression suite will add dedicated welcome snapshots at 1440x900 and 390x844. Both navigate to `/?bg=fallback` with `prefers-reduced-motion: reduce`, wait for fonts and the static approved frame, assert that no animation frame loop remains active, and then capture the full deterministic page. Baselines live under `frontend/e2e/__screenshots__/` through the existing Playwright snapshot template.

## Test-first sequence

1. Add focused unit and Playwright assertions and run them to confirm the relevant failures.
2. Centralize any remaining welcome policy decisions in `MotionService` and make the fallback frame deterministic.
3. Apply the smallest responsive and accessibility corrections required to turn the tests green.
4. Generate and inspect both screenshot baselines.
5. Run the complete unit, production build, and full Playwright suites.
6. Produce PR-ready evidence stating the initial/welcome bundle delta and confirming that Three.js is absent from the welcome chunk.

## Non-goals

- No new welcome content, sections, interactions, or visual effects.
- No redesign of the approved hero, instrument panel, workflow, or formats strip.
- No unrelated motion cleanup outside code introduced for Sprints 1–3.
- No removal of Three.js from application areas that still legitimately use it.

## Acceptance

The work is complete only when the production build, unit suite, and full Playwright suite pass; responsive, axe, performance, and visual-lock checks are included in that suite; both baselines are committed; and the handoff contains measured bundle deltas plus explicit welcome-chunk proof for the removed Three.js branch.
