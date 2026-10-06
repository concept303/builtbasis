import { labelOf, type PackageCounts, type Status } from '../../domain';
import { useI18n } from '../core/i18n';
export const STATUS_GROUPS: { key: string; statuses: Status[]; color: string }[] = [
  { key: 'closed', statuses: ['closed'], color: '#3d8655' },
  { key: 'verification', statuses: ['ready_for_verification'], color: '#a8468e' },
  { key: 'active', statuses: ['open', 'issued', 'in_progress'], color: '#315dc8' },
  { key: 'waiting', statuses: ['awaiting_decision', 'on_hold'], color: '#b97a10' },
  { key: 'draft', statuses: ['draft'], color: '#c3c9d2' },
  { key: 'ended', statuses: ['cancelled', 'superseded'], color: '#aab2bd' },
];
export function PackageStatusBar({ counts, variant }: { counts: PackageCounts; variant: 'list' | 'detail' }) {
  const { lang, t } = useI18n();
  const groups = STATUS_GROUPS.map(g => ({ ...g, count: g.statuses.reduce((n, status) => n + counts.byStatus[status], 0), label: g.statuses.filter(s => counts.byStatus[s] > 0).map(s => `${labelOf('status', s, lang)}: ${counts.byStatus[s]}`).join(' / ') })).filter(g => g.count > 0);
  return <div className={`package-status-bar ${variant}`}><div className="package-status-track" role="img" aria-label={groups.map(g => g.label).join('; ') || t('No records', 'Χωρίς καταγραφές')}>
    {groups.map(g => <span key={g.key} data-group={g.key} className={`package-status-segment ${g.key === 'ended' ? 'hatched' : ''}`} title={g.label} style={{ flexGrow: g.count, backgroundColor: g.color }}/>)}</div>
    <small>{t(`${counts.outstanding} of ${counts.total} outstanding`, `${counts.outstanding} από ${counts.total} σε εκκρεμότητα`)}</small>
    {variant === 'detail' && <ul className="status-legend">{groups.map(g => <li key={g.key}>{g.label}</li>)}</ul>}
  </div>;
}
