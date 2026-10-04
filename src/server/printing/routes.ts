import type { FastifyInstance } from 'fastify';
import { compareOverTime, normalizeLabel, orderSets } from '../../domain';
import type { Db } from '../db/connection';
import { ItemParams } from '../http/params';
import { getRecordDetail } from '../records/records';
import { listMeasurementSets } from '../records/measurements';
import { listOptions } from '../records/options';
import { listVerifications } from '../records/transitions';
import { listPhotos } from '../files/occurrences';
import { listPeople } from '../lists/people';
import { listLocations } from '../lists/locations';
import { listTrades } from '../lists/trades';
import { listTags } from '../lists/tags';

/** §12 is an allowlist independent of the larger owner and shared record contracts. */
export function buildPrintRecord(db: Db, projectId: number, recordId: number) {
  const r = getRecordDetail(db, projectId, recordId);
  const sets = orderSets(listMeasurementSets(db, recordId));
  const measurements = [...new Map(sets.map(set => [set.phase, set])).values()];
  const groups = new Map(sets.flatMap(set => set.rows).map(row => [JSON.stringify([normalizeLabel(row.item), normalizeLabel(row.quantity), row.unit]), row]));
  const comparisons = [...groups.values()].map(row => ({ item: row.item, quantity: row.quantity, unit: row.unit, points: compareOverTime(sets, row.item, row.quantity, row.unit) }));
  const verifications = listVerifications(db, recordId).map(v => ({ id: v.id, checkedById: v.checkedById, date: v.date, method: v.method, outcome: v.outcome, note: v.note }));
  const personIds = new Set([r.ballInCourtId, r.responsibleId, r.issuedById, r.decidedById, ...measurements.map(s => s.measuredById), ...verifications.map(v => v.checkedById)]);
  const nodes = new Map(listLocations(db, projectId).map(n => [n.id, n]));
  const locations = r.locationIds.map(id => {
    const path: { nameEn: string; nameEl: string }[] = [];
    const seen = new Set<number>(); let node = nodes.get(id);
    while (node && !seen.has(node.id)) { seen.add(node.id); path.unshift({ nameEn: node.nameEn, nameEl: node.nameEl }); node = node.parentId === null ? undefined : nodes.get(node.parentId); }
    return path;
  });
  const names = (items: { id: number; nameEn: string; nameEl: string }[], ids: number[]) => items.filter(item => ids.includes(item.id)).map(item => ({ nameEn: item.nameEn, nameEl: item.nameEl }));
  const photos = listPhotos(db, recordId);
  return {
    record: {
      humanId: r.humanId, title: r.title, subtype: r.subtype, status: r.status, severity: r.severity, priority: r.priority,
      dueDate: r.dueDate, ballInCourtId: r.ballInCourtId, responsibleId: r.responsibleId, reference: r.reference,
      description: r.subtype === 'detail_clarification' ? null : r.description, question: r.subtype === 'detail_clarification' ? r.question : null,
      locationNotes: r.locationNotes,
      problemTypes: r.problemTypes, stage: r.stage, disposition: r.disposition, correction: r.correction, route: r.route, issuedById: r.issuedById,
      chosenOption: listOptions(db, recordId).filter(o => o.id === r.chosenOptionId).map(o => ({ label: o.label, description: o.description }))[0] ?? null,
      decidedById: r.decidedById, decidedOn: r.decidedOn, instructionText: r.instructionText, updatedAt: r.updatedAt,
    },
    people: listPeople(db, projectId).filter(p => personIds.has(p.id)).map(p => ({ id: p.id, name: p.name })),
    locations, trades: names(listTrades(db, projectId), r.tradeIds), tags: names(listTags(db, projectId), r.tagIds),
    measurements, comparisons, verifications,
    locationPhotos: photos.filter(p => p.purpose === 'location').map(p => ({ id: p.id, caption: p.caption })),
    photos: (['before', 'after'] as const).flatMap(phase => photos.filter(p => p.phase === phase).slice(0, 4).map(p => ({ id: p.id, phase: p.phase, caption: p.caption }))),
    generatedAt: new Date().toISOString(),
  };
}
export type PrintRecord = ReturnType<typeof buildPrintRecord>;
export function registerPrintRoutes(app: FastifyInstance, db: Db): void {
  app.get('/api/projects/:projectId/records/:id/print', { config: { privateResponse: true } }, async request => {
    const { projectId, id } = ItemParams.parse(request.params);
    return db.transaction(() => buildPrintRecord(db, projectId, id))();
  });
}
