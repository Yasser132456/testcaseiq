# Welcome Earned Motion Design

## Goal

Make the first fold communicate TestCaseIQ's analyze, draft, and approve workflow through two deliberate motion moments while preserving an immediately complete static and reduced-motion experience.

## Architecture

Keep page-level orchestration in `WelcomePageComponent` and extract the review-gate demo into a standalone `WelcomeReviewGateComponent`. The page owns the one-time hero entrance, magnetic CTA binding, and existing one-shot reveal directive wiring. The instrument component owns its four-state timer and derives all pause and static behavior from `MotionService` signals.

No content is hidden by a boot-time CSS class. Hero elements render visibly, then GSAP applies initial hidden styles synchronously only when the entrance starts and `motionEnabled()` is true. Panel content remains in a fixed-size composition so state changes do not alter the first-fold layout.

## Hero Entrance

- Run once after the first browser render; do not connect it to scrolling.
- When motion is enabled, synchronously set headline lines to `clip-path: inset(0 0 100% 0)` and `translateY(110%)`, then reveal them with `power4.out` over roughly 720ms and a 60ms line stagger.
- In the same rehearsed sequence, reveal the system line, supporting copy, and CTA group from 12px below with opacity and a short stagger.
- Preserve the elements' normal layout throughout; animate only opacity, transform, and clip-path.
- When motion is disabled or reduced, do not apply hidden styles or transforms. The server/headless/default DOM remains complete and visible.

## Review Gate Instrument

The standalone panel cycles through `intake`, `analyzing`, `drafting`, and `approved` at approximately 2.2 seconds per state.

- `intake`: show “Story intake” and the failed-payment story.
- `analyzing`: set `data-ai-state="analysis"`, reuse the existing analyzing scanline vocabulary, and reveal the three result chips with a restrained stagger.
- `drafting`: set `data-ai-state="generation"` and reveal the Given/When/Then rows in cyan, one row at a time.
- `approved`: charge the decision row green and apply a small spring-like settle to the approval mark/text.

Use Transitions.dev's text-state swap, staggered text, and success-settle principles: enumerate transitioned properties, use the existing motion tokens where their documented usage matches, keep state changes short relative to the 2.2-second dwell, and include explicit reduced-motion guards.

An Angular signal stores the active state. An effect starts one timeout only when `motionEnabled()` is true and the document is visible. Hiding the tab clears the timeout and preserves the current state; returning starts a fresh dwell. Reduced motion, or a visible static motion tier, clears the timer and renders `approved`. Component destruction clears all scheduled work.

The animated panel is decorative and uses `aria-hidden="true"`. A separate visually hidden label exposes the complete meaning: “Review gate active — approved for export.” No cycling state is announced.

## Restrained Scroll Reveals

Reuse `tcqReveal` on only the four workflow cards and five format chips. Apply 40ms incremental delays within each group. Each directive instance observes once, disconnects on intersection, and leaves content untouched when IntersectionObserver or motion is unavailable. The hero and instrument panel never participate in scroll reveals.

## Magnetic CTAs

Retain the current pointer-driven `wl-magnetic` behavior with a maximum six-pixel translation and `--ease-spring` return. Pointer motion remains gated by `cursorEffectsEnabled()`. Keyboard focus applies the existing glow and outline; focus never changes the magnetic translation.

## Testing

- Add component tests with controlled Angular signals and fake time proving the instrument advances only while motion is enabled.
- Add a reduced-motion test proving the state is immediately and persistently `approved` with no cycling timer.
- Extend the welcome-page test to assert the extracted instrument, static assistive label, and reveal directive wiring.
- Verify the focused CTA glow/movement contract through DOM/CSS assertions where practical.
- Run the focused unit tests during development, then the complete frontend unit suite, production build, and Playwright e2e suite.

## Acceptance Constraints

- No entrance-related layout shift or default hidden content.
- No timer-driven DOM churn while the document is hidden or reduced motion is active.
- Above-the-fold storytelling covers intake/analyze, BDD drafting, and approval without scrolling.
- Motion uses compositor-friendly transform/opacity where possible; the scanline animates only its small pseudo-element.
- Reduced motion is fully static and complete at the approved state.
