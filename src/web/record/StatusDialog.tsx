import { InfoButton } from '../core/InfoButton';
import { entriesOf } from '../../domain';
import { ApiError } from '../core/api';
import { useEffect, useRef, useState } from 'react';
import { definitionOf, labelOf, type Status, type TransitionBodyInput } from '../../domain';
import type { RecordDetail } from '../../server/records/records';
import { BusyButton, ErrorNotice, Field, PersonSelect, VocabSelect } from '../core/forms';
import { useI18n } from '../core/i18n';
import { localInput } from './helpers';

export function StatusDialog({ record, people, busy, error, onSave, onCancel, onEdit, active = true }: { active?: boolean; onEdit:()=>void; record: RecordDetail; people: { id: number; name: string; active?: boolean }[]; busy: boolean; error?: unknown; onSave: (body: TransitionBodyInput) => Promise<void>; onCancel: () => void }) {
  const { t, lang } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const opener=document.activeElement as HTMLElement; if(active)dialog.current?.showModal();else dialog.current?.close();return()=>{dialog.current?.close();if(active)opener?.focus();}; }, [active]);
  const [to, setTo] = useState<Status | ''>(''); const [reason, setReason] = useState<string | null>(null); const [reasonNote, setReasonNote] = useState(''); const [note, setNote] = useState('');
  const [checkedById, setPerson] = useState<number | null>(null); const [date, setDate] = useState(localInput().slice(0, 10)); const [method, setMethod] = useState<string | null>(null); const [verificationNote, setVerificationNote] = useState('');
  const verify = record.status === 'ready_for_verification' && (to === 'closed' || to === 'in_progress');
  const reasonList = to === 'on_hold' ? 'onHoldReason' : to === 'cancelled' ? 'cancellationReason' : null;
  return <dialog ref={dialog} aria-labelledby="status-heading" className="dialog" onCancel={e => { e.preventDefault(); if (!busy) onCancel(); }}><h2 id="status-heading">{t('Change status', 'Αλλαγή κατάστασης')}</h2>
    <ErrorNotice error={error} />{error instanceof ApiError && error.code==='transition_rejected' && (error.details as {errors?:string[]})?.errors?.some(code=>code.startsWith('required:') || ['decision_required','disposition_required','accept_as_is_required'].includes(code)) && <p>{t('Complete the required record fields before applying this status.','Συμπληρώστε τα υποχρεωτικά πεδία της καταγραφής πριν εφαρμόσετε αυτή την κατάσταση.')} <button type="button" onClick={onEdit}>{t('Edit required fields','Επεξεργασία υποχρεωτικών πεδίων')}</button></p>}
    <form onSubmit={e => { e.preventDefault(); if (!to) return; void onSave({ to, ...(reasonList ? { reasonCode: reason, reasonNote } : {}), note, ...(verify ? { verification: { checkedById, date, method, note: verificationNote } } : {}) }); }}><fieldset disabled={busy}>
      <Field label={t('New status', 'Νέα κατάσταση')}><select required value={to} onChange={e => { setTo(e.target.value as Status); setReason(null); }}><option value="">{t('Choose', 'Επιλέξτε')}</option>{record.allowedTransitions.map(status => <option key={status} value={status}>{labelOf('status', status, lang)}</option>)}</select></Field>
      {to && <InfoButton label={t('Status definition','Ορισμός κατάστασης')}>{definitionOf('status',to,lang)}</InfoButton>}<details><summary>{t('All statuses','Όλες οι καταστάσεις')}</summary><dl>{entriesOf('status').map(entry=><div key={entry.code}><dt>{labelOf('status',entry.code,lang)}</dt><dd>{definitionOf('status',entry.code,lang)}</dd></div>)}</dl></details>
      {reasonList && <><VocabSelect list={reasonList} label={t('Reason', 'Αιτιολογία')} required value={reason} onChange={setReason} /><Field label={t('Reason note', 'Σημείωση αιτιολογίας')}><textarea required={reason === 'other' || (to === 'cancelled' && reason === 'replaced')} value={reasonNote} onChange={e => setReasonNote(e.target.value)} /></Field></>}
      <Field label={to === 'superseded' ? t('Replacement record and reason', 'Εγγραφή αντικατάστασης και αιτιολογία') : t('Transition note', 'Σημείωση αλλαγής')}><textarea required={to === 'superseded' || (record.status === 'closed' && to === 'open')} value={note} onChange={e => setNote(e.target.value)} /></Field>
      {verify && <fieldset><legend>{t('Verification', 'Επαλήθευση')}</legend><p>{t('Outcome', 'Αποτέλεσμα')}: {labelOf('verificationOutcome', to === 'closed' ? 'passed' : 'failed', lang)}</p><PersonSelect label={t('Checked by', 'Ελέγχθηκε από')} people={people} value={checkedById} onChange={setPerson} /><Field label={t('Date', 'Ημερομηνία')}><input required type="date" value={date} onChange={e => setDate(e.target.value)} /></Field><VocabSelect list="verificationMethod" label={t('Method', 'Μέθοδος')} required value={method} onChange={setMethod} /><Field label={t('Verification note', 'Σημείωση επαλήθευσης')}><textarea value={verificationNote} onChange={e => setVerificationNote(e.target.value)} /></Field></fieldset>}
      <BusyButton busy={busy} disabled={!to || (verify && !checkedById)} type="submit">{t('Apply status', 'Εφαρμογή κατάστασης')}</BusyButton><button type="button" onClick={onCancel}>{t('Cancel', 'Ακύρωση')}</button>
    </fieldset></form>
  </dialog>;
}
