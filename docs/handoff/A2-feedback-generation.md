# Handoff — Sprint A2: Feedback-Conditioned Generation

**Branch:** `feat/A2-feedback-generation` · **Depends on:** A1 · **Migration:** none

## Objective
Test generation currently receives only the story's requirements. Feed it (a) the **answered
clarifications** from A1 and (b) optional **reviewer guidance + focus areas** (negative, boundary,
mobile, accessibility, …). This is what makes the analyze step actually change the output.

## Grounded context — read these first
- `backend/.../ai/service/AiGenerationService.java` — `toTestGenerationRequest(Story)` and
  `generateTestCases(UUID)`.
- `backend/.../ai/dto/TestGenerationRequest.java` — currently
  `(storyId, title, rawText, List<ExtractedRequirementDto> requirements)`.
- `backend/.../ai/provider/MockAiGenerationProvider.java` — must stay deterministic.
- `backend/.../ai/controller/AiController.java` — `@PostMapping("/generate-tests")`.
- `backend/src/main/resources/prompts/test-generation-system.txt`.
- `frontend/src/app/core/services/test-generation.service.ts` and the story detail Generate button.

## Backend tasks
1. **New enum** `domain/enums/FocusArea.java`: `NEGATIVE, BOUNDARY, MOBILE, ACCESSIBILITY, PERFORMANCE, SECURITY`.
2. **New DTOs** `ai/dto/`:
   ```java
   public record ResolvedClarification(String question, String answer) {}
   public record TestGenerationOptions(String guidance, List<FocusArea> focusAreas) {}
   ```
3. **Modify** `TestGenerationRequest` to add fields (keep existing order first):
   ```java
   List<ResolvedClarification> clarifications, String guidance, List<FocusArea> focusAreas
   ```
   Fix all constructor call sites.
4. **Modify** `AiGenerationService`:
   - `toTestGenerationRequest(Story story, TestGenerationOptions options)` — collect
     `story.getAmbiguities()` where `resolutionStatus == ANSWERED` → `ResolvedClarification(question, resolutionNotes)`;
     pass `options.guidance()` and `options.focusAreas()` (null-safe → empty list).
   - `generateTestCases(UUID storyId, TestGenerationOptions options)` — overload; keep the
     no-options path delegating with `new TestGenerationOptions(null, List.of())`.
5. **Modify** `AiController.generateTests`: add `@RequestBody(required=false) TestGenerationOptions options`;
   default to empty when null. Keep existing audit; add metadata `focusAreas` count.
6. **Modify** `MockAiGenerationProvider.generateTestCases`: for each focus area in the request,
   append one deterministic extra test case titled `"[<FOCUS>] <baseTitle>"`; put `guidance` into
   the suite description. This makes output assertable.
7. **Modify** prompt `test-generation-system.txt`: add a "Resolved clarifications" section and a
   "Focus areas — prioritize generating cases for:" section, both fed from the request.

## Frontend tasks
- Extend `test-generation.service.ts`: `generate(storyId, options?)` posts optional body.
- Generate button opens a small dialog: guidance `<textarea>` + focus-area chips (multi-select).
  Persist last-used options per story (component state or `localStorage` keyed by storyId).
- Show the chosen focus areas as chips on the resulting suite header (nice-to-have).

## Tests
- `AiGenerationServiceTest`: request carries ANSWERED clarifications + guidance + focus areas;
  DRAFT/OPEN ambiguities excluded.
- Mock provider test: N focus areas → N extra deterministic cases; guidance in description.
- `AiControllerTest`: POST with body and POST without body both 200.
- `test-generation.service.spec.ts`: body shape.

## Acceptance criteria
- Generation payload includes answered clarifications and guidance/focus.
- Mock output visibly changes with focus areas (deterministic).
- The legacy no-body generate call still works.

## PR
Title: `feat(ai): A2 — feedback- and clarification-conditioned generation`.
