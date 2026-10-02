import { isActive } from './statuses';
import type { Disposition, ProblemType, Status, Subtype } from './vocab';

/** The fields of a record that the domain rules need (design §5–§8). */
export interface RecordState {
  subtype: Subtype;
  status: Status;
  statusBeforeHold: Status | null;
  title: string | null;
  problemTypes: readonly ProblemType[];
  question: string | null;
  disposition: Disposition | null;
  decidedById: number | null;
  decidedOn: string | null;
}

export type RequiredField = 'title' | 'problemTypes' | 'question';

export type RuleError =
  | `required:${RequiredField}`
  | 'disposition_required'
  | 'decision_required'
  | 'accept_as_is_required'
  | 'transition_not_allowed'
  | 'reason_required'
  | 'reason_invalid'
  | 'reason_note_required'
  | 'note_required'
  | 'verification_required';

export const hasText = (value: string | null | undefined): boolean =>
  typeof value === 'string' && value.trim() !== '';

const DECISION_DISPOSITIONS: readonly Disposition[] = ['repair', 'accept_as_is'];
const DISPOSITION_STATUSES: readonly Status[] = ['issued', 'in_progress', 'ready_for_verification', 'closed'];

/** Required fields missing for the record's current status (design §5.1, §6.1, §6.2). */
export function missingRequired(record: RecordState): RequiredField[] {
  if (!isActive(record.status)) return [];
  const missing: RequiredField[] = [];
  if (!hasText(record.title)) missing.push('title');
  if (record.subtype === 'quality_issue' && record.problemTypes.length === 0) missing.push('problemTypes');
  if (record.subtype === 'detail_clarification' && !hasText(record.question)) missing.push('question');
  return missing;
}

/** Repair and Accept as is need Decided by and Decided on (design §5.6, §6.1). */
export function needsDecision(record: Pick<RecordState, 'disposition' | 'decidedById' | 'decidedOn'>): boolean {
  return (
    record.disposition !== null &&
    DECISION_DISPOSITIONS.includes(record.disposition) &&
    (record.decidedById === null || !hasText(record.decidedOn))
  );
}

/** Rules every save must satisfy in the record's current status (design §8.2). */
export function validateSave(record: RecordState): RuleError[] {
  const errors: RuleError[] = missingRequired(record).map((field) => `required:${field}` as const);
  if (record.subtype === 'quality_issue' && isActive(record.status)) {
    if (DISPOSITION_STATUSES.includes(record.status) && record.disposition === null) {
      errors.push('disposition_required');
    }
    // Repair and Accept as is need a recorded decision in every active status (design §5.6).
    if (needsDecision(record)) errors.push('decision_required');
  }
  return errors;
}
