# Motion Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared Angular motion policy, Lenis/ScrollTrigger integration, motion tokens, and accessible reveal directive while preserving existing page visuals.

**Architecture:** A root `MotionService` owns browser preference/capability signals and the singleton GSAP/ScrollTrigger pair. `AppLayoutComponent` attaches a root `LenisService` to its `.workspace` scroll viewport, while `BackgroundSceneService` and `RevealDirective` consume the centralized policy.

**Tech Stack:** Angular 22 standalone components and signals, Jasmine/Karma, GSAP 3.15 with ScrollTrigger, Lenis 1.3, CSS custom properties.

## Global Constraints

- Modify only `frontend/`; do not touch `backend/`.
- Keep every existing token in `frontend/src/styles/tokens.css` untouched.
- Do not opt existing pages into `[tcqReveal]`.
- Existing pages must render identically except for smooth scrolling on product pages.
- Disable Lenis when reduced motion is active or quality is `static`.
- Reveal content must be visible before JavaScript initializes.
- Final verification: `npm --prefix frontend run build` and `npm --prefix frontend test -- --watch=false`.

---

### Task 1: Central Motion Policy and Background Refactor

**Files:**
- Create: `frontend/src/app/core/motion/motion.service.ts`
- Create: `frontend/src/app/core/motion/motion.service.spec.ts`
- Modify: `frontend/src/main.ts`
- Modify: `frontend/src/app/shared/background/background-scene.service.ts`

**Interfaces:**
- Produces: `MotionQualityTier = 'high' | 'medium' | 'static'`.
- Produces: `MotionService.reducedMotion: Signal<boolean>`, `qualityTier: Signal<MotionQualityTier>`, `gsap`, and `ScrollTrigger`.
- Consumes: `matchMedia`, `hardwareConcurrency`, and `location.search`.

- [ ] **Step 1: Write failing tests**

Create controllable media-query fakes and assert:

```ts
expect(createService({ cores: 8, mobile: false }).qualityTier()).toBe('high');
expect(createService({ cores: 8, mobile: true }).qualityTier()).toBe('medium');
expect(createService({ cores: 2, mobile: false }).qualityTier()).toBe('static');
history.replaceState({}, '', '?bg=fallback');
expect(createService({ cores: 8, mobile: false }).qualityTier()).toBe('static');

const service = createService({ cores: 8, mobile: false, reduced: false });
reducedQuery.setMatches(true);
expect(service.reducedMotion()).toBeTrue();
```

Also assert two TestBed injections expose identical GSAP and ScrollTrigger references.

- [ ] **Step 2: Verify RED**

```powershell
npm --prefix frontend test -- --watch=false --include src/app/core/motion/motion.service.spec.ts
```

Expected: compilation fails because the service does not exist.

- [ ] **Step 3: Implement minimal policy**

Use a root injectable, a writable internal reduced-motion signal exposed with `asReadonly()`, a registered media-query change listener cleaned up through `DestroyRef`, and a readonly tier signal. At module scope register ScrollTrigger only when `gsap.plugins['ScrollTrigger']` is absent. Tier precedence is forced fallback/two cores, mobile/coarse pointer, then high.

```ts
export type MotionQualityTier = 'high' | 'medium' | 'static';

@Injectable({ providedIn: 'root' })
export class MotionService {
  readonly gsap = gsap;
  readonly ScrollTrigger = ScrollTrigger;
  private readonly reducedMotionState = signal(this.reducedQuery.matches);
  readonly reducedMotion = this.reducedMotionState.asReadonly();
  readonly qualityTier = signal<MotionQualityTier>(this.detectQualityTier()).asReadonly();
}
```

- [ ] **Step 4: Refactor consumers**

Remove GSAP/ScrollTrigger registration from `main.ts`. Inject `MotionService` into `BackgroundSceneService`; use `qualityTier() === 'static'` instead of its low-end/fallback helpers and `motion.gsap.quickTo` for parallax. Retain WebGL and `?bg=no-webgl` checks.

- [ ] **Step 5: Verify GREEN**

```powershell
npm --prefix frontend test -- --watch=false --include src/app/core/motion/motion.service.spec.ts
```

Expected: all selected specs pass.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/app/core/motion/motion.service.ts frontend/src/app/core/motion/motion.service.spec.ts frontend/src/main.ts frontend/src/app/shared/background/background-scene.service.ts
git commit -m "feat(frontend): centralize motion policy"
```

---

### Task 2: Lenis Product-Page Scrolling

**Files:**
- Create: `frontend/src/app/core/motion/lenis.service.ts`
- Create: `frontend/src/app/core/motion/lenis.service.spec.ts`
- Modify: `frontend/src/app/layout/app-layout.component.ts`
- Modify: `frontend/src/app/layout/app-layout.component.css`

**Interfaces:**
- Consumes: the MotionService signals and shared GSAP/ScrollTrigger.
- Produces: `attach(wrapper: HTMLElement, content: HTMLElement): void` and `detach(): void`.
- Layout supplies `.workspace` and direct `.workspace-content` elements.

- [ ] **Step 1: Write failing lifecycle tests**

Use an injectable factory or exported construction function to provide a fake. Assert construction with `wrapper`, `content`, and `autoRaf: false`; subscription through `lenis.on('scroll', ScrollTrigger.update)`; no construction on static tier; destruction after reduced motion flips true; and removal of ticker/subscription on detach.

- [ ] **Step 2: Verify RED**

```powershell
npm --prefix frontend test -- --watch=false --include src/app/core/motion/lenis.service.spec.ts
```

Expected: compilation fails because the service does not exist.

- [ ] **Step 3: Implement Lenis lifecycle**

Reconcile attached elements and live motion policy in an Angular effect. Active construction uses:

```ts
new Lenis({
  wrapper,
  content,
  autoRaf: false,
  anchors: true,
  allowNestedScroll: true,
  prevent: (node) => Boolean(node.closest('[role="dialog"], [popover], [data-lenis-prevent]'))
});
```

Store the unsubscribe from `on('scroll', ScrollTrigger.update)`. Add one stable GSAP ticker callback that calls `lenis.raf(time * 1000)`, use `gsap.ticker.lagSmoothing(0)`, and fully remove/destroy everything in `detach()`.

- [ ] **Step 4: Attach it to AppLayoutComponent**

Change the workspace opening tag from:

```html
<section class="workspace">
```

to:

```html
<section #scrollWrapper class="workspace">
  <div #scrollContent class="workspace-content">
```

Then change the existing template ending from:

```html
<router-outlet (activate)="onRouteActivate($event)" />
</section>
```

to:

```html
<router-outlet (activate)="onRouteActivate($event)" />
  </div>
</section>
```

Add two ViewChild references, inject LenisService, attach before the existing sidebar animation, and detach in `ngOnDestroy`. Move the current grid/padding declarations to `.workspace-content`; set `.workspace` to `height: 100vh; min-width: 0; overflow-y: auto; overflow-x: clip`.

- [ ] **Step 5: Verify GREEN and regressions**

```powershell
npm --prefix frontend test -- --watch=false --include src/app/core/motion/lenis.service.spec.ts --include src/app/layout/app-layout.component.spec.ts
```

Expected: selected Lenis and existing layout focus/navigation specs pass.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/app/core/motion/lenis.service.ts frontend/src/app/core/motion/lenis.service.spec.ts frontend/src/app/layout/app-layout.component.ts frontend/src/app/layout/app-layout.component.css
git commit -m "feat(frontend): add product page smooth scrolling"
```

---

### Task 3: Motion Tokens and Accessible Reveal Directive

**Files:**
- Modify: `frontend/src/styles/tokens.css`
- Create: `frontend/src/app/shared/directives/reveal.directive.ts`
- Create: `frontend/src/app/shared/directives/reveal.directive.spec.ts`

**Interfaces:**
- Consumes: `MotionService.reducedMotion()` and shared GSAP.
- Produces: standalone `[tcqReveal]` with a numeric delay input.

- [ ] **Step 1: Write failing directive tests**

A standalone host renders `<div class="target" [tcqReveal]="delay">Content</div>`. Before first change detection assert empty inline opacity/transform. Under reduced motion assert styles remain empty and no observer is created. Under normal motion assert initialization hides the host, an intersecting entry calls GSAP with opacity 1/y 0/configured delay, and observation disconnects. When IntersectionObserver is missing, assert visible styles.

- [ ] **Step 2: Verify RED**

```powershell
npm --prefix frontend test -- --watch=false --include src/app/shared/directives/reveal.directive.spec.ts
```

Expected: compilation fails because the directive does not exist.

- [ ] **Step 3: Implement reveal lifecycle**

Use `AfterViewInit`. With reduced motion or no observer, leave/restore visibility. Otherwise call `gsap.set(host, { opacity: 0, y: 12 })`, observe once, then:

```ts
this.tween = this.motion.gsap.to(host, {
  opacity: 1,
  y: 0,
  duration: 0.32,
  delay: Math.max(0, this.tcqReveal),
  ease: 'expo.out',
  clearProps: 'opacity,transform',
  onComplete: () => this.observer?.disconnect()
});
```

On destroy, disconnect, kill the tween, and clear hiding styles. Add no global selector that hides reveal hosts.

- [ ] **Step 4: Append motion tokens**

Add inside the existing motion section without modifying current declarations:

```css
--dur-micro: 120ms;
--dur-enter: 320ms;
--dur-scene: 700ms;
--ease-spring: linear(0, 0.004, 0.016, 0.04, 0.078, 0.132, 0.201, 0.285, 0.38, 0.482, 0.586, 0.687, 0.779, 0.86, 0.926, 0.976, 1.01, 1.031, 1.039, 1.038, 1.031, 1.022, 1.013, 1.006, 1.001, 0.999, 0.998, 0.999, 1);
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
```

- [ ] **Step 5: Verify GREEN**

```powershell
npm --prefix frontend test -- --watch=false --include src/app/shared/directives/reveal.directive.spec.ts
```

Expected: all selected specs pass.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/styles/tokens.css frontend/src/app/shared/directives/reveal.directive.ts frontend/src/app/shared/directives/reveal.directive.spec.ts
git commit -m "feat(frontend): add reveal motion primitive"
```

---

### Task 4: Acceptance Verification

**Files:**
- Verify all files changed by Tasks 1-3.

**Interfaces:**
- Consumes: complete motion foundation.
- Produces: fresh build/test evidence.

- [ ] **Step 1: Run full unit suite**

```powershell
npm --prefix frontend test -- --watch=false
```

Expected: exit code 0 and zero failed specs.

- [ ] **Step 2: Run production build**

```powershell
npm --prefix frontend run build
```

Expected: exit code 0 and a production bundle.

- [ ] **Step 3: Inspect scope and whitespace**

```powershell
git diff HEAD~3 --check
git diff HEAD~3 --name-only
```

Expected: no whitespace errors; no backend path appears.

- [ ] **Step 4: Check every acceptance condition**

Confirm from tests and diff that reduced motion leaves reveal transform unset, reduced/static policy prevents Lenis construction, background heuristics moved to MotionService, ScrollTrigger registration left `main.ts`, no page uses `[tcqReveal]`, and all original tokens remain.
