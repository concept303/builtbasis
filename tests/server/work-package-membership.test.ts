import { afterEach, beforeEach, expect, it } from 'vitest';
import { createWorkPackage, deleteWorkPackage, updateWorkPackage } from '../../src/server/work-packages/store';
import { WorkPackageCreate } from '../../src/domain/work-packages';
import { createProject } from '../../src/server/lists/projects';
import { openDatabase } from '../../src/server/db/connection';
import { get, send } from './helpers';
import { getRecord, makeFixture, patchRecord, postRecord, recordUrl, type Fixture } from './record-fixture';
let f: Fixture;
beforeEach(async () => { f = await makeFixture(); });
afterEach(async () => { await f.ctx.close(); });
const pkg = (name: string, projectId = f.projectId) => createWorkPackage(f.ctx.db, projectId, WorkPackageCreate.parse({ name }));
it.each(['task', 'quality_issue', 'detail_clarification'])('assigns/moves/clears %s without inheritance and records historical names', async subtype => {
  const a = pkg('Tiles'); const b = pkg('Frames');
  const r = await postRecord(f, { subtype, workPackageId: a.id, title: 'Original' });
  expect(r).toMatchObject({ workPackageId: a.id, workPackageName: 'Tiles', responsibleId: null, dueDate: null, status: 'draft' });
  const before = await getRecord(f, r.id);
  updateWorkPackage(f.ctx.db, f.projectId, a.id, { name: 'Renamed tiles' });
  expect(await getRecord(f, r.id)).toMatchObject({ workPackageName: 'Renamed tiles', updatedAt: before.updatedAt });
  await patchRecord(f, r.id, { title: 'Edited' });
  expect((await getRecord(f, r.id)).workPackageId).toBe(a.id);
  await patchRecord(f, r.id, { workPackageId: b.id });
  await patchRecord(f, r.id, { workPackageId: b.id });
  await patchRecord(f, r.id, { workPackageId: null });
  deleteWorkPackage(f.ctx.db, f.projectId, b.id, 'Frames');
  const activity = (await get(f.ctx, f.cookie, recordUrl(f, r.id, '/activity'))).json().filter((e: { field: string }) => e.field === 'workPackageId');
  expect(activity).toHaveLength(3);
  expect(activity).toEqual(expect.arrayContaining([expect.objectContaining({ detail: { fromPackage: { id: a.id, name: 'Renamed tiles' }, toPackage: { id: b.id, name: 'Frames' } } })]));
  expect(await getRecord(f, r.id)).toMatchObject({ workPackageId: null, workPackageName: null });
});
it('rejects cross-project and missing selections atomically; accepts completed/cancelled packages', async () => {
  const other = createProject(f.ctx.db, { code: 'other', name: 'Other' });
  const foreign = pkg('Foreign', other.id);
  const r = await postRecord(f, { subtype: 'task', title: 'Original' });
  for (const id of [foreign.id, 99999]) {
    const response = await patchRecord(f, r.id, { workPackageId: id, title: 'Must roll back' });
    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe('work_package_not_found');
    expect((await getRecord(f, r.id)).title).toBe('Original');
  }
  const p = pkg('Finished');
  for (const status of ['completed', 'cancelled'] as const) {
    updateWorkPackage(f.ctx.db, f.projectId, p.id, { status });
    expect((await patchRecord(f, r.id, { workPackageId: p.id })).statusCode).toBe(200);
  }
});
it('filters absence, none and package ID and rejects malformed and unknown filters', async () => {
  const p = pkg('Tiles');
  const grouped = await postRecord(f, { subtype: 'task', workPackageId: p.id });
  const ungrouped = await postRecord(f, { subtype: 'task' });
  for (const [query, ids] of [['', [grouped.id, ungrouped.id]], ['?workPackageId=none', [ungrouped.id]], [`?workPackageId=${p.id}`, [grouped.id]]] as const) {
    const res = await get(f.ctx, f.cookie, `${f.base}/records${query}`);
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json().records.map((r: { id: number }) => r.id)).toEqual(ids);
    expect(res.json().totals.count).toBe(ids.length);
  }
  for (const value of ['0', '-1', 'oops', '1,2']) expect((await get(f.ctx, f.cookie, `${f.base}/records?workPackageId=${value}`)).statusCode).toBe(400);
  expect((await get(f.ctx, f.cookie, `${f.base}/records?workPackageId=99999`)).statusCode).toBe(404);
});
it('serializes API assignment with deletion from a separate connection', async () => {
  const p = pkg('Tiles'); const r = await postRecord(f, { subtype: 'task' });
  const second = openDatabase(f.ctx.config.dbPath);
  try {
    expect((await patchRecord(f, r.id, { workPackageId: p.id })).statusCode).toBe(200);
    expect(() => deleteWorkPackage(second, f.projectId, p.id, p.name)).toThrow('work_package_not_empty');
    await patchRecord(f, r.id, { workPackageId: null });
    deleteWorkPackage(second, f.projectId, p.id, p.name);
    expect((await patchRecord(f, r.id, { workPackageId: p.id })).statusCode).toBe(404);
    expect((await send(f.ctx, f.cookie, 'POST', `${f.base}/records`, { subtype: 'task', workPackageId: p.id })).statusCode).toBe(404);
    expect(f.ctx.db.pragma('foreign_key_check')).toEqual([]);
  } finally { second.close(); }
});
