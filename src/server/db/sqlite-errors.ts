import { HttpError } from '../errors';

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'SQLITE_CONSTRAINT_UNIQUE'
  );
}

/** Turns a unique-constraint violation into 409 with the given error code; rethrows anything else. */
export function rethrowUnique(error: unknown, code: string): never {
  if (isUniqueViolation(error)) throw new HttpError(409, code);
  throw error;
}
