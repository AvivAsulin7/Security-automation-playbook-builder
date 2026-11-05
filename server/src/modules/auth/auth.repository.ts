import { Prisma, type User } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export const authRepository = {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  /** Returns `null` when the email is already registered (unique constraint). */
  async create(data: { email: string; passwordHash: string }): Promise<User | null> {
    try {
      return await prisma.user.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return null;
      }
      throw error;
    }
  },
};
