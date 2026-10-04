import { describe, expect, it } from 'vitest';
import { collidingTags, locationRows, parentChoices } from '../../src/web/lists/rules';

describe('managed list choices', () => {
  const nodes = [
    { id: 3, parentId: 2, sortOrder: 0, nameEn: 'Room', nameEl: '' },
    { id: 1, parentId: null, sortOrder: 2, nameEn: 'Building', nameEl: '' },
    { id: 2, parentId: 1, sortOrder: 0, nameEn: 'Floor', nameEl: '' },
    { id: 4, parentId: null, sortOrder: 1, nameEn: 'Site', nameEl: '' },
  ];
  it('orders parents before children while preserving sibling sort order', () => {
    expect(locationRows(nodes).map(({ node, depth }) => [node.id, depth])).toEqual([[4, 0], [1, 0], [2, 1], [3, 2]]);
  });
  it('excludes the edited or copied branch from possible parents', () => {
    expect(parentChoices(nodes, 2).map(({ node }) => node.id)).toEqual([4, 1]);
    expect(parentChoices(nodes, null)).toHaveLength(4);
  });
  it('matches accents and case without treating empty translations as collisions', () => {
    const tags = [{ id: 1, nameEn: 'Stone', nameEl: 'Πέτρα' }, { id: 2, nameEn: '', nameEl: 'Νερό' }];
    expect(collidingTags(tags, { nameEn: '', nameEl: ' ΠΕΤΡΑ ' }, null).map(t => t.id)).toEqual([1]);
    expect(collidingTags(tags, { nameEn: 'stone', nameEl: '' }, 1)).toEqual([]);
  });
  it('preserves two distinct collisions so the form rejects an ambiguous merge', () => {
    expect(collidingTags([{ id: 1, nameEn: 'Stone', nameEl: 'Πέτρα' }, { id: 2, nameEn: 'Water', nameEl: 'Νερό' }], { nameEn: 'Stone', nameEl: 'Νερό' }, null).map(t => t.id)).toEqual([1, 2]);
  });
});
