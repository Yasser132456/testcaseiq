# Handoff — Sprint C2: Deep, Filterable Search

**Branch:** `feat/C2-search-v2` · **Depends on:** none · **Migration:** `V12__search_trgm_indexes.sql`
(claim the next free V-number at build time; adjust if C-series lands before/after other migrations)

## Objective
Search is title/name substring only, hard-capped at 5 results per group, with no filters. Make it
**full-text over story bodies and test-case descriptions/steps** and **filterable** (status, priority,
risk, project, confidence), with pagination.

## Grounded context — read these first
- `backend/.../search/SearchService.java` — `GROUP_LIMIT = 5`, title/name `ContainingIgnoreCase`.
- `backend/.../search/SearchController.java` and the result DTOs
  (`ProjectSearchResult`, `StorySearchResult`, `TestSuiteSearchResult`, `TestCaseSearchResult`,
  `SearchResultsResponse`, `SearchResultType`).
- Repositories with `findBy...ContainingIgnoreCase`.
- `frontend/src/app/shared/search-modal/` and `core/services/search.service.ts`.

## Backend tasks
1. **Migration** (`pg_trgm` for fast ILIKE):
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   CREATE INDEX IF NOT EXISTS idx_story_text_trgm ON stories USING gin (story_text gin_trgm_ops);
   CREATE INDEX IF NOT EXISTS idx_testcase_desc_trgm ON test_cases USING gin (description gin_trgm_ops);
   CREATE INDEX IF NOT EXISTS idx_testcase_title_trgm ON test_cases USING gin (title gin_trgm_ops);
   ```
   (H2/test profile: guard so tests that use H2 don't choke — if tests run on Postgres Testcontainers,
   fine; otherwise wrap the extension/index creation to be Postgres-only or ensure the test DB is PG.)
2. **Filter DTO** `search/SearchFilters(SearchResultType type, ReviewStatus status, Priority priority,
   RiskLevel risk, UUID projectId, ConfidenceLevel confidence)`.
3. **Service** `SearchService.search(String q, SearchFilters filters, Pageable pageable)`:
   - Remove the hardcoded `GROUP_LIMIT`. Full-text match story `title` OR `story_text`, and test case
     `title` OR `description` (optionally join step text). Apply filters. Return paged results per group
     (or a unified paged list — keep the grouped response shape but honor `pageable`).
4. **Repositories**: filtered `@Query` methods using `ILIKE '%' || :q || '%'` and optional predicates
   (nullable filter args → `(:status is null or t.reviewStatus = :status)` pattern).
5. **Controller**:
   ```java
   @GetMapping("/api/search")  // params: q, type?, status?, priority?, risk?, projectId?, confidence?, page, size
   ```
   Empty/blank `q` short-circuits to empty (keep existing behavior).

## Frontend tasks
- `search.service.ts`: pass all params.
- Search modal: filter chips (reuse `review-filters.component` from B1 where possible) + pagination
  controls. Result rows deep-link as today.

## Tests
- `SearchServiceTest`: body-text hit (query matches only `story_text`); each filter narrows results;
  pagination returns page 2; blank query → empty.
- `SearchControllerTest`: param binding; VIEWER allowed.
- `search.service.spec.ts`: query string.

## Acceptance criteria
- "All rejected high-risk cases" is expressible as one filtered query.
- Story body / test-case description text is searchable.
- Results paginate; the 5-per-group cap is gone.

## PR
Title: `feat(search): C2 — full-text, filterable, paginated search`.
