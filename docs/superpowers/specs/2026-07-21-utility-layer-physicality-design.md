# Utility Layer Physicality Design

## Goal

Bring the shared utility layer into the same black-glass instrument motion language as the rest of TestCaseIQ without changing focus traps, Escape behavior, screen-reader announcements, navigation semantics, or the `--z-*` scale.

## Architecture

Use CSS and the existing design tokens for deterministic visual states, native View Transitions for the search-trigger morph and route handoff, and the existing Angular component state for lifecycle boundaries. Add only the minimal parent-layout wiring required to connect the search trigger to the modal and restore focus after non-navigation closes.

Shared motion primitives belong in `frontend/src/styles/` when multiple components consume them. Component-specific structure and timing stay beside the component. Reduced motion is handled both by CSS media queries and, where JavaScript controls lifecycle timing, the existing `matchMedia('(prefers-reduced-motion: reduce)')` checks.

## Search Modal

- The top-bar search trigger and modal panel participate in a native same-document View Transition during open. The trigger is the old shared element and the panel is the new shared element.
- The backdrop uses a registered custom blur property that interpolates from `0px` to `8px`. The panel settles from `scale(0.96)` over `240ms` with `--ease-out-expo`.
- Result rows reveal at `30ms` intervals. Delays are capped so the final row begins no later than `300ms` after the sequence starts.
- The active result uses the phosphor background and glow ring. Its active/highlight properties have no transition, so arrow-key movement remains immediate. Entrance animation remains independent from selection state.
- Enter continues through the existing selection path. The overlay closes before `Router.navigateByUrl`, allowing the existing Angular/Sprint 4 route View Transition to own the destination transition rather than nesting competing transitions.
- Closing without navigation restores focus to the opening search trigger. Tab wrapping, Escape handling, dialog roles, labels, and live-region text remain unchanged.

## Notification Center

- The popover panel enters from the right over `240ms` using `--ease-out-expo`.
- Notification rows form the second parallax layer and trail the panel by `60ms`; their internal stagger remains short and capped.
- An unread badge introduction emits one soft phosphor ping animation with exactly two iterations, then holds its current static badge appearance. Polling updates do not create an infinite animation.
- Popover semantics, loading announcements, and the existing unread-count behavior remain unchanged.

## Shared Buttons

- All supported variants receive a pseudo-element press ring. On active press, a one-pixel inner ring contracts over `--dur-micro`.
- Primary buttons alone receive a phosphor charge affordance: the hover glow builds over `180ms`.
- Pending state locks the rendered button width before replacing the visible label. Projected content crossfades out while a three-dot phosphor shimmer crossfades in. The accessible name remains supplied by the projected content; the dots are `aria-hidden`, and `aria-busy` remains on the native button.
- Secondary and danger retain their existing hover/focus behavior plus the press ring. Other semantic variants retain existing behavior and may share the same neutral press ring without gaining the primary charge glow.
- Reduced motion removes crossfade and shimmer animation while preserving a visible static three-dot pending indicator.

## Drawer

- Existing open/close signals, close timer, Escape listener, initial focus, and focus restoration remain intact.
- Entrance changes to a `280ms` `expo.out` slide. Exit remains lifecycle-coordinated so the drawer stays mounted until completion.
- The backdrop blur ramps from `0px` to `8px` alongside opacity.
- Header and body are explicit reveal children. They stagger using the same `tcqReveal` visual contract—small vertical offset, opacity, expo easing—without invoking IntersectionObserver inside a modal surface.
- Reduced motion skips GSAP and all delay, leaving open and close synchronous/static.

## Skeletons

- Skeleton cells use a diagonal phosphor-tinted sweep.
- Every visible skeleton uses the same keyframe name, duration, timing function, and zero animation delay. CSS animations with identical parameters share the document animation clock, producing synchronized phases without per-element randomness or JavaScript.
- Search and notification loading placeholders consume the same visual primitive or matching shared declarations so utility loading states remain synchronized.
- Reduced motion displays a static phosphor-tinted fill with no sweep.

## Keyboard Shortcuts

- The overlay uses the same registered `0px` to `8px` backdrop blur and `scale(0.96)`/`240ms` expo panel entrance as search.
- Key labels become small layered glass keycaps with a lower edge, subtle highlight, and an active press-down state. Press feedback is immediate and returns over `--dur-micro`.
- Existing `?` activation, form-field suppression, Escape behavior, dialog semantics, and z-index remain unchanged.
- Reduced motion opens and closes instantly and removes keycap displacement.

## Accessibility and Focus

- Do not change existing `role`, `aria-modal`, `aria-label`, `aria-live`, or `aria-busy` strings.
- Preserve search Tab wrapping and Escape behavior.
- Store the actual search trigger element when opening and restore focus after Escape, backdrop, or close-button dismissal. Do not restore focus when Enter initiates navigation.
- Native View Transitions are progressive enhancement. When unsupported, components use their CSS entrance. Under reduced motion, both native transition pseudo-elements and component animations are disabled.

## Testing

- Add or update unit tests for search focus restoration and navigation handoff, instant active-row selection, button pending markup and width-lock state, drawer timing/selectors, keyboard-shortcut keycaps and reduced-motion path, and finite unread-ping markup/state where component behavior is involved.
- Keep accessibility assertions tied to existing labels and roles so announcement text cannot drift.
- Run `npm --prefix frontend run build` and `npm --prefix frontend test`.
- Run `npm --prefix frontend run e2e` against the configured application. Verify the palette opens, cycles focus without loss, and Escape restores focus to the trigger.

## Scope

Primary implementation targets are the six requested shared components plus `frontend/src/styles/`. `frontend/src/app/layout/app-layout.component.ts` is included only for the search-trigger View Transition bridge and focus restoration. No unrelated page styling, focus-management refactor, routing redesign, z-index change, or new dependency is included.
