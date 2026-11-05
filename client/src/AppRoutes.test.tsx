import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from './AppRoutes';
import { renderWithProviders } from './test/renderWithProviders';

describe('AppRoutes', () => {
  it('renders the login page at /login without the app navigation', () => {
    renderWithProviders(<AppRoutes />, { route: '/login' });

    expect(screen.getByRole('heading', { name: 'Login / Register' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
  });

  it.each(['/', '/unknown'])('redirects %s to the Create Playbook page', (route) => {
    renderWithProviders(<AppRoutes />, { route });

    expect(screen.getByRole('heading', { name: 'Create Playbook' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });
});
