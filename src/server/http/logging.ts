import type { FastifyRequest, FastifyServerOptions } from 'fastify';

/** Request/response data is never a log payload. Only registered patterns identify routes. */
export function safeLogger(logger: FastifyServerOptions['logger']): FastifyServerOptions['logger'] {
  if (!logger) return false;
  return {
    ...(typeof logger === 'object' ? logger : {}),
    redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    serializers: {
      req: (request: FastifyRequest) => ({ method: request.method, route: request.routeOptions?.url ?? '<unmatched>' }),
      res: (response: { statusCode: number }) => ({ statusCode: response.statusCode }),
      err: () => ({ type: 'internal_error', message: 'internal_error', stack: '' }),
    },
  };
}
