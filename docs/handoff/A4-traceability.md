# Handoff — Sprint A4: Coverage & Traceability Matrix

**Branch:** `feat/A4-traceability` · **Depends on:** none (pairs with A1) · **Migration:** none

## Objective
The data model already links requirements to test cases (`test_case_requirements` join table) and
stores a coverage plan (`coverage_items`), but nothing surfaces it. Expose a **requirement → test
case traceability matrix** and a **coverage-gap list** (requirements / coverage categories with zero
tests), per story, and roll a summary up to the dashboard.

## Grounded context — read these first
- `backend/.../domain/model/{Requirement,CoverageItem,TestCase,Story}.java` — note
  `TestCase.getRequirements()` and `Requirement.getSourceReference()`, `CoverageItem.getRequirement()`.
- `backend/.../domain/repository/{RequirementRepository,CoverageItemRepository,TestCaseRepository}.java`
- `backend/.../ai/service/AiGenerationService.java` — see how requirements/coverage are persisted.
- `frontend/src/app/pages/stories/story-detail-page.component.ts` (tabbed layout).

## Backend tasks
1. **DTOs** `api/story/dto/`:
   ```java
   public record CaseRef(UUID id, String title, ReviewStatus status) {}
   public record RequirementCoverage(String reference, String title, RiskLevel riskLevel,
       List<CaseRef> linkedCases, boolean covered) {}
   public record CoverageGap(String key, String description, RiskLevel riskLevel, String kind) {} // kind = REQUIREMENT|CATEGORY
   public record CoverageReportResponse(UUID storyId, List<RequirementCoverage> requirements,
       List<CoverageGap> gaps, int coveredCount, int totalRequirements) {}
   ```
2. **Service** `api/story/CoverageReportService.java`:
   - For each `Requirement` on the story, collect linked `TestCase`s (iterate suites→cases where the
     case's requirements contain this requirement). `covered = !linkedCases.isEmpty()`.
   - Gaps: requirements with no linked cases (`kind=REQUIREMENT`) + `CoverageItem`s whose category
     has no case referencing its requirement (`kind=CATEGORY`). Deterministic ordering by riskLevel desc.
3. **Controller** `api/story/CoverageReportController.java`:
   ```java
   @GetMapping("/api/stories/{storyId}/coverage")  // ADMIN/QA/VIEWER
   ```
4. **Dashboard rollup** (small): repository count of stories that have at least one uncovered
   requirement whose `riskLevel` is high — `StoryRepository` derived/`@Query` method
   `countStoriesWithUncoveredHighRiskRequirements()`. (If B2 not built yet, expose via a field on the
   existing dashboard metrics response; otherwise defer the field to B2.)

## Frontend tasks
- `core/services/coverage.service.ts` — `getReport(storyId)`.
- Story detail **"Coverage"** tab: a matrix (rows = requirements, columns = linked cases as chips)
  plus a **gaps callout** listing uncovered items. Each gap row has a "Generate targeted case" action
  that opens A2's generate dialog with guidance prefilled (e.g. `"Cover requirement REQ-3: <desc>"`).
- Dashboard: a small "N stories have uncovered high-risk requirements" nudge linking to those stories
  (wire fully in B2 if the metric isn't available yet).

## Tests
- `CoverageReportServiceTest`: requirement with 0 cases → gap + covered=false; with a case → covered=true;
  coverage category with no case → CATEGORY gap; counts correct.
- `CoverageReportControllerTest`: 200 shape; VIEWER allowed.
- `coverage.service.spec.ts` + matrix component spec (renders gaps, empty state).

## Acceptance criteria
- Per-story coverage report lists covered/uncovered requirements and gaps.
- "Generate targeted case" hands a prefilled guidance into A2.
- Dashboard reflects uncovered high-risk requirements (now or via B2).

## PR
Title: `feat(coverage): A4 — requirement traceability matrix and coverage gaps`.
