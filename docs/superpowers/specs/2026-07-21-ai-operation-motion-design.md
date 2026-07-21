# AI Operation Motion Design

## Purpose

Make analysis, test generation, review verdicts, and toast lifecycles feel like physical events while preserving a strict one-to-one relationship between visible motion and real asynchronous application state.

## State ownership

`AnalysisService`, `TestGenerationService`, and `ReviewService` own typed lifecycle signals. An operation state records `idle`, `running`, `success`, or `error` together with the operation identity needed by consumers, such as a story ID, test-case ID, or review verdict. Request Observables set `running` on subscription and settle to `success` or `error` from the actual HTTP response. Page components derive visual classes and accessibility announcements from these signals rather than maintaining an independent animation state.

Success and error remain observable states until the next operation begins. Their animations are one-shot CSS or GSAP sequences, so no element continues moving after settlement. Initial data-loading requests do not trigger AI operation motion.

## Analysis and generation surfaces

Create `frontend/src/styles/ai-states.css` and import it through the global stylesheet. The reusable state utilities provide:

- `.is-analyzing`: a two-pixel phosphor-violet scanline sweeping top-to-bottom every 1.4 seconds with the shared `--ease-in-out` token, plus a low-amplitude violet border pulse.
- `.is-generating`: the same physical pattern using cyan tokens.
- Success modifiers: a brief edge flash with no retained animation.
- Error modifiers: one red border pulse followed by the static `--color-red-border` token.

The story detail page applies these classes only when the corresponding service signal is in that phase. Running panels expose `aria-busy="true"` and a `role="status"` label of “Analyzing...” or “Generating...”. Analysis success reveals the result groups with the existing `tcqReveal` directive and stagger values.

The generated-test-cases tab tracks which rows were already present. Rows produced by a successful generation operation are admitted into the rendered set one at a time. The delay is `min(40ms, 600ms / max(rowCount - 1, 1))`, ensuring a maximum 40 ms stagger and a maximum 600 ms total stream. Each admitted row starts eight pixels low and resolves to its resting position. Pre-existing rows and initial page loads do not animate.

## Background scene tie-in

`BackgroundSceneService` gains a temporary operation-accent override distinct from the route accent. While analysis or generation is `running`, the story page requests a violet or cyan override respectively. The scene applies an approximately ten-percent pulse to the relevant color contribution only when `MotionService.qualityTier()` is `high` and reduced motion is not requested. Success, error, cancellation, and component destruction restore the route-derived accent. Medium and static tiers do not start this pulse.

## Review verdict choreography

The review board and inline story review use optimistic local state. Invoking approve or reject immediately updates or removes the selected case in the Angular view and starts the HTTP request; animation completion never gates that update.

Before the optimistic change, the component captures list geometry and a lightweight visual clone of the affected card. After Angular renders the new list, GSAP FLIP moves the remaining cards from their captured positions to their new positions.

- Approve: the visual clone charges its border green, updates its status pill to Approved, then settles through scale `1 -> 1.015 -> 1`.
- Reject: the visual clone updates its status pill to Rejected, desaturates, translates down 12 pixels, and fades.

Each sequence completes in at most 450 ms and then removes its clone. Reduced motion skips cloning and FLIP and performs only the immediate state swap. On request failure, the prior case data and selection are restored, the service enters `error`, and the rollback is announced. Request success confirms the optimistic data without replaying the verdict.

## Toasts

Toast entrance uses a short bottom-right spring with slight overshoot. Exit fades and scales down before the existing service removes the toast. Reduced motion removes both transitions.

`ToastItem` gains an explicit progress state. Only toasts created as progress toasts render an indeterminate phosphor shimmer bar, so ordinary informational toasts never animate continuously. The toast container retains its polite live region.

## Accessibility and reduced motion

All running states have readable text, `role="status"`, and appropriate `aria-busy` values. Existing live regions announce review success and failure; the inline review tab receives an equivalent atomic polite live region. Error borders are never the sole error indication.

Under `prefers-reduced-motion: reduce`, scanlines, border pulses, row streaming, scene pulses, verdict choreography, FLIP, and toast transforms are disabled. Analysis and generation retain their labeled colored-border state; verdicts become immediate swaps.

## Testing and verification

Development follows test-first cycles. Service specs verify running, success, and error transitions. Component specs verify state classes, labels, row admission timing, optimistic review verdicts, rollback, and reduced-motion behavior. The story review tab specification is extended explicitly for approve and reject states.

Final verification runs:

```text
npm --prefix frontend run build
npm --prefix frontend test -- --watch=false
npm --prefix frontend run e2e
```

The documented backend mock/demo mode is sufficient for manual and end-to-end exercise of the states.
