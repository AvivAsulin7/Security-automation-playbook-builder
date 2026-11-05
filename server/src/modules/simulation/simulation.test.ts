import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { createUserWithToken, postPlaybook } from '../../test/helpers.js';
import { resetDatabase } from '../../test/resetDatabase.js';

const app = createApp();
let token: string;

const createPlaybook = (body: object, bearer = token) => postPlaybook(app, bearer, body);

function simulate(body: object, bearer = token) {
  return request(app).post('/simulateTrigger').set('Authorization', `Bearer ${bearer}`).send(body);
}

beforeEach(async () => {
  await resetDatabase();
  ({ token } = await createUserWithToken(app));
});
afterAll(() => prisma.$disconnect());

describe('POST /simulateTrigger', () => {
  it('returns 401 without a token', async () => {
    const response = await request(app).post('/simulateTrigger').send({ trigger: 'MALWARE_DETECTED' });

    expect(response.status).toBe(401);
  });

  it("returns all of the user's matching playbooks, newest first, with actions in order", async () => {
    await createPlaybook({ name: 'Older', trigger: 'MALWARE_DETECTED', actions: ['ISOLATE_HOST', 'NOTIFY_ADMIN'] });
    await createPlaybook({ name: 'Login watch', trigger: 'LOGIN_ATTEMPT', actions: ['BLOCK_IP'] });
    await createPlaybook({ name: 'Newer', trigger: 'MALWARE_DETECTED', actions: ['BLOCK_IP', 'ISOLATE_HOST'] });

    const response = await simulate({ trigger: 'MALWARE_DETECTED' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      playbooks: [
        { id: expect.any(String), name: 'Newer', trigger: 'MALWARE_DETECTED', actions: ['BLOCK_IP', 'ISOLATE_HOST'] },
        { id: expect.any(String), name: 'Older', trigger: 'MALWARE_DETECTED', actions: ['ISOLATE_HOST', 'NOTIFY_ADMIN'] },
      ],
    });
  });

  it("excludes other users' playbooks for the same trigger", async () => {
    const other = await createUserWithToken(app);
    await createPlaybook({ name: 'Theirs', trigger: 'PHISHING_ALERT', actions: ['NOTIFY_ADMIN'] }, other.token);

    const response = await simulate({ trigger: 'PHISHING_ALERT' });

    expect(response.body).toEqual({ playbooks: [] });
  });

  it('returns an empty list when nothing matches', async () => {
    await createPlaybook({ name: 'Login watch', trigger: 'LOGIN_ATTEMPT', actions: ['BLOCK_IP'] });

    const response = await simulate({ trigger: 'PHISHING_ALERT' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ playbooks: [] });
  });

  it('does not modify any playbook (read-only)', async () => {
    await createPlaybook({ name: 'Malware', trigger: 'MALWARE_DETECTED', actions: ['ISOLATE_HOST'] });
    const before = await prisma.playbook.findMany();

    await simulate({ trigger: 'MALWARE_DETECTED' });

    expect(await prisma.playbook.findMany()).toEqual(before);
  });

  it.each([
    ['a missing trigger', {}],
    ['an unknown trigger', { trigger: 'DDOS' }],
    ['a non-string trigger', { trigger: 42 }],
  ])('returns 400 for %s', async (_label, body) => {
    const response = await simulate(body);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual([expect.objectContaining({ field: 'trigger' })]);
  });
});
