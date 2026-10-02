import { hasAName } from '../../domain';
import { HttpError } from '../errors';

/** Server-side check of the "at least one name" rule (design §3, §9). */
export function assertHasAName(names: { nameEn: string; nameEl: string }): void {
  if (!hasAName(names)) throw new HttpError(400, 'name_required');
}
