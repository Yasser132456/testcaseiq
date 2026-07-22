# Welcome Canvas Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the shared Three.js scene on the welcome route with a native Angular Canvas 2D dot grid that obeys the centralized motion policy.

**Architecture:** A standalone welcome-owned component manages one viewport-fixed canvas, its grid state, policy reconciliation, resizing, animation, input, and teardown. `AppComponent` separately gates the existing shared scene by normalized route so the welcome feature never imports or controls `BackgroundSceneService`.

**Tech Stack:** Angular 22 standalone components and signals, TypeScript 6, Canvas 2D, Jasmine/Karma, Playwright.

## Global Constraints

- Add no React, shadcn, or new runtime dependency.
- Use `MotionService` signals as the only motion, cursor, quality, visibility, reduced-motion, and fallback policy source.
- Set both drawing-buffer dimensions and CSS dimensions whenever the viewport changes.
- Medium, static, reduced-motion, and forced-fallback modes schedule no animation frame.
- The shared Three.js scene must not be instantiated on the normalized `/` route.
- Preserve unrelated working-tree changes.

---

### Task 1: Specify and implement the welcome canvas engine

**Files:**
- Create: `frontend/src/app/pages/welcome/welcome-background.component.spec.ts`
- Create: `frontend/src/app/pages/welcome/welcome-background.component.ts`

**Interfaces:**
- Consumes: `MotionService.qualityTier`, `motionEnabled`, `cursorEffectsEnabled`, `documentVisible`, `reducedMotion`, and `forcedFallback` signals.
- Produces: standalone `WelcomeBackgroundComponent` with selector `app-welcome-background` and one `canvas[data-testid="welcome-background-canvas"]`.

- [ ] **Step 1: Write failing viewport and static-policy tests**

Create a Jasmine component spec with signal-backed `MotionService` stubs. After `fixture.detectChanges()` and `TestBed.flushEffects()`, assert:

```ts
const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
expect(canvas.width).toBe(Math.round(document.documentElement.clientWidth * window.devicePixelRatio));
expect(canvas.height).toBe(Math.round(document.documentElement.clientHeight * window.devicePixelRatio));
expect(canvas.style.width).toBe(`${document.documentElement.clientWidth}px`);
expect(canvas.style.height).toBe(`${document.documentElement.clientHeight}px`);
expect(requestAnimationFrame).not.toHaveBeenCalled();
```

Add focused cases proving cursor listeners require `cursorEffectsEnabled()`, high tier schedules a frame outside Angular, hidden/static policy cancels it, and destroy disconnects `ResizeObserver` and removes listeners.

- [ ] **Step 2: Run the focused spec and verify RED**

Run:

```powershell
npm --prefix frontend run test:unit -- --include src/app/pages/welcome/welcome-background.component.spec.ts
```

Expected: compilation fails because `WelcomeBackgroundComponent` does not exist.

- [ ] **Step 3: Implement the minimal standalone component**

Create an `OnPush` component using this lifecycle shape:

```ts
@Component({
  selector: 'app-welcome-background',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<canvas #canvas data-testid="welcome-background-canvas" aria-hidden="true"></canvas>',
  styles: [`
    :host { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
    canvas { display: block; width: 100%; height: 100%; }
  `]
})
export class WelcomeBackgroundComponent implements OnDestroy {
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly motion = inject(MotionService);
  private readonly zone = inject(NgZone);
  private animationFrameId = 0;
  private pointer = { x: 0, y: 0, active: false };
}
```

Use `afterNextRender` for browser setup. `resizeCanvas()` must assign buffer and CSS sizes, apply `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`, regenerate the grid, and draw immediately. `drawFrame()` paints low-alpha cyan/violet base dots and a phosphor overlay based on per-dot influence. `animate(timestamp)` uses `1 - Math.exp(-rate * deltaSeconds)` interpolation and schedules only the next eligible high-tier frame. Reconcile animation and pointer listeners from one Angular `effect`; create/cancel rAF within `runOutsideAngular`.

- [ ] **Step 4: Run the focused spec and verify GREEN**

Run the focused command from Step 2. Expected: all welcome background component specs pass with zero failures.

- [ ] **Step 5: Refactor while green**

Keep rendering helpers private and focused: `setup`, `readPalette`, `resizeCanvas`, `buildGrid`, `drawFrame`, `animate`, `reconcilePolicy`, `attachPointerListeners`, `detachPointerListeners`, `startAnimation`, `stopAnimation`, and `teardown`.

### Task 2: Prevent the shared scene from mounting on welcome

**Files:**
- Create: `frontend/src/app/app.component.spec.ts`
- Modify: `frontend/src/app/app.component.ts`

**Interfaces:**
- Produces: exported pure helper `usesWelcomeBackground(url: string): boolean` and `AppComponent.sharedBackgroundVisible` signal.
- Preserves: `<app-background-scene>` for all non-welcome routes.

- [ ] **Step 1: Write the failing route-gate tests**

Test the pure normalization boundary and rendered root behavior:

```ts
expect(usesWelcomeBackground('/')).toBeTrue();
expect(usesWelcomeBackground('/?bg=fallback')).toBeTrue();
expect(usesWelcomeBackground('/#workflow')).toBeTrue();
expect(usesWelcomeBackground('/login')).toBeFalse();
```

Configure `AppComponent` with a router and a stubbed `BackgroundSceneComponent`, navigate to `/`, and assert the stub is absent; navigate to `/login` and assert it is present.

- [ ] **Step 2: Run the app spec and verify RED**

```powershell
npm --prefix frontend run test:unit -- --include src/app/app.component.spec.ts
```

Expected: compilation fails because `usesWelcomeBackground` and `sharedBackgroundVisible` do not exist.

- [ ] **Step 3: Implement the route signal and template gate**

Normalize the route before query/hash and subscribe to `NavigationEnd` with `takeUntilDestroyed`:

```ts
export function usesWelcomeBackground(url: string): boolean {
  return url.split('?')[0].split('#')[0] === '/';
}

readonly sharedBackgroundVisible = signal(!usesWelcomeBackground(this.router.url));
```

Wrap the scene in `@if (sharedBackgroundVisible()) { <app-background-scene /> }` and update the signal from `urlAfterRedirects || url`.

- [ ] **Step 4: Run the app spec and verify GREEN**

Run the focused command from Step 2. Expected: all route-gate specs pass.

### Task 3: Integrate the welcome-owned background and contrast layer

**Files:**
- Modify: `frontend/src/app/pages/welcome/welcome-page.component.ts`
- Modify: `frontend/src/app/pages/welcome/welcome-page.component.html`
- Modify: `frontend/src/app/pages/welcome/welcome-page.component.css`
- Modify: `frontend/src/app/pages/welcome/welcome-page.component.spec.ts`

**Interfaces:**
- Consumes: `WelcomeBackgroundComponent` selector.
- Preserves: all welcome landmarks, CTA routes, entrance motion, and magnetic CTA policy.

- [ ] **Step 1: Write the failing integration assertion**

Add:

```ts
expect(native.querySelector('app-welcome-background canvas')).not.toBeNull();
expect(native.querySelector('app-background-scene')).toBeNull();
```

- [ ] **Step 2: Run the welcome page spec and verify RED**

```powershell
npm --prefix frontend run test:unit -- --include src/app/pages/welcome/welcome-page.component.spec.ts
```

Expected: the welcome canvas selector is absent.

- [ ] **Step 3: Import and render the component**

Add `WelcomeBackgroundComponent` to the standalone imports and place `<app-welcome-background />` before the navigation. Ensure `.wl-nav`, `.wl-page`, and `.wl-footer` stay above the fixed canvas. Add a restrained radial/linear scrim behind `.wl-hero-copy` using a pseudo-element with negative inset and `z-index: -1`; keep the copy itself in an isolated stacking context.

- [ ] **Step 4: Run all three focused unit specs**

```powershell
npm --prefix frontend run test:unit -- --include src/app/pages/welcome/welcome-background.component.spec.ts --include src/app/pages/welcome/welcome-page.component.spec.ts --include src/app/app.component.spec.ts
```

Expected: all focused specs pass.

### Task 4: Acceptance verification

**Files:**
- Modify only if a failing acceptance check exposes a covered defect.

- [ ] **Step 1: Run the production build**

```powershell
npm --prefix frontend run build
```

Expected: exit code 0 and no Angular compilation errors.

- [ ] **Step 2: Run the complete unit suite**

```powershell
npm --prefix frontend run test:unit
```

Expected: zero failed specs.

- [ ] **Step 3: Run Playwright e2e**

```powershell
npm --prefix frontend run e2e
```

Expected: zero failed tests, including accessibility, visual, and performance projects configured by the repository.

- [ ] **Step 4: Verify browser acceptance at 1440x900**

Open `/`, `/?bg=fallback`, and `/` with reduced motion. Inspect the canvas buffer/CSS size, confirm no `app-background-scene` exists on `/`, confirm nearby dots brighten during pointer movement only in high tier, and capture the performance trace/long-task result showing no task above 50 ms.

- [ ] **Step 5: Review final diff and repository status**

Use `git diff --check`, inspect only task-owned changes, and preserve the pre-existing untracked `.codex-*`, `45)`, and `frontend/src/app/Re-run` files.
