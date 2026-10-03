import type { RecordDetail } from '../../src/server/records/records';
import { createLocation, updateLocation } from '../../src/server/lists/locations';
import { createPerson } from '../../src/server/lists/people';
import { createProject } from '../../src/server/lists/projects';
import { createTag } from '../../src/server/lists/tags';
import { createTrade } from '../../src/server/lists/trades';
import { createZoneType } from '../../src/server/lists/zone-types';
import { get, loginAsOwner, makeContext, send, type TestContext } from './helpers';

/** A logged-in owner and one project with small managed lists. Names are made up. */
export interface Fixture {
  ctx: TestContext;
  cookie: string;
  projectId: number;
  /** `/api/projects/<projectId>` */
  base: string;
  people: { architect: number; contractor: number; retired: number };
  trades: { tiling: number; masonry: number; retired: number };
  tags: { stone: number; windows: number };
  zones: { kitchen: number };
  /** Villa 1 › Ground › Kitchen, Villa 2 › Ground › Kitchen, and a retired top-level node. */
  locations: {
    villa1: number;
    v1Ground: number;
    v1Kitchen: number;
    villa2: number;
    v2Ground: number;
    v2Kitchen: number;
    retired: number;
  };
}

export async function makeFixture(): Promise<Fixture> {
  const ctx = await makeContext();
  const cookie = await loginAsOwner(ctx);
  const { db } = ctx;
  const projectId = createProject(db, { code: 'p1', name: 'Project 1' }).id;
  const person = (code: string, active = true) =>
    createPerson(db, projectId, { code, name: `Person ${code}`, role: 'other', active }).id;
  const trade = (code: string, active = true) => createTrade(db, projectId, { code, nameEn: code, active }).id;
  const kitchen = createZoneType(db, projectId, { nameEn: 'Kitchen' }).id;
  const node = (nameEn: string, kind: 'building' | 'level' | 'space', parentId?: number, zoneTypeId?: number) =>
    createLocation(db, projectId, { nameEn, kind, parentId, zoneTypeId }).id;

  const villa1 = node('Villa 1', 'building');
  const v1Ground = node('Ground', 'level', villa1);
  const villa2 = node('Villa 2', 'building');
  const v2Ground = node('Ground', 'level', villa2);
  const retired = node('Old wing', 'building');
  updateLocation(db, projectId, retired, { active: false });

  return {
    ctx,
    cookie,
    projectId,
    base: `/api/projects/${projectId}`,
    people: { architect: person('ARCH'), contractor: person('C-PB'), retired: person('OLD', false) },
    trades: { tiling: trade('TIL'), masonry: trade('MAS'), retired: trade('OLD', false) },
    tags: {
      stone: createTag(db, projectId, { nameEl: 'Πέτρα', nameEn: 'Stone' }).id,
      windows: createTag(db, projectId, { nameEl: 'Κουφώματα', nameEn: 'Windows' }).id,
    },
    zones: { kitchen },
    locations: {
      villa1,
      v1Ground,
      v1Kitchen: node('Kitchen', 'space', v1Ground, kitchen),
      villa2,
      v2Ground,
      v2Kitchen: node('Kitchen', 'space', v2Ground, kitchen),
      retired,
    },
  };
}

export const recordUrl = (f: Fixture, id: number, suffix = ''): string => `${f.base}/records/${id}${suffix}`;

/** Creates a record through the API; fails the test unless it is created. */
export async function postRecord(f: Fixture, body: object): Promise<RecordDetail> {
  const res = await send(f.ctx, f.cookie, 'POST', `${f.base}/records`, body);
  if (res.statusCode !== 201) throw new Error(`create failed: ${res.statusCode} ${res.body}`);
  return res.json();
}

export function patchRecord(f: Fixture, id: number, body: object) {
  return send(f.ctx, f.cookie, 'PATCH', recordUrl(f, id), body);
}

export async function getRecord(f: Fixture, id: number): Promise<RecordDetail> {
  return (await get(f.ctx, f.cookie, recordUrl(f, id))).json();
}

/** Test set-up only: puts a record straight into a status, bypassing the transition rules. */
export function forceStatus(f: Fixture, id: number, status: string): void {
  f.ctx.db.prepare('UPDATE records SET status = ? WHERE id = ?').run(status, id);
}
