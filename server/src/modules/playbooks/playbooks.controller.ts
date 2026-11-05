import type { Request, Response } from 'express';
import { AppError } from '../../errors/AppError.js';
import { authenticatedUserId } from '../../middleware/requireAuth.js';
import { createPlaybookSchema, playbookIdSchema } from './playbooks.schemas.js';
import { playbookService } from './playbooks.service.js';

export const playbookController = {
  async list(req: Request, res: Response): Promise<void> {
    const playbooks = await playbookService.list(authenticatedUserId(req));
    res.json({ playbooks });
  },

  async create(req: Request, res: Response): Promise<void> {
    const input = createPlaybookSchema.parse(req.body);
    const playbook = await playbookService.create(authenticatedUserId(req), input);
    res.status(201).json({ playbook });
  },

  async remove(req: Request, res: Response): Promise<void> {
    // Per the contract, a malformed id is indistinguishable from a missing playbook.
    const id = playbookIdSchema.safeParse(req.params.id);
    if (!id.success) throw AppError.notFound('Playbook not found');

    await playbookService.remove(authenticatedUserId(req), id.data);
    res.status(204).end();
  },
};
