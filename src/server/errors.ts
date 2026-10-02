/** An error with an HTTP status and a stable, machine-readable code; sent as { error: code, details? }. */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(code);
    this.name = 'HttpError';
  }
}
