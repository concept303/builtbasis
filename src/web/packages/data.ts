import { useEffect, useState } from 'react';
import type { PackageDetail, PackageSummary } from '../../domain';
import type { Person } from '../../server/lists/people';
import type { RecordList } from '../../server/records/list';
import { api } from '../core/api';
import { useToday } from '../core/useToday';
export const packageBase = (projectId: number) => `/api/projects/${projectId}/work-packages`;
export function loadPackages(projectId: number, signal?: AbortSignal) {
  return api<{ today: string; packages: PackageSummary[] }>(packageBase(projectId), { signal });
}
export async function loadPackage(projectId: number, packageId: number, signal?: AbortSignal) {
  const [detail, records, people] = await Promise.all([
    api<PackageDetail>(`${packageBase(projectId)}/${packageId}`, { signal }),
    api<RecordList>(`/api/projects/${projectId}/records?workPackageId=${packageId}`, { signal }),
    api<Person[]>(`/api/projects/${projectId}/people`, { signal }),
  ]);
  return { detail, records: records.records, people };
}
export function usePackageRefresh() {
  const today = useToday(); const [revision, setRevision] = useState(0);
  useEffect(() => { const refresh = () => { if (document.visibilityState !== 'hidden') setRevision(n => n + 1); }; window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh); return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); }; }, []);
  return { today, revision, refresh: () => setRevision(n => n + 1) };
}
