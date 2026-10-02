import { isActive, isNonTerminal, statusesFor } from './statuses';
import { isCode, type Disposition, type ProblemType, type Status, type Subtype, type VerificationOutcome } from './vocab';

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

// ---------------------------------------------------------------------------
// Status transitions (design §8.1)
// ---------------------------------------------------------------------------

export interface VerificationInput {
  checkedById: number | null;
  date: string | null;
  method: string | null;
  note?: string | null;
}

export interface TransitionInput {
  to: Status;
  reasonCode?: string | null;
  reasonNote?: string | null;
  note?: string | null;
  verification?: VerificationInput | null;
}

export type TransitionResult =
  | { ok: true; verificationOutcome: VerificationOutcome | null }
  | { ok: false; errors: RuleError[] };

const BASE_TARGETS: Record<Status, readonly Status[]> = {
  draft: ['open', 'cancelled'],
  open: ['awaiting_decision', 'issued', 'in_progress', 'on_hold', 'cancelled', 'closed'],
  awaiting_decision: ['issued', 'on_hold', 'cancelled', 'closed'],
  issued: ['in_progress', 'on_hold', 'cancelled', 'closed'],
  in_progress: ['ready_for_verification', 'on_hold', 'cancelled', 'closed'],
  ready_for_verification: ['closed', 'in_progress'],
  on_hold: [], // resume only: see allowedTargets
  closed: ['open'],
  cancelled: [],
  superseded: [],
};

/** Which subtypes may close from which status without verification (design §8.1). */
function closeAllowedFrom(record: RecordState): boolean {
  switch (record.status) {
    case 'open':
      return record.subtype === 'quality_issue' || record.subtype === 'task';
    case 'awaiting_decision':
      return record.subtype === 'quality_issue';
    case 'issued':
      return record.subtype === 'quality_issue' || record.subtype === 'detail_clarification';
    case 'in_progress':
      return record.subtype === 'task';
    default:
      return true; // ready_for_verification → closed (with verification)
  }
}

/** Statuses the record may move to, before field conditions are checked. */
export function allowedTargets(record: RecordState): Status[] {
  const own = statusesFor(record.subtype);
  const base: Status[] =
    record.status === 'on_hold'
      ? record.statusBeforeHold
        ? [record.statusBeforeHold]
        : []
      : [...BASE_TARGETS[record.status]];
  const targets = base.filter((target) => target !== 'closed' || closeAllowedFrom(record));
  if (record.subtype === 'detail_clarification' && isNonTerminal(record.status)) targets.push('superseded');
  return targets.filter((target) => own.includes(target));
}

/** Checks a status change and derives the verification outcome where one applies. */
export function checkTransition(record: RecordState, input: TransitionInput): TransitionResult {
  const { to } = input;
  if (!allowedTargets(record).includes(to)) return { ok: false, errors: ['transition_not_allowed'] };

  // The resulting record must satisfy every save rule: required fields, disposition, decision.
  const errors: RuleError[] = validateSave({ ...record, status: to });
  const leavesVerification = record.status === 'ready_for_verification' && (to === 'closed' || to === 'in_progress');

  if (
    record.subtype === 'quality_issue' &&
    to === 'closed' &&
    !leavesVerification &&
    record.disposition !== null &&
    record.disposition !== 'accept_as_is'
  ) {
    errors.push('accept_as_is_required');
  }

  const checkReason = (list: 'onHoldReason' | 'cancellationReason', noteRequiredFor: readonly string[]): void => {
    const code = input.reasonCode;
    if (!hasText(code)) errors.push('reason_required');
    else if (!isCode(list, code)) errors.push('reason_invalid');
    else if (noteRequiredFor.includes(code) && !hasText(input.reasonNote)) errors.push('reason_note_required');
  };
  if (to === 'on_hold') checkReason('onHoldReason', ['other']);
  if (to === 'cancelled') checkReason('cancellationReason', ['replaced', 'other']);

  const reopening = record.status === 'closed' && to === 'open';
  if ((to === 'superseded' || reopening) && !hasText(input.note)) errors.push('note_required');

  let verificationOutcome: VerificationOutcome | null = null;
  if (leavesVerification) {
    const verification = input.verification;
    if (
      !verification ||
      verification.checkedById === null ||
      !hasText(verification.date) ||
      !isCode('verificationMethod', verification.method)
    ) {
      errors.push('verification_required');
    }
    verificationOutcome = to === 'closed' ? 'passed' : 'failed';
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, verificationOutcome };
}
