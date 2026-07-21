# AI Operation Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make analysis, test generation, review verdicts, and toast lifecycles communicate their real asynchronous state through accessible, reduced-motion-safe physical motion.

**Architecture:** The three HTTP services expose readonly Angular signals for request lifecycle state. Components bind CSS utilities to those signals, while a small GSAP review-motion service owns one-shot verdict clones and FLIP reflow; the background scene accepts a temporary high-tier operation accent without replacing its route accent.

**Tech Stack:** Angular 22 standalone components and signals, RxJS 7.8, GSAP 3.15 with Flip, Jasmine/Karma, Playwright, CSS custom properties.

## Global Constraints

- Every animation maps 1:1 to `running`, `success`, or `error`; idle state never animates.
- Analysis scanline duration is 1.4 seconds and uses `--ease-in-out`.
- Generated rows stagger by at most 40 ms and finish admitting within 600 ms total.
- Review verdict choreography completes within 450 ms and never delays optimistic state mutation.
- Background operation accent runs only on the `high` motion tier at approximately ten-percent amplitude.
- Reduced motion replaces loops with labeled colored borders and makes verdict updates instant.
- Existing or new live regions announce all asynchronous states and verdict rollbacks.
- Do not add a new UI or animation dependency.

---

### Task 1: Typed service lifecycle signals

**Files:**
- Create: `frontend/src/app/core/motion/async-operation-state.ts`
- Modify: `frontend/src/app/core/services/analysis.service.ts`
- Modify: `frontend/src/app/core/services/test-generation.service.ts`
- Modify: `frontend/src/app/core/services/review.service.ts`
- Test: `frontend/src/app/core/services/analysis.service.spec.ts`
- Test: `frontend/src/app/core/services/test-generation.service.spec.ts`
- Test: `frontend/src/app/core/services/review.service.spec.ts`

**Interfaces:**
- Produces: `AsyncOperationPhase`, `StoryAiOperationState`, `ReviewOperationState` and readonly `operationState` signals on all three services.
- Consumes: Angular `signal`, RxJS `defer` and `tap`.

- [ ] **Step 1: Write failing lifecycle tests**

Add assertions that state is `idle` before subscription, `running` immediately after subscription, `success` after `flush`, and `error` after `request.flush(..., { status: 500, statusText: 'Server Error' })`. Review assertions must include `testCaseId` and `verdict`:

```ts
expect(service.operationState()).toEqual(jasmine.objectContaining({ phase: 'idle' }));
service.analyzeStory('story-1').subscribe();
expect(service.operationState()).toEqual(jasmine.objectContaining({
  phase: 'running', storyId: 'story-1'
}));
http.expectOne('/api/stories/story-1/analyze').flush(analysisResponse());
expect(service.operationState()).toEqual(jasmine.objectContaining({
  phase: 'success', storyId: 'story-1'
}));
```

- [ ] **Step 2: Verify RED**

Run:

```text
npm --prefix frontend test -- --watch=false --include=src/app/core/services/analysis.service.spec.ts --include=src/app/core/services/test-generation.service.spec.ts --include=src/app/core/services/review.service.spec.ts
```

Expected: compilation fails because `operationState` does not exist.

- [ ] **Step 3: Add the state types**

```ts
export type AsyncOperationPhase = 'idle' | 'running' | 'success' | 'error';

export interface StoryAiOperationState {
  phase: AsyncOperationPhase;
  storyId: string | null;
  sequence: number;
}

export interface ReviewOperationState {
  phase: AsyncOperationPhase;
  testCaseId: string | null;
  verdict: 'APPROVED' | 'REJECTED' | null;
  sequence: number;
}
```

- [ ] **Step 4: Wrap mutating service requests with subscription-time transitions**

Use `defer` so merely constructing an Observable does not animate:

```ts
private readonly operationStateStore = signal<StoryAiOperationState>({
  phase: 'idle', storyId: null, sequence: 0
});
readonly operationState = this.operationStateStore.asReadonly();

analyzeStory(storyId: string): Observable<StoryAnalysisResult> {
  return defer(() => {
    const sequence = this.operationStateStore().sequence + 1;
    this.operationStateStore.set({ phase: 'running', storyId, sequence });
    return this.http.post<StoryAnalysisResult>(`/api/stories/${storyId}/analyze`, {}).pipe(
      tap({
        next: () => this.operationStateStore.set({ phase: 'success', storyId, sequence }),
        error: () => this.operationStateStore.set({ phase: 'error', storyId, sequence })
      })
    );
  });
}
```

Apply the same structure to generation and only `ReviewService.updateReviewStatus`; read and field-edit requests remain motion-neutral.

- [ ] **Step 5: Verify GREEN and commit**

Run the Step 2 command. Expected: all three service specs pass.

```text
git add frontend/src/app/core/motion/async-operation-state.ts frontend/src/app/core/services/analysis.service.ts frontend/src/app/core/services/analysis.service.spec.ts frontend/src/app/core/services/test-generation.service.ts frontend/src/app/core/services/test-generation.service.spec.ts frontend/src/app/core/services/review.service.ts frontend/src/app/core/services/review.service.spec.ts
git commit -m "feat(motion): expose AI operation lifecycle states"
```

### Task 2: Shared AI state CSS and story analysis/generation binding

**Files:**
- Create: `frontend/src/styles/ai-states.css`
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/app/pages/stories/story-detail-page.component.ts`
- Test: `frontend/src/app/pages/stories/story-detail-page.component.spec.ts`

**Interfaces:**
- Consumes: `AnalysisService.operationState`, `TestGenerationService.operationState`, existing `tcqReveal` directive.
- Produces: `.is-analyzing`, `.is-generating`, `.is-ai-success`, `.is-ai-error`, and accessible status labels.

- [ ] **Step 1: Write failing story-state tests**

Replace service spies with objects that include writable test signals exposed as readonly signals. Assert the analysis panel receives `.is-analyzing`, `aria-busy="true"`, and visible `Analyzing...`; assert generation receives cyan state; assert error is labeled and carries `.is-ai-error`; assert result groups have increasing `tcqReveal` values after success.

```ts
analysisState.set({ phase: 'running', storyId: 'story-1', sequence: 1 });
fixture.detectChanges();
const panel = fixture.nativeElement.querySelector('[data-ai-state="analysis"]');
expect(panel.classList).toContain('is-analyzing');
expect(panel.getAttribute('aria-busy')).toBe('true');
expect(panel.textContent).toContain('Analyzing...');
```

- [ ] **Step 2: Verify RED**

```text
npm --prefix frontend test -- --watch=false --include=src/app/pages/stories/story-detail-page.component.spec.ts
```

Expected: selectors/classes are absent.

- [ ] **Step 3: Add state utilities and reduced-motion override**

Import the new file at the top of `styles.css` and implement a positioned pseudo-element scanline, low-amplitude border keyframes, one-shot edge flash, and one-shot red pulse. The reduced-motion block must set `animation: none !important` for all AI pseudo-elements and retain only the relevant border color.

```css
@import './styles/ai-states.css';
```

```css
.is-analyzing,
.is-generating { position: relative; overflow: hidden; }
.is-analyzing { --ai-state-color: var(--color-violet); --ai-state-border: var(--color-violet-border); }
.is-generating { --ai-state-color: var(--color-cyan); --ai-state-border: var(--color-cyan-border); }
.is-analyzing::after,
.is-generating::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  top: 0;
  height: 2px;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--ai-state-color), transparent);
  filter: drop-shadow(0 0 6px var(--ai-state-color));
  animation: tcq-ai-scan 1.4s var(--ease-in-out) infinite;
}
```

- [ ] **Step 4: Bind template state directly to service signals**

Expose readonly references to service signals, add `data-ai-state`, class bindings, `aria-busy`, and a `role="status"` label. Apply `tcqReveal` only to newly rendered result sections with fixed increments such as `0`, `0.04`, `0.08`, and `0.12`.

- [ ] **Step 5: Verify GREEN and commit**

Run the Step 2 command, then:

```text
git add frontend/src/styles.css frontend/src/styles/ai-states.css frontend/src/app/pages/stories/story-detail-page.component.ts frontend/src/app/pages/stories/story-detail-page.component.spec.ts
git commit -m "feat(motion): add analysis and generation state theater"
```

### Task 3: High-tier background operation accent

**Files:**
- Modify: `frontend/src/app/shared/background/background-scene.service.ts`
- Modify: `frontend/src/app/shared/background/background-scene.service.spec.ts`
- Modify: `frontend/src/app/pages/stories/story-detail-page.component.ts`

**Interfaces:**
- Produces: `setOperationAccent(name: 'violet' | 'cyan' | null): void`.
- Consumes: `MotionService.qualityTier`, `MotionService.reducedMotion`, service lifecycle signals.

- [ ] **Step 1: Write failing scene tests**

Instantiate the service with mocked router, motion, and DOM tokens. Assert medium/static/reduced tiers ignore an operation override and high tier accepts it; clearing restores the route accent. Test only public signals or rendered tint state, never private fields.

- [ ] **Step 2: Verify RED**

```text
npm --prefix frontend test -- --watch=false --include=src/app/shared/background/background-scene.service.spec.ts
```

Expected: `setOperationAccent` is undefined.

- [ ] **Step 3: Implement temporary pulse ownership**

Keep `routeAccentName` separate from `operationAccentName`. On high/non-reduced tiers, set the operation color and a `0.10` pulse amplitude consumed by the existing render loop; on null, immediately apply the saved route accent. Do not schedule a second animation loop.

- [ ] **Step 4: Tie the scene to story service state with an Angular effect**

```ts
effect(() => {
  const analysis = this.analysisService.operationState().phase;
  const generation = this.testGenerationService.operationState().phase;
  this.backgroundScene.setOperationAccent(
    generation === 'running' ? 'cyan' : analysis === 'running' ? 'violet' : null
  );
});
```

Register destruction cleanup that clears the override.

- [ ] **Step 5: Verify GREEN and commit**

Run the Step 2 command and the story-detail spec, then commit the three files with `feat(motion): pulse scene accent for AI operations`.

### Task 4: Generated test-case row streaming

**Files:**
- Modify: `frontend/src/app/pages/stories/story-test-cases-tab.component.ts`
- Modify: `frontend/src/app/pages/stories/story-test-cases-tab.component.spec.ts`

**Interfaces:**
- Consumes: generation `operationState.sequence` and success phase.
- Produces: `visibleGeneratedCaseIds` and `generationStaggerMs(count): number`.

- [ ] **Step 1: Write failing fakeAsync tests**

Assert initial inputs render synchronously; a suite attached to a new successful generation sequence admits the first row immediately and later rows after ticks; 100 rows use a delay no larger than `600 / 99` and finish by 600 ms; reduced motion renders all immediately.

```ts
expect(component.generationStaggerMs(2)).toBe(40);
expect(component.generationStaggerMs(100)).toBeLessThanOrEqual(600 / 99);
```

- [ ] **Step 2: Verify RED**

```text
npm --prefix frontend test -- --watch=false --include=src/app/pages/stories/story-test-cases-tab.component.spec.ts
```

- [ ] **Step 3: Implement bounded admission and row transform**

Use an effect keyed by successful generation sequence, clear timers through `DestroyRef`, and mark only newly generated IDs. Render admitted rows with a one-shot `.is-streaming-in` class that animates from `translateY(8px)`; do not animate initial load or subsequent idle change detection.

- [ ] **Step 4: Verify GREEN and commit**

Run the Step 2 command and commit with `feat(motion): stream generated test cases`.

### Task 5: Shared verdict motion and inline review optimism

**Files:**
- Create: `frontend/src/app/core/motion/review-verdict-motion.service.ts`
- Create: `frontend/src/app/core/motion/review-verdict-motion.service.spec.ts`
- Modify: `frontend/src/app/pages/stories/story-review-tab.component.ts`
- Create: `frontend/src/app/pages/stories/story-review-tab.component.spec.ts`

**Interfaces:**
- Produces: `ReviewVerdictMotionService.capture(list, card)` and `play(snapshot, verdict)`.
- Consumes: GSAP `Flip`, `MotionService.reducedMotion`, `ReviewService.operationState`.

- [ ] **Step 1: Write failing verdict-service and review-tab specs**

Test that approve emits an optimistic `testCaseUpdated` before the HTTP Subject resolves, reject does the same, failure emits a rollback update, the live region announces each state, and reduced motion does not create a verdict clone. The service spec uses real DOM nodes and spies on `gsap.timeline`/`Flip.from` only at the library boundary.

- [ ] **Step 2: Verify RED**

```text
npm --prefix frontend test -- --watch=false --include=src/app/core/motion/review-verdict-motion.service.spec.ts --include=src/app/pages/stories/story-review-tab.component.spec.ts
```

- [ ] **Step 3: Implement the shared choreography**

Register `Flip`, capture list state plus a fixed-position `cloneNode(true)` ghost, update its status label, then run:

```ts
const duration = verdict === 'APPROVED' ? 0.42 : 0.36;
Flip.from(snapshot.flipState, { duration: 0.36, ease: 'power2.out', absolute: true });
const timeline = gsap.timeline({ onComplete: () => snapshot.ghost.remove() });
if (verdict === 'APPROVED') {
  timeline.to(snapshot.ghost, { borderColor: 'var(--color-green-border)', duration: 0.18 })
    .to(snapshot.ghost, { scale: 1.015, duration: 0.12, ease: 'back.out(2)' })
    .to(snapshot.ghost, { scale: 1, duration: duration - 0.30 });
} else {
  timeline.to(snapshot.ghost, { filter: 'saturate(0)', y: 12, opacity: 0, duration });
}
```

- [ ] **Step 4: Implement inline optimistic update and rollback**

Emit a locally constructed verdict update synchronously, start the HTTP request, reconcile with the server response, and re-emit the original case on error. Add `role="status" aria-live="polite" aria-atomic="true"`.

- [ ] **Step 5: Verify GREEN and commit**

Run the Step 2 command and commit with `feat(motion): make inline verdicts optimistic and decisive`.

### Task 6: Review-board verdicts and FLIP reflow

**Files:**
- Modify: `frontend/src/app/pages/review-board/review-board-page.component.ts`
- Modify: `frontend/src/app/pages/review-board/review-board-page.component.spec.ts`

**Interfaces:**
- Consumes: `ReviewVerdictMotionService`, `ReviewService.operationState`.
- Produces: optimistic suite mutation with exact rollback snapshot.

- [ ] **Step 1: Extend failing board specs**

Use an RxJS `Subject` response. Assert selected case removal and next-case selection happen immediately after click, before response; approve/reject announcements are set immediately; error restores the same suite/index/selection; reduced motion skips `ReviewVerdictMotionService.capture`.

- [ ] **Step 2: Verify RED**

```text
npm --prefix frontend test -- --watch=false --include=src/app/pages/review-board/review-board-page.component.spec.ts
```

- [ ] **Step 3: Move current response-time mutation to request start**

Capture `suites()`, `selectedCaseId()`, and list/card geometry, mutate suites immediately, queue the shared FLIP playback after Angular render, then use `next` only to confirm messages/counters. Restore the captured snapshot in `error` and announce the rollback.

- [ ] **Step 4: Verify GREEN and commit**

Run the Step 2 command plus the inline review specs and commit with `feat(motion): add optimistic review-board verdict reflow`.

### Task 7: Toast spring, exit, and progress shimmer

**Files:**
- Modify: `frontend/src/app/core/services/toast.service.ts`
- Modify: `frontend/src/app/core/services/toast.service.spec.ts`
- Modify: `frontend/src/app/shared/components/toast-container.component.ts`
- Create: `frontend/src/app/shared/components/toast-container.component.spec.ts`

**Interfaces:**
- Produces: `ToastItem.progress: boolean`, `ToastService.showProgress(message, type?)`.
- Consumes: existing toast entering/exiting lifecycle.

- [ ] **Step 1: Write failing service and container tests**

Assert progress toasts do not auto-dismiss, render a `.toast-progress-shimmer`, and normal toasts do not. Assert entry uses x/y/scale/opacity with a back ease, exit uses scale/opacity and calls `remove`; reduced motion removes immediately without GSAP.

- [ ] **Step 2: Verify RED**

```text
npm --prefix frontend test -- --watch=false --include=src/app/core/services/toast.service.spec.ts --include=src/app/shared/components/toast-container.component.spec.ts
```

- [ ] **Step 3: Implement explicit progress state and motion**

```ts
showProgress(message: string, type: ToastType = 'info'): number {
  const toast = { id: this.nextId++, message, type, exiting: false, progress: true };
  this.toasts.update((items) => [...items, toast]);
  return toast.id;
}
```

Use `gsap.fromTo(el, { x: 18, y: 18, scale: 0.96, opacity: 0 }, { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.34, ease: 'back.out(1.7)' })`; exit uses `{ scale: 0.97, opacity: 0, duration: 0.18 }`. Add a CSS-only indeterminate bar only under the explicit progress branch and disable it for reduced motion.

- [ ] **Step 4: Verify GREEN and commit**

Run the Step 2 command and commit with `feat(motion): add physical toast lifecycle states`.

### Task 8: Full verification and demo-mode exercise

**Files:**
- Test: `frontend/e2e/testcaseiq.spec.ts`
- Reference: `README.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: acceptance evidence.

- [ ] **Step 1: Run all unit tests**

```text
npm --prefix frontend test -- --watch=false
```

Expected: zero failed specs.

- [ ] **Step 2: Run production build**

```text
npm --prefix frontend run build
```

Expected: exit code 0 and no budget errors.

- [ ] **Step 3: Run end-to-end tests in documented mock/demo mode**

Start the documented backend/demo prerequisites, then run:

```text
npm --prefix frontend run e2e
```

Expected: all existing Playwright projects pass against the documented mock/demo workflow.

- [ ] **Step 4: Audit animation-to-state mapping and reduced motion**

Search animation declarations and GSAP calls in changed files. For each, record the exact service phase or toast lifecycle branch that activates it. Confirm there is no idle selector, timer, or effect capable of replaying a loop.

- [ ] **Step 5: Review diff and commit verification-only changes**

```text
git diff --check
git status --short
```

If e2e files changed, commit them with `test(e2e): cover AI operation motion states`.
