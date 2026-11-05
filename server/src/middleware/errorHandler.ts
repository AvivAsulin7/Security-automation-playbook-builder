import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';

type ClientHttpError = { status: number; expose: true };

// Express body-parser raises http-errors (e.g. malformed JSON, payload too large) marked `expose`.
function isClientHttpError(error: unknown): error is ClientHttpError {
  if (typeof error !== 'object' || error === null) return false;
  const { status, expose } = error as { status?: unknown; expose?: unknown };
  return typeof status === 'number' && status >= 400 && status < 500 && expose === true;
}

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof ZodError) {
    return AppError.validation(
      error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    );
  }

  if (isClientHttpError(error)) {
    return new AppError(error.status, 'BAD_REQUEST', 'Invalid request body');
  }

  console.error('Unhandled error', error);
  return new AppError(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(AppError.notFound('Route not found'));
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const { status, code, message, details } = toAppError(error);
  res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });
};
