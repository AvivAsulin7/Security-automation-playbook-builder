import type { NextFunction, Request, Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AppError } from '../errors/AppError.js';
import { errorHandler } from './errorHandler.js';

function createResponse(headersSent = false) {
  const res = { headersSent, status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

function handle(error: unknown, res = createResponse()) {
  const next = vi.fn();
  errorHandler(error, {} as Request, res as unknown as Response, next as NextFunction);
  return { res, next };
}

describe('errorHandler', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps a ZodError to 400 VALIDATION_ERROR with field details', () => {
    const result = z.object({ name: z.string().min(1) }).safeParse({ name: '' });

    const { res } = handle(result.error);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: [{ field: 'name', message: expect.any(String) }],
      },
    });
  });

  it('uses the status and code of an AppError and omits details when absent', () => {
    const { res } = handle(AppError.conflict('Email already registered'));

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'CONFLICT', message: 'Email already registered' },
    });
  });

  it('hides internal details of unexpected errors behind a sanitized 500', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { res } = handle(new Error('db password is hunter2'));

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
  });

  it('maps exposed client http errors (e.g. payload too large) to their 4xx status', () => {
    const { res } = handle({ status: 413, expose: true, message: 'request entity too large' });

    expect(res.status).toHaveBeenCalledWith(413);
  });

  it('delegates to Express when headers were already sent', () => {
    const error = new Error('late failure');

    const { res, next } = handle(error, createResponse(true));

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
