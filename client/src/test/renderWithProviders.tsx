import { ThemeProvider } from '@mui/material/styles';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { tokenStorage, userStorage } from '../api/client';
import { AuthProvider } from '../AuthContext';
import { theme } from '../theme';
import type { User } from '../types';

type Options = { route?: string; user?: User };

export const testUser: User = { id: 'user-1', email: 'user@example.com' };

export function renderWithProviders(ui: ReactElement, { route = '/', user }: Options = {}) {
  if (user) {
    tokenStorage.set('test-token');
    userStorage.set(user);
  }

  return render(
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
}
