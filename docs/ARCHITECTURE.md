# Architecture

TestCaseIQ starts as a small monorepo with clear boundaries:

- `frontend/` contains the Angular application.
- `backend/` contains the Spring Boot API.
- `docker-compose.yml` runs local PostgreSQL and Redis.
- `docs/` captures project direction and engineering notes.
- `prompts/` is reserved for future prompt assets.
- `evals/` is reserved for future evaluation assets.

## Current Runtime

The Angular app runs on `http://localhost:4200` and proxies `/api` requests to the Spring Boot backend at `http://localhost:8080`.

The backend exposes `GET /api/health`, returning application status, service name, and a timestamp.

PostgreSQL and Redis are available for future features, but there are no database entities, authentication flows, AI workflows, or test case generation features yet.

## Planned Direction

Future architecture work may introduce domain modules, persistence, background jobs, AI pipeline design, and evaluation harnesses only after the public foundation is stable.
