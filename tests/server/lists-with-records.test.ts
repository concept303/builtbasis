import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTag } from '../../src/server/lists/tags';
import { get, send } from './helpers';
import { getRecord, makeFixture, patchRecord, postRecord, type Fixture } from './record-fixture';

let f: Fixture;
beforeEach(async () => {
  f = await makeFixture();
});
afterEach(async () => {
  await f.ctx.close();
});

const tagUrl = (id: number, suffix = '') => `${f.base}/tags/${id}${suffix}`;

describe('tags on records (design §9.3)', () => {
  it('a merge moves the records to the remaining tag, once per record', async () => {
    const onlySource = await postRecord(f, { subtype: 'task', tagIds: [f.tags.windows] });
    const both = await postRecord(f, { subtype: 'task', tagIds: [f.tags.windows, f.tags.stone] });
    const merged = await send(f.ctx, f.cookie, 'POST', tagUrl(f.tags.windows, '/merge'), { intoId: f.tags.stone });
    expect(merged.statusCode).toBe(200);
    expect((await getRecord(f, onlySource.id)).tagIds).toEqual([f.tags.stone]);
    expect((await getRecord(f, both.id)).tagIds).toEqual([f.tags.stone]);
    expect((await get(f.ctx, f.cookie, tagUrl(f.tags.stone, '/usage'))).json()).toEqual({ records: 2 });
  });

  it('shows how many records a tag is on, and a delete removes it from them', async () => {
    const record = await postRecord(f, { subtype: 'task', tagIds: [f.tags.stone, f.tags.windows] });
    expect((await get(f.ctx, f.cookie, tagUrl(f.tags.stone, '/usage'))).json()).toEqual({ records: 1 });
    expect((await send(f.ctx, f.cookie, 'DELETE', tagUrl(f.tags.stone))).statusCode).toBe(200);
    expect((await getRecord(f, record.id)).tagIds).toEqual([f.tags.windows]);
  });

  it('a rename applies to every record carrying the tag', async () => {
    await postRecord(f, { subtype: 'task', tagIds: [f.tags.stone] });
    await send(f.ctx, f.cookie, 'PATCH', tagUrl(f.tags.stone), { nameEn: 'Natural stone' });
    const records = (await get(f.ctx, f.cookie, `${f.base}/records?tagId=${f.tags.stone}`)).json();
    expect(records.totals.count).toBe(1);
  });
});

describe('record update time after tag operations', () => {
  it('a merge or delete marks the records whose tags change as updated, and only those', async () => {
    const pool = createTag(f.ctx.db, f.projectId, { nameEl: 'Πισίνα', nameEn: 'Pool' }).id;
    const merged = await postRecord(f, { subtype: 'task', tagIds: [f.tags.windows] });
    const deleted = await postRecord(f, { subtype: 'task', tagIds: [pool] });
    const untouched = await postRecord(f, { subtype: 'task', tagIds: [f.tags.stone] });
    const old = '2000-01-01T00:00:00.000Z';
    const ownerId = f.ctx.db.prepare('SELECT updated_by FROM records WHERE id = ?').pluck().get(merged.id);
    const otherUser = f.ctx.db.prepare("INSERT INTO users (username, password_hash, created_at, updated_at) VALUES ('other', 'h', 't', 't')").run().lastInsertRowid;
    f.ctx.db.prepare('UPDATE records SET updated_at = ?, updated_by = ?').run(old, otherUser);
    await send(f.ctx, f.cookie, 'POST', tagUrl(f.tags.windows, '/merge'), { intoId: f.tags.stone });
    await send(f.ctx, f.cookie, 'DELETE', tagUrl(pool));
    expect((await getRecord(f, merged.id)).updatedAt).not.toBe(old);
    expect((await getRecord(f, deleted.id)).updatedAt).not.toBe(old);
    expect((await getRecord(f, untouched.id)).updatedAt).toBe(old);
    for (const id of [merged.id, deleted.id]) {
      expect(f.ctx.db.prepare('SELECT updated_by FROM records WHERE id = ?').pluck().get(id)).toBe(ownerId);
    }
    expect(f.ctx.db.prepare('SELECT updated_by FROM records WHERE id = ?').pluck().get(untouched.id)).toBe(Number(otherUser));
  });

  it.each(['merge', 'delete'] as const)('rolls back record changes when tag %s fails', async (operation) => {
    const record = await postRecord(f, { subtype: 'task', tagIds: [f.tags.windows] });
    f.ctx.db.exec("CREATE TRIGGER prevent_tag_delete BEFORE DELETE ON tags BEGIN SELECT RAISE(ABORT, 'forced failure'); END");
    const response = operation === 'merge'
      ? await send(f.ctx, f.cookie, 'POST', tagUrl(f.tags.windows, '/merge'), { intoId: f.tags.stone })
      : await send(f.ctx, f.cookie, 'DELETE', tagUrl(f.tags.windows));
    expect(response.statusCode).toBe(500);
    expect(await getRecord(f, record.id)).toEqual(record);
    expect(f.ctx.db.prepare('SELECT id FROM tags WHERE id = ?').pluck().get(f.tags.windows)).toBe(f.tags.windows);
  });
});

describe('locations on records (design §9.4)', () => {
  it('refuses to delete a node that a record uses, directly or inside it', async () => {
    const record = await postRecord(f, { subtype: 'task', locationIds: [f.locations.v1Kitchen] });
    for (const node of [f.locations.v1Kitchen, f.locations.villa1]) {
      const res = await send(f.ctx, f.cookie, 'DELETE', `${f.base}/locations/${node}`);
      expect(res.statusCode).toBe(409);
      expect(res.json()).toEqual({ error: 'location_in_use', details: { records: 1 } });
    }
    const retired = await send(f.ctx, f.cookie, 'PATCH', `${f.base}/locations/${f.locations.villa1}`, { active: false });
    expect(retired.json()).toMatchObject({ active: false });
    await patchRecord(f, record.id, { locationIds: [] });
    expect((await send(f.ctx, f.cookie, 'DELETE', `${f.base}/locations/${f.locations.villa1}`)).statusCode).toBe(200);
  });
});
