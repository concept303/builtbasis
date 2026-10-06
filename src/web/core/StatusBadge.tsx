import { labelOf, type Status, PACKAGE_STATUSES, type PackageStatus } from '../../domain';
import { useI18n } from './i18n';
export function recordStatusFamily(status: Status): string {
  if (status === 'closed') return 'green';
  if (status === 'ready_for_verification') return 'plum';
  if (['awaiting_decision', 'on_hold'].includes(status)) return 'amber';
  return ['open', 'issued', 'in_progress'].includes(status) ? 'blue' : 'neutral';
}
export function StatusBadge(props: { kind: 'record'; status: Status } | { kind: 'package'; status: PackageStatus }) {
  const { lang } = useI18n();
  if (props.kind === 'record') return <span className={`status-badge status-${recordStatusFamily(props.status)}`}>{labelOf('status', props.status, lang)}</span>;
  const entry = PACKAGE_STATUSES.find(s => s.code === props.status)!;
  const family = props.status === 'completed' ? 'green' : props.status === 'in_progress' ? 'blue' : props.status === 'on_hold' ? 'amber' : 'neutral';
  return <span className={`package-badge status-${family}`}><span aria-hidden="true" className={props.status === 'cancelled' ? 'status-dot hollow' : 'status-dot'}/>{entry[lang]}</span>;
}
