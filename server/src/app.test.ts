import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

describe('app', () => {
  const app = createApp();

  it('GET /health returns ok', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('unknown route returns 404 in the contract error shape', async () => {
    const response = await request(app).get('/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  it('malformed JSON body returns 400 without details', async () => {
    const response = await request(app)
      .post('/health')
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'BAD_REQUEST', message: 'Invalid request body' },
    });
  });

  it('allows only the configured client origin', async () => {
    const allowed = await request(app).get('/health').set('Origin', 'http://localhost:5173');
    const other = await request(app).get('/health').set('Origin', 'http://evil.test');

    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(other.headers['access-control-allow-origin']).not.toBe('http://evil.test');
  });
});
