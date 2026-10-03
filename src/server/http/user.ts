import type { FastifyRequest } from 'fastify';
import { HttpError } from '../errors';

/** The logged-in owner's user id; the guards have already rejected requests without a session. */
export function requireUserId(request: FastifyRequest): number {
  if (request.user === null) throw new HttpError(401, 'unauthenticated');
  return request.user.userId;
}
