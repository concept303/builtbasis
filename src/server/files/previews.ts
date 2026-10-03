import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { resolveAttachmentFile, type FileTarget } from './downloads';
import { attachmentCapabilities } from './formats';

/** Access to the record must already be authorized. The occurrence and current Log privacy are checked here. */
export function describeAttachment(db: Db, recordId: number, attachmentId: number, audience: 'owner' | 'shared') {
  const target = resolveAttachmentFile(db,recordId,attachmentId,audience);
  return {id:attachmentId,filename:target.filename,size:target.size,contentType:target.contentType,
    capabilities:attachmentCapabilities(target.filename,target.contentType)};
}
export function resolveAttachmentView(db: Db, recordId: number, attachmentId: number, audience: 'owner' | 'shared'): FileTarget {
  const target = resolveAttachmentFile(db,recordId,attachmentId,audience);
  const capabilities = attachmentCapabilities(target.filename,target.contentType);
  if (capabilities.view !== 'native' || !capabilities.mediaType) throw new HttpError(415,'preview_unavailable');
  return {...target,contentType:capabilities.mediaType};
}
