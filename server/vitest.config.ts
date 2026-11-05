import { defineConfig } from 'vitest/config';
import { TEST_DATABASE_URL } from './src/test/testDatabase.js';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globalSetup: ['./src/test/globalSetup.ts'],
    // Integration tests share one database and truncate it, so test files must not run in parallel.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      PORT: '4000',
      CLIENT_ORIGIN: 'http://localhost:5173',
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: 'test-only-jwt-secret-that-is-at-least-32-chars',
      JWT_EXPIRES_IN: '24h',
    },
  },
});
