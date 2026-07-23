# Handoff — Sprint C3: Semantic Quality & Duplicate Detection

**Branch:** `feat/C3-quality-v2` · **Depends on:** none · **Migration:** `V13__add_semantic_score.sql`
(claim the next free V-number at build time)

## Objective
Quality scoring is purely structural (deducts for blank fields / missing steps). Add
**within-suite duplicate detection** (deterministic, no LLM) and an **optional semantic score**
(provider-gated, cached) for "does this case actually map to its acceptance criterion?".

## Grounded context — read these first
- `backend/.../ai/service/TestCaseQualityScoringService.java` — structural scorer (0–100 →
  HIGH/MED/LOW). You are extending, not replacing, its output.
- `backend/.../domain/model/TestCase.java` — has `qualityScore`, `confidenceLevel` (V7). You'll add
  `semanticScore`.
- `backend/.../testsuite/controller/TestSuiteController.java`.
- `backend/.../ai/provider/AiGenerationProvider.java` and `MockAiGenerationProvider.java`.

## Backend tasks
1. **Migration**: `ALTER TABLE test_cases ADD COLUMN semantic_score int;` (nullable).
2. **Duplicate detection** `ai/service/DuplicateDetectionService.java`:
   ```java
   public record DuplicatePair(UUID caseA, UUID caseB, double similarity) {}
   List<DuplicatePair> findDuplicates(UUID testSuiteId);
   ```
   Normalize titles (lowercase, strip punctuation) and build step-action **shingles**; compute
   Jaccard similarity between every pair; return pairs ≥ threshold (e.g. 0.7), highest first.
   Fully deterministic → unit-testable.
3. **Endpoint** `TestSuiteController`:
   ```java
   @GetMapping("/api/test-suites/{id}/duplicates")  // ADMIN/QA/VIEWER
   ```
4. **Semantic score (optional, provider-gated)**:
   - `AiGenerationProvider` default method
     `default Integer semanticScore(String testCaseSummary, String acceptanceCriterion) { return null; }`.
   - `MockAiGenerationProvider` returns a deterministic value (e.g. based on token overlap) so tests
     are stable; `OpenAiGenerationProvider` may call the model. Cache the result in an `AiJob`
     (jobType `semantic-score`) keyed by case id to avoid recompute.
   - `TestCaseQualityScoringService`: add `int combinedScore(int structural, Integer semantic)`
     (e.g. weighted mean when semantic present; else structural). Persist `semanticScore` when computed.
5. **Model**: add `semanticScore` field + getter/setter to `TestCase`.

## Frontend tasks
- `core/services/test-suite.service.ts`: `getDuplicates(suiteId)`.
- Suite detail: **"Possible duplicates (N)"** banner listing pairs with **Merge** (keep one, delete
  other via existing delete) / **Dismiss** (local). Confidence badge tooltip shows the structural vs
  semantic breakdown when a semantic score exists.

## Tests
- `DuplicateDetectionServiceTest`: near-identical cases → pair above threshold; distinct cases → none;
  ordering by similarity.
- `TestCaseQualityScoringServiceTest`: combined score with/without semantic.
- Mock provider: `semanticScore` deterministic.
- `TestSuiteControllerTest`: duplicates endpoint 200.
- `test-suite.service.spec.ts`.

## Acceptance criteria
- Near-duplicate cases in a suite are flagged with a similarity score.
- Semantic score is surfaced where the provider supports it; MOCK stays deterministic.

## PR
Title: `feat(quality): C3 — duplicate detection and optional semantic scoring`.
