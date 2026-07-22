# Welcome Canvas Background Design

## Goal

Give the public welcome route a self-contained, frame-filling Canvas 2D dot-grid background inspired by the interaction technique of 21st.dev's Interactive Dot Grid Hero, while ensuring the shared Three.js background is never instantiated on that route again.

## Scope

- Add a standalone, `OnPush` Angular component at `frontend/src/app/pages/welcome/welcome-background.component.ts`.
- Render that component only from the welcome page.
- Gate the globally mounted shared background in `AppComponent` so it is absent when the normalized route is `/`.
- Preserve the shared background behavior on login, registration, development, and authenticated application routes.
- Keep the implementation native to Angular and Canvas 2D; add no React, shadcn, or new runtime dependency.

## Component Architecture

`WelcomeBackgroundComponent` owns one canvas and all of its rendering state. The host and canvas are fixed to the viewport at `inset: 0`, use `z-index: 0`, ignore pointer hit testing, and are hidden from assistive technology. Welcome navigation, content, and footer remain positioned at `z-index >= 1`.

The component injects `DOCUMENT`, `NgZone`, `PLATFORM_ID`, and `MotionService`. Browser-only setup runs after render. No canvas or browser API is accessed during server-side rendering.

`AppComponent` derives a small route-state signal from `Router.url` and `NavigationEnd`. It does not create `BackgroundSceneComponent` when the normalized URL is the welcome route. This gate is deliberately outside the welcome feature so the welcome page never imports, injects, configures, or disposes the shared scene service.

## Canvas Sizing and Grid

On setup and every `ResizeObserver` notification, the component reads the viewport dimensions from `document.documentElement.clientWidth/clientHeight`, with `window.innerWidth/innerHeight` as a fallback. It sets all four values explicitly:

- `canvas.width = round(viewportWidth * devicePixelRatio)`
- `canvas.height = round(viewportHeight * devicePixelRatio)`
- `canvas.style.width = viewportWidth + 'px'`
- `canvas.style.height = viewportHeight + 'px'`

The context transform maps drawing operations back to CSS pixels. Grid points are regenerated to cover the complete viewport edge-to-edge with a consistent spacing and centered outer margins. A resize always draws immediately, including in static modes.

## Visual Treatment

The component reads `--color-phosphor-particle`, `--color-cyan-particle`, and `--color-violet-particle` from `getComputedStyle(document.documentElement)`, with explicit CSS-color fallbacks. Cyan and violet provide a low-alpha deterministic base field. A phosphor overlay grows in radius and opacity with each dot's eased influence, making hot dots visibly converge toward phosphor without requiring color parsing.

The host supplies a dark token-based background with restrained radial accents so a static frame remains legible as an instrument rather than a black void. The welcome hero copy gets a localized dark scrim that preserves text contrast without obscuring the full grid.

## Motion Policy

`MotionService` remains the sole policy source:

- `qualityTier() === 'high'`, `motionEnabled()`, and a visible document enable the animation loop.
- `qualityTier() === 'medium'` draws one static grid frame and attaches no cursor field.
- `qualityTier() === 'static'`, `reducedMotion()`, or `forcedFallback()` draws one faint static frame and schedules no animation frame.
- `cursorEffectsEnabled()` is the only condition that permits the document-level `pointermove` and `pointerleave` listeners.

The rAF loop is created inside `NgZone.runOutsideAngular`. Pointer coordinates are stored in CSS pixels. Each dot computes a radial target influence with smooth falloff inside the interaction radius. Its current influence approaches that target using exponential smoothing based on elapsed time, producing a fast spring-like return with no overshoot or bounce.

When the document becomes hidden, the running frame is cancelled. If visibility returns and the current policy still permits high-quality animation, the loop resumes. Policy changes reconcile listeners and animation without recreating the component.

## Teardown

Destroying the component:

- cancels the outstanding animation frame;
- disconnects the `ResizeObserver`;
- removes pointer and visibility listeners/effects;
- destroys the policy effect; and
- clears retained canvas, context, grid, and pointer state.

No callback may draw or schedule another frame after destruction.

## Testing

Unit tests will establish the behavior before implementation:

1. A high-tier canvas sets its drawing buffer to viewport dimensions multiplied by DPR and sets matching CSS pixel dimensions.
2. A static-tier canvas renders once but never calls `requestAnimationFrame`.
3. Cursor listeners are attached only when `cursorEffectsEnabled()` is true.
4. Destroy disconnects resize observation, cancels a scheduled frame, and removes listeners.
5. `AppComponent` does not instantiate the shared background on `/` and does render it after navigation to a non-welcome route.

Existing welcome component tests will assert the new background element is present while the static content remains unchanged. Browser verification will cover 1440x900 edge-to-edge sizing, fallback and reduced-motion rendering, cursor response, text contrast, and the existing 50 ms long-task budget.

## Acceptance Mapping

- Native Angular Canvas 2D component: component architecture and dependency constraints.
- Exact DPR/CSS sizing and resize redraw: canvas sizing section.
- Token-derived cursor field with exponential return: visual treatment and motion policy sections.
- Medium/static/reduced/fallback policies: motion policy section.
- No shared welcome WebGL scene: `AppComponent` route gate and decoupled component boundary.
- Full cleanup: teardown section.
- Build, unit, e2e, and performance checks: testing section.
