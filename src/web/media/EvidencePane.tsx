import { useEffect, useRef, useState } from 'react';
import { ACCEPTED_ATTACHMENT_EXTENSIONS, entriesOf, labelOf, type PhotoOut, type PhotoPhase } from '../../domain';
import type { ViewContext } from '../core/types';
import { api, isUnknownOutcome } from '../core/api';
import { ErrorNotice, Field, VocabSelect, useDirtyGuard } from '../core/forms';
import { useI18n } from '../core/i18n';
import { EvidenceViewer, PhotoThumbnail, type EvidenceSelection } from './EvidenceViewer';
import { preparePhoto } from './photos';
import { isAccessLost, uploadEvidence } from './transport';
import type { EvidenceAttachment } from './types';

interface Props { context: ViewContext; photos: PhotoOut[]; attachments: EvidenceAttachment[]; canUpload: boolean; owner: boolean; onChange(): void; onAccessLost(): void; onDirty?(dirty: boolean): void }
export function EvidencePane(props: Props) {
  return <EvidenceContent key={`${props.context.mode}:${props.context.base}:${props.context.token ?? ''}`} {...props} />;
}
function EvidenceContent({ context, photos, attachments, canUpload, owner, onChange, onAccessLost, onDirty }: Props) {
  const { lang, t } = useI18n();
  const [selection, setSelection] = useState<EvidenceSelection | null>(null);
  const [editing, setEditing] = useState<EvidenceSelection | null>(null);
  const [error, setError] = useState<unknown>();
  const [kind, setKind] = useState<'photos' | 'attachments'>('photos');
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<PhotoPhase>('before');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [retryBlocked, setRetryBlocked] = useState(false);
  const retryRefresh = useRef(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState('');
  const [message, setMessage] = useState<'' | 'complete' | 'stopped'>('');
  const scope = useRef<AbortController | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const lifetime = useRef(new AbortController());
  useEffect(() => { onDirty?.(files.length > 0 || caption.length > 0 || editing !== null || busy); }, [files.length, caption, editing, busy, onDirty]);
  useEffect(() => () => onDirty?.(false), [onDirty]);
  useEffect(() => { lifetime.current = new AbortController(); return () => { lifetime.current.abort(); scope.current?.abort(); }; }, []);
  useEffect(() => { if (!canUpload) { scope.current?.abort(); setFiles([]); } }, [canUpload]);
  useEffect(() => {
    if (selection && !(selection.kind === 'photos' ? photos : attachments).some(item => item.id === selection.item.id)) setSelection(null);
  }, [photos, attachments, selection]);
  useEffect(() => { if (retryRefresh.current) { retryRefresh.current = false; setRetryBlocked(false); } }, [photos, attachments]);
  const failed = (value: unknown) => { if (isAccessLost(value)) { scope.current?.abort(); setSelection(null); setEditing(null); onAccessLost(); } else setError(value); };
  const upload = async () => {
    if (retryBlocked) return;
    const controller = new AbortController(); scope.current?.abort(); scope.current = controller;
    setBusy(true); setError(undefined); setMessage('');
    let completed = 0;
    try {
      // Process files one at a time. Do not prepare all copies or load all originals.
      for (const file of files) {
        setCurrent(file.name); setProgress(0);
        if (kind === 'photos') {
          const photo = await preparePhoto(file, controller.signal);
          await uploadEvidence(context, 'photos', { original: photo.original, display: photo.display, thumbnail: photo.thumbnail }, { phase, caption: caption || null, takenAt: photo.takenAt }, controller.signal, setProgress);
        } else await uploadEvidence(context, 'attachments', { file }, { title: caption || null }, controller.signal, setProgress);
        completed++; onChange();
      }
      setCaption('');
      setMessage('complete');
    } catch (value) {
      if (!controller.signal.aborted) { if (isUnknownOutcome(value)) setRetryBlocked(true); failed(value); }
      else { setRetryBlocked(true); setMessage('stopped'); }
    } finally {
      if (!lifetime.current.signal.aborted) {
        setFiles(previous => previous.slice(completed)); setBusy(false); setCurrent('');
        if (completed === files.length && picker.current) picker.current.value = '';
      }
    }
  };
  const remove = async (entry: EvidenceSelection) => {
    if (!confirm(t('Delete this evidence occurrence? The original stored file is retained.', 'Διαγραφή αυτής της καταχώρισης τεκμηρίου; Το αποθηκευμένο πρωτότυπο διατηρείται.'))) return;
    setError(undefined);
    try { await api(`${context.base}/${entry.kind}/${entry.item.id}`, { method: 'DELETE', body: {}, signal: lifetime.current.signal }); setSelection(null); onChange(); }
    catch (value) { if (!lifetime.current.signal.aborted) failed(value); }
  };
  return <section className="evidence-pane" aria-label={t('Evidence', 'Τεκμήρια')}><h2>{t('Evidence', 'Τεκμήρια')}</h2><ErrorNotice error={error} />
    <h3>{t('Photos', 'Φωτογραφίες')}</h3>{photos.length === 0 && <p>{t('No photos.', 'Δεν υπάρχουν φωτογραφίες.')}</p>}
    <div>{entriesOf('photoPhase').filter(entry => photos.some(photo => photo.phase === entry.code)).map(entry => <section key={entry.code}><h4>{labelOf('photoPhase', entry.code, lang)}</h4><div className="photo-grid">{photos.filter(photo => photo.phase === entry.code).map(item => <article className="evidence-card" key={item.id}><PhotoThumbnail context={context} photo={item} onOpen={() => setSelection({ kind: 'photos', item })} onAccessLost={onAccessLost}/><p>{labelOf('photoPhase', item.phase, lang)}{item.caption ? ` · ${item.caption}` : ''}</p><small>{item.uploadedBy} · {new Date(item.uploadedAt).toLocaleString(lang)}{item.takenAt && <> · {t('Taken', 'Λήψη')} {new Date(item.takenAt).toLocaleString(lang)}</>}</small>{owner && <div className="actions"><button onClick={() => setEditing({ kind: 'photos', item })}>{t('Edit photo', 'Επεξεργασία φωτογραφίας')}</button><button onClick={() => void remove({ kind: 'photos', item })}>{t('Delete photo', 'Διαγραφή φωτογραφίας')}</button></div>}</article>)}</div></section>)}</div>
    <h3>{t('Attachments', 'Συνημμένα')}</h3>{attachments.length === 0 && <p>{t('No attachments.', 'Δεν υπάρχουν συνημμένα.')}</p>}
    <div className="attachments">{attachments.map(item => <article className="evidence-card" key={item.id}><button onClick={() => setSelection({ kind: 'attachments', item })}>{item.title ?? item.originalFilename}</button><p>{item.originalFilename} · {item.size.toLocaleString(lang)} {t('bytes', 'byte')}</p><small>{item.uploadedBy} · {new Date(item.uploadedAt).toLocaleString(lang)}</small>{item.logEntry && <p>{t('Log entry', 'Καταχώριση ημερολογίου')} · {new Date(item.logEntry.eventAt).toLocaleString(lang)} · {item.logEntry.text}</p>}{owner && <div className="actions"><button onClick={() => setEditing({ kind: 'attachments', item })}>{t('Edit attachment', 'Επεξεργασία συνημμένου')}</button><button onClick={() => void remove({ kind: 'attachments', item })}>{t('Delete attachment', 'Διαγραφή συνημμένου')}</button></div>}</article>)}</div>
    {canUpload && <form className="evidence-upload" onSubmit={event => { event.preventDefault(); void upload(); }}><h3>{t('Add evidence', 'Προσθήκη τεκμηρίων')}</h3><fieldset disabled={busy}><Field label={t('Upload type', 'Τύπος μεταφόρτωσης')}><select value={kind} onChange={event => { setKind(event.target.value as typeof kind); setFiles([]); if (picker.current) picker.current.value = ''; }}><option value="photos">{t('Photos', 'Φωτογραφίες')}</option><option value="attachments">{t('Attachments', 'Συνημμένα')}</option></select></Field>{kind === 'photos' && <VocabSelect label={t('Photo phase', 'Φάση φωτογραφίας')} list="photoPhase" value={phase} onChange={value => { if (value) setPhase(value as PhotoPhase); }} required />}<Field label={kind === 'photos' ? t('Caption', 'Λεζάντα') : t('Attachment title', 'Τίτλος συνημμένου')}><input value={caption} maxLength={2000} onChange={event => setCaption(event.target.value)} /></Field><Field label={t('Files', 'Αρχεία')} hint={t('Each complete upload must fit within 100 MB, including metadata and photo copies. Files upload sequentially.', 'Κάθε συνολική μεταφόρτωση πρέπει να χωρά σε 100 MB μαζί με μεταδεδομένα και αντίγραφα φωτογραφίας. Τα αρχεία μεταφορτώνονται διαδοχικά.')}><input ref={picker} aria-label={t('Files', 'Αρχεία')} type="file" multiple accept={kind === 'photos' ? 'image/*,.heic,.heif' : ACCEPTED_ATTACHMENT_EXTENSIONS.map(value => `.${value}`).join(',')} onChange={event => setFiles(Array.from(event.target.files ?? []))} /></Field><button type="submit" disabled={files.length === 0 || retryBlocked}>{t('Upload evidence', 'Μεταφόρτωση τεκμηρίων')}</button></fieldset>{busy && <div role="status"><span>{current}</span><progress max={100} value={progress} aria-label={t('Upload progress', 'Πρόοδος μεταφόρτωσης')} /><button type="button" onClick={() => scope.current?.abort()}>{t('Cancel upload', 'Ακύρωση μεταφόρτωσης')}</button></div>}{retryBlocked && !busy && <button type="button" onClick={() => { retryRefresh.current = true; onChange(); }}>{t('Refresh evidence before retrying', 'Ανανεώστε τα τεκμήρια πριν δοκιμάσετε ξανά')}</button>}{message && <p role="status">{message === 'complete' ? t('Upload complete.', 'Η μεταφόρτωση ολοκληρώθηκε.') : t('Upload stopped. Refresh the record before retrying; the last file may have reached the server.', 'Η μεταφόρτωση διακόπηκε. Ανανεώστε την εγγραφή πριν δοκιμάσετε ξανά· το τελευταίο αρχείο μπορεί να έχει φτάσει στον διακομιστή.')}</p>}</form>}
    {selection && <EvidenceViewer key={`${selection.kind}:${selection.item.id}`} context={context} selection={selection} onClose={() => setSelection(null)} onAccessLost={onAccessLost} />}
    {editing && owner && <EvidenceEditor key={`${editing.kind}:${editing.item.id}`} context={context} entry={editing} onClose={() => setEditing(null)} onChange={onChange} onAccessLost={onAccessLost} />}
  </section>;
}
function EvidenceEditor({ context, entry, onClose, onChange, onAccessLost }: { context: ViewContext; entry: EvidenceSelection; onClose(): void; onChange(): void; onAccessLost(): void }) {
  const { t } = useI18n();
  const [text, setText] = useState((entry.kind === 'photos' ? entry.item.caption : entry.item.title) ?? '');
  const [phase, setPhase] = useState<PhotoPhase>(entry.kind === 'photos' ? entry.item.phase : 'before');
  const [takenAt, setTakenAt] = useState(entry.kind === 'photos' ? entry.item.takenAt ?? '' : '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>();
  const dirty = text !== ((entry.kind === 'photos' ? entry.item.caption : entry.item.title) ?? '') || (entry.kind === 'photos' && (phase !== entry.item.phase || takenAt !== (entry.item.takenAt ?? '')));
  useDirtyGuard(dirty);
  const close = () => { if (!busy && (!dirty || confirm(t('Discard unsaved evidence changes?', 'Να απορριφθούν οι μη αποθηκευμένες αλλαγές τεκμηρίου;')))) onClose(); };
  const dialog = useRef<HTMLDialogElement>(null); const control = useRef(new AbortController());
  useEffect(() => { control.current = new AbortController(); const previous = document.activeElement as HTMLElement | null; dialog.current?.showModal(); return () => { control.current.abort(); previous?.focus(); }; }, []);
  const save = async () => {
    setBusy(true); setError(undefined);
    try { await api(`${context.base}/${entry.kind}/${entry.item.id}`, { method: 'PATCH', body: entry.kind === 'photos' ? { caption: text || null, phase, takenAt: takenAt || null } : { title: text || null }, signal: control.current.signal }); onChange(); onClose(); }
    catch (value) { if (!control.current.signal.aborted) { if (isAccessLost(value)) onAccessLost(); else setError(value); } }
    finally { setBusy(false); }
  };
  return <dialog ref={dialog} aria-label={t('Edit evidence', 'Επεξεργασία τεκμηρίου')} onCancel={event => { event.preventDefault(); close(); }}><form onSubmit={event => { event.preventDefault(); void save(); }}><h3>{entry.item.originalFilename}</h3><ErrorNotice error={error} /><Field label={entry.kind === 'photos' ? t('Caption', 'Λεζάντα') : t('Attachment title', 'Τίτλος συνημμένου')}><input autoFocus value={text} maxLength={2000} onChange={event => setText(event.target.value)} /></Field>{entry.kind === 'photos' && <><VocabSelect list="photoPhase" label={t('Photo phase', 'Φάση φωτογραφίας')} value={phase} onChange={value => { if (value) setPhase(value as PhotoPhase); }} required /><Field label={t('Capture timestamp', 'Χρόνος λήψης')} hint={t('Use an ISO timestamp with an explicit timezone, or leave blank.', 'Χρησιμοποιήστε χρόνο ISO με ρητή ζώνη ώρας ή αφήστε κενό.')}><input value={takenAt} onChange={event => setTakenAt(event.target.value)} placeholder="2026-10-04T13:00:00+03:00" /></Field></>}<button disabled={busy} type="submit">{t('Save evidence', 'Αποθήκευση τεκμηρίου')}</button><button type="button" disabled={busy} onClick={close}>{t('Cancel', 'Ακύρωση')}</button></form></dialog>;
}
