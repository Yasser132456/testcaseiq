# Handoff — Sprint D1: Test Execution & Run Tracking  ⚠️ DECISION-GATED

**Branch:** `feat/D1-test-runs` · **Depends on:** A–C shipped · **Migration:** `V14__create_test_runs.sql`
(claim the next free V-number)

## ⚠️ Read before starting
This is a **module (2–3 sprints of work), not a single sprint**, and it changes what TestCaseIQ *is*:
from a generation/review tool into a full QA-lifecycle platform. **Do not start until the product
owner confirms that direction.** Ship and validate A–C first. If green-lit, this file scopes the
first slice (manual execution + results + basic flakiness); automation-runner integration is a
later slice.

## Objective
Let users execute an approved suite and record per-case results, keep run history, and show basic
flakiness (fail rate across runs).

## Grounded context — read these first
- `backend/.../domain/model/{TestSuite,TestCase}.java` and `AuditableEntity`.
- Existing keyboard review flow in `review-board-page.component.ts` (mirror its ergonomics for a
  "run execution" view).
- Dashboard attention response from B2 (add a pass-rate point).

## Backend tasks
1. **Enums** `domain/enums/`: `RunStatus{IN_PROGRESS,COMPLETED,ABORTED}`,
   `RunResultStatus{PASS,FAIL,BLOCKED,SKIPPED,UNTESTED}`.
2. **Entities** (extend `AuditableEntity`):
   ```java
   TestRun { @ManyToOne TestSuite suite; String name; RunStatus status;
             String executedBy; Instant startedAt; Instant completedAt; }
   TestRunResult { @ManyToOne TestRun run; @ManyToOne TestCase testCase;
                   RunResultStatus result; String notes; String executedBy; Instant executedAt; }
   ```
3. **Migration** `V14__create_test_runs.sql`: `test_runs` and `test_run_results` tables with FKs to
   `test_suites(id)` and `test_cases(id)` (`on delete cascade`), timestamps, enum varchar columns.
4. **Repositories**: `TestRunRepository`, `TestRunResultRepository`
   (`findByRunId`, `findByTestCaseIdOrderByExecutedAtDesc` for flakiness).
5. **DTOs** `api/run/dto/`: `RunResponse`, `RunResultRequest(RunResultStatus result, String notes)`,
   `RunDetailResponse(runId, suiteId, status, List<RunResultResponse>)`,
   `FlakinessSummary(UUID caseId, int runs, double failRate)`.
6. **Service** `api/run/TestRunService.java`: `startRun(suiteId, name, actor)` (creates UNTESTED
   results for each case), `recordResult(runId, caseId, request, actor)` (idempotent upsert),
   `getRun(runId)`, `listRuns(suiteId)`, `flakiness(caseId)`.
7. **Endpoints** `api/run/TestRunController.java`:
   ```java
   @PostMapping("/api/test-suites/{id}/runs")            // ADMIN/QA — start
   @GetMapping ("/api/test-suites/{id}/runs")            // VIEWER+ — history
   @GetMapping ("/api/runs/{runId}")                     // VIEWER+ — detail
   @PatchMapping("/api/runs/{runId}/results/{caseId}")   // ADMIN/QA — record result
   ```
   Audit `TEST_RUN_STARTED`, `TEST_RUN_RESULT_RECORDED` (add enum constants).

## Frontend tasks
- `core/services/test-run.service.ts` + models.
- **Run execution view**: per-case PASS/FAIL/BLOCKED/SKIPPED with a keyboard flow mirroring the review
  board; progress indicator; notes per case.
- **Run history** on the suite; **flakiness badges** on cases (fail rate across last N runs).
- Dashboard: pass-rate trend point (extend B2's `AttentionResponse`/throughput).

## Tests
- `TestRunServiceTest`: start seeds UNTESTED results; recordResult idempotent; run completion;
  flakiness math (fails/total).
- `TestRunControllerTest`: lifecycle 200s; VIEWER cannot record (403).
- Frontend service + component specs; Playwright e2e: start run → record mixed results → history +
  flakiness reflect them.

## Acceptance criteria
- A suite can be executed, results recorded, and history/flakiness shown.
- Dashboard reflects pass-rate.

## PR
Title: `feat(runs): D1 — manual test execution and run tracking (slice 1)`.
Follow-up slices: automation-runner ingestion, CI result import, per-environment runs.
