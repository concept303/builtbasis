import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export interface EncryptedToken {
  ciphertext: Buffer;
  nonce: Buffer;
  tag: Buffer;
}

export function validShareToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token) && Buffer.from(token, 'base64url').toString('base64url') === token;
}

function requireToken(token: string): void {
  if (!validShareToken(token)) throw new Error('invalid_share_token');
}

export function requireShareKey(key: Buffer | null): asserts key is Buffer {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('share_key_required');
}

export function newShareToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashShareToken(token: string): string {
  requireToken(token);
  return createHash('sha256').update(token).digest('hex');
}

export function keyFingerprint(key: Buffer): string {
  requireShareKey(key);
  return createHash('sha256').update(key).digest('hex');
}

const aad = (recordId: number): Buffer => Buffer.from(`builtbasis-share-v1:${recordId}`, 'utf8');

export function encryptShareToken(token: string, key: Buffer, recordId: number): EncryptedToken {
  requireToken(token);
  requireShareKey(key);
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(aad(recordId));
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return { ciphertext, nonce, tag: cipher.getAuthTag() };
}

export function decryptShareToken(value: EncryptedToken, key: Buffer, recordId: number): string {
  requireShareKey(key);
  if (value.nonce.length !== 12 || value.tag.length !== 16 || value.ciphertext.length !== 43) throw new Error('invalid_share_ciphertext');
  const decipher = createDecipheriv('aes-256-gcm', key, value.nonce);
  decipher.setAAD(aad(recordId));
  decipher.setAuthTag(value.tag);
  const token = Buffer.concat([decipher.update(value.ciphertext), decipher.final()]).toString('utf8');
  requireToken(token);
  return token;
}
