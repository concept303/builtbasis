import { InfoButton } from '../core/InfoButton';
import { DueChip } from '../core/DueChip';
import { useToday } from '../core/useToday';
import type { ReactNode } from 'react';
import { definitionOf, isCode, labelOf, type ListKey } from '../../domain';
import type { RecordDetail } from '../../server/records/records';
import { useI18n } from '../core/i18n';
import type { RecordData } from './data';
import { dateText } from './helpers';

export function RecordSummary({ data }: { data: RecordData }) {
  const { t, lang } = useI18n(); const r = data.record;
  const lastBallChange = data.activity.find(entry => entry.field === 'ballInCourtId');
  const today=useToday();
  return <dl className="summary-grid next-action-strip">
    {r.ballInCourtId !== null && <div><dt>{t('Next action by','Επόμενη ενέργεια από')}</dt><dd>{data.labels.people.find(person=>person.id===r.ballInCourtId)?.name}{lastBallChange && <small>{t('Since','Από')} {dateText(lastBallChange.at,lang)}</small>}</dd></div>}
    {r.responsibleId !== null && <div><dt>{t('Responsible','Υπεύθυνος')}</dt><dd>{data.labels.people.find(person=>person.id===r.responsibleId)?.name}</dd></div>}
    {r.dueDate && <div><dt>{t('Due date','Προθεσμία')}</dt><dd>{dateText(r.dueDate,lang)} <DueChip dueDate={r.dueDate} status={r.status} today={today}/></dd></div>}
  </dl>;
}

export function Overview({ data, locationPhotos, options }: { data: RecordData; locationPhotos: ReactNode; options?: ReactNode }) {
  const { t, lang } = useI18n(); const r = data.record;
  const name = (item: { nameEn: string; nameEl: string }) => lang === 'el' ? item.nameEl || item.nameEn : item.nameEn || item.nameEl;
  const person = (id: number | null) => data.labels.people.find(item => item.id === id)?.name ?? null;
  const value = (en: string, el: string, content: ReactNode) => content === null || content === undefined || content === '' ? null : <div><dt>{t(en, el)}</dt><dd className="user-text">{content}</dd></div>;
  const vocab = (en: string, el: string, list: ListKey, code: string | null) => value(en, el, code && isCode(list, code) ? <span>{labelOf(list,code,lang)}<InfoButton label={t(en,el)+' — '+t('Definition','Ορισμός')}>{definitionOf(list,code,lang)}</InfoButton></span> : null);
  const selected = (ids: number[], list: { id: number; nameEn: string; nameEl: string }[]) => ids.map(id => list.find(item => item.id === id)).filter(item => item !== undefined).map(name).join(', ');
  return <>
    {r.statusReason && <section><h3>{t('Status reason', 'Αιτιολογία κατάστασης')}</h3>{r.statusReason.code && isCode(r.status === 'on_hold' ? 'onHoldReason' : 'cancellationReason', r.statusReason.code) && <p>{labelOf(r.status === 'on_hold' ? 'onHoldReason' : 'cancellationReason', r.statusReason.code, lang)}</p>}<p className="user-text">{r.statusReason.note}</p></section>}
    {r.description && <section><h2>{t('Description','Περιγραφή')}</h2><p className="user-text">{r.description}</p></section>}
    {(r.priority || r.severity || r.completion !== null) && <section><h2>{t('Record details','Στοιχεία καταγραφής')}</h2><dl className="summary-grid">{vocab('Priority','Προτεραιότητα','priority',r.priority)}{vocab('Severity','Σοβαρότητα','severity',r.severity)}{r.completion!==null && value('Completion','Ολοκλήρωση',<><progress max={100} value={r.completion}/> {r.completion}%</>)}</dl></section>}
    {r.subtype!=='task' && <section><h2>{t('Classification', 'Ταξινόμηση')}</h2><dl className="reading-grid">{r.subtype === 'quality_issue' && <>{value('Type of problem', 'Είδος προβλήματος', r.problemTypes.map(code => <span key={code}>{labelOf('problemType',code,lang)}<InfoButton label={labelOf('problemType',code,lang)}>{definitionOf('problemType',code,lang)}</InfoButton></span>))}{vocab('Stage', 'Στάδιο', 'stage', r.stage)}</>}{r.subtype === 'detail_clarification' && <>{value('Question', 'Ερώτημα', r.question)}</>}</dl></section>}
    {r.subtype !== 'task' && <section><h2>{t('Decision and instruction', 'Απόφαση και εντολή')}</h2><dl className="reading-grid">{r.subtype==='quality_issue' && vocab('Disposition','Τρόπος αντιμετώπισης','disposition',r.disposition)}{r.subtype==='detail_clarification' && <>{vocab('Route','Διαδικασία','route',r.route)}{value('Issued by','Εκδόθηκε από',person(r.issuedById))}</>}{value('Chosen option', 'Επιλεγμένη λύση', data.options.find(option => option.id === r.chosenOptionId)?.label)}{value('Decided by', 'Αποφάσισε', person(r.decidedById))}{value('Decided on', 'Ημερομηνία απόφασης', r.decidedOn ? dateText(r.decidedOn, lang) : null)}{r.subtype==='quality_issue' && r.correction && <div className="full-width">{value('Correction','Διόρθωση',r.correction)}</div>}</dl>{r.instructionText && <blockquote className="instruction-text user-text">{r.instructionText}</blockquote>}{options}</section>}
    <section><h2>{t('Location and references','Θέση και αναφορές')}</h2><dl className="reading-grid">{value('Location','Θέση',r.locationIds.map(id=>data.labels.locations.find(item=>item.id===id)?.path.map(name).join(' / ')).filter(Boolean).join('\n'))}{value('Trades','Ειδικότητες',selected(r.tradeIds,data.labels.trades))}{value('Tags','Ετικέτες',selected(r.tagIds,data.labels.tags))}{value('Reference','Αναφορά',r.reference)}{r.locationNotes && <div className="full-width">{value('Location Notes','Σημειώσεις θέσης',r.locationNotes)}</div>}</dl>{locationPhotos}</section>
    <details><summary>{t('Sequence and dates', 'Σειρά εργασιών και ημερομηνίες')}</summary><dl className="reading-grid">{value('Must be done before', 'Να γίνει πριν', r.mustBeDoneBefore.map(item => `${item.humanId} ${item.title ?? ''}`).join('\n'))}{value('Requires first', 'Απαιτείται πρώτα', r.requiresFirst.map(item => `${item.humanId} ${item.title ?? ''}`).join('\n'))}{value('Created', 'Δημιουργία', dateText(r.createdAt, lang))}{value('Updated', 'Ενημέρωση', dateText(r.updatedAt, lang))}</dl></details>
    {r.publicNotes && <section><h2>{t('Public Notes', 'Δημόσιες σημειώσεις')}</h2><p className="user-text">{r.publicNotes}</p></section>}
    {data.owner && <details><summary>{t('Private · owner only', 'Ιδιωτικά · μόνο για τον ιδιοκτήτη')}</summary><dl>{value('Private Notes', 'Ιδιωτικές σημειώσεις', (r as RecordDetail).notes)}{value('Outside contract scope', 'Εκτός σύμβασης', (r as RecordDetail).outsideScope ? t('Yes', 'Ναι') : t('No', 'Όχι'))}{(r as RecordDetail).outsideScope && value('Estimated cost', 'Εκτιμώμενο κόστος', (r as RecordDetail).estimatedCost === null ? '—' : new Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR' }).format((r as RecordDetail).estimatedCost!))}</dl></details>}
    <details><summary>{t('Verification history', 'Ιστορικό επαλήθευσης')} ({data.verifications.length})</summary>{data.verifications.map(entry => <article key={entry.id}><h3>{dateText(entry.date, lang)} · {labelOf('verificationOutcome', entry.outcome, lang)}</h3><p>{person(entry.checkedById)} · {labelOf('verificationMethod', entry.method, lang)}</p><p className="user-text">{entry.note}</p><InfoButton label={t('Verification definitions','Ορισμοί επαλήθευσης')}><p>{definitionOf('verificationMethod', entry.method, lang)}</p><p>{definitionOf('verificationOutcome', entry.outcome, lang)}</p></InfoButton></article>)}</details>
  </>;
}
