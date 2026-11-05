import type { Trigger } from '@prisma/client';
import { playbookRepository, type PlaybookDto } from '../playbooks/playbooks.repository.js';

export const simulationService = {
  /**
   * Read-only: returns the playbooks that would run for the trigger, with their actions in order.
   * Never executes any security action and stores no simulation history.
   */
  simulate(userId: string, trigger: Trigger): Promise<PlaybookDto[]> {
    return playbookRepository.findByUserAndTrigger(userId, trigger);
  },
};
