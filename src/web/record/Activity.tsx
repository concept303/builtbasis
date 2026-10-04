import { isCode, labelOf } from '../../domain';
import { useI18n } from '../core/i18n';
import type { RecordData } from './data';
import { dateText, displayValue } from './helpers';

const fields: Record<string, [string, string]> = { ballInCourtId: ['Ball in court', 'Επόμενη ενέργεια από'], responsibleId: ['Responsible', 'Υπεύθυνος'], severity: ['Severity', 'Σοβαρότητα'], priority: ['Priority', 'Προτεραιότητα'], dueDate: ['Due date', 'Προθεσμία'], disposition: ['Disposition', 'Τρόπος αντιμετώπισης'], chosenOptionId: ['Chosen option', 'Επιλεγμένη λύση'], decidedById: ['Decided by', 'Αποφάσισε'], decidedOn: ['Decided on', 'Ημερομηνία απόφασης'], instructionText: ['Instruction text', 'Κείμενο εντολής'], status: ['Status', 'Κατάσταση'] };
const actions: Record<string, [string, string]> = { created: ['Record created', 'Δημιουργία εγγραφής'], field_changed: ['Field changed', 'Αλλαγή πεδίου'], status_changed: ['Status changed', 'Αλλαγή κατάστασης'], share_created: ['Share link created', 'Δημιουργία συνδέσμου κοινοποίησης'], share_revoked: ['Share link revoked', 'Ανάκληση συνδέσμου κοινοποίησης'], grant_changed: ['Record access changed', 'Αλλαγή πρόσβασης εγγραφής'], grant_revoked: ['Record access removed', 'Αφαίρεση πρόσβασης εγγραφής'] };
export function Activity({ data }: { data: RecordData }) {
  const { t, lang } = useI18n();
  const option = (value: unknown) => value && typeof value === 'object' && 'label' in value && typeof value.label === 'string' ? value.label : '—';
  return <section><h2>{t('Activity', 'Ιστορικό ενεργειών')}</h2>{data.activity.length === 0 && <p>{t('No activity yet.', 'Δεν υπάρχουν ακόμη ενέργειες.')}</p>}{data.activity.map(entry => {
    const action = actions[entry.action] ?? ['Activity', 'Ενέργεια']; const field = entry.field ? fields[entry.field] : undefined; const detail = entry.detail;
    const detailValue = (key: string): unknown => detail && key in detail ? (detail as Record<string, unknown>)[key] : null;
    const reason = detailValue('reasonCode'); const reasonList = entry.to === 'on_hold' ? 'onHoldReason' : 'cancellationReason';
    const verification = detailValue('verification') as { outcome?: string; method?: string; checkedById?: number; date?: string } | null;
    return <article key={entry.id}><h3>{dateText(entry.at, lang)} · {t(...action)}</h3>{'by' in entry && <p>{entry.by}</p>}{field && <p>{t(...field)}</p>}{(entry.action === 'field_changed' || entry.action === 'status_changed') && <dl><div><dt>{t('Previous', 'Προηγούμενο')}</dt><dd className="user-text">{entry.field === 'chosenOptionId' ? option(detailValue('fromOption')) : displayValue(entry.field, entry.from, lang, data.labels.people)}</dd></div><div><dt>{t('New', 'Νέο')}</dt><dd className="user-text">{entry.field === 'chosenOptionId' ? option(detailValue('toOption')) : displayValue(entry.field, entry.to, lang, data.labels.people)}</dd></div></dl>}
      {isCode(reasonList, reason) && <p>{t('Reason', 'Αιτιολογία')}: {labelOf(reasonList, reason, lang)}</p>}{['reasonNote', 'note', 'label'].map(key => typeof detailValue(key) === 'string' ? <p key={key} className="user-text">{String(detailValue(key))}</p> : null)}
      {verification && <p>{verification.date ? dateText(verification.date, lang) : ''} · {data.labels.people.find(person => person.id === verification.checkedById)?.name} · {isCode('verificationMethod', verification.method) ? labelOf('verificationMethod', verification.method, lang) : ''} · {isCode('verificationOutcome', verification.outcome) ? labelOf('verificationOutcome', verification.outcome, lang) : ''}</p>}
      {typeof detailValue('canUpload') === 'boolean' && <p>{t('Upload evidence', 'Μεταφόρτωση τεκμηρίων')}: {detailValue('canUpload') ? t('Allowed', 'Επιτρέπεται') : t('Not allowed', 'Δεν επιτρέπεται')}</p>}{typeof detailValue('canAddLog') === 'boolean' && <p>{t('Add Log entries', 'Προσθήκη καταχωρίσεων στο ημερολόγιο')}: {detailValue('canAddLog') ? t('Allowed', 'Επιτρέπεται') : t('Not allowed', 'Δεν επιτρέπεται')}</p>}
    </article>;
  })}</section>;
}
