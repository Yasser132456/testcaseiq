# Motion and Quality Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce measurable performance, a single motion kill-switch, visibility-aware loops, serious/critical accessibility compliance, deterministic visual regression coverage, and concise operator documentation without adding product behavior.

**Architecture:** `MotionService` becomes the sole reactive runtime policy for reduced motion, fallback tier, pointer eligibility, and document visibility. Existing effect owners subscribe to that policy, while Playwright uses stable API fixtures plus reduced motion and `?bg=fallback` to enforce accessibility, performance, and screenshots. Build stats are compared with a small checked-in script and rendered as a PR-body-ready Markdown report.

**Tech Stack:** Angular 22 signals, Jasmine/Karma, GSAP 3, Lenis, Three.js, Playwright 1.61, `@axe-core/playwright`, Node.js 24.

## Global Constraints

- No long task may exceed 50 ms during an animation.
- Pointer-glow and Lenis style/layout work must remain below 1 ms per animation frame.
- Product-route initial JavaScript must not grow more than 5% relative to `main` commit `0a2b356`.
- `MotionService` must gate every JavaScript effect; no reduced-motion `matchMedia` call may remain elsewhere.
- `?bg=fallback` must disable the Three.js scene, cursor light, and scene pulses.
- Skeleton sweep, pipeline flow, scanlines, and the background scene must pause while hidden.
- Fix all serious and critical axe findings on the required routes.
- Commit deterministic screenshot baselines, never generated Playwright output.
- Add fewer than 30 README lines for motion and quality tiers.

---

### Task 1: Capture and automate the bundle baseline

**Files:**
- Create: `frontend/scripts/compare-bundle-stats.mjs`
- Create: `artifacts/perf-audit/main-stats.json` from the clean `main` build
- Create: `artifacts/perf-audit/bundle-size-report.md`
- Modify: `frontend/package.json`
- Test: `frontend/scripts/compare-bundle-stats.test.mjs`

**Interfaces:**
- Consumes: Angular esbuild `stats.json` files.
- Produces: `summarizeInitialJavaScript(stats): { bytes: number; outputs: string[] }` and `compareBundleStats(base, candidate, maxGrowthPercent)`.

- [ ] **Step 1: Write the failing Node test**

Create fixture objects with `main-A.js`, `polyfills-A.js`, a lazy chunk, and CSS. Assert that only entry-point JavaScript is totaled and that a 5.01% increase fails while 5% passes.

- [ ] **Step 2: Verify the test fails**

Run: `node --test frontend/scripts/compare-bundle-stats.test.mjs`

Expected: failure because `compare-bundle-stats.mjs` does not exist.

- [ ] **Step 3: Implement the comparator**

Export pure summary/comparison functions. In CLI mode accept `--base`, `--candidate`, `--max-growth`, and `--report`; emit a Markdown table with base bytes, candidate bytes, delta bytes, percentage, and pass/fail. Identify initial outputs as JavaScript outputs with `entryPoint` and no `dynamicImport` relationship; exclude CSS and lazy outputs.

- [ ] **Step 4: Record the baseline and prove the script**

Run:

```powershell
npm.cmd --prefix frontend run build -- --stats-json
Copy-Item frontend/dist/testcaseiq-frontend/stats.json artifacts/perf-audit/main-stats.json
node --test frontend/scripts/compare-bundle-stats.test.mjs
```

Expected: tests pass and the baseline initial bundle records `911258` bytes of main JavaScript plus the initial polyfills entry.

- [ ] **Step 5: Add package scripts**

Add `test:unit`, `e2e:a11y`, `e2e:visual`, `e2e:performance`, and `bundle:compare` scripts using `ng test --watch=false --browsers=ChromeHeadless`, focused Playwright filenames, and the comparator CLI.

### Task 2: Make MotionService the single policy boundary

**Files:**
- Modify: `frontend/src/app/core/motion/motion.service.ts`
- Modify: `frontend/src/app/core/motion/motion.service.spec.ts`
- Modify: `frontend/src/app/core/motion/lenis.service.ts`
- Modify: `frontend/src/app/core/motion/lenis.service.spec.ts`
- Modify: `frontend/src/app/app.routes.ts`
- Modify: `frontend/src/app/pages/welcome/welcome-page.component.ts`

**Interfaces:**
- Produces signals `documentVisible`, `motionEnabled`, `cursorEffectsEnabled`, `sceneEffectsEnabled`, and `forcedFallback`.
- Produces `loadScrollTrigger(): Promise<typeof import('gsap/ScrollTrigger').ScrollTrigger>`.
- Lenis consumes `motionEnabled` and `documentVisible`.

- [ ] **Step 1: Add failing policy tests**

Extend the media-query stub to cover fine, hover, and coarse pointer queries. Assert that `?bg=fallback` sets `forcedFallback`, disables cursor/scene effects, and that dispatching `visibilitychange` to hidden disables motion and sets `data-motion-paused="true"` on `document.documentElement`. Assert restoration on visible and listener cleanup on destroy.

- [ ] **Step 2: Verify the policy tests fail for missing signals**

Run: `npm.cmd --prefix frontend run test:unit -- --include src/app/core/motion/motion.service.spec.ts`

Expected: compile failures for the new missing service API.

- [ ] **Step 3: Implement the policy**

Use Angular `signal`/`computed`; keep all media-query and URL reads in `MotionService`; register one `visibilitychange` listener through injected `DOCUMENT`; reflect paused state on the root element. Remove the eager ScrollTrigger import and register it inside a memoized dynamic `loadScrollTrigger()` promise.

- [ ] **Step 4: Add failing Lenis visibility tests**

Assert Lenis stops when `documentVisible` becomes false and restarts only when visible with motion enabled. Update the fake motion object to expose the new signals and a no-op ScrollTrigger updater when the plugin is not loaded.

- [ ] **Step 5: Implement and verify Lenis gating**

Include visibility in the policy effect, cancel its ticker on hide, and avoid any layout reads/writes in the ticker beyond `lenis.raf`.

Run: `npm.cmd --prefix frontend run test:unit -- --include src/app/core/motion/lenis.service.spec.ts`

Expected: all Lenis tests pass.

- [ ] **Step 6: Lazy-load welcome and ScrollTrigger**

Change the root route to `loadComponent: () => import('./pages/welcome/welcome-page.component')`. In the welcome component, use a type-only ScrollTrigger import, await `motion.loadScrollTrigger()` inside narrative setup, and abort/kill it during teardown. Do not import Three.js or ScrollTrigger before the policy permits the effect.

### Task 3: Refactor every effect consumer and pause every loop

**Files:**
- Modify: `frontend/src/app/shared/services/pointer-glow.service.ts`
- Modify: `frontend/src/app/shared/services/pointer-glow.service.spec.ts`
- Modify: `frontend/src/app/shared/background/background-scene.component.ts`
- Modify: `frontend/src/app/shared/background/background-scene.service.ts`
- Modify: `frontend/src/app/shared/background/background-scene.component.spec.ts`
- Modify: `frontend/src/app/shared/background/background-scene.service.spec.ts`
- Modify: `frontend/src/app/shared/skeleton/skeleton.component.ts`
- Modify: `frontend/src/app/shared/skeleton/skeleton.component.spec.ts`
- Modify: `frontend/src/app/pages/dashboard/dashboard-page.component.ts`
- Modify: `frontend/src/app/pages/dashboard/dashboard-page.component.css`
- Modify: `frontend/src/styles.css`
- Modify reduced-motion consumers: `frontend/src/app/layout/app-layout.component.ts`, `frontend/src/app/pages/settings/settings-page.component.ts`, `frontend/src/app/pages/admin/audit-log-page.component.ts`, `frontend/src/app/pages/review-board/review-board-page.component.ts`, `frontend/src/app/pages/stories/story-detail-page.component.ts`, `frontend/src/app/pages/stories/story-review-tab.component.ts`, `frontend/src/app/shared/components/badge.component.ts`, `frontend/src/app/shared/components/drawer.component.ts`, `frontend/src/app/shared/components/toast-container.component.ts`, `frontend/src/app/shared/directives/table-stagger.directive.ts`, `frontend/src/app/shared/directives/tilt.directive.ts`

**Interfaces:**
- All consumers inject `MotionService` and read its signals.
- CSS animation pause uses `html[data-motion-paused='true']` or `:host-context(html[data-motion-paused='true'])`.

- [ ] **Step 1: Add failing pointer and background policy tests**

Assert pointer glow installs no listener under reduced motion, fallback, coarse pointer, or hidden document; cancels a queued frame on hide; and clears CSS variables. Assert background `init` returns fallback before dynamic Three.js import when forced fallback, suppresses operation accents outside high/visible motion, and does not schedule the next animation frame while hidden.

- [ ] **Step 2: Verify the focused tests fail**

Run: `npm.cmd --prefix frontend run test:unit -- --include src/app/shared/services/pointer-glow.service.spec.ts --include src/app/shared/background/*.spec.ts`

Expected: failures showing direct media-query ownership and missing visibility behavior.

- [ ] **Step 3: Refactor pointer glow**

Delete its four media-query fields and listeners. Drive listener synchronization from an Angular `effect` over `MotionService.cursorEffectsEnabled`; call `cancelAnimationFrame` and clear active targets whenever policy becomes false. Preserve the single-rAF batching and nearby-element filter.

- [ ] **Step 4: Refactor the background scene**

Have the component pass only render mode and abort signal; have the service read policy itself. Gate `import('three')`, cursor-light binding, operation pulses, and frame scheduling through `sceneEffectsEnabled`, `forcedFallback`, and `documentVisible`. Render one static frame for reduced motion but no WebGL scene for fallback.

- [ ] **Step 5: Pause CSS loops**

Add a host paused class to skeleton from `!motion.documentVisible()` and set `animation-play-state: paused` for `.tcq-skeleton-shimmer`. Replace the dashboard HostListener with `MotionService.documentVisible` and pause `.pipeline-connector`. Add root paused selectors for global scanline and skeleton animations.

- [ ] **Step 6: Replace every direct reduced-motion read**

Inject `MotionService` in each listed consumer and replace helper methods or direct `matchMedia` expressions with `motion.reducedMotion()` or a more specific policy signal. CSS `@media (prefers-reduced-motion)` rules remain.

- [ ] **Step 7: Verify focused tests and static search**

Run:

```powershell
npm.cmd --prefix frontend run test:unit -- --include src/app/core/motion/*.spec.ts --include src/app/shared/services/pointer-glow.service.spec.ts --include src/app/shared/background/*.spec.ts --include src/app/shared/skeleton/skeleton.component.spec.ts
rg "matchMedia\(['\"]\(prefers-reduced-motion" frontend/src -g "*.ts" -g "!motion.service.ts"
```

Expected: tests pass and `rg` returns no matches.

### Task 4: Add deterministic E2E fixtures, axe, and focus/live-region coverage

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Create: `frontend/e2e/support/quality-fixtures.ts`
- Create: `frontend/e2e/accessibility.spec.ts`
- Modify as findings require: `frontend/src/app/shared/components/state-message.component.ts`, `frontend/src/app/shared/search-modal/search-modal.component.html`, `frontend/src/styles.css`, `frontend/src/app/layout/app-layout.component.css`, and owning required-route component templates/styles.

**Interfaces:**
- Produces `installDeterministicApi(page)`, `authenticateQualityUser(page, request)`, `gotoStable(page, path)`, and stable story/suite IDs.

- [ ] **Step 1: Install axe and create failing scans**

Run: `npm.cmd --prefix frontend install --save-dev @axe-core/playwright`

Create a parameterized test for `/`, `/login`, `/dashboard`, `/stories`, `/stories/story-quality`, `/review-board`, and `/settings`. Use `AxeBuilder.include('body').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa'])`, filter impacts to `serious` and `critical`, attach JSON details, and expect the filtered list to equal `[]`.

- [ ] **Step 2: Add deterministic authenticated fixtures**

Register a quality user through the existing API, place its token in local storage, and intercept dashboard, stories, story detail, suites, review board, settings, notifications, and search endpoints with fixed JSON and ISO timestamps. Keep fixture content reusable by visual and performance suites.

- [ ] **Step 3: Run axe to establish real failures**

Run: `npm.cmd --prefix frontend run e2e:a11y`

Expected: failures list exact serious/critical rule IDs and selectors, or pass if none exist.

- [ ] **Step 4: Fix each serious/critical root cause test-first**

For every reported selector, add a focused locator assertion for its accessible name, role, label relationship, dialog ownership, or contrast token before changing the owning template/style. Use `role="alert"` with `aria-live="assertive"` for AI errors and `role="status"` with `aria-live="polite"` for loading/success/empty states. Ensure every v3 button, link, card action, search result, nav control, review action, and welcome CTA has a visible two-pixel focus ring with at least a two-pixel offset.

- [ ] **Step 5: Verify accessibility and focus behavior**

Run: `npm.cmd --prefix frontend run e2e:a11y`

Expected: zero serious/critical violations on all seven route states and explicit focus/live-region assertions pass.

### Task 5: Add deterministic screenshot coverage and baseline handling

**Files:**
- Create: `frontend/e2e/visual-regression.spec.ts`
- Create: `frontend/e2e/__screenshots__/visual-regression.spec.ts-snapshots/*.png`
- Modify: `.gitignore`
- Modify: `frontend/playwright.config.ts`

**Interfaces:**
- Consumes deterministic fixtures from Task 4.
- Produces six named baseline screenshots.

- [ ] **Step 1: Configure deterministic snapshots**

Set Playwright `snapshotPathTemplate` to `{testDir}/__screenshots__/{testFilePath}/{arg}{ext}` and keep `outputDir` under `frontend/test-results`. Add root ignore entries for `test-results/`, `frontend/test-results/`, `playwright-report/`, and `frontend/playwright-report/`; explicitly unignore `frontend/e2e/**/__screenshots__/**`.

- [ ] **Step 2: Write visual tests**

In `beforeEach`, emulate reduced motion, install deterministic dates/animations, use a 1440×1000 viewport, and append `?bg=fallback`. Capture `welcome-static.png`, `dashboard-pipeline.png`, `story-detail.png`, `review-board-idle.png`, `review-board-analyzing.png`, and `search-modal-open.png`. Wait on semantic landmarks, hide caret, disable animations, and mask only genuinely nondeterministic browser-generated values.

- [ ] **Step 3: Generate and inspect baselines**

Run: `npm.cmd --prefix frontend run e2e:visual -- --update-snapshots`

Expected: six PNGs under `frontend/e2e/__screenshots__`, no files under test-results staged.

- [ ] **Step 4: Re-run without update mode**

Run: `npm.cmd --prefix frontend run e2e:visual`

Expected: all six comparisons pass.

### Task 6: Enforce performance budgets

**Files:**
- Create: `frontend/e2e/performance.spec.ts`
- Modify: `artifacts/perf-audit/measure-app.cjs`
- Modify: `artifacts/perf-audit/measurements.json`

**Interfaces:**
- Produces browser metrics `{ longTasks, pointerGlowFrameCosts, lenisFrameCosts }` for each audited route.

- [ ] **Step 1: Write failing performance assertions**

Install a `PerformanceObserver` for `longtask` before page scripts, wrap pointer-glow and Lenis performance marks where available, and use Chrome DevTools Protocol `Performance.getMetrics` around welcome, dashboard, story-list-to-detail navigation, and review-board interactions. Assert every animation-window long task is at most 50 ms and each measured pointer/Lenis style-layout frame is below 1 ms.

- [ ] **Step 2: Run the focused audit and capture failures**

Run: `npm.cmd --prefix frontend run e2e:performance`

Expected: pass or an evidence attachment naming route, task duration, and frame cost.

- [ ] **Step 3: Optimize only evidenced hot paths**

If pointer glow exceeds budget, cache candidate rectangles until resize/scroll invalidation and separate all reads from writes in one rAF. If Lenis exceeds budget, keep its ticker outside Angular and remove synchronous style/layout inspection from callbacks. If another animation produces a long task, split initialization at the measured boundary with a dynamic import or next-frame yield.

- [ ] **Step 4: Re-run and persist audit evidence**

Run the Playwright performance suite and `node artifacts/perf-audit/measure-app.cjs`; write final route metrics to `measurements.json` without credentials or machine-specific paths.

### Task 7: Documentation and full acceptance gate

**Files:**
- Modify: `README.md`
- Update: `artifacts/perf-audit/bundle-size-report.md`

**Interfaces:**
- Produces a PR-body-ready bundle comparison and a README section under 30 lines.

- [ ] **Step 1: Add Motion & quality tiers documentation**

Under the frontend startup/testing section, add a subsection covering `high`, `medium`, and `static`; explain that `?bg=fallback` disables the 3D scene, cursor light, and pulses; explain reduced-motion static behavior and hidden-tab pausing. Keep the section below 30 physical lines.

- [ ] **Step 2: Build candidate stats and compare**

Run:

```powershell
npm.cmd --prefix frontend run build -- --stats-json
npm.cmd --prefix frontend run bundle:compare -- --candidate dist/testcaseiq-frontend/stats.json
```

Expected: candidate initial JavaScript growth is at most 5%; the report lists byte totals and percentage.

- [ ] **Step 3: Run fresh complete verification**

Run:

```powershell
npm.cmd --prefix frontend run build -- --stats-json
npm.cmd --prefix frontend run test:unit
npm.cmd --prefix frontend run e2e
node --test frontend/scripts/compare-bundle-stats.test.mjs
rg "matchMedia\(['\"]\(prefers-reduced-motion" frontend/src -g "*.ts" -g "!motion.service.ts"
git status --short
```

Expected: build exit 0, unit exit 0, full Playwright exit 0 including axe/performance/visual tests, comparator exit 0, no stray reduced-motion matches, and only intentional source/baseline artifacts are present.

- [ ] **Step 4: Review acceptance line by line and commit**

Confirm every global constraint against fresh command output, inspect screenshot files, verify test-results remain untracked, then commit the implementation and baselines with an intentional message.
