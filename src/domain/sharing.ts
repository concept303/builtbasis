import { z } from 'zod';
import { FileTimestamp } from './files';

export const ShareCreate = z.strictObject({ label: z.string().max(200).refine(value => value.trim() !== '', 'Required'), expiresAt: FileTimestamp.nullable().optional() });
export type ShareCreateInput = z.output<typeof ShareCreate>;
export interface ShareLinkOut {
  id: number; label: string; createdAt: string; expiresAt: string | null; revokedAt: string | null; lastViewedAt: string | null; viewCount: number; url: string | null;
}
