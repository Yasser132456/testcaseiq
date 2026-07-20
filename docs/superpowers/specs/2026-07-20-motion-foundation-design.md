# Motion Foundation Design

## Goal

Create the shared motion infrastructure for the Angular frontend without changing existing page visuals. The foundation centralizes motion preferences and device quality, owns one GSAP/ScrollTrigger registration, adds product-page smooth scrolling, supplies reusable motion tokens, and introduces an accessible reveal directive.

## Scope

All implementation changes are confined to `frontend/`. The backend is not modified. Existing pages are not opted into reveal animations during this sprint. Smooth scrolling is activated only while `AppLayoutComponent` is mounted, so public authentication and welcome routes retain their current scrolling behavior.

## Motion Policy

`MotionService` is a root injectable and the single policy source for frontend motion.

- `reducedMotion` is a live Angular signal backed by `matchMedia('(prefers-reduced-motion: reduce)')`.
- `qualityTier` is a signal with three values:
  - `high` for capable devices that do not match the mobile/coarse-pointer heuristic.
  - `medium` when `(max-width: 760px), (pointer: coarse)` matches.
  - `static` when `navigator.hardwareConcurrency <= 2` or `?bg=fallback` is present.
- Static conditions take precedence over medium conditions.
- Missing or zero `hardwareConcurrency` follows the existing conservative behavior by falling back to two cores.
- Reduced motion does not rewrite `qualityTier`; consumers combine the independent accessibility and capability signals according to their needs.
- The service exposes the imported GSAP singleton and ScrollTrigger. ScrollTrigger is registered at module scope behind an idempotent guard, replacing registration in `main.ts` and ensuring every consumer receives the same instance.

`BackgroundSceneService` injects `MotionService`. A `static` quality tier produces its existing fallback scene mode. A `medium` tier remains eligible for WebGL but can continue using the current particle configuration in this sprint, avoiding a visual change. The existing `?bg=no-webgl` and runtime WebGL checks remain local to the background service. Background pointer animation uses the shared GSAP instance.

## Smooth Scrolling

`LenisService` is a root injectable whose lifecycle is explicitly attached to the authenticated application layout.

`AppLayoutComponent` marks its `.workspace` section as the main scrolling wrapper, provides the element to `LenisService` after view initialization, and destroys the Lenis attachment when the layout is destroyed. The wrapper receives the minimal height and overflow rules required to own scrolling while retaining its current padding, gaps, and responsive layout.

The service creates Lenis only when reduced motion is false and the quality tier is not `static`. It reacts to live reduced-motion changes by destroying or recreating Lenis without remounting the page. A static tier never starts Lenis.

When active:

- `lenis.on('scroll', ScrollTrigger.update)` keeps scroll-linked GSAP work synchronized.
- A single GSAP ticker callback advances Lenis using milliseconds converted from GSAP ticker seconds.
- GSAP lag smoothing is disabled for the Lenis clock integration.
- Teardown removes the ticker callback, detaches the Lenis scroll handler, and destroys Lenis.

Lenis configuration preserves native keyboard scrolling and does not intercept nested scrollable regions. Focus changes remain browser-driven so `element.focus()` and focus-into-view behavior continue working. The service does not write to `body` or `html` overflow styles, so existing drawer and modal scroll locks retain ownership of overflow state. When Lenis is disabled or destroyed, the wrapper remains a normal native scroll container.

## Motion Tokens

The existing motion section in `frontend/src/styles/tokens.css` gains these tokens without altering or replacing any current token:

- `--dur-micro: 120ms`
- `--dur-enter: 320ms`
- `--dur-scene: 700ms`
- `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`
- `--ease-spring`: a CSS `linear()` approximation that settles over roughly 1.2 seconds and peaks no more than four percent beyond its destination.

## Reveal Directive

`RevealDirective` is a standalone attribute directive with selector `[tcqReveal]`. It accepts an optional numeric stagger delay through the `tcqReveal` input, interpreted in seconds for direct compatibility with GSAP.

Content remains visible in server-rendered or JavaScript-disabled markup because no global CSS selector hides reveal targets. During directive initialization:

1. If reduced motion is active, the directive does not set opacity or transform and does not create an observer.
2. Otherwise, the directive immediately prepares only its host element with `opacity: 0` and `translateY(12px)` using shared GSAP state-setting.
3. An `IntersectionObserver` watches the host.
4. On first intersection, shared GSAP animates opacity to one and vertical translation to zero using `--dur-enter`/`--ease-out-expo`-equivalent values and the optional input delay.
5. Completion clears inline opacity and transform, and the observer disconnects.
6. Destruction disconnects the observer and kills any active tween. If destruction occurs before reveal, inline hiding styles are cleared.

If `IntersectionObserver` is unavailable, the directive leaves or restores the host to its visible state rather than hiding content indefinitely.

## Testing

Tests follow the repository's Angular TestBed and Jasmine patterns.

`motion.service.spec.ts` verifies:

- capable desktop devices select `high`;
- mobile/coarse-pointer devices select `medium`;
- two-core devices select `static` even when the mobile query is false;
- `?bg=fallback` selects `static` regardless of other heuristics;
- reduced-motion media-query changes update the signal live;
- repeated service injection exposes the same GSAP and ScrollTrigger instances.

`reveal.directive.spec.ts` uses a standalone host component and a controllable IntersectionObserver test double. It verifies that:

- the host starts visible before Angular initializes the directive;
- reduced motion leaves opacity and transform unset and creates no observer;
- normal motion hides the host only after directive initialization;
- intersection reveals the host and disconnects observation;
- lack of IntersectionObserver cannot leave content hidden.

Lenis integration is kept small and exercised through build/type checking plus focused service tests if needed to validate lifecycle cleanup. The final acceptance gate runs `npm --prefix frontend run build` and `npm --prefix frontend test`.

## Error Handling and Lifecycle

All browser-only APIs are accessed defensively so Angular tests can supply controlled fakes. Event listeners, observers, GSAP ticker callbacks, tweens, and Lenis instances are released through Angular destruction hooks. A failed optional browser capability falls back to visible content and native scrolling.

## Non-Goals

- No existing page receives `[tcqReveal]` in this sprint.
- No existing page entrance, drawer, sidebar, table, or background animation is visually redesigned.
- No background particle-count tuning is introduced for the medium tier.
- No backend files or dependencies are changed.
