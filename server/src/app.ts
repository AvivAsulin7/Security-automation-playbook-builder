import cors from 'cors';
import express, { type Express } from 'express';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { playbooksRouter } from './modules/playbooks/playbooks.routes.js';
import { simulationRouter } from './modules/simulation/simulation.routes.js';

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.CLIENT_ORIGIN }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/auth', authRouter);
  app.use('/playbooks', playbooksRouter);
  app.use('/simulateTrigger', simulationRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
