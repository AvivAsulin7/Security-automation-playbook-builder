import { Trigger } from '@prisma/client';
import { z } from 'zod';

// Rules from docs/api-contract.md "Simulation".
export const simulateTriggerSchema = z.object({
  trigger: z.enum(Trigger),
});
