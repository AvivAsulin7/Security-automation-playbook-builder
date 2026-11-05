---
name: frontend-standards
description: Use when creating or changing React/Vite/TypeScript frontend code, including components, hooks, routing, MUI, API integration and tests.
---

# Frontend Standards

Build clean, reusable, typed React code. Prefer simplicity and consistency over unnecessary abstractions.

## Structure

Folders:
- `src/api/` — typed `fetch` client and domain API functions.
- `src/pages/` — the three route-level pages.
- `src/components/` — reusable and layout components (including `ProtectedRoute`).
- `src/hooks/` — custom data hooks.
- `src/assets/` — static assets, only if any are needed.

Single files in `src/`:
- `main.tsx`, `AppRoutes.tsx`, `AuthContext.tsx`.
- `theme.ts` — centralized MUI theme.
- `types.ts` — shared API/domain types aligned with `docs/api-contract.md`.
- `constants.ts` — route paths and trigger/action labels.
- `test/setup.ts` and `test/renderWithProviders.tsx` — test setup and helpers only.

One file per component (`ComponentName.tsx`), with its props type declared in the same file.
Split a single file into a folder only when it grows too large; ask first.

## React & TypeScript

- Strict TypeScript; no `any`. Use `unknown` with narrowing.
- Type all props; use function components and hooks.
- Follow SRP, descriptive naming, composition and unidirectional data flow.
- Keep presentational components free of API calls and business operations; pass typed data and callbacks.
- Keep local UI state in children; lift only when shared.
- Extract complex/reusable logic into hooks; avoid duplicated logic.
- Avoid unnecessary `useEffect`, `useMemo` and `useCallback`.

## Shared Components

- Prefer existing MUI components over custom wrappers.
- Extract UI reused across screens into `src/components/`; never duplicate it.
- Expected candidates: `TriggerSelect`, `PlaybookList`/`ActionList`, `QueryState` (loading/error/empty), `ConfirmDialog`. Confirm actual reuse in each slice.
- Shared components receive typed props and callbacks; no fetching hooks or API calls.
- Avoid generic component frameworks or abstractions without real reuse.

## UI & MUI

- Inspect the relevant sketch in `docs/sketches/` before implementing or reviewing a page.
- Sketches define **structure and layout, not visual styling**. Build a polished, minimal, responsive UI.
- Extract UI reused across screens into typed shared components; avoid duplication.
- Preserve its structure, element order and placement; improve visual styling.
- Use a polished, responsive blue/black/gray design with readable WCAG AA contrast.
- Use a centralized MUI theme for colors, typography, spacing and component defaults.
- Prefer MUI components and `sx`; use theme tokens, never hard-coded colors.
- Avoid unnecessary CSS libraries, custom design systems and complex styling.

## API & State

- No data-fetching library: typed API functions in `src/api/` use `fetch`; custom hooks in `src/hooks/` wrap them. Pages call API functions only through hooks (e.g. `useAsyncAction(playbooksApi.create)`); components never call `fetch` or `apiRequest` directly.
- Read hooks (e.g. `usePlaybooks`) expose `data`, `isLoading`, `error` and `refetch`.
- Action hooks (e.g. create, delete, simulate) expose a run function, `isPending` and `error`.
- Refetch the playbook list after create/delete.
- Ignore stale responses after unmount or a newer request (`AbortController`).
- Use `useState` for local UI state; do not copy hook data into extra state.

## Forms, Routing & Security

- Validate required fields, show field/server errors, disable pending submissions and handle loading/error/empty/success states.
- Backend validation is authoritative.
- Use React Router, ProtectedRoute and centralized route constants.
- Store JWT in localStorage for this exercise; attach Bearer tokens through the API client.
- Handle expired/invalid tokens; only trigger automatic logout on `401` if the request included a token.
- Never log credentials or tokens. Backend enforces authorization.

## Testing & Completion

- Use Vitest + React Testing Library; test user-visible behavior, not implementation details.
- Mock API boundaries when appropriate; cover forms, request states, authentication, playbooks and simulation.
- Use `it.each` for similar validation cases; colocate tests with the code (`LoginPage.test.tsx`).
- Keep tests deterministic.
- Run lint, typecheck, relevant tests and build; report anything not executed.

Keep the implementation minimal and maintainable for a three-screen assignment.