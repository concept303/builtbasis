import { useEffect, useRef, useState } from 'react';
import { definitionOf, labelOf, type Status, type TransitionBodyInput } from '../../domain';
import type { RecordDetail } from '../../server/records/records';
import { BusyButton, ErrorNotice, Field, PersonSelect, VocabSelect } from '../core/forms';
import { useI18n } from '../core/i18n';
import { localInput } from './helpers';

export function StatusDialog({ record, people, busy, error, onSave, onCancel }: { record: RecordDetail; people: { id: number; name: string; active?: boolean }[]; busy: boolean; error?: unknown; onSave: (body: TransitionBodyInput) => Promise<void>; onCancel: () => void }) {
  const { t, lang } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const [to, setTo] = useState<Status | ''>(''); const [reason, setReason] = useState<string | null>(null); const [reasonNote, setReasonNote] = useState(''); const [note, setNote] = useState('');
  const [checkedById, setPerson] = useState<number | null>(null); const [date, setDate] = useState(localInput().slice(0, 10)); const [method, setMethod] = useState<string | null>(null); const [verificationNote, setVerificationNote] = useState('');
  const verify = record.status === 'ready_for_verification' && (to === 'closed' || to === 'in_progress');
  const reasonList = to === 'on_hold' ? 'onHoldReason' : to === 'cancelled' ? 'cancellationReason' : null;
  return <dialog ref={dialog} aria-labelledby="status-heading" className="dialog" onCancel={e => { e.preventDefault(); if (!busy) onCancel(); }}><h2 id="status-heading">{t('Change status', 'Αλλαγή κατάστασης')}</h2>
    <ErrorNotice error={error} />
    <form onSubmit={e => { e.preventDefault(); if (!to) return; void onSave({ to, ...(reasonList ? { reasonCode: reason, reasonNote } : {}), note, ...(verify ? { verification: { checkedById, date, method, note: verificationNote } } : {}) }); }}><fieldset disabled={busy}>
      <Field label={t('New status', 'Νέα κατάσταση')}><select required value={to} onChange={e => { setTo(e.target.value as Status); setReason(null); }}><option value="">{t('Choose', 'Επιλέξτε')}</option>{record.allowedTransitions.map(status => <option key={status} value={status}>{labelOf('status', status, lang)}</option>)}</select></Field>
      {to && <p>{definitionOf('status', to, lang)}</p>}
      {reasonList && <><VocabSelect list={reasonList} label={t('Reason', 'Αιτιολογία')} required value={reason} onChange={setReason} /><Field label={t('Reason note', 'Σημείωση αιτιολογίας')}><textarea required={reason === 'other' || (to === 'cancelled' && reason === 'replaced')} value={reasonNote} onChange={e => setReasonNote(e.target.value)} /></Field></>}
      <Field label={to === 'superseded' ? t('Replacement record and reason', 'Εγγραφή αντικατάστασης και αιτιολογία') : t('Transition note', 'Σημείωση αλλαγής')}><textarea required={to === 'superseded' || (record.status === 'closed' && to === 'open')} value={note} onChange={e => setNote(e.target.value)} /></Field>
      {verify && <fieldset><legend>{t('Verification', 'Επαλήθευση')}</legend><p>{t('Outcome', 'Αποτέλεσμα')}: {labelOf('verificationOutcome', to === 'closed' ? 'passed' : 'failed', lang)}</p><PersonSelect label={t('Checked by', 'Ελέγχθηκε από')} people={people} value={checkedById} onChange={setPerson} /><Field label={t('Date', 'Ημερομηνία')}><input required type="date" value={date} onChange={e => setDate(e.target.value)} /></Field><VocabSelect list="verificationMethod" label={t('Method', 'Μέθοδος')} required value={method} onChange={setMethod} /><Field label={t('Verification note', 'Σημείωση επαλήθευσης')}><textarea value={verificationNote} onChange={e => setVerificationNote(e.target.value)} /></Field></fieldset>}
      <BusyButton busy={busy} disabled={!to || (verify && !checkedById)} type="submit">{t('Apply status', 'Εφαρμογή κατάστασης')}</BusyButton><button type="button" onClick={onCancel}>{t('Cancel', 'Ακύρωση')}</button>
    </fieldset></form>
  </dialog>;
}
