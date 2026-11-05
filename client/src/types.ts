// Shared API types, aligned with docs/api-contract.md.

export type User = { id: string; email: string };

export type Credentials = { email: string; password: string };

export type AuthResponse = { user: User; token: string };
