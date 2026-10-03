import type { Db } from './connection';

/**
 * Updates the given columns of one row in a project-scoped table. Undefined values are left unchanged.
 * Table and column names come from code, never from request input.
 */
export function updateColumns(
  db: Db,
  table: string,
  projectId: number,
  id: number,
  values: Record<string, unknown>,
): void {
  const entries = Object.entries(values).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return;
  const assignments = entries.map(([column]) => `${column} = ?`).join(', ');
  db.prepare(`UPDATE ${table} SET ${assignments} WHERE project_id = ? AND id = ?`).run(
    ...entries.map(([, value]) => value),
    projectId,
    id,
  );
}
