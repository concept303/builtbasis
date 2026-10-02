import type { Subtype } from './vocab';

const PREFIX: Record<Subtype, string> = {
  quality_issue: 'QI',
  detail_clarification: 'DC',
  task: 'T',
};

/** Human ID: subtype prefix + per-project, per-subtype sequence (design §4.2). */
export function formatHumanId(subtype: Subtype, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new RangeError(`Sequence must be a positive integer, got ${sequence}`);
  }
  return `${PREFIX[subtype]}-${String(sequence).padStart(4, '0')}`;
}
