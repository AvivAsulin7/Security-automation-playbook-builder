# API Contract — v1 (approved)
Shared HTTP contract between client and server; keep both sides consistent. JSON request/response bodies.

Error shape: `{ "error": { "code": "...", "message": "...", "details": [{ "field": "name", "message": "..." }] } }`; `details` is present only on `400` validation errors.

## Authentication
- `POST /auth/register`: `{ "email": "user@example.com", "password": "..." }` -> `201` `{ "user": { "id": "uuid", "email": "user@example.com" }, "token": "jwt" }`
- `POST /auth/login`: same request -> `200` same response; invalid credentials -> `401` (same message for unknown email and wrong password).
- Validation: `email` valid format, trimmed and lowercased; `password` 8–72 characters and at most 72 bytes in UTF-8 (bcrypt input limit).
- Authenticated endpoints require `Authorization: Bearer <jwt>`; missing/invalid/expired token -> `401`.

## Playbooks
- Trigger codes: `MALWARE_DETECTED`, `LOGIN_ATTEMPT`, `PHISHING_ALERT`.
- Action codes: `ISOLATE_HOST`, `NOTIFY_ADMIN`, `BLOCK_IP`.
- `GET /playbooks`: `200` `{ "playbooks": [Playbook] }` (current user only, newest first).
- `POST /playbooks`: `{ "name": "Malware Response", "trigger": "MALWARE_DETECTED", "actions": ["ISOLATE_HOST", "NOTIFY_ADMIN"] }` -> `201` `{ "playbook": Playbook }`.
- `DELETE /playbooks/:id`: `204` empty body; not found, not owned, or malformed (non-UUID) `id` -> `404`.
- `Playbook`: `{ "id": "uuid", "name": "Malware Response", "trigger": "MALWARE_DETECTED", "actions": ["ISOLATE_HOST", "NOTIFY_ADMIN"] }`.
- Validate name 1–100 characters after trimming, exactly one allowed trigger, 1–3 unique allowed actions (order preserved). Bad input -> `400`.

## Simulation
- `POST /simulateTrigger`: `{ "trigger": "MALWARE_DETECTED" }` -> `200` `{ "playbooks": [Playbook] }`.
- Returns all matching playbooks belonging to the authenticated user (newest first), including ordered hypothetical actions. Never executes actions. No matches -> `{ "playbooks": [] }`.

## General
- JSON `Content-Type: application/json` for requests with bodies.
- `400`: invalid request; `401`: unauthenticated; `404`: missing/not-owned resource; `409`: duplicate email; `500`: internal error with sanitized message.
- Client stores the JWT in localStorage (trade-off documented in README); no refresh endpoint — on `401` from a request that sent a token, the client logs out; a `401` from `/auth/login` is shown as an invalid-credentials error.
- Update this document before coordinated API changes, with user approval.
