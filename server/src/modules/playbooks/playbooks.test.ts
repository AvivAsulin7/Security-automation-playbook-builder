import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { createUserWithToken } from '../../test/auth.js';
import { resetDatabase } from '../../test/resetDatabase.js';

const app = createApp();
const validPlaybook = {
  name: 'Malware Response',
  trigger: 'MALWARE_DETECTED',
  actions: ['ISOLATE_HOST', 'NOTIFY_ADMIN'],
};

let token: string;
const auth = () => ({ Authorization: `Bearer ${token}` });

function createPlaybook(body: object, bearer = token) {
  return request(app).post('/playbooks').set('Authorization', `Bearer ${bearer}`).send(body);
}

beforeEach(async () => {
  await resetDatabase();
  ({ token } = await createUserWithToken(app));
});
afterAll(() => prisma.$disconnect());

describe('authentication', () => {
  it.each([
    ['GET', '/playbooks'],
    ['POST', '/playbooks'],
    ['DELETE', `/playbooks/${randomUUID()}`],
  ])('%s %s returns 401 without a token', async (method, path) => {
    const response = await request(app)[method.toLowerCase() as 'get' | 'post' | 'delete'](path);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('POST /playbooks', () => {
  it('creates a playbook in the contract shape', async () => {
    const response = await createPlaybook(validPlaybook);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ playbook: { id: expect.any(String), ...validPlaybook } });
  });

  it('preserves the order of the selected actions', async () => {
    const response = await createPlaybook({ ...validPlaybook, actions: ['BLOCK_IP', 'ISOLATE_HOST'] });

    expect(response.body.playbook.actions).toEqual(['BLOCK_IP', 'ISOLATE_HOST']);
  });

  it('trims the name', async () => {
    const response = await createPlaybook({ ...validPlaybook, name: '  Phishing Triage  ' });

    expect(response.body.playbook.name).toBe('Phishing Triage');
  });

  it('ignores a client-supplied userId and assigns the playbook to the authenticated user', async () => {
    const other = await createUserWithToken(app);

    const response = await createPlaybook({ ...validPlaybook, userId: other.userId });

    expect(response.status).toBe(201);
    const mine = await request(app).get('/playbooks').set(auth());
    const theirs = await request(app).get('/playbooks').set('Authorization', `Bearer ${other.token}`);
    expect(mine.body.playbooks).toHaveLength(1);
    expect(theirs.body.playbooks).toEqual([]);
  });

  it('allows duplicate names', async () => {
    await createPlaybook(validPlaybook);

    const response = await createPlaybook(validPlaybook);

    expect(response.status).toBe(201);
  });

  it.each([
    ['a blank name', { ...validPlaybook, name: '   ' }, 'name'],
    ['a name longer than 100 characters', { ...validPlaybook, name: 'a'.repeat(101) }, 'name'],
    ['a missing trigger', { name: 'x', actions: ['BLOCK_IP'] }, 'trigger'],
    ['an unknown trigger', { ...validPlaybook, trigger: 'DDOS' }, 'trigger'],
    ['no actions', { ...validPlaybook, actions: [] }, 'actions'],
    ['four actions', { ...validPlaybook, actions: ['ISOLATE_HOST', 'NOTIFY_ADMIN', 'BLOCK_IP', 'BLOCK_IP'] }, 'actions'],
    ['duplicate actions', { ...validPlaybook, actions: ['BLOCK_IP', 'BLOCK_IP'] }, 'actions'],
    ['an unknown action', { ...validPlaybook, actions: ['REBOOT'] }, 'actions.0'],
  ])('returns 400 with field details for %s', async (_label, body, field) => {
    const response = await createPlaybook(body);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field })]),
    );
  });
});

describe('GET /playbooks', () => {
  it("returns only the current user's playbooks, newest first", async () => {
    const other = await createUserWithToken(app);
    await createPlaybook({ ...validPlaybook, name: 'First' });
    await createPlaybook({ ...validPlaybook, name: 'Other user' }, other.token);
    await createPlaybook({ ...validPlaybook, name: 'Second' });

    const response = await request(app).get('/playbooks').set(auth());

    expect(response.status).toBe(200);
    expect(response.body.playbooks.map((p: { name: string }) => p.name)).toEqual(['Second', 'First']);
  });

  it('returns an empty list when the user has no playbooks', async () => {
    const response = await request(app).get('/playbooks').set(auth());

    expect(response.body).toEqual({ playbooks: [] });
  });
});

describe('DELETE /playbooks/:id', () => {
  it('deletes the playbook and returns 204', async () => {
    const { body } = await createPlaybook(validPlaybook);

    const response = await request(app).delete(`/playbooks/${body.playbook.id}`).set(auth());

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    const list = await request(app).get('/playbooks').set(auth());
    expect(list.body.playbooks).toEqual([]);
  });

  it("returns 404 for another user's playbook and keeps it", async () => {
    const other = await createUserWithToken(app);
    const { body } = await createPlaybook(validPlaybook, other.token);

    const response = await request(app).delete(`/playbooks/${body.playbook.id}`).set(auth());

    expect(response.status).toBe(404);
    expect(await prisma.playbook.count({ where: { id: body.playbook.id } })).toBe(1);
  });

  it.each([
    ['an unknown id', randomUUID()],
    ['a malformed id', 'not-a-uuid'],
  ])('returns 404 for %s', async (_label, id) => {
    const response = await request(app).delete(`/playbooks/${id}`).set(auth());

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Playbook not found' } });
  });
});
