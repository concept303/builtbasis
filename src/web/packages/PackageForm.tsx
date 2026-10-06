import { useEffect, useId, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { foldText, isOutstanding, labelOf, PACKAGE_STATUSES, type WorkPackage, type WorkPackageInput } from '../../domain';
import type { Person } from '../../server/lists/people';
import { api, ApiError, isUnknownOutcome } from '../core/api';
import { BusyButton, ErrorNotice, Field, PersonSelect, useDirtyGuard } from '../core/forms';
import { InfoButton } from '../core/InfoButton';
import { useI18n } from '../core/i18n';
import { loadPackage, loadPackages, packageBase } from './data';
export function PackageForm({ projectId, initial, people, inline, onSaved, onCancel }: { projectId: number; initial?: WorkPackage; people: Person[]; inline: boolean; onSaved: (p: WorkPackage) => void; onCancel: () => void }) {
  const { lang, t } = useI18n(); const errorId = useId(); const nameRef = useRef<HTMLInputElement>(null); const statusRef = useRef<HTMLSelectElement>(null); const dialog = useRef<HTMLDialogElement>(null);
  const [draft,setDraft] = useState<WorkPackageInput>(() => initial ? { name:initial.name,description:initial.description,responsibleId:initial.responsibleId,targetDate:initial.targetDate,status:initial.status } : { name:'',description:null,responsibleId:null,targetDate:null,status:'planned' });
  const [baseline] = useState(JSON.stringify(draft)); const dirty = baseline !== JSON.stringify(draft); const [finished,setFinished] = useState(false); useDirtyGuard(dirty && !finished);
  const [busy,setBusy] = useState(false); const [error,setError] = useState<unknown>(null); const [nameError,setNameError] = useState('');
  const [uncertain,setUncertain] = useState(false); const [reviewed,setReviewed] = useState<WorkPackage[] | null>(null);
  const [confirmation,setConfirmation] = useState<Awaited<ReturnType<typeof loadPackage>> | null>(null);
  useEffect(() => { const opener = document.activeElement as HTMLElement | null; dialog.current?.showModal(); nameRef.current?.focus(); return () => { dialog.current?.close(); opener?.focus(); }; }, []);
  const close = () => { if (busy) return; if (confirmation) { setConfirmation(null); requestAnimationFrame(() => statusRef.current?.focus()); return; } if (!dirty || window.confirm(t('Discard unsaved changes?','Απόρριψη μη αποθηκευμένων αλλαγών;'))) onCancel(); };
  const set = <K extends keyof WorkPackageInput,>(key:K,value:WorkPackageInput[K]) => setDraft(old => ({...old,[key]:value}));
  const report = (failure: unknown) => {
    if (failure instanceof ApiError && failure.code === 'work_package_name_taken') {
      const name = (failure.details as { existingName?: string } | undefined)?.existingName ?? draft.name;
      setNameError(t(`“${name}” already exists in this project. Names are compared without case or accents.`,`Υπάρχει ήδη πακέτο με το όνομα «${name}» σε αυτό το έργο. Στη σύγκριση ονομάτων δεν λαμβάνονται υπόψη οι τόνοι ή η διάκριση πεζών και κεφαλαίων.`)); nameRef.current?.focus();
    } else setError(failure);
    if (isUnknownOutcome(failure)) { setUncertain(true); setReviewed(null); }
  };
  async function save(confirmed = false) {
    if (busy || uncertain) return;
    if (!draft.name.trim()) { setNameError(t('Enter a name for the work package.','Συμπληρώστε το όνομα του πακέτου εργασιών.')); nameRef.current?.focus(); return; }
    setBusy(true); setError(null); setNameError('');
    try {
      if (!confirmed && initial && draft.status !== initial.status && ['completed','cancelled'].includes(draft.status)) {
        const fresh = await loadPackage(projectId,initial.id);
        if (fresh.detail.counts.outstanding) { setConfirmation(fresh); return; }
      }
      const result = await api<WorkPackage>(packageBase(projectId)+(initial ? `/${initial.id}` : ''), { method:initial ? 'PATCH' : 'POST', body:draft });
      flushSync(()=>setFinished(true)); onSaved(result);
    } catch (failure) { report(failure); } finally { setBusy(false); }
  }
  async function review() {
    setBusy(true); setError(null);
    try { const result = await loadPackages(projectId); setReviewed(result.packages); if (initial) setUncertain(false); }
    catch(failure) { setError(failure); } finally { setBusy(false); }
  }
  const definition = PACKAGE_STATUSES.find(s => s.code === draft.status)!;
  const outstanding = confirmation?.records.filter(r => isOutstanding(r.status)) ?? [];
  const title = initial ? t('Edit package','Επεξεργασία πακέτου') : t('New work package','Νέο πακέτο εργασιών');
  return createPortal(<dialog ref={dialog} className="management-dialog package-form" aria-label={title} onCancel={e => {e.preventDefault();close();}}><h2>{title}</h2>
    {confirmation ? <section><h3>{draft.status === 'completed' ? t(`Mark “${draft.name}” as Completed?`,`Να οριστεί το πακέτο «${draft.name}» ως ολοκληρωμένο;`) : t(`Mark “${draft.name}” as Cancelled?`,`Να οριστεί το πακέτο «${draft.name}» ως ακυρωμένο;`)}</h3>
      <p>{t(`${confirmation.detail.counts.outstanding} records in this package are still outstanding, ${confirmation.detail.counts.overdue} of them overdue:`,`${confirmation.detail.counts.outstanding} καταγραφές του πακέτου παραμένουν σε εκκρεμότητα, από τις οποίες ${confirmation.detail.counts.overdue} είναι εκπρόθεσμες:`)}</p>
      <ul>{outstanding.slice(0,5).map(r => <li key={r.id}>{r.humanId} · {labelOf('status',r.status,lang)}</li>)}</ul>{outstanding.length>5 && <p>{t(`And ${outstanding.length-5} more`,`Και ${outstanding.length-5} ακόμη`)}</p>}
      <p>{t('Their statuses, due dates and people do not change.','Οι καταστάσεις, οι προθεσμίες και τα πρόσωπα που έχουν οριστεί στις καταγραφές δεν αλλάζουν.')}</p><ErrorNotice error={error}/>
      <BusyButton className="primary" busy={busy} disabled={uncertain} onClick={() => void save(true)}>{draft.status === 'completed' ? t('Mark as Completed','Ορισμός ως ολοκληρωμένο') : t('Mark as Cancelled','Ορισμός ως ακυρωμένο')}</BusyButton><button disabled={busy} onClick={close}>{t('Go back','Επιστροφή')}</button>
    </section> : <form noValidate onSubmit={e => { e.preventDefault(); e.stopPropagation(); void save(); }}><fieldset disabled={busy || uncertain}>
      <Field label={t('Name (required)','Όνομα (υποχρεωτικό)')}><input ref={nameRef} required maxLength={200} aria-invalid={Boolean(nameError)} aria-describedby={nameError ? errorId : undefined} value={draft.name} onChange={e => set('name',e.target.value)}/></Field>{nameError && <p id={errorId} role="alert" className="error">{nameError}</p>}
      <Field label={t('Description','Περιγραφή')}><textarea maxLength={10000} value={draft.description ?? ''} onChange={e => set('description',e.target.value || null)}/></Field>
      <div className="form-grid"><PersonSelect label={t('Responsible person','Υπεύθυνος')} people={people} value={draft.responsibleId} onChange={id => set('responsibleId',id)}/><Field label={t('Target date','Ημερομηνία στόχου')}><input type="date" value={draft.targetDate ?? ''} onChange={e => set('targetDate',e.target.value || null)}/></Field></div>
      <Field label={t('Status','Κατάσταση')}><select ref={statusRef} value={draft.status} onChange={e => set('status',e.target.value as WorkPackageInput['status'])}>{PACKAGE_STATUSES.map(s => <option key={s.code} value={s.code}>{s[lang]}</option>)}</select></Field><InfoButton label={t('Package status definitions','Ορισμοί καταστάσεων πακέτου')}><dl>{PACKAGE_STATUSES.map(s => <div key={s.code}><dt>{s[lang]}</dt><dd>{lang === 'en' ? s.defEn : s.defEl}</dd></div>)}</dl></InfoButton><small>{lang === 'en' ? definition.defEn : definition.defEl}</small>
      {inline && <p>{t('Created straight away and selected in this record. It stays even if you cancel your record edits.','Το πακέτο δημιουργείται αμέσως και επιλέγεται σε αυτή την καταγραφή. Παραμένει ακόμη κι αν ακυρώσετε τις αλλαγές στην καταγραφή.')}</p>}
      <ErrorNotice error={error}/><div className="toolbar"><BusyButton busy={busy} className="primary" type="submit">{initial ? t('Save package','Αποθήκευση πακέτου') : t('Create work package','Δημιουργία πακέτου εργασιών')}</BusyButton></div>
    </fieldset></form>}
    {uncertain && <div role="alert"><p>{t('The result could not be confirmed. Refresh the list before trying again.','Το αποτέλεσμα δεν επιβεβαιώθηκε. Ανανεώστε τη λίστα πριν προσπαθήσετε ξανά.')}</p><BusyButton busy={busy} onClick={() => void review()}>{t('Refresh list','Ανανέωση λίστας')}</BusyButton>{reviewed && <><ul>{reviewed.filter(p => foldText(p.name) === foldText(draft.name)).map(p => <li key={p.id}>{p.name} <button onClick={() => { flushSync(()=>setFinished(true)); onSaved(p); }}>{t('Use this package','Χρήση αυτού του πακέτου')}</button></li>)}</ul>{!reviewed.some(p => foldText(p.name) === foldText(draft.name)) && <button onClick={() => { setUncertain(false);setError(null); }}>{t('No matching package found; allow another attempt','Δεν βρέθηκε αντίστοιχο πακέτο· επιτρέπεται νέα προσπάθεια')}</button>}</>}</div>}
    {!confirmation && <button type="button" disabled={busy} onClick={close}>{t('Cancel','Ακύρωση')}</button>}
  </dialog>,document.body);
}
