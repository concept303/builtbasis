import type { RecordSummary } from '../../server/records/list';
import { labelOf } from '../../domain';
import { useI18n } from '../core/i18n';
import { StatusBadge } from '../core/StatusBadge';
import { DueChip } from '../core/DueChip';
import { dateText } from '../record/helpers';
export function RecordCard({ record, people, packageName, hidePackage = false, today, href }: { record: RecordSummary; people: { id: number; name: string }[]; packageName?: string | null; hidePackage?: boolean; today: string; href: string }) {
  const { lang, t } = useI18n();
  return <article className="record-card"><a href={href}><strong>{record.humanId}</strong><h2>{record.title || t('Untitled draft', 'Πρόχειρο χωρίς τίτλο')}</h2></a><div className="record-facts">
    <span>{labelOf('subtype', record.subtype, lang)}</span><StatusBadge kind="record" status={record.status}/>
    {!hidePackage && (packageName ?? record.workPackageName) && <span>{t('Work package', 'Πακέτο εργασιών')}: {packageName ?? record.workPackageName}</span>}
    <span>{t('Next action by', 'Επόμενη ενέργεια από')}: {people.find(p => p.id === record.ballInCourtId)?.name ?? '—'}</span>
    <span>{t('Due', 'Προθεσμία')}: {dateText(record.dueDate, lang)} <DueChip status={record.status} dueDate={record.dueDate} today={today}/></span>
    <span>{t('Priority', 'Προτεραιότητα')}: {record.priority ? labelOf('priority', record.priority, lang) : '—'}</span>
    <span>{t('Severity', 'Σοβαρότητα')}: {record.severity ? labelOf('severity', record.severity, lang) : '—'}</span>
    {record.completion !== null && <label>{t('Completion', 'Ολοκλήρωση')} <progress max={100} value={record.completion}/> {record.completion}%</label>}
    {record.safety && <span className="safety">{t('Safety implications', 'Θέμα ασφαλείας')}</span>}
  </div></article>;
}
