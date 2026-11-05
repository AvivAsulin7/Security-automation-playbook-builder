import { randomUUID } from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { env } from '../config/env.js';
import { errorHandler } from './errorHandler.js';
import { requireAuth } from './requireAuth.js';

const app = express();
app.get('/protected', requireAuth, (req, res) => {
  res.json({ userId: req.userId });
});
app.use(errorHandler);

const nowInSeconds = () => Math.floor(Date.now() / 1000);
const userId = randomUUID();

describe('requireAuth', () => {
  it('passes the verified user id to the route', async () => {
    const token = jwt.sign({}, env.JWT_SECRET, { subject: userId, expiresIn: '1h' });

    const response = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ userId });
  });

  it.each([
    ['no Authorization header', undefined],
    ['a non-Bearer scheme', 'Basic dXNlcjpwYXNz'],
    ['an empty Bearer token', 'Bearer '],
    ['a malformed token', 'Bearer not-a-jwt'],
    ['a token signed with another secret', `Bearer ${jwt.sign({ sub: userId }, 'x'.repeat(40))}`],
    ['an expired token', `Bearer ${jwt.sign({ sub: userId, exp: nowInSeconds() - 60 }, env.JWT_SECRET)}`],
    ['a token whose subject is not a UUID', `Bearer ${jwt.sign({ sub: 'user-1' }, env.JWT_SECRET)}`],
    ['a token without a subject', `Bearer ${jwt.sign({}, env.JWT_SECRET)}`],
  ])('returns 401 for %s', async (_label, header) => {
    const req = request(app).get('/protected');
    const response = await (header ? req.set('Authorization', header) : req);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});
