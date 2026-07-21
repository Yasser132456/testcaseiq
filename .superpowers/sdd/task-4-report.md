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

## Review hardening follow-up

The review pass tightened the deterministic harness and added regression coverage for the fixture contracts themselves:

- Production model interfaces now type the auth, dashboard, story, project, generated-test, review, settings, notification, and search fixtures with `satisfies`.
- Dashboard activity now uses the real `timestamp`, `action`, and `resourceType` fields, and the route readiness check requires the rendered `Test Generation Requested` activity.
- Unknown `/api/**` calls return `501`, are recorded, and fail the test in `afterEach`; the harness includes a regression proving this behavior.
- Every axe route asserts meaningful route content and captures `pageerror` events before and during the scan.
- Focus checks reach controls through natural `Tab` navigation, require a non-transparent outline color, and verify at least 2 px width and +2 px offset.
- Dashboard pipeline/project links and story review items now expose authored 2 px/+2 px focus rings.
- Story analysis and generation failures expose one assertive error announcement instead of duplicate alerts.
- The Settings generation-mode select and maximum-test-cases input are associated with their visible labels.

Focused review RED evidence (`7` selected tests) produced `4 failed, 3 passed`:

- analysis and generation failures each exposed two alerts instead of one;
- a dashboard application control exposed only a 1 px outline;
- the story review item exposed `outline-offset: -2px`.

After the role-protected Settings route was exercised through the authenticated SPA flow, axe also caught two critical missing-name violations (`select-name` and `label`). Both passed after associating the controls with their visible labels. Direct role-route reload timing remains an auth-hydration concern; this task tests the normal hydrated signed-in flow and does not change the application guard.

The long-lived Angular development server degraded after repeated hot rebuilds and left navigation requests pending. A bounded, task-owned static SPA server (`frontend/scripts/serve-dist.mjs`) now serves the compiled bundle with index fallback, correct asset content types, path traversal protection, and no-store caching. All quality navigations use the lightweight background fallback and reduced motion.

Final all-at-once accessibility verification on that stable host:

```text
npm.cmd run e2e:a11y -- --workers=1
15 passed (1.5m)
```

Targeted component verification for dashboard, Settings, story detail, story review, review board, and search modal:

```text
TOTAL: 54 SUCCESS
```

Additional verification:

```text
npx.cmd tsc --ignoreConfig --noEmit --strict --target ES2022 --module ES2022 \
  --moduleResolution bundler --skipLibCheck --types node e2e/support/quality-fixtures.ts
node.exe --check scripts/serve-dist.mjs
npx.cmd ng build --configuration development
```

All three passed. A fresh optimized production build could not inline Google Fonts because this environment could not resolve `fonts.googleapis.com` (`getaddrinfo ENOTFOUND`); the development bundle and targeted Angular test compilation both completed successfully with the current source.
