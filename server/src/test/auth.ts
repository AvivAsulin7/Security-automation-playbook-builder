import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import request from 'supertest';

/** Registers a fresh user through the API and returns its id and bearer token. */
export async function createUserWithToken(app: Express): Promise<{ userId: string; token: string }> {
  const response = await request(app)
    .post('/auth/register')
    .send({ email: `user-${randomUUID()}@example.com`, password: 'password123' });

  if (response.status !== 201) throw new Error(`Test user registration failed: ${response.status}`);
  return { userId: response.body.user.id, token: response.body.token };
}
