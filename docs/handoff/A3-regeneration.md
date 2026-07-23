# Handoff — Sprint A3: Single-Case & Rejection-Driven Regeneration

**Branch:** `feat/A3-regeneration` · **Depends on:** A2 · **Migration:** none (reuse `ReviewEvent`)

## Objective
After generation, reviewers can only hand-edit. Add the ability to **regenerate a single test case**
(optionally triggered by a rejection with a reason), record a **before/after diff**, and finally give
`ReviewStatus.NEEDS_CLARIFICATION` a real workflow.

## Grounded context — read these first
- `backend/.../review/service/TestCaseReviewService.java` — `updateReviewStatus`, `addReviewEvent`.
- `backend/.../review/controller/TestCaseReviewController.java`.
- `backend/.../review/dto/TestCaseReviewStatusUpdateRequest.java`.
- `backend/.../ai/service/AiGenerationService.java` and `ai/provider/AiGenerationProvider.java`.
- `backend/.../domain/model/ReviewEvent.java` — `previousValue`/`newValue` are `text`; store JSON snapshots.
- `frontend/src/app/pages/stories/story-test-cases-tab.component.ts` and the review board.

## Backend tasks
1. **DTO** `review/dto/RegenerateRequest.java`:
   ```java
   public record RegenerateRequest(@NotBlank @Size(max=2000) String reason) {}
   ```
2. **Modify** `TestCaseReviewStatusUpdateRequest`: add `boolean regenerate` (default false via
   compact handling). In `updateReviewStatus`, require non-blank `comment` when status is
   `REJECTED` or `NEEDS_CLARIFICATION` (throw `BadRequestException` otherwise).
3. **Provider** `AiGenerationProvider`: add
   ```java
   default GeneratedTestCaseDto regenerateTestCase(RegenerateContext context) {
       throw new UnsupportedOperationException("regeneration not supported by " + providerName());
   }
   ```
   New DTO `ai/dto/RegenerateContext(UUID testCaseId, String storyTitle, String storyText,
   String currentTitle, String reason, List<ResolvedClarification> clarifications)`.
   Implement in `MockAiGenerationProvider` deterministically (e.g. append `" (revised: <reason-first-words>)"`
   to title, regenerate steps deterministically). Leave `OpenAiGenerationProvider` to call the model.
4. **Service** `AiGenerationService.regenerateTestCase(UUID testCaseId, String reason, String actor)`:
   - Load `TestCase` + parent `Story` (via `testCase.getTestSuite().getStory()`).
   - Build `RegenerateContext` (include ANSWERED clarifications).
   - Capture a **before** snapshot (title, description, expectedResult, steps) as JSON.
   - Apply the regenerated DTO: replace steps/testData/expectedResult/title/description; recompute
     `qualityScore`/`confidenceLevel` via `TestCaseQualityScoringService`. Keep the case id and
     current `reviewStatus`.
   - Capture **after** snapshot JSON.
   - Add a `ReviewEvent` `actionType="REGENERATED"`, `previousValue=<before json>`,
     `newValue=<after json>`, `comment=reason`, reviewer=actor.
   - Return `TestCaseResponse`.
5. **Endpoint** in `TestCaseReviewController`:
   ```java
   @PostMapping("/regenerate")  // path base is /api/test-cases/{testCaseId}; ADMIN/QA
   ```
   Audit `TEST_CASE_REGENERATED`. In `updateReviewStatus`, when `request.regenerate()` and status is
   REJECTED/NEEDS_CLARIFICATION, chain a regeneration after saving the status (reason = comment).
6. **Add** `TEST_CASE_REGENERATED` to `AuditAction`.

## Frontend tasks
- `core/services/review.service.ts` (or `test-generation.service.ts`): `regenerate(testCaseId, reason)`.
- Case detail: **Regenerate** button → reason prompt. Reject dialog gains a
  "Regenerate after reject" checkbox (requires a reason).
- **New** `shared/components/diff-view.component.ts`: given before/after step lists + text fields,
  render an added/removed/changed diff. Populate from the latest `REGENERATED` review-event snapshots
  (fetch via existing `GET /review-events`). Show it after a regeneration.

## Tests
- `AiGenerationServiceTest`: regenerate keeps id + reviewStatus, replaces steps, recomputes score,
  creates a REGENERATED event with both snapshots.
- `TestCaseReviewServiceTest`: REJECTED without comment→400; regenerate flag chains regeneration.
- `TestCaseReviewControllerTest`: POST /regenerate 200; 400 on blank reason.
- `diff-view.component.spec.ts`: added/removed/changed rows.

## Acceptance criteria
- A reviewer can reject-with-reason and receive a targeted regeneration.
- The before/after diff is visible and accurate.
- `NEEDS_CLARIFICATION` is now a settable, meaningful state.

## PR
Title: `feat(review): A3 — single-case regeneration with reject-reason loop and diff`.
