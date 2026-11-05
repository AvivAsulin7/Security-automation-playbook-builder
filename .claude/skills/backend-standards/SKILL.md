---
name: backend-standards
description: Use when creating or changing Node.js/TypeScript backend code, including Express, Prisma, authentication, validation and tests.
---

# Backend Standards

Build modular, secure, testable Node.js/TypeScript/Express code. Prioritize readability and simplicity over unnecessary abstractions.

## Architecture

**Route → Controller → Service → Repository → Prisma**

- **Route:** Endpoint registration and middleware.
- **Controller:** HTTP input/output; delegates to services.
- **Service:** Business logic, orchestration and authorization.
- **Repository:** Database queries and persistence.
- **Prisma:** Models, constraints and migrations.

Rules:
- Prisma access only through repositories.
- No business logic in controllers or repositories.
- Services must not depend on Express Request/Response.
- Reuse repositories for the same entity; avoid generic base layers.

## Structure

- `src/modules/` — feature modules with routes, controllers, services, repositories and Zod schemas.
- `src/middleware/` — authentication, error and not-found handlers.
- `src/errors/` — AppError and error helpers.
- `src/config/env.ts` — Zod-validated environment.
- `src/lib/prisma.ts` — single shared Prisma client.
- `src/app.ts` — Express app for Supertest.
- `src/server.ts` — HTTP listener.
- `prisma/` — schema and migrations.

Modules:
- **auth:** AuthController → AuthService → AuthRepository.
- **playbooks:** PlaybookController → PlaybookService → PlaybookRepository.
- **simulation:** SimulationController → SimulationService → PlaybookRepository.

Do not create a SimulationRepository without separate persistence needs. Add folders only when necessary.

File names are feature-prefixed (`auth.routes.ts`, `auth.controller.ts`, `auth.service.ts`, `auth.repository.ts`, `auth.schemas.ts`); tests are colocated (`auth.test.ts`).

## TypeScript & Clean Code

- Strict typing; no `any`. Use explicit contracts and descriptive names.
- Use `async/await`; avoid blocking synchronous operations.
- Keep methods small, focused and at one abstraction level (SRP).
- Prefer immutable values, composition and dependency injection when useful for tests.
- Avoid God classes, static mutable state, deep inheritance, unnecessary interfaces and generic abstractions.
- Comments explain non-obvious decisions, not obvious code.

## Validation, Auth & Errors

- Validate all external input at HTTP boundaries with feature-local Zod schemas; use validated data in services.
- Validate UUID route params before database access; malformed `:id` → `404`.
- Follow `docs/api-contract.md` for validation rules, responses and status codes.
- Hash passwords asynchronously with bcrypt; verify credentials and issue expiring JWTs.
- Protect private endpoints; derive `userId` only from verified JWTs.
- Enforce ownership in services and repository queries; never trust client-supplied `userId`.
- Never expose password hashes, credentials, tokens or secrets.
- Use centralized error handling for validation, auth, not-found and database failures, returning the contract error shape (`{ error: { code, message, details? } }`); never expose internal stack traces.

## Database & Simulation

- PostgreSQL + Prisma; modify schemas through migrations only.
- **User:** UUID id, unique normalized email, passwordHash, timestamps.
- **Playbook:** UUID id, name, trigger, ordered `Action[]`, userId FK (cascade delete), timestamps.
- Use Prisma enums for `Trigger` and `Action`; no separate trigger/action tables.
- Index `(userId, trigger)`; scope reads/deletes to the authenticated user.
- Missing or unowned playbook → `404`; duplicate email (`P2002`) → `409`.
- Keep all database operations in repositories.

Simulation:
- Match playbooks by authenticated user and selected trigger.
- Return matching playbooks with actions in their original order.
- Never execute actions. Do not persist simulation history without approval.

## Testing & Review

- **Vitest + Supertest**; follow Arrange / Act / Assert.
- Integration tests (Supertest + dedicated test database) are the primary tests: HTTP behavior, status codes, validation, authentication, ownership and simulation.
- Add unit tests only where integration tests cannot cover a rule well (e.g. pure helper logic); do not duplicate integration coverage with mocks.
- Use `it.each` for similar validation cases instead of near-duplicate tests.
- Keep tests isolated and deterministic.
- Manual live checks (e.g. `curl` against `npm run dev`) hit the development database: delete the users they create (by exact email) afterwards and report it to the user.

Before finishing, verify:
- Correct layer boundaries and repository-only database access.
- Input validation, authentication, ownership and async error handling.
- No duplicated business logic or unnecessary abstractions.
- Relevant tests added and executed.