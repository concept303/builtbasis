import { z } from 'zod';
import { isCode, type CodeOf, type ListKey, type Subtype } from './vocab';

const codeOf = <K extends ListKey>(key: K) =>
  z.custom<CodeOf<K>>((value) => isCode(key, value), `Unknown ${key} code`);
const id = z.number().int().positive();
/** A list of ids; duplicates are dropped. */
const ids = z
  .array(id)
  .max(500)
  .transform((values) => [...new Set(values)]);
const isoDate = z.iso.date();
const isoDateTime = z.iso.datetime({ offset: true });

/**
 * Optional free text, stored exactly as typed (design §3); empty or whitespace-only text is stored as null.
 * Text is never trimmed or rewritten.
 */
const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .nullable()
    .transform((value) => (value === null || value.trim() === '' ? null : value));
/** Required free text, stored exactly as typed; must contain more than whitespace. */
const requiredText = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => value.trim() !== '', 'Required');

/** Euros with at most two decimals (design §5.4). */
const euros = z
  .number()
  .min(0)
  .max(100_000_000)
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, 'At most 2 decimals');

/** Every editable record field (design §5, §6). Status changes go through transitions, never through a save. */
export const RecordPatch = z.strictObject({
  title: optionalText(200).optional(),
  description: optionalText(20_000).optional(),
  reference: optionalText(2_000).optional(),
  notes: optionalText(20_000).optional(),
  publicNotes: optionalText(20_000).optional(),
  locationNotes: optionalText(20_000).optional(),
  ballInCourtId: id.nullable().optional(),
  responsibleId: id.nullable().optional(),
  tradeIds: ids.optional(),
  severity: codeOf('severity').nullable().optional(),
  priority: codeOf('priority').nullable().optional(),
  dueDate: isoDate.nullable().optional(),
  completion: z.number().int().min(0).max(100).multipleOf(10).nullable().optional(),
  safety: z.boolean().optional(),
  tagIds: ids.optional(),
  mustBeDoneBeforeIds: ids.optional(),
  locationIds: ids.optional(),
  outsideScope: z.boolean().optional(),
  estimatedCost: euros.nullable().optional(),
  problemTypes: z
    .array(codeOf('problemType'))
    .max(10)
    .transform((values) => [...new Set(values)])
    .optional(),
  stage: codeOf('stage').nullable().optional(),
  disposition: codeOf('disposition').nullable().optional(),
  correction: optionalText(20_000).optional(),
  question: optionalText(20_000).optional(),
  route: codeOf('route').nullable().optional(),
  issuedById: id.nullable().optional(),
  chosenOptionId: id.nullable().optional(),
  decidedById: id.nullable().optional(),
  decidedOn: isoDate.nullable().optional(),
  instructionText: optionalText(20_000).optional(),
});

/** Quick capture (design §10.3): a subtype and any fields; the record starts as Draft. */
export const RecordCreate = RecordPatch.extend({ subtype: codeOf('subtype') });

export type RecordPatchInput = z.output<typeof RecordPatch>;
export type RecordCreateInput = z.output<typeof RecordCreate>;
export type RecordField = keyof RecordPatchInput;

const QUALITY_ISSUE_FIELDS: readonly RecordField[] = ['problemTypes', 'stage', 'disposition', 'correction'];
const DETAIL_CLARIFICATION_FIELDS: readonly RecordField[] = ['question', 'route', 'issuedById'];
/** Decision and instruction (design §5.6): Quality Issues and Detail Clarifications, not Tasks. */
const DECISION_FIELDS: readonly RecordField[] = ['chosenOptionId', 'decidedById', 'decidedOn', 'instructionText'];

/** Whether the subtype has the decision fields and options (design §5.6). */
export function hasDecision(subtype: Subtype): boolean {
  return subtype !== 'task';
}

/** The given fields that the subtype does not have (design §5.6, §6). */
export function fieldsNotApplicable(subtype: Subtype, fields: readonly string[]): string[] {
  const has = (list: readonly RecordField[], field: string): boolean => (list as readonly string[]).includes(field);
  return fields.filter(
    (field) =>
      (has(QUALITY_ISSUE_FIELDS, field) && subtype !== 'quality_issue') ||
      (has(DETAIL_CLARIFICATION_FIELDS, field) && subtype !== 'detail_clarification') ||
      (has(DECISION_FIELDS, field) && !hasDecision(subtype)),
  );
}

/** A status change (design §8.1). The domain rules in checkTransition decide what is required. */
export const TransitionBody = z.strictObject({
  to: codeOf('status'),
  reasonCode: z.string().max(50).nullable().optional(),
  reasonNote: optionalText(2_000).optional(),
  note: optionalText(2_000).optional(),
  verification: z
    .strictObject({
      checkedById: id.nullable(),
      date: isoDate.nullable(),
      method: z.string().max(50).nullable(),
      note: optionalText(2_000).optional(),
    })
    .nullable()
    .optional(),
});
export type TransitionBodyInput = z.output<typeof TransitionBody>;

/** An option considered for the decision (design §5.6). */
export const OptionBody = z.strictObject({
  label: requiredText(200),
  description: optionalText(20_000).optional(),
});
export const OptionPatch = OptionBody.partial();
export type OptionInput = z.output<typeof OptionBody>;
export type OptionPatchInput = z.output<typeof OptionPatch>;

/** One measured value (design §5.7). Labels are stored as typed and matched after normalising. */
export const MeasurementRowBody = z.strictObject({
  item: requiredText(200),
  quantity: requiredText(200),
  value: z.number(),
  unit: codeOf('unit'),
  note: optionalText(2_000).optional(),
});
export const MeasurementSetBody = z.strictObject({
  date: isoDate,
  measuredById: id.nullable().optional(),
  phase: codeOf('measurementPhase'),
  note: optionalText(2_000).optional(),
  rows: z.array(MeasurementRowBody).max(500).optional(),
});
/** `rows`, when given, replaces all of the set's rows. */
export const MeasurementSetPatch = MeasurementSetBody.partial();
export type MeasurementRowInput = z.output<typeof MeasurementRowBody>;
export type MeasurementSetInput = z.output<typeof MeasurementSetBody>;
export type MeasurementSetPatchInput = z.output<typeof MeasurementSetPatch>;

/** A Log entry (design §5.11). The event time defaults to now. */
export const LogEntryBody = z.strictObject({
  eventAt: isoDateTime.optional(),
  text: requiredText(20_000),
  private: z.boolean().optional(),
});
export const LogEntryPatch = LogEntryBody.partial();
export type LogEntryInput = z.output<typeof LogEntryBody>;
export type LogEntryPatchInput = z.output<typeof LogEntryPatch>;
