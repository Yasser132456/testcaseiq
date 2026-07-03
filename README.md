# TestCaseIQ

> AI-powered QA platform transforming user stories into traceable, testable assets with full lifecycle management.

[![CI](https://github.com/Yasser132456/testcaseiq/actions/workflows/ci.yml/badge.svg)](https://github.com/Yasser132456/testcaseiq/actions/workflows/ci.yml)

TestCaseIQ bridges the gap between product requirements and QA delivery. It takes user stories, runs AI-assisted analysis to surface requirements, ambiguities, risks, and coverage gaps, then generates structured, reviewable test cases that teams can approve and export directly into their testing toolchain.

Built for QA engineers, test automation engineers, and software quality teams who need reliable, traceable test coverage without disconnecting from the original requirement.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Angular (standalone components, signals) | 22 |
| Backend | Spring Boot | 3.3.5 |
| Language | Java | 21 |
| Database | PostgreSQL | 16 |
| Cache | Redis | 7 |
| Auth | JWT (HS256, custom implementation) | — |
| AI Provider | OpenAI / Mock abstraction layer | gpt-4o-mini |
| Migrations | Flyway | — |
| CI | GitHub Actions | — |
| Build | Maven (backend), Angular CLI (frontend) | — |
| Containers | Docker Compose | — |

---

## Architecture

```
Angular Frontend (port 4200)
  └── HTTP + JWT → Spring Boot API (port 8080)
        ├── Auth & Role Enforcement (JWT filter + @PreAuthorize)
        ├── Project / Story / Test Suite / Test Case Services
        ├── AI Provider Abstraction Layer
        │     ├── Mock Provider (default, no credentials needed)
        │     └── OpenAI Provider (configurable)
        ├── AI Output Validation (structured schema enforcement)
        ├── Review Workflow (DRAFT → NEEDS_REVIEW → APPROVED / REJECTED)
        ├── Export Services (Markdown, CSV, JSON, Playwright, Postman, Jira, Azure DevOps)
        ├── Audit Trail (tamper-resistant, ADMIN-only)
        ├── Dashboard Metrics
        └── PostgreSQL 16 (via Flyway schema migrations)

GitHub Actions CI
  ├── Secret hygiene scan
  ├── Backend: Maven tests on Java 21 (cached)
  ├── Frontend: Karma tests + Angular build on Node.js 24 (cached)
  └── E2E: full stack + Playwright Chromium in mock AI mode
```

### Key design decisions

- **AI provider abstraction** — swap between mock and OpenAI with a single config value. No code changes, no provider lock-in.
- **AI output validation** — generated content is validated against a schema before persistence. Malformed AI output is rejected, not silently stored.
- **Human-in-the-loop review gate** — all AI-generated test cases start in `DRAFT` and must be explicitly approved before they can be exported.
- **Role enforcement at every layer** — Spring Security `@PreAuthorize` on all write endpoints, UI role checks for display, and `requiresAuth` guards on every route.
- **Audit trail independence** — audit records use `REQUIRES_NEW` transaction propagation so audit failures never break the main workflow.

---

## Features

### Story → Test Generation
- Create projects and add user stories with acceptance criteria
- AI analysis extracts requirements, ambiguities, risks, and coverage signals
- AI generates structured test cases: title, type, priority, risk, preconditions, steps, expected results
- Each test case scored with a quality score (0–100) and confidence level

### Review Workflow
- Generated tests start in `DRAFT` status
- QA engineers review, edit inline, and approve or reject
- Full review history with reviewer identity and comments
- Only `APPROVED` tests are eligible for export

### Export Pipelines
- **Markdown** — readable QA documentation
- **CSV** — spreadsheet-friendly handoff
- **JSON** — structured downstream processing
- **Playwright `.spec.ts`** — draft automation skeletons
- **Postman Collection JSON** — draft API test collections
- **Jira/Xray CSV** — draft import mappings
- **Azure DevOps CSV** — draft import mappings

### Audit Trail
- System-wide tamper-resistant activity log
- Logs: logins, project/story CRUD, AI generation, review decisions, exports, user management
- Filterable by action, outcome, resource type, actor, and date range
- ADMIN-only access; no secrets, tokens, or passwords ever logged

### Dashboard & Metrics
- Total projects, stories, test suites, test cases
- Approval rate, rejection rate, pending review rate, export readiness rate
- Stories with / without generated tests
- Recent platform activity feed

### AI Quality Scoring & Explainability
- Each test case carries a quality score and confidence level
- Generation rationale explains why each test case was created
- Linked acceptance criteria text provides traceability to the source requirement

### Settings & AI Provider Configuration
- Configure AI provider (mock / OpenAI) without redeployment
- Manage model and temperature settings from the UI (ADMIN / QA_ENGINEER)

### User & Role Management
- ADMIN-only user administration: view, change role, enable/disable accounts
- Self-registration creates `QA_ENGINEER` accounts by default
- Promoted admin accounts can manage all users from the UI

---

## Demo Mode

Demo mode seeds a realistic QA dataset on startup so the platform is immediately usable without manual data entry.

### Activate

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=demo
```

### Seeded data

| Entity | Count | Details |
|--------|-------|---------|
| Users | 3 | One per role (see credentials below) |
| Projects | 3 | E-commerce Platform QA, Banking API QA, HR System QA |
| Stories | 6 | Realistic acceptance criteria; mix of statuses |
| Test Suites | 4 | Checkout Flow, Product Search, Fund Transfer API, MFA Security, Onboarding |
| Test Cases | 9 | Mix of APPROVED / NEEDS_REVIEW / REJECTED / DRAFT with steps |
| Audit Events | 14 | Login, generation, review decisions, export |

### Demo credentials

| Role | Email | Password |
|------|-------|----------|
| `ADMIN` | `admin@demo.testcaseiq.io` | `demo123!` |
| `QA_ENGINEER` | `qa@demo.testcaseiq.io` | `demo123!` |
| `VIEWER` | `viewer@demo.testcaseiq.io` | `demo123!` |

**Idempotent:** seeding skips automatically if any users already exist. Safe to restart.

---

## Getting Started

### Prerequisites

- Java 21
- Maven 3.9+
- Node.js 24.15.0+
- npm
- Docker Desktop (for PostgreSQL and Redis)

### Configuration

TestCaseIQ defaults to the mock AI provider, so fresh clones can boot without OpenAI credentials.

| Variable | Default | Notes |
|----------|---------|-------|
| `AI_PROVIDER` | `mock` | `mock` or `openai`. `mock` disables the Spring AI OpenAI chat model. |
| `OPENAI_API_KEY` | empty | Required only when `AI_PROVIDER=openai`. |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI chat model used in OpenAI mode. |
| `OPENAI_BASE_URL` | `https://api.openai.com` | Override for OpenAI-compatible endpoints. |
| `TESTCASEIQ_DATABASE_URL` | `jdbc:postgresql://localhost:5432/testcaseiq` | Backend JDBC URL. |
| `TESTCASEIQ_DATABASE_USERNAME` | `testcaseiq` | Backend DB username. |
| `TESTCASEIQ_DATABASE_PASSWORD` | `testcaseiq_dev_password` | Backend DB password. |
| `REDIS_HOST` | `localhost` | Redis host for local tooling. |
| `REDIS_PORT` | `6379` | Redis port for local tooling. |

Local startup sequence:

```bash
docker compose up -d

cd backend
mvn spring-boot:run

cd ../frontend
npm ci
npm start
```

The backend listens on `http://localhost:8080`; the frontend listens on `http://localhost:4200` and proxies `/api` to the backend.

### 1. Start infrastructure

```bash
docker compose up -d
```

### 2. Start the backend

```bash
cd backend
mvn spring-boot:run
```

Backend available at `http://localhost:8080`. Health check:

```bash
curl http://localhost:8080/api/health
```

To start with demo seed data:

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=demo
```

### 3. Start the frontend

```bash
cd frontend
npm ci
npm start
```

App available at `http://localhost:4200`. The dev server proxies `/api` to `http://localhost:8080`.

---

## Screenshots

> Screenshots to be added. Key views to capture for portfolio presentation:

| View | Description |
|------|-------------|
| Dashboard | KPI cards, quality rates, coverage stats, recent activity |
| Test Suite detail | Generated test cases with quality scores and review status badges |
| Review board | Approve / reject workflow with inline editing |
| Audit Trail | Filterable activity log with resource traceability |
| Settings | AI provider configuration panel |

---

## Security Model

### Authentication

JWT-based authentication using HS256 HMAC signing.

- Tokens are short-lived (default: 1 hour, configurable via `TESTCASEIQ_ACCESS_TOKEN_EXPIRATION_SECONDS`)
- Expiration is validated on every request
- Constant-time signature comparison to prevent timing attacks
- Invalid or expired tokens are silently rejected — the request proceeds as unauthenticated
- No session state is stored server-side

Auth endpoints:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Create a `QA_ENGINEER` account; returns token |
| `POST` | `/api/auth/login` | Authenticate; returns token |
| `GET` | `/api/auth/me` | Return current user profile |

### Role Model

| Role | Access |
|------|--------|
| `ADMIN` | Full access: all CRUD, generation, review, export, user management, audit trail |
| `QA_ENGINEER` | Create and manage projects/stories, run AI analysis, generate and review tests, export approved tests |
| `VIEWER` | Read-only across all modules; no create, update, delete, generate, or review actions |

### Enforcement strategy

Role enforcement operates at two independent layers:

1. **Backend** — Spring Security `@PreAuthorize` annotations on all write endpoints enforce roles on every request, regardless of how the client reached the endpoint. Admin and audit endpoints always require an authenticated `ADMIN` JWT even when the global enforcement flag is off.

2. **Frontend** — Angular route guards redirect unauthenticated users and role-restricted users. The UI conditionally renders or hides actions based on role. These are cosmetic reinforcements only — the backend is the authoritative enforcement point.

### Security enforcement flag

`TESTCASEIQ_SECURITY_ENFORCE_AUTH` (default: `false`) controls whether unauthenticated requests to business endpoints are allowed through:

- `false` (default for local/demo): business endpoints accessible without a token. Useful for quick exploration without logging in.
- `true` (production): all business endpoints require a valid JWT. Set automatically in the `prod` profile.

### What is never logged or returned

- Passwords or password hashes
- JWT tokens or signing secrets
- OpenAI API keys
- Stack traces in API responses (all 500s return `"Internal server error"` to clients)

---

## API Overview

All endpoints are under `/api`. Consistent error response format:

```json
{
  "timestamp": "2026-06-21T18:00:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "Story not found",
  "path": "/api/stories/abc",
  "fieldErrors": {}
}
```

| Prefix | Scope |
|--------|-------|
| `/api/auth/**` | Authentication (always public) |
| `/api/projects/**` | Project management |
| `/api/stories/**` | Story management, analysis, generation |
| `/api/test-suites/**` | Test suite listing and detail |
| `/api/review/**` | Test case review workflow |
| `/api/export/**` | Test export (Markdown, CSV, JSON, Playwright, Postman, Jira, Azure DevOps) |
| `/api/dashboard/**` | Metrics and recent activity |
| `/api/settings/**` | AI provider and application settings |
| `/api/audit/**` | Audit trail (ADMIN only) |
| `/api/admin/**` | User administration (ADMIN only) |
| `/api/health` | Health check (always public) |

---

## Testing

### Run backend tests

```bash
cd backend
mvn test
```

Tests use a mock AI provider. No real AI credentials or database required for unit/slice tests.

### Run frontend unit tests

```bash
cd frontend
npm test -- --watch=false --browsers=ChromeHeadless
```

### Run frontend build

```bash
cd frontend
npm run build
```

### Run Playwright e2e tests

Start the full local stack first:

```bash
docker compose up -d

cd backend
mvn spring-boot:run

cd ../frontend
npm start
```

Then run the suite from another terminal:

```bash
cd frontend
npm run e2e
```

Use `npm run e2e:ui` to debug interactively.

TestCaseIQ exports Playwright suites and is itself tested with Playwright.

## CI Pipeline

Runs on every push and pull request to `main`:

1. **Secret hygiene** — blocks committed `.env` files and obvious API keys
2. **Backend tests** — Maven test suite on Java 21 with cached dependencies
3. **Frontend tests and build** — Karma unit tests plus Angular production build on Node.js 24 with cached npm dependencies
4. **Playwright e2e** — starts PostgreSQL, Redis, Spring Boot in mock AI mode, Angular on port 4200, then runs the Chromium e2e suite

---

## Repository Structure

```
testcaseiq/
  frontend/          Angular 22 application
  backend/           Spring Boot 3 API
  docker/            Docker environment notes and example values
  docs/              Architecture, roadmap, sprint, AI pipeline, and contribution notes
  prompts/           AI prompt templates
  evals/             Evaluation assets
  docker-compose.yml Local PostgreSQL 16 and Redis 7
  .github/workflows/ CI pipeline
```

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Sprints](docs/SPRINTS.md)
- [AI Pipeline](docs/AI_PIPELINE.md)
- [Contributing](docs/CONTRIBUTING.md)

---

## License

MIT. See [LICENSE](LICENSE).
