import type { CreatePlaybookRequest, Playbook } from '../types';
import { apiRequest } from './client';

export const playbooksApi = {
  list: async (signal?: AbortSignal): Promise<Playbook[]> =>
    (await apiRequest<{ playbooks: Playbook[] }>('/playbooks', { signal })).playbooks,

  create: async (input: CreatePlaybookRequest): Promise<Playbook> =>
    (await apiRequest<{ playbook: Playbook }>('/playbooks', { method: 'POST', body: input })).playbook,

  remove: (id: string): Promise<void> =>
    apiRequest<void>(`/playbooks/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
