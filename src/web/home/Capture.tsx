import { PackagePicker } from '../packages/PackagePicker';
import { loadPackages } from '../packages/data';
import { PackageForm } from '../packages/PackageForm';
import type { WorkPackage } from '../../domain';
import type { Person } from '../../server/lists/people';
import { useEffect, useRef, useState } from 'react';
import type { RecordDetail } from '../../server/records/records';
import type { RecordList } from '../../server/records/list';
import type { LocationNode } from '../../server/lists/locations';
import type { Subtype, PhotoPhase } from '../../domain';
import { api, ApiError, isUnknownOutcome } from '../core/api';
import { useI18n } from '../core/i18n';
import { BusyButton, ErrorNotice, Field, VocabSelect, useDirtyGuard } from '../core/forms';
import { LocationPicker } from '../core/LocationPicker';
import { preparePhoto, uploadEvidence } from '../media/upload';
export function Capture({ projectId, nodes, onClose, initialWorkPackageId = null }: { initialWorkPackageId?: number | null; projectId: number; nodes: LocationNode[]; onClose(): void }) {
  const [workPackageId,setWorkPackageId] = useState<number | null>(initialWorkPackageId);
  const [packages,setPackages] = useState<WorkPackage[]>([]); const [people,setPeople] = useState<Person[]>([]); const [creatingPackage,setCreatingPackage] = useState(false);
  useEffect(() => { const controller = new AbortController(); Promise.all([loadPackages(projectId,controller.signal),api<Person[]>(`/api/projects/${projectId}/people`,{signal:controller.signal})]).then(([result,people]) => { setPackages(result.packages);setPeople(people); }).catch(failure => { if (!controller.signal.aborted) setError(failure); });return () => controller.abort(); },[projectId]);
  const { t } = useI18n(); const [subtype, setSubtype] = useState<Subtype>('quality_issue'); const [title, setTitle] = useState(''); const [locations, setLocations] = useState<number[]>([]);
  const [phase, setPhase] = useState<PhotoPhase>('before'); const [files, setFiles] = useState<File[]>([]); const [record, setRecord] = useState<RecordDetail | null>(null);
  const [outcomes, setOutcomes] = useState<{ name: string; ok: boolean }[]>([]); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null); const [controller, setController] = useState<AbortController | null>(null);
  const [currentFile, setCurrentFile] = useState(''); const [progress, setProgress] = useState<number | null>(null);
  const activeUpload = useRef<AbortController | null>(null);
  const activeReview = useRef<AbortController | null>(null);
  const [unknownCreation, setUnknownCreation] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewedRecords, setReviewedRecords] = useState<RecordList['records'] | null>(null);
  useEffect(() => () => { activeUpload.current?.abort(); activeReview.current?.abort(); }, []);
  const reloadSavedRecords = async () => {
    if (busy || reviewing) return;
    activeReview.current?.abort();
    const abort = new AbortController(); activeReview.current = abort;
    setReviewing(true); setReviewedRecords(null); setError(null);
    try {
      const saved = await api<RecordList>(`/api/projects/${projectId}/records?sort=updated&dir=desc`, { signal: abort.signal });
      if (!saved || !Array.isArray(saved.records)) throw new ApiError(0, 'request_failed');
      if (!abort.signal.aborted) setReviewedRecords(saved.records);
    } catch (failure) { if (!abort.signal.aborted) setError(failure); }
    finally { if (!abort.signal.aborted) setReviewing(false); }
  };
  const dirty = busy || (!record && Boolean(workPackageId !== initialWorkPackageId || unknownCreation || title || locations.length || files.length));
  useDirtyGuard(dirty);
  return <section className="panel">{creatingPackage && <PackageForm projectId={projectId} people={people} inline onSaved={p=>{setPackages(old=>[...old,p]);setWorkPackageId(p.id);setCreatingPackage(false);}} onCancel={()=>setCreatingPackage(false)}/>}<h2>{t('New record', 'Νέα καταγραφή')}</h2>{record ? <><p>{t('Draft saved.', 'Το πρόχειρο αποθηκεύτηκε.')} <a href={`/projects/${projectId}/records/${record.id}${initialWorkPackageId ? `?from=${encodeURIComponent(`/projects/${projectId}/work-packages/${initialWorkPackageId}`)}` : ''}`}>{record.humanId}</a></p><ul>{outcomes.map((item, index) => <li key={index}>{item.name}: {item.ok ? t('Uploaded', 'Μεταφορτώθηκε') : t('Not uploaded. Open the record before retrying.', 'Δεν μεταφορτώθηκε. Ανοίξτε την καταγραφή πριν δοκιμάσετε ξανά.')}</li>)}</ul></> : <form onSubmit={async event => {
    event.preventDefault(); if (busy || reviewing || (unknownCreation && reviewedRecords === null)) return; setBusy(true); setError(null); const abort = new AbortController(); activeUpload.current = abort; setController(abort);
    try {
      const saved = await api<RecordDetail>(`/api/projects/${projectId}/records`, { method: 'POST', body: { subtype, title, workPackageId, locationIds: locations } });
      if (!saved || !Number.isSafeInteger(saved.id) || saved.id <= 0 || typeof saved.humanId !== 'string') throw new ApiError(0, 'request_failed');
      setRecord(saved); setUnknownCreation(false); setReviewedRecords(null);
      for (const file of files) {
        setCurrentFile(file.name); setProgress(null);
        if (abort.signal.aborted) { setOutcomes(items => [...items, { name: file.name, ok: false }]); continue; }
        try { const bundle = await preparePhoto(file, abort.signal); await uploadEvidence({ mode: 'owner', base: `/api/projects/${projectId}/records/${saved.id}`, projectId, recordId: saved.id }, 'photos', { original: bundle.original, display: bundle.display, thumbnail: bundle.thumbnail }, { phase, takenAt: bundle.takenAt }, abort.signal, setProgress); setOutcomes(items => [...items, { name: file.name, ok: true }]); }
        catch (failure) { setError(failure); if (failure instanceof ApiError && [401, 403, 404].includes(failure.status)) abort.abort(); setOutcomes(items => [...items, { name: file.name, ok: false }]); }
      }
    } catch (failure) { setError(failure); if (isUnknownOutcome(failure)) { setUnknownCreation(true); setReviewedRecords(null); } } finally { setBusy(false); setController(null); }
  }}><VocabSelect list="subtype" label={t('Subtype', 'Υποκατηγορία')} required value={subtype} onChange={value => { if (value) setSubtype(value as Subtype); }}/><Field label={t('Title', 'Τίτλος')}><input value={title} maxLength={200} onChange={event => setTitle(event.target.value)}/></Field><PackagePicker packages={packages} value={workPackageId} savedValue={null} onChange={setWorkPackageId} onCreate={()=>setCreatingPackage(true)}/><details><summary>{t('Location and photos (optional)', 'Θέση και φωτογραφίες (προαιρετικά)')}</summary><LocationPicker nodes={nodes} value={locations} onChange={setLocations}/><Field label={t('Photos', 'Φωτογραφίες')}><input type="file" multiple accept="image/*,.heic,.heif" onChange={event => setFiles(Array.from(event.target.files ?? []))}/></Field><VocabSelect label={t('Photo phase', 'Φάση φωτογραφιών')} list="photoPhase" value={phase} onChange={value => { if (value) setPhase(value as PhotoPhase); }}/><small>{t('A photo bundle, including its copies and metadata, must fit within 100 MB.', 'Η φωτογραφία μαζί με τα αντίγραφα και τα μεταδεδομένα πρέπει να χωρά σε 100 MB.')}</small></details>{unknownCreation && <div>
    <p role="status">{t('The creation result is unknown. The draft may already have been saved. Reload and review the saved records before creating another draft. Selected photos have not been uploaded.', 'Το αποτέλεσμα της δημιουργίας είναι άγνωστο. Το πρόχειρο μπορεί να έχει ήδη αποθηκευτεί. Ανανεώστε και ελέγξτε τις αποθηκευμένες καταγραφές πριν δημιουργήσετε άλλο πρόχειρο. Οι επιλεγμένες φωτογραφίες δεν έχουν μεταφορτωθεί.')}</p>
    <BusyButton type="button" busy={reviewing} disabled={busy} onClick={() => void reloadSavedRecords()}>{t('Reload saved records', 'Ανανέωση αποθηκευμένων καταγραφών')}</BusyButton>
    {reviewedRecords !== null && <section aria-label={t('Saved records to review', 'Αποθηκευμένες καταγραφές για έλεγχο')}>
      <h3>{t('Saved records to review', 'Αποθηκευμένες καταγραφές για έλεγχο')}</h3>
      <p>{t('Check the saved records and open your draft to continue. Creating another draft may create a duplicate.', 'Ελέγξτε τις αποθηκευμένες καταγραφές και ανοίξτε το πρόχειρό σας για να συνεχίσετε. Η δημιουργία άλλου προχείρου μπορεί να δημιουργήσει διπλότυπο.')}</p>
      {reviewedRecords.length === 0 ? <p>{t('No saved records were returned.', 'Δεν επιστράφηκαν αποθηκευμένες καταγραφές.')}</p> : <ul>{reviewedRecords.map(item => <li key={item.id}><a href={`/projects/${projectId}/records/${item.id}`}>{item.humanId} · {item.title || t('Untitled draft', 'Πρόχειρο χωρίς τίτλο')}</a></li>)}</ul>}
    </section>}
  </div>}<BusyButton busy={busy} disabled={reviewing || (unknownCreation && reviewedRecords === null)} className="primary">{unknownCreation && reviewedRecords !== null ? t('Create another draft', 'Δημιουργία άλλου προχείρου') : t('Save draft', 'Αποθήκευση προχείρου')}</BusyButton></form>}
  {busy && currentFile && <p role="status">{currentFile} · {progress === null ? t('Preparing photo…', 'Προετοιμασία φωτογραφίας…') : `${progress}%`} {progress !== null && <progress max={100} value={progress}/>}</p>}{busy && <button onClick={() => controller?.abort()}>{t('Cancel remaining uploads', 'Ακύρωση υπόλοιπων μεταφορτώσεων')}</button>}<ErrorNotice error={error}/>{!busy && <button onClick={() => { if (!dirty || confirm(t('Discard unsaved changes?', 'Να απορριφθούν οι μη αποθηκευμένες αλλαγές;'))) onClose(); }}>{t('Close', 'Κλείσιμο')}</button>}</section>;
}
