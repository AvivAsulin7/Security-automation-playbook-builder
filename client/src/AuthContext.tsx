import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { authApi } from './api/auth';
import { setUnauthorizedHandler, tokenStorage, userStorage } from './api/client';
import { AuthContext } from './hooks/useAuth';
import type { AuthResponse, Credentials, User } from './types';

function clearSession(): void {
  tokenStorage.clear();
  userStorage.clear();
}

// A token without a valid stored user is an incomplete session: discard it.
function restoreSession(): User | null {
  const user = tokenStorage.get() ? userStorage.get() : null;
  if (!user) clearSession();
  return user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(restoreSession);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  function startSession({ user: signedInUser, token }: AuthResponse): void {
    tokenStorage.set(token);
    userStorage.set(signedInUser);
    setUser(signedInUser);
  }

  const value = {
    user,
    login: async (credentials: Credentials) => startSession(await authApi.login(credentials)),
    register: async (credentials: Credentials) =>
      startSession(await authApi.register(credentials)),
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
