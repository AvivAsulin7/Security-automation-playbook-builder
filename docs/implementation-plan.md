# Implementation Plan

Slice scope, tests and status. Per-slice workflow: CLAUDE.md "Development workflow". Validation rules and payloads: `docs/api-contract.md`. Data model rules: `backend-standards` "Database & Simulation".

Status legend: ☐ not started · ◐ in progress · ☑ done

## Approved decisions (D1–D6)
Approved by the user on 2026-11-04.

| # | Decision | Approved choice |
|---|----------|----------|
| D1 | Server dependencies | `express`, `cors`, `zod`, `@prisma/client`, `bcrypt`, `jsonwebtoken`; dev: `prisma`, `typescript`, `tsx`, `vitest`, `supertest`, `eslint`, `@types/*` |
| D2 | Client dependencies | `react-router-dom`, `@mui/material`, `@emotion/react`, `@emotion/styled`; dev: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `eslint` |
| D3 | Cross-origin | Server enables CORS for `CLIENT_ORIGIN` (Vite proxy would clash with the `/playbooks` client route) |
| D4 | Test database | Separate `playbooks_test` database in the same Docker Postgres container; before each integration test, empty all tables with `TRUNCATE` (rows only; schema stays). The reset helper refuses to run unless `DATABASE_URL` points to `playbooks_test` |
| D5 | Ports | Server `4000`, client `5173`, Postgres `5432` |
| D6 | Client routes | `/login`, `/playbooks`, `/simulate`; `/` redirects to `/playbooks` |

If `bcrypt`'s native build fails on Windows, stop and ask; suggested alternative: `bcryptjs` (same API).

**Version notes (local Node 20.20):** pin `typescript@~5.9` (typescript-eslint does not support TS 7), `eslint@9`, `prisma@6` / `@prisma/client@6`, `vitest@4` (vitest 5 needs Node 22), `jsdom@27`; `vite@8` + `@vitejs/plugin-react@6`, `express@5`, `zod@4`. ESLint/build tooling implied by D1/D2: `@eslint/js`, `globals`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `vite`, `@vitejs/plugin-react`, `@testing-library/dom`, `@types/*`. No `dotenv`: use Node/tsx `--env-file`.

## ☑ Slice 0 — Setup (~1h, branch `slice-0/setup`)
**Scope**
- `docker-compose.yml`: Postgres with init script creating `playbooks` and `playbooks_test`.
- Database viewer: Prisma Studio via `npm run db:studio` (server).
- `server/`: strict TS, `src/config/env.ts` (Zod-validated env), `src/lib/prisma.ts` (shared client), `src/errors/AppError.ts`, central error handler returning `{ error: { code, message, details? } }` (`details` only on `400` validation errors; `500` sanitized), `GET /health`, `app.ts` / `server.ts` split for Supertest.
- `client/`: Vite + React + TS, `src/theme.ts` MUI theme (blue / black / gray palette, typography, component defaults), `src/AppRoutes.tsx` with three routes and placeholder pages, `src/test/` setup and `renderWithProviders`, `src/api/client.ts` (typed `fetch`, Bearer header, `ApiError` with `details`, 401 handler invoked only when a token was sent).
- ESLint + `dev`, `lint`, `typecheck`, `test`, `build` scripts on both sides.
- `.env.example` for server and client; `.gitignore`; README skeleton (UTF-8).

**Done when**
- `docker compose up -d` starts Postgres; `npm run dev` runs both apps; `/health` returns 200.
- `npm run db:studio` opens Prisma Studio.
- All checks pass on both sides; tests cover the error handler (400 with `details`, 404, sanitized 500) and the API client (Bearer header, 204, error parsing, 401 handler only with a token).

## ◐ Slice 1 — Authentication (~2h, branch `slice-1/authentication`)
**Backend**
- Prisma `User` model (per `backend-standards` "Database & Simulation") + migration.
- `modules/auth`: routes, controller, service, repository, Zod schemas (rules per contract "Authentication").
- bcrypt hash; JWT signed with `JWT_SECRET`, expiry `JWT_EXPIRES_IN` (approved: `24h`, for demo convenience).
- `middleware/requireAuth.ts`: verifies Bearer JWT, sets `req.userId`.

**Frontend**
- Login/Register page: one form, email + password, **Login** and **Register** buttons (sketch: `docs/sketches/login-register-page.png`); field errors, server error, pending state.
- `src/AuthContext.tsx`: token + user in localStorage, `login` / `logout`; `src/components/ProtectedRoute.tsx`; logout button in layout.
- Auth types in `src/types.ts` (`User`, `AuthResponse`, credentials).
- API client clears auth and redirects to `/login` on 401 from an authenticated request (token sent); a failed login shows "invalid credentials" without logging out.

**Tests**
- Integration: register 201 (stored password is a bcrypt hash, never plaintext) / 400 (bad email, password < 8 or > 72) / 409 (including different email case), login 200 / 401 (same message for unknown email and wrong password), protected route without/invalid token → 401.
- UI: validation errors, successful login navigates, failed login shows error and stays on page.

## ☐ Slice 2 — Playbook Management (~2.5h, branch `slice-2/playbook-management`)
**Backend**
- Prisma `Trigger` / `Action` enums and `Playbook` model (per `backend-standards` "Database & Simulation") + migration.
- `modules/playbooks`: `GET /playbooks`, `POST /playbooks`, `DELETE /playbooks/:id`, all scoped to `req.userId`.
- Zod schemas (rules per contract "Playbooks").

**Frontend**
- Create Playbook page, two columns (sketch: `docs/sketches/create-playbook-page.png`):
  - Left: name, trigger select, three action checkboxes (≥1 required), Create button.
  - Right: existing playbooks with trigger/actions and Delete (confirm dialog).
- Custom hooks: `usePlaybooks` (list), `useCreatePlaybook` / `useDeletePlaybook` (refetch the list on success); loading, error, empty states; success/error feedback.
- `Playbook`, `Trigger`, `Action`, create request in `src/types.ts`; trigger/action labels in `src/constants.ts`.

**Tests**
- Integration: create 201 (action order preserved) / 400 cases (blank or > 100-char name, 0 / 4 / duplicate actions, bad trigger), list returns only own and newest first, delete 204, other user's → 404, malformed id → 404, unauthenticated → 401.
- UI: form validation, create adds to list, empty state, delete with confirmation.

## ☐ Slice 3 — Simulation (~1.5h, branch `slice-3/simulation`)
**Backend**
- `modules/simulation`: `POST /simulateTrigger`, Zod trigger validation, service reuses `PlaybookRepository.findByUserAndTrigger`. Read-only; no execution, no persistence.

**Frontend**
- `useSimulateTrigger` custom hook (run, `isPending`, `error`, result).
- Simulate Event page (sketch: `docs/sketches/simulation-page.png`): trigger select + **Run Simulation**; "Matching Playbooks" list, each playbook with its actions as → items; empty-result message; loading/error states.
- Navigation between Create Playbook and Simulate Event.

**Tests**
- Integration: returns all own matches newest first with ordered actions, excludes other users' and other triggers, no match → `[]`, invalid trigger → 400, unauthenticated → 401.
- UI: results render, empty state, error state.

## ☐ Final — Review and delivery (~1h)
- Project-wide `code-reviewer` pass; fix confirmed findings.
- No E2E tests (approved); verify the full flow manually and document it as the README demo flow.
- README per CLAUDE.md "Delivery"; trade-offs to cover: localStorage token, no edit, fixed trigger set.
- Follow README from a clean clone to verify.
- ZIP excluding `node_modules`, `dist`, `.env`, coverage.

**Estimated total:** 7–9 hours.
