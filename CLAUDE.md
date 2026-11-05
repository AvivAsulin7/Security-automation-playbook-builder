# Security Automation Playbook Builder

Check Point home assignment (0.5–1 day). Build a minimal, secure playbook builder. Prioritize correctness, readability, simplicity, and assignment compliance.

**Scope discipline:** implement only what the assignment requires; prefer the least code that meets requirements, evaluation criteria and tests. No extra features, layers, files or abstractions without approval.

## Stack

- **Frontend:** React, Vite, TypeScript, MUI, React Router; `fetch` with custom hooks for data, loading and errors.
- **Backend:** Node.js, TypeScript, Express, Zod.
- **Database:** PostgreSQL, Prisma; Docker Compose (dev + test DB); Prisma Studio.
- **Auth:** JWT, bcrypt, localStorage.
- **Testing/Quality:** Vitest, React Testing Library, Supertest, ESLint.

## Project Structure & Sources of Truth

- `client/` — React frontend; follow `frontend-standards`.
- `server/` — Express backend; follow `backend-standards`.
- `.claude/skills/` — development standards and `git-workflow`.
- `.claude/agents/code-reviewer.md` — independent reviewer.
- `docs/api-contract.md` — authoritative API requests, responses, and status codes. Read it before implementing or reviewing API-related functionality.
- `docs/implementation-plan.md` — slice scope, tests, progress, and decisions. Update status upon completion.
- `docs/sketches/` — page layout references; inspect before implementing or reviewing a page.
- `docker-compose.yml` — PostgreSQL development and test databases.

## Requirements

**Authentication:** Register/login with email and password; persist users, hash passwords, issue JWTs, protect routes.

**Playbooks:** Create, list, and delete user-owned playbooks. Each has a name, exactly one trigger, and 1–3 predefined actions. Editing is optional and requires approval.

**Simulation:** Select a trigger and display matching playbooks with actions that *would* execute.

- **Triggers:** Malware Detected, Login Attempt, Phishing Alert.
- **Actions:** Isolate Host, Notify Admin, Block IP.
- **Backend modules:** `auth`, `playbooks`, `simulation`.

**REST endpoints:**

- `POST /auth/register`, `POST /auth/login`
- `GET /playbooks`, `POST /playbooks`, `DELETE /playbooks/:id`
- `POST /simulateTrigger`

Follow `docs/api-contract.md` for exact behavior. Use asynchronous backend operations and persistent storage.

**Evaluation criteria:** readability, REST integration, separation of concerns, reusable components, error handling, tests, and documentation.

## Security & Quality

- Never log or commit secrets, passwords, tokens, or private keys; never store plaintext passwords.
- Validate external input, authenticate protected endpoints, and enforce ownership server-side. Never trust client-provided `userId`.
- Never execute security actions during simulation.
- Follow separation of concerns, reusable components, consistent error handling, and appropriate tests.

## Development Workflow

Implement vertical slices: **Setup → Authentication → Playbooks → Simulation → Final Review**.

For each slice:

1. Read `docs/implementation-plan.md`; present a concise plan and **wait for approval**.
2. Implement backend, frontend, and relevant tests.
3. Run lint, typecheck, tests, and build.
4. Invoke the independent `code-reviewer`.
5. Fix confirmed findings and rerun checks.
6. Follow `git-workflow`; obtain approval before push or PR.

Do not start the next slice without approval. Perform a final project-wide review before delivery.

## Decision Authority

**The user approves all decisions.** Stop and ask before acting on any assumption, ambiguity, unexpected issue, or choice affecting scope, design, architecture, API, dependencies/versions, file structure, naming, tooling, infrastructure, workarounds, or the approved plan.

Provide one recommended solution with a brief explanation. Approval applies **only to the explicitly approved action**; never infer permission to start another step.

## Operating Rules

- Before implementing, check module ownership, existing reusable code, API contract, auth/ownership, error handling, and test impact.
- Re-read any changed `CLAUDE.md`, skill, agent, API contract, or implementation plan before continuing.
- Prefer minimal diffs, existing patterns, and simple solutions; avoid unnecessary abstractions or boilerplate.
- Never claim checks passed unless executed.
- Never automatically merge, force-push, or modify remote settings.

## Delivery

Submit ZIP/RAR with README covering prerequisites, environment variables, Docker/database setup, migrations, run/test commands, demo flow, architecture, and trade-offs.

Include `.env.example` without secrets.
