import type { User } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../errors/AppError.js';
import { authRepository } from './auth.repository.js';
import type { Credentials } from './auth.schemas.js';

const BCRYPT_COST = 10;

export type AuthResult = { user: { id: string; email: string }; token: string };

function toAuthResult(user: User): AuthResult {
  const token = jwt.sign({}, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN as NonNullable<SignOptions['expiresIn']>,
  });
  return { user: { id: user.id, email: user.email }, token };
}

export const authService = {
  async register({ email, password }: Credentials): Promise<AuthResult> {
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const user = await authRepository.create({ email, passwordHash });
    if (!user) throw AppError.conflict('Email is already registered');
    return toAuthResult(user);
  },

  async login({ email, password }: Credentials): Promise<AuthResult> {
    const user = await authRepository.findByEmail(email);
    const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;
    // Same error for unknown email and wrong password, so accounts cannot be enumerated.
    if (!user || !passwordMatches) throw AppError.unauthorized('Invalid email or password');
    return toAuthResult(user);
  },
};
