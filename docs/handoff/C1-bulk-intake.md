# Handoff — Sprint C1: Bulk & Integrated Story Intake

**Branch:** `feat/C1-bulk-intake` · **Depends on:** none · **Migration:** none

## Objective
Stories can only be created one at a time via text. Add **batch create** (JSON list), **CSV import
with a confirm-before-commit preview**, and a **flag-gated external-source stub** (the `externalReference`
field already exists but nothing consumes it) for a future Jira/Azure adapter.

## Grounded context — read these first
- `backend/.../story/StoryController.java` — existing `create`, `listForProject`.
- `backend/.../story/StoryCreateRequest.java` — `(title, rawText, type, externalReference, metadataJson)`
  with validation. Reuse it as the row unit.
- `backend/.../story/StoryService.java`.
- `frontend/src/app/pages/projects/project-detail-page.component.ts` and `core/services/story.service.ts`.

## Backend tasks
1. **DTOs** `api/story/`:
   ```java
   public record BatchStoryCreateRequest(@NotEmpty @Valid List<StoryCreateRequest> stories) {}
   public record RowError(int index, String message) {}
   public record BatchCreateResult(List<StoryResponse> created, List<RowError> errors) {}
   public record StoryImportRow(int index, StoryCreateRequest parsed, String error) {} // preview only
   ```
2. **Service** `StoryService`:
   - `createBatch(UUID projectId, List<StoryCreateRequest> rows)` — validate each row independently;
     create valid ones, collect `RowError` for invalid; `@Transactional` but do NOT roll back the
     whole batch on a single bad row (validate first, then persist the good ones).
   - `previewCsv(UUID projectId, MultipartFile file)` — parse CSV header
     `title,rawText,type,externalReference` → `List<StoryImportRow>` with per-row parse/validation
     errors; **does not persist**.
3. **Endpoints** `StoryController` (ADMIN/QA):
   ```java
   @PostMapping("/api/projects/{projectId}/stories/batch")  // body BatchStoryCreateRequest
   @PostMapping(value="/api/projects/{projectId}/stories/import", consumes="multipart/form-data") // preview
   ```
   Audit `STORY_CREATED` per created story (or one aggregate with count).
4. **External stub** (feature-flagged `app.intake.external.enabled=false`):
   interface `api/story/external/ExternalStorySource { List<StoryImportRow> fetch(String reference); }`
   + `MockExternalStorySource` returning deterministic rows, and
   `@PostMapping("/api/projects/{projectId}/stories/import/external")` guarded by the flag
   (404/disabled when off). Real Jira/Azure adapter is out of scope here.

## Frontend tasks
- `story.service.ts`: `createBatch(projectId, rows)`, `previewCsv(projectId, file)`.
- Project detail: **"Import stories"** action opening a modal with two modes:
  - Paste-multiple (one story per block / simple delimiter) → map to rows.
  - CSV upload → call preview → show a **preview table** with per-row error highlights → user confirms
    → call `createBatch` with the valid rows.
- Report created/failed counts via toast.

## Tests
- `StoryServiceTest`: batch with one invalid row creates the rest and returns its `RowError`;
  CSV preview maps columns and flags a malformed row without persisting.
- `StoryControllerTest`: batch 201/200; import preview 200; VIEWER→403.
- `story.service.spec.ts`: multipart + batch bodies.

## Acceptance criteria
- Import 20 stories from CSV with a validated preview before commit.
- Partial batches succeed with clear per-row errors.
- External stub is present but disabled by default.

## PR
Title: `feat(stories): C1 — batch create and CSV import with preview`.
