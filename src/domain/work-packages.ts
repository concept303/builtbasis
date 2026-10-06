import { z } from 'zod';
import type { Status, Subtype, VocabularyEntry } from './vocab';

const packageCodes = ['planned', 'in_progress', 'on_hold', 'completed', 'cancelled'] as const;
export type PackageStatus = typeof packageCodes[number];
export const PACKAGE_STATUSES: readonly (VocabularyEntry & { code: PackageStatus })[] = [
  { code: 'planned', en: 'Planned', el: 'Προγραμματισμένο', defEn: 'Work in this package has not started.', defEl: 'Οι εργασίες του πακέτου δεν έχουν ξεκινήσει.' },
  { code: 'in_progress', en: 'In progress', el: 'Σε εξέλιξη', defEn: 'Work in this package is underway.', defEl: 'Οι εργασίες του πακέτου βρίσκονται σε εξέλιξη.' },
  { code: 'on_hold', en: 'On hold', el: 'Σε αναμονή', defEn: 'Work in this package is temporarily paused.', defEl: 'Οι εργασίες του πακέτου έχουν ανασταλεί προσωρινά.' },
  { code: 'completed', en: 'Completed', el: 'Ολοκληρωμένο', defEn: 'The owner considers the scope of this package finished.', defEl: 'Ο ιδιοκτήτης θεωρεί ότι το αντικείμενο του πακέτου έχει ολοκληρωθεί.' },
  { code: 'cancelled', en: 'Cancelled', el: 'Ακυρωμένο', defEn: 'This package will not proceed.', defEl: 'Το πακέτο δεν θα υλοποιηθεί.' },
];
export const PACKAGE_SORT_ORDER: readonly PackageStatus[] = ['in_progress', 'planned', 'on_hold', 'completed', 'cancelled'];
const fields = {
  name: z.string().trim().min(1).max(200),
  description: z.string().max(10_000).nullable().transform(value => value === null || !value.trim() ? null : value),
  responsibleId: z.number().int().positive().nullable(),
  targetDate: z.iso.date().nullable(),
  status: z.enum(packageCodes),
};
export const WorkPackageCreate = z.strictObject({
  ...fields, description: fields.description.default(null), responsibleId: fields.responsibleId.default(null),
  targetDate: fields.targetDate.default(null), status: fields.status.default('planned'),
});
export const WorkPackagePatch = z.strictObject(fields).partial();
export type WorkPackageInput = z.output<typeof WorkPackageCreate>;
export type WorkPackagePatchInput = z.output<typeof WorkPackagePatch>;
export interface WorkPackage extends WorkPackageInput { id: number; projectId: number; createdAt: string; updatedAt: string }
export interface PackageCounts { total: number; outstanding: number; overdue: number; byStatus: Record<Status, number> }
export interface PackageSummary extends WorkPackage { counts: PackageCounts }
export interface PackageDetail extends PackageSummary { today: string; bySubtypeStatus: { subtype: Subtype; status: Status; count: number }[] }
