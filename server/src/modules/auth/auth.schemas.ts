import { z } from 'zod';

// Rules from docs/api-contract.md "Authentication".
export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Invalid email address')),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters'),
});

export type Credentials = z.infer<typeof credentialsSchema>;
