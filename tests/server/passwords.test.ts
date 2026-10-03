import { describe, expect, it } from 'vitest';
import { hashPassword, MAX_PASSWORD_LENGTH, verifyPassword } from '../../src/server/auth/passwords';

describe('passwords (design §11.5)', () => {
  it('hashes with scrypt and verifies', () => {
    const hash = hashPassword('a long enough password');
    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(verifyPassword('a long enough password', hash)).toBe(true);
    expect(verifyPassword('the wrong password', hash)).toBe(false);
  });

  it('salts every hash', () => {
    expect(hashPassword('the same long password')).not.toBe(hashPassword('the same long password'));
  });

  it('accepts 12 to 200 characters, the same limit as the login form', () => {
    expect(() => hashPassword('short')).toThrow(RangeError);
    expect(() => hashPassword('x'.repeat(11))).toThrow(RangeError);
    expect(verifyPassword('x'.repeat(12), hashPassword('x'.repeat(12)))).toBe(true);
    expect(() => hashPassword('x'.repeat(MAX_PASSWORD_LENGTH + 1))).toThrow(RangeError);
    const longest = 'x'.repeat(MAX_PASSWORD_LENGTH);
    expect(verifyPassword(longest, hashPassword(longest))).toBe(true);
  });

  it('never verifies against a malformed or altered stored hash', () => {
    const password = 'a long enough password';
    const good = hashPassword(password);
    const [, , , , salt = '', hash = ''] = good.split('$');
    for (const stored of [
      'not-a-hash',
      `scrypt$16384$8$1$${salt}$`, // no hash
      `scrypt$16384$8$1$${salt}$!!!!`, // decodes to zero bytes
      `scrypt$16384$8$1$${salt}$${hash.slice(0, 8)}`, // truncated hash
      `scrypt$16384$8$1$$${hash}`, // no salt
      `scrypt$16383$8$1$${salt}$${hash}`, // parameters scrypt rejects
      `scrypt$1024$8$1$${salt}$${hash}`, // other parameters
      `${good}$extra`,
      good.replace('16384', '016384'),
      `scrypt$16384$8$1$${salt.trimEnd()} $${hash}`,
      `scrypt$16384$8$1$${salt}$${hash.replace(/=+$/, '')}`,
    ]) {
      expect(verifyPassword(password, stored), stored).toBe(false);
    }
  });
});
