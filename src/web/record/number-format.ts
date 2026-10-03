import type { Lang } from '../../domain';

/** JS's shortest round-trip spelling preserves the stored double and nonzero deltas. */
export function measurementNumber(value: number, lang: Lang): string {
  const text = String(value);
  return lang === 'el' ? text.replace('.', ',') : text;
}
