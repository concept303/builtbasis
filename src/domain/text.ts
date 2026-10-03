import { normalizeLabel } from './measurements';

/**
 * Text folded for matching: trimmed, single-spaced, lower case, without accents, final sigma as σ.
 * Greek capitals drop their accents («ΠΕΤΡΑ» = «Πέτρα»), so matching must ignore them.
 */
export function foldText(text: string): string {
  return normalizeLabel(text).normalize('NFD').replace(/\p{M}/gu, '').replace(/ς/g, 'σ');
}
