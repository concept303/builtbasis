import { useState } from 'react';
import type { LocationNode } from '../../server/lists/locations';
import { useI18n } from './i18n';
export function LocationPicker({ nodes, value, onChange, label, allowInactive = false }: { nodes: LocationNode[]; value: number[]; onChange(value: number[]): void; label?: string; allowInactive?: boolean }) {
  const { lang, t } = useI18n(); const [query, setQuery] = useState('');
  const name = (node: LocationNode) => lang === 'el' ? node.nameEl || node.nameEn : node.nameEn || node.nameEl;
  const path = (node: LocationNode): string => { const parent = nodes.find(item => item.id === node.parentId); return parent ? `${path(parent)} › ${name(node)}` : name(node); };
  const checkbox = (node: LocationNode, full = false) => <label className="check"><input type="checkbox" checked={value.includes(node.id)} disabled={!allowInactive && !node.active && !value.includes(node.id)} onChange={event => onChange(event.target.checked ? [...value, node.id] : value.filter(id => id !== node.id))}/>{full ? path(node) : name(node)}{!node.active && ` (${t('inactive', 'ανενεργό')})`}</label>;
  const branch = (parentId: number | null): React.ReactNode => nodes.filter(node => node.parentId === parentId).map(node => <li key={node.id}>{nodes.some(child => child.parentId === node.id) ? <details open={Boolean(query)}><summary>{name(node)}</summary>{checkbox(node)}<ul>{branch(node.id)}</ul></details> : checkbox(node)}</li>);
  return <fieldset className="location-picker"><legend>{label ?? t('Location', 'Θέση')}</legend><label className="field"><span>{t('Find a place', 'Αναζήτηση θέσης')}</span><input type="search" value={query} onChange={event => setQuery(event.target.value)}/></label><small>{t('Selecting a place means that place as a whole. Children remain independent.', 'Η επιλογή μιας θέσης αφορά ολόκληρη τη θέση. Οι επιμέρους θέσεις επιλέγονται ανεξάρτητα.')}</small><ul>{query ? nodes.filter(node => path(node).toLocaleLowerCase(lang).includes(query.toLocaleLowerCase(lang))).map(node => <li key={node.id}>{checkbox(node, true)}</li>) : branch(null)}</ul></fieldset>;
}
