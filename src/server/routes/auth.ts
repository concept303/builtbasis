import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { LoginLimiter } from '../auth/login-limiter';
import { hashPassword, MAX_PASSWORD_LENGTH, verifyPassword } from '../auth/passwords';
import { createSession, deleteExpiredSessions, deleteSession } from '../auth/sessions';
import { findUserByUsername, MAX_USERNAME_LENGTH } from '../auth/users';
import type { AppConfig } from '../config';
import type { Db } from '../db/connection';
import { HttpError } from '../errors';
import { clientIp } from '../http/client-ip';
import { SESSION_COOKIE } from '../http/guards';

/** The same limits as the owner command, so every account it creates can log in. */
const LoginBody = z.strictObject({
  username: z.string().min(1).max(MAX_USERNAME_LENGTH),
  password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
});

export function registerAuthRoutes(
  app: FastifyInstance,
  deps: { config: AppConfig; db: Db; limiter: LoginLimiter },
): void {
  const { config, db, limiter } = deps;
  // Verifying unknown users against a dummy hash keeps both failure cases equally slow.
  const dummyHash = hashPassword('builtbasis-dummy-password');

  app.post('/api/auth/login', async (request, reply) => {
    const ip = clientIp(request, config);
    const now = Date.now();
    if (limiter.isBlocked(ip, now)) throw new HttpError(429, 'too_many_attempts');
    const body = LoginBody.parse(request.body);
    const user = findUserByUsername(db, body.username);
    const passwordOk = verifyPassword(body.password, user?.passwordHash ?? dummyHash);
    if (user === null || !user.isActive || !passwordOk) {
      limiter.recordFailure(ip, now);
      throw new HttpError(401, 'invalid_credentials');
    }
    // Password verification is expensive and holds no write lock. Re-read the
    // verified identity under the short write lock shared with administrative resets.
    const session = db.transaction(() => {
      const current = findUserByUsername(db, body.username);
      if (!current || current.id !== user.id || !current.isActive || current.passwordHash !== user.passwordHash) {
        limiter.recordFailure(ip, now);
        throw new HttpError(401, 'invalid_credentials');
      }
      deleteExpiredSessions(db);
      return createSession(db, current.id);
    }).immediate();
    limiter.recordSuccess(ip);
    reply.setCookie(SESSION_COOKIE, session.token, {
      path: '/',
      httpOnly: true,
      secure: config.secureCookies,
      sameSite: 'lax',
      expires: session.expiresAt,
    });
    return { username: user.username };
  });

  app.post('/api/auth/logout', { config: { sessionOnly: true } }, async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) deleteSession(db, token);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  });

  app.get('/api/auth/me', { config: { sessionOnly: true } }, async (request) => {
    if (request.user === null) throw new HttpError(401, 'unauthenticated');
    const user = findUserByUsername(db, request.user.username)!;
    return { username: user.username, displayName: user.displayName, isOwner: user.isOwner === 1 };
  });
}
