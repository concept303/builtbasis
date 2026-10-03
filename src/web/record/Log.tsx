import { useState } from 'react';
import type { LogEntryInput } from '../../domain';
import { BusyButton, Field } from '../core/forms';
import { useI18n } from '../core/i18n';
import type { Log } from './data';
import { logDateFields, logTimestamp } from './helpers';

export function LogEditor({ initial, owner, busy, retryBlocked, reviewed, onReload, onSave, onCancel, onDirty }: { initial?: Log; owner: boolean; busy: boolean; retryBlocked: boolean; reviewed: boolean; onReload: () => Promise<boolean>; onSave: (body: LogEntryInput) => Promise<void>; onCancel: () => void; onDirty: () => void }) {
  const { t } = useI18n();
  const [original] = useState(() => initial?.eventAt ?? new Date().toISOString());
  const [originalFields] = useState(() => logDateFields(original));
  const [eventAt, setEventAt] = useState(originalFields.local); const [offset, setOffset] = useState(originalFields.offset);
  const [text, setText] = useState(initial?.text ?? ''); const [privateEntry, setPrivate] = useState(initial?.private ?? false); const [invalidTime, setInvalidTime] = useState(false);
  return <form onChange={onDirty} onSubmit={e => { e.preventDefault(); if (retryBlocked) return; let timestamp: string; try { timestamp = logTimestamp(eventAt, offset, { original, ...originalFields }); setInvalidTime(false); } catch { setInvalidTime(true); return; } void onSave({ eventAt: timestamp, text, ...(owner ? { private: privateEntry } : {}) }); }}><fieldset disabled={busy}><legend>{t('Log entry', 'Καταχώριση ημερολογίου')}</legend>
    {invalidTime && <p role="alert">{t('Enter a valid event date and UTC offset, such as +10:00.', 'Συμπληρώστε έγκυρη ημερομηνία γεγονότος και απόκλιση UTC, όπως +10:00.')}</p>}
    <Field label={t('Event date and time', 'Ημερομηνία και ώρα γεγονότος')}><input required type="datetime-local" step="0.001" value={eventAt} onChange={e => setEventAt(e.target.value)} /></Field>
    <Field label={t('UTC offset', 'Απόκλιση UTC')}><input required placeholder="+10:00" value={offset} onChange={e => setOffset(e.target.value)} /></Field>
    <p>{t('The offset identifies the exact instant, including repeated hours when daylight saving ends. When changing the date or time, check its offset. Unchanged event times keep their original precision.', 'Η απόκλιση προσδιορίζει την ακριβή χρονική στιγμή, ακόμη και στις επαναλαμβανόμενες ώρες κατά τη λήξη της θερινής ώρας. Όταν αλλάζετε ημερομηνία ή ώρα, ελέγξτε την απόκλιση. Οι αμετάβλητοι χρόνοι διατηρούν την αρχική ακρίβειά τους.')}</p>
    <Field label={t('Entry', 'Καταχώριση')}><textarea required maxLength={20000} value={text} onChange={e => setText(e.target.value)} /></Field>{owner && <label><input type="checkbox" checked={privateEntry} onChange={e => setPrivate(e.target.checked)} />{t('Private · owner only', 'Ιδιωτική · μόνο για τον ιδιοκτήτη')}</label>}<p>{t('Save the entry, then attach files to it.', 'Αποθηκεύστε την καταχώριση και μετά προσθέστε τα αρχεία της.')}</p>
    {retryBlocked && <p>{t('The entry may already be saved. Refresh the saved Log before retrying. Your draft will stay here.', 'Η καταχώριση μπορεί να έχει ήδη αποθηκευτεί. Ανανεώστε το αποθηκευμένο ημερολόγιο πριν δοκιμάσετε ξανά. Το πρόχειρό σας θα παραμείνει εδώ.')}</p>}
    {reviewed && <p>{t('Check the saved entries below before saving again to avoid a duplicate. Your draft is unchanged.', 'Ελέγξτε τις αποθηκευμένες καταχωρίσεις παρακάτω πριν αποθηκεύσετε ξανά, για να αποφύγετε διπλότυπο. Το πρόχειρό σας δεν άλλαξε.')}</p>}
    {retryBlocked && <button type="button" onClick={() => void onReload()}>{t('Refresh saved Log', 'Ανανέωση αποθηκευμένου ημερολογίου')}</button>}
    <BusyButton busy={busy} disabled={retryBlocked} type="submit">{t('Save entry', 'Αποθήκευση καταχώρισης')}</BusyButton><button type="button" onClick={onCancel}>{t('Cancel', 'Ακύρωση')}</button></fieldset></form>;
}

export function LogAttachment({ busy, retryBlocked, onReload, onUpload, onDirty }: { busy: boolean; retryBlocked: boolean; onReload: () => Promise<boolean>; onUpload: (file: File) => Promise<void>; onDirty: (dirty: boolean) => void }) {
  const { t } = useI18n(); const [file, setFile] = useState<File | null>(null); const [key, setKey] = useState(0); const [reviewed, setReviewed] = useState(false);
  return <details><summary>{t('Attach a file to this entry', 'Επισύναψη αρχείου σε αυτή την καταχώριση')}</summary><form onSubmit={e => { e.preventDefault(); if (file && !retryBlocked) void onUpload(file).then(() => { setFile(null); onDirty(false); setKey(old => old + 1); }).catch(() => {}); }}><Field label={t('Attachment file', 'Αρχείο συνημμένου')}><input key={key} type="file" required disabled={busy} onChange={e => { const next = e.target.files?.[0] ?? null; setFile(next); onDirty(next !== null); }} /></Field>
    {retryBlocked && <><p>{t('This file may already be saved. Refresh the saved attachments before retrying. Your selection will stay here.', 'Το αρχείο μπορεί να έχει ήδη αποθηκευτεί. Ανανεώστε τα αποθηκευμένα συνημμένα πριν δοκιμάσετε ξανά. Η επιλογή σας θα παραμείνει εδώ.')}</p><button disabled={busy} type="button" onClick={() => { void onReload().then(ok => { if (ok) setReviewed(true); }); }}>{t('Refresh saved attachments', 'Ανανέωση αποθηκευμένων συνημμένων')}</button></>}
    {reviewed && <p>{t('Check the attachment list above before uploading again to avoid a duplicate.', 'Ελέγξτε τη λίστα συνημμένων παραπάνω πριν μεταφορτώσετε ξανά, για να αποφύγετε διπλότυπο.')}</p>}
    <BusyButton type="submit" busy={busy} disabled={!file || retryBlocked}>{t('Upload attachment', 'Μεταφόρτωση συνημμένου')}</BusyButton></form></details>;
}
