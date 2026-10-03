import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const N = 16384;
const R = 8;
const P = 1;
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
export const MIN_PASSWORD_LENGTH = 12;
/** Also the login form's limit, so every password the owner command accepts can log in. */
export const MAX_PASSWORD_LENGTH = 200;

/** scrypt with a random salt, stored as scrypt$N$r$p$salt$hash (base64). */
export function hashPassword(password: string): string {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new RangeError(`Password must be ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters`);
  }
  const salt = randomBytes(SALT_LENGTH);
  const hash = scryptSync(password, salt, KEY_LENGTH, { N, r: R, p: P });
  return ['scrypt', N, R, P, salt.toString('base64'), hash.toString('base64')].join('$');
}

/** Canonical base64 of exactly `length` bytes, or null. */
function decodeExact(text: string | undefined, length: number): Buffer | null {
  if (text === undefined) return null;
  const bytes = Buffer.from(text, 'base64');
  return bytes.length === length && bytes.toString('base64') === text ? bytes : null;
}

/**
 * Verifies only hashes in exactly the format hashPassword writes: same parameters, salt and key lengths.
 * A malformed or altered stored value never verifies. Changing the parameters later therefore needs
 * a password reset (`npm run owner`).
 */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt' || parts.slice(1, 4).join('$') !== `${N}$${R}$${P}`) return false;
  const salt = decodeExact(parts[4], SALT_LENGTH);
  const expected = decodeExact(parts[5], KEY_LENGTH);
  if (salt === null || expected === null) return false;
  return timingSafeEqual(scryptSync(password, salt, KEY_LENGTH, { N, r: R, p: P }), expected);
}
