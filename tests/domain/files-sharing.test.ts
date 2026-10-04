import { describe, expect, it } from 'vitest';
import { AttachmentPatch, AttachmentUploadMeta, Filename, PhotoPatch, PhotoUploadMeta, PhotoVariantParam, ShareCreate } from '../../src/domain';

describe('file and share metadata', () => {
  it('preserves text, normalises blank text and offset timestamps, and validates phases', () => {
    for (const phase of ['before', 'during', 'after']) expect(PhotoUploadMeta.parse({ phase }).phase).toBe(phase);
    expect(PhotoUploadMeta.parse({ phase: 'before', caption: '  όψη  ', takenAt: '2026-10-03T12:00:00+03:00' })).toEqual({ purpose: 'evidence', phase: 'before', caption: '  όψη  ', takenAt: '2026-10-03T09:00:00.000Z' });
    expect(PhotoPatch.parse({ caption: '  ', takenAt: null })).toEqual({ caption: null, takenAt: null });
    expect(AttachmentUploadMeta.parse({ title: '\t' })).toEqual({ title: null });
    expect(AttachmentPatch.parse({ title: ' Test ' })).toEqual({ title: ' Test ' });
    for (const bad of [{}, { phase: 'later' }, { phase: 'before', extra: 1 }, { phase: 'before', takenAt: '2026-10-03T12:00:00' }]) expect(() => PhotoUploadMeta.parse(bad)).toThrow();
    for (const schema of [PhotoPatch, AttachmentPatch]) expect(() => schema.parse({})).toThrow();
    expect(() => AttachmentPatch.parse({ logEntryId: 1 })).toThrow();
    expect(() => PhotoVariantParam.parse('hash')).toThrow();
  });
  it('requires safe basename metadata and strict link inputs without a clock-dependent expiry check', () => {
    expect(Filename.parse('C:\\fakepath\\όψη.jpg')).toBe('όψη.jpg');
    expect(Filename.parse('../../file.pdf')).toBe('file.pdf');
    for (const name of ['', 'a\n.pdf', 'a\0.jpg', 'a'.repeat(256)]) expect(() => Filename.parse(name)).toThrow();
    expect(ShareCreate.parse({ label: ' Old ', expiresAt: '2000-01-01T02:00:00+02:00' })).toEqual({ label: ' Old ', expiresAt: '2000-01-01T00:00:00.000Z' });
    for (const body of [{ label: ' ' }, { label: 'x', extra: 1 }, { label: 'x', expiresAt: 'tomorrow' }]) expect(() => ShareCreate.parse(body)).toThrow();
  });
});
