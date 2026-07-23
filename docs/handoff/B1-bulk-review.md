# Handoff — Sprint B1: Bulk Review Operations

**Branch:** `feat/B1-bulk-review` · **Depends on:** none · **Migration:** none

## Objective
The review board is strictly one-case-at-a-time (keyboard `A` to approve a single selected case).
Add **multi-select + bulk actions + filters** so a reviewer can, e.g., approve all HIGH-confidence
cases in one action — without losing the existing single-case keyboard flow.

## Grounded context — read these first
- `backend/.../review/service/TestCaseReviewService.java` — per-case updates + `addReviewEvent`;
  note the existing guard that `ReviewStatus.EXPORTED` cannot be set manually.
- `backend/.../review/controller/TestCaseReviewController.java`.
- `backend/.../domain/repository/TestCaseRepository.java` — has `countByReviewStatus`,
  `findByTitleContainingIgnoreCase`.
- `frontend/src/app/pages/review-board/review-board-page.component.ts` (~529 lines; single-select
  keyboard flow with `approveSelected()`, `pendingAction` signal).

## Backend tasks
1. **DTOs** `review/dto/`:
   ```java
   public enum BulkOp { SET_STATUS, SET_PRIORITY, SET_RISK, SET_AUTOMATION }
   public record BulkReviewRequest(@NotEmpty List<UUID> testCaseIds, @NotNull BulkOp op,
       ReviewStatus status, Priority priority, RiskLevel risk, Boolean automationCandidate,
       @Size(max=2000) String comment) {}
   public record BulkReviewResult(int updated, List<UUID> failed) {}
   ```
2. **Service** `TestCaseReviewService.bulkUpdate(BulkReviewRequest req, String actor)`:
   - `@Transactional`. Load via `findAllById`. For each case apply the op; reuse existing single-field
     mutation logic and `addReviewEvent` (one event per case). Reject `SET_STATUS` with `EXPORTED`
     (reuse the existing guard message). Collect ids that fail validation into `failed`; still commit
     the successful ones. Return counts.
   - Validate the op-specific field is present (e.g. `SET_STATUS` requires `status`).
3. **Endpoint** in `TestCaseReviewController`:
   ```java
   @PatchMapping("/api/test-cases/bulk")  // ADMIN/QA — NOTE: mount OUTSIDE the /{testCaseId} class
   ```
   Put this on a small new controller or ensure the path doesn't collide with `/{testCaseId}`
   mappings (a literal `bulk` must not be captured as an id). Audit one aggregate
   `TEST_CASE_STATUS_CHANGED` with metadata `{count, op}`.

## Frontend tasks
- `core/services/review.service.ts`: `bulkUpdate(req)`.
- Review board:
  - Add per-row checkboxes and a header "select all / select all HIGH-confidence" control.
  - A sticky **bulk-action bar** (visible when ≥1 selected): Approve, Reject (reason), Set priority,
    Set risk, Toggle automation. Calls `bulkUpdate`, then refreshes and reports `updated/failed`
    via the toast service.
  - **New** reusable `shared/components/review-filters.component.ts`: filter by confidence
    (HIGH/MED/LOW), risk, review status, automation candidate. Apply client-side to the loaded suite.
  - Preserve the existing single-select keyboard approve/reject entirely.

## Tests
- `TestCaseReviewServiceTest`: bulk approve updates all + one event each; `EXPORTED`→ that id in
  `failed`; missing op field→ failure; partial success commits the rest.
- `TestCaseReviewControllerTest`: PATCH /bulk 200; VIEWER→403; `bulk` not treated as a UUID id.
- `review.service.spec.ts`: body/URL.
- Component spec: "select all HIGH-confidence" selects the right rows; filter predicate.
- Playwright e2e: select-all-high-confidence → Approve → counts update.

## Acceptance criteria
- Bulk approve/reject/set works with partial-failure reporting.
- Filters narrow the visible cases.
- Single-case keyboard flow unchanged.

## PR
Title: `feat(review): B1 — bulk review actions and filters`.
