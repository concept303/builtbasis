import type { Db } from '../db/connection';
import { HttpError } from '../errors';

export interface ContributorAccess {
  projectId: number;
  recordId: number;
  canUpload: boolean;
  canAddLog: boolean;
}

/** Presence grants read access. Each write capability is independent and checked afresh. */
export function requireContributorAccess(
  db: Db,
  userId: number,
  recordId: number,
  permission: 'read' | 'upload' | 'addLog' = 'read',
): ContributorAccess {
  const row = db.prepare(`SELECT r.project_id AS projectId, r.id AS recordId,
    g.can_upload AS canUpload, g.can_add_log AS canAddLog
    FROM record_grants g JOIN records r ON r.id = g.record_id JOIN users u ON u.id = g.user_id
    WHERE g.user_id = ? AND r.id = ? AND r.status <> 'draft' AND u.is_active = 1 AND u.is_owner = 0`)
    .get(userId, recordId) as { projectId: number; recordId: number; canUpload: number; canAddLog: number } | undefined;
  if (!row) throw new HttpError(404, 'not_available');
  if ((permission === 'upload' && !row.canUpload) || (permission === 'addLog' && !row.canAddLog)) {
    throw new HttpError(403, 'permission_denied');
  }
  return { ...row, canUpload: row.canUpload === 1, canAddLog: row.canAddLog === 1 };
}
