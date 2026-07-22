# Welcome Earned Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-paint hero entrance and a motion-aware, self-cycling review-gate panel while limiting scroll reveals to the workflow cards and format chips.

**Architecture:** Extract the panel into a standalone Angular component whose signal state machine consumes `MotionService`. Keep hero and magnetic orchestration in `WelcomePageComponent`, and reuse `RevealDirective` for the two below-fold stagger groups. All production behavior is introduced through red-green unit tests before implementation.

**Tech Stack:** Angular 22 standalone components and signals, Jasmine/Karma, GSAP 3, CSS motion tokens, Playwright.

## Global Constraints

- Panel dwell is approximately 2.2 seconds per state.
- Panel order is exactly `intake`, `analyzing`, `drafting`, `approved`.
- Cycling occurs only while `motionEnabled()` is true and the document is visible.
- Reduced motion renders `approved` statically with no timer-driven state change.
- Hero content is visible by default and hidden only synchronously when an enabled entrance starts.
- Headline stagger is approximately 60ms with `power4.out`; supporting copy and CTAs rise 12px with a short stagger.
- Scroll reveal stagger is 40ms and applies only to workflow cards and format chips.
- Magnetic pointer translation remains capped at 6px; keyboard focus glows without moving.
- The animated panel is `aria-hidden`; assistive technology receives “Review gate active — approved for export.”
- Preserve the existing user-owned modification/line-ending state in `welcome-page.component.css` and all unrelated untracked files.

---

## File Structure

- Create `frontend/src/app/pages/welcome/welcome-review-gate.component.ts`: four-state timer, motion policy, derived labels/state attributes.
- Create `frontend/src/app/pages/welcome/welcome-review-gate.component.html`: cumulative visual stages plus static assistive label.
- Create `frontend/src/app/pages/welcome/welcome-review-gate.component.css`: fixed panel composition and Transitions.dev-derived micro-transitions.
- Create `frontend/src/app/pages/welcome/welcome-review-gate.component.spec.ts`: timer, pause, and reduced-motion contracts.
- Modify `frontend/src/app/pages/welcome/welcome-page.component.ts`: import the extracted component/directive and run the complete one-time hero timeline.
- Modify `frontend/src/app/pages/welcome/welcome-page.component.html`: use the component and wire only the two reveal groups.
- Modify `frontend/src/app/pages/welcome/welcome-page.component.css`: remove migrated panel rules and add hero/reveal focus styling without changing layout.
- Modify `frontend/src/app/pages/welcome/welcome-page.component.spec.ts`: cover entrance sequencing and integration hooks.

---

### Task 1: Motion-aware review-gate state machine

**Files:**
- Create: `frontend/src/app/pages/welcome/welcome-review-gate.component.spec.ts`
- Create: `frontend/src/app/pages/welcome/welcome-review-gate.component.ts`

**Interfaces:**
- Consumes: `MotionService.motionEnabled: Signal<boolean>`, `MotionService.reducedMotion: Signal<boolean>`, and `MotionService.documentVisible: Signal<boolean>`.
- Produces: exported `ReviewGateState = 'intake' | 'analyzing' | 'drafting' | 'approved'` and `WelcomeReviewGateComponent.state: Signal<ReviewGateState>`.

- [ ] **Step 1: Write the failing state-machine tests**

Create the spec with writable policy signals, instantiate the component, and assert these behaviors with `fakeAsync`/`tick`:

```ts
it('cycles only while motion is enabled and the document is visible', fakeAsync(() => {
  expect(component.state()).toBe('intake');
  tick(2200);
  expect(component.state()).toBe('analyzing');

  documentVisible.set(false);
  fixture.detectChanges();
  TestBed.flushEffects();
  tick(4400);
  expect(component.state()).toBe('analyzing');

  documentVisible.set(true);
  fixture.detectChanges();
  TestBed.flushEffects();
  tick(2200);
  expect(component.state()).toBe('drafting');

  motionEnabled.set(false);
  fixture.detectChanges();
  TestBed.flushEffects();
  tick(4400);
  expect(component.state()).toBe('approved');
}));

it('settles on approved without cycling under reduced motion', fakeAsync(() => {
  reducedMotion.set(true);
  motionEnabled.set(false);
  fixture.detectChanges();
  TestBed.flushEffects();

  expect(component.state()).toBe('approved');
  tick(8800);
  expect(component.state()).toBe('approved');
}));
```

- [ ] **Step 2: Run the focused spec and verify RED**

Run: `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/pages/welcome/welcome-review-gate.component.spec.ts`

Expected: FAIL because `WelcomeReviewGateComponent` does not exist.

- [ ] **Step 3: Implement the minimal state machine**

Implement a standalone component with `REVIEW_GATE_STATES`, `REVIEW_GATE_DWELL_MS = 2200`, an initial `state = signal<ReviewGateState>('intake')`, and one `effect((onCleanup) => ...)`. The effect must read all three policy signals. It must clear its timeout through `onCleanup`, preserve state while hidden, set `approved` when reduced motion or a visible non-motion tier is active, reset to `intake` when cycling starts, and schedule exactly one next-state timeout. Use a private non-reactive `cycling` boolean to distinguish a paused loop from a newly enabled loop.

The core transition must be:

```ts
const index = REVIEW_GATE_STATES.indexOf(this.state());
const timer = window.setTimeout(() => {
  this.state.set(REVIEW_GATE_STATES[(index + 1) % REVIEW_GATE_STATES.length]);
}, REVIEW_GATE_DWELL_MS);
onCleanup(() => window.clearTimeout(timer));
```

- [ ] **Step 4: Run the focused spec and verify GREEN**

Run the same focused Karma command.

Expected: both state-machine tests PASS with zero failures.

- [ ] **Step 5: Commit the state machine**

```powershell
git add -- frontend/src/app/pages/welcome/welcome-review-gate.component.ts frontend/src/app/pages/welcome/welcome-review-gate.component.spec.ts
git commit -m "feat(welcome): add review gate state machine"
```

---

### Task 2: Instrument panel presentation and accessibility

**Files:**
- Modify: `frontend/src/app/pages/welcome/welcome-review-gate.component.spec.ts`
- Create: `frontend/src/app/pages/welcome/welcome-review-gate.component.html`
- Create: `frontend/src/app/pages/welcome/welcome-review-gate.component.css`
- Modify: `frontend/src/app/pages/welcome/welcome-review-gate.component.ts`

**Interfaces:**
- Consumes: `WelcomeReviewGateComponent.state()` from Task 1 and global `[data-ai-state]`, `.is-analyzing`, and `.is-generating` rules from `frontend/src/styles/ai-states.css`.
- Produces: selector `<app-welcome-review-gate />`, decorative `.wl-instrument-panel`, and an adjacent `.sr-only` static label.

- [ ] **Step 1: Write failing rendering tests**

Add assertions that the panel has `aria-hidden="true"`, the separate `.sr-only` text equals `Review gate active — approved for export`, and state changes set `data-state`, `data-ai-state`, and the expected scanline class. Assert all story/chip/BDD/decision content exists in the DOM in every state so no timer changes layout structure.

- [ ] **Step 2: Run the focused spec and verify RED**

Expected: FAIL because the component has no external template or presentation state attributes.

- [ ] **Step 3: Implement the fixed panel template**

Render one `aside` with `[attr.data-state]="state()"`, `[attr.data-ai-state]="aiState()"`, `[class.is-analyzing]`, `[class.is-generating]`, and `aria-hidden="true"`. Keep the story, three chips, three BDD rows, and approval row mounted. Use cumulative `is-shown` bindings: story for every state; chips for analyzing/drafting/approved; BDD for drafting/approved; decision for approved. Add the static `.sr-only` label as a sibling, not inside the hidden aside.

- [ ] **Step 4: Apply Transitions.dev micro-transition patterns**

Use exact-property transitions for stage opacity/transform/filter, 40ms chip/row delay increments, `will-change` only on actively transitioning small elements, and a short approval settle keyed by `data-state='approved'`. Reuse the existing AI scanline by assigning `data-ai-state='analysis'` plus `.is-analyzing` during analyzing and `data-ai-state='generation'` plus `.is-generating` during drafting. Include an explicit `@media (prefers-reduced-motion: reduce)` block that disables every transition/animation and forces all cumulative stages visible.

Keep panel dimensions stable with a grid whose story, chip row, BDD block, and decision row retain their slots; visually inactive stages use `visibility: hidden`, `opacity: 0`, and transforms instead of `display: none`.

- [ ] **Step 5: Run the focused spec and verify GREEN**

Run the focused Karma command and expect all review-gate specs to PASS.

- [ ] **Step 6: Commit the panel presentation**

```powershell
git add -- frontend/src/app/pages/welcome/welcome-review-gate.component.ts frontend/src/app/pages/welcome/welcome-review-gate.component.html frontend/src/app/pages/welcome/welcome-review-gate.component.css frontend/src/app/pages/welcome/welcome-review-gate.component.spec.ts
git commit -m "feat(welcome): render living review gate"
```

---

### Task 3: Rehearsed hero entrance

**Files:**
- Modify: `frontend/src/app/pages/welcome/welcome-page.component.spec.ts`
- Modify: `frontend/src/app/pages/welcome/welcome-page.component.ts`
- Modify: `frontend/src/app/pages/welcome/welcome-page.component.html`
- Modify: `frontend/src/app/pages/welcome/welcome-page.component.css`

**Interfaces:**
- Consumes: `MotionService.motionEnabled()` and `MotionService.gsap`.
- Produces: one non-scroll-driven GSAP timeline for `.wl-headline-line` and `.wl-hero-support` elements.

- [ ] **Step 1: Write failing entrance tests**

Replace the minimal GSAP stub with spies for `set`, `timeline`, and a chainable timeline `to`. Add one motion-enabled test asserting `set` is called before timeline playback for headline/support targets, headline `to` uses `clipPath: 'inset(0 0 0% 0)'`, `y: '0%'`, `ease: 'power4.out'`, and `stagger: 0.06`, and support `to` uses `y: 0`, `opacity: 1`, and a short stagger. Add a motion-disabled test asserting neither `set` nor `timeline` runs and all hero text remains present without inline opacity/transform styles.

- [ ] **Step 2: Run the welcome-page spec and verify RED**

Run: `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/pages/welcome/welcome-page.component.spec.ts`

Expected: FAIL because the current method animates only headline lines with `gsap.from`.

- [ ] **Step 3: Implement the entrance**

Add `.wl-headline-line` to each headline span and `.wl-hero-support` to the system line, sub-copy, and CTA group. In `runEntrance`, return immediately when motion is disabled. Otherwise call `gsap.set` immediately for the headline and support collections, create one timeline, reveal headline lines first with a 60ms stagger and `power4.out`, then reveal support elements from 12px with a short stagger and `expo.out`. Set `clearProps` after completion. Do not introduce any default hidden selector or entrance-ready class.

- [ ] **Step 4: Preserve layout and reduced motion in CSS**

Keep headline lines as block-level clipped paint layers, but do not set hidden opacity/transform in CSS. Add `will-change` only through GSAP for the duration of the entrance, or clear it at completion. Ensure the reduced-motion media query leaves hero elements with `opacity: 1`, `transform: none`, and an open clip path.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run the focused welcome-page spec and expect zero failures.

- [ ] **Step 6: Commit the hero entrance**

```powershell
git add -- frontend/src/app/pages/welcome/welcome-page.component.ts frontend/src/app/pages/welcome/welcome-page.component.html frontend/src/app/pages/welcome/welcome-page.component.css frontend/src/app/pages/welcome/welcome-page.component.spec.ts
git commit -m "feat(welcome): choreograph hero entrance"
```

---

### Task 4: Integrate the panel and restrained scroll reveals

**Files:**
- Modify: `frontend/src/app/pages/welcome/welcome-page.component.spec.ts`
- Modify: `frontend/src/app/pages/welcome/welcome-page.component.ts`
- Modify: `frontend/src/app/pages/welcome/welcome-page.component.html`
- Modify: `frontend/src/app/pages/welcome/welcome-page.component.css`

**Interfaces:**
- Consumes: `WelcomeReviewGateComponent` and `RevealDirective` standalone imports.
- Produces: one panel instance, four workflow reveals delayed `0`, `0.04`, `0.08`, `0.12` seconds, and five format reveals delayed `0`, `0.04`, `0.08`, `0.12`, `0.16` seconds.

- [ ] **Step 1: Write failing integration tests**

Assert exactly one `app-welcome-review-gate`, four `.wl-flow-card[tcqReveal]`, five `.wl-format[tcqReveal]`, and no reveal attributes on `.wl-hero` or the panel host. Assert the delay input values match the exact sequences above.

- [ ] **Step 2: Run the welcome-page spec and verify RED**

Expected: FAIL because the static aside is still inline and no welcome elements use `tcqReveal`.

- [ ] **Step 3: Wire the component and directives**

Import `WelcomeReviewGateComponent` and `RevealDirective` in the page component. Replace the inline aside with `<app-welcome-review-gate />`. Add numeric `[tcqReveal]` bindings only to the four cards and five chips with the exact delays listed in the interface.

- [ ] **Step 4: Migrate panel CSS without overwriting unrelated edits**

Remove only selectors now owned by `welcome-review-gate.component.css`. Retain page grid/responsive rules and the existing magnetic focus glow. Confirm `.wl-magnetic:focus-visible` does not assign `--magnetic-x`, `--magnetic-y`, or any transform.

- [ ] **Step 5: Run both focused specs and verify GREEN**

Run both welcome component spec files through Karma and expect zero failures.

- [ ] **Step 6: Commit integration**

```powershell
git add -- frontend/src/app/pages/welcome/welcome-page.component.ts frontend/src/app/pages/welcome/welcome-page.component.html frontend/src/app/pages/welcome/welcome-page.component.css frontend/src/app/pages/welcome/welcome-page.component.spec.ts
git commit -m "feat(welcome): integrate earned motion"
```

---

### Task 5: Full verification and acceptance audit

**Files:**
- Modify only if a failing acceptance check exposes a defect; add a failing regression test before any corrective production edit.

**Interfaces:**
- Consumes: completed welcome motion implementation.
- Produces: fresh evidence for unit, build, e2e, accessibility, and reduced-motion acceptance.

- [ ] **Step 1: Run all frontend unit tests**

Run: `cd frontend && npm run test:unit`

Expected: Karma exits 0 with all tests passing.

- [ ] **Step 2: Run the production build**

Run: `cd frontend && npm run build`

Expected: Angular build exits 0 with no compilation or budget errors.

- [ ] **Step 3: Run the complete Playwright suite**

Run: `cd frontend && npm run e2e`

Expected: Playwright exits 0 with all projects/tests passing.

- [ ] **Step 4: Inspect both motion policies in a browser**

With normal motion, verify the hero runs once, the panel advances every ~2.2 seconds, hidden-tab time does not advance it, and both reveal groups animate once on intersection. Emulate `prefers-reduced-motion: reduce`, reload, and verify hero/panel/reveals are fully visible, panel state is approved, and no element changes over at least 8.8 seconds.

- [ ] **Step 5: Audit layout and accessibility**

Confirm the first fold contains intake/analyze, BDD drafting, and approval content without scrolling; the panel box does not change size across all four states; the animated panel is absent from the accessibility tree; the static approval label is present; and keyboard-focused CTAs glow without translating.

- [ ] **Step 6: Review the final diff**

Run: `git diff --check HEAD~4..HEAD` and `git status --short`.

Expected: no whitespace errors; only intended welcome files and plan/spec commits are included; pre-existing unrelated files remain untouched.
