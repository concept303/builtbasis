import { z } from 'zod';
import type { PhotoPhase } from './vocab';

export const UPLOAD_REQUEST_LIMIT = 100_000_000;
export const FILE_LIMITS = { 'photo-original': UPLOAD_REQUEST_LIMIT, 'photo-display': 5_000_000, 'photo-thumbnail': 500_000, attachment: UPLOAD_REQUEST_LIMIT } as const;
export type FilePurpose = keyof typeof FILE_LIMITS;
const text = z.string().max(2_000).nullable().transform(value => value === null || value.trim() === '' ? null : value);
export const FileTimestamp = z.iso.datetime({ offset: true }).transform(value => new Date(value).toISOString());
export const Filename = z.string().transform(value => value.split(/[\\/]/).at(-1) ?? '').pipe(z.string().min(1).max(255).refine(value => !/[\x00-\x1f\x7f]/.test(value), 'Invalid filename'));
export const PhotoVariantParam = z.enum(['original', 'display', 'thumbnail']);
export type PhotoVariant = z.infer<typeof PhotoVariantParam>;
const photoFields = { phase: z.enum(['before', 'during', 'after']), caption: text.optional(), takenAt: FileTimestamp.nullable().optional() };
export const PhotoUploadMeta = z.strictObject(photoFields);
export const PhotoPatch = PhotoUploadMeta.partial().refine(value => Object.keys(value).length > 0, 'Empty patch');
export const AttachmentUploadMeta = z.strictObject({ title: text.optional(), logEntryId: z.number().int().positive().nullable().optional() });
export const AttachmentPatch = z.strictObject({ title: text.optional() }).refine(value => Object.keys(value).length > 0, 'Empty patch');
export type PhotoMeta = z.output<typeof PhotoUploadMeta>;
export type PhotoPatchInput = z.output<typeof PhotoPatch>;
export type AttachmentMeta = z.output<typeof AttachmentUploadMeta>;
export type AttachmentPatchInput = z.output<typeof AttachmentPatch>;
export interface PhotoOut {
  id: number; originalFilename: string; phase: PhotoPhase; caption: string | null; takenAt: string | null; uploadedBy: string; uploadedAt: string;
}
export interface AttachmentOut {
  id: number; originalFilename: string; title: string | null; size: number; contentType: string; uploadedBy: string; uploadedAt: string;
  logEntry: { id: number; eventAt: string; text: string; private: boolean } | null;
}

