import { AppError } from '../../errors/AppError.js';
import { playbookRepository, type PlaybookDto } from './playbooks.repository.js';
import type { CreatePlaybookInput } from './playbooks.schemas.js';

export const playbookService = {
  list(userId: string): Promise<PlaybookDto[]> {
    return playbookRepository.listByUser(userId);
  },

  create(userId: string, input: CreatePlaybookInput): Promise<PlaybookDto> {
    return playbookRepository.create(userId, input);
  },

  async remove(userId: string, id: string): Promise<void> {
    const deleted = await playbookRepository.deleteByIdAndUser(id, userId);
    // Not found and not owned look the same, so other users' playbooks are not revealed.
    if (!deleted) throw AppError.notFound('Playbook not found');
  },
};
