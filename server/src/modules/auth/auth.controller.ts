import type { Request, Response } from 'express';
import { credentialsSchema } from './auth.schemas.js';
import { authService } from './auth.service.js';

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const credentials = credentialsSchema.parse(req.body);
    res.status(201).json(await authService.register(credentials));
  },

  async login(req: Request, res: Response): Promise<void> {
    const credentials = credentialsSchema.parse(req.body);
    res.status(200).json(await authService.login(credentials));
  },
};
