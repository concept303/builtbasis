import { expect, it } from 'vitest';
import { decryptShareToken, encryptShareToken, hashShareToken, newShareToken } from '../../src/server/sharing/crypto';

const key = Buffer.alloc(32, 7);
it('generates canonical random tokens and authenticates ciphertext to its record', () => {
  const token = newShareToken();
  expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(newShareToken()).not.toBe(token);
  expect(hashShareToken(token)).toMatch(/^[a-f0-9]{64}$/);
  const encrypted = encryptShareToken(token, key, 12);
  expect(encrypted.nonce).toHaveLength(12);
  expect(encrypted.tag).toHaveLength(16);
  expect(encrypted.ciphertext.includes(Buffer.from(token))).toBe(false);
  expect(decryptShareToken(encrypted, key, 12)).toBe(token);
  expect(encryptShareToken(token, key, 12).nonce).not.toEqual(encrypted.nonce);
  expect(() => decryptShareToken(encrypted, key, 13)).toThrow();
  expect(() => decryptShareToken(encrypted, Buffer.alloc(32, 8), 12)).toThrow();
  for (const field of ['ciphertext', 'nonce', 'tag'] as const) {
    const value = Buffer.from(encrypted[field]);
    value[0] = value[0]! ^ 1;
    expect(() => decryptShareToken({ ...encrypted, [field]: value }, key, 12)).toThrow();
    expect(() => decryptShareToken({ ...encrypted, [field]: Buffer.alloc(0) }, key, 12)).toThrow();
  }
  for (const invalid of ['', 'a'.repeat(42), 'a'.repeat(43), `${token}=`]) {
    expect(() => hashShareToken(invalid)).toThrow();
    expect(() => encryptShareToken(invalid, key, 12)).toThrow();
  }
});
