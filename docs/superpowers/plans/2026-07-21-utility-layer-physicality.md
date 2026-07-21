# Utility Layer Physicality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give TestCaseIQ's search, notifications, buttons, drawer, skeletons, and shortcut overlay the same physical black-glass motion language as the rest of the instrument.

**Architecture:** Keep lifecycle and accessibility behavior in the existing Angular components, express deterministic visual states in component/shared CSS, and use the existing native View Transitions route infrastructure for the search trigger morph and navigation handoff. Shared registered properties and synchronized loading primitives live in `frontend/src/styles/utility-motion.css`, imported once by the global stylesheet.

**Tech Stack:** Angular 22 standalone components and signals, TypeScript 6, CSS registered custom properties and keyframes, native View Transitions, GSAP 3.15 where drawer lifecycle already uses it, Jasmine/Karma, Playwright.

## Global Constraints

- Do not change focus-trap behavior, Escape handling, announcement text, or any `--z-*` token.
- Search panel entrance is `240ms` with `--ease-out-expo`; result delay is `min(index * 30ms, 300ms)` and active highlighting is instant.
- Notification panel entrance is `240ms`; items trail by `60ms`; unread ping has exactly two iterations.
- Primary button charge is `180ms`; all button press rings use `--dur-micro`; pending width does not shift.
- Drawer entrance is `280ms` with `--ease-out-expo`/`expo.out` and content reveals in sequence.
- All skeletons use one shared CSS animation phase with no random or per-instance delay.
- `prefers-reduced-motion: reduce` makes every new entrance/exit and transient motion instant or static.
- Do not add dependencies.

---

### Task 1: Shared Utility Motion Primitives

**Files:**
- Create: `frontend/src/styles/utility-motion.css`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: `--color-phosphor-glass`, `--color-phosphor-glow`, `--glass-bg-1`, and `--ease-out-expo` from `frontend/src/styles/tokens.css`.
- Produces: `--tcq-overlay-blur`, `tcq-overlay-enter`, `tcq-overlay-backdrop-enter`, `tcq-skeleton-sweep`, `.tcq-skeleton-shimmer`, and reduced-motion overrides.

- [ ] **Step 1: Confirm the global stylesheet import boundary**

Run:

```powershell
Select-String -LiteralPath frontend/src/styles.css -Pattern "styles/"
```

Expected: existing token/glass/view-transition imports are listed, establishing where `utility-motion.css` must be imported.

- [ ] **Step 2: Add the complete shared primitive stylesheet**

Create `frontend/src/styles/utility-motion.css` with:

```css
@property --tcq-overlay-blur {
  syntax: '<length>';
  inherits: false;
  initial-value: 0px;
}

@keyframes tcq-overlay-backdrop-enter {
  from { --tcq-overlay-blur: 0px; opacity: 0; }
  to { --tcq-overlay-blur: 8px; opacity: 1; }
}

@keyframes tcq-overlay-enter {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes tcq-skeleton-sweep {
  from { background-position: 160% 160%; }
  to { background-position: -60% -60%; }
}

.tcq-skeleton-shimmer {
  background-image: linear-gradient(
    125deg,
    var(--glass-bg-1) 30%,
    var(--color-phosphor-glass) 44%,
    color-mix(in srgb, var(--color-phosphor) 28%, transparent) 50%,
    var(--color-phosphor-glass) 56%,
    var(--glass-bg-2) 70%
  );
  background-size: 260% 260%;
  animation: tcq-skeleton-sweep 1.6s linear infinite;
  animation-delay: 0s;
}

@media (prefers-reduced-motion: reduce) {
  .tcq-skeleton-shimmer {
    animation: none;
    background: color-mix(in srgb, var(--glass-bg-2) 82%, var(--color-phosphor-glass));
  }
}
```

Import it in `frontend/src/styles.css` immediately after tokens/glass imports:

```css
@import './styles/utility-motion.css';
```

- [ ] **Step 3: Verify the shared CSS compiles**

Run:

```powershell
npm --prefix frontend run build
```

Expected: exit code `0`; Angular emits the browser bundle without CSS parse errors.

- [ ] **Step 4: Commit the shared primitive**

```powershell
git add frontend/src/styles/utility-motion.css frontend/src/styles.css
git commit -m "feat(ui): add shared utility motion primitives"
```

---

### Task 2: Search Trigger Morph, Focus Return, and Instant Selection

**Files:**
- Create: `frontend/src/app/shared/search-modal/search-modal.component.spec.ts`
- Modify: `frontend/src/app/shared/search-modal/search-modal.component.ts`
- Modify: `frontend/src/app/shared/search-modal/search-modal.component.html`
- Modify: `frontend/src/app/shared/search-modal/search-modal.component.css`
- Modify: `frontend/src/app/layout/app-layout.component.ts`
- Modify: `frontend/src/styles/view-transitions.css`

**Interfaces:**
- Consumes: `tcq-overlay-enter`, `tcq-overlay-backdrop-enter`, `--tcq-overlay-blur`, and the existing router View Transition configuration.
- Produces: `SearchModalComponent.navigating: OutputEmitterRef<void>`, `AppLayoutComponent.closeSearch(restoreFocus?: boolean): void`, `.search-trigger-morph`, `.search-panel-morph`, and `rowDelay(index: number): string`.

- [ ] **Step 1: Write failing component tests for stagger, instant active state, and navigation intent**

Create `search-modal.component.spec.ts` using a real component fixture, `provideRouter([])`, and a stub `SearchService`. Include these assertions:

```typescript
it('caps row reveal delay at 300ms', () => {
  expect(component.rowDelay(0)).toBe('0ms');
  expect(component.rowDelay(4)).toBe('120ms');
  expect(component.rowDelay(99)).toBe('300ms');
});

it('emits navigating before routing the active result', () => {
  const navigating = spyOn(component.navigating, 'emit');
  const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
  component.results.set({ projects: [{ id: 'p1', name: 'Alpha', type: 'PROJECT' }], stories: [], testSuites: [], testCases: [] });
  component.query.set('alpha');

  component.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));

  expect(navigating).toHaveBeenCalledBefore(navigate);
  expect(navigate).toHaveBeenCalledWith('/projects/p1');
});

it('moves the active row synchronously on ArrowDown', () => {
  component.recent.set([
    { id: 'p1', label: 'One', type: 'PROJECT', route: '/projects/p1' },
    { id: 'p2', label: 'Two', type: 'PROJECT', route: '/projects/p2' }
  ]);

  component.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));

  expect(component.activeIndex()).toBe(1);
});
```

- [ ] **Step 2: Run the search tests and verify RED**

Run:

```powershell
npm --prefix frontend test -- --watch=false --include=src/app/shared/search-modal/search-modal.component.spec.ts
```

Expected: compilation/test failure because `rowDelay` and `navigating` do not exist.

- [ ] **Step 3: Implement the search component contract**

Add:

```typescript
readonly navigating = output<void>();

rowDelay(index: number): string {
  return `${Math.min(index * 30, 300)}ms`;
}
```

Change `select` so intent is emitted before close/navigation:

```typescript
select(row: RecentSearchItem): void {
  this.saveSearch(this.query());
  this.saveRecent(row);
  this.navigating.emit();
  void this.router.navigateByUrl(row.route);
}
```

In the template, add `search-panel-morph` to the panel and bind each selectable result row's reveal index through the flattened row collection. Add this public helper:

```typescript
rowIndex(row: SearchRow): number {
  return this.rows().findIndex(candidate => candidate.id === row.id && candidate.type === row.type);
}
```

Bind the delay with:

```html
[style.--result-delay]="rowDelay(rowIndex(row))"
```

For recent query-term buttons, `$index` is already the flattened sequence and can be passed directly to `rowDelay($index)`. Keep `.active` calculation and all roles/labels unchanged.

- [ ] **Step 4: Implement parent View Transition and focus bridge**

Add `#searchTrigger` to the top-bar search button and `@ViewChild('searchTrigger')`. Store the trigger in `searchReturnFocusTarget`. Implement a progressive helper:

```typescript
private runViewTransition(update: () => void): void {
  const start = (document as Document & {
    startViewTransition?: (callback: () => void) => { finished: Promise<void> };
  }).startViewTransition;
  if (!start || this.prefersReducedMotion()) {
    update();
    return;
  }
  start.call(document, update);
}
```

Use it in `openSearch()` and restore focus only for dismissals:

```typescript
openSearch(): void {
  this.searchReturnFocusTarget = this.searchTrigger?.nativeElement ?? null;
  this.runViewTransition(() => this.searchOpen.set(true));
}

closeSearch(restoreFocus = true): void {
  this.searchOpen.set(false);
  if (restoreFocus) {
    queueMicrotask(() => this.searchReturnFocusTarget?.focus({ preventScroll: true }));
  }
  this.searchReturnFocusTarget = null;
}
```

Wire `(navigating)="closeSearch(false)"` and `(closed)="closeSearch()"`. Selection emits only `navigating`; dismissals emit only `closed`, so navigation cannot accidentally trigger focus restoration.

- [ ] **Step 5: Add exact search motion CSS**

Use backdrop animation with `backdrop-filter: blur(var(--tcq-overlay-blur))`, panel `tcq-overlay-enter 240ms var(--ease-out-expo)`, and row reveal from opacity/translateY using `animation-delay: var(--result-delay)`. Split hover and active rules so `.result-row.active` has `transition: none` and no animated transform. Give active state:

```css
box-shadow:
  var(--glass-border-highlight),
  0 0 0 1px var(--color-phosphor),
  0 0 18px var(--color-phosphor-glow);
```

Add view-transition names only to `.search-trigger-morph` and `.search-panel-morph`, and define the shared-element group timing as `240ms var(--ease-out-expo)` in `view-transitions.css`. Disable all new animation/transition declarations under reduced motion.

- [ ] **Step 6: Run search tests and verify GREEN**

Run the Step 2 command.

Expected: all search-modal specs pass with `0` failures.

- [ ] **Step 7: Commit search behavior**

```powershell
git add frontend/src/app/shared/search-modal frontend/src/app/layout/app-layout.component.ts frontend/src/styles/view-transitions.css
git commit -m "feat(search): morph palette from trigger"
```

---

### Task 3: Notification Parallax and Finite Ping

**Files:**
- Create: `frontend/src/app/shared/notification-center/notification-center.component.spec.ts`
- Modify: `frontend/src/app/shared/notification-center/notification-center.component.html`
- Modify: `frontend/src/app/shared/notification-center/notification-center.component.css`

**Interfaces:**
- Consumes: notification signals and native popover behavior already exposed by `NotificationCenterComponent`.
- Produces: `.notification-badge-ping`, `--notification-index`, and finite `tcq-unread-ping` animation.

- [ ] **Step 1: Write failing notification DOM tests**

Configure the component with a stub service returning `of({ count: 2 })`, `of([...])`, and `of(undefined)`. Assert:

```typescript
it('marks the unread badge as a finite ping target', () => {
  component.unreadCount.set(2);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('.notification-badge-ping')).not.toBeNull();
});

it('assigns stable list indices for the parallax trail', () => {
  component.notifications.set([firstNotification, secondNotification]);
  fixture.detectChanges();
  const rows = fixture.nativeElement.querySelectorAll('.notification-row');
  expect(rows[0].style.getPropertyValue('--notification-index')).toBe('0');
  expect(rows[1].style.getPropertyValue('--notification-index')).toBe('1');
});
```

- [ ] **Step 2: Run notification tests and verify RED**

```powershell
npm --prefix frontend test -- --watch=false --include=src/app/shared/notification-center/notification-center.component.spec.ts
```

Expected: missing ping class and missing custom-property values.

- [ ] **Step 3: Add notification structure and styles**

Add `notification-badge-ping` to the badge. Bind `[style.--notification-index]="$index"` to rows. Style `:popover-open` with a `240ms` right-slide/opacity animation. Give rows a `60ms` base trail plus a capped per-row delay. Implement the ping on `::after` with:

```css
animation: tcq-unread-ping 720ms var(--ease-out-expo) 2;
```

Do not use `infinite`. Reduced motion removes panel, row, and ping animation.

- [ ] **Step 4: Run notification tests and verify GREEN**

Run the Step 2 command.

Expected: all notification specs pass.

- [ ] **Step 5: Commit notification motion**

```powershell
git add frontend/src/app/shared/notification-center
git commit -m "feat(notifications): add parallax entrance and finite ping"
```

---

### Task 4: Button Charge, Press Ring, and Width-Locked Pending State

**Files:**
- Create: `frontend/src/app/shared/components/button.component.spec.ts`
- Modify: `frontend/src/app/shared/components/button.component.ts`

**Interfaces:**
- Consumes: existing `variant`, `loading`, `disabled`, `state`, and projected label API.
- Produces: `.btn-content`, `.btn-pending`, three `.btn-pending-dot` elements, and width locking driven by `ResizeObserver`/measured button width without changing public inputs.

- [ ] **Step 1: Write failing button DOM tests**

Use a standalone host with `<app-button [loading]="loading()">Generate</app-button>`. Assert:

```typescript
it('keeps projected content mounted and exposes three decorative pending dots', () => {
  host.loading.set(true);
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('.btn-content')?.textContent).toContain('Generate');
  expect(fixture.nativeElement.querySelectorAll('.btn-pending-dot').length).toBe(3);
  expect(fixture.nativeElement.querySelector('.btn-pending')?.getAttribute('aria-hidden')).toBe('true');
});

it('marks the native button busy and disabled while pending', () => {
  host.loading.set(true);
  fixture.detectChanges();
  const button = fixture.nativeElement.querySelector('button');
  expect(button.disabled).toBeTrue();
  expect(button.getAttribute('aria-busy')).toBe('true');
});
```

- [ ] **Step 2: Run button tests and verify RED**

```powershell
npm --prefix frontend test -- --watch=false --include=src/app/shared/components/button.component.spec.ts
```

Expected: `.btn-content` and three pending dots are absent.

- [ ] **Step 3: Implement stable content/pending layers**

Keep `<ng-content>` mounted inside `.btn-content`. Add an absolutely overlaid `.btn-pending[aria-hidden=true]` containing exactly three spans. Toggle opacity/visibility from `.btn--loading`; never replace the label DOM. Use CSS `min-inline-size: var(--btn-locked-width, auto)` and measure the default-state button with `ResizeObserver`, setting `--btn-locked-width` before loading transitions. Disconnect the observer in `ngOnDestroy`.

- [ ] **Step 4: Implement physical button CSS**

Use one pseudo-element as the inset press ring. Default it to `inset: 1px; opacity: 0`; on `:active:not(:disabled)`, contract to `inset: 2px` over `--dur-micro`. Set only `.btn--primary` glow transition to `180ms`; secondary/danger keep current hover declarations. Dots shimmer with sequential opacity inside one shared keyframe. Reduced motion makes content/pending state swap instant and dots static.

- [ ] **Step 5: Run button tests and verify GREEN**

Run the Step 2 command.

Expected: all button specs pass.

- [ ] **Step 6: Commit button behavior**

```powershell
git add frontend/src/app/shared/components/button.component.ts frontend/src/app/shared/components/button.component.spec.ts
git commit -m "feat(button): add physical pending and press states"
```

---

### Task 5: Drawer Expo Entrance, Blur, and Content Reveal

**Files:**
- Modify: `frontend/src/app/shared/components/drawer.component.ts`
- Modify: `frontend/src/app/shared/components/drawer.component.spec.ts`

**Interfaces:**
- Consumes: current `isVisible`, `closing`, close timer, focus target, and reduced-motion check.
- Produces: `.drawer-reveal`, `--drawer-reveal-delay`, backdrop GSAP/CSS entrance, and a `280ms` panel entrance.

- [ ] **Step 1: Extend drawer tests and verify RED**

Add assertions that `.drawer-header` and `.drawer-body` carry `.drawer-reveal`, with delay values `0ms` and `50ms`. Update the open-animation spy to assert GSAP receives `duration: 0.28` and `ease: 'expo.out'` for `.drawer-panel`.

Run:

```powershell
npm --prefix frontend test -- --watch=false --include=src/app/shared/components/drawer.component.spec.ts
```

Expected: reveal classes/delays are missing and the current duration is `0.3` with `power2.out`.

- [ ] **Step 2: Implement drawer visual states without changing lifecycle**

Add reveal classes and properties to header/body. Change the entrance call to:

```typescript
gsap.from(drawer, { x: 480, duration: 0.28, ease: 'expo.out' });
```

Animate the backdrop through CSS from opacity `0` and `--tcq-overlay-blur: 0px` to opacity `1` and `8px`. Apply the `tcqReveal` contract locally to `.drawer-reveal` using opacity/translateY and `var(--drawer-reveal-delay)`. Do not add IntersectionObserver or alter focus methods.

- [ ] **Step 3: Preserve close timing and reduced motion**

Keep the existing `250ms` close timer so current exit tests remain correct. Under reduced motion, disable backdrop/reveal animations; the existing JavaScript path calls `finishClose` immediately.

- [ ] **Step 4: Run drawer tests and verify GREEN**

Run the Step 1 command.

Expected: all drawer timing, Escape, initial-focus, and focus-restoration specs pass.

- [ ] **Step 5: Commit drawer motion**

```powershell
git add frontend/src/app/shared/components/drawer.component.ts frontend/src/app/shared/components/drawer.component.spec.ts
git commit -m "feat(drawer): add expo entrance and staged content"
```

---

### Task 6: Synchronized Skeleton Sweep

**Files:**
- Create: `frontend/src/app/shared/skeleton/skeleton.component.spec.ts`
- Modify: `frontend/src/app/shared/skeleton/skeleton.component.ts`
- Modify: `frontend/src/app/shared/search-modal/search-modal.component.html`
- Modify: `frontend/src/app/shared/search-modal/search-modal.component.css`
- Modify: `frontend/src/app/shared/notification-center/notification-center.component.html`
- Modify: `frontend/src/app/shared/notification-center/notification-center.component.css`

**Interfaces:**
- Consumes: `.tcq-skeleton-shimmer` from Task 1.
- Produces: every skeleton surface opts into the same global timeline by class, identical duration, and zero delay.

- [ ] **Step 1: Write failing skeleton class test**

```typescript
it('places every cell on the shared shimmer timeline', () => {
  fixture.componentRef.setInput('rows', 2);
  fixture.componentRef.setInput('cols', 3);
  fixture.detectChanges();
  const shimmers = fixture.nativeElement.querySelectorAll('.tcq-skeleton-shimmer');
  expect(shimmers.length).toBe(6);
});
```

Run:

```powershell
npm --prefix frontend test -- --watch=false --include=src/app/shared/skeleton/skeleton.component.spec.ts
```

Expected: zero `.tcq-skeleton-shimmer` elements.

- [ ] **Step 2: Adopt the shared skeleton class**

Add `tcq-skeleton-shimmer` to `.skel-shimmer`, search loading bars, and notification loading bars. Remove each component's duplicate sweep keyframes and animation declarations while retaining sizing and border radii.

- [ ] **Step 3: Run skeleton and dependent component tests**

```powershell
npm --prefix frontend test -- --watch=false --include=src/app/shared/skeleton/skeleton.component.spec.ts --include=src/app/shared/search-modal/search-modal.component.spec.ts --include=src/app/shared/notification-center/notification-center.component.spec.ts
```

Expected: all included specs pass.

- [ ] **Step 4: Commit synchronized skeletons**

```powershell
git add frontend/src/app/shared/skeleton frontend/src/app/shared/search-modal frontend/src/app/shared/notification-center
git commit -m "feat(skeleton): synchronize phosphor shimmer"
```

---

### Task 7: Keyboard Shortcut Glass Keycaps and Mirrored Overlay

**Files:**
- Modify: `frontend/src/app/shared/components/keyboard-shortcuts.component.ts`
- Modify: `frontend/src/app/shared/components/keyboard-shortcuts.component.spec.ts`

**Interfaces:**
- Consumes: shared overlay keyframes/properties from Task 1.
- Produces: `.ks-keycap` glass key structure while preserving the `kbd` elements and shortcut text.

- [ ] **Step 1: Write failing keycap and semantics tests**

Add:

```typescript
it('renders every shortcut key as a glass keycap', () => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
  fixture.detectChanges();
  const keys = fixture.nativeElement.querySelectorAll('kbd.ks-keycap');
  expect(keys.length).toBe(10);
});

it('preserves dialog semantics and accessible name', () => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
  fixture.detectChanges();
  const panel = fixture.nativeElement.querySelector('.ks-panel');
  expect(panel.getAttribute('role')).toBe('dialog');
  expect(panel.getAttribute('aria-modal')).toBe('true');
  expect(panel.getAttribute('aria-label')).toBe('Keyboard shortcuts');
});
```

- [ ] **Step 2: Run shortcut tests and verify RED**

```powershell
npm --prefix frontend test -- --watch=false --include=src/app/shared/components/keyboard-shortcuts.component.spec.ts
```

Expected: no `kbd.ks-keycap` elements.

- [ ] **Step 3: Implement mirrored overlay and keycap states**

Add `ks-keycap` to every `kbd`. Replace the GSAP panel entrance with shared CSS overlay animation so both panel and backdrop start in the same render; remove unused `Injector`, `afterNextRender`, `ElementRef`, `ViewChild`, and `gsap` imports. Use `tcq-overlay-enter 240ms var(--ease-out-expo)` and the shared backdrop blur animation. Style keycaps with top highlight, bottom edge, and `:active { transform: translateY(1px); box-shadow: inset 0 1px 2px rgba(0,0,0,.45); }` returning over `--dur-micro`.

- [ ] **Step 4: Add reduced-motion static behavior**

Disable panel/backdrop animations and keycap transforms/transitions inside the component media query. Do not change `show`, `?`, form-field suppression, or Escape code.

- [ ] **Step 5: Run shortcut tests and verify GREEN**

Run the Step 2 command.

Expected: all keyboard-shortcut specs pass.

- [ ] **Step 6: Commit shortcut overlay**

```powershell
git add frontend/src/app/shared/components/keyboard-shortcuts.component.ts frontend/src/app/shared/components/keyboard-shortcuts.component.spec.ts
git commit -m "feat(shortcuts): add glass keycaps and overlay motion"
```

---

### Task 8: End-to-End Focus and Reduced-Motion Acceptance

**Files:**
- Modify: `frontend/e2e/testcaseiq.spec.ts`

**Interfaces:**
- Consumes: top-bar search trigger, global search dialog, close button, result rows, and reduced-motion CSS behavior from prior tasks.
- Produces: regression coverage for focus continuity, Escape restoration, and instant reduced-motion overlay state.

- [ ] **Step 1: Add the failing focus-continuity e2e test**

Use the suite's existing authentication/bootstrap helper. Add a test that clicks `[aria-label="Open search"]`, waits for `[role="dialog"][aria-label="Global search"]`, tabs through every focusable element until focus wraps to the first element, presses Escape, and expects the search trigger to be focused.

```typescript
await page.getByLabel('Open search').click();
const dialog = page.getByRole('dialog', { name: 'Global search' });
await expect(dialog).toBeVisible();
await expect(page.getByLabel('Search')).toBeFocused();
await page.keyboard.press('Escape');
await expect(dialog).toBeHidden();
await expect(page.getByLabel('Open search')).toBeFocused();
```

- [ ] **Step 2: Run the targeted e2e test and verify RED or existing gap**

```powershell
npm --prefix frontend run e2e -- --grep "search focus continuity"
```

Expected before the parent bridge: focus does not return to the trigger. If prior implementation already makes this pass, temporarily revert the focus-restoration hunk, verify failure, then restore it before continuing.

- [ ] **Step 3: Add reduced-motion coverage**

In a test context with `page.emulateMedia({ reducedMotion: 'reduce' })`, open search and shortcuts and assert the dialogs are immediately visible and usable. Query computed animation duration/name on the panels and assert it is `0s` or `none`.

- [ ] **Step 4: Run targeted e2e tests**

```powershell
npm --prefix frontend run e2e -- --grep "search focus continuity|reduced motion overlays"
```

Expected: both tests pass.

- [ ] **Step 5: Commit acceptance coverage**

```powershell
git add frontend/e2e/testcaseiq.spec.ts
git commit -m "test(e2e): cover utility overlay focus and motion"
```

---

### Task 9: Full Verification and Requirement Audit

**Files:**
- Verify all files changed in Tasks 1-8.

**Interfaces:**
- Consumes: complete implementation.
- Produces: fresh build, unit, e2e, accessibility, and diff evidence.

- [ ] **Step 1: Run formatting and whitespace validation**

```powershell
git diff --check
```

Expected: no output and exit code `0`.

- [ ] **Step 2: Run the production build**

```powershell
npm --prefix frontend run build
```

Expected: exit code `0` with Angular browser bundle output.

- [ ] **Step 3: Run the full unit suite once**

```powershell
npm --prefix frontend test -- --watch=false
```

Expected: exit code `0`, `0 FAILED`.

- [ ] **Step 4: Run the full Playwright suite**

```powershell
npm --prefix frontend run e2e
```

Expected: exit code `0`, all Chromium tests passed.

- [ ] **Step 5: Audit immutable acceptance constraints**

Confirm from the diff that:

```text
- no --z-* token changed
- all original aria-label/aria-live/role strings remain
- search trapFocus and Escape branches remain semantically unchanged
- drawer focusInitialElement and restoreFocus remain unchanged
- no animation uses an infinite unread ping
- every new motion block has a reduced-motion override
```

- [ ] **Step 6: Record final status**

Run:

```powershell
git status --short
git log --oneline -10
```

Expected: only the user's pre-existing unrelated files remain untracked; implementation commits are visible and no requested source file is unstaged.
