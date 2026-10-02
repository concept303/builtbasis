import { codesOf, type Status, type Subtype } from './vocab';

const INCOMPLETE_ALLOWED: readonly Status[] = ['draft', 'cancelled', 'superseded'];
const END_STATES: readonly Status[] = ['closed', 'cancelled', 'superseded'];

/** Statuses a subtype may use (design §7.2). */
export function statusesFor(subtype: Subtype): Status[] {
  const all = codesOf('status');
  return subtype === 'detail_clarification' ? all : all.filter((status) => status !== 'superseded');
}

/** Active statuses require complete required fields (design §5, §8.2). */
export function isActive(status: Status): boolean {
  return !INCOMPLETE_ALLOWED.includes(status);
}

/** Non-terminal statuses can be superseded (design §8.1). */
export function isNonTerminal(status: Status): boolean {
  return !END_STATES.includes(status);
}
