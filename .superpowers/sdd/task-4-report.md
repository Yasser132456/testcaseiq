# Task 4 report: deterministic accessibility quality coverage

## Scope

- Added `@axe-core/playwright` as a frontend development dependency.
- Added reusable deterministic route fixtures for dashboard, projects/stories, story detail and AI data, test suites/review board, settings, notifications, search, and auth profile responses.
- Added the stable IDs `project-quality`, `story-quality`, `suite-quality`, and `case-quality`.
- Added axe sweeps for `/`, `/login`, `/dashboard`, `/stories`, `/stories/story-quality`, `/review-board`, and `/settings`.
- Added focused focus-visible and AI/search live-region assertions.

## Environment evidence

- Initial probes of `http://localhost:4200` and `http://localhost:8080` timed out.
- `Get-NetTCPConnection` confirmed that neither port had an existing listener before local startup.
- The frontend was started once and served successfully on `http://127.0.0.1:4200`.
- Backend startup was attempted once and stopped with PostgreSQL `SQLSTATE 28P01`: the existing local volume's `testcaseiq` password does not match the repository default. The database and its volume were not changed or recreated.
- Quality tests therefore used the normal auth API contract with a bounded real-backend attempt and deterministic `/api/auth/register` fallback, while all page data remained route-mocked.

## RED evidence

Initial axe command:

```text
npm.cmd run e2e:a11y
7 passed (1.9m)
```

The initial scan produced no serious or critical axe violations on the seven required routes.

Focused dynamic tests then established these failures before implementation changes:

- AI error phase: expected `role="alert"`, received `role="status"`; it also used `aria-live="polite"` instead of `assertive`.
- AI generation error phase independently failed with the same `role="status"`/`aria-live="polite"` mismatch before the assertive fix was restored.
- Error `app-state-message`: used `role="alert"` with `aria-live="polite"`.
- Empty search results: had neither `role="status"` nor `aria-live="polite"`.
- Story list row: exposed no accessible story link/card action.
- Review card: had a 2 px outline with `outline-offset: -2px`.
- Search close button: its focus selector removed the outline.
- After adding the ring, reduced-motion's global `transition: all 0.001s` briefly exposed the user-agent 3 px/0-offset ring. Runtime style diagnostics confirmed the authored 2 px/+2 px rule matched but was still transitioning.

## GREEN implementation

- Error messages now use `role="alert"` and `aria-live="assertive"`; neutral, loading, success, and empty states use `role="status"` and `aria-live="polite"`.
- Analysis and generation failure phase announcements are assertive alerts.
- Search empty states are polite statuses.
- Story titles are real links that retain project navigation context and expose a 2 px ring with 2 px offset.
- Review cards now use a positive 2 px outline offset.
- Search close and result controls expose 2 px/+2 px rings; the close-ring transition is disabled so the ring geometry is immediate and deterministic.

Focused verification:

```text
npm.cmd run e2e:a11y -- --grep "AI loading|AI failures|empty search|focus ring"
7 passed (1.5m)
```

Fresh full verification:

```text
npm.cmd run e2e:a11y
14 passed (2.6m)
```

The generation-error regression was then independently verified RED/GREEN and passed in isolation after restoration (`1 passed`).

All seven axe scans have zero serious/critical violations. All explicit focus-visible and live-region assertions pass.

Targeted component verification:

```text
npm.cmd test -- --watch=false --browsers=ChromeHeadless \
  --include=src/app/shared/search-modal/search-modal.component.spec.ts \
  --include=src/app/pages/stories/story-detail-page.component.spec.ts \
  --include=src/app/pages/review-board/review-board-page.component.spec.ts
TOTAL: 20 SUCCESS
```

Production compilation:

```text
npm.cmd run build
exit 0
```

The build retains the repository's existing bundle/style budget warnings.

## Remaining environment concerns

- A real backend-backed E2E auth registration could not be re-verified locally because of the existing PostgreSQL password mismatch. The helper still prefers real registration/login when the backend is available and falls back only when it is unreachable.
- `npm install` reported 13 dependency-audit findings (4 low, 8 high, 1 critical); dependency remediation was outside Task 4 scope.
