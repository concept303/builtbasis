import { tagKey } from '../../domain/lists';

export interface Named { id: number; nameEn: string; nameEl: string }
export interface TreeNode extends Named { parentId: number | null; sortOrder: number }

export function listName(item: Pick<Named, 'nameEn' | 'nameEl'>, lang: 'en' | 'el'): string {
  return lang === 'en' ? item.nameEn || item.nameEl : item.nameEl || item.nameEn;
}

export function collidingTags<T extends Named>(tags: T[], names: Omit<Named, 'id'>, exceptId: number | null): T[] {
  const en = tagKey(names.nameEn);
  const el = tagKey(names.nameEl);
  return tags.filter(tag => tag.id !== exceptId && ((en !== null && en === tagKey(tag.nameEn)) || (el !== null && el === tagKey(tag.nameEl))));
}

export function locationRows<T extends TreeNode>(nodes: T[]): { node: T; depth: number }[] {
  const result: { node: T; depth: number }[] = [];
  const seen = new Set<number>();
  const walk = (parentId: number | null, depth: number) => {
    for (const node of nodes.filter(n => n.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)) {
      if (seen.has(node.id)) continue;
      seen.add(node.id);
      result.push({ node, depth });
      walk(node.id, depth + 1);
    }
  };
  walk(null, 0);
  return result;
}

export function parentChoices<T extends TreeNode>(nodes: T[], sourceId: number | null): { node: T; depth: number }[] {
  const excluded = new Set<number>();
  if (sourceId !== null) excluded.add(sourceId);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (node.parentId !== null && excluded.has(node.parentId) && !excluded.has(node.id)) {
        excluded.add(node.id);
        changed = true;
      }
    }
  }
  return locationRows(nodes).filter(({ node }) => !excluded.has(node.id));
}
