import { z } from 'zod';

const positiveId = z.coerce.number().int().positive();

export const ProjectParams = z.object({ projectId: positiveId });
export const ItemParams = z.object({ projectId: positiveId, id: positiveId });
/** An item inside a record, e.g. one of its options: /records/:id/options/:itemId */
export const RecordItemParams = z.object({ projectId: positiveId, id: positiveId, itemId: positiveId });
