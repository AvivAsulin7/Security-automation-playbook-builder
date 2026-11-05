import type { Playbook, Trigger } from '../types';
import { apiRequest } from './client';

export const simulationApi = {
  simulate: async (trigger: Trigger): Promise<Playbook[]> =>
    (await apiRequest<{ playbooks: Playbook[] }>('/simulateTrigger', { method: 'POST', body: { trigger } }))
      .playbooks,
};
