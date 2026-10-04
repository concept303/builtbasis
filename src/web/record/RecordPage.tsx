import { useCallback, useEffect, useRef, useState } from 'react';
import type { SharedRecord } from '../../domain';
import type { RecordDetail } from '../../server/records/records';
import { api, ApiError, isUnknownOutcome } from '../core/api';
import { ErrorNotice, useDirtyGuard } from '../core/forms';
import { useI18n } from '../core/i18n';
import type { ViewContext } from '../core/types';
import { EvidencePane } from '../media/EvidencePane';
import { uploadEvidence } from '../media/upload';
import { loadRecord, type Log, type RecordData } from './data';
import { RecordEditor } from './RecordEditor';
import { Overview, RecordSummary } from './Overview';
import { StatusDialog } from './StatusDialog';
import { MeasurementEditor, Measurements } from './Measurements';
import { OptionEditor } from './Options';
import { LogAttachment, LogEditor } from './Log';
import { Activity } from './Activity';
import { Sharing } from './Sharing';
import { dateText } from './helpers';

type Editor = { kind: 'record' | 'status' } | { kind: 'measurement'; initial?: SharedRecord['measurements'][number] } | { kind: 'option'; initial?: SharedRecord['options'][number] } | { kind: 'log'; initial?: Log };
type Tab = 'overview' | 'evidence' | 'measurements' | 'log' | 'activity' | 'sharing';
export function RecordPage(props: { context: ViewContext; onBack: () => void }) {
  return <RecordSession key={`${props.context.mode}:${props.context.base}:${props.context.token ?? ''}`} {...props} />;
}
function RecordSession({ context, onBack }: { context: ViewContext; onBack: () => void }) {
  const { t } = useI18n(); const [data, setData] = useState<RecordData | null>(null); const [error, setError] = useState<unknown>(null); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [tab, setTab] = useState<Tab>('overview'); const [editor, setEditor] = useState<Editor | null>(null); const [dirty, setDirty] = useState(false); const [notice, setNotice] = useState('');
  const controller = useRef<AbortController | null>(null); const writeController = useRef<AbortController | null>(null); const mounted = useRef(true); const owner = context.mode === 'owner';
  const [logRetryBlocked, setLogRetryBlocked] = useState(false); const [logReviewed, setLogReviewed] = useState(false); const [attachmentBlocked, setAttachmentBlocked] = useState<number[]>([]);
  const [locationDirty, setLocationDirty] = useState(false); const [locationBusy, setLocationBusy] = useState(false);
  useDirtyGuard(dirty || locationDirty);
  const refresh = useCallback(async () => {
    controller.current?.abort(); const current = new AbortController(); controller.current = current; setLoading(true);
    try { const next = await loadRecord(context, current.signal); if (!current.signal.aborted) { setData(next); setError(null); return true; } }
    catch (reason) { if (!current.signal.aborted) { if (reason instanceof ApiError && [401, 403, 404].includes(reason.status)) { setData(null); setEditor(null); setDirty(false); } setError(reason); } }
    finally { if (!current.signal.aborted) setLoading(false); }
    return false;
  }, [context.base, context.mode, context.projectId, context.token]);
  useEffect(() => { mounted.current = true; void refresh(); return () => { mounted.current = false; controller.current?.abort(); writeController.current?.abort(); }; }, [refresh]);
  const accessLost = useCallback((reason?: unknown) => {
    if (reason !== undefined && (!(reason instanceof ApiError) || ![401, 403, 404].includes(reason.status))) return;
    controller.current?.abort(); setData(null); setEditor(null); setDirty(false); setLoading(false); setError(reason ?? new ApiError(403, 'not_available', null));
  }, []);
  const leave = () => !(dirty || locationDirty) || window.confirm(t('Discard unsaved changes?', 'Απόρριψη μη αποθηκευμένων αλλαγών;'));
  const open = (next: Editor) => { if (!busy && !locationBusy && leave()) { setEditor(next); setDirty(false); setError(null); setNotice(''); } };
  const cancel = () => { if (!busy && !locationBusy && leave()) { setEditor(null); setDirty(false); setError(null); } };
  const mutate = async (path: string, method: string, body?: unknown) => {
    if (path === '/log' && method === 'POST' && logRetryBlocked) return;
    writeController.current = new AbortController();
    setBusy(true); setError(null); setNotice('');
    try { await api(context.base + path, { method, signal: writeController.current.signal, ...(body === undefined ? {} : { body }) }); if (!mounted.current) return; setEditor(null); setDirty(false); await refresh(); setNotice(t('Saved.', 'Αποθηκεύτηκε.')); }
    catch (reason) { if (mounted.current) { if (path === '/log' && method === 'POST' && isUnknownOutcome(reason)) { setLogRetryBlocked(true); setLogReviewed(false); } setError(reason); accessLost(reason); } }
    finally { if (mounted.current) setBusy(false); }
  };
  const remove = (path: string, message: string) => { if (!busy && leave() && window.confirm(message)) void mutate(path, 'DELETE'); };
  const upload = async (entryId: number, file: File) => {
    if (attachmentBlocked.includes(entryId)) throw new Error('refresh_required');
    writeController.current = new AbortController();
    setBusy(true); setError(null);
    try { await uploadEvidence(context, 'attachments', { file }, { logEntryId: entryId }, writeController.current.signal); if (mounted.current) await refresh(); }
    catch (reason) { if (mounted.current) { if (isUnknownOutcome(reason)) setAttachmentBlocked(old => [...new Set([...old, entryId])]); setError(reason); accessLost(reason); } throw reason; }
    finally { if (mounted.current) setBusy(false); }
  };
  const sections: [Tab, string, string][] = [['overview', 'Overview', 'Επισκόπηση'], ['evidence', 'Evidence', 'Τεκμήρια'], ['measurements', 'Measurements', 'Μετρήσεις'], ['log', 'Log', 'Ημερολόγιο'], ['activity', 'Activity', 'Ιστορικό ενεργειών'], ...(owner ? [['sharing', 'Sharing', 'Κοινοποίηση'] as [Tab, string, string]] : [])];
  const changeTab = (next: Tab) => { if (!locationBusy && leave()) { setTab(next); setEditor(null); setDirty(false); setError(null); setNotice(''); } };
  const locationPhotos = data && <EvidencePane purpose="location" context={context} photos={data.photos} attachments={data.attachments} canUpload={data.permissions.canUpload} owner={owner} onChange={() => void refresh()} onAccessLost={() => accessLost()} onDirty={setLocationDirty} onBusy={setLocationBusy} />;
  return <section className="record-page"><div className="toolbar">{context.mode !== 'shared' && <button disabled={busy || locationBusy} onClick={() => { if (leave()) onBack(); }}>{t('Back', 'Πίσω')}</button>}{!editor && <button disabled={busy || loading || locationBusy} onClick={() => { if (leave()) { setDirty(false); void refresh(); } }}>{t('Refresh', 'Ανανέωση')}</button>}</div><ErrorNotice error={editor?.kind === 'status' ? null : error} />{loading && <p role="status">{t('Loading record…', 'Φόρτωση εγγραφής…')}</p>}{notice && <p role="status">{notice}</p>}
    {data && <><header><p>{data.record.humanId}</p><h1>{data.record.title || t('Untitled draft', 'Πρόχειρο χωρίς τίτλο')}</h1>{owner && !editor && <div className="toolbar"><button disabled={busy || loading || locationBusy} onClick={() => open({ kind: 'record' })}>{t('Edit record', 'Επεξεργασία εγγραφής')}</button><button disabled={busy || loading || locationBusy || (data.record as RecordDetail).allowedTransitions.length === 0} onClick={() => open({ kind: 'status' })}>{t('Change status', 'Αλλαγή κατάστασης')}</button></div>}</header>
      <RecordSummary data={data} />
      <nav className="record-tabs" aria-label={t('Record sections', 'Ενότητες εγγραφής')}>{sections.map(([key, en, el]) => <button key={key} aria-current={tab === key ? 'page' : undefined} disabled={busy || locationBusy} onClick={() => changeTab(key)}>{t(en, el)}</button>)}</nav>
      <label className="phone-sections">{t('Record section', 'Ενότητα εγγραφής')}<select value={tab} disabled={busy || locationBusy} onChange={e => changeTab(e.target.value as Tab)}>{sections.map(([key, en, el]) => <option key={key} value={key}>{t(en, el)}</option>)}</select></label>
      {editor?.kind === 'record' && owner && <RecordEditor data={data} busy={busy} locationPhotos={locationPhotos} uploadingPhotos={locationBusy} pendingPhotos={locationDirty} onDirty={() => setDirty(true)} onCancel={cancel} onSave={patch => mutate('', 'PATCH', patch)} />}
      {editor?.kind === 'status' && owner && <div onChange={() => setDirty(true)}><StatusDialog record={data.record as RecordDetail} people={data.owner!.people} busy={busy} error={error} onCancel={cancel} onSave={body => mutate('/transitions', 'POST', body)} /></div>}
      {editor?.kind === 'measurement' && owner && <MeasurementEditor {...(editor.initial ? { initial: editor.initial } : {})} sets={data.measurements} people={data.owner!.people} busy={busy} onDirty={() => setDirty(true)} onCancel={cancel} onSave={body => mutate('/measurement-sets' + (editor.initial ? `/${editor.initial.id}` : ''), editor.initial ? 'PATCH' : 'POST', body)} />}
      {editor?.kind === 'option' && owner && <OptionEditor {...(editor.initial ? { initial: editor.initial } : {})} busy={busy} onDirty={() => setDirty(true)} onCancel={cancel} onSave={body => mutate('/options' + (editor.initial ? `/${editor.initial.id}` : ''), editor.initial ? 'PATCH' : 'POST', body)} />}
      {editor?.kind === 'log' && data.permissions.canAddLog && <><LogEditor {...(editor.initial ? { initial: editor.initial } : {})} owner={owner} busy={busy || loading} retryBlocked={!editor.initial && logRetryBlocked} reviewed={logReviewed} onReload={async () => { const ok = await refresh(); if (ok) { setLogReviewed(true); setLogRetryBlocked(false); } return ok; }} onDirty={() => setDirty(true)} onCancel={cancel} onSave={body => mutate('/log' + (editor.initial ? `/${editor.initial.id}` : ''), editor.initial ? 'PATCH' : 'POST', body)} />{logReviewed && <section role="region" aria-label={t('Saved Log entries', 'Αποθηκευμένες καταχωρίσεις ημερολογίου')}><h2>{t('Saved Log entries', 'Αποθηκευμένες καταχωρίσεις ημερολογίου')}</h2>{data.log.length === 0 && <p>{t('No saved entries.', 'Δεν υπάρχουν αποθηκευμένες καταχωρίσεις.')}</p>}{data.log.map(entry => <article key={entry.id}><p>{entry.loggedBy}</p><p className="user-text">{entry.text}</p></article>)}</section>}</>}
      {!editor && <>
        {tab === 'overview' && <><Overview data={data} locationPhotos={locationPhotos} />{data.record.subtype !== 'task' && <section><h2>{t('Options considered', 'Εξεταζόμενες λύσεις')}</h2>{data.options.map(option => <article key={option.id}><h3>{option.label}{option.id === data.record.chosenOptionId ? ` · ${t('Chosen', 'Επιλεγμένη')}` : ''}</h3><p className="user-text">{option.description}</p>{owner && <><button disabled={busy || locationBusy} onClick={() => open({ kind: 'option', initial: option })}>{t('Edit option', 'Επεξεργασία λύσης')}</button><button disabled={busy || option.id === data.record.chosenOptionId} onClick={() => remove(`/options/${option.id}`, t('Delete this option?', 'Διαγραφή αυτής της λύσης;'))}>{t('Delete option', 'Διαγραφή λύσης')}</button></>}</article>)}{owner && <button disabled={busy || loading || locationBusy} onClick={() => open({ kind: 'option' })}>{t('Add option', 'Προσθήκη λύσης')}</button>}</section>}</>}
        {tab === 'evidence' && <EvidencePane context={context} photos={data.photos} attachments={data.attachments} canUpload={data.permissions.canUpload} owner={owner} onChange={() => void refresh()} onAccessLost={() => accessLost()} onDirty={setDirty} />}
        {tab === 'measurements' && <><Measurements sets={data.measurements} people={data.labels.people} owner={owner} onEdit={set => open({ kind: 'measurement', initial: set })} onDelete={id => remove(`/measurement-sets/${id}`, t('Delete this measurement set and all its rows?', 'Διαγραφή αυτού του συνόλου και όλων των μετρήσεών του;'))} />{owner && <button disabled={busy || loading || locationBusy} onClick={() => open({ kind: 'measurement' })}>{t('Add measurement set', 'Προσθήκη συνόλου μετρήσεων')}</button>}</>}
        {tab === 'log' && <LogSection data={data} owner={owner} busy={busy || loading} open={open} remove={remove} upload={upload} onDirty={setDirty} attachmentBlocked={attachmentBlocked} onReload={async () => { const ok = await refresh(); if (ok) setAttachmentBlocked([]); return ok; }} />}
        {tab === 'activity' && <Activity data={data} />}
        {tab === 'sharing' && owner && <Sharing base={context.base} draft={data.record.status === 'draft'} onAccessLost={accessLost} onDirty={setDirty} />}
      </>}
    </>}
  </section>;
}
function LogSection({ data, owner, busy, open, remove, upload, onDirty, attachmentBlocked, onReload }: { data: RecordData; owner: boolean; busy: boolean; open: (editor: Editor) => void; remove: (path: string, message: string) => void; upload: (id: number, file: File) => Promise<void>; onDirty: (dirty: boolean) => void; attachmentBlocked: number[]; onReload: () => Promise<boolean> }) {
  const { t, lang } = useI18n();
  const [pending, setPending] = useState<number[]>([]);
  useEffect(() => { onDirty(pending.length > 0 || busy); }, [pending, busy, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  return <section><h2>{t('Log', 'Ημερολόγιο')}</h2>{data.permissions.canAddLog && <button disabled={busy} onClick={() => open({ kind: 'log' })}>{t('Add Log entry', 'Προσθήκη καταχώρισης')}</button>}{data.log.length === 0 && <p>{t('No entries yet.', 'Δεν υπάρχουν ακόμη καταχωρίσεις.')}</p>}{data.log.map(entry => <article key={entry.id}><h3>{dateText(entry.eventAt, lang)} · {entry.loggedBy}</h3>{entry.private && <p className="badge">{t('Private · owner only', 'Ιδιωτική · μόνο για τον ιδιοκτήτη')}</p>}<p className="user-text">{entry.text}</p>{data.attachments.filter(file => file.logEntry?.id === entry.id).map(file => <p key={file.id}>{t('Attachment', 'Συνημμένο')}: {file.title || file.originalFilename}</p>)}{data.attachments.some(file => file.logEntry?.id === entry.id) && <p>{t('Open these files in Evidence.', 'Ανοίξτε αυτά τα αρχεία στα Τεκμήρια.')}</p>}{owner && <><button disabled={busy} onClick={() => open({ kind: 'log', initial: entry })}>{t('Edit entry', 'Επεξεργασία καταχώρισης')}</button><button disabled={busy} onClick={() => remove(`/log/${entry.id}`, t('Delete this entry and all its attachments?', 'Διαγραφή αυτής της καταχώρισης και όλων των συνημμένων της;'))}>{t('Delete entry', 'Διαγραφή καταχώρισης')}</button></>}{data.permissions.canUpload && <LogAttachment busy={busy} retryBlocked={attachmentBlocked.includes(entry.id)} onReload={onReload} onUpload={file => upload(entry.id, file)} onDirty={value => setPending(old => value ? [...new Set([...old, entry.id])] : old.filter(id => id !== entry.id))} />}</article>)}</section>;
}
