// Shared API types, aligned with docs/api-contract.md.

export type User = { id: string; email: string };

export type Credentials = { email: string; password: string };

export type AuthResponse = { user: User; token: string };

export type Trigger = 'MALWARE_DETECTED' | 'LOGIN_ATTEMPT' | 'PHISHING_ALERT';

export type Action = 'ISOLATE_HOST' | 'NOTIFY_ADMIN' | 'BLOCK_IP';

export type Playbook = { id: string; name: string; trigger: Trigger; actions: Action[] };

export type CreatePlaybookRequest = Omit<Playbook, 'id'>;
