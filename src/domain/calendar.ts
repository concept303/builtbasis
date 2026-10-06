import { z } from 'zod';
import type { Status } from './vocab';
import type { PackageStatus } from './work-packages';

export const PROJECT_TIME_ZONE = 'Europe/Athens';
const formatter = new Intl.DateTimeFormat('en', { timeZone: PROJECT_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
export function calendarToday(now = new Date()): string {
  const parts = formatter.formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function isOutstanding(status: Status): boolean { return !['closed', 'cancelled', 'superseded'].includes(status); }
export function isOverdue(status: Status, dueDate: string | null, today: string): boolean {
  return dueDate !== null && dueDate < today && isOutstanding(status);
}
export function isPastTarget(status: PackageStatus, targetDate: string | null, today: string): boolean {
  return targetDate !== null && targetDate < today && status !== 'completed' && status !== 'cancelled';
}
export function calendarDayDifference(from: string, to: string): number {
  const date = z.iso.date();
  return (Date.parse(`${date.parse(to)}T00:00:00Z`) - Date.parse(`${date.parse(from)}T00:00:00Z`)) / 86_400_000;
}
