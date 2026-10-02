import type { MeasurementPhase, Unit } from './vocab';

export interface MeasurementRow {
  item: string;
  quantity: string;
  value: number;
  unit: Unit;
}

export interface MeasurementSet {
  id: number;
  date: string; // YYYY-MM-DD
  phase: MeasurementPhase;
  rows: readonly MeasurementRow[];
}

export interface ItemComparison {
  item: string;
  value: number;
  diffFromFirst: number;
}

export interface SeriesPoint {
  setId: number;
  date: string;
  phase: MeasurementPhase;
  value: number;
  changeFromPrevious: number | null;
}

/** Trim, collapse internal whitespace, ignore letter case (design §5.7). */
export function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ').toLocaleLowerCase('el');
}

function rowKey(row: Pick<MeasurementRow, 'item' | 'quantity' | 'unit'>): string {
  return `${normalizeLabel(row.item)}\u0000${normalizeLabel(row.quantity)}\u0000${row.unit}`;
}

/** Normalised Item + Quantity + Unit keys that occur more than once (must be unique within a set). */
export function duplicateRowKeys(rows: readonly Pick<MeasurementRow, 'item' | 'quantity' | 'unit'>[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const row of rows) {
    const key = rowKey(row);
    if (seen.has(key)) duplicates.add(key);
    else seen.add(key);
  }
  return [...duplicates];
}

/** Measurement date, then creation order (internal set id). */
export function orderSets<T extends { id: number; date: string }>(sets: readonly T[]): T[] {
  return [...sets].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
}

/** Between items: one set, one quantity and unit; each item compared with the first in display order.
 *  Differences keep full precision; rounding is a display concern. */
export function compareItems(set: MeasurementSet, quantity: string, unit: Unit): ItemComparison[] {
  const wanted = normalizeLabel(quantity);
  const rows = set.rows.filter((row) => normalizeLabel(row.quantity) === wanted && row.unit === unit);
  const first = rows[0];
  if (!first) return [];
  return rows.map((row) => ({ item: row.item, value: row.value, diffFromFirst: row.value - first.value }));
}

/** Before vs after: one item + quantity + unit across sets in set order; later minus earlier. */
export function compareOverTime(
  sets: readonly MeasurementSet[],
  item: string,
  quantity: string,
  unit: Unit,
): SeriesPoint[] {
  const key = rowKey({ item, quantity, unit });
  const points: SeriesPoint[] = [];
  let previous: number | null = null;
  for (const set of orderSets(sets)) {
    const row = set.rows.find((candidate) => rowKey(candidate) === key);
    if (!row) continue;
    points.push({
      setId: set.id,
      date: set.date,
      phase: set.phase,
      value: row.value,
      changeFromPrevious: previous === null ? null : row.value - previous,
    });
    previous = row.value;
  }
  return points;
}
