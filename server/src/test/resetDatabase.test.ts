import { describe, expect, it } from 'vitest';
import { assertTestDatabase } from './resetDatabase.js';

describe('assertTestDatabase', () => {
  it.each([
    ['the development database', 'postgresql://playbooks:playbooks@localhost:5432/playbooks'],
    ['another database', 'postgresql://playbooks:playbooks@localhost:5432/production'],
    ['a missing URL', undefined],
  ])('refuses %s', (_label, url) => {
    expect(() => assertTestDatabase(url)).toThrow(/Refusing to reset database/);
  });

  it('allows the test database', () => {
    expect(() =>
      assertTestDatabase('postgresql://playbooks:playbooks@localhost:5432/playbooks_test'),
    ).not.toThrow();
  });
});
