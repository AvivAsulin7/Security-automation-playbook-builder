import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { resetDatabase } from '../../test/resetDatabase.js';

const app = createApp();
const credentials = { email: 'user@example.com', password: 'password123' };

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('POST /auth/register', () => {
  it('creates the user and returns the user with a valid token', async () => {
    const response = await request(app).post('/auth/register').send(credentials);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      user: { id: expect.any(String), email: credentials.email },
      token: expect.any(String),
    });
    const payload = jwt.verify(response.body.token, env.JWT_SECRET);
    expect(typeof payload === 'object' && payload.sub).toBe(response.body.user.id);
  });

  it('stores a bcrypt hash, never the plaintext password', async () => {
    await request(app).post('/auth/register').send(credentials);

    const user = await prisma.user.findUniqueOrThrow({ where: { email: credentials.email } });
    expect(user.passwordHash).not.toBe(credentials.password);
    await expect(bcrypt.compare(credentials.password, user.passwordHash)).resolves.toBe(true);
  });

  it('never returns the password hash', async () => {
    const response = await request(app).post('/auth/register').send(credentials);

    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain('$2');
  });

  it('trims and lowercases the email', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({ ...credentials, email: '  User@Example.COM ' });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('user@example.com');
  });

  it.each([8, 72])('accepts a password of exactly %i characters', async (length) => {
    const response = await request(app)
      .post('/auth/register')
      .send({ email: `len${length}@example.com`, password: 'a'.repeat(length) });

    expect(response.status).toBe(201);
  });

  it.each([
    ['an invalid email', { email: 'not-an-email', password: 'password123' }, 'email'],
    ['a missing email', { password: 'password123' }, 'email'],
    ['a password shorter than 8 characters', { email: 'a@example.com', password: 'a'.repeat(7) }, 'password'],
    ['a password longer than 72 characters', { email: 'a@example.com', password: 'a'.repeat(73) }, 'password'],
    ['a missing password', { email: 'a@example.com' }, 'password'],
  ])('returns 400 with field details for %s', async (_label, body, field) => {
    const response = await request(app).post('/auth/register').send(body);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field })]),
    );
  });

  it.each([credentials.email, 'USER@Example.com'])(
    'returns 409 when %s is already registered',
    async (email) => {
      await request(app).post('/auth/register').send(credentials);

      const response = await request(app).post('/auth/register').send({ ...credentials, email });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        error: { code: 'CONFLICT', message: 'Email is already registered' },
      });
    },
  );
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/auth/register').send(credentials);
  });

  it('returns the user with a valid token', async () => {
    const response = await request(app).post('/auth/login').send(credentials);

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({ id: expect.any(String), email: credentials.email });
    const payload = jwt.verify(response.body.token, env.JWT_SECRET);
    expect(typeof payload === 'object' && payload.sub).toBe(response.body.user.id);
  });

  it('accepts the email with different case and surrounding spaces', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ ...credentials, email: '  USER@example.com ' });

    expect(response.status).toBe(200);
  });

  it.each([
    ['an unknown email', { email: 'other@example.com', password: credentials.password }],
    ['a wrong password', { email: credentials.email, password: 'wrong-password' }],
  ])('returns 401 with the same generic error for %s', async (_label, body) => {
    const response = await request(app).post('/auth/login').send(body);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' },
    });
  });

  it('returns 400 for invalid input', async () => {
    const response = await request(app).post('/auth/login').send({ email: 'bad' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
