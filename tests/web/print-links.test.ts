import { expect, it } from 'vitest';
import type { ShareLinkOut } from '../../src/domain';
import { activePrintLinks } from '../../src/web/printing/PrintPage';
it('allows only usable, non-revoked, strictly unexpired links and none for Draft', () => {
  const link: ShareLinkOut = { id: 1, label: 'Chosen', url: 'https://example.test/share#token', createdAt: '2026-01-01', expiresAt: null, revokedAt: null, lastViewedAt: null, viewCount: 0 };
  const links = [link, { ...link, id: 2, expiresAt: '2026-01-02T00:00:00Z' }, { ...link, id: 3, expiresAt: '2026-01-03T00:00:00Z' }, { ...link, id: 4, revokedAt: '2026-01-01' }, { ...link, id: 5, url: null }];
  expect(activePrintLinks(links, false, Date.parse('2026-01-02T00:00:00Z')).map(item => item.id)).toEqual([1, 3]);
  expect(activePrintLinks(links, true, Date.parse('2026-01-02T00:00:00Z'))).toEqual([]);
});
