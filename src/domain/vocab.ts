import { VOCABULARY } from './vocabulary.data';

export type Lang = 'en' | 'el';

export interface VocabularyEntry {
  readonly code: string;
  readonly en: string;
  readonly el: string;
  readonly defEn: string;
  readonly defEl: string;
}

type Vocabulary = typeof VOCABULARY;
export type ListKey = keyof Vocabulary;
export type CodeOf<K extends ListKey> = Vocabulary[K][number]['code'];

export type Subtype = CodeOf<'subtype'>;
export type Status = CodeOf<'status'>;
export type OnHoldReason = CodeOf<'onHoldReason'>;
export type CancellationReason = CodeOf<'cancellationReason'>;
export type ProblemType = CodeOf<'problemType'>;
export type Stage = CodeOf<'stage'>;
export type Disposition = CodeOf<'disposition'>;
export type Route = CodeOf<'route'>;
export type Severity = CodeOf<'severity'>;
export type Priority = CodeOf<'priority'>;
export type PersonRole = CodeOf<'personRole'>;
export type LocationNodeKind = CodeOf<'locationNodeKind'>;
export type MeasurementPhase = CodeOf<'measurementPhase'>;
export type Unit = CodeOf<'unit'>;
export type PhotoPhase = CodeOf<'photoPhase'>;
export type VerificationMethod = CodeOf<'verificationMethod'>;
export type VerificationOutcome = CodeOf<'verificationOutcome'>;

export const LIST_KEYS = Object.keys(VOCABULARY) as ListKey[];

export function entriesOf(key: ListKey): readonly VocabularyEntry[] {
  return VOCABULARY[key] as readonly VocabularyEntry[];
}

export function codesOf<K extends ListKey>(key: K): CodeOf<K>[] {
  return entriesOf(key).map((entry) => entry.code) as CodeOf<K>[];
}

export function isCode<K extends ListKey>(key: K, value: unknown): value is CodeOf<K> {
  return typeof value === 'string' && entriesOf(key).some((entry) => entry.code === value);
}

function findEntry(key: ListKey, code: string): VocabularyEntry {
  const entry = entriesOf(key).find((candidate) => candidate.code === code);
  if (!entry) throw new RangeError(`Unknown ${key} code: ${code}`);
  return entry;
}

export function labelOf(key: ListKey, code: string, lang: Lang): string {
  const entry = findEntry(key, code);
  return lang === 'en' ? entry.en : entry.el;
}

export function definitionOf(key: ListKey, code: string, lang: Lang): string {
  const entry = findEntry(key, code);
  return lang === 'en' ? entry.defEn : entry.defEl;
}
