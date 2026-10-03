import type { AttachmentMeta, AttachmentOut, AttachmentPatchInput, PhotoMeta, PhotoOut, PhotoPatchInput } from '../../domain';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { requireRecord, touchRecord } from '../records/store';
import type { StagedFile } from './storage';
import type { UploadEnvelope } from './uploads';

const PHOTO_SELECT = `SELECT p.id, p.original_filename AS originalFilename, p.phase, p.caption, p.taken_at AS takenAt,
  u.display_name AS uploadedBy, p.uploaded_at AS uploadedAt FROM photos p JOIN users u ON u.id = p.uploaded_by`;

export function listPhotos(db: Db, recordId: number): PhotoOut[] {
  return db.prepare(`${PHOTO_SELECT} WHERE p.record_id = ?
    ORDER BY CASE p.phase WHEN 'before' THEN 0 WHEN 'during' THEN 1 ELSE 2 END, p.uploaded_at DESC, p.id DESC`).all(recordId) as PhotoOut[];
}

export function listAttachments(db: Db, recordId: number): AttachmentOut[] {
  const rows = db.prepare(`SELECT a.id, a.original_filename AS originalFilename, a.title, b.size, b.content_type AS contentType,
    u.display_name AS uploadedBy, a.uploaded_at AS uploadedAt, l.id AS logId, l.event_at AS eventAt, l.text, l.private
    FROM attachments a JOIN blobs b ON b.hash = a.blob_hash JOIN users u ON u.id = a.uploaded_by
    LEFT JOIN log_entries l ON l.id = a.log_entry_id AND l.record_id = a.record_id
    WHERE a.record_id = ? ORDER BY a.uploaded_at DESC, a.id DESC`).all(recordId) as (Omit<AttachmentOut, 'logEntry'> & {
      logId: number | null; eventAt: string; text: string; private: number;
    })[];
  return rows.map(row => ({
    id: row.id,
    originalFilename: row.originalFilename,
    title: row.title,
    size: row.size,
    contentType: row.contentType,
    uploadedBy: row.uploadedBy,
    uploadedAt: row.uploadedAt,
    logEntry: row.logId === null ? null : { id: row.logId, eventAt: row.eventAt, text: row.text, private: row.private === 1 },
  }));
}

export function requireOccurrence(db: Db, kind: 'photos' | 'attachments', recordId: number, id: number): void {
  if (!db.prepare(`SELECT id FROM ${kind} WHERE record_id = ? AND id = ?`).get(recordId, id)) {
    throw new HttpError(404, 'file_not_found');
  }
}

function insertBlob(db: Db, file: StagedFile): void {
  db.prepare('INSERT OR IGNORE INTO blobs(hash, size, content_type) VALUES (?, ?, ?)').run(file.hash, file.size, file.contentType);
  const row = db.prepare('SELECT size, content_type AS contentType FROM blobs WHERE hash = ?').get(file.hash) as { size: number; contentType: string };
  if (row.size !== file.size || row.contentType !== file.contentType) throw new Error('blob_metadata_collision');
}

/** Called only after all files are published. Recheck associations inside the synchronous transaction. */
export function saveUpload(db: Db, projectId: number, recordId: number, userId: number, kind: 'photos' | 'attachments', envelope: UploadEnvelope): PhotoOut | AttachmentOut {
  return db.transaction(() => {
    requireRecord(db, projectId, recordId);
    const at = new Date().toISOString();
    let id: number;
    if (kind === 'photos') {
      const meta = envelope.metadata as PhotoMeta;
      const { original, display, thumbnail } = envelope.files;
      if (!original || !display || !thumbnail) throw new HttpError(400, 'invalid_upload');
      for (const file of [original, display, thumbnail]) insertBlob(db, file);
      id = Number(db.prepare(`INSERT INTO photos(record_id, original_hash, display_hash, thumbnail_hash, original_filename, phase, caption, taken_at, uploaded_by, uploaded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(recordId, original.hash, display.hash, thumbnail.hash, original.filename, meta.phase, meta.caption ?? null, meta.takenAt ?? null, userId, at).lastInsertRowid);
    } else {
      const meta = envelope.metadata as AttachmentMeta;
      if (meta.logEntryId != null && !db.prepare('SELECT id FROM log_entries WHERE id = ? AND record_id = ?').get(meta.logEntryId, recordId)) {
        throw new HttpError(404, 'log_entry_not_found');
      }
      const file = envelope.files.file;
      if (!file) throw new HttpError(400, 'invalid_upload');
      insertBlob(db, file);
      id = Number(db.prepare(`INSERT INTO attachments(record_id, blob_hash, original_filename, title, log_entry_id, uploaded_by, uploaded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`).run(recordId, file.hash, file.filename, meta.title ?? null, meta.logEntryId ?? null, userId, at).lastInsertRowid);
    }
    touchRecord(db, recordId, userId, at);
    return (kind === 'photos' ? listPhotos(db, recordId) : listAttachments(db, recordId)).find(row => row.id === id)!;
  })();
}

export function editOccurrence(db: Db, projectId: number, recordId: number, id: number, userId: number, kind: 'photos' | 'attachments', patch: PhotoPatchInput | AttachmentPatchInput): PhotoOut | AttachmentOut {
  return db.transaction(() => {
    requireRecord(db, projectId, recordId);
    requireOccurrence(db, kind, recordId, id);
    const fields = kind === 'photos' ? { phase: 'phase', caption: 'caption', takenAt: 'taken_at' } : { title: 'title' };
    for (const [key, column] of Object.entries(fields)) {
      if (Object.hasOwn(patch, key)) db.prepare(`UPDATE ${kind} SET ${column} = ? WHERE id = ?`).run((patch as Record<string, unknown>)[key], id);
    }
    touchRecord(db, recordId, userId, new Date().toISOString());
    return (kind === 'photos' ? listPhotos(db, recordId) : listAttachments(db, recordId)).find(row => row.id === id)!;
  })();
}

export function deleteOccurrence(db: Db, projectId: number, recordId: number, id: number, userId: number, kind: 'photos' | 'attachments'): void {
  db.transaction(() => {
    requireRecord(db, projectId, recordId);
    requireOccurrence(db, kind, recordId, id);
    db.prepare(`DELETE FROM ${kind} WHERE id = ?`).run(id);
    touchRecord(db, recordId, userId, new Date().toISOString());
  })();
}
