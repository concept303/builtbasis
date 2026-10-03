import type { FastifyInstance } from 'fastify';
import {
  allowedTargets,
  fieldsNotApplicable,
  formatHumanId,
  RecordCreate,
  RecordPatch,
  validateSave,
  type Disposition,
  type Priority,
  type ProblemType,
  type RecordCreateInput,
  type RecordPatchInput,
  type Route,
  type Severity,
  type Stage,
  type Status,
  type Subtype,
} from '../../domain';
import type { Db } from '../db/connection';
import { updateColumns } from '../db/update';
import { HttpError } from '../errors';
import { ItemParams, ProjectParams } from '../http/params';
import { requireUserId } from '../http/user';
import { requireProject } from '../lists/projects';
import { recordActivity } from './activity';
import {
  LINK_FIELDS,
  readLinkIds,
  readMustBeDoneBefore,
  readRequiresFirst,
  replaceLinks,
  replaceMustBeDoneBefore,
  type RecordRef,
} from './links';
import { checkOption, checkPerson, checkSelection } from './references';
import { problemTypesOf, requireRecord, toRecordState, type RecordRow } from './store';

/** A record as the owner sees it. Sub-collections (options, measurements, verifications, Log, activity) have their own routes. */
export interface RecordDetail {
  id: number;
  projectId: number;
  humanId: string;
  subtype: Subtype;
  status: Status;
  statusBeforeHold: Status | null;
  statusReason: { code: string | null; note: string | null } | null;
  title: string | null;
  description: string | null;
  reference: string | null;
  notes: string | null;
  ballInCourtId: number | null;
  responsibleId: number | null;
  tradeIds: number[];
  severity: Severity | null;
  priority: Priority | null;
  dueDate: string | null;
  completion: number | null;
  safety: boolean;
  tagIds: number[];
  locationIds: number[];
  mustBeDoneBefore: RecordRef[];
  requiresFirst: RecordRef[];
  outsideScope: boolean;
  estimatedCost: number | null;
  problemTypes: ProblemType[];
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
  /** Statuses offered in the status dialog; the server still checks every condition on the change (design §10.5). */
  allowedTransitions: Status[];
  createdAt: string;
  updatedAt: string;
}

/** Changes to these fields are written to the activity log (design §5.12). */
const TRACKED_FIELDS = [
  'ballInCourtId',
  'responsibleId',
  'severity',
  'priority',
  'dueDate',
  'disposition',
  'chosenOptionId',
  'decidedById',
  'decidedOn',
  'instructionText',
] as const satisfies readonly (keyof RecordRow)[];

const PERSON_FIELDS = ['ballInCourtId', 'responsibleId', 'issuedById', 'decidedById'] as const;

const toFlag = (value: boolean | undefined): number | undefined => (value === undefined ? undefined : Number(value));

/** The option as it was when chosen or unchosen, so the history stays readable after the option changes or is deleted. */
function optionSnapshot(db: Db, optionId: number | null): { label: string; description: string | null } | null {
  if (optionId === null) return null;
  return (
    (db.prepare('SELECT label, description FROM decision_options WHERE id = ?').get(optionId) as
      | { label: string; description: string | null }
      | undefined) ?? null
  );
}

export function getRecordDetail(db: Db, projectId: number, recordId: number): RecordDetail {
  const row = requireRecord(db, projectId, recordId);
  const hasReason = row.statusReasonCode !== null || row.statusReasonNote !== null;
  return {
    id: row.id,
    projectId: row.projectId,
    humanId: row.humanId,
    subtype: row.subtype,
    status: row.status,
    statusBeforeHold: row.statusBeforeHold,
    statusReason: hasReason ? { code: row.statusReasonCode, note: row.statusReasonNote } : null,
    title: row.title,
    description: row.description,
    reference: row.reference,
    notes: row.notes,
    ballInCourtId: row.ballInCourtId,
    responsibleId: row.responsibleId,
    tradeIds: readLinkIds(db, recordId, 'tradeIds'),
    severity: row.severity,
    priority: row.priority,
    dueDate: row.dueDate,
    completion: row.completion,
    safety: row.safety === 1,
    tagIds: readLinkIds(db, recordId, 'tagIds'),
    locationIds: readLinkIds(db, recordId, 'locationIds'),
    mustBeDoneBefore: readMustBeDoneBefore(db, recordId),
    requiresFirst: readRequiresFirst(db, recordId),
    outsideScope: row.outsideScope === 1,
    estimatedCost: row.estimatedCostCents === null ? null : row.estimatedCostCents / 100,
    problemTypes: problemTypesOf(row),
    stage: row.stage,
    disposition: row.disposition,
    correction: row.correction,
    question: row.question,
    route: row.route,
    issuedById: row.issuedById,
    chosenOptionId: row.chosenOptionId,
    decidedById: row.decidedById,
    decidedOn: row.decidedOn,
    instructionText: row.instructionText,
    allowedTransitions: allowedTargets(toRecordState(row)),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Applies a save to a record: subtype fields, references, links, the commercial rule, then the save rules on
 * the result (design §8.2), then the activity entries. Runs inside the caller's transaction, so any rejection
 * leaves the record unchanged.
 */
function applyPatch(db: Db, current: RecordRow, userId: number, patch: RecordPatchInput, at: string): void {
  const { projectId, id: recordId } = current;
  const sent = Object.entries(patch)
    .filter(([, value]) => value !== undefined)
    .map(([field]) => field);
  const notApplicable = fieldsNotApplicable(current.subtype, sent);
  if (notApplicable.length > 0) throw new HttpError(400, 'field_not_applicable', { fields: notApplicable });

  for (const field of PERSON_FIELDS) checkPerson(db, projectId, field, patch[field], current[field]);
  if (patch.tradeIds) checkSelection(db, projectId, 'trades', 'tradeIds', patch.tradeIds, readLinkIds(db, recordId, 'tradeIds'));
  if (patch.tagIds) checkSelection(db, projectId, 'tags', 'tagIds', patch.tagIds, readLinkIds(db, recordId, 'tagIds'));
  if (patch.locationIds) {
    checkSelection(db, projectId, 'location_nodes', 'locationIds', patch.locationIds, readLinkIds(db, recordId, 'locationIds'));
  }
  checkOption(db, recordId, patch.chosenOptionId);

  // An estimate is entered only while Outside contract scope is ticked; unticking keeps it (design §5.4).
  const outsideScope = patch.outsideScope ?? current.outsideScope === 1;
  if (patch.estimatedCost !== undefined && patch.estimatedCost !== null && !outsideScope) {
    throw new HttpError(422, 'estimated_cost_requires_outside_scope');
  }

  updateColumns(db, 'records', projectId, recordId, {
    title: patch.title,
    description: patch.description,
    reference: patch.reference,
    notes: patch.notes,
    ball_in_court_id: patch.ballInCourtId,
    responsible_id: patch.responsibleId,
    severity: patch.severity,
    priority: patch.priority,
    due_date: patch.dueDate,
    completion: patch.completion,
    safety: toFlag(patch.safety),
    outside_scope: toFlag(patch.outsideScope),
    estimated_cost_cents:
      patch.estimatedCost === undefined || patch.estimatedCost === null
        ? patch.estimatedCost
        : Math.round(patch.estimatedCost * 100),
    problem_types: patch.problemTypes === undefined ? undefined : JSON.stringify(patch.problemTypes),
    stage: patch.stage,
    disposition: patch.disposition,
    correction: patch.correction,
    question: patch.question,
    route: patch.route,
    issued_by_id: patch.issuedById,
    chosen_option_id: patch.chosenOptionId,
    decided_by_id: patch.decidedById,
    decided_on: patch.decidedOn,
    instruction_text: patch.instructionText,
    updated_at: at,
    updated_by: userId,
  });
  for (const field of LINK_FIELDS) {
    const ids = patch[field];
    if (ids) replaceLinks(db, recordId, field, ids);
  }
  if (patch.mustBeDoneBeforeIds) replaceMustBeDoneBefore(db, projectId, recordId, patch.mustBeDoneBeforeIds);

  const updated = requireRecord(db, projectId, recordId);
  const errors = validateSave(toRecordState(updated));
  if (errors.length > 0) throw new HttpError(422, 'rule_violation', { errors });

  for (const field of TRACKED_FIELDS) {
    if (current[field] === updated[field]) continue;
    const detail =
      field === 'chosenOptionId'
        ? { fromOption: optionSnapshot(db, current.chosenOptionId), toOption: optionSnapshot(db, updated.chosenOptionId) }
        : undefined;
    recordActivity(db, { recordId, userId, at, action: 'field_changed', field, from: current[field], to: updated[field], detail });
  }
}

/** Creates a Draft record with the next human ID of its subtype (design §4.2, §10.3). */
export function createRecord(
  db: Db,
  projectId: number,
  userId: number,
  input: RecordCreateInput,
  now: Date = new Date(),
): RecordDetail {
  const { subtype, ...patch } = input;
  const at = now.toISOString();
  return db.transaction((): RecordDetail => {
    const sequence = db
      .prepare(
        `INSERT INTO record_counters (project_id, subtype, last_sequence) VALUES (?, ?, 1)
         ON CONFLICT (project_id, subtype) DO UPDATE SET last_sequence = last_sequence + 1
         RETURNING last_sequence`,
      )
      .pluck()
      .get(projectId, subtype) as number;
    const info = db
      .prepare(
        `INSERT INTO records (project_id, subtype, sequence, human_id, status, created_at, created_by, updated_at, updated_by)
         VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
      )
      .run(projectId, subtype, sequence, formatHumanId(subtype, sequence), at, userId, at, userId);
    const recordId = Number(info.lastInsertRowid);
    recordActivity(db, { recordId, userId, at, action: 'created', to: 'draft' });
    applyPatch(db, requireRecord(db, projectId, recordId), userId, patch, at);
    return getRecordDetail(db, projectId, recordId);
  })();
}

export function updateRecord(
  db: Db,
  projectId: number,
  recordId: number,
  userId: number,
  patch: RecordPatchInput,
  now: Date = new Date(),
): RecordDetail {
  return db.transaction((): RecordDetail => {
    applyPatch(db, requireRecord(db, projectId, recordId), userId, patch, now.toISOString());
    return getRecordDetail(db, projectId, recordId);
  })();
}

export function registerRecordCoreRoutes(app: FastifyInstance, db: Db): void {
  app.post('/api/projects/:projectId/records', async (request, reply) => {
    const { projectId } = ProjectParams.parse(request.params);
    requireProject(db, projectId);
    const record = createRecord(db, projectId, requireUserId(request), RecordCreate.parse(request.body));
    return reply.status(201).send(record);
  });

  app.get('/api/projects/:projectId/records/:id', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    return getRecordDetail(db, projectId, id);
  });

  app.patch('/api/projects/:projectId/records/:id', async (request) => {
    const { projectId, id } = ItemParams.parse(request.params);
    requireProject(db, projectId);
    return updateRecord(db, projectId, id, requireUserId(request), RecordPatch.parse(request.body));
  });
}
