import type { Request, Response } from 'express';
import { authenticatedUserId } from '../../middleware/requireAuth.js';
import { simulateTriggerSchema } from './simulation.schemas.js';
import { simulationService } from './simulation.service.js';

export const simulationController = {
  async simulate(req: Request, res: Response): Promise<void> {
    const { trigger } = simulateTriggerSchema.parse(req.body);
    const playbooks = await simulationService.simulate(authenticatedUserId(req), trigger);
    res.json({ playbooks });
  },
};
