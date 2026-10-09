import { z } from 'zod';

export const identifier = z.string().uuid();
export const title = z.string().trim().min(1).max(200);
export const itemSchema = z.strictObject({ id: identifier, title: z.string().min(1).max(200), completed: z.boolean() });
export const createSchema = z.strictObject({ title });
export const updateSchema = z.strictObject({ title: title.optional(), completed: z.boolean().optional() })
  .refine(value => value.title !== undefined || value.completed !== undefined);
export type TodoItem = z.infer<typeof itemSchema>;
