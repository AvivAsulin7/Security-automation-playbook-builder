import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { simulationController } from './simulation.controller.js';

export const simulationRouter = Router();

simulationRouter.post('/', requireAuth, simulationController.simulate);
