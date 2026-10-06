import { calendarToday, isOutstanding } from '../../domain/calendar';
import { foldText } from '../../domain/text';
import { codesOf, type Status, type Subtype } from '../../domain/vocab';
import { WorkPackageCreate, WorkPackagePatch, type WorkPackage, type WorkPackageInput, type WorkPackagePatchInput, type PackageCounts, type PackageDetail, type PackageSummary } from '../../domain/work-packages';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { requireProject } from '../lists/projects';
import { checkPerson } from '../records/references';

const SELECT = `SELECT id,project_id AS projectId,name,description,responsible_id AS responsibleId,target_date AS targetDate,status,created_at AS createdAt,updated_at AS updatedAt FROM work_packages`;
export function getWorkPackage(db: Db, projectId: number, id: number): WorkPackage {
  const row = db.prepare(`${SELECT} WHERE project_id=? AND id=?`).get(projectId, id) as WorkPackage | undefined;
  if (!row) throw new HttpError(404, 'work_package_not_found');
  return row;
}
function checkName(db: Db, projectId: number, name: string, exceptId: number | null = null): void {
  const existing = db.prepare('SELECT name FROM work_packages WHERE project_id=? AND name_key=? AND id IS NOT ?').get(projectId, foldText(name), exceptId) as { name: string } | undefined;
  if (existing) throw new HttpError(409, 'work_package_name_taken', { existingName: existing.name });
}
export function createWorkPackage(db: Db, projectId: number, input: WorkPackageInput, now = new Date()): WorkPackage {
  const body = WorkPackageCreate.parse(input);
  return db.transaction(() => {
    requireProject(db, projectId);
    checkName(db, projectId, body.name);
    checkPerson(db, projectId, 'responsibleId', body.responsibleId);
    const stamp = now.toISOString();
    const id = Number(db.prepare('INSERT INTO work_packages(project_id,name,name_key,description,responsible_id,target_date,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(projectId, body.name, foldText(body.name), body.description, body.responsibleId, body.targetDate, body.status, stamp, stamp).lastInsertRowid);
    return getWorkPackage(db, projectId, id);
  }).immediate();
}
export function updateWorkPackage(db: Db, projectId: number, id: number, patch: WorkPackagePatchInput, now = new Date()): WorkPackage {
  const input = WorkPackagePatch.parse(patch);
  return db.transaction(() => {
    const current = getWorkPackage(db, projectId, id);
    const body = { ...current, ...input };
    checkName(db, projectId, body.name, id);
    checkPerson(db, projectId, 'responsibleId', body.responsibleId, current.responsibleId);
    db.prepare('UPDATE work_packages SET name=?,name_key=?,description=?,responsible_id=?,target_date=?,status=?,updated_at=? WHERE id=?').run(body.name, foldText(body.name), body.description, body.responsibleId, body.targetDate, body.status, now.toISOString(), id);
    return getWorkPackage(db, projectId, id);
  }).immediate();
}
type Group = { packageId: number; subtype: Subtype; status: Status; count: number; overdue: number };
function groups(db: Db, projectId: number, today: string, id: number | null = null): Group[] {
  return db.prepare(`SELECT work_package_id AS packageId,subtype,status,count(*) AS count,
    sum(CASE WHEN due_date < ? AND status NOT IN ('closed','cancelled','superseded') THEN 1 ELSE 0 END) AS overdue
    FROM records WHERE project_id=? AND work_package_id IS NOT NULL ${id === null ? '' : 'AND work_package_id=?'}
    GROUP BY work_package_id,subtype,status`).all(...(id === null ? [today, projectId] : [today, projectId, id])) as Group[];
}
function counts(rows: Group[]): PackageCounts {
  const byStatus = Object.fromEntries(codesOf('status').map(s => [s, 0])) as Record<Status, number>;
  const result: PackageCounts = { total: 0, outstanding: 0, overdue: 0, byStatus };
  for (const row of rows) {
    result.total += row.count; result.byStatus[row.status] += row.count; result.overdue += row.overdue;
    if (isOutstanding(row.status)) result.outstanding += row.count;
  }
  return result;
}
export function listWorkPackages(db: Db, projectId: number, now = new Date()): { today: string; packages: PackageSummary[] } {
  requireProject(db, projectId);
  const today = calendarToday(now);
  return db.transaction(() => {
    const packages = db.prepare(`${SELECT} WHERE project_id=? ORDER BY id`).all(projectId) as WorkPackage[];
    const byPackage = new Map<number, Group[]>();
    for (const row of groups(db, projectId, today)) { const list = byPackage.get(row.packageId) ?? []; list.push(row); byPackage.set(row.packageId, list); }
    return { today, packages: packages.map(p => ({ ...p, counts: counts(byPackage.get(p.id) ?? []) })) };
  })();
}
export function getWorkPackageDetail(db: Db, projectId: number, id: number, now = new Date()): PackageDetail {
  const today = calendarToday(now);
  return db.transaction(() => {
    const p = getWorkPackage(db, projectId, id);
    const rows = groups(db, projectId, today, id);
    return { ...p, today, counts: counts(rows), bySubtypeStatus: rows.map(({ subtype, status, count }) => ({ subtype, status, count })) };
  })();
}
export function deleteWorkPackage(db: Db, projectId: number, id: number, confirmName: string): void {
  db.transaction(() => {
    const p = getWorkPackage(db, projectId, id);
    const recordCount = db.prepare('SELECT count(*) FROM records WHERE work_package_id=?').pluck().get(id) as number;
    if (recordCount) throw new HttpError(409, 'work_package_not_empty', { recordCount });
    if (p.name !== confirmName) throw new HttpError(409, 'work_package_confirmation_mismatch');
    db.prepare('DELETE FROM work_packages WHERE id=?').run(id);
  }).immediate();
}
