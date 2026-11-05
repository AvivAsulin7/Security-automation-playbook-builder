import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { playbookController } from './playbooks.controller.js';

export const playbooksRouter = Router();

playbooksRouter.use(requireAuth);
playbooksRouter.get('/', playbookController.list);
playbooksRouter.post('/', playbookController.create);
playbooksRouter.delete('/:id', playbookController.remove);
