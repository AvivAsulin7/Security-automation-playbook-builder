import { prisma } from '../lib/prisma.js';
import { TEST_DATABASE_NAME } from './testDatabase.js';

export function assertTestDatabase(databaseUrl: string | undefined): void {
  const name = databaseUrl ? new URL(databaseUrl).pathname.slice(1) : '';
  if (name !== TEST_DATABASE_NAME) {
    throw new Error(`Refusing to reset database "${name}": tests must use ${TEST_DATABASE_NAME}`);
  }
}

// Empties every application table (rows only; the schema stays) before each integration test.
export async function resetDatabase(): Promise<void> {
  assertTestDatabase(process.env.DATABASE_URL);

  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;

  const tableList = tables.map(({ tablename }) => `"public"."${tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} CASCADE`);
}
