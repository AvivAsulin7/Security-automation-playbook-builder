import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '../api/auth';
import { ApiError, tokenStorage } from '../api/client';
import { AppRoutes } from '../AppRoutes';
import { renderWithProviders, testUser } from '../test/renderWithProviders';

vi.mock('../api/auth', () => ({ authApi: { login: vi.fn(), register: vi.fn() } }));

const authResponse = { user: testUser, token: 'new-token' };

async function fillForm(email: string, password: string) {
  // Required fields render as "Email *" / "Password *".
  if (email) await userEvent.type(screen.getByLabelText(/^Email/), email);
  if (password) await userEvent.type(screen.getByLabelText(/^Password/), password);
}

function renderLogin() {
  renderWithProviders(<AppRoutes />, { route: '/login' });
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.mocked(authApi.login).mockReset();
    vi.mocked(authApi.register).mockReset();
  });

  it.each([
    ['an invalid email', 'not-an-email', 'password123', 'Enter a valid email address'],
    ['a short password', 'user@example.com', 'short', 'Password must be at least 8 characters'],
    ['a long password', 'user@example.com', 'a'.repeat(73), 'Password must be at most 72 characters'],
  ])('shows a field error and does not call the API for %s', async (_label, email, password, message) => {
    renderLogin();
    await fillForm(email, password);

    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it.each([
    ['Login', authApi.login],
    ['Register', authApi.register],
  ])('%s success stores the session and opens Create Playbook', async (buttonName, apiCall) => {
    vi.mocked(apiCall).mockResolvedValue(authResponse);
    renderLogin();
    await fillForm('  user@example.com ', 'password123');

    await userEvent.click(screen.getByRole('button', { name: buttonName }));

    expect(await screen.findByRole('heading', { name: 'Create Playbook' })).toBeInTheDocument();
    expect(apiCall).toHaveBeenCalledWith({ email: 'user@example.com', password: 'password123' });
    expect(tokenStorage.get()).toBe('new-token');
  });

  it('shows the server error and stays on the page when login fails', async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError(401, 'UNAUTHORIZED', 'Invalid email or password'),
    );
    renderLogin();
    await fillForm('user@example.com', 'wrong-password');

    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(screen.getByRole('heading', { name: 'Login / Register' })).toBeInTheDocument();
    expect(tokenStorage.get()).toBeNull();
  });

  it('shows field errors returned by the server', async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', [
        { field: 'email', message: 'Invalid email address' },
      ]),
    );
    renderLogin();
    await fillForm('user@example.com', 'password123');

    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Invalid email address')).toBeInTheDocument();
  });

  it('falls back to the error message when server details match no field', async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', [{ field: '', message: 'Expected object' }]),
    );
    renderLogin();
    await fillForm('user@example.com', 'password123');

    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid request');
  });

  it('disables both buttons while a request is pending', async () => {
    vi.mocked(authApi.login).mockReturnValue(new Promise(() => {}));
    renderLogin();
    await fillForm('user@example.com', 'password123');

    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(screen.getByRole('button', { name: 'Logging in…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Register' })).toBeDisabled();
  });

  it('redirects to Create Playbook when already signed in', () => {
    renderWithProviders(<AppRoutes />, { route: '/login', user: testUser });

    expect(screen.getByRole('heading', { name: 'Create Playbook' })).toBeInTheDocument();
  });
});
