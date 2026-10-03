import { z } from 'zod';
import { isCode, type SharedActivity, type SharedRecord, type VerificationMethod, type VerificationOutcome } from '../../domain';
import type { Db } from '../db/connection';
import { listAttachments, listPhotos } from '../files/occurrences';
import { listLocations } from '../lists/locations';
import { listPeople } from '../lists/people';
import { listTags } from '../lists/tags';
import { listTrades } from '../lists/trades';
import { listZoneTypes } from '../lists/zone-types';
import { listActivity, type ActivityEntry } from '../records/activity';
import { listLog } from '../records/log';
import { listMeasurementSets } from '../records/measurements';
import { listOptions } from '../records/options';
import { getRecordDetail } from '../records/records';
import { listVerifications } from '../records/transitions';
import type { ShareAccess } from './links';

const scalarFields = new Map<string, 'number' | 'string'>([
  ['ballInCourtId', 'number'], ['responsibleId', 'number'], ['severity', 'string'], ['priority', 'string'],
  ['dueDate', 'string'], ['disposition', 'string'], ['chosenOptionId', 'number'], ['decidedById', 'number'],
  ['decidedOn', 'string'], ['instructionText', 'string'],
]);
const snapshot = z.object({ label: z.string(), description: z.string().nullable() }).nullable();
const optionDetail = z.object({ fromOption: snapshot.optional(), toOption: snapshot.optional() });
const statusDetail = z.object({
  reasonCode: z.string().nullable().optional(),
  reasonNote: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  verification: z.object({
    id: z.number().int().positive(),
    outcome: z.custom<VerificationOutcome>(value => isCode('verificationOutcome', value)),
    method: z.custom<VerificationMethod>(value => isCode('verificationMethod', value)),
    checkedById: z.number().int().positive(),
    date: z.iso.date(),
  }).optional(),
});

function publicActivity(entry: ActivityEntry): SharedActivity | null {
  let detail: SharedActivity['detail'] = null;
  if (entry.action === 'created') {
    if (entry.from !== null || entry.to !== 'draft') return null;
  } else if (entry.action === 'status_changed') {
    if (!isCode('status', entry.from) || !isCode('status', entry.to)) return null;
    const parsed = statusDetail.safeParse(entry.detail);
    if (parsed.success) detail = parsed.data;
  } else if (entry.action === 'field_changed') {
    const expected = entry.field === null ? undefined : scalarFields.get(entry.field);
    if (!expected || [entry.from, entry.to].some(value => value !== null && typeof value !== expected)) return null;
    if (entry.field === 'chosenOptionId') {
      const parsed = optionDetail.safeParse(entry.detail);
      if (parsed.success) detail = parsed.data;
    }
  } else return null;
  return {
    id: entry.id,
    at: entry.at,
    action: entry.action,
    field: entry.action === 'created' ? null : entry.action === 'status_changed' ? 'status' : entry.field,
    from: entry.from as string | number | null,
    to: entry.to as string | number | null,
    detail,
  };
}

/** Every public property is copied deliberately; future owner fields are private by default. */
export function buildSharedRecord(db: Db, access: ShareAccess): SharedRecord {
  const { projectId, recordId } = access;
  const r = getRecordDetail(db, projectId, recordId);
  const record: SharedRecord['record'] = {
    humanId: r.humanId,
    subtype: r.subtype,
    status: r.status,
    statusReason: r.statusReason === null ? null : { code: r.statusReason.code, note: r.statusReason.note },
    title: r.title,
    description: r.description,
    reference: r.reference,
    ballInCourtId: r.ballInCourtId,
    responsibleId: r.responsibleId,
    tradeIds: r.tradeIds,
    severity: r.severity,
    priority: r.priority,
    dueDate: r.dueDate,
    completion: r.completion,
    safety: r.safety,
    tagIds: r.tagIds,
    locationIds: r.locationIds,
    problemTypes: r.problemTypes,
    stage: r.stage,
    disposition: r.disposition,
    correction: r.correction,
    question: r.question,
    route: r.route,
    issuedById: r.issuedById,
    chosenOptionId: r.chosenOptionId,
    decidedById: r.decidedById,
    decidedOn: r.decidedOn,
    instructionText: r.instructionText,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    mustBeDoneBefore: r.mustBeDoneBefore.filter(item => item.status !== 'draft').map(item => ({ humanId: item.humanId, title: item.title })),
    requiresFirst: r.requiresFirst.filter(item => item.status !== 'draft').map(item => ({ humanId: item.humanId, title: item.title })),
  };
  const options = listOptions(db, recordId).map(item => ({ id: item.id, label: item.label, description: item.description }));
  const measurements = listMeasurementSets(db, recordId).map(item => ({
    id: item.id, date: item.date, measuredById: item.measuredById, phase: item.phase, note: item.note,
    rows: item.rows.map(row => ({ item: row.item, quantity: row.quantity, value: row.value, unit: row.unit, note: row.note })),
  }));
  const verifications = listVerifications(db, recordId).map(item => ({
    id: item.id, checkedById: item.checkedById, date: item.date, method: item.method, outcome: item.outcome, note: item.note, createdAt: item.createdAt,
  }));
  const photos = listPhotos(db, recordId).map(item => ({
    id: item.id, originalFilename: item.originalFilename, phase: item.phase, caption: item.caption, takenAt: item.takenAt, uploadedAt: item.uploadedAt,
  }));
  const attachments = listAttachments(db, recordId).filter(item => !item.logEntry?.private).map(item => ({
    id: item.id, originalFilename: item.originalFilename, title: item.title, size: item.size, contentType: item.contentType, uploadedAt: item.uploadedAt,
    logEntry: item.logEntry === null ? null : { id: item.logEntry.id, eventAt: item.logEntry.eventAt, text: item.logEntry.text },
  }));
  const log = listLog(db, recordId).filter(item => !item.private).map(item => ({
    id: item.id, eventAt: item.eventAt, text: item.text,
    attachmentIds: attachments.filter(file => file.logEntry?.id === item.id).map(file => file.id),
  }));
  const activity = listActivity(db, recordId).map(publicActivity).filter((item): item is SharedActivity => item !== null);
  const personIds = new Set<number>();
  const addPerson = (id: number | null | undefined) => { if (id != null) personIds.add(id); };
  for (const id of [r.ballInCourtId, r.responsibleId, r.issuedById, r.decidedById]) addPerson(id);
  measurements.forEach(item => addPerson(item.measuredById));
  verifications.forEach(item => addPerson(item.checkedById));
  for (const entry of activity) {
    if (['ballInCourtId', 'responsibleId', 'decidedById'].includes(entry.field ?? '')) {
      if (typeof entry.from === 'number') addPerson(entry.from);
      if (typeof entry.to === 'number') addPerson(entry.to);
    }
    addPerson(entry.detail?.verification?.checkedById);
  }
  const nodes = new Map(listLocations(db, projectId).map(node => [node.id, node]));
  const zoneIds = new Set<number>();
  const locations = r.locationIds.map(id => {
    const path: SharedRecord['labels']['locations'][number]['path'] = [];
    let node = nodes.get(id);
    const seen = new Set<number>();
    while (node && !seen.has(node.id)) {
      seen.add(node.id);
      if (node.zoneTypeId !== null) zoneIds.add(node.zoneTypeId);
      path.unshift({ id: node.id, nameEn: node.nameEn, nameEl: node.nameEl, kind: node.kind, zoneTypeId: node.zoneTypeId });
      node = node.parentId === null ? undefined : nodes.get(node.parentId);
    }
    return { id, path };
  });
  const labels: SharedRecord['labels'] = {
    people: listPeople(db, projectId).filter(item => personIds.has(item.id)).map(item => ({ id: item.id, code: item.code, name: item.name, role: item.role })),
    trades: listTrades(db, projectId).filter(item => r.tradeIds.includes(item.id)).map(item => ({ id: item.id, nameEn: item.nameEn, nameEl: item.nameEl })),
    tags: listTags(db, projectId).filter(item => r.tagIds.includes(item.id)).map(item => ({ id: item.id, nameEn: item.nameEn, nameEl: item.nameEl })),
    locations,
    zoneTypes: listZoneTypes(db, projectId).filter(item => zoneIds.has(item.id)).map(item => ({ id: item.id, nameEn: item.nameEn, nameEl: item.nameEl })),
  };
  return { record, options, measurements, verifications, photos, attachments, log, activity, labels };
}
