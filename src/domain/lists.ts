import { z } from 'zod';
import { foldText } from './text';
import { isCode, type CodeOf, type ListKey } from './vocab';

/** Managed lists have an English and a Greek name; either may be empty, not both (design §3, §9). */
export function hasAName(names: { nameEn: string; nameEl: string }): boolean {
  return names.nameEn.trim() !== '' || names.nameEl.trim() !== '';
}

/**
 * Matching key for tag names (design §9.3: unique per language after trimming, ignoring letter case).
 * Greek capitals drop their accents («ΠΕΤΡΑ» = «Πέτρα»), so accents and final sigma are ignored too.
 * Returns null for an empty name.
 */
export function tagKey(name: string): string | null {
  const key = foldText(name);
  return key === '' ? null : key;
}

const codeOf = <K extends ListKey>(key: K) =>
  z.custom<CodeOf<K>>((value) => isCode(key, value), `Unknown ${key} code`);
const id = z.number().int().positive();
const shortCode = z.string().trim().min(1).max(20);
const name = z.string().trim().max(200);
const definition = z.string().trim().max(2000);
/** Optional free text; an empty string is stored as null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value === '' ? null : value));

export const PersonCreate = z.strictObject({
  code: shortCode,
  name: z.string().trim().min(1).max(200),
  role: codeOf('personRole'),
  company: optionalText(200).optional(),
  email: optionalText(200).optional(),
  phone: optionalText(50).optional(),
  active: z.boolean().optional(),
});
export const PersonPatch = PersonCreate.partial();

export const TradeCreate = z.strictObject({
  code: shortCode,
  nameEn: name.optional(),
  nameEl: name.optional(),
  defEn: definition.optional(),
  defEl: definition.optional(),
  active: z.boolean().optional(),
});
export const TradePatch = TradeCreate.partial();

/** Used for both create and rename. */
export const ZoneTypeBody = z.strictObject({ nameEn: name.optional(), nameEl: name.optional() });

/** Used for both create and rename. */
export const TagBody = z.strictObject({ nameEl: name.optional(), nameEn: name.optional() });
export const TagMergeBody = z.strictObject({ intoId: id });

export const LocationCreate = z.strictObject({
  parentId: id.nullable().optional(),
  kind: codeOf('locationNodeKind'),
  zoneTypeId: id.nullable().optional(),
  nameEn: name.optional(),
  nameEl: name.optional(),
  sortOrder: z.number().int().optional(),
});
export const LocationPatch = LocationCreate.partial().extend({ active: z.boolean().optional() });
export const LocationCopy = z.strictObject({
  parentId: id.nullable().optional(),
  nameEn: name.optional(),
  nameEl: name.optional(),
});

export type PersonCreateInput = z.output<typeof PersonCreate>;
export type PersonPatchInput = z.output<typeof PersonPatch>;
export type TradeCreateInput = z.output<typeof TradeCreate>;
export type TradePatchInput = z.output<typeof TradePatch>;
export type ZoneTypeInput = z.output<typeof ZoneTypeBody>;
export type TagInput = z.output<typeof TagBody>;
export type LocationCreateInput = z.output<typeof LocationCreate>;
export type LocationPatchInput = z.output<typeof LocationPatch>;
export type LocationCopyInput = z.output<typeof LocationCopy>;
