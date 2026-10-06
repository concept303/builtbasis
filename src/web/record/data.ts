import type { WorkPackage, SharedRecord } from '../../domain';
import type { RecordDetail } from '../../server/records/records';
import type { ActivityEntry } from '../../server/records/activity';
import type { Person } from '../../server/lists/people';
import type { LocationNode } from '../../server/lists/locations';
import { api } from '../core/api';
import type { ViewContext } from '../core/types';

export type Named = { id: number; nameEn: string; nameEl: string; active?: boolean };
export type Log = SharedRecord['log'][number] & { private?: boolean };
export interface RecordData extends Omit<SharedRecord, 'record' | 'log' | 'activity'> {
  record: SharedRecord['record'] | RecordDetail;
  log: Log[];
  activity: (SharedRecord['activity'][number] | ActivityEntry)[];
  permissions: { canUpload: boolean; canAddLog: boolean };
  owner?: { packages: WorkPackage[]; people: Person[]; trades: Named[]; tags: Named[]; locations: LocationNode[]; records: { id: number; humanId: string; title: string | null }[] };
}
export async function loadRecord(context: ViewContext, signal: AbortSignal): Promise<RecordData> {
  const get = <T,>(path: string) => api<T>(path, { signal, ...(context.token ? { token: context.token } : {}) });
  if (context.mode !== 'owner') {
    const result = await get<SharedRecord & { permissions?: RecordData['permissions'] }>(context.base + (context.mode === 'shared' ? '/record' : ''));
    return { ...result, permissions: result.permissions ?? { canUpload: false, canAddLog: false } };
  }
  const project = `/api/projects/${context.projectId}`;
  const [record, options, measurements, verifications, photos, attachments, log, activity, people, trades, tags, locations, records, packages] = await Promise.all([
    get<RecordDetail>(context.base), get<SharedRecord['options']>(context.base + '/options'), get<SharedRecord['measurements']>(context.base + '/measurement-sets'), get<SharedRecord['verifications']>(context.base + '/verifications'), get<SharedRecord['photos']>(context.base + '/photos'), get<SharedRecord['attachments']>(context.base + '/attachments'), get<Log[]>(context.base + '/log'), get<ActivityEntry[]>(context.base + '/activity'), get<Person[]>(project + '/people'), get<Named[]>(project + '/trades'), get<Named[]>(project + '/tags'), get<LocationNode[]>(project + '/locations'), get<{ records: { id: number; humanId: string; title: string | null }[] }>(project + '/records'), get<{ packages: WorkPackage[] }>(project + '/work-packages'),
  ]);
  const pathOf = (node: LocationNode): LocationNode[] => {
    const path = [node]; const seen = new Set([node.id]); let parent = node.parentId;
    while (parent !== null) { const next = locations.find(item => item.id === parent); if (!next || seen.has(next.id)) break; path.unshift(next); seen.add(next.id); parent = next.parentId; }
    return path;
  };
  return { record, options, measurements, verifications, photos, attachments, log, activity, permissions: { canUpload: true, canAddLog: true }, labels: { people, trades, tags, locations: locations.map(node => ({ id: node.id, path: pathOf(node) })), zoneTypes: [] }, owner: { packages: packages.packages, people, trades, tags, locations, records: records.records } };
}
