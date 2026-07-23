# Handoff — Sprint B3: Approved-Only Export + Export History

**Branch:** `feat/B3-export-governance` · **Depends on:** none · **Migration:** none

## Objective
Exports currently ship every case regardless of review status and are fire-and-forget. Add an
**"approved only"** option and a persisted, viewable **export history** (the `export_jobs` table and
`ExportStatus` enum already exist and have a `jsonb export_details_json` column for scope/count/actor).

## Grounded context — read these first
- `backend/.../export/service/ExportService.java` — `exportStory(storyId, format)` and
  `exportTestSuite(...)`, already `@Transactional`, already imports `ApprovedTestCaseExport` and
  `ReviewStatus`, and already injects `ExportJobRepository`. Check whether it already writes a job row.
- `backend/.../export/controller/ExportController.java` — 12 GET endpoints (story + suite × formats).
- `backend/.../domain/model/ExportJob.java` — `story`, `exportType`, `status`, `exportDetailsJson`,
  `errorMessage`. Story-scoped; for suite exports use `suite.getStory()`.
- `backend/.../domain/repository/ExportJobRepository.java`.

## Backend tasks
1. **Filter**: add `boolean approvedOnly` to `exportStory`/`exportTestSuite` (overload or param).
   When true, include only cases with `reviewStatus == APPROVED`. If that leaves zero cases, return a
   valid-but-empty export (do not 500).
2. **Persist a job** on every export: set `exportType=format.name()`, `status=ExportStatus.COMPLETED`,
   and `exportDetailsJson` = JSON of `{scopeType, scopeId, approvedOnly, caseCount, actor}` (serialize
   with the injected `ObjectMapper`). Actor from the authenticated principal — thread it down from the
   controller.
3. **Controller**: add `@RequestParam(defaultValue="false") boolean approvedOnly` to all export
   endpoints; pass through. Keep existing audit `TESTS_EXPORTED` and add `approvedOnly` to metadata.
4. **History DTO + endpoint** `export/dto/ExportJobResponse(UUID id, String exportType, ExportStatus
   status, String scopeType, UUID scopeId, boolean approvedOnly, int caseCount, String actor,
   Instant createdAt)` and:
   ```java
   @GetMapping("/api/exports")  // ADMIN/QA/VIEWER — params: projectId?, page, size
   Page<ExportJobResponse> listExports(...)
   ```
   Repository: `findByStory_Project_IdOrderByCreatedAtDesc(UUID projectId, Pageable)` and a no-filter
   variant.
5. **Optional, flag-gated** (`app.export.mark-exported=false` default): when a full **approved** export
   of a suite/story runs, set those cases → `ReviewStatus.EXPORTED` and the story →
   `StoryStatus.EXPORTED`. This activates the currently-unused terminal states. Guard behind the flag
   so it can't surprise existing flows.

## Frontend tasks
- `core/services/export.service.ts`: pass `approvedOnly`; add `listExports(projectId?, page)`.
- Export page: an **"Approved only"** toggle applied to all download buttons, and an
  **export-history table** (when / format / scope / count / actor) with re-download links.

## Tests
- `ExportServiceTest`: approvedOnly filters non-APPROVED; empty-approved yields empty doc not error;
  a job row is written with correct details JSON.
- `ExportControllerTest`: `approvedOnly=true` path; `/api/exports` pagination; VIEWER allowed.
- `export.service.spec.ts`: params + history URL.

## Acceptance criteria
- Any export can be limited to approved cases.
- Every export is recorded and visible in history.
- (If flag on) full approved export advances cases/story to EXPORTED.

## PR
Title: `feat(export): B3 — approved-only export and export history`.
