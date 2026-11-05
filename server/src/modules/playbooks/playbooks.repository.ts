import type { Prisma, Trigger } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { CreatePlaybookInput } from './playbooks.schemas.js';

// Only the fields defined by the API contract leave the repository.
const playbookFields = {
  id: true,
  name: true,
  trigger: true,
  actions: true,
} satisfies Prisma.PlaybookSelect;

export type PlaybookDto = Prisma.PlaybookGetPayload<{ select: typeof playbookFields }>;

export const playbookRepository = {
  listByUser(userId: string): Promise<PlaybookDto[]> {
    return prisma.playbook.findMany({
      where: { userId },
      select: playbookFields,
      orderBy: { createdAt: 'desc' },
    });
  },

  /** Used by the simulation: the user's playbooks for one trigger, newest first. */
  findByUserAndTrigger(userId: string, trigger: Trigger): Promise<PlaybookDto[]> {
    return prisma.playbook.findMany({
      where: { userId, trigger },
      select: playbookFields,
      orderBy: { createdAt: 'desc' },
    });
  },

  create(userId: string, input: CreatePlaybookInput): Promise<PlaybookDto> {
    return prisma.playbook.create({ data: { ...input, userId }, select: playbookFields });
  },

  /** Deletes only when the playbook belongs to the user; returns whether one was deleted. */
  async deleteByIdAndUser(id: string, userId: string): Promise<boolean> {
    const { count } = await prisma.playbook.deleteMany({ where: { id, userId } });
    return count > 0;
  },
};
