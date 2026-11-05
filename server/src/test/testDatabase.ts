// The only database tests may touch; the development database is never used by tests.
export const TEST_DATABASE_NAME = 'playbooks_test';
export const TEST_DATABASE_URL = `postgresql://playbooks:playbooks@localhost:5432/${TEST_DATABASE_NAME}`;
