# TestCaseIQ — Implementation Handoff Prompts

Each file in this folder is a **self-contained prompt** you can paste into Codex / Claude Code
to implement one sprint. They are ordered; later sprints assume earlier ones are merged.

## The intelligence-loop thesis
TestCaseIQ already detects ambiguities, builds coverage plans, and links requirements to
test cases in its data model — but the **workflow leaves those loops dangling**. Phase A closes
them. Phase B removes daily review friction. Phase C broadens input/output. Phase D is a
strategic fork (test execution) to decide on *after* A–C ship.

## Build order
| # | Sprint | Branch | Depends on |
|---|--------|--------|------------|
| A1 | Ambiguity resolution gate | `feat/A1-ambiguity-resolution` | — |
| A2 | Feedback-conditioned generation | `feat/A2-feedback-generation` | A1 |
| A3 | Single-case & rejection regeneration | `feat/A3-regeneration` | A2 |
| A4 | Coverage & traceability matrix | `feat/A4-traceability` | — (pairs with A1) |
| B1 | Bulk review operations | `feat/B1-bulk-review` | — |
| B2 | Reviewer-first dashboard | `feat/B2-dashboard-actionable` | A4 (coverage rollup) |
| B3 | Approved-only export + history | `feat/B3-export-governance` | — |
| C1 | Bulk & integrated story intake | `feat/C1-bulk-intake` | — |
| C2 | Deep, filterable search | `feat/C2-search-v2` | — |
| C3 | Semantic quality & duplicates | `feat/C3-quality-v2` | — |
| D1 | Test execution & run tracking | `feat/D1-test-runs` | decision-gated |

Recommended sequence: `A1→A2→A3→A4 → B1→B3→B2 → C2→C1→C3 → decide D1`.

## Rules that apply to EVERY sprint (do not repeat-violate)
- **Read every file before editing it.** Match the surrounding code's style.
- DTOs are Java `record`s. Services use constructor injection. No field injection.
- Every new endpoint carries `@PreAuthorize("!@securityEnforcement.isEnforced() or hasAnyRole(...)")`
  using the same role tiers as sibling endpoints (mutations = ADMIN/QA_ENGINEER; reads = +VIEWER).
- Add an `AuditAction` enum constant and an `auditService.log(...)` call for any state change.
- Flyway migrations are named `V<n>__snake_case.sql`; current max is **V9**, so the next free
  number is **V10** (claim them in build order to avoid collisions).
- Keep files under 500 lines. No new files in the repo root.
- `MockAiGenerationProvider` MUST stay deterministic so CI never needs an OpenAI key.
- Backend: JUnit unit test + `@WebMvcTest`/MockMvc controller test. Frontend: `.spec.ts` with
  `HttpTestingController`. Loop-closing flows (A1, A3, B1, D1) also get a Playwright e2e.
- Run `mvn -q test` (in `backend/`) and `npm test` (in `frontend/`) before opening the PR.
- One PR per sprint, squash-merge, delete branch.

## Grounded architecture facts (true as of this handoff)
- Base package `com.testcaseiq.api`. Frontend Angular standalone components.
- Domain flow: `Project → Story → (analyze) → Requirement/Ambiguity/CoverageItem →
  (generate) → TestSuite → TestCase → TestStep/TestData`.
- `StoryStatus{DRAFT,ANALYZED,TESTS_GENERATED,REVIEWED,EXPORTED}`.
- `ReviewStatus{DRAFT,NEEDS_REVIEW,APPROVED,REJECTED,NEEDS_CLARIFICATION,EXPORTED}`.
- `Ambiguity` already has `resolved`, `resolutionNotes`, `resolve(notes)`, `severity`,
  and `AmbiguityRepository` exists.
- `ReviewEvent` stores `status, actionType, previousValue(text), newValue(text), reviewer, comment`.
- `AiGenerationProvider` interface: `analyzeStory`, `generateTestCases`, `providerName`, `modelName`.
- `TestGenerationRequest(storyId, title, rawText, List<ExtractedRequirementDto> requirements)`.
- `export_jobs` table already has `story_id, export_type, status, export_details_json (jsonb),
  error_message` — B3 stores scope/count/actor inside `export_details_json` (no migration needed).
- Providers switch via `ai.provider = MOCK | OPENAI` (`AiProviderProperties`).
- Frontend services in `frontend/src/app/core/services`, models in `.../core/models`.
