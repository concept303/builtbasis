export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'SQLITE_CONSTRAINT_UNIQUE'
  );
}
