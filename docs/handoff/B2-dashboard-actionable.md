# Handoff — Sprint B2: Reviewer-First Dashboard

**Branch:** `feat/B2-dashboard-actionable` · **Depends on:** A4 (coverage rollup, optional) · **Migration:** none

## Objective
The dashboard is static totals + recent activity. Turn it into an **action queue**: what needs review,
what's stuck, quality distribution, and reviewer throughput — every number clickable to a filtered view.

## Grounded context — read these first
- `backend/.../dashboard/service/DashboardService.java` and `dashboard/dto/DashboardMetricsResponse.java`.
- `backend/.../dashboard/controller/DashboardController.java`.
- Repositories: `TestCaseRepository` (`countByReviewStatus`), `TestSuiteRepository`, `StoryRepository`,
  `ReviewEventRepository`.
- `frontend/src/app/pages/dashboard/dashboard-page.component.ts` (~440 lines) and
  `core/services/dashboard.service.ts`.

## Backend tasks
1. **DTOs** `dashboard/dto/`:
   ```java
   public record AttentionItem(String type, String targetId, String label, long count, String route) {}
   public record QualityDistribution(long high, long medium, long low) {}
   public record ThroughputPoint(String date, long approvals, long rejections) {}
   public record AttentionResponse(List<AttentionItem> items, QualityDistribution quality,
       List<ThroughputPoint> throughput7d) {}
   ```
2. **Repository queries**:
   - `TestCaseRepository.countByConfidenceLevel(ConfidenceLevel)` (field added in V7).
   - `StoryRepository.findByStatusAndUpdatedAtBefore(StoryStatus, Instant)` → stuck stories
     (e.g. DRAFT or ANALYZED older than 7 days).
   - `TestSuiteRepository` count of suites with pending (`NEEDS_REVIEW`) cases — or derive from
     `TestCaseRepository.countByReviewStatus(NEEDS_REVIEW)` grouped per suite via a `@Query`.
   - `ReviewEventRepository` throughput: `@Query` counting APPROVED/REJECTED review events grouped by
     day for the last 7 days (`createdAt >= :since`).
3. **Service** `DashboardService.getAttention()` assembling the above. Attention items examples:
   `{type:"PENDING_REVIEW", label:"N test cases awaiting review", route:"/review-board"}`,
   `{type:"STUCK_STORY", targetId:<storyId>, label:"Story X stuck in DRAFT 9 days", route:"/stories/<id>"}`,
   plus (if A4 merged) `{type:"UNCOVERED_REQ", ...}`.
4. **Endpoint** `DashboardController`:
   ```java
   @GetMapping("/api/dashboard/attention")  // ADMIN/QA/VIEWER
   ```

## Frontend tasks
- `dashboard.service.ts`: `getAttention()`.
- Dashboard:
  - **"Needs attention"** list — each row deep-links to its `route`.
  - **Quality distribution** bar (high/medium/low).
  - **7-day throughput** sparkline (approvals vs rejections).
  - Make the existing metric tiles clickable → filtered review-board / search routes
    (e.g. "Pending review" → `/review-board`, "Rejected" → `/search?status=REJECTED`).

## Tests
- `DashboardServiceTest`: stuck-story threshold; distribution counts; throughput grouping (7 buckets).
- `DashboardControllerTest`: 200 shape.
- `dashboard.service.spec.ts` + component spec (empty attention state renders a friendly message).

## Acceptance criteria
- Dashboard surfaces an actionable queue with working deep-links.
- Quality distribution and throughput render from real data.

## PR
Title: `feat(dashboard): B2 — actionable reviewer dashboard`.
