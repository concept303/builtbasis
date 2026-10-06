const filters = new Set(['q','subtype','status','priority','severity','stage','problemType','tradeId','tagId','zoneTypeId','ballInCourtId','responsibleId','locationId','safety','outsideScope','blocking','dueFrom','dueTo','before','after','sort','dir','workPackageId']);
export function recordReturnPath(projectId: number, from: string | null): string {
  const fallback = `/projects/${projectId}/records`;
  if (!from || /[\\#\u0000-\u001f]/.test(from)) return fallback;
  try { decodeURIComponent(from); } catch { return fallback; }
  const source = from.startsWith('?') ? fallback + from : from;
  const [path, query = '', extra] = source.split('?');
  if (extra !== undefined) return fallback;
  if (path === fallback) {
    const params = new URLSearchParams(query);
    for (const key of params.keys()) if (!filters.has(key)) return fallback;
    return fallback + (params.size ? `?${params}` : '');
  }
  const match = /^\/projects\/(\d+)\/work-packages\/([1-9]\d*)$/.exec(path ?? '');
  if (match && Number(match[1]) === projectId && !query && Number.isSafeInteger(Number(match[2]))) return `/projects/${projectId}/work-packages/${Number(match[2])}`;
  return fallback;
}
