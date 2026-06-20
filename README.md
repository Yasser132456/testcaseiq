# TestCaseIQ

TestCaseIQ is the public foundation for a future test intelligence platform that helps teams turn product intent into reliable QA coverage.

This repository currently contains only the initial monorepo shell:

- Angular frontend
- Spring Boot backend
- PostgreSQL for future persistence
- Redis for future caching and background workflow support
- Docker Compose for local infrastructure

Authentication, AI workflows, test case generation, story management, database entities, and third-party tool integrations are intentionally not implemented yet.

## Stack

- Frontend: Angular
- Backend: Spring Boot with Spring Web
- Infrastructure: PostgreSQL, Redis, Docker Compose
- Language/runtime: TypeScript, Java 21
- Build tools: npm, Maven

## Repository Structure

```text
testcaseiq/
  frontend/          Angular app
  backend/           Spring Boot API
  docker/            Docker-related notes and example environment values
  docs/              Architecture, roadmap, sprint, AI pipeline, and contribution notes
  prompts/           Reserved for future prompt assets
  evals/             Reserved for future evaluation assets
  docker-compose.yml Local PostgreSQL and Redis
```

## Prerequisites

- Node.js 20+
- npm 10+
- Java 21, or Java 17 if Java 21 is not available
- Maven 3.9+
- Docker Desktop or Docker Engine with Compose

## Local Setup

Start PostgreSQL and Redis:

```bash
docker compose up -d
```

Run the backend:

```bash
cd backend
mvn spring-boot:run
```

The API starts at `http://localhost:8080`.

Check backend health:

```bash
curl http://localhost:8080/api/health
```

Expected shape:

```json
{
  "status": "UP",
  "service": "TestCaseIQ API",
  "timestamp": "2026-06-13T00:00:00Z"
}
```

Run the frontend:

```bash
cd frontend
npm install
npm start
```

The Angular app starts at `http://localhost:4200`.

The frontend development server proxies `/api` requests to `http://localhost:8080`, so the TestCaseIQ landing page can call `/api/health`.

## Environment Files

Example environment files are included for documentation:

- `.env.example`
- `backend/.env.example`
- `frontend/.env.example`
- `docker/.env.example`

Do not commit real `.env` files or production secrets.

## CI Quality Gates

GitHub Actions runs the repository quality gates on pull requests targeting `main` and on pushes to `main`.

The CI workflow currently runs:

- Secret hygiene checks that fail on committed `.env` files or obvious OpenAI-style API keys.
- Backend tests with Java 21 and cached Maven dependencies:

  ```bash
  cd backend
  mvn test
  ```

- Frontend install and production build with Node.js 20 and cached npm dependencies:

  ```bash
  cd frontend
  npm ci
  npm run build
  ```

Backend CI sets `AI_PROVIDER=mock` and leaves `OPENAI_API_KEY` empty, so tests do not require real AI credentials and must not make external AI calls. The frontend gate is build-only for this sprint; browser-based Angular tests are not forced in CI until they have a stable CI runner configuration.

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for the current phased direction.

Near-term focus:

- Keep the public repository safe and runnable.
- Keep the app limited to the landing page and backend health endpoint.
- Design future story, AI, and evaluation workflows before implementation.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Sprints](docs/SPRINTS.md)
- [AI Pipeline](docs/AI_PIPELINE.md)
- [Contributing](docs/CONTRIBUTING.md)

## License

MIT. See [LICENSE](LICENSE).
