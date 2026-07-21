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
- Every capture asserts the `bg=fallback` query parameter and reduced-motion media state. Dates use Playwright's deterministic clock; CSS motion is disabled at document initialization; screenshot animations and carets are disabled.
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
- The quality auth helper retains its bounded real-backend attempt before deterministic fallback, so authenticated visual cases can take several seconds when no backend is listening. This is inherited Task 4 behavior and does not affect screenshot determinism.
