import { z } from 'zod';
import type { PhotoPhase } from './vocab';

/** Shared attachment picker/storage policy. Extensions omit the leading dot. */
export const ACCEPTED_ATTACHMENT_EXTENSIONS: readonly string[] = (`3dm 3ds 3dxml a asm avi axm bmp bpm brd cam360 catpart catproduct cgr csv dae ddx ddz dgk dgn dlv3 dmt doc docx dwf dwfx dwg dwt dxf e57 eml emodel exp f3d fbx flv g gbxml gc3 gif glb gltf heic heif iam ico idw ifc ige iges igs ipt iwm jfif jpe jpeg jpg jt key kml kmz kof las laz ln3 m4a mat max mkv model mov mp3 mp4 mpeg mpp msg neu numbers nwc nwd obj odp ods odt ogg osb pages pan par pdf pmlprj pmlprjz png pps ppt pptx prt psm psmodel pts rar rcp rd3 rtf rvm rvt sab sat skp sldasm sldprt smb step stl stp stpz svg tif tiff tn3 tp3 txt usd usda usdc usdz vpb vue wav webm webp wire x_b x_t xas xer xls xlsm xlsx xlt xltx xpr zdd zip zipx`.split(' '));

export const UPLOAD_REQUEST_LIMIT = 100_000_000;
export const FILE_LIMITS = { 'photo-original': UPLOAD_REQUEST_LIMIT, 'photo-display': 5_000_000, 'photo-thumbnail': 500_000, attachment: UPLOAD_REQUEST_LIMIT } as const;
export type FilePurpose = keyof typeof FILE_LIMITS;
const text = z.string().max(2_000).nullable().transform(value => value === null || value.trim() === '' ? null : value);
export const FileTimestamp = z.iso.datetime({ offset: true }).transform(value => new Date(value).toISOString());
export const Filename = z.string().transform(value => value.split(/[\\/]/).at(-1) ?? '').pipe(z.string().min(1).max(255).refine(value => !/[\x00-\x1f\x7f]/.test(value), 'Invalid filename'));
export const PhotoVariantParam = z.enum(['original', 'display', 'thumbnail']);
export type PhotoVariant = z.infer<typeof PhotoVariantParam>;
const photoFields = { caption: text.optional(), takenAt: FileTimestamp.nullable().optional() };
const phase = z.enum(['before', 'during', 'after']);
export const PhotoUploadMeta = z.union([
  z.strictObject({ ...photoFields, purpose: z.literal('evidence').default('evidence'), phase }),
  z.strictObject({ ...photoFields, purpose: z.literal('location'), phase: z.null().optional().default(null) }),
]);
// Purpose is immutable: location photos cannot become work evidence accidentally.
export const PhotoPatch = z.strictObject({ ...photoFields, phase: phase.optional() }).refine(value => Object.keys(value).length > 0, 'Empty patch');
export const AttachmentUploadMeta = z.strictObject({ title: text.optional(), logEntryId: z.number().int().positive().nullable().optional() });
export const AttachmentPatch = z.strictObject({ title: text.optional() }).refine(value => Object.keys(value).length > 0, 'Empty patch');
export type PhotoMeta = z.output<typeof PhotoUploadMeta>;
export type PhotoPatchInput = z.output<typeof PhotoPatch>;
export type AttachmentMeta = z.output<typeof AttachmentUploadMeta>;
export type AttachmentPatchInput = z.output<typeof AttachmentPatch>;
export interface PhotoOut {
  id: number; originalFilename: string; purpose: 'evidence' | 'location'; phase: PhotoPhase | null; caption: string | null; takenAt: string | null; uploadedBy: string; uploadedAt: string;
}
export interface AttachmentCapabilities {
  kind: 'image' | 'pdf' | 'email' | 'video' | 'audio' | 'document';
  view: 'native' | 'email' | 'download';
  download: true;
  mediaType?: string;
  reader?: 'eml' | 'msg';
}
export interface AttachmentOut {
  capabilities: AttachmentCapabilities;
  id: number; originalFilename: string; title: string | null; size: number; contentType: string; uploadedBy: string; uploadedAt: string;
  logEntry: { id: number; eventAt: string; text: string; private: boolean } | null;
}
