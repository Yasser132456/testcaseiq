# Motion and Quality Hardening Design

## Goal

Lock in the quality of the Angular 22 frontend after the Sprint 1–7 visual and motion work. This pass adds no product features. It makes the existing effects measurable, consistently gated, visibility-aware, accessible, deterministic under visual testing, and documented.

## Constraints

- No animation task may block the main thread for more than 50 ms.
- Pointer glow and Lenis style/layout work must remain below 1 ms per animation frame.
- Product-route initial JavaScript must not grow by more than 5% relative to commit `0a2b356` on `main`.
- `MotionService` is the only JavaScript source of reduced-motion, quality-tier, fallback, and visibility policy.
- `?bg=fallback` disables the Three.js scene, cursor light, and scene pulses.
- Skeleton sweep, dashboard pipeline flow, scanlines, and the background scene pause while the document is hidden.
- Serious and critical axe findings are release blockers on the required routes.
- Visual baselines run with reduced motion and `?bg=fallback` and live under `frontend/e2e/**screenshots**`.
- Generated Playwright output remains ignored.
- The README addition remains under 30 lines.

## Architecture

### Central motion policy

Extend `MotionService` as the single reactive policy boundary. It owns the media-query listener, quality tier, fallback query parameter, and document visibility state. Consumers ask the service whether an effect is permitted; they do not read `matchMedia`, URL parameters, or visibility directly.

The service exposes narrowly named signals or policy methods for reduced motion, static fallback, document visibility, and effect eligibility. CSS reduced-motion media queries remain valid because the single-code-path requirement applies to JavaScript runtime decisions.

### Effect lifecycle

Existing services and components keep ownership of their effects, but their lifecycle derives from `MotionService`:

- Lenis attaches its ticker only when smooth scrolling is permitted and visible.
- Pointer glow installs listeners and schedules writes only when cursor effects are permitted and visible.
- The background scene never imports Three.js in fallback mode, stops its frame loop while hidden, and suppresses cursor light and operation pulses.
- Dashboard pipeline flow, skeleton sweep, and scanlines receive a shared paused state through a root document attribute or a small visibility directive/utility backed by `MotionService`.
- Component entrance/review animations use the service instead of direct reduced-motion checks.

### Bundle boundary

Keep Three.js behind its existing dynamic import. Move GSAP plugins and welcome-only animation dependencies behind dynamic imports where build stats show they entered initial chunks. Preserve current public behavior while making asynchronous initialization abortable on teardown or policy changes.

### Quality harness

Add focused Playwright suites rather than expanding the existing monolithic scenario file:

- `accessibility.spec.ts` scans `/`, `/login`, dashboard, stories list/detail, review board, and settings with `@axe-core/playwright`, failing on serious or critical violations.
- `visual-regression.spec.ts` captures the required deterministic states using reduced-motion emulation and `?bg=fallback`.
- `performance.spec.ts` records long tasks and animation-frame style/layout costs for welcome, dashboard, story navigation, and review board, then enforces the stated budgets.
- Shared E2E helpers provide login/demo navigation, stable loading waits, deterministic masking, and search-modal opening.

Screenshot snapshots are stored under an E2E `__screenshots__` directory and Playwright's output directory remains ignored.

## Accessibility

Run axe against every required route and fix only serious or critical issues discovered. Add or normalize `:focus-visible` styling for all interactive v3 controls. AI loading, success, empty, and error transitions use polite or assertive `aria-live` regions appropriate to urgency without duplicating announcements.

## Performance measurement

Use the existing `artifacts/perf-audit` harness where practical and add assertions that can run in Playwright. Produce production `stats.json` for both `main` and the hardened tree using isolated temporary worktrees or archived build output, compare initial chunks, and document byte totals and percentage delta in a PR-body-ready Markdown artifact. The comparison uses identical Node, npm lockfile, and Angular build settings.

## Verification

The acceptance gate is:

1. Angular production build with stats succeeds.
2. Frontend unit tests pass headlessly.
3. Full Playwright E2E, axe, performance, and screenshot suites pass.
4. Screenshot baselines are present and test output is absent from Git tracking.
5. A search finds no JavaScript `prefers-reduced-motion` checks outside `MotionService`.
6. Bundle delta is at most 5% and recorded in the PR-body artifact.
7. README documents tiers, fallback mode, and reduced-motion behavior in fewer than 30 lines.

## Non-goals

- New motion, visual states, routes, or demo content.
- Redesigning existing screens.
- Fixing axe findings below serious severity unless a nearby change naturally resolves them.
- Replacing Angular, Playwright, GSAP, Lenis, or Three.js.
