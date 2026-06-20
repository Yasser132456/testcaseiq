# TestCaseIQ

TestCaseIQ converts user stories and requirements into traceable, reviewable QA assets. It is designed for QA engineers, test automation engineers, and software quality teams who need to move from product intent to reliable test coverage without losing human judgment along the way.

The application combines AI-assisted story analysis and test generation with human-in-the-loop review gates. Its focus is reliability, traceability, and exportable QA artifacts: manual test cases, Markdown/CSV/JSON reports, Playwright draft specs, and Postman draft collections.

## Why It Matters

Manual test design is valuable work, but it is also repetitive and easy to disconnect from the original requirement. TestCaseIQ helps reduce that effort by turning stories into structured, reviewable test assets while keeping humans in control.

The project is built around a careful QA workflow:

- Analyze stories for requirements, risks, ambiguity, and coverage ideas.
- Generate draft test cases that can be reviewed before approval.
- Preserve traceability from stories to requirements and test assets.
- Export approved tests into formats teams can inspect, share, or adapt.
- Validate AI output before persistence instead of blindly trusting generated content.

## Feature Matrix

| Area                         | Capability                                                   | Status      |
| ---------------------------- | ------------------------------------------------------------ | ----------- |
| Project and story management | Organize projects and user stories for QA workflow           | Implemented |
| AI story analysis            | Extract requirements, ambiguity, risk, and coverage signals  | Implemented |
| Test case generation         | Generate reviewable manual test cases from story context     | Implemented |
| Review board                 | Review, update, approve, and track generated tests           | Implemented |
| Markdown/CSV/JSON export     | Export approved test assets for documentation and handoff    | Implemented |
| Playwright skeleton export   | Generate draft `.spec.ts` automation skeletons               | Implemented |
| Postman collection export    | Generate draft Postman Collection JSON for API testing       | Implemented |
| Backend authentication       | Register/login/me endpoints with JWT and role foundation     | Implemented |
| User administration          | ADMIN-only UI to view users, change roles, enable/disable    | Implemented |
| Real AI provider support     | Use a real provider through configuration                    | Implemented |
| Mock provider support        | Run locally and in tests without real AI credentials         | Implemented |
| AI output validation         | Validate generated structures before persistence             | Implemented |
| CI quality gates             | Run backend tests, frontend build, and secret hygiene checks | Implemented |

## Architecture Overview

TestCaseIQ is a full-stack monorepo with a clear separation between product UI, backend workflow logic, persistence, AI provider integration, export services, and CI quality gates.

```text
Angular frontend
  -> Spring Boot backend API
      -> Story, project, review, and export services
      -> AI provider abstraction
          -> Mock provider by default
          -> OpenAI-compatible provider when configured
      -> AI output validation
      -> PostgreSQL persistence

GitHub Actions CI
  -> Secret hygiene checks
  -> Backend Maven tests on Java 21
  -> Frontend npm install and Angular build on Node.js 24.15.0
```

Core pieces:

- `frontend/`: Angular UI for project, story, analysis, generation, review, and export workflows.
- `backend/`: Spring Boot API with domain services, persistence, AI provider abstraction, validation, export generation, and JWT auth foundation.
- PostgreSQL: local relational persistence through Docker Compose.
- Export services: Markdown, CSV, JSON, Playwright draft specs, and Postman Collection JSON.
- Review workflow: keeps generated tests in a human approval path before export.
- `.github/workflows/ci.yml`: GitHub Actions quality gates for pull requests and `main`.

## Demo Workflow

1. Create a project.
2. Add a user story with enough requirement context for QA analysis.
3. Run story analysis to identify requirements, ambiguities, risks, and coverage ideas.
4. Generate draft test cases from the analyzed story.
5. Review, edit, and approve tests through the review workflow.
6. Export approved tests as Markdown, CSV, or JSON.
7. Export draft automation skeletons as Playwright `.spec.ts` or Postman Collection JSON.

Generated automation is intentionally treated as draft, review-required output. It is a starting point for test automation work, not a claim of production-ready coverage.

## Repository Structure

```text
testcaseiq/
  frontend/          Angular application
  backend/           Spring Boot API
  docker/            Docker-related notes and example environment values
  docs/              Architecture, roadmap, sprint, AI pipeline, and contribution notes
  prompts/           Prompt assets
  evals/             Evaluation assets
  docker-compose.yml Local PostgreSQL and Redis
```

## Prerequisites

- Java 21
- Maven 3.9+
- Node.js 24.15.0+
- npm
- Docker Desktop or Docker Engine with Compose

## Local Setup

Start PostgreSQL and Redis:

```bash
docker compose up -d
```

Start the backend:

```bash
cd backend
mvn spring-boot:run
```

The backend runs at `http://localhost:8080`.

Check backend health:

```bash
curl http://localhost:8080/api/health
```

Start the frontend:

```bash
cd frontend
npm ci
npm start
```

The app runs at `http://localhost:4200`.

The frontend development server proxies `/api` requests to `http://localhost:8080`.

By default, local/demo mode keeps existing project, story, analysis, review, and export endpoints accessible. The Angular login/register UI is available, stores the returned JWT locally for this project stage, restores the session through `/api/auth/me` on refresh, and attaches `Authorization: Bearer <token>` to API calls when a token exists. Protected backend enforcement can be enabled with `TESTCASEIQ_SECURITY_ENFORCE_AUTH=true`.

## Testing And Quality

Run backend tests:

```bash
cd backend
mvn test
```

Run the frontend build:

```bash
cd frontend
npm run build
```

GitHub Actions runs the quality gates on pull requests targeting `main` and on pushes to `main`:

- Secret hygiene check for committed `.env` files and obvious OpenAI-style API keys.
- Backend tests with Java 21 and cached Maven dependencies.
- Frontend install and build with Node.js 24.15.0 and cached npm dependencies.

Backend CI sets the mock AI provider and leaves the OpenAI key empty, so tests do not require real AI credentials and should not make external AI calls.

## AI Configuration

The mock AI provider is the default configuration. It is used for local development and automated tests when no real provider is enabled.

Safe example values live in:

- `.env.example`
- `backend/.env.example`
- `frontend/.env.example`
- `docker/.env.example`

Relevant backend configuration keys include:

- `AI_PROVIDER=mock`
- `OPENAI_API_KEY=`
- `OPENAI_MODEL=gpt-4o-mini`
- `OPENAI_BASE_URL=https://api.openai.com`
- `TESTCASEIQ_SECURITY_ENFORCE_AUTH=false`
- `TESTCASEIQ_JWT_SECRET=testcaseiq-local-development-jwt-secret-change-me`
- `TESTCASEIQ_ACCESS_TOKEN_EXPIRATION_SECONDS=3600`

To enable a real AI provider, configure the provider and key through local environment/config values. Do not commit real `.env` files, production secrets, or API keys.

AI output is validated before persistence so malformed or unsafe generated structures can be rejected before they become reviewable test assets.

## Authentication and Role-Based Access

The app includes JWT authentication with BCrypt password hashing on the backend and Angular session handling on the frontend.

Auth endpoints:

- `POST /api/auth/register`: accepts `displayName`, `email`, and `password`; creates a `QA_ENGINEER` user by default and returns an access token plus profile.
- `POST /api/auth/login`: accepts `email` and `password`; returns an access token plus profile for valid enabled users.
- `GET /api/auth/me`: returns the current user profile when called with `Authorization: Bearer <token>`.

Auth endpoints are always public regardless of the enforcement flag.

### Role Model

| Role | Permissions |
|------|-------------|
| `ADMIN` | Full access: create, update, delete, generate, analyze, review, approve/reject, export, manage all resources |
| `QA_ENGINEER` | Create and manage projects and stories; run analysis; generate tests; review and approve/reject test cases; export approved tests. Cannot delete or manage users. |
| `VIEWER` | Read-only: view projects, stories, analysis results, generated tests, review history, and exports. Cannot create, update, delete, generate, or approve/reject. |

Password hashes are stored server-side only and are never returned in API responses.

### Security Enforcement Flag

Security enforcement is controlled by `TESTCASEIQ_SECURITY_ENFORCE_AUTH` (mapped to `app.security.enforce-auth`).

**Default behavior (`enforce-auth=false`):**

- All business endpoints remain accessible without authentication.
- The existing demo workflow works without logging in.
- Auth endpoints still work normally.
- This is the default for local and demo use.

**Enforced mode (`enforce-auth=true`):**

- Business endpoints require a valid JWT (`Authorization: Bearer <token>`).
- Unauthenticated requests to business endpoints return `401 Unauthorized`.
- Authenticated requests to endpoints outside the user's role return `403 Forbidden`.
- Auth endpoints remain public.
- Health endpoint remains public.

### Enabling Enforcement Locally

```bash
# Set the env var before starting the backend
TESTCASEIQ_SECURITY_ENFORCE_AUTH=true mvn spring-boot:run
```

Or add to `backend/.env`:

```
TESTCASEIQ_SECURITY_ENFORCE_AUTH=true
```

Use a real `TESTCASEIQ_JWT_SECRET` in shared or production-like environments; the documented default is only a local development fallback.

### Frontend Route Protection

When `enforce-auth=true` is set on the backend, the Angular route guard also redirects unauthenticated users to `/login`. The UI additionally hides or disables mutating actions based on the authenticated user's role:

- ADMIN sees all actions.
- QA_ENGINEER sees create, edit, analyze, generate, and review actions; no delete or admin controls.
- VIEWER sees read-only views with no create, edit, delete, generate, or review buttons.

Frontend restrictions are cosmetic reinforcement — the backend enforces role permissions on every request.

### Creating Accounts

No development admin seed is created automatically. Use `POST /api/auth/register` to create a `QA_ENGINEER` account locally. Admin accounts must be promoted directly in the database for the first setup, after which the User Administration UI can be used to manage roles.

## User Administration

The User Administration area is accessible only to users with the `ADMIN` role. It is reachable at `/admin/users` and appears in the sidebar navigation only for admins.

### Supported actions

| Action | Description |
|--------|-------------|
| View all users | List all registered accounts with id, display name, email, role, account status, and timestamps |
| Change role | Update a user's role between `ADMIN`, `QA_ENGINEER`, and `VIEWER` |
| Enable / disable account | Deactivate or reactivate a user account |

### Safety rules

- An admin cannot disable their own account.
- The last remaining active `ADMIN` cannot be demoted or disabled.
- Changes require confirmation before they are applied.

### Backend endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/users` | List all users |
| `PATCH` | `/api/admin/users/{id}/role` | Update a user's role |
| `PATCH` | `/api/admin/users/{id}/status` | Enable or disable a user account |

All three endpoints always require an authenticated `ADMIN` JWT regardless of the `enforce-auth` flag. Password hashes are never returned by any admin endpoint.

### Access control

- `ADMIN` can access all user administration endpoints and UI.
- `QA_ENGINEER` and `VIEWER` receive `403 Forbidden` on any `/api/admin/**` request.
- Unauthenticated requests receive `401 Unauthorized`.
- Non-admin users who navigate directly to `/admin/users` are redirected to the dashboard with an access-restricted notice.

## Exports

Exports are based on approved test cases from the review workflow.

Supported export targets:

- Markdown for readable QA documentation.
- CSV for spreadsheet-friendly review and handoff.
- JSON for structured downstream processing.
- Playwright `.spec.ts` draft skeletons for UI automation starting points.
- Postman Collection JSON drafts for API testing starting points.
- Jira/Xray CSV draft import mappings.
- Azure DevOps CSV draft import mappings.

Automation exports are draft and review-required. Test automation engineers should inspect, adapt, and harden generated skeletons before relying on them in an execution pipeline.

## Screenshots

No real screenshots are committed yet. Planned screenshot placeholders:

- Dashboard
- Story analysis
- Generated test cases
- Review board
- Export panel

## Roadmap

Realistic next steps include:

- Jira and Xray integration.
- Azure DevOps integration.
- Authentication and role-based access.
- Team collaboration features.
- Test execution feedback loop.
- Better AI evaluation metrics.
- Importing requirements from files.

See [docs/ROADMAP.md](docs/ROADMAP.md) for broader product direction.

## Professional Positioning

TestCaseIQ demonstrates practical work across:

- QA engineering and test design.
- API testing and export workflows.
- Test automation thinking with Playwright and Postman.
- AI-assisted testing with validation and review gates.
- Spring Boot and Angular full-stack development.
- CI quality gates for repository reliability.
- Product-oriented QA workflow design.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Sprints](docs/SPRINTS.md)
- [AI Pipeline](docs/AI_PIPELINE.md)
- [Contributing](docs/CONTRIBUTING.md)

## License

MIT. See [LICENSE](LICENSE).
