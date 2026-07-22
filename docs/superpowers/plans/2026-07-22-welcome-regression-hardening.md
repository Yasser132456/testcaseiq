# Welcome Regression Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock the Angular welcome route against responsive, motion-policy, performance, accessibility, bundle, and visual regressions without changing its approved content or visual direction.

**Architecture:** Keep the welcome route lazy and retain `MotionService` as the only JavaScript policy boundary. Add focused unit coverage for static/fallback behavior, one welcome-specific Playwright hardening suite for layout and semantics, extend the existing performance and visual suites, and verify the production stats graph with a small Node script.

**Tech Stack:** Angular 22 standalone components and signals, Jasmine/Karma, Playwright 1.61, `@axe-core/playwright`, Angular production stats JSON, Node.js verification scripts.

## Global Constraints

- No new welcome features, content sections, interactions, or visual effects.
- Exercise widths 360, 768, 1024, 1440, and 1920; touch targets must be at least 44 by 44 CSS pixels.
- The review-gate instrument must stack below hero copy at 900px and below.
- `MotionService` remains the sole JavaScript owner of reduced-motion and `?bg=fallback` policy.
- Reduced motion and `?bg=fallback` must produce the approved static frame without an active welcome animation loop.
- No long task may exceed 50ms; dot-grid main-thread work must remain below 1.5ms per frame.
- The shared initial bundle must not grow because of welcome code; the lazy welcome chunk must not include Three.js.
- Axe must report zero serious or critical violations on `/`.
- Visual baselines are 1440x900 and 390x844 under reduced motion plus `?bg=fallback`.

---

### Task 1: Capture the pre-change bundle and behavior baseline

**Files:**
- Create: `artifacts/perf-audit/welcome-s4-baseline-stats.json`
- Create: `artifacts/perf-audit/welcome-s4-baseline.md`
- Inspect: `frontend/dist/testcaseiq-frontend/stats.json`

**Interfaces:**
- Consumes: Angular route graph from `frontend/src/app/app.routes.ts`.
- Produces: immutable initial and welcome chunk byte counts used by Task 6.

- [ ] **Step 1: Build the unmodified frontend with stats**

```powershell
cd frontend
npx.cmd ng build --stats-json
```

Expected: exit 0 and `frontend/dist/testcaseiq-frontend/stats.json` exists.

- [ ] **Step 2: Record the exact baseline stats**

```powershell
Copy-Item -LiteralPath dist/testcaseiq-frontend/stats.json -Destination ../artifacts/perf-audit/welcome-s4-baseline-stats.json
```

Expected: the copied file is byte-for-byte identical to the generated stats file.

- [ ] **Step 3: Inspect current chunk membership**

```powershell
node scripts/compare-bundle-stats.mjs --base ../artifacts/perf-audit/welcome-s4-baseline-stats.json --candidate dist/testcaseiq-frontend/stats.json --max-growth 0 --report ../artifacts/perf-audit/welcome-s4-baseline.md
```

Expected: exit 0 and a zero-delta report; note the initial and lazy welcome chunk names and sizes for Task 6.

---

### Task 2: Lock the shared motion and static-frame policy

**Files:**
- Modify: `frontend/src/app/core/motion/motion.service.spec.ts`
- Modify: `frontend/src/app/pages/welcome/welcome-page.component.spec.ts`
- Modify: `frontend/src/app/pages/welcome/welcome-background.component.spec.ts`
- Modify: `frontend/src/app/pages/welcome/welcome-review-gate.component.spec.ts`
- Modify only if a failing test proves necessary: `frontend/src/app/core/motion/motion.service.ts`
- Modify only if a failing test proves necessary: `frontend/src/app/pages/welcome/welcome-page.component.ts`
- Modify only if a failing test proves necessary: `frontend/src/app/pages/welcome/welcome-background.component.ts`
- Modify only if a failing test proves necessary: `frontend/src/app/pages/welcome/welcome-review-gate.component.ts`

**Interfaces:**
- Consumes: `MotionService.motionEnabled`, `cursorEffectsEnabled`, `qualityTier`, `forcedFallback`, `reducedMotion`, and `documentVisible` signals.
- Produces: a single policy path yielding `static`, no entrance timeline, no magnetic listeners, no grid rAF, and review state `approved` for fallback/reduced motion.

- [ ] **Step 1: Add failing fallback matrix assertions**

Add this assertion to the existing fallback test in `motion.service.spec.ts`:

```ts
expect(service.motionEnabled()).toBeFalse();
```

Add focused cases proving that a reduced-motion service and forced fallback both disable `motionEnabled`, `cursorEffectsEnabled`, and `sceneEffectsEnabled`.

- [ ] **Step 2: Run the focused motion tests and verify red where coverage is missing**

```powershell
npx.cmd ng test --watch=false --browsers=ChromeHeadless --include=src/app/core/motion/motion.service.spec.ts --include=src/app/pages/welcome/*.spec.ts
```

Expected: new assertions fail only where current behavior does not meet the approved matrix; assertions already satisfied document pre-existing compliant behavior.

- [ ] **Step 3: Grep Sprints 1–3 welcome TypeScript for stray reduced-motion queries**

```powershell
rg -n -F "matchMedia('(prefers-reduced-motion" src/app/pages/welcome src/app/core/motion
```

Expected: the only TypeScript match is `src/app/core/motion/motion.service.ts`. CSS media-query fallbacks are allowed.

- [ ] **Step 4: Make the minimal policy correction**

If tests expose divergence, route the consumer through existing `MotionService` signals. The static review-state branch must remain:

```ts
if (reducedMotion || (!motionEnabled && documentVisible)) {
  this.cycling = false;
  this.state.set('approved');
  return;
}
```

The background animation predicate must remain equivalent to:

```ts
const animate = policy.tier === 'high'
  && policy.motionEnabled
  && policy.documentVisible
  && !policy.reducedMotion
  && !policy.forcedFallback;
```

- [ ] **Step 5: Re-run focused unit tests**

Run the command from Step 2.

Expected: all focused motion and welcome unit tests pass with zero failures.

---

### Task 3: Add the responsive and accessibility regression suite

**Files:**
- Create: `frontend/e2e/welcome-hardening.spec.ts`
- Modify: `frontend/e2e/accessibility.spec.ts`
- Modify: `frontend/src/app/pages/welcome/welcome-page.component.html`
- Modify: `frontend/src/app/pages/welcome/welcome-page.component.css`

**Interfaces:**
- Consumes: the existing `gotoStable()` fallback fixture and welcome selectors.
- Produces: executable contracts for five widths, 44px targets, stack order, heading semantics, instrument accessibility, and keyboard focus.

- [ ] **Step 1: Write the failing five-width layout test**

Create `welcome-hardening.spec.ts` with the viewport matrix:

```ts
const VIEWPORTS = [360, 768, 1024, 1440, 1920] as const;

for (const width of VIEWPORTS) {
  test(`welcome layout is contained at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
    await gotoStable(page, '/');

    const metrics = await page.evaluate(() => {
      const headline = document.querySelector<HTMLElement>('.wl-headline')!;
      const heroCopy = document.querySelector<HTMLElement>('.wl-hero-copy')!;
      const panel = document.querySelector<HTMLElement>('app-welcome-review-gate')!;
      const rect = (element: HTMLElement) => element.getBoundingClientRect();
      return {
        documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        headline: rect(headline),
        heroCopy: rect(heroCopy),
        panel: rect(panel)
      };
    });

    expect(metrics.documentOverflow).toBeLessThanOrEqual(0);
    expect(metrics.headline.left).toBeGreaterThanOrEqual(0);
    expect(metrics.headline.right).toBeLessThanOrEqual(width);
    if (width <= 900) expect(metrics.panel.top).toBeGreaterThanOrEqual(metrics.heroCopy.bottom);
  });
}
```

In the same file, inspect every visible `a`, `button`, and `[role=button]` and assert width and height are each at least 44.

- [ ] **Step 2: Run the new responsive suite and verify red**

```powershell
npx.cmd playwright test e2e/welcome-hardening.spec.ts
```

Expected: current 40px navigation/CTA targets fail the 44px contract; any real overflow failure identifies its width and element.

- [ ] **Step 3: Add complete welcome semantics and focus assertions**

Extend `accessibility.spec.ts` to verify all welcome navigation links, both hero CTAs, and both footer links with `expectTwoPixelFocusRing`. Assert one `h1`, no skipped heading levels, one static SR review description, and no review-gate descendants in the accessibility tree.

- [ ] **Step 4: Apply the smallest markup and CSS corrections**

Use a static description adjacent to the decorative component:

```html
<p class="sr-only">Review gate active — approved for export</p>
<app-welcome-review-gate aria-hidden="true" />
```

Raise interactive minima without changing visual hierarchy:

```css
.wl-nav-link,
.wl-btn-ghost-sm,
.wl-btn-primary,
.wl-btn-secondary,
.wl-brand,
.wl-footer-brand {
  min-height: 2.75rem;
}
```

Retain the existing `@media (max-width: 900px)` one-column hero and add only the containment rules identified by the failed width assertions.

- [ ] **Step 5: Re-run responsive and accessibility tests**

```powershell
npx.cmd playwright test e2e/welcome-hardening.spec.ts e2e/accessibility.spec.ts
```

Expected: all welcome layout, focus, semantics, and axe assertions pass.

---

### Task 4: Enforce welcome performance budgets

**Files:**
- Modify: `frontend/e2e/performance.spec.ts`
- Modify: `frontend/src/app/pages/welcome/welcome-background.component.ts`

**Interfaces:**
- Consumes: existing `PerformanceObserver` long-task windows.
- Produces: welcome entrance and steady-state long-task metrics plus opt-in dot-grid frame durations capped at 1.5ms.

- [ ] **Step 1: Add failing frame-cost collection to the performance test**

Before navigation, install an opt-in audit sink:

```ts
await page.addInitScript(() => {
  window.__TESTCASEIQ_WELCOME_PERF__ = [];
});
```

After entrance and steady-state windows, read the collected numbers and assert:

```ts
const frameCosts = await page.evaluate(() => window.__TESTCASEIQ_WELCOME_PERF__ ?? []);
expect(frameCosts.length).toBeGreaterThan(0);
for (const duration of frameCosts) {
  expect(duration, `dot-grid frame ${duration}ms exceeded 1.5ms`).toBeLessThan(1.5);
}
```

- [ ] **Step 2: Run the welcome performance test and verify red**

```powershell
npx.cmd playwright test e2e/performance.spec.ts --grep "welcome entrance"
```

Expected: fail because the background does not yet populate the opt-in audit sink.

- [ ] **Step 3: Add zero-cost-by-default measurement around dot-grid work**

Declare the optional window field and, only when the array exists, record `performance.now()` around `updateInfluence()` plus `drawFrame()` in `animate`. Cap retained samples to 180 so the audit cannot grow unbounded.

```ts
const audit = this.browserWindow?.__TESTCASEIQ_WELCOME_PERF__;
const startedAt = audit ? performance.now() : 0;
this.updateInfluence(elapsed);
this.drawFrame();
if (audit && audit.length < 180) audit.push(performance.now() - startedAt);
```

- [ ] **Step 4: Re-run the welcome performance test**

Run the command from Step 2.

Expected: no observed long task exceeds 50ms and every recorded dot-grid frame is below 1.5ms.

---

### Task 5: Create the deterministic visual lock

**Files:**
- Modify: `frontend/e2e/visual-regression.spec.ts`
- Create: `frontend/e2e/__screenshots__/visual-regression.spec.ts/welcome-desktop-1440x900.png`
- Create: `frontend/e2e/__screenshots__/visual-regression.spec.ts/welcome-mobile-390x844.png`
- Remove after replacement: `frontend/e2e/__screenshots__/visual-regression.spec.ts/welcome-static.png`

**Interfaces:**
- Consumes: reduced-motion emulation, `gotoStable()`, `?bg=fallback`, and approved panel state.
- Produces: two deterministic committed baselines using the existing snapshot path template.

- [ ] **Step 1: Replace the single welcome snapshot test with the exact two-view matrix**

```ts
for (const viewport of [
  { name: 'welcome-desktop-1440x900.png', width: 1440, height: 900 },
  { name: 'welcome-mobile-390x844.png', width: 390, height: 844 }
] as const) {
  test(`welcome static fallback ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await gotoStable(page, '/');
    await expect(page.locator('.wl-instrument-panel')).toHaveAttribute('data-state', 'approved');
    await capture(page, viewport.name);
  });
}
```

- [ ] **Step 2: Generate only the two welcome baselines**

```powershell
npx.cmd playwright test e2e/visual-regression.spec.ts --grep "welcome static fallback" --update-snapshots
```

Expected: two PNG files are created at the paths above and both tests pass on the immediate verification run.

- [ ] **Step 3: Inspect both images**

Open both PNGs and confirm the hero is present, the approved instrument frame is visible, the workflow and format content are not replaced by a black void, and the mobile frame has no clipping.

---

### Task 6: Verify chunk isolation and publish PR evidence

**Files:**
- Create: `frontend/scripts/verify-welcome-chunk.mjs`
- Modify: `frontend/package.json`
- Create: `artifacts/perf-audit/welcome-s4-candidate-stats.json`
- Create: `artifacts/perf-audit/welcome-s4-bundle-report.md`
- Create: `docs/pr/welcome-s4-hardening.md`

**Interfaces:**
- Consumes: Angular baseline/candidate stats and the lazy route declaration.
- Produces: failing exit code for initial-bundle growth or Three.js in the welcome chunk, plus PR-ready measured evidence.

- [ ] **Step 1: Write the failing stats verifier**

The Node script must parse both stats files, identify initial chunks from `initial === true`, identify the chunk containing `welcome-page.component`, sum emitted byte sizes, and throw if candidate initial bytes exceed baseline or if a welcome module path matches `/three(?:\.module)?|node_modules[\\/]three/i`.

Add the package script:

```json
"bundle:welcome": "node scripts/verify-welcome-chunk.mjs --base ../artifacts/perf-audit/welcome-s4-baseline-stats.json --candidate dist/testcaseiq-frontend/stats.json --report ../artifacts/perf-audit/welcome-s4-bundle-report.md"
```

- [ ] **Step 2: Run the verifier against a missing candidate and verify red**

```powershell
npm.cmd run bundle:welcome
```

Expected: fail with a clear missing/current-stats error until the candidate build is generated.

- [ ] **Step 3: Build the candidate and run the verifier**

```powershell
npx.cmd ng build --stats-json
Copy-Item -LiteralPath dist/testcaseiq-frontend/stats.json -Destination ../artifacts/perf-audit/welcome-s4-candidate-stats.json
npm.cmd run bundle:welcome
```

Expected: exit 0, initial bundle delta is at most 0 bytes, welcome remains lazy, and the report says Three.js modules in the welcome chunk: 0.

- [ ] **Step 4: Write the PR body from measured output**

`docs/pr/welcome-s4-hardening.md` must include the exact baseline/candidate/delta bytes for the initial and welcome chunks, name the lazy welcome chunk, state that the deleted Three.js welcome branch is absent, and list the build, unit, full e2e, axe, visual, and performance commands run.

- [ ] **Step 5: Run complete acceptance verification**

```powershell
npm.cmd run test:unit
npm.cmd run build
npm.cmd run e2e
npm.cmd run bundle:welcome
```

Expected: all four commands exit 0 with no failed tests.

---

## Plan self-review

- Responsive widths, headline containment, touch targets, 900px stacking, workflow, and formats are covered by Task 3.
- MotionService ownership, fallback state, entrance, panel cycle, magnetic controls, and dot-grid loop are covered by Task 2.
- Long tasks, dot-grid frame work, bundle isolation, lazy loading, and Three.js absence are covered by Tasks 1, 4, and 6.
- Axe, focus visibility, decorative panel semantics, static label, and heading order are covered by Task 3.
- Both exact screenshot viewports and committed deterministic baselines are covered by Task 5.
- Full build, unit, e2e, bundle verification, and PR-ready evidence are covered by Task 6.
