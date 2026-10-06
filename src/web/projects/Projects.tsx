import { foldText } from '../../domain/text';
﻿import { useEffect, useRef, useState } from 'react';
import type { Project, ProjectUsage } from '../../server/lists/projects';
import { api, ApiError, isUnknownOutcome } from '../core/api';
import { BusyButton, ErrorNotice, Field, useDirtyGuard } from '../core/forms';
import { useI18n } from '../core/i18n';

export function Projects({ projects, onChange }: { projects: Project[]; onChange(projects: Project[]): void }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Project | 'new' | null>(null);
  const [draft, setDraft] = useState({ code: '', name: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null);
  const [uncertain, setUncertain] = useState(false);
  const [deleting, setDeleting] = useState<{ project: Project; usage: ProjectUsage } | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const dirty = editing !== null && (draft.code !== (editing === 'new' ? '' : editing.code) || draft.name !== (editing === 'new' ? '' : editing.name));
  useDirtyGuard(dirty);
  useEffect(() => { if (deleting) dialog.current?.showModal(); else dialog.current?.close(); }, [deleting]);
  const discard = () => !dirty || window.confirm(t('Discard unsaved changes?', 'Απόρριψη μη αποθηκευμένων αλλαγών;'));
  function edit(project: Project | 'new') { if (!discard()) return; setEditing(project); setDraft(project === 'new' ? { code: '', name: '' } : { code: project.code, name: project.name }); setError(null); }
  async function refresh() {
    setBusy(true); setError(null);
    try { onChange(await api<Project[]>('/api/projects')); setUncertain(false); setEditing(null); setDeleting(null); }
    catch (failure) { setError(failure); } finally { setBusy(false); }
  }
  async function save() {
    if (!editing || busy || uncertain) return;
    setBusy(true); setError(null);
    try {
      const project = await api<Project>(editing === 'new' ? '/api/projects' : `/api/projects/${editing.id}`, { method: editing === 'new' ? 'POST' : 'PATCH', body: draft });
      onChange([...projects.filter(item => item.id !== project.id), project].sort((a, b) => a.id - b.id)); setEditing(null);
    } catch (failure) { setError(failure); if (isUnknownOutcome(failure)) setUncertain(true); }
    finally { setBusy(false); }
  }
  async function askDelete(project: Project) {
    if (!discard() || busy || uncertain) return;
    setBusy(true); setError(null);
    try { const usage = await api<ProjectUsage>(`/api/projects/${project.id}/usage`); setEditing(null); setConfirmation(''); setDeleting({ project, usage }); }
    catch (failure) { setError(failure); } finally { setBusy(false); }
  }
  async function remove() {
    if (!deleting || busy || uncertain || confirmation !== deleting.project.name) return;
    setBusy(true); setError(null);
    try { await api(`/api/projects/${deleting.project.id}`, { method: 'DELETE', body: { confirmName: confirmation } }); onChange(projects.filter(p => p.id !== deleting.project.id)); setDeleting(null); }
    catch (failure) { setError(failure); if (isUnknownOutcome(failure)) setUncertain(true); }
    finally { setBusy(false); }
  }
  const message = error instanceof ApiError && error.code === 'project_code_taken' ? t('This project code is already in use.', 'Αυτός ο κωδικός έργου χρησιμοποιείται ήδη.') : error instanceof ApiError && error.code === 'project_confirmation_mismatch' ? t('The project name changed. Close this dialog and review the project again.', 'Το όνομα του έργου άλλαξε. Κλείστε το παράθυρο και ελέγξτε ξανά το έργο.') : null;
  const notice = <>{message ? <p role="alert" className="error">{message}</p> : <ErrorNotice error={error}/>} {uncertain && <p role="alert">{t('The result could not be confirmed. Refresh the list before trying again.', 'Το αποτέλεσμα δεν επιβεβαιώθηκε. Ανανεώστε τη λίστα πριν προσπαθήσετε ξανά.')} <button type="button" disabled={busy} onClick={() => void refresh()}>{t('Refresh list', 'Ανανέωση λίστας')}</button></p>}</>;
  const shown = projects.filter(p => foldText(`${p.name} ${p.code}`).includes(foldText(query)));
  return <section className="management-page">
    <div className="title-row"><div><h1>{t('Projects', 'Έργα')}</h1><p className="muted">{t('Open a project or manage its details.', 'Ανοίξτε ένα έργο ή διαχειριστείτε τα στοιχεία του.')}</p></div><button className="primary" disabled={busy || uncertain} onClick={() => edit('new')}>{t('New project', 'Νέο έργο')}</button></div>
    {!deleting && notice}
    <div className={`management-layout${editing ? ' has-editor' : ''}`}>
      <div className="management-collection panel">
        <Field label={t('Search projects', 'Αναζήτηση έργων')}><input type="search" value={query} onChange={e => setQuery(e.target.value)}/></Field>
        {projects.length === 0 ? <p>{t('Create your first project to start adding records.', 'Δημιουργήστε το πρώτο έργο σας για να προσθέσετε καταγραφές.')}</p> : <div className="table-wrap"><table className="management-table" aria-label={t('Projects', 'Έργα')}><thead><tr><th>{t('Project', 'Έργο')}</th><th className="management-secondary">{t('Code', 'Κωδικός')}</th><th><span className="sr-only">{t('Actions', 'Ενέργειες')}</span></th></tr></thead><tbody>{shown.map(project => <tr key={project.id}><td><a href={`/projects/${project.id}/records`}>{project.name}</a><small className="management-phone-code">{project.code}</small></td><td className="management-secondary">{project.code}</td><td className="row-controls"><button type="button" disabled={busy || uncertain} onClick={() => edit(project)}>{t('Edit', 'Επεξεργασία')}</button><button type="button" disabled={busy || uncertain} onClick={() => void askDelete(project)}>{t('Delete project', 'Διαγραφή έργου')}</button></td></tr>)}</tbody></table></div>}
        {projects.length > 0 && shown.length === 0 && <p>{t('No matching projects.', 'Δεν βρέθηκαν έργα.')}</p>}
      </div>
      {editing && <aside className="management-editor panel" aria-label={t('Project details', 'Στοιχεία έργου')}><button className="management-back" type="button" disabled={busy} onClick={() => { if (discard()) setEditing(null); }}>{t('Back to list', 'Επιστροφή στη λίστα')}</button><h2>{editing === 'new' ? t('New project', 'Νέο έργο') : t('Edit project', 'Επεξεργασία έργου')}</h2><form onSubmit={e => { e.preventDefault(); void save(); }}><fieldset disabled={busy || uncertain}><Field label={t('Project name', 'Όνομα έργου')}><input autoFocus required maxLength={200} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}/></Field><Field label={t('Project code', 'Κωδικός έργου')}><input required maxLength={80} value={draft.code} onChange={e => setDraft({ ...draft, code: e.target.value })}/></Field><div className="toolbar"><BusyButton className="primary" busy={busy} type="submit">{editing === 'new' ? t('Create project', 'Δημιουργία έργου') : t('Save', 'Αποθήκευση')}</BusyButton><button type="button" onClick={() => { if (discard()) setEditing(null); }}>{t('Cancel', 'Ακύρωση')}</button></div></fieldset></form></aside>}
    </div>
    <dialog ref={dialog} className="management-dialog" aria-label={t('Delete project', 'Διαγραφή έργου')} onCancel={e => { e.preventDefault(); if (!busy) setDeleting(null); }}>
      {deleting && <><h2>{t('Delete project', 'Διαγραφή έργου')}</h2><p><strong>{deleting.project.name}</strong></p><p>{t(`This permanently removes ${deleting.usage.records} records, ${deleting.usage.photos} photos and ${deleting.usage.attachments} attachments from the app, together with ${deleting.usage.workPackages} work packages and this project's lists, history and shared access.`, `Θα διαγραφούν οριστικά από την εφαρμογή ${deleting.usage.records} καταγραφές, ${deleting.usage.photos} φωτογραφίες και ${deleting.usage.attachments} συνημμένα, μαζί με ${deleting.usage.workPackages} πακέτα εργασιών, τις λίστες, το ιστορικό και την κοινόχρηστη πρόσβαση του έργου.`)}</p>{notice}<form onSubmit={e => { e.preventDefault(); void remove(); }}><Field label={t('Type the project name to confirm', 'Πληκτρολογήστε το όνομα του έργου για επιβεβαίωση')}><input autoComplete="off" value={confirmation} disabled={busy || uncertain} onChange={e => setConfirmation(e.target.value)}/></Field><div className="toolbar"><BusyButton busy={busy} disabled={uncertain || confirmation !== deleting.project.name} type="submit">{t('Delete permanently', 'Οριστική διαγραφή')}</BusyButton><button type="button" disabled={busy} onClick={() => setDeleting(null)}>{t('Cancel', 'Ακύρωση')}</button></div></form></>}
    </dialog>
  </section>;
}
