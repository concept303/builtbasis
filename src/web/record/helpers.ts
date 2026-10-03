import { isCode, labelOf, normalizeLabel, type Lang, type ListKey, type MeasurementRow, type RecordPatchInput } from '../../domain';

export function changedPatch(before: RecordPatchInput, after: RecordPatchInput): RecordPatchInput {
  return Object.fromEntries(Object.entries(after).filter(([key, value]) => !(key === 'estimatedCost' && after.outsideScope === false) && JSON.stringify(value) !== JSON.stringify(before[key as keyof RecordPatchInput])));
}
export function localInput(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function logDateFields(original: string): { local: string; offset: string } {
  const date = new Date(original); const minutes = -date.getTimezoneOffset();
  const pad = (value: number) => String(value).padStart(2, '0');
  return { local: `${localInput(date)}:${pad(date.getSeconds())}.${String(date.getMilliseconds()).padStart(3, '0')}`, offset: `${minutes < 0 ? '-' : '+'}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}` };
}
export function logTimestamp(local: string, offset: string, initial?: { original: string; local: string; offset: string }): string {
  if (initial && local === initial.local && offset === initial.offset) return initial.original;
  const match = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
  if (!match || Number(match[2]) > 14 || Number(match[3]) > 59 || (Number(match[2]) === 14 && Number(match[3]) !== 0)) throw new RangeError('invalid_event_time');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(local)) throw new RangeError('invalid_event_time');
  const wall = new Date(local + 'Z');
  if (!Number.isFinite(wall.getTime()) || wall.toISOString().slice(0, 16) !== local.slice(0, 16)) throw new RangeError('invalid_event_time');
  const result = new Date(local + offset);
  if (!Number.isFinite(result.getTime())) throw new RangeError('invalid_event_time');
  return result.toISOString();
}
export function signedBar(value: number, maxAbsolute: number): { left: number; width: number } {
  const width = Math.abs(value) / Math.max(maxAbsolute, Number.EPSILON) * 50;
  return { left: value < 0 ? 50 - width : 50, width };
}
export function measurementGroups(rows: readonly MeasurementRow[]): MeasurementRow[] {
  const seen = new Set<string>();
  return rows.filter(row => {
    const key = JSON.stringify([normalizeLabel(row.item), normalizeLabel(row.quantity), row.unit]);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
export function dateText(value: string | null, lang: Lang): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(lang === 'el' ? 'el-GR' : 'en-GB', value.length === 10 ? { dateStyle: 'medium' } : { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value.length === 10 ? `${value}T12:00:00` : value));
}
export function displayValue(field: string | null, value: unknown, lang: Lang, people: { id: number; name: string }[]): string {
  if (value == null || value === '') return '—';
  if (field?.endsWith('ById') || field === 'ballInCourtId' || field === 'responsibleId') return people.find(person => person.id === value)?.name ?? (lang === 'en' ? 'Unavailable person' : 'Μη διαθέσιμο άτομο');
  const vocab: Record<string, ListKey> = { status: 'status', severity: 'severity', priority: 'priority', disposition: 'disposition' };
  const list = field ? vocab[field] : undefined;
  if (list && isCode(list, value)) return labelOf(list, value, lang);
  if (field === 'dueDate' || field === 'decidedOn') return dateText(String(value), lang);
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '—';
}
