# Security Automation Playbook Builder

A minimal full-stack web app for building and simulating security automation playbooks.

A **playbook** has a name, exactly **one trigger** (Malware Detected, Login Attempt, Phishing Alert) and **1–3 actions** (Isolate Host, Notify Admin, Block IP). Users register, manage their own playbooks, and **simulate** a trigger to see which playbooks would run and in what order. Simulation is display-only — no real security action is ever executed.

## Features
- **Authentication** — email/password registration and login, bcrypt-hashed passwords, JWT bearer tokens, protected API and client routes.
- **Playbook management** — create, list (newest first) and delete your own playbooks; actions keep the order you select them in.
- **Simulation** — choose a trigger and see every matching playbook with the actions that *would* run.
- **Three screens** following the assignment sketches: Login/Register, Create Playbook (form + list), Simulate Event (results).

## Stack
| Area | Technology |
|------|------------|
| Client | React 19, Vite, TypeScript, MUI, React Router |
| Server | Node.js, Express 5, TypeScript, Zod, Prisma 6 |
| Database | PostgreSQL 16 (Docker Compose) |
| Tests | Vitest, Supertest, React Testing Library |
| Quality | ESLint, strict TypeScript |

## Prerequisites
- **Node.js 20.19+** (or 22.12+) and npm
- **Docker Desktop** (running)

## Quick start
Run each block from the repository root. On Windows PowerShell, use `copy` instead of `cp`.

**1. Start PostgreSQL**
```bash
docker compose up -d
```

**2. Server** (terminal 1)
```bash
cd server
cp .env.example .env      # then set JWT_SECRET to a long random string (≥ 32 chars)
npm install
npm run db:migrate        # creates the tables in the development database
npm run dev               # http://localhost:4000  (health: /health)
```

**3. Client** (terminal 2)
```bash
cd client
cp .env.example .env
npm install
npm run dev               # http://localhost:5173
```

Open http://localhost:5173 — you are redirected to the login page.

## Demo flow
1. **Register** with any email and a password of at least 8 characters → you land on **Create Playbook**, with your email in the app bar.
2. Click **Create** with an empty form → field errors (name, trigger, actions).
3. Create **"Critical Malware Response"**: trigger *Malware Detected*, select *Isolate Host* then *Notify Admin* (the "Run order" hint follows your selection) → a "Playbook created" notice appears and it is listed on the right.
4. Create **"Alert & Contain"**: *Malware Detected*, *Notify Admin* then *Block IP*; and **"Login Watch"**: *Login Attempt*, *Block IP*.
5. Open **Simulate Event**, choose *Malware Detected* → **Run Simulation** → "Matching Playbooks (2)", newest first, each with its actions as ordered "→" items.
6. Choose *Phishing Alert* → **Run Simulation** → "No playbooks match Phishing Alert."
7. Back on **Create Playbook**, **Delete** "Login Watch" → confirm in the dialog → it disappears.
8. **Logout**, register a second user → the first user's playbooks are not visible (per-user ownership).

## Environment variables
| File | Variable | Description |
|------|----------|-------------|
| `server/.env` | `NODE_ENV` | `development` / `test` / `production` |
| | `PORT` | API port (default `4000`) |
| | `CLIENT_ORIGIN` | Allowed CORS origin — the client URL |
| | `DATABASE_URL` | PostgreSQL connection string (development database) |
| | `JWT_SECRET` | Secret for signing tokens, at least 32 characters |
| | `JWT_EXPIRES_IN` | Token lifetime, e.g. `24h` (default) |
| `client/.env` | `VITE_API_URL` | Base URL of the API |

Only `.env.example` files are committed; `.env` files are git-ignored. The server validates its environment at startup and refuses to start with a clear message if a variable is missing or invalid.

## Database
- `docker compose up -d` starts one PostgreSQL container (bound to `127.0.0.1:5432`, local credentials `playbooks` / `playbooks`) with **two databases**:
  - `playbooks` — development data used by `npm run dev`, `db:migrate` and Prisma Studio.
  - `playbooks_test` — used only by the server test suite.
- **Migrations** live in `server/prisma/migrations`. `npm run db:migrate` applies them to the development database; `npm test` applies them to the test database automatically.
- **Browse data:** `cd server && npm run db:studio` (Prisma Studio on http://localhost:5555).
- The test database is created on the container's **first** start. If you already had a `postgres-data` volume, recreate it with `docker compose down -v && docker compose up -d` (this deletes local data).

## Scripts
| Command | Server | Client |
|---------|--------|--------|
| `npm run dev` | API with reload | Vite dev server |
| `npm test` | Vitest + Supertest (needs Docker running) | Vitest + Testing Library |
| `npm run lint` | ESLint | ESLint |
| `npm run typecheck` | `tsc --noEmit` | `tsc --noEmit` |
| `npm run build` | Compile to `dist/` | Production bundle |
| `npm run db:migrate` | Apply/create migrations (development DB) | — |
| `npm run db:studio` | Prisma Studio | — |

## Testing
- **Server (71 tests)** — integration tests through the real HTTP stack (Supertest) against `playbooks_test`: status codes and bodies for every endpoint, validation (table-driven with `it.each`), authentication and JWT rejection cases, per-user ownership (another user's playbook is invisible and cannot be deleted; a client-supplied `userId` is ignored), action ordering, newest-first sorting, and that simulation never modifies data. A few unit tests cover the error handler and the test-database guard.
- **Client (55 tests)** — React Testing Library tests of user-visible behaviour with the API mocked: form validation, server errors, loading/empty/error states, create/delete flows with confirmation, simulation results, protected routes, logout and 401 handling.
- **Test-database safety:** before every server integration test all tables in `playbooks_test` are truncated (rows only). The reset refuses to run unless the connection points to `playbooks_test`, and test files run sequentially because they share the database.

```bash
cd server && npm test
cd client && npm test
```

## API
Full contract: [docs/api-contract.md](docs/api-contract.md). Errors always use `{ "error": { "code", "message", "details?" } }` (`details` only for `400` validation errors).

| Method | Path | Auth | Success | Notes |
|--------|------|------|---------|-------|
| POST | `/auth/register` | — | `201 { user, token }` | `409` duplicate email |
| POST | `/auth/login` | — | `200 { user, token }` | `401` same message for unknown email / wrong password |
| GET | `/playbooks` | Bearer | `200 { playbooks }` | own playbooks, newest first |
| POST | `/playbooks` | Bearer | `201 { playbook }` | `400` invalid input |
| DELETE | `/playbooks/:id` | Bearer | `204` | `404` not found, not owned or malformed id |
| POST | `/simulateTrigger` | Bearer | `200 { playbooks }` | matches for the trigger; `[]` if none |

## Architecture

### Server
```
Route → Controller → Service → Repository → Prisma (PostgreSQL)
```
- **Route** wires the path and middleware (`requireAuth`).
- **Controller** parses input with Zod and maps results to HTTP; no business logic.
- **Service** holds business rules (ownership, 404/409 decisions); no Express types.
- **Repository** is the only place that uses Prisma; every playbook query is scoped by the authenticated `userId`.
- A central error handler turns Zod errors, `AppError`s and body-parser errors into the contract error shape; unexpected errors become a sanitized `500`.

```
server/
  prisma/              schema.prisma, migrations
  src/
    config/env.ts      Zod-validated environment
    lib/prisma.ts      shared Prisma client
    errors/            AppError
    middleware/        requireAuth (JWT), errorHandler
    modules/
      auth/            routes, controller, service, repository, schemas, tests
      playbooks/       routes, controller, service, repository, schemas, tests
      simulation/      routes, controller, service, schemas, tests (reuses the playbooks repository)
    test/              test DB setup/reset and request helpers
    app.ts / server.ts app factory (used by Supertest) / HTTP listener
```

**Data model:** `User (id UUID, email unique, passwordHash)` 1 — * `Playbook (id UUID, name VARCHAR(100), trigger enum, actions enum[] ordered, userId FK with cascade delete)`, indexed on `(userId, trigger)`.

### Client
```
client/src/
  api/          typed fetch client (ApiError, token storage) and endpoint functions
  hooks/        useAuth, usePlaybooks (load + refetch), useAsyncAction (user-triggered requests)
  components/   AppLayout, ProtectedRoute, TriggerSelect, PlaybookList, ConfirmDialog, QueryState
  pages/        LoginPage, PlaybooksPage, SimulatePage
  AuthContext.tsx, AppRoutes.tsx, theme.ts, types.ts, constants.ts
```
- Pages compose shared components and call the API only through hooks; components receive typed props and never fetch.
- A single MUI theme defines the blue / black / gray palette; no custom CSS.

### Authentication flow
1. Login/register returns `{ user, token }`; the JWT (`sub` = user id, HS256, 24h) is stored with the user in `localStorage`.
2. The API client adds `Authorization: Bearer <token>` to protected requests; the server verifies it and derives `userId` from the token only.
3. A `401` on a request that sent a token logs the user out and redirects to `/login`; a failed login just shows an error.

## Trade-offs and decisions
- **JWT in `localStorage`** — simple and survives refresh; it is readable by scripts, so XSS would expose it (React escapes output and no raw HTML is rendered). An `httpOnly` cookie would avoid this at the cost of CSRF handling.
- **Stateless JWT, 24h, no refresh token** — logout clears the token in the browser only; a token stays valid until it expires.
- **Logout in one tab is not propagated** to other open tabs until they refresh or make their next authenticated request.
- **No editing** — optional in the assignment; create and delete only.
- **Fixed trigger and action sets** — the assignment's examples, stored as database enums.
- **No data-fetching library** — `fetch` with two small hooks covers three screens; only automatic reads are aborted when superseded.
- **Integration-first testing, no E2E** — the API is tested end-to-end against a real database and the UI with mocked API calls; the full flow was verified manually (demo flow above).
- **Duplicate playbook names are allowed.**

## Known limitations
- `npm audit` reports advisories in the Prisma 6 CLI dependency `deepmerge-ts` (development tooling only; fixing requires Prisma 7, a major upgrade) and in ESLint's `minimatch`.
- Vite warns that the client bundle exceeds 500 kB (≈ 169 kB gzipped), mostly React + MUI. Code splitting three small pages would save little, so it was left as one chunk.

## Project documents
- [docs/api-contract.md](docs/api-contract.md) — REST contract shared by client and server
- [docs/implementation-plan.md](docs/implementation-plan.md) — delivery plan, approved decisions and slice status
- [docs/sketches/](docs/sketches/) — page layout sketches from the assignment
- `CLAUDE.md`, `.claude/` — development guidelines and review agent used while building the project
