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
- `backend/`: Spring Boot API with domain services, persistence, AI provider abstraction, validation, and export generation.
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

To enable a real AI provider, configure the provider and key through local environment/config values. Do not commit real `.env` files, production secrets, or API keys.

AI output is validated before persistence so malformed or unsafe generated structures can be rejected before they become reviewable test assets.

## Exports

Exports are based on approved test cases from the review workflow.

Supported export targets:

- Markdown for readable QA documentation.
- CSV for spreadsheet-friendly review and handoff.
- JSON for structured downstream processing.
- Playwright `.spec.ts` draft skeletons for UI automation starting points.
- Postman Collection JSON drafts for API testing starting points.

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
