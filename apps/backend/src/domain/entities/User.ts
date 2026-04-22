import { z } from 'zod';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  PREMIUM = 'premium'
}

export const UserSchema = z.object({
  id: z.string().optional(),
  email: z.string().email(),
  name: z.string(),
  role: z.nativeEnum(UserRole).default(UserRole.USER),
  apiKey: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export type User = z.infer<typeof UserSchema>;
