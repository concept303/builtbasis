import { foldText } from '../../domain/text';
import { useState } from 'react';
import type { LocationNode } from '../../server/lists/locations';
import { useI18n } from '../core/i18n';
import { listName, locationRows } from './rules';

export function LocationsTree({ nodes, query, selectedId, busy, onSelect }: {
  nodes: LocationNode[]; query: string; selectedId: number | null;
  busy: boolean; onSelect(node: LocationNode): void;
}): React.JSX.Element {
  const { t, lang } = useI18n();
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const term = foldText(query);
  const ordered = locationRows(nodes).map(row => row.node);
  const byId = new Map(nodes.map(node => [node.id, node]));
  const visible = new Set<number>();
  for (const node of ordered) {
    if (!term || foldText(`${node.nameEn} ${node.nameEl}`).includes(term)) {
      let ancestor: LocationNode | undefined = node;
      while (ancestor && !visible.has(ancestor.id)) {
        visible.add(ancestor.id);
        ancestor = ancestor.parentId === null ? undefined : byId.get(ancestor.parentId);
      }
    }
  }
  const children = new Map<number | null, LocationNode[]>();
  for (const node of ordered) {
    if (visible.has(node.id)) children.set(node.parentId, [...(children.get(node.parentId) ?? []), node]);
  }
  function branch(parentId: number | null): React.JSX.Element {
    return <ul>{(children.get(parentId) ?? []).map(node => {
      const descendants = children.get(node.id) ?? [];
      const expanded = !!term || !collapsed.has(node.id);
      const label = listName(node, lang);
      return <li key={node.id}>
        <div className="location-tree-row" data-selected={node.id === selectedId}>
          {descendants.length > 0 ? <button type="button" className="branch-toggle" aria-expanded={expanded}
            aria-label={expanded ? t(`Collapse ${label}`, `Σύμπτυξη ${label}`) : t(`Expand ${label}`, `Ανάπτυξη ${label}`)}
            disabled={!!term} onClick={() => setCollapsed(current => {
              const next = new Set(current); if (next.has(node.id)) next.delete(node.id); else next.add(node.id); return next;
            })}>{expanded ? '▾' : '▸'}</button> : <span className="branch-spacer" />}
          <button type="button" className="location-name" aria-label={label} aria-pressed={node.id === selectedId} disabled={busy} onClick={() => onSelect(node)}>
            <strong>{label}</strong>{!node.active && <small>{t('Retired', 'Ανενεργό')}</small>}
          </button>
          {descendants.length > 0 && <span className="branch-count" aria-hidden="true">{descendants.length}</span>}
        </div>
        {descendants.length > 0 && expanded && branch(node.id)}
      </li>;
    })}</ul>;
  }
  return <div className="location-tree">
    <div className="tree-toolbar">
      <button type="button" disabled={!!term} onClick={() => setCollapsed(new Set())}>{t('Expand all', 'Ανάπτυξη όλων')}</button>
      <button type="button" disabled={!!term} onClick={() => setCollapsed(new Set(nodes.map(node => node.id)))}>{t('Collapse all', 'Σύμπτυξη όλων')}</button>
    </div>
    {visible.size ? branch(null) : <p>{term ? t('No matching entries.', 'Δεν βρέθηκαν στοιχεία.') : t('No entries yet.', 'Δεν υπάρχουν ακόμη στοιχεία.')}</p>}
  </div>;
}
