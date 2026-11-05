import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { apiRequest, tokenStorage } from './api/client';
import { AppRoutes } from './AppRoutes';
import { renderWithProviders, testUser } from './test/renderWithProviders';

describe('AppRoutes', () => {
  it('renders the login page at /login without the app navigation', () => {
    renderWithProviders(<AppRoutes />, { route: '/login' });

    expect(screen.getByRole('heading', { name: 'Login / Register' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
  });

  it.each(['/', '/playbooks', '/simulate', '/unknown'])(
    'redirects %s to the login page when signed out',
    (route) => {
      renderWithProviders(<AppRoutes />, { route });

      expect(screen.getByRole('heading', { name: 'Login / Register' })).toBeInTheDocument();
    },
  );

  it('shows the protected page, navigation and email when signed in', () => {
    renderWithProviders(<AppRoutes />, { route: '/playbooks', user: testUser });

    expect(screen.getByRole('heading', { name: 'Create Playbook' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByText(testUser.email)).toBeInTheDocument();
  });

  it('discards a stored token that has no stored user', () => {
    tokenStorage.set('orphan-token');

    renderWithProviders(<AppRoutes />, { route: '/playbooks' });

    expect(screen.getByRole('heading', { name: 'Login / Register' })).toBeInTheDocument();
    expect(tokenStorage.get()).toBeNull();
  });

  it('logs out: clears the session and returns to the login page', async () => {
    renderWithProviders(<AppRoutes />, { route: '/playbooks', user: testUser });

    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));

    expect(screen.getByRole('heading', { name: 'Login / Register' })).toBeInTheDocument();
    expect(tokenStorage.get()).toBeNull();
  });

  it('logs out when an authenticated request returns 401', async () => {
    renderWithProviders(<AppRoutes />, { route: '/playbooks', user: testUser });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Expired' } }), {
          status: 401,
        }),
      ),
    );

    await act(() => apiRequest('/playbooks').catch(() => undefined));

    expect(screen.getByRole('heading', { name: 'Login / Register' })).toBeInTheDocument();
  });
});
