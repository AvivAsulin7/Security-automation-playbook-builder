import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

function readBearerToken(header: string | undefined): string | undefined {
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice('Bearer '.length).trim() || undefined;
}

function verifiedUserId(token: string): string | undefined {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    // User ids are UUIDs; anything else would fail later in database queries.
    const subject = typeof payload === 'object' ? z.uuid().safeParse(payload.sub) : undefined;
    return subject?.success ? subject.data : undefined;
  } catch {
    return undefined;
  }
}

/** The verified user id for routes behind `requireAuth`. */
export function authenticatedUserId(req: Request): string {
  if (!req.userId) throw AppError.unauthorized();
  return req.userId;
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = readBearerToken(req.headers.authorization);
  if (!token) throw AppError.unauthorized();

  const userId = verifiedUserId(token);
  if (!userId) throw AppError.unauthorized('Invalid or expired token');

  req.userId = userId;
  next();
};
