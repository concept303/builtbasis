import { z } from 'zod';

export const ProjectParams = z.object({ projectId: z.coerce.number().int().positive() });
export const ItemParams = z.object({
  projectId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive(),
});
