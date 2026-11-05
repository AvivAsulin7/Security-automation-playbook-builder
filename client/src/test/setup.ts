import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { setUnauthorizedHandler } from '../api/client';

afterEach(() => {
  cleanup();
  localStorage.clear();
  setUnauthorizedHandler(null);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
