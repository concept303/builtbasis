import type {
  Disposition,
  Priority,
  ProblemType,
  RecordState,
  Route,
  Severity,
  Stage,
  Status,
  Subtype,
} from '../../domain';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';

/** One row of `records`, with camelCase names. */
export interface RecordRow {
  id: number;
  projectId: number;
  subtype: Subtype;
  sequence: number;
  humanId: string;
  status: Status;
  statusBeforeHold: Status | null;
  statusReasonCode: string | null;
  statusReasonNote: string | null;
  title: string | null;
  description: string | null;
  reference: string | null;
  notes: string | null;
  publicNotes: string | null;
  ballInCourtId: number | null;
  responsibleId: number | null;
  severity: Severity | null;
  priority: Priority | null;
  dueDate: string | null;
  completion: number | null;
  safety: number;
  outsideScope: number;
  estimatedCostCents: number | null;
  /** JSON array of problem-type codes. */
  problemTypes: string;
  stage: Stage | null;
  disposition: Disposition | null;
  correction: string | null;
  question: string | null;
  route: Route | null;
  issuedById: number | null;
  chosenOptionId: number | null;
  decidedById: number | null;
  decidedOn: string | null;
  instructionText: string | null;
  createdAt: string;
  createdBy: number;
  updatedAt: string;
  updatedBy: number;
}

/** Field name → column name. Column names come from this map only, never from request input. */
export const RECORD_COLUMNS = {
  id: 'id',
  projectId: 'project_id',
  subtype: 'subtype',
  sequence: 'sequence',
  humanId: 'human_id',
  status: 'status',
  statusBeforeHold: 'status_before_hold',
  statusReasonCode: 'status_reason_code',
  statusReasonNote: 'status_reason_note',
  title: 'title',
  description: 'description',
  reference: 'reference',
  notes: 'notes',
  publicNotes: 'public_notes',
  ballInCourtId: 'ball_in_court_id',
  responsibleId: 'responsible_id',
  severity: 'severity',
  priority: 'priority',
  dueDate: 'due_date',
  completion: 'completion',
  safety: 'safety',
  outsideScope: 'outside_scope',
  estimatedCostCents: 'estimated_cost_cents',
  problemTypes: 'problem_types',
  stage: 'stage',
  disposition: 'disposition',
  correction: 'correction',
  question: 'question',
  route: 'route',
  issuedById: 'issued_by_id',
  chosenOptionId: 'chosen_option_id',
  decidedById: 'decided_by_id',
  decidedOn: 'decided_on',
  instructionText: 'instruction_text',
  createdAt: 'created_at',
  createdBy: 'created_by',
  updatedAt: 'updated_at',
  updatedBy: 'updated_by',
} as const satisfies Record<keyof RecordRow, string>;

const SELECT = `SELECT ${Object.entries(RECORD_COLUMNS)
  .map(([field, column]) => `${column} AS ${field}`)
  .join(', ')} FROM records`;

export function requireRecord(db: Db, projectId: number, recordId: number): RecordRow {
  const row = db.prepare(`${SELECT} WHERE project_id = ? AND id = ?`).get(projectId, recordId) as RecordRow | undefined;
  if (!row) throw new HttpError(404, 'record_not_found');
  return row;
}

export function problemTypesOf(row: Pick<RecordRow, 'problemTypes'>): ProblemType[] {
  return JSON.parse(row.problemTypes) as ProblemType[];
}

/** The fields the domain rules need (design §5–§8). */
export function toRecordState(row: RecordRow): RecordState {
  return {
    subtype: row.subtype,
    status: row.status,
    statusBeforeHold: row.statusBeforeHold,
    title: row.title,
    problemTypes: problemTypesOf(row),
    question: row.question,
    disposition: row.disposition,
    decidedById: row.decidedById,
    decidedOn: row.decidedOn,
  };
}

/** Marks the record as changed; every change to a record or anything on it updates this. */
export function touchRecord(db: Db, recordId: number, userId: number, at: string): void {
  db.prepare('UPDATE records SET updated_at = ?, updated_by = ? WHERE id = ?').run(at, userId, recordId);
}
