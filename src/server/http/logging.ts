import type { FastifyRequest, FastifyServerOptions } from 'fastify';

const filesystemCodes = new Set(['ENOENT', 'EACCES', 'EPERM', 'ENOSPC', 'EDQUOT', 'EMFILE', 'ENFILE', 'EIO', 'EROFS', 'ENOTDIR', 'EISDIR', 'EEXIST', 'ENOTEMPTY']);
const sqliteCodes = new Set(['SQLITE_BUSY', 'SQLITE_LOCKED', 'SQLITE_FULL', 'SQLITE_READONLY', 'SQLITE_CORRUPT', 'SQLITE_NOTADB', 'SQLITE_IOERR', 'SQLITE_CANTOPEN', 'SQLITE_CONSTRAINT', 'SQLITE_CONSTRAINT_UNIQUE', 'SQLITE_CONSTRAINT_FOREIGNKEY', 'SQLITE_CONSTRAINT_NOTNULL', 'SQLITE_CONSTRAINT_CHECK']);
const systemCodes = new Set(['ENOMEM', 'ECONNRESET', 'ECONNABORTED', 'EPIPE', 'ETIMEDOUT', 'EADDRINUSE', 'ERR_STREAM_PREMATURE_CLOSE']);
const applicationCodes = new Set(['file_unavailable', 'share_copy_failed', 'storage_capacity']);

/** Never copy a name, message, stack, path or arbitrary code supplied by an error. */
export function safeErrorDiagnostic(error: unknown): { type: string; code?: string } {
  if (!(error instanceof Error)) return { type: 'internal_error' };
  // A data property avoids invoking an untrusted getter during error handling.
  const code: unknown = Object.getOwnPropertyDescriptor(error, 'code')?.value;
  if (typeof code === 'string') {
    if (filesystemCodes.has(code)) return { type: 'filesystem_error', code };
    if (sqliteCodes.has(code)) return { type: 'sqlite_error', code };
    if (systemCodes.has(code)) return { type: 'system_error', code };
    if (applicationCodes.has(code)) return { type: 'application_error', code };
  }
  if (error instanceof TypeError) return { type: 'TypeError' };
  if (error instanceof RangeError) return { type: 'RangeError' };
  if (error instanceof SyntaxError) return { type: 'SyntaxError' };
  return { type: 'internal_error' };
}

/** Request/response data is never a log payload. Only registered patterns identify routes. */
export function safeLogger(logger: FastifyServerOptions['logger']): FastifyServerOptions['logger'] {
  if (!logger) return false;
  return {
    ...(typeof logger === 'object' ? logger : {}),
    redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    hooks: {
      logMethod(args, method) {
        const first: unknown = args[0];
        const error = first instanceof Error ? first
          : first !== null && typeof first === 'object' ? Object.getOwnPropertyDescriptor(first, 'err')?.value : undefined;
        if (error !== undefined) {
          // Pino otherwise derives msg from the raw error before running serializers.
          method.call(this, { err: error }, 'internal_error');
          return;
        }
        method.apply(this, args);
      },
    },
    serializers: {
      req: (request: FastifyRequest) => ({ method: request.method, route: request.routeOptions?.url ?? '<unmatched>' }),
      res: (response: { statusCode: number }) => ({ statusCode: response.statusCode }),
      err: error => ({ ...safeErrorDiagnostic(error), message: 'internal_error', stack: '' }),
    },
  };
}
