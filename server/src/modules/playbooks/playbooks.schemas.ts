import { Action, Trigger } from '@prisma/client';
import { z } from 'zod';

// Rules from docs/api-contract.md "Playbooks".
export const createPlaybookSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  trigger: z.enum(Trigger),
  actions: z
    .array(z.enum(Action))
    .min(1, 'Select at least one action')
    .max(3, 'Select at most 3 actions')
    .refine((actions) => new Set(actions).size === actions.length, 'Actions must be unique'),
});

export const playbookIdSchema = z.uuid();

export type CreatePlaybookInput = z.infer<typeof createPlaybookSchema>;
