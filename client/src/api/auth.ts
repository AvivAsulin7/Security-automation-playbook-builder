import type { AuthResponse, Credentials } from '../types';
import { apiRequest } from './client';

export const authApi = {
  login: (credentials: Credentials) =>
    apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: credentials }),

  register: (credentials: Credentials) =>
    apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: credentials }),
};
