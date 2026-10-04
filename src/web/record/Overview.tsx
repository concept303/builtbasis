import type { ReactNode } from 'react';
import { definitionOf, isCode, labelOf, type ListKey } from '../../domain';
import type { RecordDetail } from '../../server/records/records';
import { useI18n } from '../core/i18n';
import type { RecordData } from './data';
import { dateText } from './helpers';

export function RecordSummary({ data }: { data: RecordData }) {
  const { t, lang } = useI18n(); const r = data.record;
  const lastBallChange = data.activity.find(entry => entry.field === 'ballInCourtId');
  const fixed = (list: ListKey, code: string | null) => code && isCode(list, code) ? <details className="value-definition"><summary>{labelOf(list, code, lang)}</summary>{definitionOf(list, code, lang)}</details> : '—';
  return <dl className="summary-grid">
    <div><dt>{t('Subtype', 'Υποκατηγορία')}</dt><dd>{fixed('subtype', r.subtype)}</dd></div><div><dt>{t('Status', 'Κατάσταση')}</dt><dd>{fixed('status', r.status)}</dd></div>
    <div><dt>{t('Ball in court', 'Επόμενη ενέργεια από')}</dt><dd>{data.labels.people.find(person => person.id === r.ballInCourtId)?.name ?? '—'}{r.ballInCourtId !== null && lastBallChange && <small>{t('Since', 'Από')} {dateText(lastBallChange.at, lang)}</small>}</dd></div>
    <div><dt>{t('Responsible', 'Υπεύθυνος')}</dt><dd>{data.labels.people.find(person => person.id === r.responsibleId)?.name ?? '—'}</dd></div>
    <div><dt>{t('Due date', 'Προθεσμία')}</dt><dd>{dateText(r.dueDate, lang)}</dd></div><div><dt>{t('Priority', 'Προτεραιότητα')}</dt><dd>{fixed('priority', r.priority)}</dd></div><div><dt>{t('Severity', 'Σοβαρότητα')}</dt><dd>{fixed('severity', r.severity)}</dd></div>
    <div><dt>{t('Completion', 'Ολοκλήρωση')}</dt><dd>{r.completion === null ? '—' : <><progress max={100} value={r.completion} /> {r.completion}%</>}</dd></div><div><dt>{t('Safety implications', 'Θέμα ασφαλείας')}</dt><dd>{r.safety ? t('Yes', 'Ναι') : t('No', 'Όχι')}</dd></div>
  </dl>;
}

export function Overview({ data, locationPhotos }: { data: RecordData; locationPhotos: ReactNode }) {
  const { t, lang } = useI18n(); const r = data.record;
  const name = (item: { nameEn: string; nameEl: string }) => lang === 'el' ? item.nameEl || item.nameEn : item.nameEn || item.nameEl;
  const person = (id: number | null) => data.labels.people.find(item => item.id === id)?.name ?? '—';
  const value = (en: string, el: string, content: ReactNode) => <div><dt>{t(en, el)}</dt><dd className="user-text">{content || '—'}</dd></div>;
  const vocab = (en: string, el: string, list: ListKey, code: string | null) => value(en, el, code && isCode(list, code) ? <details className="value-definition"><summary>{labelOf(list, code, lang)}</summary>{definitionOf(list, code, lang)}</details> : '—');
  const selected = (ids: number[], list: { id: number; nameEn: string; nameEl: string }[]) => ids.map(id => list.find(item => item.id === id)).filter(item => item !== undefined).map(name).join(', ');
  return <>
    {r.statusReason && <section><h3>{t('Status reason', 'Αιτιολογία κατάστασης')}</h3>{r.statusReason.code && isCode(r.status === 'on_hold' ? 'onHoldReason' : 'cancellationReason', r.statusReason.code) && <p>{labelOf(r.status === 'on_hold' ? 'onHoldReason' : 'cancellationReason', r.statusReason.code, lang)}</p>}<p className="user-text">{r.statusReason.note}</p></section>}
    <section><h2>{t('Description and location', 'Περιγραφή και θέση')}</h2><p className="user-text">{r.description || '—'}</p><dl>{value('Location', 'Θέση', r.locationIds.map(id => data.labels.locations.find(item => item.id === id)?.path.map(name).join(' / ')).filter(Boolean).join('\n'))}{r.locationNotes && value('Location Notes', 'Σημειώσεις θέσης', r.locationNotes)}{value('Trades', 'Ειδικότητες', selected(r.tradeIds, data.labels.trades))}{value('Tags', 'Ετικέτες', selected(r.tagIds, data.labels.tags))}{value('Reference', 'Αναφορά', r.reference)}</dl>{locationPhotos}</section>
    <section><h2>{t('Classification', 'Ταξινόμηση')}</h2><dl>{r.subtype === 'quality_issue' && <>{value('Type of problem', 'Είδος προβλήματος', r.problemTypes.map(code => <details key={code}><summary>{labelOf('problemType', code, lang)}</summary>{definitionOf('problemType', code, lang)}</details>))}{vocab('Stage', 'Στάδιο', 'stage', r.stage)}{vocab('Disposition', 'Τρόπος αντιμετώπισης', 'disposition', r.disposition)}{value('Correction', 'Διόρθωση', r.correction)}</>}{r.subtype === 'detail_clarification' && <>{value('Question', 'Ερώτημα', r.question)}{vocab('Route', 'Διαδικασία', 'route', r.route)}{value('Issued by', 'Εκδόθηκε από', person(r.issuedById))}</>}{r.subtype === 'task' && value('Subtype', 'Υποκατηγορία', labelOf('subtype', r.subtype, lang))}</dl></section>
    {r.subtype !== 'task' && <section><h2>{t('Decision and instruction', 'Απόφαση και εντολή')}</h2><dl>{value('Chosen option', 'Επιλεγμένη λύση', data.options.find(option => option.id === r.chosenOptionId)?.label)}{value('Decided by', 'Αποφάσισε', person(r.decidedById))}{value('Decided on', 'Ημερομηνία απόφασης', dateText(r.decidedOn, lang))}{value('Instruction text', 'Κείμενο εντολής', r.instructionText)}</dl></section>}
    <details><summary>{t('Sequence and dates', 'Σειρά εργασιών και ημερομηνίες')}</summary><dl>{value('Must be done before', 'Να γίνει πριν', r.mustBeDoneBefore.map(item => `${item.humanId} ${item.title ?? ''}`).join('\n'))}{value('Requires first', 'Απαιτείται πρώτα', r.requiresFirst.map(item => `${item.humanId} ${item.title ?? ''}`).join('\n'))}{value('Created', 'Δημιουργία', dateText(r.createdAt, lang))}{value('Updated', 'Ενημέρωση', dateText(r.updatedAt, lang))}</dl></details>
    <section><h2>{t('Public Notes', 'Δημόσιες σημειώσεις')}</h2><p className="user-text">{r.publicNotes || '—'}</p></section>
    {data.owner && <details><summary>{t('Private · owner only', 'Ιδιωτικά · μόνο για τον ιδιοκτήτη')}</summary><dl>{value('Private Notes', 'Ιδιωτικές σημειώσεις', (r as RecordDetail).notes)}{value('Outside contract scope', 'Εκτός σύμβασης', (r as RecordDetail).outsideScope ? t('Yes', 'Ναι') : t('No', 'Όχι'))}{(r as RecordDetail).outsideScope && value('Estimated cost', 'Εκτιμώμενο κόστος', (r as RecordDetail).estimatedCost === null ? '—' : new Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR' }).format((r as RecordDetail).estimatedCost!))}</dl></details>}
    <details><summary>{t('Verification history', 'Ιστορικό επαλήθευσης')} ({data.verifications.length})</summary>{data.verifications.map(entry => <article key={entry.id}><h3>{dateText(entry.date, lang)} · {labelOf('verificationOutcome', entry.outcome, lang)}</h3><p>{person(entry.checkedById)} · {labelOf('verificationMethod', entry.method, lang)}</p><p className="user-text">{entry.note}</p><details><summary>{t('Definitions', 'Ορισμοί')}</summary><p>{definitionOf('verificationMethod', entry.method, lang)}</p><p>{definitionOf('verificationOutcome', entry.outcome, lang)}</p></details></article>)}</details>
  </>;
}
