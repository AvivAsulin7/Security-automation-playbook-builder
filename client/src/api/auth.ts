import type { AuthResponse, Credentials } from '../types';
import { apiRequest } from './client';

// Auth calls never send a stored token: a failed login must not end another tab's session.
export const authApi = {
  login: (credentials: Credentials) =>
    apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: credentials, auth: false }),

  register: (credentials: Credentials) =>
    apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: credentials, auth: false }),
};
