# Contributing

Thanks for considering a contribution to TestCaseIQ.

## Local Setup

1. Install Node.js, npm, Java, Maven, and Docker.
2. Start infrastructure with `docker compose up -d`.
3. Start the backend from `backend/` with `mvn spring-boot:run`.
4. Start the frontend from `frontend/` with `npm install` and `npm start`.

## Guidelines

- Keep secrets out of the repository.
- Use `.env.example` files to document required configuration.
- Keep changes scoped and include tests when behavior changes.
- Do not add authentication, AI, database entities, test generation, or third-party integrations without a tracked design discussion.

## Pull Requests

Before opening a pull request, run the relevant local checks:

```bash
cd backend
mvn test

cd ../frontend
npm run build
```
