# Task 5 report: deterministic visual regression coverage

## Scope

- Configured Playwright output under `frontend/test-results` and snapshots under `frontend/e2e/__screenshots__/{testFilePath}`.
- Added root ignore handling for root/frontend Playwright results and reports, with an explicit baseline unignore.
- Added six deterministic 1440x1000 Chromium captures using the Task 4 quality fixtures and static distribution server:
  - `welcome-static.png`
  - `dashboard-pipeline.png`
  - `story-detail.png`
  - `story-detail-analyzing.png`
  - `review-board-idle.png`
  - `search-modal-open.png`
- Every capture asserts the `bg=fallback` query parameter and reduced-motion media state. Dates use Playwright's deterministic clock with `en-US` locale and `Africa/Tunis` timezone pinned in Playwright configuration; CSS motion is disabled at document initialization; screenshot animations and carets are disabled.
- Authenticated visual tests use fixture-only token installation and do not request Playwright's `APIRequestContext`. Browser request tracking fails the suite if `/api/auth/register` or `/api/auth/login` is issued.
- No screenshot masks were needed because the captured data and browser state are deterministic.

## State ownership decision

`ReviewBoardPageComponent` has no analyzing state or demo transition. The deterministic in-flight AI state belongs to `StoryDetailPageComponent` (`data-ai-state="analysis"`). The conditional capture is therefore named `story-detail-analyzing.png`; `review-board-idle.png` covers the real review board card state. This keeps six baselines without adding a product-only test state or mislabeling the page owner.

## RED evidence

The initial non-update run reached five screenshot assertions and failed because their snapshots did not exist. Search initially failed readiness because directly fixing `Date.now()` prevented the RxJS debounce scheduler from observing elapsed time.

The clock setup was corrected to `page.clock.install({ time })`, which advances deterministically while timers run. A focused search rerun then reached its screenshot assertion and failed only because `search-modal-open.png` did not exist. All six captures therefore demonstrated missing-baseline RED behavior before generation.

## Baseline generation and inspection

The development distribution was rebuilt and served with `frontend/scripts/serve-dist.mjs` at `http://127.0.0.1:4200`.

```text
npm.cmd run build -- --configuration development
Application bundle generation complete. exit 0

npm.cmd run e2e:visual -- --workers=1 --update-snapshots
6 passed (43.7s)
```

All six baseline PNGs were inspected individually at original resolution. Each is 1440x1000 and shows its intended mounted state without skeletons, clipped primary content, caret artifacts, or unintended loading state. The analyzing baseline visibly contains the story analysis panel, `Analyzing...` status, deterministic 0s progress text, and operation toast. Search visibly contains all four deterministic fixture result groups.

## Fresh verification

```text
npm.cmd run e2e:visual -- --workers=1
6 passed (39.8s)

npx.cmd tsc --ignoreConfig --noEmit --strict --target ES2022 --module ES2022 \
  --moduleResolution bundler --skipLibCheck --types node \
  e2e/visual-regression.spec.ts playwright.config.ts
exit 0

git diff --check
exit 0
```

Ignore checks confirmed root/frontend `test-results` and `playwright-report` paths are ignored. The committed `frontend/e2e/__screenshots__` PNGs are not ignored, and no generated result/report artifact is included in Task 5 scope.

## Remaining concerns

- The deterministic analyzing capture uses a test-owned pending `/analyze` response and releases it after the screenshot. It exercises the real Story Detail UI state without a production feature or test-only product hook.

## Review hardening follow-up

The review pass pinned locale and timezone at the Playwright context level and split visual authentication from the existing backend-first quality auth path.

RED evidence:

- The effective project configuration assertion received `undefined` for locale before `locale: 'en-US'` and `timezoneId: 'Africa/Tunis'` were added.
- After the visual suite was changed to its desired fixture-only API, strict TypeScript failed with `TS2724` because `authenticateQualityUserFromFixture` did not exist. The minimal helper was then added without changing `authenticateQualityUser`, which accessibility and full quality E2E tests continue to use.

Follow-up verification:

```text
npm.cmd run e2e:visual -- --workers=1 --update-snapshots
6 passed (24.2s)

npm.cmd run e2e:visual -- --workers=1
6 passed (27.6s)

npm.cmd run e2e:a11y -- --workers=1 --grep "dashboard has no serious"
1 passed (13.8s)
```

All six baselines were regenerated under the pinned context. Their SHA-256 hashes were unchanged, so no baseline image changed and no additional visual variance was introduced. The focused accessibility route proves the existing backend-first auth helper remains active and functional outside the visual suite.
