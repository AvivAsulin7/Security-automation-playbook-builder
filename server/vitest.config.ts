import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      PORT: '4000',
      CLIENT_ORIGIN: 'http://localhost:5173',
      // Tests always use the dedicated test database, never the development one.
      DATABASE_URL: 'postgresql://playbooks:playbooks@localhost:5432/playbooks_test',
    },
  },
});
