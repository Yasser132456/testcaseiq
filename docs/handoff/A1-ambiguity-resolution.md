# Handoff — Sprint A1: Ambiguity Resolution Gate

**Branch:** `feat/A1-ambiguity-resolution` · **Depends on:** none · **Migration:** `V10__add_ambiguity_resolution_meta.sql`

## Objective
Clarifying questions produced by `analyzeStory` are currently persisted and then ignored. Make them
an **answerable checklist** that (a) records who answered and how, and (b) **blocks test generation**
while blocking-severity questions remain open. This is the first half of the intelligence loop
(A2 consumes the answers).

## Grounded context — read these first
- `backend/.../domain/model/Ambiguity.java` — already has `question`, `context`, `severity`,
  `resolved (boolean)`, `resolutionNotes`, and `resolve(String)`. You are EXTENDING it.
- `backend/.../domain/enums/AmbiguitySeverity.java` — inspect its values; treat the highest one(s)
  (e.g. `BLOCKING`/`CRITICAL`/`HIGH` — use what actually exists) as "blocking".
- `backend/.../domain/repository/AmbiguityRepository.java`
- `backend/.../ai/controller/AiController.java` — `generateTests` is where the gate goes.
- `backend/.../audit/AuditAction.java` and `AuditService`.
- `frontend/src/app/pages/stories/story-detail-page.component.ts` — Generate button lives here.

## Backend tasks
1. **New enum** `domain/enums/AmbiguityResolutionStatus.java`: `OPEN, ANSWERED, DISMISSED`.
2. **Modify** `Ambiguity.java`: add
   ```java
   @Enumerated(EnumType.STRING) @Column(name="resolution_status", nullable=false, length=32)
   private AmbiguityResolutionStatus resolutionStatus = AmbiguityResolutionStatus.OPEN;
   @Column(name="resolved_by", length=255) private String resolvedBy;
   @Column(name="resolved_at") private Instant resolvedAt;
   ```
   Replace `resolve(String notes)` with `resolve(String notes, String actor)` (sets status=ANSWERED,
   resolved=true, resolvedBy, resolvedAt=Instant.now()); add `dismiss(String actor)` (status=DISMISSED).
   Add getters. Keep the old field `resolved` in sync for backward compatibility.
3. **Migration** `V10__add_ambiguity_resolution_meta.sql`:
   ```sql
   ALTER TABLE ambiguities ADD COLUMN resolution_status varchar(32) NOT NULL DEFAULT 'OPEN';
   ALTER TABLE ambiguities ADD COLUMN resolved_by varchar(255);
   ALTER TABLE ambiguities ADD COLUMN resolved_at timestamptz;
   UPDATE ambiguities SET resolution_status = 'ANSWERED' WHERE resolved = true;
   ```
4. **Repository** add:
   ```java
   List<Ambiguity> findByStoryIdOrderBySeverityDesc(UUID storyId);
   ```
5. **DTOs** in `api/story/dto/` (new package if absent):
   ```java
   public record AmbiguityResponse(UUID id, String question, String context,
       AmbiguitySeverity severity, AmbiguityResolutionStatus status,
       String resolutionNotes, String resolvedBy, Instant resolvedAt) {}
   public record AmbiguityResolutionRequest(@Size(max=4000) String resolutionNotes,
       @NotNull AmbiguityResolutionStatus status) {}
   ```
6. **Service** `api/story/AmbiguityService.java`:
   ```java
   List<AmbiguityResponse> listForStory(UUID storyId);
   AmbiguityResponse resolve(UUID storyId, UUID ambiguityId, AmbiguityResolutionRequest req, String actorEmail);
   long countOpenBlocking(UUID storyId); // status==OPEN && severity is a blocking level
   ```
   `resolve` validates the ambiguity belongs to the story (404 otherwise); ANSWERED requires
   non-blank notes (else `BadRequestException`); DISMISSED allows blank.
7. **Controller** `api/story/AmbiguityController.java` (`@RequestMapping("/api")`):
   ```java
   @GetMapping("/stories/{storyId}/ambiguities")   // hasAnyRole(ADMIN,QA_ENGINEER,VIEWER)
   @PatchMapping("/stories/{storyId}/ambiguities/{ambiguityId}") // hasAnyRole(ADMIN,QA_ENGINEER)
   ```
   On PATCH: `auditService.log(AuditAction.AMBIGUITY_RESOLVED, "AMBIGUITY", ambiguityId, SUCCESS,
   null, Map.of("status", req.status().name()))`. Actor email from the authenticated principal
   (see how `NotificationController`/`@AuthenticationPrincipal UserAccount` is used).
8. **Add** `AMBIGUITY_RESOLVED` to `AuditAction`.
9. **Gate** in `AiController.generateTests`: before calling the service,
   `if (ambiguityService.countOpenBlocking(storyId) > 0) throw new BadRequestException(...)`.
   Inject `AmbiguityService`. Message: `"Resolve N blocking clarifying question(s) before generating tests."`.

## Frontend tasks
- `core/models/ambiguity.model.ts` — `Ambiguity`, `AmbiguityResolutionStatus`, request type.
- `core/services/ambiguity.service.ts` — `list(storyId)`, `resolve(storyId, id, body)`.
- In `story-detail-page.component.ts`: add an **"Open questions (N)"** panel above/near Generate.
  Each row: question, context, severity badge, a notes textarea, and Answer / Dismiss buttons.
  Compute `blockingOpenCount`; when > 0, **disable the Generate Tests button** with a tooltip
  "Resolve N blocking question(s) first." Refresh list after each resolve.

## Tests
- `AmbiguityServiceTest`: resolve→ANSWERED sets actor/time/notes; ANSWERED w/ blank notes→400;
  wrong story→404; `countOpenBlocking` counts only OPEN blocking.
- `AmbiguityControllerTest` (MockMvc): GET 200; PATCH 200; PATCH as VIEWER→403.
- `AiControllerTest`: generate with an OPEN blocking ambiguity→400; passes when none.
- `ambiguity.service.spec.ts`: GET/PATCH URLs + bodies.

## Acceptance criteria
- Unanswered blocking questions prevent generation (API + UI).
- Answers persist with resolver identity and timestamp and survive reload.
- Audit log records each resolution.

## PR
Title: `feat(ai): A1 — ambiguity resolution gate before test generation`.
Include a test plan and note migration `V10`.
