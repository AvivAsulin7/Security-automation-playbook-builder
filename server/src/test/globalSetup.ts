import { execSync } from 'node:child_process';
import { TEST_DATABASE_URL } from './testDatabase.js';

// Bring the test database schema up to date once before the test run.
export default function setup(): void {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
