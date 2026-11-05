# Security Automation Playbook Builder

A minimal web app for creating security automation playbooks (one trigger, 1–3 actions) and simulating which actions *would* run when a trigger fires. Simulation is display-only; no real security action is ever executed.

> Status: all features complete (authentication, playbook management, simulation). Final review and delivery next — see [docs/implementation-plan.md](docs/implementation-plan.md).

## Stack
- **Client:** React, Vite, TypeScript, MUI, React Router
- **Server:** Node.js, Express, TypeScript, Zod, Prisma
- **Database:** PostgreSQL 16 (Docker Compose)
- **Tests:** Vitest, React Testing Library, Supertest

## Prerequisites
- Node.js **20.19+** and npm
- Docker Desktop

## Setup

### 1. Start PostgreSQL
```bash
docker compose up -d
```
Creates the `playbooks` database and a separate `playbooks_test` database for integration tests (local credentials `playbooks` / `playbooks`, port `5432`).

The test database is created only on the container's first start. If you already had a `postgres-data` volume from an earlier run, recreate it with `docker compose down -v && docker compose up -d`.

### 2. Server
```bash
cd server
cp .env.example .env      # then set JWT_SECRET to a long random string
npm install
npm run db:migrate        # create the database tables
npm run dev
```
API: http://localhost:4000 — health check: http://localhost:4000/health

### 3. Client
```bash
cd client
cp .env.example .env
npm install
npm run dev
```
App: http://localhost:5173

## Environment variables

| File | Variable | Description |
|------|----------|-------------|
| `server/.env` | `NODE_ENV` | `development` / `test` / `production` |
| | `PORT` | API port (default `4000`) |
| | `CLIENT_ORIGIN` | Allowed CORS origin (the client URL) |
| | `DATABASE_URL` | PostgreSQL connection string |
| | `JWT_SECRET` | Secret for signing login tokens (at least 32 characters) |
| | `JWT_EXPIRES_IN` | Token lifetime, e.g. `24h` (default) |
| `client/.env` | `VITE_API_URL` | Base URL of the API |

`.env` files are git-ignored; only `.env.example` files are committed.

## Scripts

| Command | Server | Client |
|---------|--------|--------|
| `npm run dev` | API with reload | Vite dev server |
| `npm run lint` | ESLint | ESLint |
| `npm run typecheck` | `tsc --noEmit` | `tsc --noEmit` |
| `npm test` | Vitest + Supertest | Vitest + Testing Library |
| `npm run build` | Compile to `dist/` | Production bundle |
| `npm run db:migrate` | Apply/create Prisma migrations (dev database) | — |
| `npm run db:studio` | Prisma Studio (browse the database) | — |

Server tests run against `playbooks_test`, never the development database; start PostgreSQL first. `npm test` applies migrations to the test database automatically and empties its tables before each test.

## Project structure
```
client/   React app (src/api, src/pages, src/components, theme, routes)
server/   Express API (src/config, src/lib, src/errors, src/middleware) and prisma/
docs/     API contract, implementation plan and page sketches
docker/   PostgreSQL init script (creates the test database)
```

## API
See [docs/api-contract.md](docs/api-contract.md).

## Known limitations
- `npm audit` may report advisories in development tooling (Prisma CLI, ESLint). They only process this project's own files at build time; fixing them requires major upgrades, deferred for this exercise.
